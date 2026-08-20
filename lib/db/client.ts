import "server-only";

/**
 * Připojení k databázi.
 *
 * · **Produkce** — `DATABASE_URL` (Neon Postgres). Ostrý driver, connection pool.
 * · **Lokálně bez DATABASE_URL** — PGlite: Postgres přeložený do WASM, běží
 *   v procesu a data si drží v `.pglite/`. Žádný docker, žádný účet, `npm run dev`
 *   prostě funguje. Je to týž Postgres 18, včetně `btree_gist`, takže ochrana
 *   proti dvojímu prodeji se chová stejně jako naostro.
 *
 * Schéma je v `db/migrations/`. Lokálně se migrace pouští samy při prvním
 * dotazu, na produkci je pustí `npm run db:migrate` v deploy kroku.
 */

import type { SQL } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type SQLDotaz = SQL<unknown>;

export type Db = PgliteDatabase<Record<string, never>> | PostgresJsDatabase<Record<string, never>>;

declare global {
  // Next.js v dev režimu modul překládá při každé změně — držíme jedno
  // připojení na globálu, ať se PGlite nepere o zámek datového adresáře.
  // eslint-disable-next-line no-var
  var __sedmylesDb: Promise<Db> | undefined;
}

async function pripojNeon(url: string): Promise<Db> {
  const [{ drizzle }, postgres] = await Promise.all([
    import("drizzle-orm/postgres-js"),
    import("postgres").then((m) => m.default),
  ]);
  const sql = postgres(url, { max: 5, idle_timeout: 20, prepare: false });
  return drizzle(sql);
}

async function pripojPglite(): Promise<Db> {
  const [{ drizzle }, { PGlite }, { btree_gist }, { pg_trgm }] = await Promise.all([
    import("drizzle-orm/pglite"),
    import("@electric-sql/pglite"),
    import("@electric-sql/pglite/contrib/btree_gist"),
    import("@electric-sql/pglite/contrib/pg_trgm"),
  ]);
  const client = await PGlite.create({
    dataDir: process.env.PGLITE_DIR ?? ".pglite",
    extensions: { btree_gist, pg_trgm },
  });
  const db = drizzle(client);
  const { migrujPglite } = await import("./migrate");
  await migrujPglite(client);
  return db;
}

export function getDb(): Promise<Db> {
  if (!globalThis.__sedmylesDb) {
    const url = process.env.DATABASE_URL;
    globalThis.__sedmylesDb = url ? pripojNeon(url) : pripojPglite();
  }
  return globalThis.__sedmylesDb;
}

/** True, když jedeme na lokální PGlite (admin to ukazuje jako varovný pruh). */
export const jeLokalniDb = () => !process.env.DATABASE_URL;

/**
 * Surový SQL dotaz vracející řádky.
 *
 * Existuje proto, že `db.execute()` má u každého driveru jiný tvar výsledku:
 * postgres-js vrací rovnou pole řádků, PGlite objekt `{ rows, fields }`.
 * Tady se to srovná na jedno pole, ať se kód nemusí ptát, kde běží.
 */
export async function radky<T>(dotaz: SQLDotaz): Promise<T[]> {
  const db = await getDb();
  const vysledek = (await db.execute(dotaz)) as unknown;
  if (Array.isArray(vysledek)) return vysledek as T[];
  if (vysledek && typeof vysledek === "object" && Array.isArray((vysledek as { rows?: unknown }).rows)) {
    return (vysledek as { rows: T[] }).rows;
  }
  return [];
}
