/**
 * Generování fotek pro sedmyles.cz přes OpenAI gpt-image-2 (Images Edits).
 *
 * Bere REÁLNÉ referenční fotky (reference/) a generuje fotorealistické
 * snímky skutečných domků v reálné lokalitě (zatopený břidlicový lom
 * Jílové u Držkova, Český ráj). Edits endpoint umí víc referencí přes image[].
 *
 * Použití:
 *   export OPENAI_API_KEY=...        (z reklamiq/.env)
 *   node scripts/generate-photos.mjs            # všechny chybějící
 *   node scripts/generate-photos.mjs hero       # jen vybrané id
 *   node scripts/generate-photos.mjs --force hero domky-den
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const REF = (p) => path.join(ROOT, "reference", p);
const OUT_DIR = path.join(ROOT, "public", "foto");

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error("Chybí OPENAI_API_KEY v prostředí.");
  process.exit(1);
}

/* ---- Společné stylové bloky promptů ---- */

const STYLE =
  "Photorealistic high-end architectural and travel photography, full-frame camera, natural light, true-to-life muted colors, fine realistic texture and grain, shallow-to-medium depth of field. NO oversaturation, NO HDR look, NO cartoon or 3D-render look, NO text, NO watermark, NO logos, no visible human faces. The setting is the gentle WOODED HILLS of the Bohemian Paradise / Podkrkonoší region in northern Czechia — low forested hills and spruce/birch forest, NEVER high alpine snow mountains.";

// Přesný popis skutečných domků — drží tvar podle referencí.
const HOUSE =
  "The building is a small MODERN BLACK CUBE tiny house with a FLAT roof and vertical dark anthracite standing-seam metal cladding, exactly matching the reference photos: a large floor-to-ceiling triple-glazed window with slim black frames and external dark venetian/louvre blinds, the box raised slightly on low discreet feet. Keep this exact cubic flat-roof design — do NOT add a pitched/gable roof, do NOT change the cladding.";

const QUARRY =
  "a small flooded former SLATE quarry with crystal-clear dark-emerald water, low slate rock walls, birches and spruce around the banks, exactly like the reference quarry photos.";

/* ---- Definice snímků ---- */

const SHOTS = [
  {
    id: "hero-lom-domky",
    size: "1536x1024",
    refs: ["houses/cubes-day-pallets.png", "houses/cubes-day-people-louvre.png", "location/lom-summer-pano.png"],
    prompt:
      `A premium hero photograph: TWO black cube tiny houses standing side by side on a clean wooden deck on the grassy bank of ${QUARRY} ` +
      `${HOUSE} Warm late-afternoon golden-hour light, long soft shadows, the houses and trees mirrored in the still water, a few village rooftops and soft wooded Bohemian hills on the far horizon. Calm, aspirational, editorial. ${STYLE}`,
  },
  {
    id: "lom-rano",
    size: "1536x1024",
    refs: ["location/lom-shore-cloudy.jpeg", "location/lom-summer-pano.png", "location/lom-birch.png"],
    prompt:
      `Atmospheric dawn photograph of ${QUARRY} Thin mist drifting over a glassy mirror-still water surface at sunrise, a lone spruce on a slate outcrop, soft pastel sky, perfect reflections, deep quiet. No buildings, no people. ${STYLE}`,
  },
  {
    id: "lom-letecky",
    size: "1792x1024",
    refs: ["location/lom-drone-topdown.png", "houses/cubes-day-pallets.png"],
    prompt:
      `A high aerial drone photograph looking down at TWO black cube tiny houses on a wooden deck beside ${QUARRY} The dark oval quarry lake is ringed by green forest, a thin footpath curves along the grassy bank. ${HOUSE} Summer midday, rich greens, realistic aerial perspective. ${STYLE}`,
  },
  {
    id: "domky-den",
    size: "1536x1024",
    refs: ["houses/cubes-day-pallets.png", "houses/cubes-day-people-louvre.png"],
    prompt:
      `Two finished black cube tiny houses standing side by side on a tidy wooden deck and mown lawn, freshly installed and landscaped (no construction debris, no pallets, no fences). ${HOUSE} One house shows the big glass window, the other shows the horizontal louvre-blind panel. Clear bright day, forest edge behind, soft natural light. ${STYLE}`,
  },
  {
    id: "domek-den",
    size: "1536x1024",
    refs: ["houses/cubes-day-pallets.png", "houses/cubes-day-people-louvre.png"],
    prompt:
      `A single finished black cube tiny house on a neat wooden deck on a mown lawn at a forest edge, three-quarter view showing the large glass window and the wooden deck with two simple chairs. ${HOUSE} Bright clear day, soft natural light, freshly landscaped (no construction debris). ${STYLE}`,
  },
  {
    id: "domek-vecer",
    size: "1024x1536",
    refs: ["night/cubes-night-glow.png", "night/facade-moon-bluehour.png"],
    prompt:
      `A single black cube tiny house at blue-hour dusk, warm amber interior light glowing through the large glass window, external louvre blinds half raised, two simple chairs on the wooden deck, dark forest and a faint moon behind. ${HOUSE} Cinematic, cosy, calm. ${STYLE}`,
  },
  {
    id: "domky-spojene",
    size: "1536x1024",
    refs: ["houses/cubes-day-people-louvre.png", "houses/cubes-day-pallets.png"],
    prompt:
      `Two black cube tiny houses ARCHITECTURALLY JOINED together into one larger connected home on a wooden deck, shown as a single 30 m² unit with a continuous deck between them, big glass windows. ${HOUSE} Late afternoon light, forest setting, aspirational family stay. ${STYLE}`,
  },
  {
    id: "interier-obyvak",
    size: "1536x1024",
    refs: ["interior/loft-view-orange-chairs.png", "interior/teal-ladder-kitchen-shower.png"],
    prompt:
      `Interior of a modern tiny house living area exactly matching the references: petrol/teal-green and white walls, birch plywood, a warm wood slatted accent wall with hidden LED strips, grey vinyl floor, a black steel ladder up to a sleeping loft, two retro orange armchairs and a small wooden table, a huge floor-to-ceiling window looking out to green forest and the quarry. Bright natural daylight, warm and airy, lived-in but tidy. ${STYLE}`,
  },
  {
    id: "interier-kuchyne",
    size: "1536x1024",
    refs: ["interior/kitchen-counter-slats.png", "interior/teal-ladder-kitchen-shower.png"],
    prompt:
      `Interior detail of a compact tiny-house kitchenette matching the references: birch plywood cabinets, a concrete-look grey worktop with a small stainless steel sink and tap, upper plywood cupboards, a warm wood slatted wall with LED strips beside the black steel loft ladder, small window. Soft natural light, clean Scandinavian-minimal feel. ${STYLE}`,
  },
  {
    id: "interier-patro",
    size: "1536x1024",
    refs: ["interior/loft-view-orange-chairs.png", "interior/teal-ladder-kitchen-shower.png"],
    prompt:
      `Cosy sleeping loft inside a tiny house: a low double bed with linen and a wool throw tucked under the flat ceiling, birch plywood and petrol-green tones, a high window letting in soft morning light, the top of a black steel ladder visible, view down into the living space. Warm, intimate, calm. ${STYLE}`,
  },
  {
    id: "interier-koupelna",
    size: "1024x1536",
    refs: ["interior/teal-ladder-kitchen-shower.png"],
    prompt:
      `A small clean modern tiny-house bathroom matching the reference: a glass-screen walk-in shower with a slim chrome rain fixture, a wall-hung white toilet, pale green/grey floor, white walls, a small window. Bright, fresh, hotel-clean, minimal. ${STYLE}`,
  },
  {
    id: "zima-snih",
    size: "1536x1024",
    refs: ["night/cubes-night-glow.png", "houses/cubes-day-pallets.png", "location/lom-summer-pano.png"],
    prompt:
      `Two black cube tiny houses in fresh winter snow on the bank of ${QUARRY} with the water partly frozen and faint steam rising. Warm amber light glows from the windows in the cold blue dusk, snow on the flat roofs and deck, bare birches. ${HOUSE} Quiet, magical, winter-getaway mood. ${STYLE}`,
  },
  {
    id: "koupani-lom",
    size: "1536x1024",
    refs: ["location/lom-summer-pano.png", "location/lom-shore-cloudy.jpeg"],
    prompt:
      `A simple wooden swimming pier reaching into the crystal-clear turquoise-green water of ${QUARRY} on a bright summer day, slate rock walls and green banks, inviting clean water you can see into. Empty pier, no faces. Fresh, clean, "Czech Croatia" swimming-hole feeling. ${STYLE}`,
  },
  {
    id: "sauna-sud",
    size: "1536x1024",
    refs: ["night/cubes-night-glow.png", "location/lom-shore-cloudy.jpeg"],
    prompt:
      `A small black timber sauna cabin and a round wooden hot tub (Nordic koupací sud) on a wooden deck by ${QUARRY} at dusk, gentle steam rising from the tub, warm amber light, the same black design language as the cube houses, forest behind. Premium wellness-in-nature mood. ${STYLE}`,
  },
  {
    id: "ohniste-vecer",
    size: "1536x1024",
    refs: ["night/cubes-night-glow.png"],
    prompt:
      `An evening fire pit with live flames and rising sparks on a wooden deck, two simple chairs beside it, a black cube tiny house glowing warm amber through its big window in the background, dark forest, deep-blue twilight sky. ${HOUSE} Intimate, warm, end-of-day calm. ${STYLE}`,
  },
];

/* ---- Volání API ---- */

async function generate(shot) {
  const form = new FormData();
  form.append("model", "gpt-image-2");
  form.append("prompt", shot.prompt);
  form.append("size", shot.size);
  form.append("quality", "high");
  form.append("output_format", "jpeg");
  form.append("output_compression", "90");
  form.append("n", "1");
  for (const ref of shot.refs) {
    const buf = await readFile(REF(ref));
    const ext = path.extname(ref).slice(1).replace("jpeg", "jpg");
    const type = ext === "png" ? "image/png" : "image/jpeg";
    form.append("image[]", new Blob([buf], { type }), path.basename(ref));
  }

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: form,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  const json = JSON.parse(text);
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error("Bez obrazových dat: " + text.slice(0, 300));
  const outPath = path.join(OUT_DIR, `${shot.id}.jpg`);
  await writeFile(outPath, Buffer.from(b64, "base64"));
  const usage = json?.usage ? ` (tokens: ${json.usage.total_tokens ?? "?"})` : "";
  return { outPath, usage };
}

async function withRetry(shot, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await generate(shot);
    } catch (err) {
      const msg = String(err.message || err);
      const retryable = /HTTP (429|5\d\d)|ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(msg);
      console.warn(`  ! ${shot.id} pokus ${attempt}/${tries} selhal: ${msg.slice(0, 160)}`);
      if (attempt === tries || !retryable) throw err;
      await new Promise((r) => setTimeout(r, 4000 * attempt));
    }
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const ids = args.filter((a) => a !== "--force");
  let shots = SHOTS;
  if (ids.length) shots = SHOTS.filter((s) => ids.includes(s.id));
  if (!force) shots = shots.filter((s) => !existsSync(path.join(OUT_DIR, `${s.id}.jpg`)));

  if (!shots.length) {
    console.log("Nic ke generování (vše existuje; použij --force pro přegenerování).");
    return;
  }
  console.log(`Generuji ${shots.length} fotek přes gpt-image-2 (high)…\n`);

  // Mírná souběžnost, ať to není věčnost a zároveň nenarazíme na rate limit.
  const CONC = 2;
  const queue = [...shots];
  const results = [];
  async function worker() {
    while (queue.length) {
      const shot = queue.shift();
      const t0 = Date.now();
      try {
        const { outPath, usage } = await withRetry(shot);
        const secs = ((Date.now() - t0) / 1000).toFixed(0);
        console.log(`  ✓ ${shot.id} → ${path.basename(outPath)} (${secs}s)${usage}`);
        results.push({ id: shot.id, ok: true });
      } catch (err) {
        console.error(`  ✗ ${shot.id} SELHALO: ${String(err.message || err).slice(0, 200)}`);
        results.push({ id: shot.id, ok: false });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, shots.length) }, worker));

  const ok = results.filter((r) => r.ok).length;
  console.log(`\nHotovo: ${ok}/${results.length} úspěšně.`);
  const failed = results.filter((r) => !r.ok).map((r) => r.id);
  if (failed.length) console.log(`Neúspěšné (zkus znovu): ${failed.join(" ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
