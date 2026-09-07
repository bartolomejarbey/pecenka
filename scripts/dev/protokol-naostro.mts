/**
 * Průchod protokolem se skutečným modelem.
 *
 * Integrační test běží bez klíče, takže ověří všechno kromě toho hlavního —
 * jestli systém pozná propálenou sedačku a řekne o tom hostovi tak, jak má.
 * Tenhle skript to dožene: založí rezervaci, nahraje referenční fotky,
 * nahraje odjezdové fotky **se skutečným poškozením** a nechá doběhnout
 * celé vyhodnocení včetně volání modelu.
 *
 * Stojí to pár korun, proto to není v `npm test`.
 *
 *   node --import ./scripts/dev/bez-server-only.mjs scripts/dev/protokol-naostro.mts
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const spustit = promisify(execFile);
const KOREN = path.resolve(import.meta.dirname, "../..");

for (const r of readFileSync(path.join(KOREN, ".env.local"), "utf8").split("\n")) {
  const m = r.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

/** Vlastní databáze i úložiště, ať se nesáhne na vývojářská data. */
const db = mkdtempSync(path.join(os.tmpdir(), "sedmyles-naostro-db-"));
const uloziste = mkdtempSync(path.join(os.tmpdir(), "sedmyles-naostro-fotky-"));
process.env.PGLITE_DIR = db;
process.env.PROTOKOL_DIR = uloziste;
delete process.env.DATABASE_URL;

console.log("zakládám databázi…");
await spustit("node", ["scripts/db-migrate.mjs"], { cwd: KOREN, env: process.env });
await spustit("node", ["scripts/db-seed.mjs"], { cwd: KOREN, env: process.env });

const { vytvorRezervaci } = await import("../../lib/reservations/vytvor.ts");
const { prijmiFotku } = await import("../../lib/portal/foto.ts");
const { zajistiProtokol } = await import("../../lib/portal/protokol.ts");
const { nahrajReferenci } = await import("../../lib/admin/reference.ts");
const { vyhodnotInspekci } = await import("../../lib/luna/run.ts");
const { nactiStavProtokolu } = await import("../../lib/portal/vysledek.ts");
const { radky, zavriDb } = await import("../../lib/db/client.ts");
const { sql } = await import("drizzle-orm");

const FOTKY = path.join(KOREN, "public/test-ai");
const snimek = (id: string, k: "pred" | "po") =>
  readFileSync(path.join(FOTKY, `${id}-${k}.jpg`));

/**
 * Scénář jednoho pobytu.
 *
 * Šest zón: dvě beze změny, dvě nepořádek, dvě skutečné poškození. Přesně
 * to, co může přijít od jednoho hosta — a systém musí zvládnout obojí naráz.
 */
const ZONY = [
  { zona: "seating", id: "p07", ceka: "poškození (propálená díra)" },
  { zona: "window", id: "p09", ceka: "poškození (prasklé sklo)" },
  { zona: "kitchen", id: "p04", ceka: "nepořádek (nádobí)" },
  { zona: "loft", id: "p05", ceka: "nepořádek (neustlaná postel)" },
  { zona: "floor", id: "p02", ceka: "beze změny (jiné světlo)" },
  { zona: "bathroom", id: "p06", ceka: "nepořádek (mokrá koupelna)" },
] as const;

const za = (d: number) => {
  const x = new Date();
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() + d);
  return x;
};

console.log("\nreferenční fotky…");
for (const z of ZONY) {
  const v = await nahrajReferenci("achat", z.zona, snimek(z.id, "pred"), "zkouška");
  console.log(`  ${z.zona.padEnd(10)} ${v.ok ? "ok" : "CHYBA: " + v.chyba}`);
}

// Příjezd dnes: protokol se otevírá den před příjezdem a tady se zkouší
// cesta hosta, který v domku právě stojí.
const r = await vytvorRezervaci({
  domek: "achat",
  prijezd: za(0),
  odjezd: za(3),
  dospeli: 2,
  doplnky: {},
  host: { jmeno: "Zkušební Host", email: "zkouska@example.com" },
});
if (!r.ok) throw new Error(r.zprava);
const [rez] = await radky<{ id: string }>(
  sql`SELECT id::text AS id FROM reservations WHERE code = ${r.kod}`,
);
console.log(`\nrezervace ${r.kod}`);

const protokol = await zajistiProtokol(rez.id);
const inspekceId = protokol.inspekce[0].id;
console.log(`protokol založen · ${protokol.zony.length} zón · ${protokol.inspekce.length} domek/ů`);

console.log("\nodjezdové fotky…");
for (const z of ZONY) {
  const v = await prijmiFotku({
    rezervaceId: rez.id,
    kodRezervace: r.kod,
    odjezd: za(3).toISOString().slice(0, 10),
    zona: z.zona,
    klientId: z.zona,
    data: snimek(z.id, "po"),
  });
  console.log(`  ${z.zona.padEnd(10)} ${v.ok ? "nahráno" : "ODMÍTNUTO: " + v.chyba}`);
}

await radky(sql`
  UPDATE inspections SET status = 'submitted', submitted_at = now()
   WHERE id = ${inspekceId}::uuid
`);

console.log("\nvyhodnocuji (volá se model)…");
const zacatek = Date.now();
const v = await vyhodnotInspekci(inspekceId);
console.log(`hotovo za ${((Date.now() - zacatek) / 1000).toFixed(0)} s · ${v.volani} volání · ${(v.nakladHalere / 100).toFixed(2)} Kč\n`);

for (const z of ZONY) {
  const n = v.zony.find((x) => x.klic === z.zona);
  if (!n) continue;
  console.log(
    `  ${z.zona.padEnd(10)} ${n.zavaznost.padEnd(13)} jistota ${(n.jistota * 100).toFixed(0).padStart(3)} %  ` +
      `${n.kLidskemuPosouzeni ? "→ majiteli" : "          "}  (čekáno: ${z.ceka})`,
  );
  if (n.prosba) console.log(`             prosba hostovi: „${n.prosba}"`);
}

console.log(`\nstav inspekce: ${v.stav}`);
console.log(`shrnutí majiteli: ${v.shrnuti}\n`);

const stav = await nactiStavProtokolu(rez.id);
if (stav.stav === "hotovo") {
  const z = stav.vzkaz;
  console.log("═══ CO UVIDÍ HOST ═══");
  console.log(`[${z.ton}] ${z.nadpis}`);
  console.log(z.text);
  for (const p of z.prosby) console.log(`  · ${p}`);
  if (z.telefon) console.log(`  ☎ ${z.telefon}`);
  console.log(z.patka);
  console.log("═════════════════════");
}

const [{ pripadu }] = await radky<{ pripadu: number }>(sql`
  SELECT count(*)::int AS pripadu FROM damage_cases WHERE inspection_id = ${inspekceId}::uuid
`);
console.log(`\npřípadů ke schválení majitelem: ${pripadu}`);

// Zavřít dřív než mazat — PGlite dopisuje adresář asynchronně.
await zavriDb();
rmSync(db, { recursive: true, force: true });
rmSync(uloziste, { recursive: true, force: true });
process.exit(0);
