/**
 * Zkušební sada „před a po" pro stránku Testování systému AI.
 *
 * Deset dvojic. Referenční snímek se vygeneruje z textu, snímek „po" vznikne
 * úpravou téhož souboru — takže se skutečně liší jen tím, co jsme zadali,
 * a zbytek scény zůstane stejný. Bez toho by porovnání měřilo dvě různé
 * místnosti a nic by neznamenalo.
 *
 * Sada je schválně **nevyvážená ve prospěch pastí**: pět z deseti dvojic
 * je nepořádek, přesunutý nábytek nebo jiné světlo. Systém, který je nahlásí
 * jako škodu, je k ničemu, i kdyby všechna skutečná poškození našel.
 *
 *   node scripts/dev/ai-sada-obrazky.mts [adresář]
 *
 * Běh se dá přerušit a navázat — co je na disku, se negeneruje znovu.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const KOREN = path.resolve(import.meta.dirname, "../..");
const OUT = process.argv[2] ?? path.join(KOREN, "public/test-ai");
fs.mkdirSync(OUT, { recursive: true });

for (const r of fs.readFileSync(path.join(KOREN, ".env.local"), "utf8").split("\n")) {
  const m = r.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const KLIC = process.env.OPENAI_API_KEY;
if (!KLIC) throw new Error("Chybí OPENAI_API_KEY.");

const MODEL = "gpt-image-2";
const ROZMER = "1536x1024";

/**
 * Společná hlavička promptu.
 *
 * Drží deset scén v jednom domku. Bez ní vypadá každá fotka jako z jiného
 * penzionu a ukázka pak netvrdí nic o tom, co systém umí.
 */
const STYL =
  "Photorealistic interior photograph of a small Scandinavian tiny house cabin, " +
  "warm oak plywood walls, dark charcoal floor, large window with pine forest outside, " +
  "overcast daylight, no people, handheld phone photo, natural colours, slight grain. ";

/** Prompt, který má vrátit tentýž snímek. Kontrola falešných poplachů. */
const BEZE_ZMENY = "Return this photo completely unchanged. Do not add, remove or alter anything.";

/**
 * Zóny checklistu, kterých se sada týká.
 *
 * Opsané z `lib/luna/checklist.ts` — ten sahá na databázi a skript by kvůli
 * němu potřeboval běžící Postgres. Když se checklist změní, musí se změnit
 * i tady; test, který zkouší jiné otázky než provoz, netvrdí nic.
 */
export const ZONY: Record<string, { klic: string; nazev: string; otazky: string[]; prahEskalace: number }> = {
  floor: { klic: "floor", nazev: "Podlaha", prahEskalace: 0.8,
    otazky: ["Nejsou ve vinylu rýhy nebo promáčkliny?", "Nechybí lišta?", "Nejsou skvrny, které nejdou setřít?"] },
  kitchen: { klic: "kitchen", nazev: "Kuchyňská linka", prahEskalace: 0.8,
    otazky: ["Není deska propálená nebo pořezaná?", "Fungují dvířka a nejsou uražená?", "Není poškozený dřez nebo baterie?"] },
  bathroom: { klic: "bathroom", nazev: "Koupelna a sprcha", prahEskalace: 0.85,
    otazky: ["Není prasklá sprchová zástěna?", "Drží držák sprchy?", "Nejsou uvolněné obklady?"] },
  loft: { klic: "loft", nazev: "Spací patro", prahEskalace: 0.8,
    otazky: ["Drží zábradlí pevně?", "Nejsou poškozené schůdky?"] },
  seating: { klic: "seating", nazev: "Sedačka a nábytek", prahEskalace: 0.8,
    otazky: ["Nejsou v čalounění díry, skvrny nebo propálená místa?", "Nechybí noha u stolku?"] },
  window: { klic: "window", nazev: "Prosklená stěna a žaluzie", prahEskalace: 0.9,
    otazky: ["Není sklo prasklé nebo naprasklé v rohu?", "Jede žaluzie nahoru i dolů?"] },
};

export type Pripad = {
  id: string;
  zona: string;
  nazev: string;
  /** Co po systému čekáme. Podle toho se sada vyhodnocuje. */
  ocekavano: "bez_nalezu" | "uklid" | "skoda";
  /** Krátké vysvětlení pro čtenáře stránky. */
  proc: string;
  pred: string;
  po: string;
};

export const PRIPADY: Pripad[] = [
  /* ===== past: nic se nestalo ===== */
  {
    id: "p01", zona: "seating", nazev: "Obývák beze změny", ocekavano: "bez_nalezu",
    proc: "Kontrolní dvojice. Když tady systém něco najde, hlásí falešné poplachy i všude jinde.",
    pred: STYL + "Living area of the cabin: a small grey fabric two-seat sofa with two ochre cushions, " +
      "a low round oak coffee table, a folded wool blanket over the sofa arm, seen straight from the front.",
    po: BEZE_ZMENY,
  },
  {
    id: "p02", zona: "floor", nazev: "Jiné světlo, stejná podlaha", ocekavano: "bez_nalezu",
    proc: "Ráno versus večer je největší zdroj vymyšlených škod. Rozdíl v jasu nesmí být nález.",
    pred: STYL + "The dark charcoal vinyl floor of the cabin seen from the doorway, " +
      "clean and empty, skirting boards visible along both walls.",
    po: "Change only the lighting: make this the same room photographed in the evening with a warm " +
      "table lamp switched on and the daylight outside gone dark blue. Do not change, add or remove " +
      "any object, surface or material.",
  },
  {
    id: "p03", zona: "seating", nazev: "Přesunutý nábytek", ocekavano: "bez_nalezu",
    proc: "Host si posunul křeslo a přeskládal polštáře. Nábytek jinde není poškození.",
    pred: STYL + "Living corner with a single ochre armchair beside a small oak side table, " +
      "three cushions arranged neatly on the sofa opposite, a floor lamp in the corner.",
    po: "Move the armchair about half a metre to the left and turn it to face the window, " +
      "rearrange the cushions into a different order and leave one leaning sideways. " +
      "Do not damage, stain, break or remove anything.",
  },

  /* ===== past: nepořádek, ne škoda ===== */
  {
    id: "p04", zona: "kitchen", nazev: "Neumyté nádobí", ocekavano: "uklid",
    proc: "Nádobí ve dřezu je věc úklidu. Systém má hosta poprosit, ne obvinit.",
    pred: STYL + "Compact kitchen counter with a light stone worktop, a stainless steel sink, " +
      "a black tap, two closed plywood cabinet doors below and an empty draining rack.",
    po: "Fill the sink with dirty dishes: several used plates, two mugs, a pan and cutlery, " +
      "plus two more dirty mugs and an open jar left on the worktop. " +
      "Do not damage, scratch, burn or break any surface.",
  },
  {
    id: "p05", zona: "loft", nazev: "Neustlaná postel", ocekavano: "uklid",
    proc: "Zmuchlaná peřina je přesně to, o co se dá vlídně poprosit. Nic víc.",
    pred: STYL + "Sleeping loft with a low double bed made up neatly with white linen, " +
      "two pillows side by side, a folded grey throw at the foot of the bed, wooden railing behind.",
    po: "Show the same bed unmade: duvet crumpled and pulled to one side, pillows dented and " +
      "out of place, the throw slipping onto the floor. Do not stain, tear or damage anything.",
  },
  {
    id: "p06", zona: "bathroom", nazev: "Mokrá koupelna po sprše", ocekavano: "uklid",
    proc: "Kapky na skle a ručník na zemi vypadají v porovnání dramaticky. Škoda to není.",
    pred: STYL + "Small bathroom with a glass shower screen, dark grey tiles, a white basin, " +
      "a chrome shower holder on the wall and a folded white towel on a rail, everything dry.",
    po: "Show the same bathroom just after someone showered: water droplets and steam haze on the " +
      "glass, wet floor tiles, one towel crumpled on the floor and the other hanging askew. " +
      "Do not crack, break or remove anything.",
  },

  /* ===== skutečná poškození ===== */
  {
    id: "p07", zona: "seating", nazev: "Propálená díra v čalounění", ocekavano: "skoda",
    proc: "Malá plocha, vysoká cena. Přesně to, co plošné porovnání propouští jen kvůli hloubce propadu.",
    pred: STYL + "A grey fabric two-seat sofa with two ochre cushions seen straight from the front, " +
      "upholstery clean and undamaged.",
    po: "Add a burn hole in the sofa seat cushion, about 5 cm across, with black charred edges and " +
      "pale foam visible inside the hole. Change nothing else.",
  },
  {
    id: "p08", zona: "kitchen", nazev: "Propálená pracovní deska", ocekavano: "skoda",
    proc: "Stopa po horkém hrnci. Jasná škoda, kterou musí systém trefit s vysokou jistotou.",
    pred: STYL + "Compact kitchen counter with a light stone worktop, a stainless steel sink and " +
      "a black tap, worktop clean and unmarked.",
    po: "Add a large dark scorch mark on the kitchen worktop, about 20 cm across, clearly burned and " +
      "blistered from a hot pan. Change nothing else.",
  },
  {
    id: "p09", zona: "window", nazev: "Prasklé sklo", ocekavano: "skoda",
    proc: "Nejdražší položka v domku. Prasklina v tabuli se nesmí schovat mezi odrazy.",
    pred: STYL + "Large floor-to-ceiling window pane with pine forest visible outside, " +
      "glass clean and intact, thin black frame.",
    po: "Add a large spider-web crack in the window pane radiating from a single impact point, " +
      "clearly shattered but still held in the frame. Change nothing else.",
  },
  {
    id: "p10", zona: "bathroom", nazev: "Chybí držák sprchy", ocekavano: "skoda",
    proc: "Chybějící vybavení pozná jen porovnání s referencí. Na samostatné fotce nic nechybí.",
    pred: STYL + "Bathroom wall with dark grey tiles, a chrome shower holder mounted on the wall " +
      "with the shower head resting in it, a hose curving down.",
    po: "Remove the shower holder and shower head from the wall completely, leaving two visible screw " +
      "holes and a lighter unweathered patch of tile where it was mounted. Change nothing else.",
  },
];

/* ===== volání API ===== */

async function odolne<T>(popis: string, co: () => Promise<T>, pokusu = 4): Promise<T | null> {
  for (let i = 1; i <= pokusu; i++) {
    try {
      return await co();
    } catch (e) {
      const zprava = (e as Error).message.slice(0, 140);
      console.log(`   ✗ ${popis} (${i}/${pokusu}): ${zprava}`);
      if (zprava.includes("NEOPAKOVAT")) return null;
      if (i < pokusu) await new Promise((r) => setTimeout(r, 5000 * i));
    }
  }
  return null;
}

async function vygeneruj(prompt: string): Promise<Buffer> {
  const o = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${KLIC}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt, size: ROZMER, n: 1 }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!o.ok) {
    const t = (await o.text()).slice(0, 200);
    throw new Error(`${o.status} ${t}${o.status >= 400 && o.status < 500 && o.status !== 429 ? " NEOPAKOVAT" : ""}`);
  }
  const d = (await o.json()) as { data: { b64_json: string }[] };
  return Buffer.from(d.data[0].b64_json, "base64");
}

async function uprav(zaklad: Buffer, prompt: string): Promise<Buffer> {
  const form = new FormData();
  form.append("model", MODEL);
  form.append("prompt", prompt);
  form.append("size", ROZMER);
  form.append("image", new Blob([new Uint8Array(zaklad)], { type: "image/png" }), "z.png");
  const o = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${KLIC}` },
    body: form,
    signal: AbortSignal.timeout(300_000),
  });
  if (!o.ok) {
    const t = (await o.text()).slice(0, 200);
    throw new Error(`${o.status} ${t}${o.status >= 400 && o.status < 500 && o.status !== 429 ? " NEOPAKOVAT" : ""}`);
  }
  const d = (await o.json()) as { data: { b64_json: string }[] };
  return Buffer.from(d.data[0].b64_json, "base64");
}

/* ===== běh ===== */

/**
 * Ukládá se JPEG, ne PNG.
 *
 * Model vrací PNG kolem 2,5 MB; dvacet snímků je padesát megabajtů v
 * repozitáři a stránka je stejně servíruje zmenšené. JPEG v kvalitě 88 je
 * na fotografii k nerozeznání a váží desetinu.
 */
const cesta = (id: string, ktera: "pred" | "po") => path.join(OUT, `${id}-${ktera}.jpg`);

async function uloz(kam: string, data: Buffer): Promise<void> {
  await sharp(data)
    .resize({ width: 1536, withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(kam);
}

console.log(`Referenční snímky (${PRIPADY.length})…`);
for (const p of PRIPADY) {
  if (fs.existsSync(cesta(p.id, "pred"))) {
    console.log(`  ${p.id}  ${p.nazev.padEnd(30)} z dřívějška`);
    continue;
  }
  const t = Date.now();
  const b = await odolne(p.id, () => vygeneruj(p.pred));
  if (!b) {
    console.log(`  ${p.id}  ${p.nazev.padEnd(30)} NEPOVEDLO SE`);
    continue;
  }
  await uloz(cesta(p.id, "pred"), b);
  console.log(`  ${p.id}  ${p.nazev.padEnd(30)} ${((Date.now() - t) / 1000).toFixed(0)} s`);
}

console.log(`\nSnímky po pobytu (${PRIPADY.length})…`);
for (const p of PRIPADY) {
  if (fs.existsSync(cesta(p.id, "po"))) {
    console.log(`  ${p.id}  ${p.nazev.padEnd(30)} z dřívějška`);
    continue;
  }
  if (!fs.existsSync(cesta(p.id, "pred"))) {
    console.log(`  ${p.id}  ${p.nazev.padEnd(30)} chybí reference`);
    continue;
  }
  const t = Date.now();
  const b = await odolne(p.id, () => uprav(fs.readFileSync(cesta(p.id, "pred")), p.po));
  if (!b) {
    console.log(`  ${p.id}  ${p.nazev.padEnd(30)} NEPOVEDLO SE`);
    continue;
  }
  await uloz(cesta(p.id, "po"), b);
  console.log(`  ${p.id}  ${p.nazev.padEnd(30)} ${((Date.now() - t) / 1000).toFixed(0)} s`);
}

const hotovo = PRIPADY.filter((p) => fs.existsSync(cesta(p.id, "pred")) && fs.existsSync(cesta(p.id, "po")));
console.log(`\nHotovo: ${hotovo.length}/${PRIPADY.length} dvojic v ${OUT}`);
