#!/usr/bin/env node
/** Rychlý pohled do lokální databáze — co v ní je. Server musí být vypnutý. */
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

const db = await PGlite.create({
  dataDir: process.env.PGLITE_DIR ?? ".pglite",
  extensions: { btree_gist, pg_trgm },
});
const kc = (h) => (Number(h) / 100).toLocaleString("cs-CZ") + " Kč";

const r = (
  await db.query(`SELECT r.code, r.variable_symbol vs, r.status, r.source, u.slug,
    r.checkin::text a, r.checkout::text b, r.total_cents, r.deposit_required_cents,
    (SELECT count(*)::int FROM reservation_units ru WHERE ru.reservation_id = r.id) blok
    FROM reservations r JOIN units u ON u.id = r.unit_id ORDER BY r.created_at DESC LIMIT 10`)
).rows;
console.log("REZERVACE");
for (const x of r) {
  console.log(
    `  ${x.code}  ${x.vs}  ${x.status.padEnd(9)} ${x.slug.padEnd(9)} ${x.a}→${x.b}  ` +
      `${kc(x.total_cents).padStart(12)}  záloha ${kc(x.deposit_required_cents).padStart(10)}  blokací ${x.blok}`,
  );
}
const p = (await db.query("SELECT count(*)::int n, coalesce(sum(amount_cents),0)::bigint s FROM payments")).rows[0];
console.log(`\nPLATBY  ${p.n} předpisů, celkem ${kc(p.s)}`);
const t = (await db.query("SELECT kind, count(*)::int n FROM tasks WHERE resolved_at IS NULL GROUP BY kind ORDER BY 1")).rows;
console.log("ÚKOLY  " + (t.map((x) => `${x.kind}=${x.n}`).join(", ") || "žádné"));
const g = (await db.query("SELECT count(*)::int n FROM guests")).rows[0];
console.log(`HOSTÉ  ${g.n}`);
await db.close();
