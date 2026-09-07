import { describe, expect, it } from "vitest";
import { formatTelefon, telOdkaz, vokativ } from "@/lib/format";

describe("oslovení", () => {
  it.each([
    ["Eva", "Evo"],
    ["Jana", "Jano"],
    ["Petr", "Petre"],
    ["Jan", "Jane"],
    ["Pavel", "Pavle"],
    ["Jakub", "Jakube"],
    ["Tomáš", "Tomáši"],
    ["Ondřej", "Ondřeji"],
    ["Marek", "Marku"],
    ["Zdeněk", "Zdeňku"],
    ["Vojtěch", "Vojtěchu"],
    ["Dominik", "Dominiku"],
    ["Josef", "Josefe"],
    ["Lucie", "Lucie"],
    ["Marie", "Marie"],
    ["Andy", "Andy"],
    ["Jan Novák", "Jane"],
  ])("%s → %s", (vstup, ocekavano) => {
    expect(vokativ(vstup)).toBe(ocekavano);
  });

  it("prázdné nebo jednopísmenné nechá být", () => {
    expect(vokativ("")).toBe("");
    expect(vokativ("A")).toBe("A");
  });
});

describe("telefon", () => {
  it("rozdělí devítimístné číslo po trojicích", () => {
    expect(formatTelefon("+420604555666")).toBe("+420 604 555 666");
    expect(formatTelefon("604555666")).toBe("604 555 666");
    expect(formatTelefon("+420 604 555 666")).toBe("+420 604 555 666");
  });
  it("cizí tvar nechá být", () => {
    expect(formatTelefon("+1 555 0100")).toBe("+1 555 0100");
  });
  it("odkaz nemá mezery", () => {
    expect(telOdkaz("+420 604 555 666")).toBe("tel:+420604555666");
  });
});
