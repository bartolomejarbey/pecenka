/**
 * Srovnání diakritiky pro vyhledávání.
 *
 * Rozšíření `unaccent` se schválně nepoužívá — v PGlite (lokální vývoj a testy)
 * není k dispozici, a mít v každém prostředí jiné chování vyhledávání je horší
 * než pár řádků v aplikaci.
 */
export function bezDiakritiky(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Text, podle kterého se rezervace hledá v administraci. */
export function hledaciText(casti: (string | null | undefined)[]): string {
  return bezDiakritiky(casti.filter(Boolean).join(" ")).replace(/\s+/g, " ");
}
