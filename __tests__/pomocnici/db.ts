import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const spustit = promisify(execFile);

/**
 * Čerstvá databáze pro integrační testy.
 *
 * Každý soubor dostane vlastní adresář PGlite, takže testy o sebe nezakopnou
 * a nešahají na vývojářskou `.pglite`. Migrace i seed jedou týmiž skripty
 * jako naostro — kdyby se rozešly, test to pozná dřív než produkce.
 *
 * Databáze se ale nestaví pokaždé znovu. Postaví se **jednou do předlohy**
 * a pro každý soubor se jen zkopíruje. Migrace a seed trvají přes čtyřicet
 * sekund; s pěti soubory z toho byly tři a půl minuty a sada padala na
 * vypršené limity pokaždé, když vedle běželo cokoli jiného. Kopie adresáře
 * je otázka zlomku sekundy.
 *
 * Předloha je klíčovaná otiskem migrací a seedu: když se kterýkoli změní,
 * postaví se znovu. Zastaralá předloha by byla horší než pomalé testy.
 */

const OTISK = (() => {
  const h = createHash("sha256");
  const slozka = path.join(process.cwd(), "db", "migrations");
  for (const f of readdirSync(slozka).sort()) h.update(readFileSync(path.join(slozka, f)));
  for (const f of ["scripts/db-seed.mjs", "scripts/db-migrate.mjs"]) {
    h.update(readFileSync(path.join(process.cwd(), f)));
  }
  h.update(process.env.SEED_DNI ?? "260");
  return h.digest("hex").slice(0, 12);
})();

const PREDLOHA = path.join(os.tmpdir(), `sedmyles-predloha-${OTISK}`);

/** Postaví předlohu, pokud ještě není. Volá se sériově — vitest má `fileParallelism: false`. */
async function zajistiPredlohu(): Promise<void> {
  if (existsSync(path.join(PREDLOHA, "hotovo"))) return;

  rmSync(PREDLOHA, { recursive: true, force: true });
  const stavba = `${PREDLOHA}-stavba`;
  rmSync(stavba, { recursive: true, force: true });
  mkdirSync(stavba, { recursive: true });

  const env = { ...process.env, PGLITE_DIR: stavba, SEED_DNI: process.env.SEED_DNI ?? "260" };
  delete (env as Record<string, unknown>).DATABASE_URL;
  await spustit("node", ["scripts/db-migrate.mjs"], { env });
  await spustit("node", ["scripts/db-seed.mjs"], { env });

  // Přejmenování až nakonec: kdyby stavba spadla v půlce, nezůstane po ní
  // předloha, kterou by příští běh považoval za hotovou.
  cpSync(stavba, PREDLOHA, { recursive: true });
  mkdirSync(path.join(PREDLOHA, "hotovo"), { recursive: true });
  rmSync(stavba, { recursive: true, force: true });
}

export async function pripravDb(): Promise<{ dir: string; uklid: () => void }> {
  await zajistiPredlohu();

  const dir = mkdtempSync(path.join(os.tmpdir(), "sedmyles-test-"));
  cpSync(PREDLOHA, dir, { recursive: true });
  rmSync(path.join(dir, "hotovo"), { recursive: true, force: true });

  process.env.PGLITE_DIR = dir;
  delete process.env.DATABASE_URL;
  return { dir, uklid: () => rmSync(dir, { recursive: true, force: true }) };
}
