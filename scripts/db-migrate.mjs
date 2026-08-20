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

// DDL i hromadné vkládání patří na PŘÍMÉ spojení (Supabase port 5432).
// Transakční pooler na 6543 neumí připravené dotazy ani zámky napříč
// transakcemi a schéma by se přes něj nasazovalo nespolehlivě.
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
let exec, dotaz, zavri;

if (url) {
  const postgres = (await import("postgres")).default;
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 20 });
  exec = (q) => sql.unsafe(q);
  dotaz = (q) => sql.unsafe(q);
  zavri = () => sql.end();
  console.log("[db] ostrý Postgres" + (process.env.DIRECT_URL ? " (přímé spojení)" : ""));

  // Supabase drží rozšíření ve schématu `extensions`, ne v `public`.
  // Bez něj v search_path Postgres nenajde operátorovou třídu pro gist
  // a `EXCLUDE USING gist` — tedy ochrana proti dvojímu prodeji — se
  // nevytvoří. Nastavíme to natvrdo pro tohle spojení i pro databázi.
  await sql.unsafe("SET search_path TO public, extensions");
  try {
    const [{ db }] = await sql.unsafe("SELECT current_database() AS db");
    await sql.unsafe(`ALTER DATABASE "${db}" SET search_path TO public, extensions`);
    console.log("[db] search_path nastaven na public, extensions");
  } catch {
    // Na spravovaných databázích bez práv na ALTER DATABASE stačí nastavení
    // pro spojení — schéma se vytvoří správně a aplikace pak jede s výchozím
    // search_path, který Supabase u role postgres už `extensions` obsahuje.
    console.log("[db] ALTER DATABASE není povolen, používám search_path jen pro toto spojení");
  }
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
