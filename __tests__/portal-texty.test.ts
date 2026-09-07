import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { urciFazi } from "@/lib/portal/prehled";
import { sestavVzkaz, type PodkladZony } from "@/lib/luna/vzkaz";

/**
 * Kvalita textů v portálu hosta.
 *
 * Portál je jediné místo, kde s hostem mluví stroj bez člověka po ruce.
 * Testy tady nehlídají, jestli kód funguje — to dělají jinde. Hlídají, jestli
 * se do textů nevloudilo to, co se do nich vloudí vždycky: prázdné fráze,
 * korporátní slovník a nadšení, které nikdo necítí.
 *
 * Nejde o vkus. Každé pravidlo tu je proto, že jeho porušení má konkrétní
 * cenu: host, který větě nerozumí nebo jí nevěří, zavolá — a to je práce
 * navíc pro obě strany.
 */

const KOREN = path.resolve(__dirname, "..");
const cti = (p: string) => readFileSync(path.join(KOREN, p), "utf8");

/** Soubory, kterými portál mluví na hosta. */
const OBRAZOVKY = [
  "app/pobyt/(app)/page.tsx",
  "app/pobyt/(app)/domek/page.tsx",
  "app/pobyt/(app)/pomoc/page.tsx",
  "app/pobyt/(app)/odjezd/page.tsx",
  "app/pobyt/(app)/odjezd/dokonceni.tsx",
  "app/pobyt/prihlaseni/page.tsx",
  "components/pobyt/prvky.tsx",
  "components/pobyt/VzkazHostovi.tsx",
];

/**
 * Text, který uvidí host — bez kódu.
 *
 * Hrubé, ale stačí: zajímají nás české věty v JSX a v řetězcích, ne názvy
 * tříd ani proměnných. Komentáře se vyhazují, protože ty jsou pro nás.
 */
function textyProHosta(zdroj: string): string {
  return zdroj
    .replace(/\/\*[\s\S]*?\*\//g, " ") // blokové komentáře
    .replace(/^\s*\/\/.*$/gm, " ") // řádkové komentáře
    .replace(/className=\{?["'`][^"'`]*["'`]\}?/g, " ") // třídy
    .replace(/(href|src|klic|id|name|value)=["'][^"']*["']/g, " ");
}

describe("portál nemluví jako brožura", () => {
  /**
   * Fráze, které nic neříkají.
   *
   * Každá z nich je znak toho, že text psal někdo, kdo neměl co říct.
   * „Nezapomeňte" hosta poučuje, „prosím vezměte na vědomí" je úřad,
   * „těšíme se na vás" se dá napsat i tehdy, když se nikdo netěší.
   */
  const PRAZDNE_FRAZE = [
    "nezapomeňte",
    "vezměte na vědomí",
    "upozorňujeme",
    "je nutné",
    "je nezbytné",
    "veškeré",
    "prostřednictvím",
    "v případě, že",
    "za účelem",
    "neváhejte",
    "rádi bychom vás informovali",
    "děkujeme za pochopení",
    "těšíme se na vás",
    "váš tým",
    "naše služby",
    "uživatel",
    "zákazník",
    "klient",
  ];

  it.each(OBRAZOVKY)("%s", (soubor) => {
    const text = textyProHosta(cti(soubor)).toLowerCase();
    for (const fraze of PRAZDNE_FRAZE) {
      expect(text, `„${fraze}" v ${soubor}`).not.toContain(fraze);
    }
  });

  it("host se oslovuje vy, ne uživatel nebo klient", () => {
    for (const soubor of OBRAZOVKY) {
      const text = textyProHosta(cti(soubor)).toLowerCase();
      expect(text, soubor).not.toMatch(/\bhoste\b|\buživateli\b/);
    }
  });

  /**
   * Vykřičník je v portálu podezřelý.
   *
   * Host čte tyhle obrazovky unavený, v autě nebo večer v posteli. Nadšení,
   * které nesdílí, ho jen odrazuje. Jeden se dá obhájit, tři už jsou reklama.
   */
  it("nekřičí", () => {
    for (const soubor of OBRAZOVKY) {
      // Jen vykřičník na konci slova — `!` jako negace nebo non-null v kódu
      // se nepočítá.
      const veVete = textyProHosta(cti(soubor)).match(/[a-zá-ž]!/gi) ?? [];
      expect(veVete.length, `vykřičníky v ${soubor}: ${veVete.join(" ")}`).toBe(0);
    }
  });
});

describe("portál nikdy nenechá hosta bez odpovědi", () => {
  const ZAKLAD: PodkladZony = {
    klic: "seating",
    nazev: "Sedačka",
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

  it("každý tón vzkazu má nadpis, text i uzavření", () => {
    const varianty = [
      sestavVzkaz([], KONTAKT),
      sestavVzkaz([{ ...ZAKLAD, zavaznost: "dirt", prosba: "Mrkněte prosím na nádobí." }], KONTAKT),
      sestavVzkaz([{ ...ZAKLAD, zavaznost: "damage_major", jistota: 0.95 }], KONTAKT),
      sestavVzkaz([{ ...ZAKLAD, potrebaNoveFoto: true }], KONTAKT),
    ];
    for (const v of varianty) {
      expect(v.nadpis.length, v.ton).toBeGreaterThan(4);
      expect(v.text.length, v.ton).toBeGreaterThan(30);
      expect(v.patka.length, v.ton).toBeGreaterThan(30);
      // Věta musí být dokončená. Dvojtečka projde jen tam, kde uvozuje
      // seznam proseb — jinak je to půlka věty a vypadá to jako chyba.
      expect(v.text.trim(), v.ton).toMatch(v.prosby.length ? /[.?:]$/ : /[.?]$/);
    }
  });

  it("v každé fázi pobytu se ví, co je teď", () => {
    // Fáze musí pokrýt celou osu, i den, kdy pobyt začíná a končí.
    const dnes = new Date("2026-06-15T12:00:00");
    const den = (p: number) => {
      const d = new Date(dnes);
      d.setDate(d.getDate() + p);
      return d;
    };
    const vsechny = new Set<string>();
    for (let prijezd = -6; prijezd <= 6; prijezd++) {
      for (let noci = 1; noci <= 7; noci++) {
        vsechny.add(urciFazi(den(prijezd), den(prijezd + noci), dnes));
      }
    }
    expect([...vsechny].sort()).toEqual(["behem", "odjezd", "po", "pred", "prijezd"]);
  });
});
