"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { zapisDoDeniku } from "@/lib/auth/audit";
import { vyzadujMajitele } from "@/lib/auth/dal";
import { vystavKonecnou, vystavNedanovy, vystavOpravny, vystavZalohovou } from "./vystav";
import { nazevDokladu, type TypDokladu } from "./typy";
import { odkazNaDoklad } from "@/lib/payments/odkaz";
import { podpisyNastaveny } from "@/lib/payments/podpis";
import { posliDoklad } from "@/lib/mail/doklad";

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

    // Doklad, který leží jen v administraci, nikomu nepomůže. Posílá se
    // hostovi hned — mimo hlavní cestu, takže když pošta spadne, doklad je
    // vystavený a majitel ho může poslat znovu tlačítkem „Otevřít".
    const poslano = await posliHostovi(v.doklad.id).catch((e) => {
      console.error("[doklady] odeslání dokladu selhalo:", e);
      return false;
    });

    return {
      ok: true,
      cislo: v.doklad.cislo,
      zprava: poslano
        ? `Vystaveno: ${v.doklad.cislo}. Odesláno hostovi.`
        : `Vystaveno: ${v.doklad.cislo}.`,
    };
  } catch (e) {
    console.error(`[doklady] ${akce} selhalo:`, e);
    return { ok: false, chyba: "Doklad se nepodařilo vystavit." };
  }
}

/**
 * Odeslání hotového dokladu hostovi.
 *
 * Vrací `false`, když se poslat nedá — bez e-mailu hosta, bez podpisového
 * klíče nebo bez nastavené pošty. Není to chyba vystavení, jen se to nemá
 * tvrdit v hlášce.
 */
async function posliHostovi(idDokladu: string): Promise<boolean> {
  if (!podpisyNastaveny()) return false;

  const [d] = await radky<{
    nazev_typ: string;
    cislo: string;
    vs: string;
    splatnost: string | null;
    celkem: string | number;
    k_uhrade: string | number;
    s_dph: boolean;
    email: string | null;
    jmeno: string | null;
    ucet: string | null;
  }>(sql`
    SELECT i.doc_type AS nazev_typ, i.number AS cislo, i.variable_symbol AS vs,
           i.due_date::text AS splatnost, i.total_with_vat_cents AS celkem,
           i.amount_to_pay_cents AS k_uhrade, i.vat_applicable AS s_dph,
           (SELECT c.bank_display FROM company_settings c WHERE c.id = 1) AS ucet,
           (SELECT g.email FROM reservation_guests rg JOIN guests g ON g.id = rg.guest_id
             WHERE rg.reservation_id = i.reservation_id AND rg.role = 'payer' LIMIT 1) AS email,
           (SELECT btrim(coalesce(g.first_name,'') || ' ' || coalesce(g.last_name,''))
              FROM reservation_guests rg JOIN guests g ON g.id = rg.guest_id
             WHERE rg.reservation_id = i.reservation_id AND rg.role = 'payer' LIMIT 1) AS jmeno
      FROM invoices i WHERE i.id = ${idDokladu}::uuid
  `);
  if (!d?.email || !d.cislo) return false;

  return posliDoklad({
    komu: d.email,
    jmeno: d.jmeno || "hoste",
    nazev: nazevDokladu(d.nazev_typ as TypDokladu, Boolean(d.s_dph)),
    cislo: d.cislo,
    celkemHalere: Number(d.celkem),
    kUhradeHalere: Number(d.k_uhrade),
    splatnost: d.splatnost ? new Date(d.splatnost) : null,
    vs: d.vs,
    ucet: d.ucet ?? "",
    odkaz: odkazNaDoklad(idDokladu),
  });
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
