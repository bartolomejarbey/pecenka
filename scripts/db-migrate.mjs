#!/usr/bin/env node
/**
 * Nasazení migrací.
 *   npm run db:migrate            → lokální PGlite (.pglite)
 *   DATABASE_URL=… npm run db:migrate  → ostrý Postgres
 */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const SLOZKA = path.join(process.cwd(), "db", "migrations");

function rozdelSql(sql) {
  const out = [];
  let buf = "", uvozovka = false, komentar = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (komentar) { if (c === "\n") komentar = false; buf += c; continue; }
    if (!uvozovka && c === "-" && sql[i + 1] === "-") { komentar = true; buf += c; continue; }
    if (c === "'") uvozovka = !uvozovka;
    if (!uvozovka && c === ";") { out.push(buf.trim()); buf = ""; continue; }
    buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter((p) => p && !/^(--[^\n]*\n?|\s)*$/.test(p));
}

const url = process.env.DATABASE_URL;
let exec, dotaz, zavri;

if (url) {
  const postgres = (await import("postgres")).default;
  const sql = postgres(url, { max: 1 });
  exec = (q) => sql.unsafe(q);
  dotaz = (q) => sql.unsafe(q);
  zavri = () => sql.end();
  console.log("[db] ostrý Postgres");
} else {
  const { PGlite } = await import("@electric-sql/pglite");
  const { btree_gist } = await import("@electric-sql/pglite/contrib/btree_gist");
  const { pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm");
  const client = await PGlite.create({
    dataDir: process.env.PGLITE_DIR ?? ".pglite",
    extensions: { btree_gist, pg_trgm },
  });
  exec = (q) => client.exec(q);
  dotaz = async (q) => (await client.query(q)).rows;
  zavri = () => client.close();
  console.log("[db] lokální PGlite (.pglite) — bez DATABASE_URL");
}

await exec(`CREATE TABLE IF NOT EXISTS _migrace (
  jmeno text PRIMARY KEY, otisk text NOT NULL, spusteno_v timestamptz NOT NULL DEFAULT now());`);
const hotove = new Set((await dotaz("SELECT jmeno FROM _migrace")).map((r) => r.jmeno));

const jmena = (await readdir(SLOZKA)).filter((f) => f.endsWith(".sql")).sort();
let nasazeno = 0;
for (const jmeno of jmena) {
  if (hotove.has(jmeno)) { console.log(`[db] ${jmeno} — už nasazeno`); continue; }
  const sql = await readFile(path.join(SLOZKA, jmeno), "utf8");
  const otisk = createHash("sha256").update(sql).digest("hex").slice(0, 16);
  for (const prikaz of rozdelSql(sql)) {
    try { await exec(prikaz + ";"); }
    catch (e) {
      const prvni = prikaz.split("\n").find((l) => l.trim() && !l.trim().startsWith("--"));
      console.error(`\n[db] ${jmeno} selhalo u:\n  ${prvni?.slice(0, 100)}\n  → ${e.message}\n`);
      process.exit(1);
    }
  }
  await exec(`INSERT INTO _migrace (jmeno, otisk) VALUES ('${jmeno}', '${otisk}');`);
  console.log(`[db] ${jmeno} — nasazeno`);
  nasazeno++;
}
console.log(`[db] hotovo, nově nasazeno ${nasazeno} migrací`);
await zavri();
