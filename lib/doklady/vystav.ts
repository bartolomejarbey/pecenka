import "server-only";

import { sql } from "drizzle-orm";
import { radkyT, transakce, type Spousteni } from "@/lib/db/client";
import { dalsiCislo } from "./rady";
import {
  nazevDokladu,
  rozpadDph,
  smiMitSazbu,
  type DruhRadku,
  type Radek,
  type TypDokladu,
} from "./typy";

/**
 * Vystavení dokladů.
 *
 * Pravidla, která tenhle modul vynucuje a nikde se neobcházejí:
 *
 *  1. **Vystavený doklad se needituje.** Nikdy. Oprava se dělá jen opravným
 *     dokladem. Číslo se přiděluje až při vystavení, aby řada nepřerušila.
 *  2. **Sazba DPH smí být jen na zdanitelném plnění.** Poplatek obci, jistota
 *     ani náhrada škody nejsou plnění a sazbu nést nesmí — hlídá to i CHECK
 *     `vat_only_on_taxable` v databázi.
 *  3. **Neplátce DPH** nemá na dokladu ani slovo „daňový", ani sazbu, ani
 *     „0 % DPH". Místo toho povinnou větu „Nejsem plátce DPH."
 *  4. **Opravný doklad se vystavuje až po úspěšné vratce**, ne před ní.
 *     Refundace legitimně selhává a doklad bez odeslaných peněz je vadný.
 *     Opačné pořadí jde vždycky opravit, tohle ne.
 */

export type Firma = {
  nazev: string;
  ico: string;
  dic: string | null;
  adresa: Record<string, string>;
  ucet: string;
  plátceDph: boolean;
};

export type Odberatel = {
  jmeno: string;
  email: string | null;
  telefon: string | null;
  adresa: Record<string, string> | null;
  ico: string | null;
  dic: string | null;
};

export type Doklad = {
  id: string;
  cislo: string;
  typ: TypDokladu;
  nazev: string;
  stav: string;
  vs: string;
  vystaveno: string;
  splatnost: string | null;
  danovePlneni: string | null;
  odberatel: Odberatel;
  radky: Radek[];
  zakladCelkem: number;
  danCelkem: number;
  celkem: number;
  odectenoZaloh: number;
  kUhrade: number;
  duvodOpravy: string | null;
  plátceDph: boolean;
};

export type Chyba = { ok: false; chyba: string };
export type Uspech = { ok: true; doklad: Doklad };

const cislo = (v: string | number | null) => (v === null ? 0 : typeof v === "number" ? v : Number(v));

/* ===== Načtení firmy a odběratele ===== */

async function nactiFirmu(tx: Spousteni): Promise<Firma | null> {
  const [f] = await radkyT<{
    legal_name: string;
    ico: string;
    dic: string | null;
    address: Record<string, string>;
    bank_display: string;
    vat_payer: boolean;
  }>(tx, sql`SELECT legal_name, ico, dic, address, bank_display, vat_payer FROM company_settings WHERE id = 1`);
  if (!f) return null;
  return {
    nazev: f.legal_name,
    ico: f.ico,
    dic: f.dic,
    adresa: typeof f.address === "string" ? JSON.parse(f.address) : f.address,
    ucet: f.bank_display,
    plátceDph: f.vat_payer,
  };
}

async function nactiOdberatele(tx: Spousteni, rezervaceId: string): Promise<Odberatel> {
  const [g] = await radkyT<{
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone_e164: string | null;
    address: Record<string, string> | null;
    billing_name: string | null;
    billing_ico: string | null;
    billing_dic: string | null;
  }>(
    tx,
    sql`SELECT g.first_name, g.last_name, g.email, g.phone_e164, g.address,
               g.billing_name, g.billing_ico, g.billing_dic
          FROM reservation_guests rg JOIN guests g ON g.id = rg.guest_id
         WHERE rg.reservation_id = ${rezervaceId}::uuid AND rg.role = 'payer' LIMIT 1`,
  );
  const cele = [g?.first_name, g?.last_name].filter(Boolean).join(" ").trim();
  return {
    jmeno: g?.billing_name || cele || "Neuvedeno",
    email: g?.email ?? null,
    telefon: g?.phone_e164 ?? null,
    adresa: g?.address ? (typeof g.address === "string" ? JSON.parse(g.address) : g.address) : null,
    ico: g?.billing_ico ?? null,
    dic: g?.billing_dic ?? null,
  };
}

/* ===== Sestavení řádků z rezervace ===== */

const JEDNOTKA: Record<string, string> = {
  night: "noc",
  addon: "ks",
  discount: "pobyt",
  city_tax: "osoba/noc",
  damage: "pobyt",
};

const DRUH: Record<string, DruhRadku> = {
  night: "TAXABLE",
  addon: "TAXABLE",
  discount: "DISCOUNT",
  city_tax: "PASS_THROUGH",
  damage: "PASS_THROUGH",
};

async function radkyZRezervace(
  tx: Spousteni,
  rezervaceId: string,
  plátceDph: boolean,
): Promise<Radek[]> {
  const polozky = await radkyT<{
    kind: string;
    price_item_code: string | null;
    label: string;
    date: string | null;
    unit_slug: string | null;
    unit_name: string | null;
    qty: string | number;
    unit_price_cents: string | number;
    total_cents: string | number;
    vat_rate: number | null;
    cz_cpa: string | null;
  }>(
    tx,
    sql`SELECT ri.kind, ri.price_item_code, ri.label, ri.date::text AS date, ri.unit_slug,
               u.name AS unit_name,
               ri.qty, ri.unit_price_cents, ri.total_cents, ri.vat_rate, pi.cz_cpa
          FROM reservation_items ri
          LEFT JOIN price_items pi ON pi.code = ri.price_item_code
          LEFT JOIN units u ON u.slug = ri.unit_slug
         WHERE ri.reservation_id = ${rezervaceId}::uuid
         ORDER BY CASE ri.kind WHEN 'night' THEN 0 WHEN 'addon' THEN 1
                               WHEN 'discount' THEN 2 ELSE 3 END, ri.date NULLS LAST, ri.label`,
  );

  // Noci se slučují do jednoho řádku za domek — faktura se čtrnácti řádky
  // „Ubytování 12. 9." je pro hosta k ničemu.
  const noci = polozky.filter((p) => p.kind === "night");
  const ostatni = polozky.filter((p) => p.kind !== "night");
  const radky: Radek[] = [];
  let poradi = 1;

  const podleDomku = new Map<string, typeof noci>();
  for (const n of noci) {
    const k = n.unit_slug ?? "";
    podleDomku.set(k, [...(podleDomku.get(k) ?? []), n]);
  }
  for (const [domek, skupina] of podleDomku) {
    const celkem = skupina.reduce((s, n) => s + cislo(n.total_cents), 0);
    const datumy = skupina.map((n) => n.date).filter(Boolean).sort() as string[];
    const sazba = plátceDph ? (skupina[0]?.vat_rate ?? null) : null;
    const { zaklad, dan } = rozpadDph(celkem, sazba);
    radky.push({
      poradi: poradi++,
      druh: "TAXABLE",
      kodPolozky: "NIGHT",
      // Na dokladu se domek jmenuje tak, jak ho zná host — „Achát", ne „achat".
      popis: `Ubytování — domek ${skupina[0]?.unit_name ?? domek ?? "?"}, ${skupina.length} ${skupina.length === 1 ? "noc" : skupina.length < 5 ? "noci" : "nocí"}`,
      czCpa: plátceDph ? (skupina[0]?.cz_cpa ?? "55.20") : null,
      mnozstvi: skupina.length,
      jednotka: "noc",
      cenaSDphHalere: Math.round(celkem / Math.max(skupina.length, 1)),
      sazbaDph: sazba,
      zakladHalere: zaklad,
      danHalere: dan,
      celkemHalere: celkem,
      domekSlug: domek || null,
      sluzbaOd: datumy[0] ?? null,
      sluzbaDo: datumy[datumy.length - 1] ?? null,
    });
  }

  for (const p of ostatni) {
    const druh = DRUH[p.kind] ?? "TAXABLE";
    const celkem = cislo(p.total_cents);
    const sazba = plátceDph && smiMitSazbu(druh) ? p.vat_rate : null;
    const { zaklad, dan } = rozpadDph(celkem, sazba);
    radky.push({
      poradi: poradi++,
      druh,
      kodPolozky: p.price_item_code,
      popis: p.label,
      czCpa: plátceDph && smiMitSazbu(druh) ? p.cz_cpa : null,
      mnozstvi: Number(p.qty),
      jednotka: JEDNOTKA[p.kind] ?? "ks",
      cenaSDphHalere: cislo(p.unit_price_cents),
      sazbaDph: sazba,
      zakladHalere: zaklad,
      danHalere: dan,
      celkemHalere: celkem,
      domekSlug: p.unit_slug,
      sluzbaOd: p.date,
      sluzbaDo: p.date,
    });
  }
  return radky;
}

/* ===== Zápis dokladu ===== */

type Zadani = {
  rezervaceId: string;
  typ: TypDokladu;
  radky: Radek[];
  splatnostDni?: number;
  danovePlneni?: string | null;
  duvodOpravy?: string | null;
  odectenoZaloh?: number;
  /** Doklad, který se tímhle opravuje nebo zúčtovává. */
  navazujeNa?: { id: string; vztah: "SETTLES_ADVANCE" | "CORRECTS" | "ISSUED_FROM_PROFORMA" } | null;
};

async function zapis(tx: Spousteni, z: Zadani): Promise<Uspech | Chyba> {
  const firma = await nactiFirmu(tx);
  if (!firma) return { ok: false, chyba: "Chybí údaje firmy v nastavení." };
  if (firma.nazev.startsWith("DOPLNIT") || firma.ico === "00000000") {
    return {
      ok: false,
      chyba: "Doplň v nastavení jméno podnikatele, IČO a adresu — bez nich doklad nemá povinné náležitosti.",
    };
  }

  const [rez] = await radkyT<{ variable_symbol: string; code: string }>(
    tx,
    sql`SELECT variable_symbol, code FROM reservations WHERE id = ${z.rezervaceId}::uuid`,
  );
  if (!rez) return { ok: false, chyba: "Rezervace nenalezena." };

  const odberatel = await nactiOdberatele(tx, z.rezervaceId);
  const rok = new Date().getFullYear();
  const { cislo: cisloDokladu, rada } = await dalsiCislo(tx, z.typ, rok);

  const zakladCelkem = z.radky.reduce((s, r) => s + r.zakladHalere, 0);
  const danCelkem = z.radky.reduce((s, r) => s + r.danHalere, 0);
  const celkem = z.radky.reduce((s, r) => s + r.celkemHalere, 0);
  const odecteno = z.odectenoZaloh ?? 0;

  const dnes = new Date();
  const splatnost = z.splatnostDni
    ? new Date(dnes.getTime() + z.splatnostDni * 86400_000).toISOString().slice(0, 10)
    : null;

  const [ulozeny] = await radkyT<{ id: string }>(
    tx,
    sql`INSERT INTO invoices (
          doc_type, number, series_code, year, status, reservation_id, engine,
          variable_symbol, issue_date, tax_point_date, due_date, vat_applicable,
          customer, total_without_vat_cents, total_vat_cents, total_with_vat_cents,
          already_taxed_advances_cents, amount_to_pay_cents, correction_reason)
        VALUES (
          ${z.typ}, ${cisloDokladu}, ${rada}, ${rok}, 'ISSUED', ${z.rezervaceId}::uuid, 'local',
          ${rez.variable_symbol}, CURRENT_DATE,
          ${z.danovePlneni ?? null}::date, ${splatnost}::date, ${firma.plátceDph},
          ${JSON.stringify(odberatel)}::jsonb,
          ${zakladCelkem}, ${danCelkem}, ${celkem}, ${odecteno}, ${celkem - odecteno},
          ${z.duvodOpravy ?? null})
        RETURNING id`,
  );

  for (const r of z.radky) {
    await tx.execute(sql`
      INSERT INTO invoice_lines (invoice_id, seq, line_kind, price_item_code, description, cz_cpa,
        quantity, unit, unit_price_with_vat_cents, vat_rate, base_cents, vat_cents, total_cents,
        unit_slug, service_from, service_to)
      VALUES (${ulozeny.id}::uuid, ${r.poradi}, ${r.druh}, ${r.kodPolozky}, ${r.popis}, ${r.czCpa},
        ${r.mnozstvi}, ${r.jednotka}, ${r.cenaSDphHalere}, ${r.sazbaDph},
        ${r.zakladHalere}, ${r.danHalere}, ${r.celkemHalere},
        ${r.domekSlug}, ${r.sluzbaOd}::date, ${r.sluzbaDo}::date)
    `);
  }

  // Rekapitulace DPH po sazbách — povinná náležitost daňového dokladu.
  if (firma.plátceDph) {
    await tx.execute(sql`
      INSERT INTO invoice_vat_summary (invoice_id, vat_rate, base_cents, vat_cents, total_cents)
      SELECT ${ulozeny.id}::uuid, vat_rate, sum(base_cents), sum(vat_cents), sum(total_cents)
        FROM invoice_lines WHERE invoice_id = ${ulozeny.id}::uuid
       GROUP BY vat_rate
    `);
  }

  if (z.navazujeNa) {
    await tx.execute(sql`
      INSERT INTO invoice_relations (parent_invoice_id, child_invoice_id, relation_type, amount_cents)
      VALUES (${z.navazujeNa.id}::uuid, ${ulozeny.id}::uuid, ${z.navazujeNa.vztah}, ${Math.abs(celkem)})
      ON CONFLICT DO NOTHING
    `);
    if (z.navazujeNa.vztah === "CORRECTS") {
      await tx.execute(sql`
        UPDATE invoices SET status = 'CORRECTED' WHERE id = ${z.navazujeNa.id}::uuid
      `);
    }
  }

  return {
    ok: true,
    doklad: {
      id: ulozeny.id,
      cislo: cisloDokladu,
      typ: z.typ,
      nazev: nazevDokladu(z.typ, firma.plátceDph),
      stav: "ISSUED",
      vs: rez.variable_symbol,
      vystaveno: dnes.toISOString().slice(0, 10),
      splatnost,
      danovePlneni: z.danovePlneni ?? null,
      odberatel,
      radky: z.radky,
      zakladCelkem,
      danCelkem,
      celkem,
      odectenoZaloh: odecteno,
      kUhrade: celkem - odecteno,
      duvodOpravy: z.duvodOpravy ?? null,
      plátceDph: firma.plátceDph,
    },
  };
}

/* ===== Veřejné operace ===== */

/** Zálohová faktura na zálohu. Není daňový doklad — je to výzva k platbě. */
export async function vystavZalohovou(rezervaceId: string): Promise<Uspech | Chyba> {
  return transakce(async (tx) => {
    const [r] = await radkyT<{ deposit_required_cents: string | number; code: string }>(
      tx,
      sql`SELECT deposit_required_cents, code FROM reservations WHERE id = ${rezervaceId}::uuid`,
    );
    if (!r) return { ok: false as const, chyba: "Rezervace nenalezena." };
    const castka = cislo(r.deposit_required_cents);
    if (castka <= 0) return { ok: false as const, chyba: "Rezervace nemá předepsanou zálohu." };

    const firma = await nactiFirmu(tx);
    const sazba = firma?.plátceDph ? 12 : null;
    const { zaklad, dan } = rozpadDph(castka, sazba);

    return zapis(tx, {
      rezervaceId,
      typ: "PROFORMA",
      splatnostDni: 3,
      radky: [
        {
          poradi: 1,
          druh: "TAXABLE",
          kodPolozky: "NIGHT",
          popis: `Záloha na ubytování — rezervace ${r.code}`,
          czCpa: sazba ? "55.20" : null,
          mnozstvi: 1,
          jednotka: "pobyt",
          cenaSDphHalere: castka,
          sazbaDph: sazba,
          zakladHalere: zaklad,
          danHalere: dan,
          celkemHalere: castka,
          domekSlug: null,
          sluzbaOd: null,
          sluzbaDo: null,
        },
      ],
    });
  });
}

/** Konečná faktura za pobyt, s odečtením už uhrazených záloh. */
export async function vystavKonecnou(rezervaceId: string): Promise<Uspech | Chyba> {
  return transakce(async (tx) => {
    const firma = await nactiFirmu(tx);
    if (!firma) return { ok: false as const, chyba: "Chybí údaje firmy." };

    const radky = await radkyZRezervace(tx, rezervaceId, firma.plátceDph);
    if (!radky.length) return { ok: false as const, chyba: "Rezervace nemá žádné položky." };

    const [uhrazeno] = await radkyT<{ castka: string | number }>(
      tx,
      sql`SELECT coalesce(sum(amount_cents), 0) AS castka FROM payments
           WHERE reservation_id = ${rezervaceId}::uuid AND direction = 'IN'
             AND status IN ('paid','overpaid')`,
    );

    // Datum uskutečnění zdanitelného plnění u ubytování = den odjezdu.
    const [rez] = await radkyT<{ checkout: string }>(
      tx,
      sql`SELECT checkout::text AS checkout FROM reservations WHERE id = ${rezervaceId}::uuid`,
    );

    return zapis(tx, {
      rezervaceId,
      typ: "FINAL",
      splatnostDni: 14,
      danovePlneni: rez?.checkout ?? null,
      radky,
      odectenoZaloh: cislo(uhrazeno?.castka),
    });
  });
}

/**
 * Opravný doklad (dobropis).
 *
 * Pozor na pořadí: **nejdřív peníze zpátky, potom doklad.** Refundace
 * legitimně selhává (nedostatek prostředků, uplynulá lhůta akvirera) a doklad
 * bez odeslaných peněz je vadný. Opačné pořadí jde vždycky napravit, tohle ne.
 */
export async function vystavOpravny(
  puvodniId: string,
  duvod: string,
  castkaHalere?: number,
): Promise<Uspech | Chyba> {
  if (duvod.trim().length < 5) {
    return { ok: false, chyba: "Důvod opravy je povinná náležitost dokladu — napiš ho." };
  }
  return transakce(async (tx) => {
    const [puvodni] = await radkyT<{
      id: string;
      number: string;
      reservation_id: string;
      status: string;
      doc_type: string;
      total_with_vat_cents: string | number;
    }>(
      tx,
      sql`SELECT id::text AS id, number, reservation_id::text AS reservation_id, status, doc_type,
                 total_with_vat_cents
            FROM invoices WHERE id = ${puvodniId}::uuid`,
    );
    if (!puvodni) return { ok: false as const, chyba: "Původní doklad nenalezen." };
    if (puvodni.status === "DRAFT") {
      return { ok: false as const, chyba: "Koncept se neopravuje — smaž ho a vystav znovu." };
    }
    if (puvodni.doc_type === "PROFORMA") {
      return {
        ok: false as const,
        chyba: "Zálohová faktura není doklad, opravuje se až daňový doklad k přijaté platbě.",
      };
    }

    const puvodniRadky = await radkyT<{
      seq: number;
      line_kind: DruhRadku;
      price_item_code: string | null;
      description: string;
      cz_cpa: string | null;
      quantity: string | number;
      unit: string;
      unit_price_with_vat_cents: string | number;
      vat_rate: number | null;
      base_cents: string | number;
      vat_cents: string | number;
      total_cents: string | number;
      unit_slug: string | null;
    }>(tx, sql`SELECT * FROM invoice_lines WHERE invoice_id = ${puvodniId}::uuid ORDER BY seq`);

    const puvodniCelkem = cislo(puvodni.total_with_vat_cents);
    const opravovano = castkaHalere ?? puvodniCelkem;
    if (opravovano <= 0 || opravovano > puvodniCelkem) {
      return { ok: false as const, chyba: "Opravovaná částka musí být kladná a nejvýš do výše původního dokladu." };
    }
    const pomer = opravovano / puvodniCelkem;

    // Rozdíl základu daně a rozdíl daně se uvádějí ZÁPORNĚ (§ 45 odst. 1).
    const radky: Radek[] = puvodniRadky.map((r, i) => {
      const celkem = -Math.round(cislo(r.total_cents) * pomer);
      const { zaklad, dan } = rozpadDph(celkem, r.vat_rate);
      return {
        poradi: i + 1,
        druh: r.line_kind,
        kodPolozky: r.price_item_code,
        popis: r.description,
        czCpa: r.cz_cpa,
        mnozstvi: Number(r.quantity),
        jednotka: r.unit,
        cenaSDphHalere: -cislo(r.unit_price_with_vat_cents),
        sazbaDph: r.vat_rate,
        zakladHalere: zaklad,
        danHalere: dan,
        celkemHalere: celkem,
        domekSlug: r.unit_slug,
        sluzbaOd: null,
        sluzbaDo: null,
      };
    });

    return zapis(tx, {
      rezervaceId: puvodni.reservation_id,
      typ: "CORRECTIVE",
      // Evidenční číslo původního dokladu je povinná náležitost.
      duvodOpravy: `${duvod.trim()} (k dokladu ${puvodni.number})`,
      radky,
      navazujeNa: { id: puvodni.id, vztah: "CORRECTS" },
    });
  });
}

/**
 * Nedaňový doklad — stornovací poplatek, náhrada škody.
 *
 * Propadlá záloha ani náhrada škody nejsou úplatou za službu, takže se
 * nedaní. Doklad proto nesmí nést sazbu DPH ani slovo „daňový".
 */
export async function vystavNedanovy(
  rezervaceId: string,
  popis: string,
  castkaHalere: number,
): Promise<Uspech | Chyba> {
  if (castkaHalere <= 0) return { ok: false, chyba: "Částka musí být kladná." };
  if (popis.trim().length < 5) return { ok: false, chyba: "Doplň popis, co se účtuje." };

  return transakce(async (tx) =>
    zapis(tx, {
      rezervaceId,
      typ: "NON_TAX",
      splatnostDni: 14,
      radky: [
        {
          poradi: 1,
          druh: "PASS_THROUGH",
          kodPolozky: null,
          popis: popis.trim(),
          czCpa: null,
          mnozstvi: 1,
          jednotka: "pobyt",
          cenaSDphHalere: castkaHalere,
          sazbaDph: null, // mimo předmět daně — sazba tu nesmí být
          zakladHalere: castkaHalere,
          danHalere: 0,
          celkemHalere: castkaHalere,
          domekSlug: null,
          sluzbaOd: null,
          sluzbaDo: null,
        },
      ],
    }),
  );
}

/**
 * Doúčtování po pobytu — služba navíc, nebo náhrada škody.
 *
 * Dvě různé věci, které se na dokladu chovají jinak:
 *
 *   · **Služba** (úklid nad rámec, doprava, oprava provedená provozovatelem)
 *     je zdanitelné plnění. U plátce nese sazbu.
 *   · **Náhrada škody** je mimo předmět daně — §14 odst. 1 zákona o DPH
 *     mluví o poskytnutí služby, náhrada škody jím není. Sazba na ní být
 *     nesmí a doklad se nesmí jmenovat daňový.
 *
 * Rozhodnutí o tom, co z toho je, dělá provozovatel při schvalování nálezu.
 */
export async function vystavDouctovani(
  rezervaceId: string,
  popis: string,
  castkaHalere: number,
  jeSluzba: boolean,
): Promise<Uspech | Chyba> {
  if (castkaHalere <= 0) return { ok: false, chyba: "Částka musí být kladná." };
  if (popis.trim().length < 5) return { ok: false, chyba: "Doplň popis, co se účtuje." };

  if (!jeSluzba) return vystavNedanovy(rezervaceId, popis, castkaHalere);

  return transakce(async (tx) => {
    const firma = await nactiFirmu(tx);
    if (!firma) return { ok: false as const, chyba: "Chybí údaje firmy v nastavení." };

    // Neplátce sazbu neuvádí vůbec; u plátce jde o službu v základní sazbě.
    const sazba = firma.plátceDph ? 21 : null;
    const { zaklad, dan } = rozpadDph(castkaHalere, sazba);

    return zapis(tx, {
      rezervaceId,
      typ: "FINAL",
      splatnostDni: 14,
      radky: [
        {
          poradi: 1,
          druh: "TAXABLE",
          kodPolozky: null,
          popis: popis.trim(),
          czCpa: null,
          mnozstvi: 1,
          jednotka: "ks",
          cenaSDphHalere: castkaHalere,
          sazbaDph: sazba,
          zakladHalere: zaklad,
          danHalere: dan,
          celkemHalere: castkaHalere,
          domekSlug: null,
          sluzbaOd: null,
          sluzbaDo: null,
        },
      ],
    });
  });
}
