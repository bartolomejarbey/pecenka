import "server-only";

/**
 * Bankovní spojení a stav zasmluvnění brány.
 *
 * Aktivace ComGate je odvozená od proměnných prostředí, ne od přepínače
 * v kódu — po podpisu smlouvy stačí doplnit tři hodnoty ve Vercelu.
 */

export const COMGATE_ZAPNUT = Boolean(
  process.env.COMGATE_MERCHANT && process.env.COMGATE_SECRET,
);

export const COMGATE_TESTOVACI = process.env.COMGATE_TEST !== "false";

export type BankovniSpojeni = {
  iban: string;
  bic: string;
  /** Tuzemský tvar do textu vedle QR — lidé ho čtou snáz než IBAN. */
  zobrazit: string;
  prijemce: string;
};

/**
 * Bankovní spojení. Přednost mají údaje z databáze (`company_settings`),
 * proměnné prostředí jsou záloha pro případ, že se seed ještě nepustil.
 */
export function spojeniZeProstredi(): BankovniSpojeni | null {
  const iban = process.env.BANK_IBAN;
  if (!iban) return null;
  return {
    iban,
    bic: process.env.BANK_BIC ?? "",
    zobrazit: process.env.BANK_DISPLAY ?? iban,
    prijemce: "Sedmy les",
  };
}
