import { NextResponse } from "next/server";
import { overCron } from "@/lib/cron/overeni";
import { uvolniVyprseleDrzeni } from "@/lib/reservations/expirace";

/**
 * Cron: uvolnění nezaplacených držení termínu. Běží každých 15 minut
 * (viz `vercel.json`). Chráněno `CRON_SECRET` — bez něj by to bylo veřejné
 * tlačítko na rušení cizích rezervací.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const nepovoleno = overCron(req);
  if (nepovoleno) return nepovoleno;

  const kody = await uvolniVyprseleDrzeni();
  if (kody.length) console.log(`[cron] uvolněno ${kody.length} termínů: ${kody.join(", ")}`);
  return NextResponse.json({ ok: true, uvolneno: kody.length, kody });
}
