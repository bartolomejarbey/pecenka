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
  { kod: "SL-26-9001", vs: "2609090015", unit: achat, za: 6, noci: 3, stav: "confirmed",
    host: { jmeno: "Eva", prijmeni: "Dvořáková", email: "eva.dvorakova@example.com", telefon: "+420602111222" } },
  { kod: "SL-26-9002", vs: "2609090023", unit: achat, za: 17, noci: 4, stav: "confirmed",
    host: { jmeno: "Martin", prijmeni: "Svoboda", email: "martin.svoboda@example.com", telefon: "+420603333444" } },
  { kod: "SL-26-9003", vs: "2609090031", unit: mech, za: 23, noci: 2, stav: "hold",
    host: { jmeno: "Klára", prijmeni: "Nováková", email: "klara.novakova@example.com", telefon: "+420604555666" } },
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

  // Rozpad ceny z ceníkového kalendáře — bez něj vypadá administrace rozbitě
  // („Nezaplaceno 0 Kč") a nedá se na ní nic pořádně vyzkoušet.
  await db.query(
    `INSERT INTO reservation_items (reservation_id, kind, price_item_code, label, date, unit_slug,
                                    qty, unit_price_cents, total_cents, vat_rate)
     SELECT $1, 'night', 'NIGHT', 'Ubytování ' || u.slug, rc.date, u.slug, 1,
            rc.price_cents, rc.price_cents, (SELECT vat_rate FROM price_items WHERE code = 'NIGHT')
       FROM rate_calendar rc JOIN units u ON u.id = rc.unit_id
      WHERE rc.unit_id = $2
        AND rc.date >= CURRENT_DATE + ($3)::int
        AND rc.date <  CURRENT_DATE + ($3)::int + ($4)::int`,
    [rid, r.unit, r.za, r.noci],
  );
  await db.query(
    `UPDATE reservations r
        SET total_cents = s.suma, accommodation_cents = s.suma,
            deposit_required_cents = round(s.suma / 2.0)
       FROM (SELECT coalesce(sum(total_cents), 0) AS suma FROM reservation_items
              WHERE reservation_id = $1) s
      WHERE r.id = $1`,
    [rid],
  );

  // Host
  const g = (
    await db.query(
      `INSERT INTO guests (first_name, last_name, email, phone_e164)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (lower(email)) WHERE email IS NOT NULL AND anonymized_at IS NULL
       DO UPDATE SET first_name = EXCLUDED.first_name RETURNING id`,
      [r.host.jmeno, r.host.prijmeni, r.host.email, r.host.telefon],
    )
  ).rows[0];
  await db.query(
    `INSERT INTO reservation_guests (reservation_id, guest_id, role) VALUES ($1, $2, 'payer')
     ON CONFLICT DO NOTHING`,
    [rid, g.id],
  );

  // Předpis zálohy
  await db.query(
    `INSERT INTO payments (reservation_id, kind, direction, provider, amount_cents,
                           status, variable_symbol, specific_symbol, due_at)
     SELECT $1, 'deposit', 'IN', 'qr_transfer', r.deposit_required_cents,
            $2, r.variable_symbol, '1', now() + interval '3 days'
       FROM reservations r WHERE r.id = $1`,
    [rid, r.stav === "confirmed" ? "paid" : "created"],
  );
  if (r.stav === "confirmed") {
    await db.query(
      `UPDATE reservations SET paid_cents = deposit_required_cents,
              payment_state = 'deposit_paid'::payment_state WHERE id = $1`,
      [rid],
    );
    await db.query(`UPDATE payments SET paid_at = now() WHERE reservation_id = $1`, [rid]);
  }
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
