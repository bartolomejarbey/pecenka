/**
 * Roční doba pro web — dvě věci, které se odvíjejí od kalendáře.
 *
 * 1. Mapa okolí má dvě polohy, léto a zima. Host se rozhoduje mezi „jedu se
 *    koupat a na lodě" a „jedu lyžovat"; čtyři roční období by přepínač jen
 *    zaplevelily. Zima je prosinec až březen: v Jizerských horách i Krkonoších
 *    se jezdí do konce března a lodě na Jizeře vyplouvají v dubnu.
 * 2. Pás ročních období na úvodu ukazuje, které právě běží.
 *
 * Měsíc se bere v pražském čase. Server na Vercelu běží v UTC a o půlnoci
 * na Nový rok by jinak hodinu ukazoval starý měsíc.
 */

export type Sezona = "leto" | "zima";

export const SEZONA_POPIS: Record<Sezona, { nazev: string; kdy: string; veta: string }> = {
  leto: {
    nazev: "Léto",
    kdy: "duben až listopad",
    veta: "Koupání v lomu, lodě na Jizeře, ferrata, skalní města, hrady a rozhledny.",
  },
  zima: {
    nazev: "Zima",
    kdy: "prosinec až březen",
    veta: "Sjezdovky do půl hodiny, běžky za kopcem, otužování v lomu a teplo pod střechou.",
  },
};

/** Měsíc 1–12 v pražském čase. */
export function mesicVPraze(kdy: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: "Europe/Prague" }).format(kdy),
  );
}

/** Léto, nebo zima — podle měsíce v pražském čase. */
export function sezonaKDatu(kdy: Date = new Date()): Sezona {
  const m = mesicVPraze(kdy);
  return m === 12 || m <= 3 ? "zima" : "leto";
}

/**
 * Index do `SEASONS` v lib/content.ts: 0 jaro, 1 léto, 2 podzim, 3 zima.
 * Meteorologicky — jaro začíná 1. března, zima 1. prosince.
 */
export function rocniObdobiKDatu(kdy: Date = new Date()): 0 | 1 | 2 | 3 {
  const m = mesicVPraze(kdy);
  if (m >= 3 && m <= 5) return 0;
  if (m >= 6 && m <= 8) return 1;
  if (m >= 9 && m <= 11) return 2;
  return 3;
}
