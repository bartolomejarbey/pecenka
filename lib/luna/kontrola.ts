/**
 * Kontrola rozhodnutí o škodě.
 *
 * Vlastní modul, ne součást `rozhodnuti.ts` — ten je `"use server"` a smí
 * ven pouštět jen asynchronní funkce. Hlavní důvod je ale jiný: tohle je
 * jediné místo, kde se rozhoduje, jestli host dostane fakturu, a takové
 * pravidlo má jít projet testem bez databáze a bez přihlášení.
 */

/**
 * Nad tuhle částku chceme potvrzení.
 *
 * Kauce je 3 000 Kč, tohle je desetinásobek. Překlep o řád — „70000" místo
 * „7000" — jinak projde bez jediného varování až na fakturu, kterou dostane
 * host. Potvrzení je schválně otravné: částka se musí objevit i v odůvodnění,
 * které majitel píše vlastními slovy.
 */
const STROP_BEZ_POTVRZENI = 30_000;

export type Kontrola =
  | { ok: true; duvod: string }
  | { ok: false; chyba: string };

export function zkontrolujRozhodnuti(castkaKc: number, duvod: string): Kontrola {
  const cisty = duvod.trim();
  if (cisty.length < 20) {
    return {
      ok: false,
      chyba:
        "Napiš prosím vlastními slovy, proč to považuješ za škodu — aspoň 20 znaků. " +
        "Bez toho to nejde uložit.",
    };
  }
  if (!Number.isFinite(castkaKc) || castkaKc < 0) {
    return { ok: false, chyba: "Částka nemůže být záporná." };
  }
  if (castkaKc > STROP_BEZ_POTVRZENI && !cisty.includes(String(Math.round(castkaKc)))) {
    return {
      ok: false,
      chyba:
        `Částka ${Math.round(castkaKc).toLocaleString("cs-CZ")} Kč je nezvykle vysoká. ` +
        "Není to překlep o řád? Když je správně, napiš ji prosím i do odůvodnění.",
    };
  }
  return { ok: true, duvod: cisty };
}
