import "server-only";

import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { COMGATE_ZAPNUT, spojeniZeProstredi, type BankovniSpojeni } from "./nastaveni";
import { comgateMetoda } from "./providers/comgate";
import { mockMetoda } from "./providers/mock";
import { qrMetoda } from "./providers/qr";
import type { IdPoskytovatele, PlatebniMetoda } from "./types";

export { COMGATE_ZAPNUT } from "./nastaveni";
export type { PlatebniMetoda, StavPlatby, VstupPlatby } from "./types";

/** Bankovní spojení — nejdřív z databáze, jinak z prostředí. */
export async function bankovniSpojeni(): Promise<BankovniSpojeni | null> {
  const [radek] = await radky<{
    bank_iban: string;
    bank_bic: string;
    bank_display: string;
    legal_name: string;
  }>(sql`SELECT bank_iban, bank_bic, bank_display, legal_name FROM company_settings WHERE id = 1`);

  if (radek && /^[A-Z]{2}\d{2}/.test(radek.bank_iban) && !radek.bank_iban.startsWith("CZ00000")) {
    return {
      iban: radek.bank_iban,
      bic: radek.bank_bic,
      zobrazit: radek.bank_display,
      prijemce: radek.legal_name,
    };
  }
  return spojeniZeProstredi();
}

/** Metody, které se mají hostovi nabídnout. */
export async function dostupneMetody(): Promise<PlatebniMetoda[]> {
  const spojeni = await bankovniSpojeni();
  const vsechny: PlatebniMetoda[] = [];
  if (spojeni) vsechny.push(qrMetoda(spojeni));
  if (COMGATE_ZAPNUT) vsechny.push(comgateMetoda());
  else vsechny.push(mockMetoda());
  return vsechny.filter((m) => m.dostupna());
}

export async function metoda(id: IdPoskytovatele): Promise<PlatebniMetoda | null> {
  return (await dostupneMetody()).find((m) => m.id === id) ?? null;
}
