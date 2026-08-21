import { describe, expect, it } from "vitest";

/**
 * Okno omezení pokusů.
 *
 * Kopie logiky z `app/api/rezervace/route.ts` — samotná funkce je uvnitř
 * route modulu, který se v testu načíst nedá (táhne s sebou půl aplikace).
 * Testuje se to, na čem záleží: že odmítnutý pokus okno neprodlužuje.
 */

const LIMIT = 5;
const OKNO_MS = 10 * 60 * 1000;

function udelej() {
  const pokusy = new Map<string, number[]>();
  return (ip: string, ted: number): boolean => {
    const seznam = (pokusy.get(ip) ?? []).filter((t) => ted - t < OKNO_MS);
    if (seznam.length >= LIMIT) {
      pokusy.set(ip, seznam);
      return true;
    }
    seznam.push(ted);
    pokusy.set(ip, seznam);
    return false;
  };
}

describe("omezení pokusů", () => {
  it("pustí pět pokusů a šestý odmítne", () => {
    const prekrocil = udelej();
    const t = 1_000_000;
    for (let i = 0; i < LIMIT; i++) {
      expect(prekrocil("1.2.3.4", t + i), `pokus ${i + 1}`).toBe(false);
    }
    expect(prekrocil("1.2.3.4", t + LIMIT)).toBe(true);
  });

  it("odmítnutý pokus okno neprodlouží", () => {
    const prekrocil = udelej();
    const t = 1_000_000;
    for (let i = 0; i < LIMIT; i++) prekrocil("1.2.3.4", t);

    // Někdo bouchá na dveře celou dobu okna.
    for (let i = 1; i < 40; i++) {
      expect(prekrocil("1.2.3.4", t + i * 15_000)).toBe(true);
    }

    // Jakmile okno od posledního *započítaného* pokusu uplyne, jde to zas.
    expect(prekrocil("1.2.3.4", t + OKNO_MS + 1)).toBe(false);
  });

  it("adresy se nemíchají", () => {
    const prekrocil = udelej();
    const t = 1_000_000;
    for (let i = 0; i < LIMIT; i++) prekrocil("1.2.3.4", t);
    expect(prekrocil("1.2.3.4", t)).toBe(true);
    expect(prekrocil("5.6.7.8", t)).toBe(false);
  });
});
