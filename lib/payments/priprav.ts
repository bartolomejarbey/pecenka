import "server-only";

import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { bankovniSpojeni } from "./index";
import { podepis } from "./podpis";
import { sestavSpayd, zpravaProPrijemce } from "./spayd";

/**
 * Připraví platbu k zaplacení: dopočítá SPAYD řetězec a uloží ho.
 *
 * Ukládáme ho schválně — QR musí být reprodukovatelné bit po bitu i za rok,
 * až se bude dohledávat, co přesně měl host naskenované. Kdyby se mezitím
 * změnilo číslo účtu, přepočítaný QR by ukazoval jinam než ten v e-mailu.
 */

export type PlatbaKZaplaceni = {
  id: string;
  castkaHalere: number;
  variabilniSymbol: string;
  specifickySymbol: string | null;
  splatnost: Date | null;
  stav: string;
  spayd: string;
  /** Podepsaná adresa obrázku QR. */
  qrUrl: string;
  /** Zpráva pro příjemce — přesně ta, kterou nese QR kód. */
  zprava: string;
  ucet: { iban: string; zobrazit: string; prijemce: string };
};

const UCEL: Record<string, "ZALOHA" | "DOPLATEK" | "KAUCE"> = {
  deposit: "ZALOHA",
  balance: "DOPLATEK",
  security_deposit: "KAUCE",
};

export async function pripravPlatbu(platbaId: string): Promise<PlatbaKZaplaceni | null> {
  const [p] = await radky<{
    id: string;
    kind: string;
    amount_cents: string | number;
    variable_symbol: string;
    specific_symbol: string | null;
    due_at: string | null;
    status: string;
    spayd: string | null;
  }>(
    sql`SELECT id, kind, amount_cents, variable_symbol, specific_symbol, due_at, status, spayd
        FROM payments WHERE id = ${platbaId}::uuid`,
  );
  if (!p) return null;

  const spojeni = await bankovniSpojeni();
  if (!spojeni) return null;

  const castka = Number(p.amount_cents);
  const splatnost = p.due_at ? new Date(p.due_at) : null;

  const zprava = zpravaProPrijemce(p.variable_symbol, UCEL[p.kind] ?? "ZALOHA");

  let spayd = p.spayd;
  if (!spayd) {
    spayd = sestavSpayd({
      iban: spojeni.iban,
      bic: spojeni.bic || undefined,
      castkaHalere: castka,
      prijemce: spojeni.prijemce,
      splatnost: splatnost ?? undefined,
      vs: p.variable_symbol,
      ss: p.specific_symbol ?? undefined,
      zprava,
    });
    await radky(sql`UPDATE payments SET spayd = ${spayd} WHERE id = ${p.id}::uuid`);
  }

  return {
    id: p.id,
    castkaHalere: castka,
    variabilniSymbol: p.variable_symbol,
    specifickySymbol: p.specific_symbol,
    splatnost,
    stav: p.status,
    spayd,
    qrUrl: `/api/platba/qr?p=${p.id}&s=${podepis(p.id)}`,
    zprava,
    ucet: { iban: spojeni.iban, zobrazit: spojeni.zobrazit, prijemce: spojeni.prijemce },
  };
}
