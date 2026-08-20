"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { zapisDoDeniku } from "@/lib/auth/audit";
import { vyzadujMajitele } from "@/lib/auth/dal";
import { vystavKonecnou, vystavNedanovy, vystavOpravny, vystavZalohovou } from "./vystav";

/**
 * Akce nad doklady.
 *
 * Vystavit doklad smí jen majitel nebo účetní — úklid ne. Každé vystavení jde
 * do auditního deníku, protože doklad je účetní záznam a musí jít dohledat,
 * kdo ho vystavil.
 */

export type Vysledek = { ok: true; cislo: string; zprava: string } | { ok: false; chyba: string };

async function obal(
  rezervaceKod: string,
  akce: string,
  fn: () => Promise<{ ok: true; doklad: { id: string; cislo: string } } | { ok: false; chyba: string }>,
): Promise<Vysledek> {
  const kdo = await vyzadujMajitele();
  try {
    const v = await fn();
    if (!v.ok) return { ok: false, chyba: v.chyba };
    await zapisDoDeniku({
      akce,
      typEntity: "invoice",
      idEntity: v.doklad.id,
      kdo: kdo.id,
      zmena: { cislo: v.doklad.cislo, rezervace: rezervaceKod },
    });
    revalidatePath("/admin", "layout");
    return { ok: true, cislo: v.doklad.cislo, zprava: `Vystaveno: ${v.doklad.cislo}` };
  } catch (e) {
    console.error(`[doklady] ${akce} selhalo:`, e);
    return { ok: false, chyba: "Doklad se nepodařilo vystavit." };
  }
}

async function idRezervace(kod: string): Promise<string | null> {
  const [r] = await radky<{ id: string }>(
    sql`SELECT id::text AS id FROM reservations WHERE code = ${kod}`,
  );
  return r?.id ?? null;
}

export async function zalohovaFaktura(kod: string): Promise<Vysledek> {
  const id = await idRezervace(kod);
  if (!id) return { ok: false, chyba: "Rezervace nenalezena." };
  return obal(kod, "doklad.zalohova", () => vystavZalohovou(id));
}

export async function konecnaFaktura(kod: string): Promise<Vysledek> {
  const id = await idRezervace(kod);
  if (!id) return { ok: false, chyba: "Rezervace nenalezena." };
  return obal(kod, "doklad.konecna", () => vystavKonecnou(id));
}

/**
 * Opravný doklad. Volá se **až po** vrácení peněz — proto to rozhraní žádá
 * potvrzení, že vratka opravdu odešla.
 */
export async function opravnyDoklad(
  kod: string,
  dokladId: string,
  duvod: string,
  penizeVraceny: boolean,
): Promise<Vysledek> {
  if (!penizeVraceny) {
    return {
      ok: false,
      chyba:
        "Nejdřív pošli peníze zpátky, teprve pak dobropis. Vratka se může nepovést a doklad bez odeslaných peněz je vadný.",
    };
  }
  return obal(kod, "doklad.opravny", () => vystavOpravny(dokladId, duvod));
}

export async function nedanovyDoklad(
  kod: string,
  popis: string,
  castkaKc: number,
): Promise<Vysledek> {
  const id = await idRezervace(kod);
  if (!id) return { ok: false, chyba: "Rezervace nenalezena." };
  return obal(kod, "doklad.nedanovy", () => vystavNedanovy(id, popis, Math.round(castkaKc * 100)));
}
