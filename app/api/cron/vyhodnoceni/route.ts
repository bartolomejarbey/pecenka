import { NextResponse } from "next/server";
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
 * probíhá. Vyhodnocení je samo o sobě idempotentní — nálezy se zakládají
 * proti `inspection_id` a zóně.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Kolik jich dotáhnout v jednom běhu. Zbytek počká na další. */
const DAVKA = 3;

export async function GET(req: Request) {
  const tajemstvi = process.env.CRON_SECRET;
  if (tajemstvi) {
    const podano =
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      new URL(req.url).searchParams.get("token");
    if (podano !== tajemstvi) {
      return NextResponse.json({ error: "Nepovoleno." }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET není nastaven." }, { status: 503 });
  }

  const uvazle = await radky<{ id: string; stav: string }>(sql`
    SELECT id::text AS id, status AS stav
      FROM inspections
     WHERE status IN ('submitted', 'analyzing')
       AND submitted_at < now() - interval '10 minutes'
     ORDER BY submitted_at
     LIMIT ${DAVKA}
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
