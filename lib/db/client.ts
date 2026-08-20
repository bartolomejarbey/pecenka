import "server-only";

/**
 * Připojení k databázi.
 *
 * · **Produkce** — `DATABASE_URL` (Supabase nebo Neon Postgres). Za transakčním
 *   poolerem, takže bez připravených dotazů.
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

async function pripojPostgres(url: string): Promise<Db> {
  const [{ drizzle }, postgres] = await Promise.all([
    import("drizzle-orm/postgres-js"),
    import("postgres").then((m) => m.default),
  ]);
  // `prepare: false` je povinné za transakčním poolerem (Supabase port 6543,
  // PgBouncer): připravené dotazy tam nepřežijí mezi transakcemi.
  // `max: 5` proto, že serverless instancí může běžet víc naráz a pooler
  // má omezený počet klientských spojení.
  // Při buildu běží 15 workerů paralelně a každý by si otevřel vlastní pool —
  // dohromady víc spojení, než pooler pustí. Za běhu je pět v pořádku.
  const vychozi = process.env.NEXT_PHASE === "phase-production-build" ? 1 : 5;
  const sql = postgres(url, {
    max: Number(process.env.DB_POOL_MAX ?? vychozi),
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
  });
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
    globalThis.__sedmylesDb = url ? pripojPostgres(url) : pripojPglite();
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
  return normalizuj<T>(await db.execute(dotaz));
}

function normalizuj<T>(vysledek: unknown): T[] {
  if (Array.isArray(vysledek)) return vysledek as T[];
  if (vysledek && typeof vysledek === "object" && Array.isArray((vysledek as { rows?: unknown }).rows)) {
    return (vysledek as { rows: T[] }).rows;
  }
  return [];
}

/** Cokoli, co umí spustit SQL — databáze i otevřená transakce. */
export type Spousteni = { execute(dotaz: SQLDotaz): Promise<unknown> };

/** Řádky z dotazu uvnitř transakce. */
export async function radkyT<T>(tx: Spousteni, dotaz: SQLDotaz): Promise<T[]> {
  return normalizuj<T>(await tx.execute(dotaz));
}

/**
 * Transakce.
 *
 * Zakládání rezervace musí být atomické: buď vznikne rezervace, zablokovaný
 * termín, zmrazený rozpad ceny i předpis zálohy, nebo nevznikne nic. Půlka
 * rezervace v databázi je horší než žádná — termín by byl blokovaný a nikdo
 * by nevěděl proč.
 */
export async function transakce<T>(fn: (tx: Spousteni) => Promise<T>): Promise<T> {
  const db = await getDb();
  return (db as unknown as {
    transaction<R>(cb: (tx: Spousteni) => Promise<R>): Promise<R>;
  }).transaction(fn);
}

/** Kód, kterým Postgres hlásí porušení EXCLUDE omezení (překryv termínů). */
export const PREKRYV_TERMINU = "23P01";

export function jePrekryvTerminu(e: unknown): boolean {
  const kod = (e as { code?: string; cause?: { code?: string } })?.code
    ?? (e as { cause?: { code?: string } })?.cause?.code;
  return kod === PREKRYV_TERMINU || String((e as Error)?.message ?? "").includes("no_overlap");
}
