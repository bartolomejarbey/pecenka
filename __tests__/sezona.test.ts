import { describe, expect, it } from "vitest";
import { mesicVPraze, rocniObdobiKDatu, sezonaKDatu } from "@/lib/sezona";

describe("sezóna pro mapu okolí", () => {
  it.each([
    ["2026-01-15T12:00:00Z", "zima"],
    ["2026-03-31T10:00:00Z", "zima"],
    ["2026-04-01T10:00:00Z", "leto"],
    ["2026-07-20T10:00:00Z", "leto"],
    ["2026-11-30T10:00:00Z", "leto"],
    ["2026-12-01T10:00:00Z", "zima"],
  ])("%s → %s", (iso, ocekavano) => {
    expect(sezonaKDatu(new Date(iso))).toBe(ocekavano);
  });

  it("měsíc bere v pražském čase, ne v UTC", () => {
    // V Praze už je 1. prosince 00:30 (UTC+1), v UTC ještě 30. listopadu.
    expect(mesicVPraze(new Date("2026-11-30T23:30:00Z"))).toBe(12);
    expect(sezonaKDatu(new Date("2026-11-30T23:30:00Z"))).toBe("zima");
    // A naopak: 31. března 22:30 UTC je v Praze (UTC+2) už 1. dubna.
    expect(sezonaKDatu(new Date("2026-03-31T22:30:00Z"))).toBe("leto");
  });
});

describe("roční období pro pás na úvodu", () => {
  it.each([
    ["2026-03-01T12:00:00Z", 0],
    ["2026-05-31T12:00:00Z", 0],
    ["2026-06-01T12:00:00Z", 1],
    ["2026-08-31T12:00:00Z", 1],
    ["2026-09-01T12:00:00Z", 2],
    ["2026-11-30T12:00:00Z", 2],
    ["2026-12-01T12:00:00Z", 3],
    ["2026-02-28T12:00:00Z", 3],
  ])("%s → index %i", (iso, index) => {
    expect(rocniObdobiKDatu(new Date(iso))).toBe(index);
  });
});
