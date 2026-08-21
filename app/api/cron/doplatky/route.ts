import { NextResponse } from "next/server";
import { predepisDoplatky } from "@/lib/reservations/doplatek";
import { pripravPlatbu } from "@/lib/payments/priprav";
import { odkazNaPlatbu } from "@/lib/payments/odkaz";
import { podpisyNastaveny } from "@/lib/payments/podpis";
import { posliVyzvuKDoplatku } from "@/lib/mail/doplatek";

/**
 * Cron: předpis doplatků a výzva hostovi.
 *
 * Systém zakládal jen zálohu. Host ji zaplatil, rezervace se potvrdila —
 * a o zbytek ho nikdo nepožádal. Majitel by si musel pamatovat, komu kdy
 * napsat.
 *
 * Běží jednou denně. Předpis vzniká v transakci se `SKIP LOCKED`, takže
 * dvojí spuštění nevyrobí dvě výzvy na tutéž částku.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

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

  const predepsane = await predepisDoplatky();
  let poslano = 0;

  for (const d of predepsane) {
    if (!d.email) continue;
    try {
      const platba = await pripravPlatbu(d.platbaId);
      if (!platba) continue;
      const ok = await posliVyzvuKDoplatku({
        komu: d.email,
        jmeno: d.jmeno || "hoste",
        kodRezervace: d.kod,
        domek: d.domek,
        prijezd: new Date(d.prijezd),
        platba,
        odkaz: podpisyNastaveny() ? odkazNaPlatbu(d.kod) : null,
      });
      if (ok) poslano++;
    } catch (e) {
      // Předpis platí dál, výzvu lze poslat znovu z administrace.
      console.error(`[cron] výzva k doplatku ${d.kod} selhala:`, e);
    }
  }

  if (predepsane.length) {
    console.log(`[cron] doplatky: předepsáno ${predepsane.length}, odesláno ${poslano}`);
  }
  return NextResponse.json({ ok: true, predepsano: predepsane.length, poslano });
}
