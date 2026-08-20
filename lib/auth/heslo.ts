import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  heslo: string | Buffer,
  sul: string | Buffer,
  delka: number,
  opts: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Hashování hesla přes scrypt.
 *
 * Argon2id by byl o kousek lepší, ale znamená nativní závislost, která se láme
 * při každé změně verze Node. scrypt je vestavěný v `node:crypto`, je to
 * uznávaná paměťově náročná funkce a pro jeden admin účet je rozdíl teoretický.
 *
 * Parametry: N=2^15 (~32 MB paměti), tj. řádově 100 ms na přihlášení.
 */
const N = 2 ** 15;
const R = 8;
const P = 1;
const DELKA = 64;
const MAXMEM = 64 * 1024 * 1024;

export async function zahashuj(heslo: string): Promise<string> {
  const sul = randomBytes(16);
  const klic = await scrypt(heslo.normalize("NFKC"), sul, DELKA, { N, r: R, p: P, maxmem: MAXMEM });
  return ["scrypt", N, R, P, sul.toString("base64"), klic.toString("base64")].join("$");
}

export async function overHeslo(heslo: string, ulozene: string | null): Promise<boolean> {
  if (!ulozene) return false;
  const [alg, n, r, p, sulB64, klicB64] = ulozene.split("$");
  if (alg !== "scrypt") return false;
  try {
    const ocekavany = Buffer.from(klicB64, "base64");
    const klic = await scrypt(heslo.normalize("NFKC"), Buffer.from(sulB64, "base64"), ocekavany.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: MAXMEM,
    });
    return timingSafeEqual(klic, ocekavany);
  } catch {
    return false;
  }
}

/** Kontrola síly hesla — jedno slabé heslo tu otevírá celou agendu. */
export function slabeHeslo(heslo: string): string | null {
  if (heslo.length < 12) return "Heslo musí mít aspoň 12 znaků.";
  if (!/[a-zá-ž]/.test(heslo) || !/[A-ZÁ-Ž]/.test(heslo)) {
    return "Heslo musí obsahovat malé i velké písmeno.";
  }
  if (!/\d/.test(heslo)) return "Heslo musí obsahovat číslici.";
  return null;
}
