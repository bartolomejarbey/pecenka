import "server-only";

import { sql } from "drizzle-orm";
import { jePrekryvTerminu, radkyT, transakce, type Spousteni } from "@/lib/db/client";
import { hledaciText } from "@/lib/db/text";
import { addDays, calcPrice, formatCzDate, startOfDay, toKey, validateRange, type Cenik } from "@/lib/booking";
import { sestavKod, sestavVs } from "./vs";

/**
 * Založení rezervace.
 *
 * Celé to běží v jedné transakci: buď vznikne rezervace, blokace termínu,
 * zmrazený rozpad ceny a předpis zálohy, nebo nevznikne nic.
 *
 * Dvě různá vyústění podle toho, kdy host přijíždí:
 *   · **hold** — příjezd za víc než 48 h a jde o jeden domek. Termín se rovnou
 *     zablokuje a drží se 72 h na zaplacení zálohy.
 *   · **inquiry** — příjezd do 48 h, nebo poptávka na celý les. Termín se
 *     neblokuje, majitel to musí potvrdit ručně. Blokovat termín, který za pár
 *     hodin nikdo nezaplatí, by znamenalo odmítat hosty kvůli mrtvým poptávkám.
 */

export type NovaRezervace = {
  domek: string;
  prijezd: Date;
  odjezd: Date;
  dospeli: number;
  detiDo18?: number;
  doplnky: Record<string, number>;
  host: { jmeno: string; email: string; telefon?: string; poznamka?: string };
  zdroj?: "web" | "phone" | "admin";
  /** Částka, kterou viděl host. Při neshodě rezervaci nezaložíme. */
  ocekavanaCastkaHalere?: number;
  vytvoril?: string;
};

export type VysledekRezervace =
  | {
      ok: true;
      kod: string;
      vs: string;
      stav: "hold" | "inquiry";
      celkemHalere: number;
      zalohaHalere: number;
      splatnostZalohy: Date | null;
      drziDo: Date | null;
    }
  | { ok: false; duvod: Duvod; zprava: string };

export type Duvod =
  | "obsazeno"
  | "neplatny_termin"
  | "mimo_cenik"
  | "cena_se_zmenila"
  | "neznamy_domek"
  | "chyba";

const chyba = (duvod: Duvod, zprava: string): VysledekRezervace => ({ ok: false, duvod, zprava });

/** Hranice, za kterou už se termín automaticky neblokuje (v hodinách). */
const PRAH_HOLD_HODIN = 48;
/** Jak dlouho držíme termín na zaplacení zálohy. */
const DRZENI_HODIN = 72;

type RadekJednotky = { id: string; slug: string; nazev: string | null; is_virtual: boolean };
type RadekCeny = {
  date: string;
  price_cents: string | number;
  min_nights: number;
  closed: boolean;
  closed_to_arrival: boolean;
  closed_to_departure: boolean;
};

const cislo = (v: string | number) => (typeof v === "number" ? v : Number(v));

export async function vytvorRezervaci(vstup: NovaRezervace): Promise<VysledekRezervace> {
  const prijezd = startOfDay(vstup.prijezd);
  const odjezd = startOfDay(vstup.odjezd);

  if (!(odjezd > prijezd)) return chyba("neplatny_termin", "Odjezd musí být po příjezdu.");
  if (prijezd < startOfDay(new Date())) {
    return chyba("neplatny_termin", "Příjezd nemůže být v minulosti.");
  }

  // Čítač pořadí je atomický, ale číslo může být obsazené i jinak — ručním
  // vložením v adminu, importem z Booking.com, obnovou ze zálohy. Kolize kódu
  // nebo VS proto není fatální: zvedneme čítač a zkusíme to znovu.
  for (let pokus = 0; pokus < 5; pokus++) {
    try {
      return await transakce(async (tx) => zaloz(tx, vstup, prijezd, odjezd));
    } catch (e) {
      if (jePrekryvTerminu(e)) {
        return chyba(
          "obsazeno",
          "Termín právě obsadil někdo jiný. Vyberte prosím jiné datum — omlouváme se.",
        );
      }
      if (jeObsazeneCislo(e) && pokus < 4) {
        console.warn(`[rezervace] číslo už bylo obsazené, zkouším znovu (${pokus + 1}/5)`);
        continue;
      }
      console.error("[rezervace] nepodařilo se založit:", e);
      return chyba("chyba", "Rezervaci se nepodařilo založit. Zkuste to prosím znovu.");
    }
  }
  return chyba("chyba", "Rezervaci se nepodařilo založit. Zkuste to prosím znovu.");
}

/** Kolize kódu rezervace nebo variabilního symbolu (unikátní index). */
function jeObsazeneCislo(e: unknown): boolean {
  const chyba = e as { code?: string; cause?: { code?: string; constraint?: string } };
  const kod = chyba?.code ?? chyba?.cause?.code;
  const omezeni = chyba?.cause?.constraint ?? "";
  const zprava = String((e as Error)?.message ?? "") + String((e as { cause?: Error })?.cause?.message ?? "");
  return (
    kod === "23505" &&
    (/reservations_(code|variable_symbol)_key/.test(omezeni) ||
      /reservations_(code|variable_symbol)_key/.test(zprava))
  );
}

async function zaloz(
  tx: Spousteni,
  vstup: NovaRezervace,
  prijezd: Date,
  odjezd: Date,
): Promise<VysledekRezervace> {
  /* ----- 1. Jednotka a její fyzické domky ----- */
  const [jednotka] = await radkyT<RadekJednotky>(
    tx,
    sql`SELECT id, slug, name AS nazev, is_virtual FROM units WHERE slug = ${vstup.domek} AND active`,
  );
  if (!jednotka) return chyba("neznamy_domek", "Takový domek neznáme.");

  const fyzicke = jednotka.is_virtual
    ? await radkyT<{ id: string }>(
        tx,
        sql`SELECT member_unit_id AS id FROM unit_components WHERE composite_unit_id = ${jednotka.id}`,
      )
    : [{ id: jednotka.id }];

  /* ----- 1b. Zavřené termíny ----- */
  /*
   * Blok v kalendáři (údržba, vlastní pobyt, dovolená) drží termín stejně
   * jako rezervace, ale databázové omezení ho nehlídá — `no_overlap` platí
   * uvnitř `reservation_units`, ne mezi tabulkami. Bez téhle kontroly by
   * majitel zavřel domek na údržbu a web ho přesto prodal.
   */
  const [blok] = await radkyT<{ duvod: string | null; druh: string }>(
    tx,
    sql`SELECT cb.reason AS duvod, cb.kind AS druh
          FROM calendar_blocks cb
         WHERE cb.unit_id IN (${sql.join(fyzicke.map((f) => sql`${f.id}::uuid`), sql`, `)})
           AND daterange(cb.date_from, cb.date_to, '[)')
               && daterange(${toKey(prijezd)}::date, ${toKey(odjezd)}::date, '[)')
         LIMIT 1`,
  );
  if (blok) {
    return chyba(
      "obsazeno",
      "V tomhle termínu je domek zavřený. Vyberte prosím jiné datum — omlouváme se.",
    );
  }

  /* ----- 2. Ceník na dané noci ----- */
  const ceny = await radkyT<RadekCeny>(
    tx,
    sql`SELECT date::text AS date, price_cents, min_nights, closed, closed_to_arrival, closed_to_departure
        FROM rate_calendar
        WHERE unit_id = ${jednotka.id} AND date >= ${toKey(prijezd)}::date AND date < ${toKey(odjezd)}::date
        ORDER BY date`,
  );

  const noci: string[] = [];
  for (let d = prijezd; d < odjezd; d = addDays(d, 1)) noci.push(toKey(d));
  if (ceny.length !== noci.length) {
    return chyba("mimo_cenik", "Pro tento termín zatím nemáme vypsané ceny. Napište nám prosím.");
  }
  if (ceny.some((c) => c.closed)) {
    return chyba("obsazeno", "V tomto termínu je domek uzavřený.");
  }
  if (ceny[0].closed_to_arrival) {
    return chyba("neplatny_termin", "V tento den bohužel nelze přijet.");
  }

  const minNoci = Math.max(2, ...ceny.map((c) => c.min_nights));
  const spatnyTermin = validateRange(prijezd, odjezd, minNoci);
  if (spatnyTermin) return chyba("neplatny_termin", spatnyTermin);

  /* ----- 3. Cena se počítá na serveru, klientská se jen porovná ----- */
  const cenik = await sestavCenik(tx, ceny);
  const rozpad = calcPrice(prijezd, odjezd, vstup.doplnky, cenik);
  if (
    vstup.ocekavanaCastkaHalere !== undefined &&
    vstup.ocekavanaCastkaHalere !== rozpad.total
  ) {
    return chyba(
      "cena_se_zmenila",
      "Cena se mezitím změnila. Načtěte prosím stránku znovu a zkontrolujte souhrn.",
    );
  }

  /* ----- 4. Hold, nebo poptávka? ----- */
  const hodinDoPrijezdu = (prijezd.getTime() - Date.now()) / 3_600_000;
  const stav: "hold" | "inquiry" =
    hodinDoPrijezdu > PRAH_HOLD_HODIN && !jednotka.is_virtual ? "hold" : "inquiry";

  /* ----- 5. Pořadové číslo, VS a veřejný kód ----- */
  const rok = new Date().getFullYear();
  const [citac] = await radkyT<{ last_number: number }>(
    tx,
    sql`INSERT INTO invoice_series (code, year, last_number) VALUES ('REZ', ${rok}, 1)
        ON CONFLICT (code, year) DO UPDATE SET last_number = invoice_series.last_number + 1
        RETURNING last_number`,
  );
  const poradi = citac.last_number;
  const vs = sestavVs(prijezd, poradi);
  const kod = sestavKod(rok, poradi);

  /* ----- 6. Storno podmínky se zmrazí ----- */
  const [politika] = await radkyT<{ id: string; tiers: unknown }>(
    tx,
    sql`SELECT id, tiers FROM cancel_policies WHERE active ORDER BY name LIMIT 1`,
  );

  /* ----- 7. Záloha ----- */
  const [nastaveni] = await radkyT<{
    deposit_share_bp: number;
    deposit_due_days: number;
  }>(tx, sql`SELECT deposit_share_bp, deposit_due_days FROM company_settings WHERE id = 1`);
  const podil = nastaveni?.deposit_share_bp ?? 5000;
  const zaloha = Math.round((rozpad.total * podil) / 10000);
  const splatnostZalohy = addHours(new Date(), 24 * (nastaveni?.deposit_due_days ?? 3));
  const drziDo = stav === "hold" ? addHours(new Date(), DRZENI_HODIN) : null;

  /* ----- 8. Rezervace ----- */
  const hledat = hledaciText([kod, vs, vstup.host.jmeno, vstup.host.email, vstup.host.telefon]);
  const [rezervace] = await radkyT<{ id: string }>(
    tx,
    sql`INSERT INTO reservations (
          code, variable_symbol, unit_id, checkin, checkout, status, source,
          adults, children_u18, total_cents, accommodation_cents, addons_cents,
          discount_cents, deposit_required_cents, cancel_policy_id, cancel_policy_snapshot,
          hold_expires_at, note_guest, search_text, created_by)
        VALUES (
          ${kod}, ${vs}, ${jednotka.id}, ${toKey(prijezd)}::date, ${toKey(odjezd)}::date,
          ${stav}::reservation_status, ${vstup.zdroj ?? "web"},
          ${vstup.dospeli}, ${vstup.detiDo18 ?? 0}, ${rozpad.total}, ${rozpad.nightsTotal},
          ${rozpad.addonsTotal}, ${rozpad.weekDiscount}, ${zaloha},
          ${politika?.id ?? null}, ${politika ? JSON.stringify(politika.tiers) : null}::jsonb,
          ${drziDo?.toISOString() ?? null}::timestamptz, ${vstup.host.poznamka ?? null},
          ${hledat}, ${vstup.vytvoril ?? "web"})
        RETURNING id`,
  );

  /* ----- 9. Blokace termínu — tady spadne EXCLUDE, když je obsazeno ----- */
  if (stav === "hold") {
    for (const f of fyzicke) {
      await tx.execute(sql`
        INSERT INTO reservation_units (reservation_id, unit_id, checkin, checkout, status)
        VALUES (${rezervace.id}, ${f.id}, ${toKey(prijezd)}::date, ${toKey(odjezd)}::date, ${stav}::reservation_status)
      `);
    }
  }

  /* ----- 10. Zmrazený rozpad ceny — po tomhle se cena nepřepočítává ----- */
  for (const noc of rozpad.nightItems) {
    await tx.execute(sql`
      INSERT INTO reservation_items (reservation_id, kind, price_item_code, label, date, unit_slug, qty, unit_price_cents, total_cents, vat_rate)
      VALUES (${rezervace.id}, 'night', 'NIGHT', ${`Ubytování ${jednotka.slug}`}, ${toKey(noc.date)}::date,
              ${jednotka.slug}, 1, ${noc.price}, ${noc.price},
              (SELECT vat_rate FROM price_items WHERE code = 'NIGHT'))
    `);
  }
  if (rozpad.weekDiscount > 0) {
    await tx.execute(sql`
      INSERT INTO reservation_items (reservation_id, kind, price_item_code, label, qty, unit_price_cents, total_cents)
      VALUES (${rezervace.id}, 'discount', 'DISCOUNT', 'Sleva za dlouhý pobyt', 1,
              ${-rozpad.weekDiscount}, ${-rozpad.weekDiscount})
    `);
  }
  for (const d of rozpad.addonItems) {
    await tx.execute(sql`
      INSERT INTO reservation_items (reservation_id, kind, price_item_code, label, qty, unit_price_cents, total_cents, vat_rate)
      VALUES (${rezervace.id}, 'addon',
              (SELECT price_item_code FROM addons WHERE id = ${d.id}),
              ${d.name}, ${d.qty * d.days}, ${Math.round(d.total / Math.max(d.qty * d.days, 1))}, ${d.total},
              (SELECT pi.vat_rate FROM addons a JOIN price_items pi ON pi.code = a.price_item_code WHERE a.id = ${d.id}))
    `);
  }

  /* ----- 11. Host ----- */
  const [prijmeni, ...zbytek] = vstup.host.jmeno.trim().split(/\s+/).reverse();
  const jmeno = zbytek.reverse().join(" ") || null;
  const [hostRow] = await radkyT<{ id: string }>(
    tx,
    sql`INSERT INTO guests (first_name, last_name, email, phone_e164)
        VALUES (${jmeno}, ${prijmeni ?? vstup.host.jmeno}, ${vstup.host.email.toLowerCase()}, ${vstup.host.telefon ?? null})
        ON CONFLICT (lower(email)) WHERE email IS NOT NULL AND anonymized_at IS NULL
        DO UPDATE SET first_name = COALESCE(EXCLUDED.first_name, guests.first_name),
                      last_name  = COALESCE(EXCLUDED.last_name, guests.last_name),
                      phone_e164 = COALESCE(EXCLUDED.phone_e164, guests.phone_e164)
        RETURNING id`,
  );
  await tx.execute(sql`
    INSERT INTO reservation_guests (reservation_id, guest_id, role)
    VALUES (${rezervace.id}, ${hostRow.id}, 'payer') ON CONFLICT DO NOTHING
  `);

  /* ----- 12. Předpis zálohy ----- */
  if (stav === "hold") {
    await tx.execute(sql`
      INSERT INTO payments (reservation_id, kind, direction, provider, amount_cents,
                            status, variable_symbol, specific_symbol, due_at, expires_at)
      VALUES (${rezervace.id}, 'deposit', 'IN', 'qr_transfer', ${zaloha}, 'created',
              ${vs}, '1', ${splatnostZalohy.toISOString()}::timestamptz,
              ${drziDo?.toISOString() ?? null}::timestamptz)
    `);
  }

  /* ----- 13. Úkol pro majitele ----- */
  await tx.execute(sql`
    INSERT INTO tasks (kind, severity, reservation_id, title, detail, due_at)
    VALUES (${stav === "hold" ? "new_hold" : "manual_confirm"},
            ${stav === "hold" ? "info" : "warn"},
            ${rezervace.id},
            ${stav === "hold" ? `Nová rezervace ${kod}` : `Potvrdit poptávku ${kod}`},
            -- Detail čte člověk: název domku a české datum, ne slug a ISO.
            ${`${jednotka.nazev ?? jednotka.slug} · ${formatCzDate(prijezd)} – ${formatCzDate(odjezd)} · ${vstup.host.jmeno}`},
            ${(drziDo ?? addHours(new Date(), 24)).toISOString()}::timestamptz)
  `);

  return {
    ok: true,
    kod,
    vs,
    stav,
    celkemHalere: rozpad.total,
    zalohaHalere: zaloha,
    splatnostZalohy: stav === "hold" ? splatnostZalohy : null,
    drziDo,
  };
}

/** Ceník složený z už načtených řádků — druhý dotaz do rate_calendar nepotřebujeme. */
async function sestavCenik(tx: Spousteni, ceny: RadekCeny[]): Promise<Cenik> {
  const doplnky = await radkyT<{
    id: string;
    name: string;
    description: string | null;
    price_cents: string | number;
    unit: "per_stay" | "per_day" | "per_piece";
    max_qty: number;
  }>(
    tx,
    sql`SELECT id, name, description, price_cents, unit, max_qty FROM addons WHERE active ORDER BY sort_order`,
  );
  const [sleva] = await radkyT<{ min_nights: number; percent_bp: number }>(
    tx,
    sql`SELECT min_nights, percent_bp FROM discount_rules
        WHERE active AND kind = 'length' ORDER BY min_nights ASC LIMIT 1`,
  );
  const [nastaveni] = await radkyT<{ security_deposit_cents: string | number }>(
    tx,
    sql`SELECT security_deposit_cents FROM company_settings WHERE id = 1`,
  );

  return {
    ceny: Object.fromEntries(ceny.map((c) => [c.date, cislo(c.price_cents)])),
    minNoci: Object.fromEntries(ceny.map((c) => [c.date, c.min_nights])),
    doplnky: doplnky.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      priceHalere: cislo(d.price_cents),
      unit: d.unit,
      maxQty: d.max_qty,
    })),
    slevaDlouhehoPobytu: sleva ? { odNoci: sleva.min_nights, bodu: sleva.percent_bp } : null,
    kauceHalere: nastaveni ? cislo(nastaveni.security_deposit_cents) : 0,
  };
}

function addHours(d: Date, h: number): Date {
  return new Date(d.getTime() + h * 3_600_000);
}
