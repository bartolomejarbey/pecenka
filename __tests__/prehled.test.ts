import { describe, expect, it } from "vitest";
import { rozdilDnu, urciFazi } from "@/lib/portal/prehled";

/**
 * Fáze pobytu.
 *
 * Rozhoduje o tom, co host uvidí nahoře na displeji — a je to jediné, co
 * z portálu dělá aplikaci místo výpisu. Den příjezdu se dřív počítal jako
 * „během pobytu", takže host ve tři odpoledne na parkovišti četl „Vítejte
 * v Achátu" místo kódu od schránky.
 */

const den = (posun: number) => {
  const d = new Date("2026-06-15T12:00:00");
  d.setDate(d.getDate() + posun);
  return d;
};
const DNES = new Date("2026-06-15T12:00:00");

describe("fáze pobytu", () => {
  it("pobyt daleko v budoucnu", () => {
    expect(urciFazi(den(5), den(8), DNES)).toBe("pred");
    expect(urciFazi(den(2), den(5), DNES)).toBe("pred");
  });

  it("zítra a dnes přijíždí — host je na cestě, ne v domku", () => {
    expect(urciFazi(den(1), den(4), DNES)).toBe("prijezd");
    expect(urciFazi(den(0), den(3), DNES)).toBe("prijezd");
  });

  it("uprostřed pobytu", () => {
    expect(urciFazi(den(-1), den(3), DNES)).toBe("behem");
    expect(urciFazi(den(-3), den(2), DNES)).toBe("behem");
  });

  it("den odjezdu i den před ním patří odjezdu", () => {
    expect(urciFazi(den(-2), den(1), DNES)).toBe("odjezd");
    expect(urciFazi(den(-3), den(0), DNES)).toBe("odjezd");
  });

  it("po odjezdu", () => {
    expect(urciFazi(den(-4), den(-1), DNES)).toBe("po");
  });

  it("jednodenní pobyt začíná i končí týž den", () => {
    // Nemělo by nastat (minimum jsou dvě noci), ale nesmí to spadnout.
    expect(urciFazi(den(0), den(0), DNES)).toBe("odjezd");
  });
});

describe("rozdíl dnů", () => {
  it("počítá kalendářní dny, ne 24hodinové úseky", () => {
    expect(rozdilDnu(new Date("2026-06-15T23:00:00"), new Date("2026-06-16T01:00:00"))).toBe(1);
    expect(rozdilDnu(new Date("2026-06-15T01:00:00"), new Date("2026-06-15T23:00:00"))).toBe(0);
  });

  it("přechod letního času nerozhodí počet dní", () => {
    // V Česku se mění poslední neděli v říjnu (25. 10. 2026).
    expect(rozdilDnu(new Date("2026-10-24T12:00:00"), new Date("2026-10-26T12:00:00"))).toBe(2);
  });
});
