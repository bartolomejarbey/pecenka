import { NextResponse } from "next/server";
import { ktoJePrihlasen } from "@/lib/portal/pristup";
import { nactiStavProtokolu } from "@/lib/portal/vysledek";

/**
 * Stav odjezdového protokolu pro hosta.
 *
 * Průvodce si sem chodí pro vzkaz, dokud vyhodnocení běží. Bez toho by host
 * po odeslání viděl jen „děkujeme" a odjel — a právě těch pár minut, kdy
 * ještě stojí v domku, je jediná chvíle, kdy se drobnost dá vyřešit.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const pobyt = await ktoJePrihlasen();
  if (!pobyt) return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });

  const stav = await nactiStavProtokolu(pobyt.rezervaceId);
  return NextResponse.json(stav, {
    headers: { "Cache-Control": "no-store" },
  });
}
