import { describe, expect, it } from "vitest";
import { overHeslo, slabeHeslo, zahashuj } from "@/lib/auth/heslo";

describe("hesla do administrace", () => {
  it("stejné heslo pokaždé jiný hash (jiná sůl)", async () => {
    const a = await zahashuj("SpravneHeslo123");
    const b = await zahashuj("SpravneHeslo123");
    expect(a).not.toBe(b);
    expect(await overHeslo("SpravneHeslo123", a)).toBe(true);
    expect(await overHeslo("SpravneHeslo123", b)).toBe(true);
  });

  it("špatné heslo neprojde", async () => {
    const h = await zahashuj("SpravneHeslo123");
    expect(await overHeslo("SpravneHeslo124", h)).toBe(false);
    expect(await overHeslo("", h)).toBe(false);
  });

  it("hash nenese heslo v čitelné podobě", async () => {
    const h = await zahashuj("SpravneHeslo123");
    expect(h).not.toContain("SpravneHeslo123");
    expect(h.startsWith("scrypt$")).toBe(true);
  });

  it("porovnání s poškozeným nebo chybějícím hashem spadne do false, ne do výjimky", async () => {
    expect(await overHeslo("cokoli", null)).toBe(false);
    expect(await overHeslo("cokoli", "")).toBe(false);
    expect(await overHeslo("cokoli", "bcrypt$neco")).toBe(false);
    expect(await overHeslo("cokoli", "scrypt$x$y$z")).toBe(false);
  });

  it("unicode se normalizuje, ať se heslo dá zadat z jiné klávesnice", async () => {
    const slozene = "HésloDlouhe1"; // e + kombinovaná čárka
    const hotove = "HésloDlouhe1";
    expect(await overHeslo(hotove, await zahashuj(slozene))).toBe(true);
  });

  it("slabá hesla se odmítnou", () => {
    expect(slabeHeslo("kratke1A")).toMatch(/12 znaků/);
    expect(slabeHeslo("jenmalapismena123")).toMatch(/velké písmeno/);
    expect(slabeHeslo("BezCislicVubecTady")).toMatch(/číslici/);
    expect(slabeHeslo("SpravneHeslo123")).toBeNull();
    expect(slabeHeslo("Příšerně Žluťoučký1")).toBeNull();
  });
});
