#!/usr/bin/env node
/**
 * Načte typy z živé databáze do lib/db/schema.ts.
 *
 * Zdrojem pravdy je SQL v db/migrations/ — tenhle krok z něj jen udělá
 * TypeScript, aby dotazy měly typy. Pouštět po každé nové migraci.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT = "db/drizzle";
execFileSync("npx", ["drizzle-kit", "pull"], { stdio: "inherit" });

const HLAVICKA = `// !!! GENEROVANÝ SOUBOR — needituj ho ručně !!!
//
// Vzniká příkazem \`npm run db:pull\`, který si typy načte z živé databáze.
// Zdrojem pravdy je SQL v db/migrations/ (generované ze SYSTEM.md), protože
// obsahuje omezení, která Drizzle neumí popsat — hlavně EXCLUDE USING gist
// nad reservation_units, což je jediná spolehlivá ochrana proti dvojímu prodeji.
//
// Chceš změnit schéma? Uprav SYSTEM.md → npm run db:migration → nová migrace
// → npm run db:migrate → npm run db:pull.

`;

for (const [z, kam] of [["schema.ts", "lib/db/schema.ts"], ["relations.ts", "lib/db/relations.ts"]]) {
  const zdroj = path.join(OUT, z);
  if (!fs.existsSync(zdroj)) continue;
  let obsah = fs.readFileSync(zdroj, "utf8");
  // Poznámka drizzle-kitu o bigintu je u haléřů zbytečná: 9 007 199 254 740 991 haléřů
  // je 90 biliard korun, tam se nedostaneme.
  obsah = obsah.replace(/\n\t\/\/ You can use \{ mode: "bigint" \}[^\n]*/g, "");

  if (z === "schema.ts") {
    // 1. bytea — drizzle ho nemá vestavěný a generátor za něj dá `unknown(...)`.
    //    Šifrovaná pole (čísla dokladů, WebAuthn klíče) jsou přesně tenhle typ.
    obsah = obsah.replace(/\n\t\/\/ TODO: failed to parse database type 'bytea'/g, "");
    obsah = obsah.replace(/\bunknown\(/g, "bytea(");
    obsah = obsah.replace(
      /^import \{ sql \} from "drizzle-orm"$/m,
      `import { sql } from "drizzle-orm"
import { customType } from "drizzle-orm/pg-core"

/** Binární sloupec (bytea) — drizzle ho nemá vestavěný. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
\tdataType: () => "bytea",
})`,
    );

    // 2. invoices ↔ document_blobs se odkazují navzájem, což TypeScript neumí
    //    rozmotat (kruhová inference). V databázi oba klíče platí — v SQL je
    //    tenhle směr doplněný přes ALTER TABLE. Tady ho pro typy vynecháme.
    obsah = obsah.replace(
      /\n\tforeignKey\(\{\n\t{3}columns: \[table\.(pdfBlobId|isdocBlobId)\],\n\t{3}foreignColumns: \[documentBlobs\.id\],\n\t{3}name: "[^"]+"\n\t{2}\}\),/g,
      "",
    );
    obsah = obsah.replace(
      /export const invoices = pgTable\("invoices"/,
      `// Cizí klíče invoices → document_blobs (pdf_blob_id, isdoc_blob_id) tady
// schválně nejsou: s protisměrným document_blobs → invoices by vznikla kruhová
// typová závislost. V databázi oba klíče existují (viz db/migrations/0001_init.sql).
export const invoices = pgTable("invoices"`,
    );
  }
  fs.writeFileSync(kam, HLAVICKA + obsah);
  fs.rmSync(zdroj);
  console.log(`→ ${kam}`);
}
// Migraci generovanou drizzle-kitem nechceme — naše SQL je zdroj pravdy.
for (const f of fs.readdirSync(OUT)) {
  if (f.endsWith(".sql")) fs.rmSync(path.join(OUT, f));
}
