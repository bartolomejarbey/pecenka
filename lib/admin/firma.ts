/**
 * Údaje firmy — čtení, kontrola a uložení.
 *
 * IČO i číslo účtu mají kontrolní číslici. Kontrolujeme ji schválně: překlep
 * v IČO projde na faktuře až k finančnímu úřadu a překlep v účtu pošle zálohu
 * cizímu člověku. Obojí se pozná dřív, než se to stihne vytisknout.
 */

/**
 * Kontrolní číslice IČO podle modulo 11 (ARES).
 *
 * Osm číslic, první sedm se váží 8…2, zbytek po dělení jedenácti určuje
 * poslední. Zbytek 0 → 1, zbytek 1 → 0, jinak 11 − zbytek.
 */
export function icoSedi(ico: string): boolean {
  const c = ico.replace(/\s/g, "");
  if (!/^\d{8}$/.test(c)) return false;
  let soucet = 0;
  for (let i = 0; i < 7; i++) soucet += Number(c[i]) * (8 - i);
  const zbytek = soucet % 11;
  const ocekavana = zbytek === 0 ? 1 : zbytek === 1 ? 0 : 11 - zbytek;
  return Number(c[7]) === ocekavana;
}

/**
 * Kontrolní číslo IBAN podle ISO 13616 (modulo 97 = 1).
 *
 * Počítá se po částech, protože celé číslo má přes třicet číslic a do
 * `Number` se nevejde.
 */
export function ibanSedi(iban: string): boolean {
  const c = iban.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(c)) return false;
  const prehozeno = c.slice(4) + c.slice(0, 4);
  const cislice = prehozeno.replace(/[A-Z]/g, (z) => String(z.charCodeAt(0) - 55));
  let zbytek = 0;
  for (const znak of cislice) zbytek = (zbytek * 10 + Number(znak)) % 97;
  return zbytek === 1;
}

/**
 * Kontrolní číslice tuzemského čísla účtu podle ČNB (modulo 11).
 *
 * Předčíslí i základní část mají vlastní váhy. Používá se jen k převodu na
 * IBAN — ten se pak kontroluje sám.
 */
function tuzemskySedi(predcisli: string, zaklad: string): boolean {
  // Váhy se přiřazují zprava doleva, ne zleva. Otočené projdou náhodou asi
  // desetině čísel, takže by chyba prošla testem na jednom účtu.
  const VAHY = [1, 2, 4, 8, 5, 10, 9, 7, 3, 6];
  const kontrola = (cast: string, delka: number) => {
    const s = cast.padStart(delka, "0");
    let soucet = 0;
    for (let i = 0; i < delka; i++) soucet += Number(s[delka - 1 - i]) * VAHY[i];
    return soucet % 11 === 0;
  };
  return (!predcisli || kontrola(predcisli, 6)) && kontrola(zaklad, 10);
}

/** Kódy bank, pro které umíme IBAN sestavit i BIC doplnit. */
const BANKY: Record<string, { bic: string; nazev: string }> = {
  "0100": { bic: "KOMBCZPP", nazev: "Komerční banka" },
  "0300": { bic: "CEKOCZPP", nazev: "ČSOB" },
  "0600": { bic: "AGBACZPP", nazev: "MONETA Money Bank" },
  "0710": { bic: "CNBACZPP", nazev: "Česká národní banka" },
  "0800": { bic: "GIBACZPX", nazev: "Česká spořitelna" },
  "2010": { bic: "FIOBCZPP", nazev: "Fio banka" },
  "2060": { bic: "CITFCZPP", nazev: "Citfin" },
  "2070": { bic: "MPUBCZPP", nazev: "TRINITY BANK" },
  "2250": { bic: "CTASCZ22", nazev: "Banka CREDITAS" },
  "2600": { bic: "CITICZPX", nazev: "Citibank" },
  "2700": { bic: "BACXCZPP", nazev: "UniCredit Bank" },
  "3030": { bic: "AIRACZPP", nazev: "Air Bank" },
  "3050": { bic: "BPPFCZP1", nazev: "PARTNERS BANKA" },
  "3060": { bic: "BPKOCZPP", nazev: "PKO BP" },
  "5500": { bic: "RZBCCZPP", nazev: "Raiffeisenbank" },
  "6100": { bic: "EQBKCZPP", nazev: "Equa bank / Raiffeisenbank" },
  "6210": { bic: "BREXCZPP", nazev: "mBank" },
  "6800": { bic: "VBOECZ2X", nazev: "Sberbank / Raiffeisenbank" },
  "7910": { bic: "DEUTCZPX", nazev: "Deutsche Bank" },
  "8030": { bic: "GENOCZ21", nazev: "Volksbank Raiffeisen" },
};

export type Ucet = { iban: string; bic: string; zobrazeni: string; banka: string };

/**
 * Převod tuzemského čísla účtu na IBAN.
 *
 * Provozovatel zná svůj účet ve tvaru `1920001453/0800`, ne jako IBAN. QR
 * platba ale IBAN vyžaduje, tak si ho spočítáme sami — a rovnou tím ověříme,
 * že zadané číslo dává smysl.
 */
export function naIban(vstup: string): Ucet | { chyba: string } {
  const c = vstup.trim().replace(/\s/g, "");

  if (/^[Cc][Zz]\d{2}/.test(c)) {
    const iban = c.toUpperCase();
    if (!ibanSedi(iban)) return { chyba: "IBAN nesedí — zkontrolujte prosím, jestli jste ho opsali celý." };
    const kod = iban.slice(4, 8);
    const predcisli = iban.slice(8, 14).replace(/^0+/, "");
    const zaklad = iban.slice(14).replace(/^0+/, "");
    return {
      iban,
      bic: BANKY[kod]?.bic ?? "",
      zobrazeni: (predcisli ? predcisli + "-" : "") + zaklad + "/" + kod,
      banka: BANKY[kod]?.nazev ?? "",
    };
  }

  const m = /^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/.exec(c);
  if (!m) return { chyba: "Zadejte účet jako 1920001453/0800, nebo rovnou IBAN." };
  const [, predcisli = "", zaklad, kod] = m;

  if (!BANKY[kod]) return { chyba: `Kód banky ${kod} neznám. Zadejte prosím rovnou IBAN.` };
  if (!tuzemskySedi(predcisli, zaklad)) {
    return { chyba: "Číslo účtu nesedí na kontrolní číslici — nemáte v něm překlep?" };
  }

  // IBAN se sestaví z kódu banky, předčíslí na 6 a čísla na 10 míst;
  // kontrolní dvojčíslí se dopočítá stejným modulo 97 jako při ověření.
  const telo = kod + predcisli.padStart(6, "0") + zaklad.padStart(10, "0");
  const prehozeno = telo + "123500"; // "CZ00" převedené na číslice
  let zbytek = 0;
  for (const znak of prehozeno) zbytek = (zbytek * 10 + Number(znak)) % 97;
  const kontrolni = String(98 - zbytek).padStart(2, "0");

  return {
    iban: "CZ" + kontrolni + telo,
    bic: BANKY[kod].bic,
    zobrazeni: (predcisli ? predcisli + "-" : "") + zaklad + "/" + kod,
    banka: BANKY[kod].nazev,
  };
}
