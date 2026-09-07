import { describe, expect, it } from "vitest";
import { ocistiProsbu } from "@/lib/luna/model";
import { sestavVzkaz, volatKvuliZone, type PodkladZony } from "@/lib/luna/vzkaz";

/**
 * Vzkaz hostovi.
 *
 * Nejcitlivější text v systému: píše ho stroj, čte ho člověk stojící s taškou
 * v cizím domku. Testuje se hlavně to, co se **nesmí** stát — že host dostane
 * obvinění, že se z nepořádku stane škoda, nebo že mu automat sdělí, co
 * rozbil, dřív než se na to kdokoli podívá.
 */

const ZAKLAD: PodkladZony = {
  klic: "seating",
  nazev: "Sedačka a nábytek",
  zavaznost: "none",
  jistota: 0,
  prahEskalace: 0.8,
  stabilita: null,
  zarovnani: "good",
  potrebaNoveFoto: false,
  svetloUhel: false,
  neporadek: false,
  prosba: null,
};

const KONTAKT = { telefon: "+420 733 418 260", email: "ahoj@sedmyles.cz" };
const zona = (u: Partial<PodkladZony>): PodkladZony => ({ ...ZAKLAD, ...u });

/**
 * Slova, kterými by automat hosta obvinil.
 *
 * Schválně tu **není** „účtovat": vzkaz o penězích mluvit smí, ale jen
 * v záporu („nic se neúčtuje"), a to se ověřuje zvlášť. Zakázané je tvrzení,
 * že se něco stalo a že za to host může.
 */
const OBVINENI = [
  "škod", "poškoz", "rozbil", "rozbit", "prask", "propál",
  "zaplatíte", "uhraďte", "strhne", "kauc", "vinu", "vaší vinou",
];

function celyText(v: ReturnType<typeof sestavVzkaz>): string {
  return [v.nadpis, v.text, v.patka, ...v.prosby].join(" ").toLowerCase();
}

describe("kdy se volá hostovi", () => {
  it("jasné poškození s vysokou jistotou → telefonát", () => {
    expect(volatKvuliZone(zona({ zavaznost: "damage_major", jistota: 0.9 }))).toBe(true);
  });

  it("chybějící vybavení se počítá jako důvod zavolat", () => {
    expect(volatKvuliZone(zona({ zavaznost: "missing", jistota: 0.8 }))).toBe(true);
  });

  it("nepořádek nikdy — ani když ho model označil za poškození", () => {
    expect(
      volatKvuliZone(zona({ zavaznost: "damage_major", jistota: 0.95, neporadek: true })),
    ).toBe(false);
  });

  it("světlo a úhel nikdy", () => {
    expect(
      volatKvuliZone(zona({ zavaznost: "damage_minor", jistota: 0.95, svetloUhel: true })),
    ).toBe(false);
  });

  it("nestabilní nález nikdy — dva běhy se neshodly", () => {
    expect(
      volatKvuliZone(zona({ zavaznost: "damage_major", jistota: 0.95, stabilita: "unstable" })),
    ).toBe(false);
  });

  it("snímky, které na sebe nesedí, nikdy", () => {
    expect(
      volatKvuliZone(zona({ zavaznost: "damage_major", jistota: 0.95, zarovnani: "poor" })),
    ).toBe(false);
  });

  it("žádost o nové foto má přednost před nálezem", () => {
    expect(
      volatKvuliZone(zona({ zavaznost: "damage_major", jistota: 0.95, potrebaNoveFoto: true })),
    ).toBe(false);
  });

  it("nízká jistota nestačí", () => {
    expect(volatKvuliZone(zona({ zavaznost: "damage_major", jistota: 0.69 }))).toBe(false);
    expect(volatKvuliZone(zona({ zavaznost: "damage_major", jistota: 0.7 }))).toBe(true);
  });

  it("opotřebení není poškození", () => {
    expect(volatKvuliZone(zona({ zavaznost: "wear", jistota: 0.99 }))).toBe(false);
    expect(volatKvuliZone(zona({ zavaznost: "dirt", jistota: 0.99 }))).toBe(false);
  });
});

describe("skládání vzkazu", () => {
  it("bez nálezu poděkuje a nikam neposílá", () => {
    const v = sestavVzkaz([zona({})], KONTAKT);
    expect(v.ton).toBe("dik");
    expect(v.telefon).toBeNull();
    expect(v.prosby).toEqual([]);
  });

  it("z prázdného protokolu taky poděkuje", () => {
    expect(sestavVzkaz([], KONTAKT).ton).toBe("dik");
  });

  it("nepořádek se změní v prosbu, ne v nález", () => {
    const v = sestavVzkaz(
      [zona({ zavaznost: "dirt", prosba: "Kdyby zbyla chvilka, mrkněte prosím na nádobí ve dřezu." })],
      KONTAKT,
    );
    expect(v.ton).toBe("prosba");
    expect(v.prosby).toHaveLength(1);
    expect(v.telefon).toBeNull();
  });

  it("proseb je nejvýš tři, i když jich model napíše šest", () => {
    const v = sestavVzkaz(
      Array.from({ length: 6 }, (_, i) =>
        zona({ klic: `z${i}`, zavaznost: "dirt", prosba: `Prosba číslo ${i}.` }),
      ),
      KONTAKT,
    );
    expect(v.prosby).toHaveLength(3);
  });

  it("stejná prosba dvakrát se neopakuje", () => {
    const v = sestavVzkaz(
      [
        zona({ klic: "a", zavaznost: "dirt", prosba: "Srovnejte prosím peřinu." }),
        zona({ klic: "b", zavaznost: "dirt", prosba: "SROVNEJTE PROSÍM PEŘINU." }),
      ],
      KONTAKT,
    );
    expect(v.prosby).toHaveLength(1);
  });

  it("při důvodu volat se prosby o peřinu zahodí — jedna žádost naráz", () => {
    const v = sestavVzkaz(
      [
        zona({ klic: "a", zavaznost: "damage_major", jistota: 0.9 }),
        zona({ klic: "b", zavaznost: "dirt", prosba: "Srovnejte prosím peřinu." }),
      ],
      KONTAKT,
    );
    expect(v.ton).toBe("telefon");
    expect(v.prosby).toEqual([]);
    expect(v.telefon).toBe(KONTAKT.telefon);
  });

  it("vypisuje nejvýš dvě místa, aby to neznělo jako obžaloba", () => {
    const v = sestavVzkaz(
      ["a", "b", "c"].map((k) =>
        zona({ klic: k, nazev: `Zóna ${k}`, zavaznost: "damage_major", jistota: 0.9 }),
      ),
      KONTAKT,
    );
    expect(v.zonyKVolani).toHaveLength(3);
    expect(v.patka).toContain("Zóna a a Zóna b");
    expect(v.patka).not.toContain("Zóna c");
  });

  it("nepovedenou fotku řeší prosbou o přefocení, ne nálezem", () => {
    const v = sestavVzkaz([zona({ potrebaNoveFoto: true })], KONTAKT);
    expect(v.ton).toBe("dofoceni");
    expect(v.zonyKDofoceni).toEqual([{ klic: "seating", nazev: "Sedačka a nábytek" }]);
  });

  it("o fotku prosí jen jednou", () => {
    const v = sestavVzkaz([zona({ potrebaNoveFoto: true })], KONTAKT, {
      uzJsmeProsiliOFotku: true,
    });
    expect(v.ton).toBe("dik");
  });

  it("telefonát má přednost před prosbou o přefocení jiné zóny", () => {
    const v = sestavVzkaz(
      [
        zona({ klic: "a", zavaznost: "damage_major", jistota: 0.9 }),
        zona({ klic: "b", potrebaNoveFoto: true }),
      ],
      KONTAKT,
    );
    expect(v.ton).toBe("telefon");
  });
});

describe("žádný tón hosta neobviní", () => {
  const varianty = [
    ["bez nálezu", sestavVzkaz([zona({})], KONTAKT)],
    ["prosba", sestavVzkaz([zona({ zavaznost: "dirt", prosba: "Mrkněte prosím na nádobí." })], KONTAKT)],
    ["telefon", sestavVzkaz([zona({ zavaznost: "damage_major", jistota: 0.95 })], KONTAKT)],
    ["dofocení", sestavVzkaz([zona({ potrebaNoveFoto: true })], KONTAKT)],
  ] as const;

  for (const [nazev, v] of varianty) {
    it(`${nazev} neobsahuje obviňující slovo`, () => {
      const text = celyText(v);
      for (const slovo of OBVINENI) {
        expect(text, `„${slovo}" ve vzkazu`).not.toContain(slovo);
      }
    });

    it(`${nazev} nikde neuvádí částku`, () => {
      expect(celyText(v)).not.toMatch(/\d+\s*(kč|korun)/);
    });
  }

  it("i při telefonátu se říká, že se nic neúčtuje", () => {
    const v = sestavVzkaz([zona({ zavaznost: "damage_major", jistota: 0.95 })], KONTAKT);
    expect(v.patka).toContain("nic se neúčtuje");
  });
});

describe("prosba od modelu se čistí", () => {
  it("u poškození se zahodí vždycky", () => {
    expect(ocistiProsbu("Srovnejte prosím peřinu.", "damage_minor")).toBeNull();
    expect(ocistiProsbu("Srovnejte prosím peřinu.", "missing")).toBeNull();
    expect(ocistiProsbu("Srovnejte prosím peřinu.", "wear")).toBeNull();
  });

  it("u nepořádku projde", () => {
    expect(ocistiProsbu("Srovnejte prosím peřinu.", "dirt")).toBe("Srovnejte prosím peřinu.");
  });

  it("zahodí prosbu, která mluví o poškození", () => {
    expect(ocistiProsbu("Všimli jsme si poškození sedačky.", "dirt")).toBeNull();
    expect(ocistiProsbu("Prosím uhraďte škodu na stolku.", "none")).toBeNull();
    expect(ocistiProsbu("Strhneme to z kauce.", "dirt")).toBeNull();
  });

  it("zahodí prázdné, příliš krátké i nesmyslně dlouhé", () => {
    expect(ocistiProsbu("", "dirt")).toBeNull();
    expect(ocistiProsbu("ok", "dirt")).toBeNull();
    expect(ocistiProsbu("a".repeat(200), "dirt")).toBeNull();
    expect(ocistiProsbu(null, "dirt")).toBeNull();
    expect(ocistiProsbu(42, "dirt")).toBeNull();
  });

  it("srovná bílé znaky", () => {
    expect(ocistiProsbu("  Srovnejte\n  prosím   peřinu.  ", "dirt")).toBe(
      "Srovnejte prosím peřinu.",
    );
  });
});
