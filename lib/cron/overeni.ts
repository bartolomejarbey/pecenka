import { NextResponse } from "next/server";

/**
 * Ověření, že požadavek na cron je náš.
 *
 * Bylo to zkopírované ve čtyřech routách. Pátá kopie by se dřív nebo později
 * lišila — a to je přesně ten druh chyby, u které nikdo nepozná, že vznikla.
 *
 * Vrací odpověď, kterou má routa rovnou vrátit, nebo `null`, když je vše
 * v pořádku. Bez `CRON_SECRET` se naostro nepustí nic: cron, který jde
 * spustit z internetu, umí utratit peníze za volání modelu.
 */
export function overCron(req: Request): NextResponse | null {
  const tajemstvi = process.env.CRON_SECRET;

  if (!tajemstvi) {
    return process.env.NODE_ENV === "production"
      ? NextResponse.json({ error: "CRON_SECRET není nastaven." }, { status: 503 })
      : null;
  }

  const podano =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    new URL(req.url).searchParams.get("token");

  return podano === tajemstvi ? null : NextResponse.json({ error: "Nepovoleno." }, { status: 401 });
}
