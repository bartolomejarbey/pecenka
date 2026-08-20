/**
 * Rezervační logika — datumové pomůcky a výpočet ceny pobytu.
 *
 * Dostupnost ani ceny se tu už NEVYRÁBĚJÍ. Obojí přichází z databáze přes
 * `lib/booking/server.ts` (tabulky `rate_calendar`, `reservation_units`,
 * `calendar_blocks`) a sem se předává jako `Cenik`. Tenhle modul je čistá
 * funkce bez vedlejších efektů, takže běží i na klientovi.
 */

import { PRICING } from "@/lib/content";

export type HouseSlug = "achat" | "mech";

/* ===== Datum — pomocníci (pracujeme s lokálními dny, ne UTC) ===== */

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function formatCzDate(d: Date): string {
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
}

/** Formátuje částku v KORUNÁCH — pro ceníkové stránky, kde jsou čísla v obsahu. */
export function formatPrice(koruny: number): string {
  return koruny.toLocaleString("cs-CZ") + " Kč";
}

/** Formátuje částku v HALÉŘÍCH — pro vše, co přišlo z databáze. */
export function formatHalere(halere: number): string {
  const koruny = halere / 100;
  return (
    koruny.toLocaleString("cs-CZ", {
      minimumFractionDigits: Number.isInteger(koruny) ? 0 : 2,
      maximumFractionDigits: 2,
    }) + " Kč"
  );
}

export function isRangeFree(booked: Set<string>, from: Date, to: Date): boolean {
  for (let d = startOfDay(from); d < startOfDay(to); d = addDays(d, 1)) {
    if (booked.has(toKey(d))) return false;
  }
  return true;
}

/* ===== Ceník ===== */

/** Doplněk tak, jak přijde z databáze (tabulka `addons`). */
export type Doplnek = {
  id: string;
  name: string;
  description: string | null;
  /** Cena v haléřích. */
  priceHalere: number;
  unit: "per_stay" | "per_day" | "per_piece";
  maxQty: number;
};

/**
 * Vše, co je potřeba k výpočtu ceny. Sestavuje se na serveru z databáze
 * (`lib/booking/server.ts` → `nactiCenik`), aby změna ceny nevyžadovala deploy.
 */
export type Cenik = {
  /** Cena noci v haléřích, klíč YYYY-MM-DD. */
  ceny: Record<string, number>;
  /** Minimální počet nocí při příjezdu v ten den, klíč YYYY-MM-DD. */
  minNoci: Record<string, number>;
  doplnky: Doplnek[];
  /** Sleva za dlouhý pobyt — `bodu` je v bazických bodech (1000 = 10 %). */
  slevaDlouhehoPobytu: { odNoci: number; bodu: number } | null;
  /** Vratná kauce v haléřích. */
  kauceHalere: number;
};

/* ===== Výpočet ceny pobytu ===== */

export type AddonSelection = Record<string, number>; // id -> množství

/** Všechny částky jsou v HALÉŘÍCH. Formátuj přes `formatHalere`. */
export type PriceBreakdown = {
  nights: number;
  nightsTotal: number;
  nightItems: { date: Date; price: number }[];
  weekDiscount: number;
  addonItems: {
    id: string;
    name: string;
    qty: number;
    total: number;
    /** Účtuje se za každý den pobytu (cena × množství × dny). */
    perDay: boolean;
    days: number;
  }[];
  addonsTotal: number;
  total: number;
  deposit: number;
  /** Noci, ke kterým ceník nemá cenu — termín je mimo publikované okno. */
  chybejiciCeny: string[];
};

export function calcPrice(
  from: Date,
  to: Date,
  addons: AddonSelection,
  cenik: Cenik,
): PriceBreakdown {
  const nightItems: { date: Date; price: number }[] = [];
  const chybejiciCeny: string[] = [];
  for (let d = startOfDay(from); d < startOfDay(to); d = addDays(d, 1)) {
    const klic = toKey(d);
    const cena = cenik.ceny[klic];
    if (cena === undefined) chybejiciCeny.push(klic);
    nightItems.push({ date: new Date(d), price: cena ?? 0 });
  }
  const nights = nightItems.length;
  const nightsTotal = nightItems.reduce((s, n) => s + n.price, 0);

  // Sleva za dlouhý pobyt se váže výhradně k ubytování, nikdy k doplňkům.
  const sleva = cenik.slevaDlouhehoPobytu;
  const weekDiscount =
    sleva && nights >= sleva.odNoci ? Math.round((nightsTotal * sleva.bodu) / 10000) : 0;

  const addonItems = Object.entries(addons)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const def = cenik.doplnky.find((a) => a.id === id);
      if (!def) return null;
      const perDay = def.unit === "per_day";
      const days = perDay ? Math.max(nights, 1) : 1;
      return {
        id,
        name: def.name,
        qty,
        total: def.priceHalere * qty * days,
        perDay,
        days,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const addonsTotal = addonItems.reduce((s, a) => s + a.total, 0);
  return {
    nights,
    nightsTotal,
    nightItems,
    weekDiscount,
    addonItems,
    addonsTotal,
    total: nightsTotal - weekDiscount + addonsTotal,
    deposit: cenik.kauceHalere,
    chybejiciCeny,
  };
}

/**
 * Kontrola délky pobytu. `minZCeniku` je nejvyšší `min_nights` napříč nocemi
 * pobytu — ceníkový kalendář může u konkrétních termínů (Silvestr) žádat víc.
 */
export function validateRange(from: Date, to: Date, minZCeniku = PRICING.minNights): string | null {
  const nights = Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);
  const min = Math.max(minZCeniku, PRICING.minNights);
  if (nights < min) {
    return min === 2
      ? "Minimální délka pobytu jsou 2 noci."
      : `Pro tento termín je minimální délka pobytu ${min} nocí.`;
  }
  if (nights > 21) return "Pro pobyty delší než 3 týdny nám prosím napište.";
  return null;
}
