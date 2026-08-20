#!/usr/bin/env node
/**
 * Realistické poškození přes editaci s maskou.
 *
 * Obrazový model přepíše jen oblast vyznačenou v masce; mimo ni zůstane
 * fotka nedotčená. To je jediný způsob, jak vyrobit poctivou dvojici
 * „před a po" — bez toho se testuje jen to, jestli Luna pozná přemalování.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const KOREN = process.cwd();
const OUT = process.argv[2] || "/tmp/luna-mask";
fs.mkdirSync(OUT, { recursive: true });
const klic = process.env.OPENAI_API_KEY;

/** Maska: průhledná díra = místo k přepsání, zbytek neprůhledný. */
async function maska(W, H, oblasti) {
  const dira = oblasti
    .map((o) => `<ellipse cx="${o.x * W}" cy="${o.y * H}" rx="${o.r * W}" ry="${o.r * W * 0.8}" fill="#000"/>`)
    .join("");
  const svg = Buffer.from(
    `<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>${dira}</svg>`,
  );
  // Bílá → neprůhledné, černá → průhledné (tj. k přepsání).
  const alfa = await sharp(svg).greyscale().png().toBuffer();
  return sharp({ create: { width: W, height: H, channels: 3, background: { r: 0, g: 0, b: 0 } } })
    .composite([{ input: alfa, blend: "dest-in" }])
    .png()
    .toBuffer();
}

const ZADANI = [
  {
    jmeno: "skvrna-kreslo",
    oblasti: [{ x: 0.6, y: 0.62, r: 0.1 }],
    prompt:
      "A large dark coffee stain soaked deep into the orange fabric upholstery of the armchair. Irregular organic edges, darkest in the centre, fading outwards. The fabric weave is still visible through the stain. Photorealistic, matching the existing lighting and shadows exactly.",
  },
  {
    jmeno: "ryha-podlaha",
    oblasti: [{ x: 0.35, y: 0.85, r: 0.11 }],
    prompt:
      "A deep scratch gouged into the grey vinyl floor, roughly 30 cm long and slightly curved, with the pale beige sub-layer exposed inside the groove and a thin raised burr along one edge. Photorealistic, matching the existing floor texture, lighting and shadows exactly.",
  },
];

const zdroj = path.join(KOREN, "public/foto/interier-obyvak.jpg");
const zaklad = await sharp(fs.readFileSync(zdroj))
  .rotate()
  .resize(1024, 1024, { fit: "cover" })
  .png()
  .toBuffer();
fs.writeFileSync(path.join(OUT, "baseline.png"), zaklad);

for (const z of ZADANI) {
  const m = await maska(1024, 1024, z.oblasti);
  fs.writeFileSync(path.join(OUT, `${z.jmeno}-maska.png`), m);

  const form = new FormData();
  form.append("model", "gpt-image-2");
  form.append("prompt", z.prompt);
  form.append("size", "1024x1024");
  form.append("quality", "high");
  form.append("image", new Blob([zaklad], { type: "image/png" }), "zdroj.png");
  form.append("mask", new Blob([m], { type: "image/png" }), "maska.png");

  const t = Date.now();
  const o = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${klic}` },
    body: form,
  });
  if (!o.ok) { console.log(`  ✗ ${z.jmeno}: ${o.status} ${(await o.text()).slice(0, 250)}`); continue; }
  const d = await o.json();
  fs.writeFileSync(path.join(OUT, `${z.jmeno}.png`), Buffer.from(d.data[0].b64_json, "base64"));
  console.log(`  ✓ ${z.jmeno}  ${((Date.now() - t) / 1000).toFixed(0)} s`);
}
console.log("uloženo do", OUT);
