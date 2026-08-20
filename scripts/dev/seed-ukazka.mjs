#!/usr/bin/env node
/**
 * Ukázková provozní data pro vývoj — pár rezervací a jeden blok údržby,
 * ať je v kalendáři i v administraci co vidět. Na produkci se nepouští.
 */
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

if (process.env.DATABASE_URL) {
  console.error("Ukázková data se do ostré databáze nesypou. Zruš DATABASE_URL.");
  process.exit(1);
}

const db = await PGlite.create({
  dataDir: process.env.PGLITE_DIR ?? ".pglite",
  extensions: { btree_gist, pg_trgm },
});
const id = async (slug) =>
  (await db.query("SELECT id FROM units WHERE slug = $1", [slug])).rows[0]?.id;

const achat = await id("achat");
const mech = await id("mech");
if (!achat) {
  console.error("Chybí jednotky — nejdřív spusť npm run db:seed.");
  process.exit(1);
}

// Ukázkové rezervace berou čísla z horního konce řady, aby se nepraly
// s čítačem, ze kterého berou skutečné rezervace.
const REZERVACE = [
  { kod: "SL-26-9001", vs: "2609090015", unit: achat, za: 6, noci: 3, stav: "confirmed" },
  { kod: "SL-26-9002", vs: "2609090023", unit: achat, za: 17, noci: 4, stav: "confirmed" },
  { kod: "SL-26-9003", vs: "2609090031", unit: mech, za: 23, noci: 2, stav: "hold" },
];

for (const r of REZERVACE) {
  const uz = (await db.query("SELECT id FROM reservations WHERE code = $1", [r.kod])).rows[0];
  if (uz) continue;
  await db.query(
    `INSERT INTO reservations (code, variable_symbol, unit_id, checkin, checkout, status, source, adults)
     VALUES ($1, $2, $3, CURRENT_DATE + ($4)::int, CURRENT_DATE + ($4)::int + ($5)::int, $6, 'admin', 2)`,
    [r.kod, r.vs, r.unit, r.za, r.noci, r.stav],
  );
  const rid = (await db.query("SELECT id FROM reservations WHERE code = $1", [r.kod])).rows[0].id;
  await db.query(
    `INSERT INTO reservation_units (reservation_id, unit_id, checkin, checkout, status)
     VALUES ($1, $2, CURRENT_DATE + ($3)::int, CURRENT_DATE + ($3)::int + ($4)::int, $5)`,
    [rid, r.unit, r.za, r.noci, r.stav],
  );
}

if (!(await db.query("SELECT id FROM calendar_blocks WHERE reason = 'ukázka — údržba'")).rows.length) {
  await db.query(
    `INSERT INTO calendar_blocks (unit_id, date_from, date_to, kind, reason)
     VALUES ($1, CURRENT_DATE + 9, CURRENT_DATE + 12, 'maintenance', 'ukázka — údržba')`,
    [mech],
  );
}

// Ukázkové bankovní spojení, ať jde proklikat QR platbu. Skript se odmítne
// spustit proti ostré databázi, takže se tenhle IBAN nikam nedostane.
await db.query(
  `UPDATE company_settings
   SET bank_iban = 'CZ6508000000192000145399', bank_bic = 'GIBACZPX',
       bank_display = '192000145399/0800',
       legal_name = CASE WHEN legal_name LIKE 'DOPLNIT%' THEN 'Sedmý les (ukázka)' ELSE legal_name END
   WHERE id = 1`,
);
console.log("bankovní spojení: nastaveno ukázkové (jen pro vývoj)");

const prehled = (
  await db.query(`
    SELECT u.slug, ru.checkin::text a, ru.checkout::text b, ru.status
    FROM reservation_units ru JOIN units u ON u.id = ru.unit_id ORDER BY ru.checkin`)
).rows;
console.log("rezervace:", prehled.map((x) => `${x.slug} ${x.a}→${x.b} (${x.status})`).join(" | "));
const bloky = (
  await db.query(`
    SELECT u.slug, date_from::text a, date_to::text b, kind
    FROM calendar_blocks cb JOIN units u ON u.id = cb.unit_id`)
).rows;
console.log("bloky:", bloky.map((x) => `${x.slug} ${x.a}→${x.b} (${x.kind})`).join(" | "));
await db.close();
