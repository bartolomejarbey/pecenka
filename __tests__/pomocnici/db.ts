import { execFile } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const spustit = promisify(execFile);

/**
 * Čerstvá databáze pro integrační testy.
 *
 * Každý běh dostane vlastní adresář PGlite, takže testy o sebe nezakopnou
 * a nešahají na vývojářskou `.pglite`. Migrace i seed jedou týmiž skripty
 * jako naostro — kdyby se rozešly, test to pozná dřív než produkce.
 *
 * Spouštíme asynchronně: `execFileSync` blokuje vlákno workeru natolik, že
 * vitestu vyprší jeho vlastní RPC heartbeat.
 */
export async function pripravDb(): Promise<{ dir: string; uklid: () => void }> {
  const dir = mkdtempSync(path.join(os.tmpdir(), "sedmyles-test-"));
  const env = { ...process.env, PGLITE_DIR: dir, SEED_DNI: process.env.SEED_DNI ?? "260" };
  delete (env as Record<string, unknown>).DATABASE_URL;

  await spustit("node", ["scripts/db-migrate.mjs"], { env });
  await spustit("node", ["scripts/db-seed.mjs"], { env });

  process.env.PGLITE_DIR = dir;
  delete process.env.DATABASE_URL;
  return { dir, uklid: () => rmSync(dir, { recursive: true, force: true }) };
}
