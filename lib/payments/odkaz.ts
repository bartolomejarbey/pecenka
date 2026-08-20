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
