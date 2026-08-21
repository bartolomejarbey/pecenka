import "server-only";

import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { nazevDokladu, RADA, type TypDokladu } from "./typy";

/**
 * Načtení hotového dokladu k vytištění.
 *
 * Čte se snímek uložený při vystavení, ne dnešní stav. Doklad se po vystavení
 * nesmí měnit — kdyby se odběratel nebo cena dotahovaly živě, změnila by se
 * i faktura, kterou už má zákazník v ruce.
 */

export type Radek = {
  poradi: number;
  popis: string;
  mnozstvi: number;
  jednotka: string;
  jednotkovaCena: number;
  sazba: number | null;
  zaklad: number;
  dan: number;
  celkem: number;
  czCpa: string | null;
  odDne: string | null;
  doDne: string | null;
};

export type Doklad = {
  id: string;
  typ: TypDokladu;
  nazev: string;
  cislo: string;
  stav: string;
  vs: string;
  vystaveno: string | null;
  danovePlneni: string | null;
  splatnost: string | null;
  sDph: boolean;
  odberatel: Record<string, unknown>;
  dodavatel: {
    nazev: string;
    ico: string;
    dic: string | null;
    adresa: Record<string, string>;
    ucet: string;
    iban: string;
    bic: string;
    platceDph: boolean;
  };
  bezDph: number;
  dan: number;
  sDphCelkem: number;
  zaokrouhleni: number;
  jizZdaneneZalohy: number;
  kUhrade: number;
  duvodOpravy: string | null;
  kodRezervace: string;
  radky: Radek[];
};

export async function nactiDoklad(id: string): Promise<Doklad | null> {
  const [d] = await radky<Record<string, any>>(sql`
    SELECT i.id::text AS id, i.doc_type AS typ, i.number AS cislo, i.status AS stav,
           i.variable_symbol AS vs,
           i.issue_date::text AS vystaveno, i.tax_point_date::text AS plneni,
           i.due_date::text AS splatnost, i.vat_applicable AS s_dph,
           i.customer AS odberatel,
           i.total_without_vat_cents AS bez_dph, i.total_vat_cents AS dan,
           i.total_with_vat_cents AS s_dph_celkem, i.rounding_cents AS zaokrouhleni,
           i.already_taxed_advances_cents AS zalohy, i.amount_to_pay_cents AS k_uhrade,
           i.correction_reason AS duvod_opravy,
           r.code AS kod_rezervace
      FROM invoices i
      JOIN reservations r ON r.id = i.reservation_id
     WHERE i.id = ${id}::uuid AND i.status <> 'DRAFT'
  `);
  if (!d) return null;

  const [f] = await radky<Record<string, any>>(sql`
    SELECT legal_name, ico, dic, address, bank_display, bank_iban, bank_bic, vat_payer
      FROM company_settings WHERE id = 1
  `);

  const r = await radky<Record<string, any>>(sql`
    SELECT seq, description, quantity, unit, unit_price_with_vat_cents,
           vat_rate, base_cents, vat_cents, total_cents, cz_cpa,
           service_from::text AS od, service_to::text AS do
      FROM invoice_lines WHERE invoice_id = ${id}::uuid ORDER BY seq
  `);

  const jsonNeboObjekt = (h: unknown) =>
    typeof h === "string" ? JSON.parse(h) : ((h ?? {}) as Record<string, any>);

  return {
    id: d.id,
    typ: d.typ as TypDokladu,
    nazev: nazevDokladu(d.typ as TypDokladu, Boolean(f?.vat_payer)),
    cislo: d.cislo ?? "",
    stav: d.stav,
    vs: d.vs,
    vystaveno: d.vystaveno,
    danovePlneni: d.plneni,
    splatnost: d.splatnost,
    sDph: Boolean(d.s_dph),
    odberatel: jsonNeboObjekt(d.odberatel),
    dodavatel: {
      nazev: f?.legal_name ?? "",
      ico: f?.ico ?? "",
      dic: f?.dic ?? null,
      adresa: jsonNeboObjekt(f?.address),
      ucet: f?.bank_display ?? "",
      iban: f?.bank_iban ?? "",
      bic: f?.bank_bic ?? "",
      platceDph: Boolean(f?.vat_payer),
    },
    bezDph: Number(d.bez_dph),
    dan: Number(d.dan),
    sDphCelkem: Number(d.s_dph_celkem),
    zaokrouhleni: Number(d.zaokrouhleni),
    jizZdaneneZalohy: Number(d.zalohy),
    kUhrade: Number(d.k_uhrade),
    // Odkaz na původní doklad je součástí důvodu opravy — vystavování ho tam
    // vkládá jako „(k dokladu FAK-2026-0001)". Zákon vyžaduje, aby na
    // opravném dokladu byl; strukturovaná vazba v databázi zatím není.
    duvodOpravy: d.duvod_opravy,
    kodRezervace: d.kod_rezervace,
    radky: r.map((x) => ({
      poradi: x.seq,
      popis: x.description,
      mnozstvi: Number(x.quantity),
      jednotka: x.unit,
      jednotkovaCena: Number(x.unit_price_with_vat_cents),
      sazba: x.vat_rate === null ? null : Number(x.vat_rate),
      zaklad: Number(x.base_cents),
      dan: Number(x.vat_cents),
      celkem: Number(x.total_cents),
      czCpa: x.cz_cpa,
      odDne: x.od,
      doDne: x.do,
    })),
  };
}

/** Řada dokladu — pro popisek a název souboru. */
export const radaDokladu = RADA;
