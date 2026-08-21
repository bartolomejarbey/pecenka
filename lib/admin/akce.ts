"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { radky, radkyT, transakce, jePrekryvTerminu, type Spousteni } from "@/lib/db/client";
import { zapisDoDeniku } from "@/lib/auth/audit";
import { vyzadujMajitele, vyzadujPrihlaseni } from "@/lib/auth/dal";
import { icoSedi, naIban } from "./firma";
import { zalozPristup } from "@/lib/portal/pristup";
import { posliPristupDoPortalu } from "@/lib/mail/pobyt";

/**
 * Akce administrace.
 *
 * Zásady, které platí všude:
 *  · **Nic se nemaže.** Rezervace se stornuje, doklad se opravuje dobropisem.
 *  · Každá změna jde do auditního deníku — u agendy, kde se strhávají peníze
 *    z kauce, musí jít dohledat, kdo co kdy udělal.
 *  · Stav plateb se nikdy nenastavuje ručně, vždy se přepočítá z `payments`.
 */

export type Vysledek = { ok: true; zprava?: string } | { ok: false; chyba: string };

/** Přepočet stavu plateb z toho, co reálně dorazilo. */
async function prepocitejPlatby(tx: Spousteni, rezervaceId: string): Promise<void> {
  await tx.execute(sql`
    WITH souhrn AS (
      SELECT coalesce(sum(amount_cents) FILTER (WHERE direction = 'IN' AND status IN ('paid','overpaid')), 0)
           - coalesce(sum(amount_cents) FILTER (WHERE direction = 'OUT' AND status IN ('paid','refunded_full')), 0)
             AS zaplaceno
        FROM payments WHERE reservation_id = ${rezervaceId}::uuid
    )
    UPDATE reservations r
       SET paid_cents = souhrn.zaplaceno,
           payment_state = CASE
             WHEN souhrn.zaplaceno <= 0 THEN 'unpaid'
             WHEN souhrn.zaplaceno > r.total_cents THEN 'overpaid'
             WHEN souhrn.zaplaceno >= r.total_cents THEN 'paid'
             WHEN souhrn.zaplaceno >= r.deposit_required_cents THEN 'deposit_paid'
             ELSE 'unpaid'
           END::payment_state,
           updated_at = now()
      FROM souhrn
     WHERE r.id = ${rezervaceId}::uuid
  `);
}

async function najdi(tx: Spousteni, kod: string) {
  const [r] = await radkyT<{ id: string; status: string }>(
    tx,
    sql`SELECT id::text AS id, status::text AS status FROM reservations WHERE code = ${kod}`,
  );
  return r ?? null;
}

/* ===== Potvrzení rezervace ===== */

export async function potvrdRezervaci(kod: string): Promise<Vysledek> {
  const kdo = await vyzadujMajitele();
  try {
    const vysledek = await transakce(async (tx) => {
      const r = await najdi(tx, kod);
      if (!r) return { ok: false as const, chyba: "Rezervace nenalezena." };
      if (!["inquiry", "hold", "confirmed"].includes(r.status)) {
        return { ok: false as const, chyba: `Rezervaci ve stavu „${r.status}" nelze potvrdit.` };
      }

      // Poptávka termín neblokovala — blokaci zakládáme teprve teď.
      const [maBlokaci] = await radkyT<{ n: number }>(
        tx,
        sql`SELECT count(*)::int AS n FROM reservation_units WHERE reservation_id = ${r.id}::uuid`,
      );
      if (!maBlokaci || maBlokaci.n === 0) {
        await tx.execute(sql`
          INSERT INTO reservation_units (reservation_id, unit_id, checkin, checkout, status)
          SELECT r.id, coalesce(uc.member_unit_id, r.unit_id), r.checkin, r.checkout, 'confirmed'::reservation_status
            FROM reservations r
            LEFT JOIN unit_components uc ON uc.composite_unit_id = r.unit_id
           WHERE r.id = ${r.id}::uuid
        `);
      } else {
        await tx.execute(sql`
          UPDATE reservation_units SET status = 'confirmed'::reservation_status
           WHERE reservation_id = ${r.id}::uuid
        `);
      }

      await tx.execute(sql`
        UPDATE reservations
           SET status = 'confirmed'::reservation_status, hold_expires_at = NULL, updated_at = now()
         WHERE id = ${r.id}::uuid
      `);
      await tx.execute(sql`
        UPDATE tasks SET resolved_at = now(), resolved_by = ${kdo.id},
                         resolution_note = 'Potvrzeno v administraci.'
         WHERE reservation_id = ${r.id}::uuid AND kind IN ('manual_confirm','new_hold')
           AND resolved_at IS NULL
      `);
      return { ok: true as const, id: r.id };
    });

    if (!vysledek.ok) return vysledek;

    // Ruční potvrzení je pro hosta totéž jako zaplacená záloha — majitel
    // dostal peníze jinudy (hotově, převodem mimo systém). Portál se otevře
    // stejně, jinak by přístup dostali jen ti, u kterých se klikne na platbu.
    await otevriPortal(vysledek.id);

    await zapisDoDeniku({
      akce: "rezervace.potvrzena",
      typEntity: "reservation",
      idEntity: vysledek.id,
      kdo: kdo.id,
      zmena: { kod },
    });
    revalidatePath("/admin", "layout");
    return { ok: true, zprava: "Rezervace potvrzena." };
  } catch (e) {
    if (jePrekryvTerminu(e)) {
      return { ok: false, chyba: "Termín mezitím obsadila jiná rezervace. Zkontroluj kalendář." };
    }
    console.error("[admin] potvrzení selhalo:", e);
    return { ok: false, chyba: "Potvrzení se nepovedlo." };
  }
}

/* ===== Označení platby ===== */

export async function oznacZaplaceno(platbaId: string): Promise<Vysledek> {
  const kdo = await vyzadujMajitele();
  try {
    const id = await transakce(async (tx) => {
      const [p] = await radkyT<{ reservation_id: string; status: string }>(
        tx,
        sql`SELECT reservation_id::text AS reservation_id, status FROM payments WHERE id = ${platbaId}::uuid`,
      );
      if (!p) return null;
      if (p.status !== "paid") {
        await tx.execute(sql`
          UPDATE payments SET status = 'paid', paid_at = now(), matched_by = 'MANUAL'
           WHERE id = ${platbaId}::uuid
        `);
      }
      await prepocitejPlatby(tx, p.reservation_id);

      // Zaplacená záloha potvrzuje rezervaci, která se do té doby jen držela.
      await tx.execute(sql`
        UPDATE reservation_units SET status = 'confirmed'::reservation_status
         WHERE reservation_id = ${p.reservation_id}::uuid
           AND status = 'hold'::reservation_status
      `);
      await tx.execute(sql`
        UPDATE reservations
           SET status = 'confirmed'::reservation_status, hold_expires_at = NULL, updated_at = now()
         WHERE id = ${p.reservation_id}::uuid AND status = 'hold'::reservation_status
      `);
      return p.reservation_id;
    });

    if (!id) return { ok: false, chyba: "Platba nenalezena." };

    // Zaplacená záloha je jediný okamžik, kdy má smysl otevřít hostovi portál.
    // Běží až po commitu transakce: kdyby hašování kódu nebo pošta selhaly,
    // platba je zapsaná a majitel může přístup poslat znovu.
    await otevriPortal(id);

    await zapisDoDeniku({
      akce: "platba.oznacena_zaplacena",
      typEntity: "reservation",
      idEntity: id,
      kdo: kdo.id,
      zmena: { platbaId },
    });
    revalidatePath("/admin", "layout");
    return { ok: true, zprava: "Platba zapsána." };
  } catch (e) {
    console.error("[admin] označení platby selhalo:", e);
    return { ok: false, chyba: "Platbu se nepodařilo zapsat." };
  }
}

/**
 * Otevření portálu hosta po zaplacení zálohy.
 *
 * Dřív se `zalozPristup` nevolalo odnikud — host zaplatil, rezervace se
 * potvrdila a do portálu se nikdy nedostal, protože žádný přístup nevznikl.
 * Kód je odvozený z variabilního symbolu, takže opakované volání dá tentýž
 * kód a e-mail poslaný podruhé pořád platí.
 */
async function otevriPortal(rezervaceId: string): Promise<void> {
  try {
    const [r] = await radky<{
      status: string;
      code: string;
      variable_symbol: string;
      checkin: string;
      checkout: string;
      email: string | null;
      jmeno: string | null;
      domek: string | null;
    }>(sql`
      SELECT r.status::text AS status, r.code, r.variable_symbol,
             r.checkin::text AS checkin, r.checkout::text AS checkout,
             u.name AS domek,
             (SELECT g.email FROM reservation_guests rg JOIN guests g ON g.id = rg.guest_id
               WHERE rg.reservation_id = r.id AND rg.role = 'payer' LIMIT 1) AS email,
             (SELECT btrim(coalesce(g.first_name,'') || ' ' || coalesce(g.last_name,''))
                FROM reservation_guests rg JOIN guests g ON g.id = rg.guest_id
               WHERE rg.reservation_id = r.id AND rg.role = 'payer' LIMIT 1) AS jmeno
        FROM reservations r
        JOIN units u ON u.id = r.unit_id
       WHERE r.id = ${rezervaceId}::uuid
    `);

    if (!r || r.status !== "confirmed") return;

    const kod = await zalozPristup(rezervaceId);
    if (!r.email) return;

    await posliPristupDoPortalu({
      komu: r.email,
      jmeno: r.jmeno || "hoste",
      kodRezervace: r.code,
      vs: r.variable_symbol,
      kodPristupu: kod,
      domek: r.domek ?? "tiny house",
      prijezd: new Date(r.checkin),
      odjezd: new Date(r.checkout),
    });
  } catch (e) {
    // Portál se dá otevřít znovu, platba se přepisovat nemá.
    console.error("[admin] otevření portálu hosta selhalo:", e);
  }
}

/* ===== Storno ===== */

export async function zrusRezervaci(kod: string, duvod: string): Promise<Vysledek> {
  const kdo = await vyzadujMajitele();
  if (duvod.trim().length < 5) {
    return { ok: false, chyba: "Napiš prosím důvod storna — bude na dokladu i v historii." };
  }
  try {
    const id = await transakce(async (tx) => {
      const r = await najdi(tx, kod);
      if (!r) return null;
      // Uvolnění termínu je to podstatné: bez změny reservation_units by
      // databázové omezení drželo termín zabraný napořád.
      await tx.execute(sql`
        UPDATE reservation_units SET status = 'cancelled'::reservation_status
         WHERE reservation_id = ${r.id}::uuid
      `);
      await tx.execute(sql`
        UPDATE reservations
           SET status = 'cancelled'::reservation_status, cancelled_at = now(),
               cancel_reason = ${duvod.trim()}, hold_expires_at = NULL, updated_at = now()
         WHERE id = ${r.id}::uuid
      `);
      await tx.execute(sql`
        UPDATE payments SET status = 'cancelled'
         WHERE reservation_id = ${r.id}::uuid AND status IN ('created','pending')
      `);
      await tx.execute(sql`
        UPDATE tasks SET resolved_at = now(), resolved_by = ${kdo.id},
                         resolution_note = 'Rezervace stornována.'
         WHERE reservation_id = ${r.id}::uuid AND resolved_at IS NULL
      `);
      return r.id;
    });

    if (!id) return { ok: false, chyba: "Rezervace nenalezena." };
    await zapisDoDeniku({
      akce: "rezervace.stornovana",
      typEntity: "reservation",
      idEntity: id,
      kdo: kdo.id,
      zmena: { kod, duvod },
    });
    revalidatePath("/admin", "layout");
    return { ok: true, zprava: "Rezervace stornována, termín uvolněn." };
  } catch (e) {
    console.error("[admin] storno selhalo:", e);
    return { ok: false, chyba: "Storno se nepovedlo." };
  }
}

/* ===== Příjezd a odjezd ===== */

export async function zmenStav(
  kod: string,
  novy: "checked_in" | "checked_out" | "no_show",
): Promise<Vysledek> {
  const kdo = await vyzadujPrihlaseni();
  try {
    const id = await transakce(async (tx) => {
      const r = await najdi(tx, kod);
      if (!r) return null;
      await tx.execute(sql`
        UPDATE reservations SET status = ${novy}::reservation_status, updated_at = now()
         WHERE id = ${r.id}::uuid
      `);
      if (novy === "checked_in") {
        await tx.execute(sql`
          UPDATE reservation_units SET status = 'checked_in'::reservation_status
           WHERE reservation_id = ${r.id}::uuid
        `);
      }
      return r.id;
    });
    if (!id) return { ok: false, chyba: "Rezervace nenalezena." };
    await zapisDoDeniku({
      akce: `rezervace.${novy}`,
      typEntity: "reservation",
      idEntity: id,
      kdo: kdo.id,
      zmena: { kod },
    });
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    console.error("[admin] změna stavu selhala:", e);
    return { ok: false, chyba: "Změna se nepovedla." };
  }
}

/* ===== Interní poznámka ===== */

export async function ulozPoznamku(kod: string, text: string): Promise<Vysledek> {
  const kdo = await vyzadujPrihlaseni();
  const [r] = await radky<{ id: string }>(
    sql`SELECT id::text AS id FROM reservations WHERE code = ${kod}`,
  );
  if (!r) return { ok: false, chyba: "Rezervace nenalezena." };

  await radky(sql`
    UPDATE reservations SET note_internal = ${text.trim() || null}, updated_at = now()
     WHERE id = ${r.id}::uuid
  `);
  await zapisDoDeniku({
    akce: "rezervace.poznamka",
    typEntity: "reservation",
    idEntity: r.id,
    kdo: kdo.id,
  });
  revalidatePath(`/admin/rezervace/${kod}`);
  return { ok: true, zprava: "Poznámka uložena." };
}

/* ===== Údaje firmy ===== */

/**
 * Uložení fakturačních údajů.
 *
 * Kontroluje se tu víc, než je zvykem u nastavení, a schválně: tyhle údaje
 * jdou na doklad. IČO s překlepem doputuje k finančnímu úřadu, účet
 * s překlepem pošle zálohu cizímu člověku. Obojí se dá zjistit z kontrolní
 * číslice dřív, než se to stihne vytisknout.
 */
export async function ulozFirmu(f: {
  nazev: string;
  ico: string;
  dic: string;
  ulice: string;
  mesto: string;
  psc: string;
  ucet: string;
  platceDph: boolean;
  poplatekKc: string;
  vyhlaska: string;
  zalohaProcent: string;
  kauceKc: string;
  splatnostDni: string;
}): Promise<Vysledek> {
  const kdo = await vyzadujMajitele();

  const nazev = f.nazev.trim();
  if (nazev.length < 3) return { ok: false, chyba: "Doplňte jméno podnikatele nebo název firmy." };

  const ico = f.ico.replace(/\s/g, "");
  if (!icoSedi(ico)) {
    return { ok: false, chyba: "IČO nesedí na kontrolní číslici. Zkontrolujte prosím, jestli v něm není překlep." };
  }

  const dic = f.dic.replace(/\s/g, "").toUpperCase();
  if (dic && !/^CZ\d{8,10}$/.test(dic)) {
    return { ok: false, chyba: "DIČ má tvar CZ a osm až deset číslic, například CZ27074358." };
  }
  if (f.platceDph && !dic) {
    return { ok: false, chyba: "Plátce DPH musí mít DIČ — bez něj nejde vystavit daňový doklad." };
  }

  const ucet = naIban(f.ucet);
  if ("chyba" in ucet) return { ok: false, chyba: ucet.chyba };

  const psc = f.psc.replace(/\s/g, "");
  if (!/^\d{5}$/.test(psc)) return { ok: false, chyba: "PSČ má pět číslic." };
  if (f.ulice.trim().length < 3 || f.mesto.trim().length < 2) {
    return { ok: false, chyba: "Doplňte prosím ulici a obec — adresa je povinná náležitost dokladu." };
  }

  const cislo = (s: string, popis: string, max: number): { chyba: string } | { n: number } => {
    const n = Number(s.replace(",", ".").replace(/\s/g, ""));
    if (!Number.isFinite(n) || n < 0 || n > max) return { chyba: `${popis} musí být číslo mezi 0 a ${max}.` };
    return { n };
  };

  const poplatek = cislo(f.poplatekKc, "Poplatek z pobytu", 1000);
  if ("chyba" in poplatek) return { ok: false, chyba: poplatek.chyba };
  const kauce = cislo(f.kauceKc, "Kauce", 100_000);
  if ("chyba" in kauce) return { ok: false, chyba: kauce.chyba };
  const zaloha = cislo(f.zalohaProcent, "Záloha", 100);
  if ("chyba" in zaloha) return { ok: false, chyba: zaloha.chyba };
  const splatnost = cislo(f.splatnostDni, "Splatnost", 90);
  if ("chyba" in splatnost) return { ok: false, chyba: splatnost.chyba };

  const vyhlaska = f.vyhlaska.trim();
  if (poplatek.n > 0 && !vyhlaska) {
    return {
      ok: false,
      chyba: "U poplatku z pobytu doplňte číslo obecně závazné vyhlášky — patří na doklad jako důvod účtování.",
    };
  }

  // Klíče anglicky, protože v tomhle tvaru adresu zakládá `scripts/db-seed.mjs`
  // a doklad ji odtamtud čte. Dva tvary jedné věci by znamenaly, že doklad
  // vypadá jinak podle toho, jestli údaje někdo přes formulář přepsal.
  const adresa = { street: f.ulice.trim(), city: f.mesto.trim(), zip: psc, country: "CZ" };

  await radky(sql`
    UPDATE company_settings SET
      legal_name = ${nazev},
      ico = ${ico},
      dic = ${dic || null},
      address = ${JSON.stringify(adresa)}::jsonb,
      bank_iban = ${ucet.iban},
      bank_bic = ${ucet.bic},
      bank_display = ${ucet.zobrazeni},
      vat_payer = ${f.platceDph},
      city_tax_cents = ${Math.round(poplatek.n * 100)},
      city_tax_ozv_ref = ${vyhlaska || null},
      security_deposit_cents = ${Math.round(kauce.n * 100)},
      deposit_share_bp = ${Math.round(zaloha.n * 100)},
      invoice_due_days = ${Math.round(splatnost.n)},
      updated_at = now()
    WHERE id = 1
  `);

  await zapisDoDeniku({
    akce: "company.update",
    typEntity: "company_settings",
    idEntity: "1",
    kdo: kdo.id,
    zmena: { nazev, ico, ucet: ucet.zobrazeni, platceDph: f.platceDph, poplatekKc: poplatek.n },
  });

  revalidatePath("/admin/nastaveni");
  revalidatePath("/rezervace");
  return { ok: true, zprava: `Uloženo. Účet ${ucet.zobrazeni}${ucet.banka ? " · " + ucet.banka : ""}.` };
}
