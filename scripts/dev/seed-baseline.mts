/**
 * Nahraje referenční snímky domků.
 *
 * Bez nich nemá foto-protokol s čím porovnávat. Naostro je nafotí majitel
 * telefonem přímo v domku; tohle jsou zástupné snímky z fotobanky projektu,
 * aby šel modul vyzkoušet.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const { otiskProDb, pripravFotku } = await import("../../lib/luna/obraz.ts");
const { cestaBaseline, nahraj } = await import("../../lib/luna/uloziste.ts");
const { radky } = await import("../../lib/db/client.ts");
const { sql } = await import("drizzle-orm");
const { zajistiChecklist } = await import("../../lib/luna/checklist.ts");

const KOREN = path.resolve(import.meta.dirname, "../..");

/** Zóna → fotka, kterou máme k dispozici. */
const SNIMKY: Record<string, string> = {
  floor: "public/foto/interier-obyvak.jpg",
  kitchen: "public/foto/interier-kuchyne.jpg",
  bathroom: "public/foto/interier-koupelna.jpg",
  wc: "public/foto/interier-koupelna.jpg",
  loft: "public/foto/interier-patro.jpg",
  mattress: "public/foto/interier-patro.jpg",
  seating: "public/foto/interier-obyvak.jpg",
  window: "public/foto/interier-obyvak.jpg",
  ceiling: "public/foto/interier-patro.jpg",
  terrace: "public/foto/domek-vecer.jpg",
  grill: "public/foto/ohniste-vecer.jpg",
  fridge: "public/foto/interier-kuchyne.jpg",
};

await zajistiChecklist();

for (const domek of ["achat", "mech"]) {
  const [existuje] = await radky<{ id: string; version: number }>(
    sql`SELECT id::text AS id, version FROM baseline_sets
         WHERE unit_slug = ${domek} AND valid_to IS NULL ORDER BY version DESC LIMIT 1`,
  );
  let sadaId = existuje?.id;
  const verze = existuje?.version ?? 1;

  if (!sadaId) {
    const [nova] = await radky<{ id: string }>(sql`
      INSERT INTO baseline_sets (unit_slug, version, valid_from, note)
      VALUES (${domek}, 1, now(), 'Výchozí sada — zástupné snímky, nahradit fotkami z domku')
      RETURNING id::text AS id
    `);
    sadaId = nova.id;
  }

  let n = 0;
  for (const [zona, soubor] of Object.entries(SNIMKY)) {
    const [uz] = await radky<{ id: string }>(
      sql`SELECT id::text AS id FROM baseline_shots
           WHERE baseline_set_id = ${sadaId}::uuid AND zone_key = ${zona}`,
    );
    if (uz) continue;

    const f = await pripravFotku(readFileSync(path.join(KOREN, soubor)));
    const cesta = cestaBaseline(domek, verze, zona, "day");
    await nahraj(cesta, f.data);
    await radky(sql`
      INSERT INTO baseline_shots (baseline_set_id, zone_key, light_variant, storage_key,
                                  dhash64, mean_luminance)
      VALUES (${sadaId}::uuid, ${zona}, 'day', ${cesta}, ${otiskProDb(f.dhash).toString()}::bigint, ${f.jas})
    `);
    n++;
  }
  console.log(`  ${domek}: sada v${verze}, nahráno ${n} nových snímků`);
}
console.log("hotovo");
process.exit(0);
