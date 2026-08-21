import "server-only";

import { overPodpis, podepis } from "./podpis";

/**
 * Odkaz na platební stránku.
 *
 * Kód rezervace (`SL-26-0143`) je krátký a jde uhodnout, takže sám o sobě
 * nestačí — kdokoli by si mohl projít celou číselnou řadu a číst částky
 * a termíny cizích pobytů. Odkaz proto nese podpis.
 */

export function odkazNaPlatbu(kodRezervace: string): string {
  return `/rezervace/${encodeURIComponent(kodRezervace)}/platba?t=${podepis(kodRezervace)}`;
}

export function overOdkaz(kodRezervace: string, token: string | undefined): boolean {
  return Boolean(token) && overPodpis(kodRezervace, token!);
}

/**
 * Odkaz na doklad.
 *
 * Identifikátor dokladu je náhodné UUID, takže se uhodnout nedá — podpis je
 * tu proto, aby se odkaz nedal poslat dál omylem přeposláním celé adresy
 * z prohlížeče. Kontroluje ho `proxy.ts` ještě před vykreslením.
 */
export function odkazNaDoklad(idDokladu: string): string {
  return `/doklad/${idDokladu}?t=${podepis(idDokladu)}`;
}
