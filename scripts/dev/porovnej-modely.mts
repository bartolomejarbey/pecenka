/**
 * Porovnání obrazových modelů na TOMTÉŽ promptu.
 * Zajímá nás jediné: jak věrně udrží referenční fotku.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
const { porovnej, pripravFotku } = await import("../../lib/luna/obraz.ts");

const KOREN = path.resolve(import.meta.dirname, "../..");
const OUT = process.argv[2] ?? "/tmp/modely";
fs.mkdirSync(OUT, { recursive: true });
const KLIC = process.env.OPENAI_API_KEY!;

const PROMPT =
  "Add a large dark brown coffee stain soaked deep into the orange fabric of the nearest armchair seat, about 25 cm across, irregular edges, clearly wet-stained. Change nothing else.";

const zaklad = await sharp(fs.readFileSync(path.join(KOREN, "public/foto/interier-obyvak.jpg")))
  .rotate().resize(1024, 1024, { fit: "cover" }).png().toBuffer();
fs.writeFileSync(path.join(OUT, "zaklad.jpg"), await sharp(zaklad).jpeg({ quality: 88 }).toBuffer());
const predP = (await pripravFotku(zaklad)).data;

type Varianta = { jmeno: string; model: string; extra?: Record<string, string> };
const VARIANTY: Varianta[] = [
  { jmeno: "gpt-image-2", model: "gpt-image-2" },
  { jmeno: "gpt-image-2-hq", model: "gpt-image-2", extra: { quality: "high" } },
  { jmeno: "gpt-image-1.5", model: "gpt-image-1.5", extra: { input_fidelity: "high" } },
  { jmeno: "gpt-image-1", model: "gpt-image-1", extra: { input_fidelity: "high" } },
];

for (const v of VARIANTY) {
  const form = new FormData();
  form.append("model", v.model);
  form.append("prompt", PROMPT);
  form.append("size", "1024x1024");
  for (const [k, val] of Object.entries(v.extra ?? {})) form.append(k, val);
  form.append("image", new Blob([new Uint8Array(zaklad)], { type: "image/png" }), "z.png");

  const t = Date.now();
  try {
    const o = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST", headers: { Authorization: `Bearer ${KLIC}` }, body: form,
      signal: AbortSignal.timeout(300_000),
    });
    if (!o.ok) { console.log(`  ✗ ${v.jmeno.padEnd(16)} ${o.status} ${(await o.text()).slice(0, 120)}`); continue; }
    const d = (await o.json()) as { data: { b64_json: string }[] };
    const buf = Buffer.from(d.data[0].b64_json, "base64");
    fs.writeFileSync(path.join(OUT, `${v.jmeno}.jpg`), await sharp(buf).jpeg({ quality: 88 }).toBuffer());

    const poP = (await pripravFotku(buf)).data;
    const s = await porovnej(predP, poP);
    console.log(
      `  ✓ ${v.jmeno.padEnd(16)} ${String(((Date.now() - t) / 1000).toFixed(0)).padStart(3)} s · ` +
      `věrnost ${(s.podobnost * 100).toFixed(1)} % · zarovnání ${s.zarovnani.padEnd(4)} · míst ${s.oblasti.length}`,
    );
  } catch (e) {
    console.log(`  ✗ ${v.jmeno.padEnd(16)} ${(e as Error).message.slice(0, 90)}`);
  }
}
console.log(`\nuloženo do ${OUT}`);
process.exit(0);
