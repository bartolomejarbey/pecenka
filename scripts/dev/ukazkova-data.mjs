#!/usr/bin/env node
/**
 * Ukázková data pro místní prohlídku.
 *
 * Postaví databázi od nuly a naplní ji tak, aby šlo proklikat celý systém:
 * účet do administrace, pár rezervací, informace k pobytu, referenční fotky
 * a přístup hosta do portálu.
 *
 *   node scripts/dev/ukazkova-data.mjs
 *
 * **Nepouštět, když běží server.** PGlite drží data v jednom adresáři a dva
 * procesy nad ním si je navzájem poškodí — projeví se to až chybou
 * „Aborted()" při dalším čtení. Skript proto na začátku kontroluje zámek.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const KOREN = path.resolve(import.meta.dirname, "../..");
const PGLITE = process.env.PGLITE_DIR ?? path.join(KOREN, ".pglite");

if (fs.existsSync(path.join(PGLITE, "postmaster.pid"))) {
  console.error(
    "Databáze je zamčená — nejspíš běží `npm run dev` nebo `npm start`.\n" +
      "Zastav server a spusť to znovu; jinak se data poškodí.",
  );
  process.exit(1);
}

const spust = (prikaz, args, env = {}) =>
  execFileSync(prikaz, args, { cwd: KOREN, stdio: "inherit", env: { ...process.env, ...env } });

console.log("\n1/5  databáze od nuly");
fs.rmSync(PGLITE, { recursive: true, force: true });
spust("node", ["scripts/db-migrate.mjs"]);
spust("node", ["scripts/db-seed.mjs"]);

console.log("\n2/5  účet do administrace");
execFileSync("node", ["--import", "./scripts/dev/bez-server-only.mjs", "scripts/create-admin.mts",
  "admin@sedmyles.cz", "Majitel", "owner"], {
  cwd: KOREN, input: "TajneHeslo2026\n", stdio: ["pipe", "inherit", "inherit"],
});

console.log("\n3/5  rezervace");
spust("node", ["scripts/dev/seed-ukazka.mjs"]);

console.log("\n4/5  informace k pobytu a referenční fotky");
spust("node", ["--import", "./scripts/dev/bez-server-only.mjs", "scripts/dev/ukazka-pobyt.mjs"], {
  PROTOKOL_DIR: path.join(KOREN, ".uloziste"),
});

console.log("\n5/5  hotovo\n");
console.log("  Web       http://localhost:3000");
console.log("  Admin     http://localhost:3000/admin   admin@sedmyles.cz / TajneHeslo2026");
console.log("  Ukázka    http://localhost:3000/pobyt/ukazka");
console.log("\n  Spusť: PROTOKOL_DIR=$PWD/.uloziste npm start\n");
