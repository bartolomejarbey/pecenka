import { describe, expect, it } from "vitest";
import { icoSedi, ibanSedi, naIban } from "@/lib/admin/firma";

/**
 * Kontrolní číslice údajů firmy.
 *
 * Testuje se to, co stojí peníze: překlep v IČO doputuje na fakturu
 * k finančnímu úřadu, překlep v účtu pošle zálohu cizímu člověku.
 */

describe("IČO", () => {
  it("uzná skutečná IČO", () => {
    // Veřejně známé subjekty z ARES.
    for (const ico of ["27074358", "45244782", "60193336", "00006947"]) {
      expect(icoSedi(ico), ico).toBe(true);
    }
  });

  it("odmítne překlep v poslední číslici", () => {
    expect(icoSedi("27074359")).toBe(false);
  });

  it("odmítne jiný než osmimístný tvar", () => {
    expect(icoSedi("2707435")).toBe(false);
    expect(icoSedi("270743580")).toBe(false);
    expect(icoSedi("2707435a")).toBe(false);
  });
});

describe("IBAN", () => {
  it("uzná platný český IBAN", () => {
    expect(ibanSedi("CZ6508000000192000145399")).toBe(true);
    expect(ibanSedi("CZ65 0800 0000 1920 0014 5399")).toBe(true);
  });

  it("odmítne přehozené číslice", () => {
    expect(ibanSedi("CZ6508000000192000145939")).toBe(false);
  });
});

describe("převod tuzemského účtu na IBAN", () => {
  it("spočítá IBAN, který sám sobě sedí", () => {
    const u = naIban("19-2000145399/0800");
    expect(u).not.toHaveProperty("chyba");
    if ("chyba" in u) return;
    expect(u.iban).toBe("CZ6508000000192000145399");
    expect(ibanSedi(u.iban)).toBe(true);
    expect(u.bic).toBe("GIBACZPX");
    expect(u.zobrazeni).toBe("19-2000145399/0800");
    expect(u.banka).toBe("Česká spořitelna");
  });

  it("zvládne účet bez předčíslí", () => {
    const u = naIban("2601234565/2010");
    if ("chyba" in u) throw new Error(u.chyba);
    expect(ibanSedi(u.iban)).toBe(true);
    expect(u.bic).toBe("FIOBCZPP");
  });

  it("přijme rovnou IBAN a rozloží ho zpátky", () => {
    const u = naIban("CZ65 0800 0000 1920 0014 5399");
    if ("chyba" in u) throw new Error(u.chyba);
    expect(u.zobrazeni).toBe("19-2000145399/0800");
  });

  it("chytí překlep v čísle účtu", () => {
    const u = naIban("2601234566/2010");
    expect(u).toHaveProperty("chyba");
  });

  it("neuhádne banku, kterou nezná — řekne to", () => {
    const u = naIban("2601234565/9999");
    expect("chyba" in u && u.chyba).toContain("9999");
  });

  it("odmítne nesmysl místo účtu", () => {
    expect(naIban("můj účet")).toHaveProperty("chyba");
  });
});
