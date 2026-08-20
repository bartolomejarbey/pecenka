import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Podpis odkazů na platbu.
 *
 * QR obrázek se nesmí adresovat variabilním symbolem — VS je jen deset číslic
 * a jde odhadnout, takže by šlo enumerací zjistit částky a termíny cizích
 * rezervací. Odkaz proto nese podpis, který bez znalosti klíče nikdo nesloží.
 */

/**
 * Ve vývoji stačí pevný klíč, ať `npm run dev` funguje bez nastavování.
 * Naostro se sem nikdy nedostaneme — tam je klíč povinný.
 */
const VYVOJOVY_KLIC = "sedmyles-vyvojovy-klic-nikdy-naostro";

/** Náhradní klíč pro produkci bez nastavení. Náhodný = odkazy neplatí. */
let nahradni: string | null = null;
let uzVarovano = false;

function klic(): string {
  const k = process.env.PAYMENTS_SIGNING_KEY;
  if (k) return k;
  if (process.env.NODE_ENV !== "production") return VYVOJOVY_KLIC;

  // Naostro bez klíče: raději nefunkční odkaz než odkaz, který si kdokoli
  // spočítá. Selhává to zavřeně. `podpisyNastaveny()` zajistí, že se takový
  // odkaz vůbec nevygeneruje — tohle je až poslední pojistka.
  if (!nahradni) nahradni = randomBytes(32).toString("hex");
  if (!uzVarovano) {
    uzVarovano = true;
    console.error(
      "[platby] PAYMENTS_SIGNING_KEY není nastaven — odkazy na platbu se " +
        "nebudou generovat. Nastav proměnnou v prostředí.",
    );
  }
  return nahradni;
}

/**
 * Je podepisování nastavené natrvalo?
 *
 * Bez toho se odkaz na platbu vůbec negeneruje — host dostane platební údaje
 * e-mailem. Rozbitý odkaz, který vede na 404, je horší než žádný odkaz.
 */
export const podpisyNastaveny = () =>
  Boolean(process.env.PAYMENTS_SIGNING_KEY) || process.env.NODE_ENV !== "production";

export function podepis(hodnota: string): string {
  return createHmac("sha256", klic()).update(hodnota).digest("hex").slice(0, 32);
}

/** Porovnání odolné vůči měření času — jinak jde podpis uhodnout po znacích. */
export function overPodpis(hodnota: string, podpis: string | undefined | null): boolean {
  if (!podpis) return false;
  const ocekavany = Buffer.from(podepis(hodnota));
  const podany = Buffer.from(podpis);
  if (ocekavany.length !== podany.length) return false;
  return timingSafeEqual(ocekavany, podany);
}
