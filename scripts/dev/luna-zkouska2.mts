/**
 * Zkouška Luny na realistickém poškození.
 * Zbytek fotky je pixel po pixelu shodný — mění se jen poškozené místo.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const { porovnej, pripravFotku, vyrez } = await import("../../lib/luna/obraz.ts");
const { zeptejSe, dostupnyModel } = await import("../../lib/luna/model.ts");
const { zpravaProZonu, zpravaProtiargument } = await import("../../lib/luna/prompt.ts");
const { ryha, vsaklaSkvrna } = await import("./luna-poskozeni.mts");

const KOREN = path.resolve(import.meta.dirname, "../..");
const OUT = process.argv[2] ?? "/tmp/luna2";
mkdirSync(OUT, { recursive: true });

async function pripad(
  nazev: string,
  zona: { klic: string; nazev: string; otazky: string[] },
  pred: Buffer,
  po: Buffer,
  soubor: string,
) {
  console.log(`\n${"═".repeat(72)}\n  ${nazev}\n${"═".repeat(72)}`);
  writeFileSync(path.join(OUT, `${soubor}-po.jpg`), po);

  const s = await porovnej(pred, po);
  console.log(`  brána: podobnost ${(s.podobnost*100).toFixed(1)} % · zarovnání ${s.zarovnani} · jas ${s.rozdilJasu>0?"+":""}${s.rozdilJasu} · míst ${s.oblasti.length}`);

  if (!s.oblasti.length && s.zarovnani !== "poor") {
    console.log("  → BRÁNA ZAVŘENA, model se nevolá. Zóna čistá.");
    return;
  }

  const mista = s.oblasti.slice(0, 2);
  const pary = await Promise.all(mista.map(async (o) => [await vyrez(pred, o), await vyrez(po, o)] as const));
  pary.forEach(([a, b], i) => {
    writeFileSync(path.join(OUT, `${soubor}-vyrez${i}-ref.jpg`), a);
    writeFileSync(path.join(OUT, `${soubor}-vyrez${i}-po.jpg`), b);
  });
  const obrazky = [
    { data: pred, popis: "ref" }, { data: po, popis: "po" },
    ...pary.flatMap(([a, b], i) => [{ data: a, popis: `r${i}` }, { data: b, popis: `p${i}` }]),
  ];

  const o = await zeptejSe(
    zpravaProZonu(zona, { rozdilJasu: s.rozdilJasu, podobnost: s.podobnost, zarovnani: s.zarovnani, vyrezy: mista }),
    obrazky, zona.klic,
  );
  if (!o) return console.log("  → model nedostupný");
  const n = o.nalez;
  console.log(`\n  Luna (${o.uzitek.model}) ${(o.uzitek.trvaniMs/1000).toFixed(1)} s · ${(o.uzitek.cenaHalere/100).toFixed(2)} Kč`);
  console.log(`    ZÁVAŽNOST ${n.severity.toUpperCase()}   jistota ${(n.confidence*100).toFixed(0)} %   odhad ${n.estimated_cost_czk.min}–${n.estimated_cost_czk.max} Kč`);
  console.log(`    světlo/úhel? ${n.is_lighting_or_angle_artifact?"ano":"ne"} · nepořádek? ${n.is_guest_mess_not_damage?"ano":"ne"} · nové foto? ${n.needs_reshoot?"ano":"ne"}`);
  console.log(`\n    ${n.what_changed}`);
  console.log(`\n    Proti: ${n.alternative_explanation}`);

  if (["damage_minor","damage_major","missing"].includes(n.severity)) {
    const op = await zeptejSe(zpravaProtiargument(zona, n.what_changed), obrazky, zona.klic);
    if (op) console.log(`\n    Protiargument: ${op.nalez.what_changed}`);
    console.log(`\n  → KE SCHVÁLENÍ MAJITELEM.`);
  } else {
    console.log(`\n  → Bez nároku.`);
  }
}

console.log(`model: ${process.env.LUNA_MODEL} (${dostupnyModel()})`);

const obyvak = (await pripravFotku(readFileSync(path.join(KOREN, "public/foto/interier-obyvak.jpg")))).data;
writeFileSync(path.join(OUT, "baseline.jpg"), obyvak);

const SEDACKA = { klic: "seating", nazev: "Sedačka a nábytek", otazky: ["Nejsou v čalounění díry, skvrny nebo propálená místa?"] };
const PODLAHA = { klic: "floor", nazev: "Podlaha", otazky: ["Nejsou ve vinylu rýhy nebo promáčkliny?", "Nejsou skvrny, které nejdou setřít?"] };

await pripad("A. Beze změny (nesmí být nález)", SEDACKA, obyvak, obyvak, "a");
await pripad("B. Večerní světlo, jinak beze změny (nesmí být nález)", SEDACKA, obyvak,
  await sharp(obyvak).modulate({ brightness: 0.6 }).jpeg({ quality: 90 }).toBuffer(), "b");
await pripad("C. Vsáklá skvrna na křesle (má se najít)", SEDACKA, obyvak,
  await vsaklaSkvrna(obyvak, { x: 0.53, y: 0.72 }, 0.075, 0.6), "c");
await pripad("D. Rýha v podlaze (má se najít)", PODLAHA, obyvak,
  await ryha(obyvak, { x: 0.30, y: 0.88 }, { x: 0.52, y: 0.80 }), "d");

console.log(`\nvzorky uloženy do ${OUT}\n`);
