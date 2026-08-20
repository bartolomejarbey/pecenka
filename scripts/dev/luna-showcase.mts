/**
 * Ukázková sada pro Lunu.
 *
 * Vezme skutečné fotky interiéru, nechá obrazový model dokreslit poškození
 * (od sotva viditelného po zjevné) a každou dvojici prožene celým řetězem:
 * obrazová brána → Luna 5.6 → protiargument. Výsledek uloží do JSON,
 * ze kterého se staví ukázková stránka.
 *
 *   node --import ./scripts/dev/bez-server-only.mjs scripts/dev/luna-showcase.mts <adresář>
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const { porovnej, pripravFotku, vyrez } = await import("../../lib/luna/obraz.ts");
const { zeptejSe } = await import("../../lib/luna/model.ts");
const { zpravaProZonu, zpravaProtiargument } = await import("../../lib/luna/prompt.ts");

const KOREN = path.resolve(import.meta.dirname, "../..");
const OUT = process.argv[2] ?? "/tmp/luna-showcase";
fs.mkdirSync(path.join(OUT, "fotky"), { recursive: true });

const KLIC = process.env.OPENAI_API_KEY!;
const MODEL_OBRAZ = "gpt-image-1";

type Scenar = {
  id: string;
  zdroj: string;
  zona: { klic: string; nazev: string; otazky: string[] };
  miraPoskozeni: "žádné" | "sotva viditelné" | "zjevné";
  popis: string;
  prompt: string;
};

const ZONY = {
  seating: { klic: "seating", nazev: "Sedačka a nábytek", otazky: ["Nejsou v čalounění díry, skvrny nebo propálená místa?", "Nechybí noha u stolku?"] },
  floor: { klic: "floor", nazev: "Podlaha", otazky: ["Nejsou ve vinylu rýhy nebo promáčkliny?", "Nejsou skvrny, které nejdou setřít?"] },
  kitchen: { klic: "kitchen", nazev: "Kuchyňská linka", otazky: ["Není deska propálená nebo pořezaná?", "Fungují dvířka a nejsou uražená?"] },
  bathroom: { klic: "bathroom", nazev: "Koupelna a sprcha", otazky: ["Není prasklá sprchová zástěna?", "Nejsou uvolněné obklady?"] },
  loft: { klic: "loft", nazev: "Spací patro", otazky: ["Drží zábradlí pevně?", "Nejsou poškozené schůdky?"] },
  window: { klic: "window", nazev: "Prosklená stěna", otazky: ["Není sklo prasklé nebo naprasklé v rohu?", "Jede žaluzie nahoru i dolů?"] },
};

const OBYVAK = "public/foto/interier-obyvak.jpg";
const KUCHYNE = "public/foto/interier-kuchyne.jpg";
const KOUPELNA = "public/foto/interier-koupelna.jpg";
const PATRO = "public/foto/interier-patro.jpg";

const NIC = "Return this photo completely unchanged. Do not add, remove or alter anything.";

const SCENARE: Scenar[] = [
  // ===== kontrolní: beze změny =====
  { id: "k1", zdroj: OBYVAK, zona: ZONY.seating, miraPoskozeni: "žádné", popis: "Beze změny", prompt: NIC },
  { id: "k2", zdroj: KUCHYNE, zona: ZONY.kitchen, miraPoskozeni: "žádné", popis: "Beze změny", prompt: NIC },
  { id: "k3", zdroj: KOUPELNA, zona: ZONY.bathroom, miraPoskozeni: "žádné", popis: "Beze změny", prompt: NIC },

  // ===== sotva viditelné =====
  { id: "s1", zdroj: OBYVAK, zona: ZONY.seating, miraPoskozeni: "sotva viditelné",
    popis: "Malá světlá skvrna na sedáku",
    prompt: "Add a small pale watermark stain, about 8 cm across, on the seat cushion of the nearest armchair. Subtle, slightly lighter than the fabric, with a faint darker ring at the edge. Change nothing else." },
  { id: "s2", zdroj: OBYVAK, zona: ZONY.floor, miraPoskozeni: "sotva viditelné",
    popis: "Jemný škrábanec ve vinylu",
    prompt: "Add a thin shallow scratch on the vinyl floor in the foreground, about 15 cm long, barely visible, slightly lighter than the surrounding floor. Change nothing else." },
  { id: "s3", zdroj: KUCHYNE, zona: ZONY.kitchen, miraPoskozeni: "sotva viditelné",
    popis: "Drobné oděrky na pracovní desce",
    prompt: "Add a few faint knife scuff marks on the kitchen worktop surface, short and shallow, barely noticeable. Change nothing else." },
  { id: "s4", zdroj: KOUPELNA, zona: ZONY.bathroom, miraPoskozeni: "sotva viditelné",
    popis: "Odchlíplý roh silikonu",
    prompt: "Add a small section of silicone sealant peeling away at the bottom corner of the shower, about 5 cm, slightly lifted and discoloured. Change nothing else." },
  { id: "s5", zdroj: PATRO, zona: ZONY.loft, miraPoskozeni: "sotva viditelné",
    popis: "Odřený lak na schůdku",
    prompt: "Add a small patch of worn-off finish on the edge of the wooden step, about 6 cm, showing lighter bare wood underneath. Change nothing else." },
  { id: "s6", zdroj: OBYVAK, zona: ZONY.seating, miraPoskozeni: "sotva viditelné",
    popis: "Zataženo vlákno v čalounění",
    prompt: "Add a small pulled thread and slight fabric snag on the armrest of the nearest armchair, about 4 cm. Change nothing else." },
  { id: "s7", zdroj: KUCHYNE, zona: ZONY.kitchen, miraPoskozeni: "sotva viditelné",
    popis: "Malý flek pod dřezem",
    prompt: "Add a small pale water stain on the cabinet front just below the sink, about 10 cm, slightly darker wood. Change nothing else." },
  { id: "s8", zdroj: OBYVAK, zona: ZONY.window, miraPoskozeni: "sotva viditelné",
    popis: "Vlasová prasklina v rohu skla",
    prompt: "Add a very fine hairline crack in the bottom corner of the large window pane, about 7 cm, only visible on close inspection. Change nothing else." },

  // ===== zjevné =====
  { id: "z1", zdroj: OBYVAK, zona: ZONY.seating, miraPoskozeni: "zjevné",
    popis: "Velká skvrna od kávy",
    prompt: "Add a large dark brown coffee stain soaked deep into the orange fabric of the nearest armchair seat, about 25 cm across, irregular edges, clearly wet-stained. Change nothing else." },
  { id: "z2", zdroj: OBYVAK, zona: ZONY.seating, miraPoskozeni: "zjevné",
    popis: "Propálená díra v čalounění",
    prompt: "Add a cigarette burn hole in the armchair upholstery, about 3 cm wide, with charred blackened edges and exposed foam inside. Change nothing else." },
  { id: "z3", zdroj: OBYVAK, zona: ZONY.floor, miraPoskozeni: "zjevné",
    popis: "Hluboká rýha v podlaze",
    prompt: "Add a deep gouge in the vinyl floor, about 40 cm long, with the pale sub-layer exposed and curled shavings at one end. Change nothing else." },
  { id: "z4", zdroj: OBYVAK, zona: ZONY.window, miraPoskozeni: "zjevné",
    popis: "Prasklé sklo",
    prompt: "Add a large spider-web crack in the big window pane, radiating from an impact point, clearly shattered but still in place. Change nothing else." },
  { id: "z5", zdroj: KUCHYNE, zona: ZONY.kitchen, miraPoskozeni: "zjevné",
    popis: "Propálená pracovní deska",
    prompt: "Add a large dark burn mark on the kitchen worktop, about 20 cm, clearly scorched and blistered from a hot pan. Change nothing else." },
  { id: "z6", zdroj: KUCHYNE, zona: ZONY.kitchen, miraPoskozeni: "zjevné",
    popis: "Utržená dvířka skříňky",
    prompt: "Show one kitchen cabinet door hanging loose off its hinge at an angle, clearly broken. Change nothing else." },
  { id: "z7", zdroj: KOUPELNA, zona: ZONY.bathroom, miraPoskozeni: "zjevné",
    popis: "Prasklá sprchová zástěna",
    prompt: "Add a large crack across the glass shower screen with visible fracture lines. Change nothing else." },
  { id: "z8", zdroj: KOUPELNA, zona: ZONY.bathroom, miraPoskozeni: "zjevné",
    popis: "Chybí držák sprchy",
    prompt: "Remove the shower holder from the wall, leaving two visible screw holes and a lighter patch where it was mounted. Change nothing else." },
  { id: "z9", zdroj: PATRO, zona: ZONY.loft, miraPoskozeni: "zjevné",
    popis: "Uvolněné zábradlí",
    prompt: "Show the loft railing detached at one end, hanging loose with visible screw holes in the wood. Change nothing else." },
  { id: "z10", zdroj: PATRO, zona: ZONY.loft, miraPoskozeni: "zjevné",
    popis: "Velká skvrna na matraci",
    prompt: "Add a large dark stain soaked into the mattress, about 30 cm across, clearly visible against the pale bedding. Change nothing else." },
  { id: "z11", zdroj: OBYVAK, zona: ZONY.seating, miraPoskozeni: "zjevné",
    popis: "Ulomená noha stolku",
    prompt: "Show the small side table with one leg broken off, the table tilting to one side, the broken leg lying on the floor beside it. Change nothing else." },
  { id: "z12", zdroj: KUCHYNE, zona: ZONY.kitchen, miraPoskozeni: "zjevné",
    popis: "Rozbitý dřez",
    prompt: "Add a large chip and crack in the kitchen sink basin, clearly damaged. Change nothing else." },
];

/* ===== generování ===== */

/** Generování s opakováním — spojení k obrazovému API občas vypadne. */
async function vygeneruj(s: Scenar, zaklad: Buffer, pokusu = 3): Promise<Buffer | null> {
  for (let i = 1; i <= pokusu; i++) {
    try {
      const form = new FormData();
      form.append("model", MODEL_OBRAZ);
      form.append("prompt", s.prompt);
      form.append("size", "1024x1024");
      form.append("input_fidelity", "high");
      form.append("image", new Blob([zaklad], { type: "image/png" }), "z.png");
      const o = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${KLIC}` },
        body: form,
        signal: AbortSignal.timeout(240_000),
      });
      if (!o.ok) {
        const t = await o.text();
        console.log(`  ✗ ${s.id} (${i}/${pokusu}): ${o.status} ${t.slice(0, 120)}`);
        if (o.status < 500 && o.status !== 429) return null;
      } else {
        const d = (await o.json()) as { data: { b64_json: string }[] };
        return Buffer.from(d.data[0].b64_json, "base64");
      }
    } catch (e) {
      console.log(`  ✗ ${s.id} (${i}/${pokusu}): ${(e as Error).message.slice(0, 90)}`);
    }
    if (i < pokusu) await new Promise((r) => setTimeout(r, 4000 * i));
  }
  return null;
}

/* ===== běh ===== */

const zakladny = new Map<string, Buffer>();
for (const c of new Set(SCENARE.map((s) => s.zdroj))) {
  const b = await sharp(fs.readFileSync(path.join(KOREN, c)))
    .rotate().resize(1024, 1024, { fit: "cover" }).png().toBuffer();
  zakladny.set(c, b);
  const jm = path.basename(c, ".jpg");
  fs.writeFileSync(path.join(OUT, "fotky", `baseline-${jm}.jpg`),
    await sharp(b).jpeg({ quality: 86 }).toBuffer());
}
console.log(`základny: ${zakladny.size}`);

// Co už na disku je, negenerujeme znovu — běh se dá bez ztráty navázat.
const varianty = new Map<string, Buffer>();
const zbyva: Scenar[] = [];
for (const s of SCENARE) {
  const c = path.join(OUT, "fotky", `${s.id}.jpg`);
  if (fs.existsSync(c)) varianty.set(s.id, fs.readFileSync(c));
  else zbyva.push(s);
}
console.log(`hotovo dřív: ${varianty.size} · generuji zbylých ${zbyva.length} po třech…`);
for (let i = 0; i < zbyva.length; i += 3) {
  const davka = zbyva.slice(i, i + 3);
  const t = Date.now();
  const vysledky = await Promise.all(davka.map((s) => vygeneruj(s, zakladny.get(s.zdroj)!)));
  davka.forEach((s, k) => {
    const b = vysledky[k];
    if (b) {
      varianty.set(s.id, b);
      fs.writeFileSync(path.join(OUT, "fotky", `${s.id}.jpg`), b);
    }
  });
  console.log(`  ${Math.min(i + 3, zbyva.length)}/${zbyva.length}  (${((Date.now() - t) / 1000).toFixed(0)} s)`);
}

console.log("\nvyhodnocuji Lunou…");
const vysledky: unknown[] = [];
let naklad = 0;

for (const s of SCENARE) {
  const po = varianty.get(s.id);
  if (!po) continue;
  const pred = (await pripravFotku(zakladny.get(s.zdroj)!)).data;
  const poP = (await pripravFotku(po)).data;

  const g = await porovnej(pred, poP);
  const zaznam: Record<string, unknown> = {
    id: s.id, popis: s.popis, mira: s.miraPoskozeni, zona: s.zona.nazev, zonaKlic: s.zona.klic,
    zdroj: path.basename(s.zdroj, ".jpg"),
    brana: {
      podobnost: +(g.podobnost * 100).toFixed(1),
      zarovnani: g.zarovnani,
      rozdilJasu: g.rozdilJasu,
      mist: g.oblasti.length,
      oblasti: g.oblasti.map((o) => ({ x: +o.x.toFixed(3), y: +o.y.toFixed(3), w: +o.w.toFixed(3), h: +o.h.toFixed(3) })),
    },
  };

  if (!g.oblasti.length && g.zarovnani !== "poor") {
    zaznam.branaZavrena = true;
    zaznam.luna = null;
    vysledky.push(zaznam);
    console.log(`  ${s.id.padEnd(4)} ${s.popis.padEnd(32)} brána zavřena`);
    continue;
  }

  const mista = g.oblasti.slice(0, 2);
  const pary = await Promise.all(mista.map(async (o) => [await vyrez(pred, o), await vyrez(poP, o)] as const));
  pary.forEach(([a, b], i) => {
    fs.writeFileSync(path.join(OUT, "fotky", `${s.id}-v${i}-ref.jpg`), a);
    fs.writeFileSync(path.join(OUT, "fotky", `${s.id}-v${i}-po.jpg`), b);
  });
  const obrazky = [
    { data: pred, popis: "ref" }, { data: poP, popis: "po" },
    ...pary.flatMap(([a, b], i) => [{ data: a, popis: `r${i}` }, { data: b, popis: `p${i}` }]),
  ];

  const o = await zeptejSe(
    zpravaProZonu(s.zona, { rozdilJasu: g.rozdilJasu, podobnost: g.podobnost, zarovnani: g.zarovnani, vyrezy: mista }),
    obrazky, s.zona.klic,
  );
  if (!o) { vysledky.push(zaznam); continue; }
  naklad += o.uzitek.cenaHalere;

  let protiargument: string | null = null;
  if (["damage_minor", "damage_major", "missing"].includes(o.nalez.severity)) {
    const op = await zeptejSe(zpravaProtiargument(s.zona, o.nalez.what_changed), obrazky, s.zona.klic);
    if (op) { protiargument = op.nalez.what_changed; naklad += op.uzitek.cenaHalere; }
  }

  zaznam.branaZavrena = false;
  zaznam.luna = {
    zavaznost: o.nalez.severity,
    jistota: o.nalez.confidence,
    coSeZmenilo: o.nalez.what_changed,
    alternativa: o.nalez.alternative_explanation,
    protiargument,
    svetloUhel: o.nalez.is_lighting_or_angle_artifact,
    neporadek: o.nalez.is_guest_mess_not_damage,
    noveFoto: o.nalez.needs_reshoot,
    odhad: o.nalez.estimated_cost_czk,
    model: o.uzitek.model,
    trvaniMs: o.uzitek.trvaniMs,
    cenaHalere: o.uzitek.cenaHalere,
  };
  vysledky.push(zaznam);
  console.log(`  ${s.id.padEnd(4)} ${s.popis.padEnd(32)} ${o.nalez.severity.padEnd(14)} ${(o.nalez.confidence * 100).toFixed(0)} %`);
}

fs.writeFileSync(path.join(OUT, "vysledky.json"), JSON.stringify({ naklad, vysledky }, null, 1));
console.log(`\nhotovo · ${vysledky.length} případů · celkem ${(naklad / 100).toFixed(2)} Kč`);
process.exit(0);
