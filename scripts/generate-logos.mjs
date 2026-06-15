/**
 * 3 koncepty loga pro „Sedmý les" přes OpenAI gpt-image-2 (generations, high).
 * Ukládá do ~/Downloads. Tři ZÁMĚRNĚ odlišné směry, ze kterých se dá odpíchnout.
 *
 *   export OPENAI_API_KEY=...   (z reklamiq/.env)
 *   node scripts/generate-logos.mjs
 */

import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error("Chybí OPENAI_API_KEY.");
  process.exit(1);
}
const OUT = path.join(homedir(), "Downloads");

/* Společné mantinely značky — drží to jako skutečné brand identity, ne klipart. */
const BRAND = `Brand: "SEDMÝ LES" — a premium Czech tiny-house retreat by a flooded slate quarry on the edge of the Bohemian Paradise; calm, dark, Scandinavian-noir, gently fairy-tale ("za sedmero horami a sedmero lesy"). Palette EXACTLY: deep forest-black ink #0c110f, warm amber ember #d9914e, off-white linen #f3efe5, muted sage green #9db3a2.`;

const RULES = `Professional brand-identity LOGO designed by a top studio. FLAT VECTOR style — clean geometric shapes, crisp sharp edges, perfectly centered, generous balanced negative space. The wordmark text reads exactly "SEDMÝ LES" (Czech spelling, keep the acute accent on the Y: Ý), set in an elegant high-contrast serif, correctly spelled, well-kerned, letters clean and legible. ONE cohesive logo lockup: the symbol above, the wordmark below. NOT photorealistic, NOT 3D, NO bevel/gradient/shadow, NOT clipart, no mockup, no busy detail, no extra words besides those specified. Pristine, timeless, expensive-looking.`;

const LOGOS = [
  {
    file: "sedmyles-logo-1-sedm.png",
    prompt:
      `${BRAND}\n\nCONCEPT 1 — "SEDM" (seven strokes / minimalist forest). ${RULES}\n` +
      `Symbol: seven slim vertical strokes standing in a row like a stylised minimalist forest of bare tree trunks, of subtly varying heights, evenly spaced. SIX strokes in deep forest-black ink, and the SEVENTH (the tallest, at the right end) in warm amber ember — one glowing tree among the dark. Optionally rest them on a single fine horizontal baseline. Refined, modern, instantly recognisable, works as a tiny app icon. ` +
      `Background: clean off-white linen #f3efe5. Wordmark "SEDMÝ LES" centered below in an elegant dark serif, with a tiny spaced-caps line "JÍLOVÉ U DRŽKOVA" beneath it.`,
  },
  {
    file: "sedmyles-logo-2-lom.png",
    prompt:
      `${BRAND}\n\nCONCEPT 2 — "LOM" (forest mirrored on the quarry water). ${RULES}\n` +
      `Symbol: a calm, perfectly symmetrical emblem of a small row of pointed spruce/pine silhouettes meeting their EXACT mirror reflection across a thin horizontal water line — the upper half is the forest, the lower half its softer reflection, together forming a balanced lens/oval shape. A single small amber ember dot (a lit cabin window) floats just above the line, with its tiny reflection below. Two-tone: linen + sage shapes with the one ember accent. Quiet, geometric, memorable. ` +
      `Background: deep forest-black ink #0c110f. Wordmark "SEDMÝ LES" centered below in an elegant linen serif.`,
  },
  {
    file: "sedmyles-logo-3-pohadka.png",
    prompt:
      `${BRAND}\n\nCONCEPT 3 — "POHÁDKA" (fairy-tale line-art roundel). ${RULES}\n` +
      `Symbol: a circular badge in FINE single-weight monoline art with a delicate engraving / woodcut feel — inside a thin circle, seven layered mountain-and-forest ridges recede into the distance, a small amber ember crescent moon rests in the sky, and a single tiny black cabin silhouette sits at the base among the trees. Elegant, romantic, distinctive, like a stamp from a storybook. Ink linework on the badge with exactly one ember accent (the moon). ` +
      `Background: muted warm sage-linen. Wordmark "SEDMÝ LES" centered below in an elegant serif, with a small spaced-caps tagline "ZA SEDMERO HORAMI" underneath.`,
  },
];

async function gen(logo) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-2",
      prompt: logo.prompt,
      size: "1024x1024",
      quality: "high",
      n: 1,
      output_format: "png",
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
  const b64 = JSON.parse(text)?.data?.[0]?.b64_json;
  if (!b64) throw new Error("Bez dat: " + text.slice(0, 300));
  const outPath = path.join(OUT, logo.file);
  await writeFile(outPath, Buffer.from(b64, "base64"));
  return outPath;
}

console.log("Generuji 3 koncepty loga přes gpt-image-2 (high)…\n");
for (const logo of LOGOS) {
  const t0 = Date.now();
  try {
    const p = await gen(logo);
    console.log(`  ✓ ${logo.file} → ${p} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  } catch (e) {
    console.error(`  ✗ ${logo.file}: ${String(e.message || e).slice(0, 200)}`);
  }
}
console.log("\nHotovo — koukni do ~/Downloads.");
