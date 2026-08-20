import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
const { porovnej, pripravFotku, vyrez } = await import("../../lib/luna/obraz.ts");

const KOREN = path.resolve(import.meta.dirname, "../..");
const OUT = process.argv[2] ?? "/tmp/luna-debug";
mkdirSync(OUT, { recursive: true });

const zdroj = readFileSync(path.join(KOREN, "public/foto/interier-obyvak.jpg"));
const baseline = (await pripravFotku(zdroj)).data;

async function skvrna(z: Buffer, x: number, y: number, r: number) {
  const m = await sharp(z).metadata();
  const W = m.width!, H = m.height!;
  const svg = Buffer.from(`<svg width="${W}" height="${H}"><ellipse cx="${x*W}" cy="${y*H}" rx="${r*W}" ry="${r*W*0.62}" fill="#3a1f12" opacity="0.9"/></svg>`);
  return sharp(z).composite([{ input: svg }]).jpeg({ quality: 88 }).toBuffer();
}

const po = await skvrna(baseline, 0.42, 0.58, 0.075);
const s = await porovnej(baseline, po);
console.log("oblasti:", JSON.stringify(s.oblasti.map(o => ({
  x: +o.x.toFixed(3), y: +o.y.toFixed(3), w: +o.w.toFixed(3), h: +o.h.toFixed(3),
  stred: [+(o.x+o.w/2).toFixed(3), +(o.y+o.h/2).toFixed(3)],
}))));
console.log("skvrna je na [0.42, 0.58]");

writeFileSync(path.join(OUT, "0-baseline.jpg"), baseline);
writeFileSync(path.join(OUT, "1-po.jpg"), po);
for (const [i, o] of s.oblasti.entries()) {
  writeFileSync(path.join(OUT, `2-vyrez${i}-ref.jpg`), await vyrez(baseline, o));
  writeFileSync(path.join(OUT, `3-vyrez${i}-po.jpg`), await vyrez(po, o));
}
console.log("uloženo do", OUT);
