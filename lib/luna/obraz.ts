import "server-only";

import { createHash } from "node:crypto";
import sharp, { type Metadata } from "sharp";

/**
 * Obrazová část Luny 5.6 — příprava fotek a porovnání „před a po".
 *
 * Tahle vrstva je **povinná brána** před voláním modelu. Má dva důvody:
 *
 *  1. **Cena.** Do modelu jde typicky tři až pět zón z dvanácti místo všech.
 *  2. **A hlavně přesnost.** Model, který dostane celý čistý interiér a otázku
 *     „je něco poškozené?", si občas něco vymyslí. Model, který dostane
 *     konkrétní podezřelý výřez, odpovídá stabilně.
 *
 * Co tahle implementace **umí**: srovnat expozici, spočítat lokální podobnost
 * po blocích a najít souvislé oblasti, kde se snímky liší.
 *
 * Co **neumí**: srovnat perspektivu (homografie). Když host fotí z jiného úhlu,
 * pozná se to podle nízké celkové podobnosti a zóna dostane `zarovnani: "poor"` —
 * taková zóna nikdy neeskaluje, jen se od hosta vyžádá jeden doplňující snímek.
 * Je to schválně: raději přiznaná nejistota než domnělé poškození.
 */

/** Delší hrana fotky, kterou posíláme modelu. Víc pixelů přesnost nezlepší. */
const HRANA_PRO_MODEL = 1092;
/** Rozlišení, ve kterém se počítá podobnost. Menší = rychlejší a méně šumu. */
const HRANA_POROVNANI = 512;
/** Velikost bloku pro lokální podobnost. */
const BLOK = 16;
/** Pod touhle podobností je blok podezřelý. */
const PRAH_BLOKU = 0.72;
/** Menší souvislá oblast než tohle je šum, ne nález. */
const MIN_PODIL_PLOCHY = 0.004;
/**
 * Malá, ale tvrdá změna projde i pod plošným prahem.
 *
 * Propálená díra od cigarety, oštípnutý roh, prasklina — všechno jsou drobné
 * plochy s prudkým přechodem. Kdyby rozhodovala jen velikost, spadly by mezi
 * šum, ačkoliv jsou dražší než leccos velkého. Rozlišuje je hloubka propadu
 * podobnosti: šum se drží těsně pod prahem, skutečná změna spadne hluboko.
 */
const MIN_PODIL_TVRDE = 0.0012;
const PRAH_TVRDE = 0.42;

export type PripravenaFotka = {
  /** JPEG bez metadat, delší hrana 1092 px. */
  data: Buffer;
  sirka: number;
  vyska: number;
  /** Percepční otisk — slouží k výběru nejbližšího baseline snímku. */
  dhash: bigint;
  /** Průměrný jas 0–255. Podle něj se vybírá baseline se stejným světlem. */
  jas: number;
  sha256: string;
  /** Kdy byla fotka pořízena, než jsme metadata smazali. */
  porizeno: Date | null;
};

/**
 * Připraví fotku od hosta.
 *
 * Metadata se **smažou úplně**, včetně GPS. Fotka z interiéru pronajatého
 * domku se souřadnicemi je zbytečné riziko — a host o tom neví.
 */
export async function pripravFotku(vstup: Buffer): Promise<PripravenaFotka> {
  const puvodni = sharp(vstup, { failOn: "none" });
  const meta = await puvodni.metadata();

  const porizeno = precistDatum(meta);

  const data = await sharp(vstup, { failOn: "none" })
    .rotate() // podle EXIF orientace, ještě než metadata zahodíme
    .resize({
      width: HRANA_PRO_MODEL,
      height: HRANA_PRO_MODEL,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  const rozmer = await sharp(data).metadata();

  return {
    data,
    sirka: rozmer.width ?? 0,
    vyska: rozmer.height ?? 0,
    dhash: await dhash(data),
    jas: await prumernyJas(data),
    sha256: createHash("sha256").update(data).digest("hex"),
    porizeno,
  };
}

function precistDatum(meta: Metadata): Date | null {
  const exif = meta.exif;
  if (!exif) return null;
  // Hrubé, ale stačí: hledáme v EXIF blobu tvar RRRR:MM:DD HH:MM:SS.
  const text = exif.toString("latin1");
  const m = text.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Percepční otisk (dHash).
 *
 * Zmenší se na 9×8 v šedé a porovnají se sousední pixely — bit říká, jestli
 * je vlevo světleji než vpravo. Odolné vůči změně jasu i kompresi, citlivé
 * na změnu obsahu. Slouží k vybrání baseline snímku ze stejného úhlu.
 */
export async function dhash(vstup: Buffer): Promise<bigint> {
  const { data } = await sharp(vstup)
    .greyscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let otisk = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const vlevo = data[y * 9 + x];
      const vpravo = data[y * 9 + x + 1];
      otisk = (otisk << 1n) | (vlevo > vpravo ? 1n : 0n);
    }
  }
  return otisk;
}

/**
 * Otisk jako znaménkové 64bitové číslo.
 *
 * Postgresový `bigint` je znaménkový, takže hodnoty nad 2^63−1 by ho
 * přetekly. Bitový vzor zůstává stejný, jen se přečte jako záporné číslo —
 * a protože se porovnává přes XOR, na výpočet vzdálenosti to nemá vliv.
 */
export function otiskProDb(otisk: bigint): bigint {
  return BigInt.asIntN(64, otisk);
}

/** Kolik bitů se liší. 0 = stejný záběr, nad ~14 už jiný pohled. */
export function vzdalenostOtisku(a: bigint, b: bigint): number {
  let x = a ^ b;
  let n = 0;
  while (x) {
    n += Number(x & 1n);
    x >>= 1n;
  }
  return n;
}

async function prumernyJas(vstup: Buffer): Promise<number> {
  const { channels } = await sharp(vstup).greyscale().stats();
  return channels[0]?.mean ?? 0;
}

/* ===== Porovnání před a po ===== */

export type Oblast = { x: number; y: number; w: number; h: number };

export type Porovnani = {
  /** Celková podobnost 0–1. Pod 0,5 je to nejspíš jiný záběr, ne poškození. */
  podobnost: number;
  /** Jak dobře na sebe snímky sedí. */
  zarovnani: "good" | "fair" | "poor";
  /** Podezřelé oblasti v procentech rozměru fotky (0–1), max čtyři. */
  oblasti: Oblast[];
  /** Rozdíl průměrného jasu — velký rozdíl znamená jiné světlo, ne škodu. */
  rozdilJasu: number;
  vzdalenostOtisku: number;
};

type Sedy = { pixely: Float64Array; sirka: number; vyska: number };

async function naSedou(vstup: Buffer, sirka: number, vyska: number): Promise<Sedy> {
  const { data } = await sharp(vstup)
    .greyscale()
    .resize(sirka, vyska, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { pixely: Float64Array.from(data), sirka, vyska };
}

/**
 * Srovnání expozice.
 *
 * Bez tohohle kroku je „ráno versus večer" největší zdroj falešných nálezů.
 * Obě fotky se převedou na stejný průměr a rozptyl jasu, takže rozdíl
 * ve světle zmizí a zůstane rozdíl v obsahu.
 */
function srovnejExpozici(a: Float64Array, b: Float64Array): void {
  const stat = (p: Float64Array) => {
    let s = 0;
    for (const v of p) s += v;
    const prumer = s / p.length;
    let d = 0;
    for (const v of p) d += (v - prumer) ** 2;
    return { prumer, odchylka: Math.sqrt(d / p.length) || 1 };
  };
  const sa = stat(a);
  const sb = stat(b);
  const pomer = sb.odchylka / sa.odchylka;
  for (let i = 0; i < a.length; i++) {
    a[i] = Math.max(0, Math.min(255, (a[i] - sa.prumer) * pomer + sb.prumer));
  }
}

/** Lokální podobnost jednoho bloku (SSIM). */
function ssimBloku(
  a: Float64Array,
  b: Float64Array,
  sirka: number,
  x0: number,
  y0: number,
  velikost: number,
): number {
  const C1 = (0.01 * 255) ** 2;
  const C2 = (0.03 * 255) ** 2;
  let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0, n = 0;
  for (let y = y0; y < y0 + velikost; y++) {
    for (let x = x0; x < x0 + velikost; x++) {
      const va = a[y * sirka + x];
      const vb = b[y * sirka + x];
      sa += va; sb += vb; saa += va * va; sbb += vb * vb; sab += va * vb; n++;
    }
  }
  const ma = sa / n;
  const mb = sb / n;
  const va = saa / n - ma * ma;
  const vb = sbb / n - mb * mb;
  const cov = sab / n - ma * mb;
  return ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
}

/**
 * Porovná baseline snímek s fotkou od hosta.
 *
 * Vrací podezřelé oblasti, ne verdikt. Rozhodnutí, jestli jde o poškození,
 * dělá až model — a i ten jen navrhuje.
 */
export async function porovnej(pred: Buffer, po: Buffer): Promise<Porovnani> {
  const metaPo = await sharp(po).metadata();
  const pomer = (metaPo.height ?? 1) / (metaPo.width ?? 1);
  const sirka = HRANA_POROVNANI;
  const vyska = Math.max(BLOK * 2, Math.round(HRANA_POROVNANI * pomer));

  const [a, b] = await Promise.all([naSedou(pred, sirka, vyska), naSedou(po, sirka, vyska)]);
  const jasPred = a.pixely.reduce((s, v) => s + v, 0) / a.pixely.length;
  const jasPo = b.pixely.reduce((s, v) => s + v, 0) / b.pixely.length;

  srovnejExpozici(a.pixely, b.pixely);

  const blokuX = Math.floor(sirka / BLOK);
  const blokuY = Math.floor(vyska / BLOK);
  const mapa = new Float64Array(blokuX * blokuY);
  let soucet = 0;

  for (let by = 0; by < blokuY; by++) {
    for (let bx = 0; bx < blokuX; bx++) {
      const s = ssimBloku(a.pixely, b.pixely, sirka, bx * BLOK, by * BLOK, BLOK);
      mapa[by * blokuX + bx] = s;
      soucet += s;
    }
  }
  const podobnost = soucet / mapa.length;

  const oblasti = slucOblasti(mapa, blokuX, blokuY).filter((o) => {
    const podil = (o.w * o.h) / (blokuX * blokuY);
    if (podil >= MIN_PODIL_PLOCHY) return true;
    return podil >= MIN_PODIL_TVRDE && o.dno <= PRAH_TVRDE;
  });

  const otisky = vzdalenostOtisku(await dhash(pred), await dhash(po));
  const zarovnani: Porovnani["zarovnani"] =
    podobnost >= 0.75 && otisky <= 12 ? "good" : podobnost >= 0.55 && otisky <= 20 ? "fair" : "poor";

  return {
    podobnost,
    zarovnani,
    rozdilJasu: Math.round(jasPo - jasPred),
    vzdalenostOtisku: otisky,
    oblasti: oblasti
      .sort((x, y) => y.w * y.h - x.w * x.h)
      .slice(0, 4)
      .map((o) => ({
        x: (o.x * BLOK) / sirka,
        y: (o.y * BLOK) / vyska,
        w: (o.w * BLOK) / sirka,
        h: (o.h * BLOK) / vyska,
      })),
  };
}

/** Sousedící podezřelé bloky spojí do obdélníků. */
/** `dno` je nejnižší podobnost v oblasti — jak tvrdý ten přechod je. */
function slucOblasti(
  mapa: Float64Array,
  sirka: number,
  vyska: number,
): { x: number; y: number; w: number; h: number; dno: number }[] {
  const videno = new Uint8Array(mapa.length);
  const out: { x: number; y: number; w: number; h: number; dno: number }[] = [];

  for (let y = 0; y < vyska; y++) {
    for (let x = 0; x < sirka; x++) {
      const i = y * sirka + x;
      if (videno[i] || mapa[i] >= PRAH_BLOKU) continue;
      let minX = x, maxX = x, minY = y, maxY = y, dno = mapa[i];
      const fronta = [i];
      videno[i] = 1;
      while (fronta.length) {
        const j = fronta.pop()!;
        const jx = j % sirka;
        const jy = Math.floor(j / sirka);
        minX = Math.min(minX, jx); maxX = Math.max(maxX, jx);
        minY = Math.min(minY, jy); maxY = Math.max(maxY, jy);
        dno = Math.min(dno, mapa[j]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = jx + dx;
          const ny = jy + dy;
          if (nx < 0 || ny < 0 || nx >= sirka || ny >= vyska) continue;
          const k = ny * sirka + nx;
          if (videno[k] || mapa[k] >= PRAH_BLOKU) continue;
          videno[k] = 1;
          fronta.push(k);
        }
      }
      out.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, dno });
    }
  }
  return out;
}

/** Výřez podezřelé oblasti s okrajem — to, co se posílá modelu. */
export async function vyrez(fotka: Buffer, o: Oblast, okraj = 0.12): Promise<Buffer> {
  const meta = await sharp(fotka).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  const left = Math.max(0, Math.round((o.x - okraj) * W));
  const top = Math.max(0, Math.round((o.y - okraj) * H));
  const width = Math.min(W - left, Math.round((o.w + okraj * 2) * W));
  const height = Math.min(H - top, Math.round((o.h + okraj * 2) * H));
  return sharp(fotka)
    .extract({ left, top, width: Math.max(32, width), height: Math.max(32, height) })
    .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
}
