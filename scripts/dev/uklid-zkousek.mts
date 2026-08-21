/**
 * Úklid rezervací z automatických průchodů.
 *
 * Průchod tokem po sobě uklízí sám, ale když spadne uprostřed, zůstane
 * termín zabraný. Tenhle skript pozná zkušební rezervace podle e-mailu
 * (`@example.com`) a stornuje je stejně jako administrace: termín se uvolní,
 * záznam zůstane. Nic se nemaže.
 *
 *   node --import ./scripts/dev/bez-server-only.mjs scripts/dev/uklid-zkousek.mts [--opravdu]
 */

import { sql } from "drizzle-orm";
import { radky, transakce } from "@/lib/db/client";

const OPRAVDU = process.argv.includes("--opravdu");

const kandidati = await radky<{ id: string; code: string; checkin: string; email: string }>(sql`
  SELECT r.id::text AS id, r.code, r.checkin::text AS checkin, g.email
    FROM reservations r
    JOIN reservation_guests rg ON rg.reservation_id = r.id
    JOIN guests g ON g.id = rg.guest_id
   -- Jen rezervace z automatických průchodů, ne ukázková data ze seedu.
   -- Ta ukázková (eva@example.com) slouží k předvedení portálu a zůstává.
   -- Předpony odpovídají tomu, co zakládají skripty v scripts/dev.
   WHERE (g.email LIKE 'zkouska.%@example.com' OR g.email LIKE 'telefon.%@example.com')
     AND r.status NOT IN ('cancelled', 'expired')
   ORDER BY r.checkin
`);

if (!kandidati.length) {
  console.log("nic k úklidu");
  process.exit(0);
}

console.log(`zkušebních rezervací k úklidu: ${kandidati.length}`);
for (const k of kandidati) console.log(`  ${k.code}  ${k.checkin}  ${k.email}`);

if (!OPRAVDU) {
  console.log("\nnic se nezměnilo. Spusť znovu s --opravdu.");
  process.exit(0);
}

for (const k of kandidati) {
  await transakce(async (tx) => {
    await tx.execute(sql`
      UPDATE reservation_units SET status = 'cancelled'::reservation_status
       WHERE reservation_id = ${k.id}::uuid
    `);
    await tx.execute(sql`
      UPDATE reservations
         SET status = 'cancelled'::reservation_status, cancelled_at = now(),
             cancel_reason = 'Zkušební rezervace z automatického průchodu.',
             hold_expires_at = NULL, updated_at = now()
       WHERE id = ${k.id}::uuid
    `);
    await tx.execute(sql`
      UPDATE payments SET status = 'cancelled'
       WHERE reservation_id = ${k.id}::uuid AND status IN ('created','pending')
    `);
  });
  console.log(`  stornováno ${k.code}`);
}
console.log(`\nhotovo, uvolněno ${kandidati.length} termínů`);
process.exit(0);
