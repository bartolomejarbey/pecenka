/**
 * Změří ukázkové obrázky a uloží jejich rozměry.
 *
 * Stránky s ukázkami mají u `next/image` natvrdo `width`/`height`, jenže
 * zdroje mají různé poměry stran — obrázky se deformovaly a rezervovaná výška
 * neseděla, takže se rozvržení po načtení posunulo. Rozměry se změří jednou
 * tady a stránky si je přečtou.
 *
 *   node scripts/dev/rozmery-ukazek.mjs
 */
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const KOREN = path.resolve(import.meta.dirname, "../..");
const SLOZKY = ["ukazka", "test-ai"];

const out = {};
for (const s of SLOZKY) {
  const dir = path.join(KOREN, "public", s);
  for (const f of await readdir(dir).catch(() => [])) {
    if (!/\.(jpe?g|png|webp)$/i.test(f)) continue;
    const m = await sharp(path.join(dir, f)).metadata();
    out[`/${s}/${f}`] = { w: m.width ?? 0, v: m.height ?? 0 };
  }
}

await writeFile(
  path.join(KOREN, "lib/ukazka/rozmery.json"),
  JSON.stringify(out, null, 1) + "\n",
);
console.log(`rozměry: ${Object.keys(out).length} obrázků`);
