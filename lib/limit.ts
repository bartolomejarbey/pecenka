/**
 * Omezení počtu pokusů z jedné adresy.
 *
 * Počítadlo žije v paměti procesu. V nasazení běží víc instancí a každá si
 * počítá zvlášť, takže skutečný strop je násobkem instancí — proti nepozornému
 * opakování to stačí, proti odhodlanému robotovi ne. Skutečnou pojistkou je
 * vždycky databázové omezení, tohle je jen slušné chování.
 *
 * Odmítnutý pokus se do okna **nezapisuje**. Kdyby ano, kdo narazí na strop
 * a zkusí to znovu, tím okno posune a už se z něj nedostane — čekal by
 * donekonečna a nevěděl proč.
 */

const okna = new Map<string, number[]>();

/** Ať paměť neroste donekonečna, když se adresy střídají. */
const MAX_KLICU = 5000;

export type Limit = { pocet: number; oknoMs: number };

export function prekrocilLimit(klic: string, { pocet, oknoMs }: Limit): boolean {
  const ted = Date.now();
  const seznam = (okna.get(klic) ?? []).filter((t) => ted - t < oknoMs);

  if (seznam.length >= pocet) {
    okna.set(klic, seznam);
    return true;
  }

  if (okna.size > MAX_KLICU) uklid(ted, oknoMs);
  seznam.push(ted);
  okna.set(klic, seznam);
  return false;
}

function uklid(ted: number, oknoMs: number): void {
  for (const [k, v] of okna) {
    if (!v.some((t) => ted - t < oknoMs)) okna.delete(k);
  }
}

/** Adresa volajícího. Za proxy Vercelu je první položka `x-forwarded-for`. */
export function adresa(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "neznama";
}
