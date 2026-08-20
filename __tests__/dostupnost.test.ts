import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Pojistka proti návratu vymyšlené obsazenosti.
 *
 * Web měl původně `getBookedDays()`, které obsazené termíny generovalo
 * determinovaným pseudonáhodným generátorem. Vypadalo to na první pohled
 * věrohodně, ale s ostrými rezervacemi by to znamenalo prodat jeden domek
 * dvakrát. Tenhle test spadne, kdyby se to jakkoli vrátilo.
 */

const KOREN = path.resolve(__dirname, "..");
const cti = (p: string) => readFileSync(path.join(KOREN, p), "utf8");

const ZAKAZANE = [
  { vzor: /seededRandom/, proc: "generátor pseudonáhodné obsazenosti" },
  { vzor: /getBookedDays/, proc: "vymyšlená obsazenost" },
  { vzor: /\bilustrační\s+(obsazenost|dostupnost)/i, proc: "ilustrační dostupnost" },
];

const SOUBORY = [
  "lib/booking/index.ts",
  "lib/booking/server.ts",
  "components/booking/BookingWizard.tsx",
  "components/booking/Calendar.tsx",
  "components/house/Availability.tsx",
  "app/rezervace/page.tsx",
  "app/domky/[slug]/page.tsx",
];

describe("dostupnost pochází z databáze", () => {
  for (const soubor of SOUBORY) {
    it(`${soubor} nevyrábí obsazenost sám`, () => {
      const obsah = cti(soubor);
      for (const { vzor, proc } of ZAKAZANE) {
        expect(obsah, `${soubor} obsahuje ${proc}`).not.toMatch(vzor);
      }
    });
  }

  it("server čte obsazenost z reservation_units i calendar_blocks", () => {
    const server = cti("lib/booking/server.ts");
    expect(server).toContain("reservation_units");
    expect(server).toContain("calendar_blocks");
    expect(server).toContain("rate_calendar");
  });

  it("migrace má ochranu proti dvojímu prodeji", () => {
    const migrace = cti("db/migrations/0001_init.sql");
    expect(migrace).toMatch(/EXCLUDE USING gist/);
    expect(migrace).toMatch(/daterange\(checkin, checkout, '\[\)'\) WITH &&/);
    expect(migrace).toMatch(/WHERE \(status IN \('hold','confirmed','checked_in'\)\)/);
  });
});
