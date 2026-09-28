import { describe, expect, it } from "vitest";
import { LOCATION } from "@/lib/content";
import {
  KATEGORIE,
  MISTA,
  filtrujMista,
  odLomuKm,
  odkazMapy,
  popisProSezonu,
  vzdalenostKm,
} from "@/lib/okoli";

/**
 * Data pro mapu okolí jsou ručně psaná, takže je hlídá test: překlep
 * v souřadnici by poslal značku do Polska a nikdo by si nevšiml.
 */
describe("místa v okolí", () => {
  it("mají jedinečná id", () => {
    const ids = MISTA.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("leží do 50 km od lomu — v Libereckém kraji a okolí", () => {
    for (const m of MISTA) {
      expect(m.lat, m.id).toBeGreaterThan(50.4);
      expect(m.lat, m.id).toBeLessThan(50.9);
      expect(m.lng, m.id).toBeGreaterThan(14.9);
      expect(m.lng, m.id).toBeLessThan(15.6);
      expect(vzdalenostKm(LOCATION, m), m.id).toBeLessThan(50);
    }
  });

  it("mají kategorii ze seznamu, sezónu a rozumně dlouhý popis", () => {
    const kategorie = new Set(KATEGORIE.map((k) => k.id));
    for (const m of MISTA) {
      expect(kategorie.has(m.kategorie), m.id).toBe(true);
      expect(["leto", "zima", "celorocne"], m.id).toContain(m.sezona);
      expect(m.popis.length, m.id).toBeGreaterThan(60);
      expect(m.popis.length, m.id).toBeLessThan(420);
      if (m.popisZima) expect(m.sezona, `${m.id}: zimní popis má smysl jen u celoročního místa`).toBe("celorocne");
      if (m.web) expect(m.web, m.id).toMatch(/^https:\/\//);
    }
  });

  it("doba jízdy roste se vzdáleností aspoň zhruba", () => {
    for (const m of MISTA) {
      if (m.doma) {
        expect(m.autem).toBe(0);
        continue;
      }
      expect(m.autem, m.id).toBeGreaterThan(0);
      // Po horských silnicích se nejede rychleji než 90 km/h vzdušnou čarou.
      expect(m.autem, m.id).toBeGreaterThanOrEqual(vzdalenostKm(LOCATION, m) / 1.5);
    }
  });

  it("lom je jedno z míst a je doma", () => {
    const lom = MISTA.find((m) => m.doma);
    expect(lom?.lat).toBe(LOCATION.lat);
    expect(lom?.lng).toBe(LOCATION.lng);
    expect(odLomuKm(lom!)).toBe(0);
  });
});

describe("výpočty", () => {
  it("vzdušná vzdálenost lom → Kozákov je kolem 8–9 km", () => {
    const kozakov = MISTA.find((m) => m.id === "kozakov")!;
    expect(vzdalenostKm(LOCATION, kozakov)).toBeGreaterThan(8);
    expect(vzdalenostKm(LOCATION, kozakov)).toBeLessThan(9.5);
  });

  it("odkaz do Map vyhledává název a je zakódovaný", () => {
    const kozakov = MISTA.find((m) => m.id === "kozakov")!;
    expect(odkazMapy(kozakov)).toBe("https://mapy.com/turisticka?q=Rozhledna%20Koz%C3%A1kov");
  });

  it("filtr: celoroční místa jsou v obou sezónách, letní jen v létě", () => {
    const leto = filtrujMista(MISTA, "leto", null).map((m) => m.id);
    const zima = filtrujMista(MISTA, "zima", null).map((m) => m.id);
    expect(leto).toContain("zluta-plovarna");
    expect(zima).not.toContain("zluta-plovarna");
    expect(zima).toContain("ski-zasada");
    expect(leto).not.toContain("ski-zasada");
    expect(leto).toContain("bozkov");
    expect(zima).toContain("bozkov");
    // Seřazeno podle doby jízdy, lom první.
    expect(leto[0]).toBe("lom");
  });

  it("filtr „s dětmi“ a kategorie", () => {
    for (const m of filtrujMista(MISTA, "leto", "deti")) expect(m.deti).toBe(true);
    for (const m of filtrujMista(MISTA, "zima", "hory")) expect(m.kategorie).toBe("hory");
    expect(filtrujMista(MISTA, "zima", "hory").length).toBeGreaterThanOrEqual(8);
  });

  it("zimní popis se použije jen v zimě", () => {
    const lom = MISTA.find((m) => m.doma)!;
    expect(popisProSezonu(lom, "zima")).toBe(lom.popisZima);
    expect(popisProSezonu(lom, "leto")).toBe(lom.popis);
  });
});
