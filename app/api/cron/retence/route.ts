import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { overCron } from "@/lib/cron/overeni";
import { smaz } from "@/lib/luna/uloziste";

/**
 * Cron: mazání fotek po uplynutí lhůty.
 *
 * Portál hostovi slibuje: „Uchováváme je 90 dní po odjezdu a pak je mažeme."
 * `delete_after` se u každé fotky poctivě zapisovalo od začátku a **nikdo ho
 * nikdy nečetl** — fotky interiéru se hromadily napořád a slib byl planý.
 * U osobních údajů to není nepořádek, ale porušený závazek.
 *
 * Řádek v databázi zůstává (se `deleted_at`), aby šlo doložit, že fotka
 * existovala a kdy zmizela. Smaže se jen obsah.
 *
 * `legal_hold` má přednost: fotka, na které stojí nevyřízený spor o škodu,
 * se nemaže, dokud spor neskončí.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Kolik jich smazat v jednom běhu. Zbytek počká na zítřek. */
const DAVKA = 200;

export async function GET(req: Request) {
  const chyba = overCron(req);
  if (chyba) return chyba;

  const kSmazani = await radky<{ id: string; storage_key: string }>(sql`
    SELECT id::text AS id, storage_key
      FROM inspection_photos
     WHERE delete_after <= current_date
       AND deleted_at IS NULL
       AND NOT legal_hold
     ORDER BY delete_after
     LIMIT ${DAVKA}
  `);

  let smazano = 0;
  for (const f of kSmazani) {
    try {
      await smaz([f.storage_key]);
      await radky(sql`
        UPDATE inspection_photos SET deleted_at = now() WHERE id = ${f.id}::uuid
      `);
      smazano++;
    } catch (e) {
      // Sirotek v úložišti je menší zlo než zaseknutý úklid. Zkusí se zítra.
      console.error(`[cron] fotku ${f.id} se nepodařilo smazat:`, e);
    }
  }

  if (kSmazani.length) {
    console.log(`[cron] retence: smazáno ${smazano} z ${kSmazani.length} fotek po lhůtě`);
  }
  return NextResponse.json({ ok: true, nalezeno: kSmazani.length, smazano });
}
