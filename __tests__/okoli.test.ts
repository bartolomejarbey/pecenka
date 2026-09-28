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

describe("fotky míst", () => {
  it("každá fotka existuje na disku a má autora i licenci", async () => {
    const { FOTO_MIST } = await import("@/lib/okoli-foto");
    const { existsSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    for (const [id, f] of Object.entries(FOTO_MIST)) {
      const cesta = join(process.cwd(), "public", f.src);
      expect(existsSync(cesta), `${id}: chybí ${f.src}`).toBe(true);
      expect(statSync(cesta).size, id).toBeGreaterThan(10_000);
      expect(f.autor.length, id).toBeGreaterThan(1);
      expect(f.licence, id).toMatch(/CC|Public domain|free use/);
      expect(f.zdroj, id).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
      expect(f.alt.length, id).toBeGreaterThan(8);
    }
  });

  it("fotky patří k existujícím místům (kromě pohledu na obec)", async () => {
    const { FOTO_MIST } = await import("@/lib/okoli-foto");
    const ids = new Set(MISTA.map((m) => m.id));
    for (const id of Object.keys(FOTO_MIST)) {
      if (id === "obec") continue;
      expect(ids.has(id), id).toBe(true);
    }
  });

  it("lom má vlastní fotku a tři vybraná místa existují pro obě sezóny", async () => {
    const { fotoMista, vybraneProSezonu } = await import("@/lib/okoli");
    expect(fotoMista("lom")?.licence).toBe("vlastní");
    expect(vybraneProSezonu(MISTA, "leto")).toHaveLength(3);
    expect(vybraneProSezonu(MISTA, "zima")).toHaveLength(3);
    for (const m of vybraneProSezonu(MISTA, "zima")) expect(["zima", "celorocne"]).toContain(m.sezona);
  });
});
