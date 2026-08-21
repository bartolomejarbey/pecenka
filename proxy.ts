import { NextResponse, type NextRequest } from "next/server";
import { overPodpis } from "@/lib/payments/podpis";

/**
 * Vrstva před vykreslením stránky.
 *
 * Dělá dvě věci:
 *
 * 1. **Bezpečnostní hlavičky** na všechny odpovědi.
 * 2. **Hlídá platební stránku.** Kontrola v komponentě sice obsah ochrání,
 *    ale Next už mezitím začal streamovat, takže `notFound()` skončí jako
 *    „měkká 404" — stav 200 s obsahem 404. Tady se dá vrátit poctivá 404,
 *    protože jsme před vykreslením.
 */

// Proxy v Next 16 běží vždy na Node.js — runtime se nenastavuje.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|foto|platby|icon-).*)"],
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

  const odpoved = NextResponse.next();
  for (const [jmeno, hodnota] of Object.entries(HLAVICKY)) {
    odpoved.headers.set(jmeno, hodnota);
  }
  return odpoved;
}

const HLAVICKY: Record<string, string> = {
  // Web se nikam nevkládá do rámu — obrana proti clickjackingu.
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  // Na cizí weby posíláme jen doménu, ne celou adresu (kódy rezervací!).
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Nic z toho web nepotřebuje.
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "X-DNS-Prefetch-Control": "on",
};
