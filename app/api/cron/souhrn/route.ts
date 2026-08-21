import { NextResponse } from "next/server";
import { nactiDnes } from "@/lib/admin/dnes";
import { posliRanniSouhrn, stojiZaOdeslani } from "@/lib/mail/souhrn";

/**
 * Cron: ranní souhrn provozovateli.
 *
 * Úkoly se v systému zakládaly, ale nikam se neozvaly — o nálezu v protokolu
 * nebo o vypršené záloze se majitel dozvěděl, jen když se sám přihlásil.
 *
 * Jeden e-mail ráno, ne upozornění na každou drobnost: u dvou domků se
 * z deseti notifikací denně stane šum, který se přestane číst. Když se nic
 * neděje a nic nečeká, e-mail nechodí vůbec.
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

  const komu = process.env.CONTACT_TO ?? process.env.SMTP_USER;
  if (!komu) {
    return NextResponse.json({ ok: true, posláno: false, duvod: "není komu" });
  }

  const dnes = await nactiDnes();
  if (!stojiZaOdeslani(dnes)) {
    return NextResponse.json({ ok: true, posláno: false, duvod: "klid" });
  }

  const zaklad = process.env.APP_URL ?? "https://sedmyles.cz";
  const poslano = await posliRanniSouhrn({ komu, dnes, odkazAdmin: `${zaklad}/admin` });

  return NextResponse.json({
    ok: true,
    posláno: poslano,
    prijezdu: dnes.prijizdi.length,
    odjezdu: dnes.odjizdi.length,
    ukolu: dnes.ukoly.length,
  });
}
