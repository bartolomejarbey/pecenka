import type { Zavaznost } from "./model";

/**
 * Vzkaz, který si po odeslání protokolu přečte host.
 *
 * Tohle je nejcitlivější text v celém systému. Píše ho stroj, čte ho člověk,
 * který stojí s taškou v ruce v cizím domku — a nemá kolem sebe nikoho, kdo
 * by mu to vysvětlil. Proto jsou pravidla tvrdá a **jsou v kódu, ne v promptu**:
 *
 *  1. **Host se nikdy nedozví, že něco rozbil.** Ani náznakem. Když je
 *     podezření na poškození, dostane prosbu o telefonát a nic víc. O penězích
 *     i o tom, jestli vůbec o škodu jde, rozhoduje člověk — a ten si to s ním
 *     nejdřív probere.
 *  2. **Nepořádek není škoda.** Neustlaná postel a nádobí ve dřezu jsou prosba
 *     o laskavost, ne nález. Když host prosbu nesplní, nestane se nic.
 *  3. **Jedna žádost naráz.** Když je důvod volat, prosby o srovnání peřiny
 *     se zahodí. Tři úkoly znamenají nula splněných úkolů.
 *  4. **Mlčení je platná odpověď.** Když není o co poprosit, poděkuje se
 *     a je konec. Vymyšlená připomínka jen proto, aby text nebyl krátký,
 *     je horší než žádná.
 *
 * Funkce je čistá — žádná databáze, žádné volání modelu. Jde ji projet testem
 * na desítkách kombinací, a taky se to dělá.
 */

export type PodkladZony = {
  klic: string;
  nazev: string;
  zavaznost: Zavaznost;
  jistota: number;
  /** Práh z checklistu. Vzkaz ho nepoužívá, rozhoduje podle něj majitelova fronta. */
  prahEskalace: number;
  stabilita: "stable" | "unstable" | null;
  zarovnani: "good" | "fair" | "poor";
  potrebaNoveFoto: boolean;
  svetloUhel: boolean;
  neporadek: boolean;
  /** Prosba od modelu, už očištěná. */
  prosba: string | null;
};

export type Vzkaz = {
  ton: "dik" | "prosba" | "telefon" | "dofoceni";
  nadpis: string;
  /** Hlavní odstavec. */
  text: string;
  /** Odrážky s prosbami. Nejvýš tři. */
  prosby: string[];
  /** Číslo, na které má host zavolat. `null` u ostatních tónů. */
  telefon: string | null;
  /** Zóny, kvůli kterým se volá. Pro hosta, ať ví, kam se podívat. */
  zonyKVolani: string[];
  /** Zóny, které se nepovedlo porovnat a host je má vyfotit znovu. */
  zonyKDofoceni: { klic: string; nazev: string }[];
  /** Uzavírací věta — vždy zmiňuje, že rozhoduje člověk. */
  patka: string;
};

const POSKOZENI: Zavaznost[] = ["damage_minor", "damage_major", "missing"];

/** Nejvýš tři prosby. Čtvrtá už je seznam úkolů a ten nikdo nesplní. */
const MAX_PROSEB = 3;

/** Rozhodne, jestli zóna stačí na telefonát. */
export function volatKvuliZone(z: PodkladZony): boolean {
  if (!POSKOZENI.includes(z.zavaznost)) return false;
  // Snímky na sebe nesedí nebo si model říká o nové foto — porovnání
  // neproběhlo pořádně a host za to nemůže.
  if (z.zarovnani === "poor" || z.potrebaNoveFoto) return false;
  // Dva běhy se neshodly. Nestabilnímu nálezu se nedá věřit natolik,
  // aby kvůli němu někdo volal.
  if (z.stabilita === "unstable") return false;
  // Model sám říká, že to může být světlo, úhel nebo nepořádek.
  if (z.svetloUhel || z.neporadek) return false;
  return z.jistota >= PRAH_TELEFONU;
}

/**
 * Laťka pro telefonát.
 *
 * Schválně **jedno číslo pro všechny zóny**, ne práh z checklistu. Ten je
 * nastavený pro rozhodnutí „zakládat případ škody" a u prosklené stěny je
 * 0,9, protože prasklina se plete s odrazem. Jenže telefonát není obvinění —
 * je to prosba o dvě minuty rozhovoru. Když si systém myslí ze tří čtvrtin,
 * že je něco rozbité, a host je ještě na místě, je zavolat správně i tehdy,
 * když se to nakonec ukáže jako odraz. Prohodit to obráceně stojí opravu,
 * o které se majitel dozví až za týden od uklízečky.
 *
 * Sedm desetin je zároveň nad hodnotou, na kterou se ořezává nález, jehož
 * protiargument obstál (0,75 → projde) i nález nestabilní (0,5 → neprojde).
 */
const PRAH_TELEFONU = 0.7;

export function sestavVzkaz(
  zony: PodkladZony[],
  kontakt: { telefon: string; email: string },
  volby: { uzJsmeProsiliOFotku?: boolean } = {},
): Vzkaz {
  const kVolani = zony.filter(volatKvuliZone);

  if (kVolani.length) {
    const nazvy = kVolani.map((z) => z.nazev);
    // Nejvýš dvě jména. Delší výčet zní jako obžaloba, i když jí není.
    const vypis = nazvy.slice(0, 2).join(" a ");
    return {
      ton: "telefon",
      nadpis: "Zavolejte nám prosím, než odjedete",
      text:
        `Děkujeme, fotky máme. Na některých snímcích vidím něco, čemu si nejsem jistý, ` +
        `a rád bych to s vámi probral, dokud jste ještě na místě — bývá to během minuty ` +
        `vyřešené. Zavolejte prosím na ${kontakt.telefon}.`,
      prosby: [],
      telefon: kontakt.telefon,
      zonyKVolani: nazvy,
      zonyKDofoceni: [],
      patka:
        `Týká se to místa: ${vypis}${nazvy.length > 2 ? " a dalších" : ""}. ` +
        `Klidně to bude odraz nebo úhel fotky — proto voláme, a ne účtujeme. ` +
        `Dokud si to spolu neprojdeme, nic se neúčtuje. Kdyby se vám nedovolalo, ` +
        `napište na ${kontakt.email} a ozveme se vám sami.`,
    };
  }

  /*
   * Fotka, kterou nešlo porovnat.
   *
   * Model si o nový snímek umí říct (`needs_reshoot`) a obrazová analýza
   * pozná, že host fotil odjinud. Dosud to nevedlo k ničemu, co by host mohl
   * udělat — po odeslání ho portál poslal pryč. Prosba o jednu fotku navíc je
   * levnější než zóna, kterou nikdo neposoudí.
   *
   * Ptáme se **jen jednou**. Druhá prosba už je otravování a stejně by
   * skončila stejně.
   */
  const kDofoceni = zony.filter((z) => z.potrebaNoveFoto);
  if (kDofoceni.length && !volby.uzJsmeProsiliOFotku) {
    const vice = kDofoceni.length > 1;
    return {
      ton: "dofoceni",
      nadpis: vice ? "Ještě dvě fotky, prosím" : "Ještě jednu fotku, prosím",
      text:
        `Fotky máme, ale u ${vice ? "některých" : "jedné"} si nejsem jistý, jestli se povedly — ` +
        `${vice ? "vyšly" : "vyšla"} z jiného místa než reference a nedá se ${vice ? "je" : "ji"} spolehlivě porovnat. ` +
        `Vyfotíte ${vice ? "je" : "ji"} prosím ještě jednou? Zabere to minutu a je to i ve váš prospěch — ` +
        `co nejde porovnat, to nemáme čím doložit.`,
      prosby: [],
      telefon: null,
      zonyKVolani: [],
      zonyKDofoceni: kDofoceni.slice(0, 4).map((z) => ({ klic: z.klic, nazev: z.nazev })),
      patka:
        "Kdyby to nešlo, nic se neděje — jeďte v klidu domů a my se ozveme, jen kdyby " +
        "bylo opravdu něco potřeba.",
    };
  }

  const prosby = zony
    .map((z) => z.prosba)
    .filter((p): p is string => Boolean(p))
    // Model občas napíše dvakrát totéž jinými slovy. Bereme první.
    .filter((p, i, pole) => pole.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i)
    .slice(0, MAX_PROSEB);

  if (prosby.length) {
    return {
      ton: "prosba",
      nadpis: "Děkujeme, protokol máme",
      text:
        prosby.length === 1
          ? "Všechno vypadá dobře. Kdyby zbyla chvilka, máme jednu malou prosbu:"
          : "Všechno vypadá dobře. Kdyby zbyla chvilka, máme pár malých proseb:",
      prosby,
      telefon: null,
      zonyKVolani: [],
      zonyKDofoceni: [],
      patka:
        "Nic z toho není povinné a nic se za to neúčtuje — jde jen o to, aby další " +
        "hosté našli domek tak hezký, jak jste ho našli vy. Šťastnou cestu domů.",
    };
  }

  return {
    ton: "dik",
    nadpis: "Hotovo, děkujeme",
    text:
      "Domek vypadá přesně tak, jak jsme ho předávali. Nic víc od vás nepotřebujeme " +
      "a nikam volat nemusíte.",
    prosby: [],
    telefon: null,
    zonyKVolani: [],
    zonyKDofoceni: [],
    patka:
      "Fotky si necháme 90 dní a pak je smažeme. Kdyby přece jen bylo něco potřeba " +
      "řešit, ozveme se vám osobně — automat vám nikdy nic neúčtuje. Šťastnou cestu domů.",
  };
}

/**
 * Vzkaz pro protokol, který se nepodařilo vyhodnotit.
 *
 * Host odeslal fotky a nesmí zůstat viset na točícím se kolečku, když
 * spadne model nebo úložiště. Že se to nepovedlo, je náš problém, ne jeho.
 */
export function vzkazBezVyhodnoceni(): Vzkaz {
  return {
    ton: "dik",
    nadpis: "Hotovo, děkujeme",
    text:
      "Fotky máme uložené. Projdeme je a ozveme se jen tehdy, kdyby bylo něco " +
      "potřeba řešit.",
    prosby: [],
    telefon: null,
    zonyKVolani: [],
    zonyKDofoceni: [],
    patka:
      "Fotky si necháme 90 dní a pak je smažeme. Rozhoduje o nich vždycky člověk. " +
      "Šťastnou cestu domů.",
  };
}

/**
 * Sloučení vzkazů z víc domků do jednoho.
 *
 * „Celý les" je jedna rezervace a dva fyzické domky, tedy dvě inspekce —
 * ale host má jeden displej a jednu chvíli, kdy si to přečte. Dva vzkazy pod
 * sebou by znamenaly, že si přečte jen ten první.
 *
 * Rozhoduje nejsilnější tón: když je u jednoho domku důvod zavolat, platí to
 * pro celý pobyt a prosby o srovnání peřiny se zahodí — pravidlo „jedna
 * žádost naráz" nezná hranice domku.
 */
const SILA: Record<Vzkaz["ton"], number> = { telefon: 3, dofoceni: 2, prosba: 1, dik: 0 };

export function slucVzkazy(vzkazy: Vzkaz[]): Vzkaz {
  if (!vzkazy.length) return vzkazBezVyhodnoceni();
  if (vzkazy.length === 1) return vzkazy[0];

  const nejsilnejsi = vzkazy.reduce((a, b) => (SILA[b.ton] > SILA[a.ton] ? b : a));
  const stejne = vzkazy.filter((v) => v.ton === nejsilnejsi.ton);

  return {
    ...nejsilnejsi,
    prosby: [...new Set(stejne.flatMap((v) => v.prosby))].slice(0, MAX_PROSEB),
    zonyKVolani: [...new Set(stejne.flatMap((v) => v.zonyKVolani))],
    zonyKDofoceni: stejne
      .flatMap((v) => v.zonyKDofoceni)
      .filter((z, i, p) => p.findIndex((q) => q.klic === z.klic) === i)
      .slice(0, 4),
  };
}
