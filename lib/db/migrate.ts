import "server-only";

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Vlastní spouštěč migrací.
 *
 * Drizzle Kit se nepoužívá schválně: schéma se generuje z SYSTEM.md
 * (`scripts/dev/build-migration.py`) a obsahuje věci, které Drizzle neumí
 * popsat — `EXCLUDE USING gist … WHERE`, částečné unikátní indexy, CHECK
 * omezení. SQL je tady zdroj pravdy, Drizzle jen dotazovací vrstva.
 */

const SLOZKA = () => path.join(process.cwd(), "db", "migrations");

type Spustitel = { exec(sql: string): Promise<unknown> };

const TABULKA = `
  CREATE TABLE IF NOT EXISTS _migrace (
    jmeno       text PRIMARY KEY,
    otisk       text NOT NULL,
    spusteno_v  timestamptz NOT NULL DEFAULT now()
  );
`;

async function souboryMigraci(): Promise<{ jmeno: string; sql: string; otisk: string }[]> {
  const jmena = (await readdir(SLOZKA())).filter((f) => f.endsWith(".sql")).sort();
  return Promise.all(
    jmena.map(async (jmeno) => {
      const sql = await readFile(path.join(SLOZKA(), jmeno), "utf8");
      return { jmeno, sql, otisk: createHash("sha256").update(sql).digest("hex").slice(0, 16) };
    }),
  );
}

/**
 * Rozdělí SQL na jednotlivé příkazy. PGlite `exec()` sice zvládne víc příkazů
 * najednou, ale při chybě pak neřekne, který spadl — a `CREATE EXTENSION`
 * musí doběhnout dřív než tabulka, která ho používá.
 */
export function rozdelSql(sql: string): string[] {
  const out: string[] = [];
  let buf = "";
  let uvozovka = false;
  let komentar = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (komentar) {
      if (c === "\n") komentar = false;
      buf += c;
      continue;
    }
    if (!uvozovka && c === "-" && sql[i + 1] === "-") {
      komentar = true;
      buf += c;
      continue;
    }
    if (c === "'") uvozovka = !uvozovka;
    if (!uvozovka && c === ";") {
      out.push(buf.trim());
      buf = "";
      continue;
    }
    buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter((p) => p && !/^(--[^\n]*\n?|\s)*$/.test(p));
}

async function spust(klient: Spustitel, dotaz: (sql: string) => Promise<{ jmeno: string }[]>) {
  await klient.exec(TABULKA);
  const hotove = new Set((await dotaz("SELECT jmeno FROM _migrace")).map((r) => r.jmeno));

  for (const m of await souboryMigraci()) {
    if (hotove.has(m.jmeno)) continue;
    for (const prikaz of rozdelSql(m.sql)) {
      try {
        await klient.exec(prikaz + ";");
      } catch (e) {
        const prvni = prikaz.split("\n").find((l) => l.trim() && !l.trim().startsWith("--"));
        throw new Error(`Migrace ${m.jmeno} selhala u „${prvni?.slice(0, 80)}": ${(e as Error).message}`);
      }
    }
    await klient.exec(`INSERT INTO _migrace (jmeno, otisk) VALUES ('${m.jmeno}', '${m.otisk}');`);
    console.log(`[db] migrace ${m.jmeno} nasazena`);
  }
}

/** PGlite varianta — pouští se sama při prvním připojení v lokálním vývoji. */
export async function migrujPglite(client: {
  exec(sql: string): Promise<unknown>;
  query<T>(sql: string): Promise<{ rows: T[] }>;
}) {
  await spust(client, async (sql) => (await client.query<{ jmeno: string }>(sql)).rows);
}

/** Postgres varianta — pouští `npm run db:migrate` před nasazením. */
export async function migrujPostgres(sql: {
  unsafe(query: string): Promise<unknown> & { values?: unknown };
}) {
  const klient: Spustitel = { exec: (q) => sql.unsafe(q) as Promise<unknown> };
  await spust(klient, async (q) => (await sql.unsafe(q)) as unknown as { jmeno: string }[]);
}
