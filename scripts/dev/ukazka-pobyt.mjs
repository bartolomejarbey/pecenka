/**
 * Informace k pobytu, referenční fotky a přístup hosta.
 *
 * Druhá půlka `ukazkova-data.mjs` — je zvlášť, protože potřebuje modulový
 * zavaděč (`bez-server-only.mjs`) a sahá na aplikační kód, ne jen na SQL.
 */
import fs from "node:fs";
import { sql } from "drizzle-orm";

const { radky, zavriDb } = await import("@/lib/db/client");
const { nahrajReferenci } = await import("@/lib/admin/reference");
const { zalozPristup } = await import("@/lib/portal/pristup");

/* ----- Informace k pobytu ----- */
await radky(sql`
  INSERT INTO stay_info (unit_id, address, map_url, arrival_from, departure_by,
                         access_note, wifi_ssid, wifi_password, house_notes, contact_phone, updated_at)
  SELECT u.id,
         'Jílové u Držkova 118, 468 22 — poslední dům, pak lesní cesta 700 m doleva',
         'https://mapy.com/s/sedmyles', '15:00'::time, '10:00'::time,
         'Klíč je v kódové schránce na kůlu u parkoviště. Kód 4729. Po odjezdu ho vraťte zpátky.',
         'SedmyLes-Achat', 'lomasvetlusky',
         'Topení je na kamnech vlevo od dveří, dřevo pod verandou.
Voda je z vlastní studny, dá se pít.
Odpadky do popelnice u parkoviště, tříděné do modré a žluté.',
         '+420 733 418 260', now()
    FROM units u WHERE u.slug = 'achat'
  ON CONFLICT (unit_id) DO UPDATE SET
    address = EXCLUDED.address, map_url = EXCLUDED.map_url,
    access_note = EXCLUDED.access_note, wifi_ssid = EXCLUDED.wifi_ssid,
    wifi_password = EXCLUDED.wifi_password, house_notes = EXCLUDED.house_notes,
    contact_phone = EXCLUDED.contact_phone, updated_at = now()
`);
console.log("  informace k pobytu: Achát");

/* ----- Referenční fotky ----- */
const ZONY = [["seating","p07"],["window","p09"],["kitchen","p04"],["loft","p05"],["floor","p02"],["bathroom","p06"]];
for (const [zona, id] of ZONY) {
  const v = await nahrajReferenci("achat", zona, fs.readFileSync(`public/test-ai/${id}-pred.jpg`), "ukázka");
  if (!v.ok) console.log(`  reference ${zona}: ${v.chyba}`);
}
console.log(`  referenční fotky: ${ZONY.length} zón`);

/* ----- Probíhající pobyt a přístup do portálu ----- */
const [r] = await radky(sql`
  SELECT r.id::text AS id, r.code, r.variable_symbol AS vs
    FROM reservations r JOIN units u ON u.id = r.unit_id
   WHERE r.status = 'confirmed' AND u.slug = 'achat' ORDER BY r.checkin LIMIT 1
`);
if (r) {
  await radky(sql`
    UPDATE reservations SET checkin = current_date - 1, checkout = current_date + 2,
                            status = 'checked_in' WHERE id = ${r.id}::uuid
  `);
  await radky(sql`
    UPDATE reservation_units SET checkin = current_date - 1, checkout = current_date + 2,
                                 status = 'checked_in'::reservation_status
     WHERE reservation_id = ${r.id}::uuid
  `);
  const kod = await zalozPristup(r.id);
  console.log(`  pobyt hosta: ${r.code} · VS ${r.vs} · kód ${kod}`);
}

await zavriDb();
