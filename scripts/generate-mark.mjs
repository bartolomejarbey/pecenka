/**
 * Z konceptu loga 3 (pohádka) vytáhne čistý ZNAK pro web:
 *  - znak-pohadka.png   = jen kruhový emblém, světlá linka + ember měsíc, PRŮHLEDNÉ pozadí
 *  - icon-pohadka.png   = emblém na tmavém zaobleném čtverci (favicon)
 *
 *   export OPENAI_API_KEY=...
 *   node scripts/generate-mark.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error("Chybí OPENAI_API_KEY.");
  process.exit(1);
}

const REF = path.join(homedir(), "Downloads", "sedmyles-logo-3-pohadka.png");
const OUT_DIR = path.join(import.meta.dirname, "..", "public");

const EMBLEM =
  "Use ONLY the circular line-art emblem from the reference logo: a thin circle containing layered mountain ridges receding into the distance, a forest of small spruce trees, a crescent moon in the sky, and a tiny cabin silhouette by the water at the base. REMOVE all text, the wordmark and the tagline completely. Keep the same delicate single-weight monoline engraving style. Center it, crisp and clean, with generous even margin, perfectly square.";

const SHOTS = [
  {
    file: "znak-pohadka.png",
    background: "transparent",
    prompt:
      `${EMBLEM} Redraw the linework in soft off-white linen (#f3efe5) so it reads on dark backgrounds, and keep the crescent MOON in warm amber ember (#d9914e). Fully TRANSPARENT background (no panel, no fill). Just the emblem.`,
  },
  {
    file: "icon-pohadka.png",
    background: "opaque",
    prompt:
      `${EMBLEM} Place the emblem centered on a solid deep forest-black (#0c110f) ROUNDED-SQUARE background, as a polished app icon / favicon. Linework in off-white linen (#f3efe5), the crescent moon in warm amber ember (#d9914e). Slightly bolder lines so it stays legible at small sizes. Fill the icon nicely with a small safe margin.`,
  },
];

async function gen(shot) {
  const form = new FormData();
  form.append("model", "gpt-image-2");
  form.append("prompt", shot.prompt);
  form.append("size", "1024x1024");
  form.append("quality", "high");
  form.append("background", shot.background);
  form.append("output_format", "png");
  form.append("n", "1");
  const buf = await readFile(REF);
  form.append("image[]", new Blob([buf], { type: "image/png" }), "ref.png");

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
  const b64 = JSON.parse(text)?.data?.[0]?.b64_json;
  if (!b64) throw new Error("Bez dat: " + text.slice(0, 300));
  const out = path.join(OUT_DIR, shot.file);
  await writeFile(out, Buffer.from(b64, "base64"));
  return out;
}

console.log("Generuji znak z loga 3 (pohádka)…\n");
for (const shot of SHOTS) {
  const t0 = Date.now();
  try {
    const p = await gen(shot);
    console.log(`  ✓ ${shot.file} → ${p} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  } catch (e) {
    console.error(`  ✗ ${shot.file}: ${String(e.message || e).slice(0, 220)}`);
  }
}
console.log("\nHotovo.");
