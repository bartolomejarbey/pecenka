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

  const [inspekce] = await radky<{ id: string; status: string }>(sql`
    SELECT id::text AS id, status FROM inspections
     WHERE reservation_id = ${pobyt.rezervaceId}::uuid AND type = 'checkout' ORDER BY id LIMIT 1
  `);
  if (!inspekce) return NextResponse.json({ error: "Protokol není založený." }, { status: 400 });
  if (inspekce.status !== "draft") {
    return NextResponse.json({ ok: true, uz: true });
  }

  const [chybi] = await radky<{ n: number }>(sql`
    SELECT count(*)::int AS n
      FROM checklist_zones cz
      JOIN inspections i ON i.checklist_version_id = cz.checklist_version_id
     WHERE i.id = ${inspekce.id}::uuid AND cz.required
       AND NOT EXISTS (
         SELECT 1 FROM inspection_photos p
          WHERE p.inspection_id = i.id AND p.zone_key = cz.zone_key)
  `);
  if (chybi && chybi.n > 0) {
    return NextResponse.json(
      { error: `Ještě chybí ${chybi.n} ${chybi.n === 1 ? "povinná zóna" : "povinných zón"}.` },
      { status: 400 },
    );
  }

  await radky(sql`
    UPDATE inspections SET status = 'submitted', submitted_at = now()
     WHERE id = ${inspekce.id}::uuid
  `);

  /*
   * Na pozadí: host dostane potvrzení hned, analýza doběhne mezitím.
   *
   * Přes `waitUntil`, ne jen `void`. Samotné `void` funguje na vlastním
   * serveru, ale v serverless prostředí se běh může po odeslání odpovědi
   * zmrazit — vyhodnocení by se zaseklo v půlce a protokol by zůstal viset
   * ve stavu „analyzing". Pojistkou je `/api/cron/vyhodnoceni`, která
   * zaseknuté protokoly dotáhne.
   */
  waitUntil(
    vyhodnotInspekci(inspekce.id).catch((e) =>
      console.error("[luna] vyhodnocení selhalo:", e),
    ),
  );

  return NextResponse.json({ ok: true });
}
