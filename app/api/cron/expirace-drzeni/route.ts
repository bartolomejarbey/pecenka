import { NextResponse } from "next/server";
import { uvolniVyprseleDrzeni } from "@/lib/reservations/expirace";

/**
 * Cron: uvolnění nezaplacených držení termínu. Běží každých 15 minut
 * (viz `vercel.json`). Chráněno `CRON_SECRET` — bez něj by to bylo veřejné
 * tlačítko na rušení cizích rezervací.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const kody = await uvolniVyprseleDrzeni();
  if (kody.length) console.log(`[cron] uvolněno ${kody.length} termínů: ${kody.join(", ")}`);
  return NextResponse.json({ ok: true, uvolneno: kody.length, kody });
}
