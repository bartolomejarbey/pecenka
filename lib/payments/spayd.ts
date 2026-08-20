/**
 * SPAYD — český standard QR platby (QR Platba ČBA).
 *
 * Čistá funkce, žádná externí služba. Externí generátor by dostal číslo účtu
 * i částku každé rezervace, a QR musí fungovat i v PDF a v e-mailu, kde
 * na cizí endpoint není spolehnutí.
 *
 * Tvar:
 *   SPD*1.0*ACC:{IBAN}+{BIC}*AM:{částka}*CC:CZK*RN:{příjemce}
 *       *DT:{RRRRMMDD}*X-VS:{vs}*X-SS:{ss}*MSG:{zpráva}
 *
 * Hvězdička odděluje pole a procento uvozuje escape — uvnitř hodnot se proto
 * obojí musí zakódovat. Diakritika se srovnává, protože povolená abeceda je
 * jen `0-9 A-Z`, mezera a `$ % * + - . / :`.
 */

/** Znaky, které smějí zůstat uvnitř hodnoty tak, jak jsou. */
const POVOLENE = /[0-9A-Z $+\-.\/:]/;

/** Celá povolená abeceda výsledného řetězce (včetně strukturálních znaků). */
export const ABECEDA_SPAYD = /^[0-9A-Z $%*+\-.\/:]+$/;

/** Srovná diakritiku a převede na velká písmena. */
export function srovnej(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();
}

/** Zakóduje hodnotu do SPAYD — nepovolené znaky jako %XX. */
export function zakoduj(hodnota: string): string {
  return [...srovnej(hodnota)]
    .map((z) => {
      if (POVOLENE.test(z)) return z;
      const bajty = new TextEncoder().encode(z);
      return [...bajty].map((b) => "%" + b.toString(16).toUpperCase().padStart(2, "0")).join("");
    })
    .join("");
}

export type SpaydVstup = {
  /** IBAN příjemce — tuzemský tvar standard nepřipouští. */
  iban: string;
  /** BIC/SWIFT, volitelný, ale u nás ho vyplňujeme. */
  bic?: string;
  /** Částka v haléřích. */
  castkaHalere: number;
  /** Jméno příjemce, max 35 znaků. */
  prijemce: string;
  /** Datum splatnosti. */
  splatnost?: Date;
  /** Variabilní symbol, max 10 číslic. */
  vs: string;
  /** Specifický symbol — 1 = záloha, 2 = doplatek, 3 = kauce. */
  ss?: string;
  /** Zpráva pro příjemce, max 60 znaků. */
  zprava?: string;
};

export function sestavSpayd(v: SpaydVstup): string {
  const iban = srovnej(v.iban).replace(/\s+/g, "");
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) {
    throw new Error(`Účet musí být v IBAN tvaru, dostal jsem „${v.iban}".`);
  }
  if (!Number.isInteger(v.castkaHalere) || v.castkaHalere <= 0) {
    throw new Error(`Částka musí být kladný počet haléřů, dostal jsem ${v.castkaHalere}.`);
  }
  if (!/^\d{1,10}$/.test(v.vs)) {
    throw new Error(`Variabilní symbol smí mít nejvýš 10 číslic, dostal jsem „${v.vs}".`);
  }

  const ucet = v.bic ? `${iban}+${srovnej(v.bic).replace(/\s+/g, "")}` : iban;
  const pole: string[] = [
    `ACC:${ucet}`,
    `AM:${(v.castkaHalere / 100).toFixed(2)}`,
    "CC:CZK",
    `RN:${zakoduj(v.prijemce).slice(0, 35)}`,
  ];
  if (v.splatnost) pole.push(`DT:${datum(v.splatnost)}`);
  pole.push(`X-VS:${v.vs}`);
  if (v.ss) pole.push(`X-SS:${v.ss.replace(/\D/g, "").slice(0, 10)}`);
  if (v.zprava) pole.push(`MSG:${zakoduj(v.zprava).slice(0, 60)}`);

  const spayd = `SPD*1.0*${pole.join("*")}`;
  if (!ABECEDA_SPAYD.test(spayd)) {
    throw new Error("Ve SPAYD řetězci zůstal nepovolený znak — to je chyba v kódu.");
  }
  return spayd;
}

function datum(d: Date): string {
  return (
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0")
  );
}

/** Zpráva pro příjemce — vejde se do 60 znaků i s dlouhým VS. */
export function zpravaProPrijemce(vs: string, ucel: "ZALOHA" | "DOPLATEK" | "KAUCE"): string {
  return `SEDMY LES REZ ${vs} ${ucel}`;
}
