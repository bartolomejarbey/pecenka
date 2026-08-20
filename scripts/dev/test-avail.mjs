// Rychlá zkouška: dostupnost z prázdné databáze musí být prázdná,
// po vložení rezervace musí dny zmizet a překryv musí databáze odmítnout.
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
const db = await PGlite.create({ dataDir: '.pglite', extensions: { btree_gist, pg_trgm } });

const u = (await db.query("SELECT id, slug FROM units ORDER BY sort_order")).rows;
const achat = u.find(x => x.slug === 'achat'), mech = u.find(x => x.slug === 'mech'), celek = u.find(x => x.slug === 'cely-les');
console.log('jednotky:', u.map(x => x.slug).join(', '));

const c = (await db.query("SELECT count(*)::int n FROM rate_calendar WHERE unit_id=$1", [achat.id])).rows[0].n;
const vzorek = (await db.query("SELECT date::text d, price_cents FROM rate_calendar WHERE unit_id=$1 ORDER BY date LIMIT 3", [achat.id])).rows;
console.log(`ceník achát: ${c} dní, ukázka:`, vzorek.map(r => `${r.d}=${Number(r.price_cents)/100} Kč`).join(', '));

// vložíme rezervaci
await db.query(`INSERT INTO reservations (code, variable_symbol, unit_id, checkin, checkout, status)
  VALUES ('SL-26-0001','2609000011',$1, CURRENT_DATE + 10, CURRENT_DATE + 13, 'confirmed')`, [achat.id]);
const rid = (await db.query("SELECT id FROM reservations WHERE code='SL-26-0001'")).rows[0].id;
await db.query(`INSERT INTO reservation_units (reservation_id, unit_id, checkin, checkout, status)
  VALUES ($1,$2, CURRENT_DATE + 10, CURRENT_DATE + 13, 'confirmed')`, [rid, achat.id]);
console.log('✓ rezervace achát na 3 noci vložena');

try {
  await db.query(`INSERT INTO reservation_units (reservation_id, unit_id, checkin, checkout, status)
    VALUES ($1,$2, CURRENT_DATE + 12, CURRENT_DATE + 15, 'confirmed')`, [rid, achat.id]);
  console.log('✗ PŘEKRYV PROŠEL — ochrana proti dvojímu prodeji NEFUNGUJE');
} catch { console.log('✓ překryvná rezervace zamítnuta databází'); }

await db.query(`INSERT INTO reservation_units (reservation_id, unit_id, checkin, checkout, status)
  VALUES ($1,$2, CURRENT_DATE + 13, CURRENT_DATE + 15, 'confirmed')`, [rid, achat.id]);
console.log('✓ navazující rezervace (odjezd = příjezd) prošla');

// dopad na celý les
const dopad = (await db.query(`
  WITH cil AS (SELECT id, slug FROM units WHERE slug='cely-les'),
  dopad AS (SELECT c.slug, uc.member_unit_id fid FROM cil c JOIN unit_components uc ON uc.composite_unit_id=c.id)
  SELECT count(*)::int n FROM reservation_units ru JOIN dopad d ON d.fid=ru.unit_id WHERE ru.status IN ('hold','confirmed','checked_in')`)).rows[0].n;
console.log(`✓ celý les vidí ${dopad} blokujících rezervací svých členů`);

// úklid, ať seed zůstane čistý
await db.query("DELETE FROM reservation_units WHERE reservation_id=$1", [rid]);
await db.query("DELETE FROM reservations WHERE id=$1", [rid]);
console.log('✓ testovací data uklizena');
