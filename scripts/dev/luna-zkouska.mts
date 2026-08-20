#!/usr/bin/env node
/**
 * Zkouška Luny 5.6 naostro.
 *
 * Vezme skutečnou fotku interiéru, vyrobí z ní „poškozenou" variantu
 * a prožene celý řetěz: obrazová brána → ChatGPT → nález.
 * Pak totéž s čistou fotkou při jiném světle, aby bylo vidět, že Luna
 * neobviní hosta ze změny osvětlení.
 *
 *   node scripts/dev/luna-zkouska.mts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

process.env.PGLITE_DIR ??= ".pglite-luna";

const { porovnej, pripravFotku, vyrez } = await import("../../lib/luna/obraz.ts");
const { zeptejSe, dostupnyModel } = await import("../../lib/luna/model.ts");
const { zpravaProZonu, zpravaProtiargument } = await import("../../lib/luna/prompt.ts");

const KOREN = path.resolve(import.meta.dirname, "../..");

const ZONA = {
  klic: "seating",
  nazev: "Sedačka a nábytek",
  otazky: [
    "Nejsou v čalounění díry, skvrny nebo propálená místa?",
    "Nechybí noha u stolku?",
  ],
};

async function skvrna(zdroj: Buffer, x: number, y: number, r: number, barva = "#3a1f12") {
  const m = await sharp(zdroj).metadata();
  const W = m.width!, H = m.height!;
  const svg = Buffer.from(
    `<svg width="${W}" height="${H}">
       <ellipse cx="${x * W}" cy="${y * H}" rx="${r * W}" ry="${r * W * 0.62}"
                fill="${barva}" opacity="0.9"/>
     </svg>`,
  );
  return sharp(zdroj).composite([{ input: svg }]).jpeg({ quality: 88 }).toBuffer();
}

async function pripad(nazev: string, pred: Buffer, po: Buffer) {
  console.log(`\n${"═".repeat(70)}\n  ${nazev}\n${"═".repeat(70)}`);

  const t = Date.now();
  const s = await porovnej(pred, po);
  console.log(`  Obrazová brána  ${Date.now() - t} ms`);
  console.log(`    podobnost      ${(s.podobnost * 100).toFixed(1)} %`);
  console.log(`    zarovnání      ${s.zarovnani}`);
  console.log(`    rozdíl jasu    ${s.rozdilJasu > 0 ? "+" : ""}${s.rozdilJasu} z 255`);
  console.log(`    podezřelá místa ${s.oblasti.length}`);

  if (s.oblasti.length === 0 && s.zarovnani !== "poor") {
    console.log(`\n  → BRÁNA ZAVŘENA. Model se nevolá, zóna je čistá.`);
    console.log(`     (ušetřeno jedno volání i riziko vymyšleného nálezu)`);
    return;
  }

  const mista = s.oblasti.slice(0, 2);
  const pary = await Promise.all(
    mista.map(async (o) => [await vyrez(pred, o), await vyrez(po, o)] as const),
  );
  const obrazky = [
    { data: pred, popis: "referenční celek" },
    { data: po, popis: "celek od hosta" },
    ...pary.flatMap(([a, b], i) => [
      { data: a, popis: `ref. výřez ${i + 1}` },
      { data: b, popis: `výřez ${i + 1} od hosta` },
    ]),
  ];

  const t2 = Date.now();
  const o = await zeptejSe(
    zpravaProZonu(ZONA, {
      rozdilJasu: s.rozdilJasu,
      podobnost: s.podobnost,
      zarovnani: s.zarovnani,
      vyrezy: mista,
    }),
    obrazky,
    ZONA.klic,
  );
  if (!o) {
    console.log("  → Žádný model není nastavený.");
    return;
  }

  const n = o.nalez;
  console.log(`\n  Luna 5.6 (${o.uzitek.model})  ${Date.now() - t2} ms · ${(o.uzitek.cenaHalere / 100).toFixed(2)} Kč`);
  console.log(`    závažnost      ${n.severity}`);
  console.log(`    jistota        ${(n.confidence * 100).toFixed(0)} %`);
  console.log(`    světlo/úhel?   ${n.is_lighting_or_angle_artifact ? "ano" : "ne"}`);
  console.log(`    jen nepořádek? ${n.is_guest_mess_not_damage ? "ano" : "ne"}`);
  console.log(`    nové foto?     ${n.needs_reshoot ? "ano" : "ne"}`);
  console.log(`    odhad opravy   ${n.estimated_cost_czk.min}–${n.estimated_cost_czk.max} Kč`);
  console.log(`\n    Co se změnilo:\n      ${n.what_changed}`);
  console.log(`\n    Proč to nemusí být škoda:\n      ${n.alternative_explanation}`);

  if (["damage_minor", "damage_major", "missing"].includes(n.severity)) {
    const op = await zeptejSe(zpravaProtiargument(ZONA, n.what_changed), obrazky, ZONA.klic);
    if (op) {
      console.log(`\n    Protiargument (samostatný běh):\n      ${op.nalez.what_changed}`);
      console.log(`\n  → JDE K MAJITELI KE SCHVÁLENÍ. Luna sama nerozhoduje.`);
    }
  } else {
    console.log(`\n  → Bez nároku. Nic se hostovi neúčtuje.`);
  }
}

/* ===== běh ===== */

console.log(`Poskytovatel: ${dostupnyModel()} · model: ${process.env.LUNA_MODEL ?? "výchozí"}`);

const zdroj = readFileSync(path.join(KOREN, "public/foto/interier-obyvak.jpg"));
const baseline = (await pripravFotku(zdroj)).data;

await pripad(
  "1. Táž místnost, jen večer místo rána (nesmí být nález)",
  baseline,
  await sharp(baseline).modulate({ brightness: 0.62 }).jpeg({ quality: 88 }).toBuffer(),
);

await pripad(
  "2. Tmavá skvrna na čalounění (má se najít)",
  baseline,
  await skvrna(baseline, 0.42, 0.58, 0.075),
);

await pripad(
  "3. Skvrna a k tomu jiné světlo (má se najít i tak)",
  baseline,
  await sharp(await skvrna(baseline, 0.63, 0.45, 0.06))
    .modulate({ brightness: 0.75 })
    .jpeg({ quality: 88 })
    .toBuffer(),
);

console.log("\n");
