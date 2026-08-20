#!/usr/bin/env node
/**
 * Naplnění databáze provozními daty.
 *
 * Idempotentní — pouští se opakovaně, existující řádky aktualizuje.
 * Ceník bere z lib/content.ts, aby se web a databáze nerozešly.
 *
 *   npm run db:seed                    → lokální PGlite
 *   DATABASE_URL=… npm run db:seed     → ostrý Postgres
 */
import { randomBytes } from "node:crypto";

/* ===== připojení ===== */
const url = process.env.DATABASE_URL;
let dotaz, zavri;
if (url) {
  const postgres = (await import("postgres")).default;
  const sql = postgres(url, { max: 1 });
  dotaz = (text, params = []) => sql.unsafe(text, params);
  zavri = () => sql.end();
  console.log("[seed] ostrý Postgres");
} else {
  const { PGlite } = await import("@electric-sql/pglite");
  const { btree_gist } = await import("@electric-sql/pglite/contrib/btree_gist");
  const { pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm");
  const client = await PGlite.create({
    dataDir: process.env.PGLITE_DIR ?? ".pglite",
    extensions: { btree_gist, pg_trgm },
  });
  dotaz = async (text, params = []) => (await client.query(text, params)).rows;
  zavri = () => client.close();
  console.log("[seed] lokální PGlite (.pglite)");
}

const kc = (koruny) => Math.round(koruny * 100); // haléře

/* ===== 1. Údaje firmy =====
   Placeholdery — majitel doplní přes /admin/nastaveni před spuštěním naostro. */
await dotaz(
  `INSERT INTO company_settings (id, legal_name, ico, dic, address, bank_iban, bank_bic, bank_display,
      vat_payer, city_tax_cents, invoice_due_days, deposit_share_bp, deposit_due_days,
      balance_due_days_before, security_deposit_cents, security_deposit_mode)
   VALUES (1, $1, $2, NULL, $3, $4, $5, $6, false, 0, 14, 5000, 3, 14, $7, 'CONTRACTUAL_ONLY')
   ON CONFLICT (id) DO UPDATE SET updated_at = now()`,
  [
    "DOPLNIT — jméno podnikatele / název s.r.o.",
    "00000000",
    JSON.stringify({ street: "DOPLNIT", city: "Jílové u Držkova", zip: "468 22", country: "CZ" }),
    "CZ0000000000000000000000",
    "DOPLNIT",
    "DOPLNIT",
    kc(3000),
  ],
);

/* ===== 2. Číselník fakturovatelných položek =====
   Jediné místo, kde je uloženo, že noc je 12 % a víno 21 %. */
const POLOZKY = [
  ["NIGHT",               "Ubytování",                  "55.20", 12,   "TAXABLE"],
  ["ADDON_BREAKFAST",     "Snídaňový koš",              "56.10", 12,   "TAXABLE"],
  ["ADDON_WINE",          "Lahev vína",                 "47.00", 21,   "TAXABLE"],
  ["ADDON_FIREWOOD",      "Palivové dřevo",             "02.20", 21,   "TAXABLE"],
  ["ADDON_DOG",           "Pes",                        "55.20", 12,   "TAXABLE"],
  ["ADDON_LATE_CHECKOUT", "Pozdní odjezd",              "55.20", 12,   "TAXABLE"],
  ["ADDON_SAUNA",         "Sauna / koupací sud",        "96.04", 12,   "TAXABLE"],
  ["CITY_TAX",            "Poplatek z pobytu",          null,    null, "PASS_THROUGH"],
  ["SECURITY_DEPOSIT",    "Vratná kauce",               null,    null, "SECURITY_DEPOSIT"],
  ["DISCOUNT",            "Sleva",                      null,    null, "DISCOUNT"],
  ["ADVANCE_DEDUCTION",   "Odpočet uhrazené zálohy",    null,    null, "ADVANCE_DEDUCTION"],
  ["ROUNDING",            "Zaokrouhlení",               null,    null, "ROUNDING"],
  ["DAMAGE",              "Náhrada škody",              null,    null, "PASS_THROUGH"],
];
for (const [code, name, cpa, vat, kind] of POLOZKY) {
  await dotaz(
    `INSERT INTO price_items (code, name, cz_cpa, vat_rate, line_kind, valid_from)
     VALUES ($1,$2,$3,$4,$5,DATE '2026-01-01')
     ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, cz_cpa=EXCLUDED.cz_cpa,
       vat_rate=EXCLUDED.vat_rate, line_kind=EXCLUDED.line_kind`,
    [code, name, cpa, vat, kind],
  );
}

/* ===== 3. Jednotky =====
   cely-les je virtuální: prodává se jako jeden celek 30 m², ale blokuje oba domky. */
const JEDNOTKY = [
  ["achat",    "Achát",    2, 15, false, 1],
  ["mech",     "Mech",     2, 15, false, 2],
  ["cely-les", "Celý les", 4, 30, true,  3],
];
for (const [slug, name, capacity, area, virtual, poradi] of JEDNOTKY) {
  await dotaz(
    `INSERT INTO units (slug, name, capacity, area_m2, is_virtual, sort_order, ical_token)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, capacity=EXCLUDED.capacity,
       area_m2=EXCLUDED.area_m2, is_virtual=EXCLUDED.is_virtual, sort_order=EXCLUDED.sort_order`,
    [slug, name, capacity, area, virtual, poradi, randomBytes(16).toString("hex")],
  );
}
const idJednotky = Object.fromEntries(
  (await dotaz("SELECT slug, id FROM units")).map((r) => [r.slug, r.id]),
);
for (const clen of ["achat", "mech"]) {
  await dotaz(
    `INSERT INTO unit_components (composite_unit_id, member_unit_id) VALUES ($1,$2)
     ON CONFLICT DO NOTHING`,
    [idJednotky["cely-les"], idJednotky[clen]],
  );
}

/* ===== 4. Doplňky ===== */
const DOPLNKY = [
  ["snidane", "Snídaňový koš", "Kváskový chléb, máslo, vejce od sousedů, sýr, džem, ovoce a mléko. Ráno visí na klice.", 490, "per_day",   "ADDON_BREAKFAST", 2, 1],
  ["vino",    "Lahev moravského vína", "Ryzlink nebo Pinot noir z malého vinařství, vychlazené v lednici.",              390, "per_piece", "ADDON_WINE",      4, 2],
  ["drevo",   "Extra dřevo na ohniště", "Pořádná náruč bukového dřeva na celovečerní oheň. První dřevo dostanete v ceně.", 250, "per_piece", "ADDON_FIREWOOD", 3, 3],
  ["pes",     "Pes", "Pelíšek, misky a pamlsky nachystané. Maximálně jeden pes na domek.",                               350, "per_stay",  "ADDON_DOG",       1, 4],
  ["pozdni",  "Pozdní odjezd do 17:00", "Když se vám nebude chtít. Podle obsazenosti — potvrdíme den předem.",           600, "per_stay",  "ADDON_LATE_CHECKOUT", 1, 5],
];
for (const [id, name, popis, cena, jednotka, kod, maxQty, poradi] of DOPLNKY) {
  await dotaz(
    `INSERT INTO addons (id, name, description, price_cents, unit, price_item_code, max_qty, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description,
       price_cents=EXCLUDED.price_cents, unit=EXCLUDED.unit, price_item_code=EXCLUDED.price_item_code,
       max_qty=EXCLUDED.max_qty, sort_order=EXCLUDED.sort_order`,
    [id, name, popis, kc(cena), jednotka, kod, maxQty, poradi],
  );
}

/* ===== 5. Storno podmínky a slevy ===== */
const tiers = JSON.stringify([
  { days_before: 30, refund_bp: 10000 },
  { days_before: 14, refund_bp: 5000 },
  { days_before: 0, refund_bp: 0 },
]);
if (!(await dotaz("SELECT id FROM cancel_policies WHERE name = 'Standardní'")).length) {
  await dotaz("INSERT INTO cancel_policies (name, tiers) VALUES ('Standardní', $1)", [tiers]);
}
await dotaz(
  `INSERT INTO discount_rules (code, label, kind, min_nights, percent_bp, applies_to)
   VALUES ('WEEK7', 'Sleva 10 % při 7 a více nocích', 'length', 7, 1000, 'accommodation')
   ON CONFLICT (code) DO UPDATE SET label=EXCLUDED.label, min_nights=EXCLUDED.min_nights,
     percent_bp=EXCLUDED.percent_bp`,
  [],
);

/* ===== 6. Číselné řady dokladů ===== */
const rok = new Date().getFullYear();
for (const kod of ["ZAL", "DZP", "FAK", "OPD", "POU"]) {
  await dotaz(
    `INSERT INTO invoice_series (code, year, last_number) VALUES ($1,$2,0)
     ON CONFLICT (code, year) DO NOTHING`,
    [kod, rok],
  );
}

/* ===== 7. Ceníkový kalendář na 24 měsíců =====
   Přenáší dnešní pravidla z lib/content.ts do dat, aby šly měnit bez deploye. */
const ZAKLAD = kc(2890);
const VIKEND = kc(3490);
const SEZONA_NAVIC = kc(400);

const vysokaSezona = (d) => {
  const m = d.getMonth() + 1, den = d.getDate();
  if ((m === 6 && den >= 15) || m === 7 || m === 8 || (m === 9 && den <= 15)) return true;
  if ((m === 12 && den >= 20) || (m === 1 && den <= 2)) return true;
  return false;
};
const cenaNoci = (d) => {
  const wd = d.getDay(); // noc z pátku (5) a ze soboty (6)
  return (wd === 5 || wd === 6 ? VIKEND : ZAKLAD) + (vysokaSezona(d) ? SEZONA_NAVIC : 0);
};
const klic = (d) => d.toISOString().slice(0, 10);

const dnes = new Date();
dnes.setHours(12, 0, 0, 0);
const DNI = 730;
let radku = 0;
for (const [slug, id] of Object.entries(idJednotky)) {
  const hodnoty = [];
  for (let i = 0; i < DNI; i++) {
    const d = new Date(dnes);
    d.setDate(d.getDate() + i);
    const zaklad = cenaNoci(d);
    // Celý les = oba domky se slevou 10 % za to, že se berou dohromady.
    const cena = slug === "cely-les" ? Math.round(zaklad * 2 * 0.9) : zaklad;
    hodnoty.push(`('${id}','${klic(d)}',${cena},2,false,false,false,'generated')`);
  }
  // po tisícovkách, ať dotaz nepřeteče
  for (let i = 0; i < hodnoty.length; i += 500) {
    await dotaz(
      `INSERT INTO rate_calendar (unit_id, date, price_cents, min_nights, closed,
         closed_to_arrival, closed_to_departure, source)
       VALUES ${hodnoty.slice(i, i + 500).join(",")}
       ON CONFLICT (unit_id, date) DO UPDATE SET price_cents = EXCLUDED.price_cents
       WHERE rate_calendar.source = 'generated'`,
    );
  }
  radku += hodnoty.length;
}

const pocty = await dotaz(`
  SELECT 'units' t, count(*)::int n FROM units
  UNION ALL SELECT 'addons', count(*)::int FROM addons
  UNION ALL SELECT 'price_items', count(*)::int FROM price_items
  UNION ALL SELECT 'rate_calendar', count(*)::int FROM rate_calendar
  UNION ALL SELECT 'discount_rules', count(*)::int FROM discount_rules
  UNION ALL SELECT 'cancel_policies', count(*)::int FROM cancel_policies
  UNION ALL SELECT 'invoice_series', count(*)::int FROM invoice_series
  ORDER BY 1`);
console.log(`[seed] ceníkový kalendář: ${radku} řádků (${DNI} dní × ${Object.keys(idJednotky).length} jednotky)`);
for (const r of pocty) console.log(`[seed] ${r.t.padEnd(16)} ${r.n}`);
await zavri();
