import { NextResponse } from "next/server";
import { overCron } from "@/lib/cron/overeni";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { vyhodnotInspekci } from "@/lib/luna/run";

/**
 * Cron: dotažení protokolů, které uvízly ve vyhodnocování.
 *
 * Vyhodnocení se spouští na pozadí odeslání protokolu. Když se běh přeruší —
 * zmrazená serverless funkce, výpadek sítě k modelu, restart — zůstane
 * protokol viset ve stavu `analyzing` a nikdo se o něm nedozví. Host přitom
 * dávno odjel a majitel čeká na výsledek.
 *
 * Bere jen ty starší než deset minut, aby nešlápl na běh, který ještě
 * probíhá, a **nejvýš třikrát na protokol**. Bez toho se protokol, který
 * spolehlivě padá (chybí blob, model vrací 400), pouštěl každých patnáct
 * minut donekonečna a pokaždé stál až osmnáct volání modelu — účet rostl
 * a nikdo o tom nevěděl. Po třetím pokusu se založí úkol pro člověka.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Kolik jich dotáhnout v jednom běhu. Zbytek počká na další. */
const DAVKA = 3;

/** Kolikrát to zkusit, než se to předá člověku. */
const MAX_POKUSU = 3;

export async function GET(req: Request) {
  const nepovoleno = overCron(req);
  if (nepovoleno) return nepovoleno;

  const uvazle = await radky<{ id: string; stav: string }>(sql`
    SELECT id::text AS id, status AS stav
      FROM inspections
     WHERE status IN ('submitted', 'analyzing')
       AND submitted_at < now() - interval '10 minutes'
       AND (last_attempt_at IS NULL OR last_attempt_at < now() - interval '10 minutes')
       AND attempts < ${MAX_POKUSU}
     ORDER BY submitted_at
     LIMIT ${DAVKA}
  `);

  // Co se nepovedlo ani napotřetí, přestaneme zkoušet a řekneme to člověku.
  // Fotky jsou v pořádku uložené, jen se k nim nedostal model.
  await radky(sql`
    INSERT INTO tasks (kind, severity, reservation_id, inspection_id, title, detail)
    SELECT 'luna_review', 'urgent', i.reservation_id, i.id,
           'Vyhodnocení protokolu selhalo — ' || coalesce(u.name, i.unit_slug),
           'Tři pokusy o vyhodnocení skončily chybou: ' || coalesce(i.last_error, 'bez detailu') ||
           '. Fotky jsou uložené, projdi je prosím ručně.'
      FROM inspections i
      LEFT JOIN units u ON u.slug = i.unit_slug
     WHERE i.status IN ('submitted', 'analyzing')
       AND i.attempts >= ${MAX_POKUSU}
       AND NOT EXISTS (
         SELECT 1 FROM tasks t
          WHERE t.inspection_id = i.id AND t.severity = 'urgent' AND t.resolved_at IS NULL)
  `);

  const hotovo: string[] = [];
  const selhalo: string[] = [];
  for (const i of uvazle) {
    try {
      await vyhodnotInspekci(i.id);
      hotovo.push(i.id);
    } catch (e) {
      console.error(`[cron] dotažení protokolu ${i.id} selhalo:`, e);
      selhalo.push(i.id);
    }
  }

  if (uvazle.length) {
    console.log(`[cron] uvázlé protokoly: ${hotovo.length} dotaženo, ${selhalo.length} selhalo`);
  }
  return NextResponse.json({ ok: true, nalezeno: uvazle.length, hotovo: hotovo.length, selhalo: selhalo.length });
}
