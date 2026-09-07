/**
 * Seznam naplánovaných úloh.
 *
 * Vlastní soubor, protože `lib/admin/crony.ts` je `"use server"` — a z takového
 * modulu smí ven **jen asynchronní funkce**. Exportované pole se v překladu
 * změní na odkaz na serverovou akci, takže `ULOHY.map` na klientu spadne na
 * „map is not a function". Chyba, kterou typová kontrola nechytí a build taky ne.
 */

export type Uloha = "vyhodnoceni" | "retence" | "expirace-drzeni" | "doplatky" | "souhrn";

export const ULOHY: { klic: Uloha; nazev: string; popis: string }[] = [
  {
    klic: "vyhodnoceni",
    nazev: "Dotažení protokolů",
    popis: "Vyhodnotí odjezdové fotky, u kterých se běh přerušil.",
  },
  {
    klic: "retence",
    nazev: "Mazání fotek po lhůtě",
    popis: "Smaže fotky starší než 90 dní po odjezdu, jak slibujeme hostům.",
  },
  {
    klic: "expirace-drzeni",
    nazev: "Uvolnění držených termínů",
    popis: "Vrátí do prodeje termíny, na které nedorazila záloha.",
  },
  {
    klic: "doplatky",
    nazev: "Předpis doplatků",
    popis: "Předepíše doplatek pobytům, které se blíží.",
  },
  {
    klic: "souhrn",
    nazev: "Ranní souhrn",
    popis: "Pošle e-mail s tím, co dnes čeká.",
  },
];

export type VysledekUlohy = { ok?: string; chyba?: string };
