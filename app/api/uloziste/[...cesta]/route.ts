import { NextResponse } from "next/server";
import { overOdkaz, stahni, variantaUloziste } from "@/lib/luna/uloziste";

/**
 * Výdej fotky z diskového úložiště.
 *
 * Existuje jen pro variantu bez Supabase (vývoj, vlastní server). Odkaz musí
 * nést podpis s krátkou platností — bez něj by fotky interiéru pronajatého
 * domku ležely na uhodnutelné adrese. Ověřuje se dřív, než se sáhne na disk.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ cesta: string[] }> },
) {
  if (variantaUloziste() !== "disk") {
    return new NextResponse(null, { status: 404 });
  }

  const { cesta } = await params;
  const klic = cesta.map(decodeURIComponent).join("/");
  const url = new URL(req.url);

  const chyba = overOdkaz(klic, url.searchParams.get("do"), url.searchParams.get("p"));
  // Schválně 404, ne 403: vypršelý a neexistující odkaz mají vypadat stejně.
  if (chyba) return new NextResponse(null, { status: 404 });

  try {
    const data = await stahni(klic);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/jpeg",
        // Kešuje jen prohlížeč hosta, ne sdílená mezipaměť — a nejdéle,
        // než odkaz stejně vyprší.
        "Cache-Control": "private, max-age=600",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
