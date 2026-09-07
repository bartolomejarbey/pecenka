import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { ktoJePrihlasen } from "@/lib/portal/pristup";
import { vyhodnotInspekci } from "@/lib/luna/run";

/**
 * Odeslání odjezdového protokolu.
 *
 * Vyhodnocení se pouští na pozadí — host nemá čekat, až model doběhne.
 * Výsledek je stejně jen podklad pro majitele, ne rozhodnutí.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  const pobyt = await ktoJePrihlasen();
  if (!pobyt) return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });

  /*
   * Rezervace může pokrývat víc domků.
   *
   * „Celý les" je složená jednotka a protokol se zakládá na fyzický domek,
   * takže se odesílají všechny inspekce naráz — host odesílá jeden protokol,
   * i když se uvnitř skládá ze dvou.
   */
  const inspekce = await radky<{ id: string; status: string; unit_slug: string }>(sql`
    SELECT id::text AS id, status, unit_slug FROM inspections
     WHERE reservation_id = ${pobyt.rezervaceId}::uuid AND type = 'checkout' ORDER BY id
  `);
  if (!inspekce.length) {
    return NextResponse.json({ error: "Protokol není založený." }, { status: 400 });
  }

  // `needs_photo` je protokol, u kterého jsme si řekli o doplňující snímek.
  // Ten se odesílá znovu a vyhodnocení proběhne s novou fotkou.
  const kOdeslani = inspekce.filter((i) => i.status === "draft" || i.status === "needs_photo");
  if (!kOdeslani.length) return NextResponse.json({ ok: true, uz: true });

  const [chybi] = await radky<{ n: number }>(sql`
    SELECT count(*)::int AS n
      FROM inspections i
      JOIN checklist_zones cz ON cz.checklist_version_id = i.checklist_version_id
     WHERE i.reservation_id = ${pobyt.rezervaceId}::uuid AND i.type = 'checkout' AND cz.required
       AND NOT EXISTS (
         SELECT 1 FROM inspection_photos p
          WHERE p.inspection_id = i.id AND p.zone_key = cz.zone_key AND p.deleted_at IS NULL)
  `);
  if (chybi && chybi.n > 0) {
    return NextResponse.json(
      { error: `Ještě chybí ${chybi.n} ${chibiSlovo(chybi.n)}.` },
      { status: 400 },
    );
  }

  for (const i of kOdeslani) {
    await radky(sql`
      UPDATE inspections
         SET status = 'submitted', submitted_at = now(), reopened_zones = '{}'::text[]
       WHERE id = ${i.id}::uuid
    `);
    // Úkol „čekáme na doplňující fotku" je vyřízený tím, že fotka dorazila.
    await radky(sql`
      UPDATE tasks SET resolved_at = now(), resolution_note = 'Host doplnil fotku.'
       WHERE inspection_id = ${i.id}::uuid AND resolved_at IS NULL
         AND title LIKE 'Čekáme na doplňující fotku%'
    `);
  }

  /*
   * Na pozadí: host dostane potvrzení hned, analýza doběhne mezitím.
   *
   * Přes `waitUntil`, ne jen `void`. Samotné `void` funguje na vlastním
   * serveru, ale v serverless prostředí se běh může po odeslání odpovědi
   * zmrazit — vyhodnocení by se zaseklo v půlce a protokol by zůstal viset
   * ve stavu „analyzing". Pojistkou je `/api/cron/vyhodnoceni`, která
   * zaseknuté protokoly dotáhne.
   *
   * Domky se vyhodnocují **za sebou**, ne najednou: dvě paralelní inspekce
   * by zdvojnásobily špičku volání modelu a hostovi by to nezrychlilo nic,
   * protože stejně čeká na obě.
   */
  waitUntil(
    (async () => {
      for (const i of kOdeslani) {
        await vyhodnotInspekci(i.id).catch((e) =>
          console.error(`[luna] vyhodnocení ${i.unit_slug} selhalo:`, e),
        );
      }
    })(),
  );

  return NextResponse.json({ ok: true });
}

/** „1 povinná zóna", „3 povinné zóny", „5 povinných zón". */
function chibiSlovo(n: number): string {
  if (n === 1) return "povinná zóna";
  return n < 5 ? "povinné zóny" : "povinných zón";
}
