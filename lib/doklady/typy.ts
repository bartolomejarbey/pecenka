/**
 * Typy dokladů.
 *
 * Rozdělení není kosmetické — každý typ má jiný daňový režim a jiné povinné
 * náležitosti. Zálohová faktura NENÍ daňový doklad; daňovým dokladem je až
 * doklad k přijaté platbě. Nedaňový doklad se používá tam, kde není plnění
 * (stornovací poplatek, náhrada škody) a nesmí na něm být sazba DPH.
 */

export type TypDokladu =
  | "PROFORMA" // zálohová faktura — výzva k platbě, není daňový doklad
  | "ADVANCE_TAX" // daňový doklad k přijaté platbě (jen plátce DPH)
  | "FINAL" // konečná faktura / daňový doklad
  | "CORRECTIVE" // opravný daňový doklad (dobropis)
  | "NON_TAX"; // nedaňový doklad — mimo předmět daně

export type StavDokladu =
  | "DRAFT"
  | "ISSUED"
  | "PAID"
  | "PARTIALLY_PAID"
  | "CANCELLED"
  | "CORRECTED";

/** Číselná řada pro každý typ. Řady se nemíchají a nikdy se nepřerušují. */
export const RADA: Record<TypDokladu, string> = {
  PROFORMA: "ZAL",
  ADVANCE_TAX: "DZP",
  FINAL: "FAK",
  CORRECTIVE: "OPD",
  NON_TAX: "NDD",
};

/** Jak se doklad jmenuje v hlavičce. Liší se podle toho, jestli jsme plátci. */
export function nazevDokladu(typ: TypDokladu, plátceDph: boolean): string {
  if (!plátceDph) {
    // Neplátce nesmí na dokladu použít slovo „daňový" ani uvést sazbu DPH.
    switch (typ) {
      case "PROFORMA":
        return "Zálohová faktura";
      case "CORRECTIVE":
        return "Opravný doklad";
      case "NON_TAX":
        return "Vyúčtování";
      default:
        return "Faktura";
    }
  }
  switch (typ) {
    case "PROFORMA":
      return "Zálohová faktura";
    case "ADVANCE_TAX":
      return "Daňový doklad k přijaté platbě";
    case "FINAL":
      return "Faktura — daňový doklad";
    case "CORRECTIVE":
      return "Opravný daňový doklad";
    case "NON_TAX":
      return "Vyúčtování (mimo předmět daně)";
  }
}

/** Druh řádku — určuje, jestli na něm smí být sazba DPH. */
export type DruhRadku =
  | "TAXABLE" // zdanitelné plnění
  | "PASS_THROUGH" // průběžná položka (poplatek obci) — mimo základ daně
  | "SECURITY_DEPOSIT" // jistota — není úplata za plnění
  | "DISCOUNT"
  | "ADVANCE_DEDUCTION" // odpočet již zdaněné zálohy
  | "ROUNDING";

/** Sazba DPH smí být jen na zdanitelném plnění — hlídá to i CHECK v databázi. */
export const smiMitSazbu = (druh: DruhRadku) => druh === "TAXABLE";

export type Radek = {
  poradi: number;
  druh: DruhRadku;
  kodPolozky: string | null;
  popis: string;
  czCpa: string | null;
  mnozstvi: number;
  jednotka: string;
  /** Jednotková cena VČETNĚ DPH, v haléřích. Ceník je koncový. */
  cenaSDphHalere: number;
  sazbaDph: number | null;
  zakladHalere: number;
  danHalere: number;
  celkemHalere: number;
  domekSlug: string | null;
  sluzbaOd: string | null;
  sluzbaDo: string | null;
};

/**
 * Rozpad ceny včetně DPH na základ a daň.
 *
 * Ceník je koncový (host vidí cenu s daní), takže se musí použít metoda podle
 * **§ 37 písm. b) ZDPH** — daň jako rozdíl úplaty a podílu úplaty a koeficientu.
 * (Písm. a) je výpočet zdola ze základu, který u koncových cen neznáme;
 * `SYSTEM.md` ho cituje chybně, viz `FAKTURACE.md`.)
 *
 * Druhé zaokrouhlení se schválně nedělá — odečtením je zaručeno, že
 * `základ + daň` dá přesně částku, kterou host viděl, a na dokladu nevznikne
 * haléřový rozdíl.
 */
export function rozpadDph(
  celkemHalere: number,
  sazba: number | null,
): { zaklad: number; dan: number } {
  if (sazba === null || sazba === 0) return { zaklad: celkemHalere, dan: 0 };
  const zaklad = Math.round(celkemHalere / (1 + sazba / 100));
  return { zaklad, dan: celkemHalere - zaklad };
}
