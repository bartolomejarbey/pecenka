import { describe, expect, it } from "vitest";
import { calcPrice, formatHalere, toKey, validateRange, type Cenik } from "@/lib/booking";

/** Ceník na zkoušku: 2 890 Kč za noc, víkend 3 490 Kč — vše v haléřích. */
function cenik(prepis: Partial<Cenik> = {}): Cenik {
  const ceny: Record<string, number> = {};
  const minNoci: Record<string, number> = {};
  for (let i = 0; i < 40; i++) {
    const d = new Date(2026, 8, 1 + i); // září 2026
    const wd = d.getDay();
    ceny[toKey(d)] = wd === 5 || wd === 6 ? 349000 : 289000;
    minNoci[toKey(d)] = 2;
  }
  return {
    ceny,
    minNoci,
    doplnky: [
      { id: "snidane", name: "Snídaňový koš", description: null, priceHalere: 49000, unit: "per_day", maxQty: 2 },
      { id: "vino", name: "Víno", description: null, priceHalere: 39000, unit: "per_piece", maxQty: 4 },
      { id: "pes", name: "Pes", description: null, priceHalere: 35000, unit: "per_stay", maxQty: 1 },
    ],
    slevaDlouhehoPobytu: { odNoci: 7, bodu: 1000 },
    kauceHalere: 300000,
    ...prepis,
  };
}

const d = (den: number) => new Date(2026, 8, den);

describe("výpočet ceny pobytu", () => {
  it("sečte noci podle ceníku, ne podle konstant", () => {
    // út 1. 9. → čt 3. 9. = noci z 1. a 2. září, obě všední
    const b = calcPrice(d(1), d(3), {}, cenik());
    expect(b.nights).toBe(2);
    expect(b.nightsTotal).toBe(2 * 289000);
    expect(b.chybejiciCeny).toEqual([]);
  });

  it("víkendová noc je dražší", () => {
    // pá 4. 9. → so 5. 9. je jedna noc, a to víkendová
    const b = calcPrice(d(4), d(5), {}, cenik());
    expect(b.nightsTotal).toBe(349000);
  });

  it("sleva za dlouhý pobyt se váže jen k ubytování", () => {
    const b = calcPrice(d(1), d(9), { snidane: 1 }, cenik()); // 8 nocí
    expect(b.nights).toBe(8);
    expect(b.weekDiscount).toBe(Math.round(b.nightsTotal * 0.1));
    // doplňky do slevy nevstupují
    expect(b.total).toBe(b.nightsTotal - b.weekDiscount + b.addonsTotal);
    expect(b.addonsTotal).toBe(49000 * 8);
  });

  it("krátký pobyt slevu nedostane", () => {
    expect(calcPrice(d(1), d(4), {}, cenik()).weekDiscount).toBe(0);
  });

  it("doplněk za den se násobí počtem nocí, za pobyt ne", () => {
    const b = calcPrice(d(1), d(4), { snidane: 1, pes: 1, vino: 2 }, cenik());
    expect(b.nights).toBe(3);
    const snidane = b.addonItems.find((a) => a.id === "snidane")!;
    const pes = b.addonItems.find((a) => a.id === "pes")!;
    const vino = b.addonItems.find((a) => a.id === "vino")!;
    expect(snidane.total).toBe(49000 * 3);
    expect(pes.total).toBe(35000);
    expect(vino.total).toBe(39000 * 2);
  });

  it("nahlásí noci, na které ceník nemá cenu", () => {
    const b = calcPrice(new Date(2030, 0, 1), new Date(2030, 0, 3), {}, cenik());
    expect(b.chybejiciCeny).toHaveLength(2);
  });

  it("kauce přichází z nastavení, ne z kódu", () => {
    expect(calcPrice(d(1), d(3), {}, cenik({ kauceHalere: 500000 })).deposit).toBe(500000);
  });
});

describe("kontrola délky pobytu", () => {
  it("odmítne jednu noc", () => {
    expect(validateRange(d(1), d(2))).toMatch(/2 noci/);
  });
  it("respektuje delší minimum z ceníku", () => {
    expect(validateRange(d(1), d(3), 3)).toMatch(/3 nocí/);
    expect(validateRange(d(1), d(4), 3)).toBeNull();
  });
  it("pustí běžný pobyt", () => {
    expect(validateRange(d(1), d(4))).toBeNull();
  });
});

describe("formátování haléřů", () => {
  it("celé koruny bez desetin", () => {
    expect(formatHalere(289000).replace(/ /g, " ")).toBe("2 890 Kč");
  });
  it("neceločíselnou částku ukáže na haléře", () => {
    expect(formatHalere(289050).replace(/ /g, " ")).toBe("2 890,50 Kč");
  });
});
