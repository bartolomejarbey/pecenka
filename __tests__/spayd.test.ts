import { describe, expect, it } from "vitest";
import { ABECEDA_SPAYD, sestavSpayd, zakoduj, zpravaProPrijemce, srovnej } from "@/lib/payments/spayd";

const ZAKLAD = {
  iban: "CZ6508000000192000145399",
  bic: "GIBACZPX",
  castkaHalere: 433500,
  prijemce: "Sedmý les",
  vs: "2608000424",
};

describe("SPAYD", () => {
  it("poskládá řetězec podle standardu", () => {
    const s = sestavSpayd({
      ...ZAKLAD,
      splatnost: new Date(2026, 7, 24),
      ss: "1",
      zprava: zpravaProPrijemce("2608000424", "ZALOHA"),
    });
    expect(s).toBe(
      "SPD*1.0*ACC:CZ6508000000192000145399+GIBACZPX*AM:4335.00*CC:CZK*RN:SEDMY LES" +
        "*DT:20260824*X-VS:2608000424*X-SS:1*MSG:SEDMY LES REZ 2608000424 ZALOHA",
    );
  });

  it("používá jen povolenou abecedu", () => {
    const s = sestavSpayd({ ...ZAKLAD, zprava: "Příšerně žluťoučký kůň úpěl ďábelské ódy" });
    expect(s).toMatch(ABECEDA_SPAYD);
  });

  it("srovná diakritiku", () => {
    expect(srovnej("Sedmý les — Jílové u Držkova")).toBe("SEDMY LES — JILOVE U DRZKOVA");
    expect(zakoduj("Sedmý les")).toBe("SEDMY LES");
  });

  it("zakóduje strukturální znaky, aby nerozbily pole", () => {
    // hvězdička odděluje pole, procento uvozuje escape — uvnitř hodnoty musí pryč
    expect(zakoduj("A*B")).toBe("A%2AB");
    expect(zakoduj("100%")).toBe("100%25");
    const s = sestavSpayd({ ...ZAKLAD, prijemce: "Sedmý les *pozor*" });
    expect(s.split("*").length).toBe(7); // SPD, 1.0, ACC, AM, CC, RN + nic navíc
  });

  it("dodrží délkové limity", () => {
    const s = sestavSpayd({
      ...ZAKLAD,
      prijemce: "X".repeat(60),
      zprava: "Y".repeat(200),
    });
    expect(s.match(/RN:([^*]*)/)![1]).toHaveLength(35);
    expect(s.match(/MSG:([^*]*)/)![1]).toHaveLength(60);
  });

  it("částku vypisuje na dvě desetinná místa", () => {
    expect(sestavSpayd({ ...ZAKLAD, castkaHalere: 289000 })).toContain("AM:2890.00");
    expect(sestavSpayd({ ...ZAKLAD, castkaHalere: 289050 })).toContain("AM:2890.50");
    expect(sestavSpayd({ ...ZAKLAD, castkaHalere: 1 })).toContain("AM:0.01");
  });

  it("trvá na IBAN tvaru účtu", () => {
    expect(() => sestavSpayd({ ...ZAKLAD, iban: "192000145399/0800" })).toThrow(/IBAN/);
    expect(() => sestavSpayd({ ...ZAKLAD, iban: "" })).toThrow();
  });

  it("odmítne nesmyslnou částku a VS", () => {
    expect(() => sestavSpayd({ ...ZAKLAD, castkaHalere: 0 })).toThrow();
    expect(() => sestavSpayd({ ...ZAKLAD, castkaHalere: -100 })).toThrow();
    expect(() => sestavSpayd({ ...ZAKLAD, castkaHalere: 12.5 })).toThrow();
    expect(() => sestavSpayd({ ...ZAKLAD, vs: "12345678901" })).toThrow(/10 číslic/);
    expect(() => sestavSpayd({ ...ZAKLAD, vs: "abc" })).toThrow();
  });

  it("IBAN s mezerami projde", () => {
    expect(sestavSpayd({ ...ZAKLAD, iban: "CZ65 0800 0000 1920 0014 5399" })).toContain(
      "ACC:CZ6508000000192000145399+GIBACZPX",
    );
  });

  it("zprávy pro příjemce se vejdou do 60 znaků", () => {
    for (const ucel of ["ZALOHA", "DOPLATEK", "KAUCE"] as const) {
      expect(zpravaProPrijemce("2608000424", ucel).length).toBeLessThanOrEqual(60);
    }
  });
});
