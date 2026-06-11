/**
 * Rezervační logika — výpočet ceny a dostupnost.
 *
 * Dostupnost je zatím ilustrační (deterministicky generované obsazené
 * bloky), dokud se nenapojí skutečný kalendář / channel manager.
 * Výpočet ceny je ostrý a odpovídá ceníku v lib/content.ts.
 */

import { PRICING, ADDONS } from "./content";

export type HouseSlug = "zula" | "mech";

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

export function formatPrice(n: number): string {
  return n.toLocaleString("cs-CZ") + " Kč";
}

/* ===== Sezóny a cena za noc ===== */

function isHighSeason(d: Date): boolean {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  // 15. 6. – 15. 9.
  if ((m === 6 && day >= 15) || m === 7 || m === 8 || (m === 9 && day <= 15)) return true;
  // 20. 12. – 2. 1.
  if ((m === 12 && day >= 20) || (m === 1 && day <= 2)) return true;
  return false;
}

function isWeekendNight(d: Date): boolean {
  const wd = d.getDay(); // noc z pátku a noc ze soboty
  return wd === 5 || wd === 6;
}

export function nightPrice(d: Date): number {
  let price = isWeekendNight(d) ? PRICING.weekendNight : PRICING.baseNight;
  if (isHighSeason(d)) price += PRICING.highSeasonExtra;
  return price;
}

/* ===== Dostupnost (ilustrační, deterministická) ===== */

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Vrátí množinu obsazených dnů (klíče YYYY-MM-DD) pro daný domek,
 *  od dneška na `days` dní dopředu. Deterministické pro stabilní UI. */
export function getBookedDays(house: HouseSlug, days = 240): Set<string> {
  const rnd = seededRandom(house === "zula" ? 7331 : 1337);
  const booked = new Set<string>();
  const today = startOfDay(new Date());
  let cursor = 4 + Math.floor(rnd() * 5); // prvních pár dní necháme volných
  while (cursor < days) {
    const len = 2 + Math.floor(rnd() * 3); // bloky 2–4 noci
    for (let i = 0; i < len && cursor + i < days; i++) {
      booked.add(toKey(addDays(today, cursor + i)));
    }
    cursor += len + 3 + Math.floor(rnd() * 9); // mezery 3–11 dní
  }
  return booked;
}

export function isRangeFree(booked: Set<string>, from: Date, to: Date): boolean {
  for (let d = startOfDay(from); d < startOfDay(to); d = addDays(d, 1)) {
    if (booked.has(toKey(d))) return false;
  }
  return true;
}

/* ===== Výpočet ceny pobytu ===== */

export type AddonSelection = Record<string, number>; // id -> množství

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
};

export function calcPrice(from: Date, to: Date, addons: AddonSelection): PriceBreakdown {
  const nightItems: { date: Date; price: number }[] = [];
  for (let d = startOfDay(from); d < startOfDay(to); d = addDays(d, 1)) {
    nightItems.push({ date: new Date(d), price: nightPrice(d) });
  }
  const nights = nightItems.length;
  const nightsTotal = nightItems.reduce((s, n) => s + n.price, 0);
  const weekDiscount = nights >= 7 ? Math.round(nightsTotal * PRICING.weekDiscount) : 0;

  const addonItems = Object.entries(addons)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const def = ADDONS.find((a) => a.id === id);
      if (!def) return null;
      const perDay = def.unit === "za den";
      const days = perDay ? Math.max(nights, 1) : 1;
      const total = def.price * qty * days;
      return { id, name: def.name, qty, total, perDay, days };
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
    deposit: PRICING.deposit,
  };
}

export function validateRange(from: Date, to: Date): string | null {
  const nights = Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);
  if (nights < PRICING.minNights) return `Minimální délka pobytu jsou ${PRICING.minNights} noci.`;
  if (nights > 21) return "Pro pobyty delší než 3 týdny nám prosím napište.";
  return null;
}
