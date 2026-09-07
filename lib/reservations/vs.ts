import { createHmac } from "node:crypto";

/**
 * Variabilní symbol a veřejný kód rezervace.
 *
 * VS má **10 číslic: `RRMM` + `NNNNN` + `C`**
 *   · `RRMM` — rok a měsíc PŘÍJEZDU, ne založení. Majitel z výpisu pozná termín,
 *     aniž by musel otevřít systém.
 *   · `NNNNN` — pořadí rezervace v roce, z čítače v `invoice_series`.
 *   · `C` — kontrolní číslice mod 11, odchytí překlep při ručním zadávání platby.
 *
 * Deset číslic je strop standardu SPAYD pro `X-VS`, takže se to vejde do QR platby.
 * VS se **nikdy nerecykluje** — ani po stornu, ani po expiraci.
 */

/** Váhy pro kontrolní číslici — stejné jako u tuzemských čísel účtů. */
const VAHY = [6, 3, 7, 9, 10, 5, 8, 4, 2] as const;

/**
 * Kontrolní číslice mod 11 z devíti číslic.
 *
 * Zbytek 10 by nebyl číslice; mapujeme ho na 0. Tím se detekce mírně oslabí
 * (jedna z jedenácti chyb projde), ale VS zůstane desetimístný, což SPAYD
 * vyžaduje. Alternativa — přeskakovat pořadová čísla, která vedou na 10 — by
 * dělala díry v číselné řadě, a ty se hůř vysvětlují účetní.
 */
export function kontrolniCislice(devetCislic: string): number {
  if (!/^\d{9}$/.test(devetCislic)) {
    throw new Error(`Kontrolní číslice se počítá z devíti číslic, dostal jsem „${devetCislic}".`);
  }
  const soucet = [...devetCislic].reduce((s, c, i) => s + Number(c) * VAHY[i], 0);
  const c = (11 - (soucet % 11)) % 11;
  return c === 10 ? 0 : c;
}

/** Poskládá VS z data příjezdu a pořadového čísla. */
export function sestavVs(prijezd: Date, poradi: number): string {
  if (poradi < 1 || poradi > 99999) {
    throw new Error(`Pořadí rezervace musí být 1–99999, dostal jsem ${poradi}.`);
  }
  const rr = String(prijezd.getFullYear() % 100).padStart(2, "0");
  const mm = String(prijezd.getMonth() + 1).padStart(2, "0");
  const nnnnn = String(poradi).padStart(5, "0");
  const zaklad = `${rr}${mm}${nnnnn}`;
  return zaklad + kontrolniCislice(zaklad);
}

/** Ověří, že VS má správný tvar i kontrolní číslici. */
export function overVs(vs: string): boolean {
  if (!/^\d{10}$/.test(vs)) return false;
  return kontrolniCislice(vs.slice(0, 9)) === Number(vs[9]);
}

/** Veřejný kód rezervace — to, co host vidí v e-mailu: `SL-26-0143`. */
export function sestavKod(rok: number, poradi: number): string {
  return `SL-${String(rok % 100).padStart(2, "0")}-${String(poradi).padStart(4, "0")}`;
}

/**
 * Heslo do hostovského portálu odvozené od VS.
 *
 * Majitel chtěl „hesla jako VS". Samotný VS je ale na e-mailu, na výpisu z účtu
 * i na faktuře — jako tajemství neobstojí. Kompromis: host se hlásí variabilním
 * symbolem **a** tímhle kódem, který z VS vzniká, ale nedá se z něj odvodit
 * bez znalosti tajného klíče. Zůstává krátký a diktovatelný do telefonu.
 *
 * Odvozuje ho **HMAC-SHA256**, ne vlastní míchačka. Původní verze stála na
 * FNV-1a s 32bitovým stavem a deterministické rotaci — komentář sliboval, že
 * se kód bez klíče spočítat nedá, ale skutečná entropie byla nanejvýš dvaatřicet
 * bitů a mezi znaky se stav degradoval. Krátké tajemství šlo offline uhodnout
 * hrubou silou. Délka i abeceda zůstávají, mění se jen to, co je uvnitř.
 */
export function portalovyKod(vs: string, tajemstvi: string, delka = 6): string {
  // Bez I, O, 0, 1 — v ruce psané a diktované se pletou.
  const ABECEDA = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const otisk = createHmac("sha256", tajemstvi).update(`portal:${vs}`).digest();
  let out = "";
  for (let i = 0; i < delka; i++) {
    // Pět bitů na znak — abeceda má přesně 32 položek, takže se nic nezkosí.
    out += ABECEDA[otisk[i % otisk.length] & 31];
  }
  return out;
}
