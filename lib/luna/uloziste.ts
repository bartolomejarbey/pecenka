import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Úložiště fotek z protokolu.
 *
 * Dvě varianty, protože jedna nestačí:
 *
 *  · **Supabase Storage** — privátní bucket, tak to jede naostro. Fotky
 *    interiéru pronajatého domku nesmí mít trvalou veřejnou adresu, takže
 *    ke čtení se vždycky vydává podepsaný odkaz s krátkou platností.
 *
 *  · **Disk** — když Supabase nastavený není. Bez toho nešlo nahrát jedinou
 *    fotku na vývojářském stroji: `npm run dev` sice běží na PGlite bez
 *    jediné proměnné, ale příjem fotek spadl na chybějícím klíči. Celý
 *    foto-protokol tak šlo zkoušet jen proti produkci.
 *
 * Odkaz na diskovou fotku je podepsaný stejně jako ten ze Supabase a se
 * stejně krátkou platností — chování obou variant se nesmí lišit, jinak
 * je zkoušení nanic.
 *
 * Na Vercelu je souborový systém jen pro čtení, takže tam disková varianta
 * není. `stavUloziste()` to řekne nahlas v administraci, ať se na to nepřijde
 * až první fotkou od hosta.
 */

const BUCKET = "protokol";

/** Kam se ukládá při diskové variantě. */
const SLOZKA = process.env.PROTOKOL_DIR ?? path.join(process.cwd(), ".uloziste");

export type Varianta = "supabase" | "disk" | "zadne";

export function variantaUloziste(): Varianta {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return "supabase";
  }
  // Na Vercelu je zapisovatelné jen /tmp a to nepřežije nasazení. Kdo si
  // PROTOKOL_DIR nastaví sám, ví, co dělá.
  if (process.env.PROTOKOL_DIR) return "disk";
  if (process.env.VERCEL) return "zadne";
  return "disk";
}

export type StavUloziste = {
  varianta: Varianta;
  popis: string;
  vporadku: boolean;
};

/** Podklad pro přehled stavu systému v administraci. */
export function stavUloziste(): StavUloziste {
  switch (variantaUloziste()) {
    case "supabase":
      return { varianta: "supabase", vporadku: true, popis: `Supabase Storage, bucket „${BUCKET}"` };
    case "disk":
      return {
        varianta: "disk",
        vporadku: process.env.NODE_ENV !== "production",
        popis: `Místní disk (${SLOZKA})`,
      };
    default:
      return {
        varianta: "zadne",
        vporadku: false,
        popis: "Nenastaveno — fotky z protokolu se nemají kam ukládat",
      };
  }
}

function supabase(): { url: string; klic: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const klic = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return { url: `${url}/storage/v1`, klic };
}

const hlavicky = (klic: string) => ({ Authorization: `Bearer ${klic}`, apikey: klic });

/* ===== podpis diskových odkazů ===== */

const tajemstvi = () =>
  process.env.PORTAL_SECRET ?? process.env.PAYMENTS_SIGNING_KEY ?? "sedmyles-vyvoj";


function podepis(cesta: string, do_: number): string {
  return createHmac("sha256", tajemstvi()).update(`${cesta}|${do_}`).digest("hex").slice(0, 32);
}

/** Ověří podpis odkazu na fotku. Vrací důvod odmítnutí, nebo `null`. */
export function overOdkaz(cesta: string, do_: string | null, podpis_: string | null): string | null {
  if (!do_ || !podpis_) return "Odkaz nemá podpis.";
  const platnost = Number(do_);
  if (!Number.isFinite(platnost)) return "Odkaz nemá platnost.";
  if (platnost * 1000 < Date.now()) return "Odkaz vypršel.";
  const ocekavany = Buffer.from(podepis(cesta, platnost));
  const podany = Buffer.from(podpis_);
  if (ocekavany.length !== podany.length || !timingSafeEqual(ocekavany, podany)) {
    return "Podpis nesedí.";
  }
  return null;
}

/**
 * Cesta se skládá z kódu rezervace a klíče zóny, ale je to vstup — a vstup,
 * který se lepí na cestu k souboru, se musí hlídat. Bez tohohle by
 * `../../.env.local` byla platná „fotka".
 */
function bezpecnaCesta(cesta: string): string {
  const cily = path.resolve(SLOZKA, cesta);
  const koren = path.resolve(SLOZKA);
  if (cily !== koren && !cily.startsWith(koren + path.sep)) {
    throw new Error("Neplatná cesta k fotce.");
  }
  return cily;
}

/* ===== operace ===== */

export async function nahraj(cesta: string, data: Buffer, typ = "image/jpeg"): Promise<void> {
  if (variantaUloziste() === "supabase") {
    const { url, klic } = supabase();
    const o = await fetch(`${url}/object/${BUCKET}/${cesta}`, {
      method: "POST",
      headers: { ...hlavicky(klic), "Content-Type": typ, "x-upsert": "true" },
      body: new Uint8Array(data),
    });
    if (!o.ok) throw new Error(`Nahrání fotky selhalo: ${o.status} ${(await o.text()).slice(0, 200)}`);
    return;
  }
  if (variantaUloziste() === "zadne") {
    throw new Error(
      "Úložiště fotek není nastavené. Doplň NEXT_PUBLIC_SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  const cily = bezpecnaCesta(cesta);
  await mkdir(path.dirname(cily), { recursive: true });
  await writeFile(cily, data);
}

export async function stahni(cesta: string): Promise<Buffer> {
  if (variantaUloziste() === "supabase") {
    const { url, klic } = supabase();
    const o = await fetch(`${url}/object/${BUCKET}/${cesta}`, { headers: hlavicky(klic) });
    if (!o.ok) throw new Error(`Fotku se nepodařilo načíst: ${o.status}`);
    return Buffer.from(await o.arrayBuffer());
  }
  if (variantaUloziste() === "zadne") throw new Error("Úložiště fotek není nastavené.");
  return readFile(bezpecnaCesta(cesta));
}

/** Odkaz s omezenou platností. Výchozí hodina — na prohlédnutí bohatě stačí. */
export async function podepsanyOdkaz(cesta: string, sekund = 3600): Promise<string> {
  if (variantaUloziste() === "supabase") {
    const { url, klic } = supabase();
    const o = await fetch(`${url}/object/sign/${BUCKET}/${cesta}`, {
      method: "POST",
      headers: { ...hlavicky(klic), "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: sekund }),
    });
    if (!o.ok) throw new Error(`Podepsaný odkaz selhal: ${o.status}`);
    const { signedURL } = (await o.json()) as { signedURL: string };
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1${signedURL}`;
  }
  if (variantaUloziste() === "zadne") throw new Error("Úložiště fotek není nastavené.");
  const do_ = Math.floor(Date.now() / 1000) + sekund;
  const segmenty = cesta.split("/").map(encodeURIComponent).join("/");
  return `/api/uloziste/${segmenty}?do=${do_}&p=${podepis(cesta, do_)}`;
}

/**
 * Odkazy na víc fotek najednou.
 *
 * Protokol má dvanáct zón a u každé referenční i hostův snímek. Podepisovat
 * je po jednom znamenalo dvacet čtyři HTTP volání na Supabase, než se vůbec
 * odešle první bajt stránky — a to hostovi na mobilu v lese. Supabase umí
 * podepsat celou dávku jedním požadavkem.
 *
 * Vrací mapu cesta → odkaz. Co se nepodaří podepsat, v mapě prostě není;
 * stránka se kvůli jedné chybějící fotce nemá rozbít.
 */
export async function podepsaneOdkazy(
  cesty: string[],
  sekund = 3600,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const jedinecne = [...new Set(cesty.filter(Boolean))];
  if (!jedinecne.length) return out;

  if (variantaUloziste() !== "supabase") {
    for (const c of jedinecne) {
      await podepsanyOdkaz(c, sekund).then((u) => out.set(c, u)).catch(() => {});
    }
    return out;
  }

  const { url, klic } = supabase();
  try {
    const o = await fetch(`${url}/object/sign/${BUCKET}`, {
      method: "POST",
      headers: { ...hlavicky(klic), "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: sekund, paths: jedinecne }),
    });
    if (!o.ok) return out;
    const data = (await o.json()) as { path: string; signedURL: string | null; error?: string }[];
    for (const r of data) {
      if (r.signedURL) {
        out.set(r.path, `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1${r.signedURL}`);
      }
    }
  } catch (e) {
    console.error("[uloziste] dávkové podepsání selhalo:", e);
  }
  return out;
}

export async function smaz(cesty: string[]): Promise<void> {
  if (!cesty.length) return;
  if (variantaUloziste() === "supabase") {
    const { url, klic } = supabase();
    await fetch(`${url}/object/${BUCKET}`, {
      method: "DELETE",
      headers: { ...hlavicky(klic), "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: cesty }),
    });
    return;
  }
  if (variantaUloziste() === "zadne") return;
  await Promise.all(cesty.map((c) => rm(bezpecnaCesta(c), { force: true })));
}

/** Kde fotka leží. Cesta nese rezervaci i zónu, ať jde dohledat i ručně. */
export const cestaFotky = (kodRezervace: string, zona: string, id: string) =>
  `${kodRezervace}/${zona}/${id}.jpg`;

export const cestaBaseline = (domek: string, verze: number, zona: string, varianta: string) =>
  `baseline/${domek}/v${verze}/${zona}-${varianta}.jpg`;
