#!/usr/bin/env node
/**
 * Realistické zkušební vzorky pro Lunu.
 *
 * Vezme skutečnou fotku interiéru a nechá obrazový model dokreslit poškození,
 * které vypadá jako fotografie, ne jako přemalovaný ovál. Bez toho se modul
 * netestuje poctivě — plochý tvar Luna správně odhalí jako artefakt.
 */
import fs from "node:fs";
import path from "node:path";

const KOREN = process.cwd();
const OUT = process.argv[2] || "/tmp/luna-vzorky";
fs.mkdirSync(OUT, { recursive: true });

const ZADANI = [
  ["kava-na-sedacce", "Photorealistic edit of this exact room, same camera angle, same lighting: a large spilled coffee stain soaked into the fabric upholstery of the armchair seat cushion. The stain has irregular edges, darker in the centre, with the fabric weave still visible through it. Everything else in the room is completely unchanged."],
  ["ryha-v-podlaze", "Photorealistic edit of this exact room, same camera angle, same lighting: a long deep scratch gouged into the vinyl floor in the foreground, about 40 cm long, with the pale sub-layer visible inside the groove and tiny curled shavings at one end. Everything else in the room is completely unchanged."],
  ["cisty", "Return this exact room completely unchanged. Same angle, same lighting, no edits whatsoever."],
];

const klic = process.env.OPENAI_API_KEY;
if (!klic) { console.error("Chybí OPENAI_API_KEY"); process.exit(1); }

const zdroj = path.join(KOREN, "public/foto/interier-obyvak.jpg");

for (const [jmeno, prompt] of ZADANI) {
  const form = new FormData();
  form.append("model", "gpt-image-2");
  form.append("prompt", prompt);
  form.append("size", "1024x1024");
  form.append("quality", "high");
  form.append("image", new Blob([fs.readFileSync(zdroj)], { type: "image/jpeg" }), "zdroj.jpg");

  const t = Date.now();
  const o = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${klic}` },
    body: form,
  });
  if (!o.ok) { console.log(`  ✗ ${jmeno}: ${o.status} ${(await o.text()).slice(0, 200)}`); continue; }
  const d = await o.json();
  const buf = Buffer.from(d.data[0].b64_json, "base64");
  fs.writeFileSync(path.join(OUT, `${jmeno}.png`), buf);
  console.log(`  ✓ ${jmeno}  ${((Date.now() - t) / 1000).toFixed(1)} s  ${(buf.length / 1024).toFixed(0)} kB`);
}
console.log("uloženo do", OUT);
