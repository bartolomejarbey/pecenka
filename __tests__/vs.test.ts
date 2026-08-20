import { describe, expect, it } from "vitest";
import { kontrolniCislice, overVs, portalovyKod, sestavKod, sestavVs } from "@/lib/reservations/vs";

describe("variabilní symbol", () => {
  it("má deset číslic a nese rok a měsíc příjezdu", () => {
    const vs = sestavVs(new Date(2026, 7, 24), 42); // srpen 2026
    expect(vs).toHaveLength(10);
    expect(vs.slice(0, 4)).toBe("2608");
    expect(vs.slice(4, 9)).toBe("00042");
  });

  it("vlastní kontrolní číslici uzná", () => {
    for (const poradi of [1, 7, 99, 143, 1000, 99999]) {
      const vs = sestavVs(new Date(2026, 0, 2), poradi);
      expect(overVs(vs), `VS ${vs} neprošel kontrolou`).toBe(true);
    }
  });

  it("odchytí překlep v jedné číslici", () => {
    const vs = sestavVs(new Date(2026, 8, 15), 424);
    let odchyceno = 0;
    let celkem = 0;
    for (let i = 0; i < 9; i++) {
      for (let d = 0; d <= 9; d++) {
        if (Number(vs[i]) === d) continue;
        celkem++;
        const rozbity = vs.slice(0, i) + d + vs.slice(i + 1);
        if (!overVs(rozbity)) odchyceno++;
      }
    }
    // mod 11 se zbytkem 10 mapovaným na 0 chytá drtivou většinu, ne úplně všechno
    expect(odchyceno / celkem).toBeGreaterThan(0.9);
  });

  it("nedovolí pořadí mimo rozsah", () => {
    expect(() => sestavVs(new Date(2026, 0, 1), 0)).toThrow();
    expect(() => sestavVs(new Date(2026, 0, 1), 100000)).toThrow();
  });

  it("kontrolní číslice chce přesně devět číslic", () => {
    expect(() => kontrolniCislice("12345678")).toThrow();
    expect(() => kontrolniCislice("abcdefghi")).toThrow();
  });

  it("neplatné tvary VS neprojdou", () => {
    expect(overVs("123")).toBe(false);
    expect(overVs("260800042x")).toBe(false);
  });
});

describe("veřejný kód rezervace", () => {
  it("vypadá jako SL-26-0143", () => {
    expect(sestavKod(2026, 143)).toBe("SL-26-0143");
    expect(sestavKod(2027, 7)).toBe("SL-27-0007");
  });
});

describe("portálový kód", () => {
  const T = "tajny-klic";
  it("je krátký, čitelný a bez matoucích znaků", () => {
    const k = portalovyKod("2608000424", T);
    expect(k).toHaveLength(6);
    expect(k).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/);
  });
  it("stejný VS a klíč dají stejný kód", () => {
    expect(portalovyKod("2608000424", T)).toBe(portalovyKod("2608000424", T));
  });
  it("bez znalosti klíče se z VS odvodit nedá", () => {
    expect(portalovyKod("2608000424", T)).not.toBe(portalovyKod("2608000424", "jiny-klic"));
  });
  it("různé rezervace mají různý kód", () => {
    expect(portalovyKod("2608000424", T)).not.toBe(portalovyKod("2608000432", T));
  });
});
