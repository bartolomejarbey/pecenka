import "server-only";

/**
 * Úložiště fotek z protokolu.
 *
 * Privátní bucket na Supabase Storage. Fotky interiéru pronajatého domku
 * nesmí mít trvalou veřejnou adresu — ke čtení se vždycky vydává podepsaný
 * odkaz s krátkou platností.
 */

const BUCKET = "protokol";

function zaklad(): { url: string; klic: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const klic = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !klic) throw new Error("Chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY.");
  return { url: `${url}/storage/v1`, klic };
}

const hlavicky = (klic: string) => ({ Authorization: `Bearer ${klic}`, apikey: klic });

export async function nahraj(cesta: string, data: Buffer, typ = "image/jpeg"): Promise<void> {
  const { url, klic } = zaklad();
  const o = await fetch(`${url}/object/${BUCKET}/${cesta}`, {
    method: "POST",
    headers: { ...hlavicky(klic), "Content-Type": typ, "x-upsert": "true" },
    body: new Uint8Array(data),
  });
  if (!o.ok) throw new Error(`Nahrání fotky selhalo: ${o.status} ${(await o.text()).slice(0, 200)}`);
}

export async function stahni(cesta: string): Promise<Buffer> {
  const { url, klic } = zaklad();
  const o = await fetch(`${url}/object/${BUCKET}/${cesta}`, { headers: hlavicky(klic) });
  if (!o.ok) throw new Error(`Fotku se nepodařilo načíst: ${o.status}`);
  return Buffer.from(await o.arrayBuffer());
}

/** Odkaz s omezenou platností. Výchozí hodina — na prohlédnutí bohatě stačí. */
export async function podepsanyOdkaz(cesta: string, sekund = 3600): Promise<string> {
  const { url, klic } = zaklad();
  const o = await fetch(`${url}/object/sign/${BUCKET}/${cesta}`, {
    method: "POST",
    headers: { ...hlavicky(klic), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: sekund }),
  });
  if (!o.ok) throw new Error(`Podepsaný odkaz selhal: ${o.status}`);
  const { signedURL } = (await o.json()) as { signedURL: string };
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1${signedURL}`;
}

export async function smaz(cesty: string[]): Promise<void> {
  if (!cesty.length) return;
  const { url, klic } = zaklad();
  await fetch(`${url}/object/${BUCKET}`, {
    method: "DELETE",
    headers: { ...hlavicky(klic), "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: cesty }),
  });
}

/** Kde fotka leží. Cesta nese rezervaci i zónu, ať jde dohledat i ručně. */
export const cestaFotky = (kodRezervace: string, zona: string, id: string) =>
  `${kodRezervace}/${zona}/${id}.jpg`;

export const cestaBaseline = (domek: string, verze: number, zona: string, varianta: string) =>
  `baseline/${domek}/v${verze}/${zona}-${varianta}.jpg`;
