#!/usr/bin/env node
/**
 * Kontrola připojení k databázi.
 *
 * Ověří, že spojení funguje, že jsou k dispozici potřebná rozšíření a že
 * ochrana proti dvojímu prodeji opravdu odmítne překryv. Pouštět po napojení
 * na Supabase nebo Neon — vyjde najevo hned, ne až u první rezervace.
 *
 *   npm run db:check
 */
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!url) {
  console.log("Bez DATABASE_URL — projekt jede na lokálním PGlite (.pglite).");
  console.log("Pro napojení na Supabase doplň do .env.local:");
  console.log("  DATABASE_URL=postgresql://postgres.<ref>:<heslo>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require");
  console.log("  DIRECT_URL=postgresql://postgres.<ref>:<heslo>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require");
  process.exit(0);
}

const postgres = (await import("postgres")).default;
const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 20 });

const ok = (t) => console.log("  ✓ " + t);
const zle = (t) => console.log("  ✗ " + t);
let problemy = 0;

try {
  const [{ verze }] = await sql`SELECT version() AS verze`;
  ok(`spojení funguje — ${verze.split(",")[0]}`);

  const [{ db, usr }] = await sql`SELECT current_database() AS db, current_user AS usr`;
  ok(`databáze ${db}, uživatel ${usr}`);

  // Rozšíření
  for (const ext of ["btree_gist", "pg_trgm"]) {
    const [radek] = await sql`SELECT extnamespace::regnamespace::text AS schema
                                FROM pg_extension WHERE extname = ${ext}`;
    if (radek) {
      ok(`rozšíření ${ext} je nainstalované (schéma ${radek.schema})`);
    } else {
      try {
        await sql.unsafe(`CREATE EXTENSION IF NOT EXISTS ${ext}`);
        ok(`rozšíření ${ext} doinstalováno`);
      } catch (e) {
        zle(`rozšíření ${ext} chybí a nejde doinstalovat: ${e.message}`);
        problemy++;
      }
    }
  }

  // Je operátorová třída pro gist dosažitelná? Na Supabase bývají rozšíření
  // ve schématu `extensions`, které musí být v search_path.
  const [oc] = await sql`SELECT count(*)::int AS n FROM pg_opclass
                          WHERE opcname = 'gist_uuid_ops'`;
  if (oc.n > 0) ok("operátorová třída gist_uuid_ops je dostupná");
  else { zle("gist_uuid_ops není vidět — zkontroluj search_path (Supabase: public, extensions)"); problemy++; }

  // Schéma
  const [{ n: tabulek }] = await sql`SELECT count(*)::int AS n FROM information_schema.tables
                                      WHERE table_schema = 'public'`;
  if (tabulek > 40) ok(`schéma nasazené — ${tabulek} tabulek`);
  else { zle(`v public je jen ${tabulek} tabulek; spusť npm run db:migrate`); problemy++; }

  // Ostrá zkouška ochrany proti dvojímu prodeji
  if (tabulek > 40) {
    const [{ n: omezeni }] = await sql`
      SELECT count(*)::int AS n FROM pg_constraint
       WHERE conname = 'no_overlap' AND contype = 'x'`;
    if (omezeni > 0) ok("omezení no_overlap (ochrana proti dvojímu prodeji) existuje");
    else { zle("omezení no_overlap chybí — schéma není kompletní"); problemy++; }

    const [{ n: jednotek }] = await sql`SELECT count(*)::int AS n FROM units`;
    const [{ n: cen }] = await sql`SELECT count(*)::int AS n FROM rate_calendar`;
    if (jednotek >= 3 && cen > 100) ok(`data naseedovaná — ${jednotek} jednotky, ${cen} dní ceníku`);
    else { zle(`chybí data (jednotek ${jednotek}, ceník ${cen}); spusť npm run db:seed`); problemy++; }
  }
} catch (e) {
  zle(`spojení selhalo: ${e.message}`);
  problemy++;
} finally {
  await sql.end();
}

console.log(problemy === 0 ? "\nVšechno sedí." : `\n${problemy} ${problemy === 1 ? "problém" : "problémů"} k vyřešení.`);
process.exit(problemy === 0 ? 0 : 1);
