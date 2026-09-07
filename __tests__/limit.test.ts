import { afterEach, describe, expect, it, vi } from "vitest";
import { prekrocilLimit } from "@/lib/limit";

/**
 * Okno omezení pokusů.
 *
 * Testuje se **skutečná funkce** z `lib/limit.ts`, ne její opis. Dřív tu byla
 * kopie logiky, protože počítadlo bydlelo uvnitř route modulu — takový test
 * projde i tehdy, když se produkční kód rozbije.
 *
 * Čas se posouvá falešnými časovači, protože okno je deset minut a nikdo
 * nebude čekat.
 */

const LIMIT = { pocet: 5, oknoMs: 10 * 60 * 1000 };

afterEach(() => {
  vi.useRealTimers();
});

/** Každý test má vlastní klíč — počítadlo je sdílené napříč modulem. */
let poradi = 0;
const klic = () => `test-${++poradi}`;

describe("omezení pokusů", () => {
  it("pustí pět pokusů a šestý odmítne", () => {
    const k = klic();
    for (let i = 0; i < LIMIT.pocet; i++) {
      expect(prekrocilLimit(k, LIMIT), `pokus ${i + 1}`).toBe(false);
    }
    expect(prekrocilLimit(k, LIMIT)).toBe(true);
  });

  it("odmítnutý pokus okno neprodlouží", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T10:00:00Z"));
    const k = klic();
    for (let i = 0; i < LIMIT.pocet; i++) prekrocilLimit(k, LIMIT);

    // Někdo bouchá na dveře celou dobu okna.
    for (let i = 1; i < 40; i++) {
      vi.advanceTimersByTime(15_000);
      expect(prekrocilLimit(k, LIMIT)).toBe(true);
    }

    // Jakmile okno od posledního *započítaného* pokusu uplyne, jde to zas.
    vi.setSystemTime(new Date("2026-06-01T10:10:01Z"));
    expect(prekrocilLimit(k, LIMIT)).toBe(false);
  });

  it("klíče se nemíchají", () => {
    const a = klic();
    const b = klic();
    for (let i = 0; i < LIMIT.pocet; i++) prekrocilLimit(a, LIMIT);
    expect(prekrocilLimit(a, LIMIT)).toBe(true);
    expect(prekrocilLimit(b, LIMIT)).toBe(false);
  });
});
