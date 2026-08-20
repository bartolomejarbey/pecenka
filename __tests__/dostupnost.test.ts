import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Pojistka proti návratu vymyšlené obsazenosti.
 *
 * Web měl původně `getBookedDays()`, které obsazené termíny generovalo
 * determinovaným pseudonáhodným generátorem. Vypadalo to na první pohled
 * věrohodně, ale s ostrými rezervacemi by to znamenalo prodat jeden domek
 * dvakrát.
 *
 * Prohledává se **celý strom**, ne pevný seznam souborů. Když se soubor
 * přesune (jako při zavedení skupiny `app/(web)/`), pojistka platí dál —
 * a chytí i nový soubor, který by ten vzorec zavedl znovu.
 */

const KOREN = path.resolve(__dirname, "..");
const SLOZKY = ["app", "components", "lib"];
const PRIPONY = [".ts", ".tsx"];

const ZAKAZANE = [
  { vzor: /\bseededRandom\b/, proc: "generátor pseudonáhodné obsazenosti" },
  { vzor: /\bgetBookedDays\b/, proc: "vymyšlená obsazenost" },
  { vzor: /\bilustrační\s+(obsazenost|dostupnost)/i, proc: "ilustrační dostupnost" },
];

function souboryVe(slozka: string): string[] {
  const out: string[] = [];
  const projdi = (p: string) => {
    for (const polozka of readdirSync(p)) {
      if (polozka === "node_modules" || polozka.startsWith(".")) continue;
      const cesta = path.join(p, polozka);
      if (statSync(cesta).isDirectory()) projdi(cesta);
      else if (PRIPONY.includes(path.extname(cesta))) out.push(cesta);
    }
  };
  projdi(path.join(KOREN, slozka));
  return out;
}

describe("dostupnost pochází z databáze", () => {
  const soubory = SLOZKY.flatMap(souboryVe);

  it("prohledávají se opravdu všechny zdrojové soubory", () => {
    expect(soubory.length).toBeGreaterThan(50);
  });

  it("nikde se obsazenost nevyrábí", () => {
    const nalezy: string[] = [];
    for (const soubor of soubory) {
      const obsah = readFileSync(soubor, "utf8");
      for (const { vzor, proc } of ZAKAZANE) {
        if (vzor.test(obsah)) {
          nalezy.push(`${path.relative(KOREN, soubor)} — ${proc}`);
        }
      }
    }
    expect(nalezy, `Vymyšlená obsazenost se vrátila:\n${nalezy.join("\n")}`).toEqual([]);
  });

  it("server čte obsazenost z reservation_units i calendar_blocks", () => {
    const server = readFileSync(path.join(KOREN, "lib/booking/server.ts"), "utf8");
    expect(server).toContain("reservation_units");
    expect(server).toContain("calendar_blocks");
    expect(server).toContain("rate_calendar");
  });

  it("migrace má ochranu proti dvojímu prodeji", () => {
    const migrace = readFileSync(path.join(KOREN, "db/migrations/0001_init.sql"), "utf8");
    expect(migrace).toMatch(/EXCLUDE USING gist/);
    expect(migrace).toMatch(/daterange\(checkin, checkout, '\[\)'\) WITH &&/);
    expect(migrace).toMatch(/WHERE \(status IN \('hold','confirmed','checked_in'\)\)/);
  });

  it("rezervační stránka i detail domku načítají dostupnost ze serveru", () => {
    const rezervace = readFileSync(path.join(KOREN, "app/(web)/rezervace/page.tsx"), "utf8");
    expect(rezervace).toContain("nactiRezervacniData");
    const domek = readFileSync(path.join(KOREN, "app/(web)/domky/[slug]/page.tsx"), "utf8");
    expect(domek).toContain("nactiDostupnost");
  });
});
