import { NextResponse, type NextRequest } from "next/server";
import { overPodpis } from "@/lib/payments/podpis";

/**
 * Vrstva před vykreslením stránky.
 *
 * Hlídá adresy, na kterých je platný podpis podmínkou. Kontrola v komponentě
 * sice obsah ochrání, ale Next už mezitím začal streamovat, takže `notFound()`
 * skončí jako „měkká 404" — stav 200 s obsahem 404. Tady se dá vrátit poctivá
 * 404, protože jsme před vykreslením.
 *
 * Bezpečnostní hlavičky sem **nepatří**: nasazuje je `next.config.ts` na
 * všechny odpovědi včetně statických, a to bez invokace navíc.
 */

// Proxy v Next 16 běží vždy na Node.js — runtime se nenastavuje.
/*
 * Proxy běží jen tam, kde má co dělat.
 *
 * Dřív se pouštěla skoro na všechno včetně `/`, `/cenik`, `/sitemap.xml`
 * a všech `/api/**` — na Vercelu invokace navíc před každou odpovědí, i těmi
 * z CDN. Bezpečnostní hlavičky se mezitím přesunuly do `next.config.ts`,
 * kde je nasazuje statická konfigurace, takže tady zbylo jen ověření podpisu
 * u dvou adres.
 */
export const config = {
  matcher: ["/rezervace/:kod/platba", "/doklad/:id"],
};

/**
 * Cesty, na kterých je platný podpis podmínkou.
 *
 * Podepisuje se ta část adresy, která věc jednoznačně určuje: kód rezervace
 * u platby, identifikátor u dokladu.
 */
const CHRANENE: RegExp[] = [
  /^\/rezervace\/([^/]+)\/platba\/?$/,
  /^\/doklad\/([^/]+)\/?$/,
];

export default function proxy(req: NextRequest) {
  const cesta = req.nextUrl.pathname;

  const shoda = CHRANENE.map((v) => v.exec(cesta)).find(Boolean);
  if (shoda) {
    const kod = decodeURIComponent(shoda[1]);
    const token = req.nextUrl.searchParams.get("t");
    if (!overPodpis(kod, token)) {
      // Schválně 404, ne 403: nechceme prozradit ani to, že takový kód existuje.
      return new NextResponse(null, { status: 404 });
    }
  }

  return NextResponse.next();
}
