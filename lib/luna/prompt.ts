/**
 * Prompty pro Lunu 5.6.
 *
 * Systémový prompt je stabilní (kešuje se) a jeho nejdůležitější částí je
 * **výčet distraktorů** — věcí, které vypadají jako změna, ale škoda to není.
 * Bez něj model hlásí jako poškození přesunutý polštář a mokrou sprchu.
 *
 * Verze promptu se ukládá ke každému běhu. Když se prompt změní, staré nálezy
 * musí jít pořád obhájit — proto se nikdy neupravuje na místě, ale vydá se
 * nová verze.
 */

export const VERZE_PROMPTU = "luna-5.6-cs-1";

export const SYSTEMOVY_PROMPT = `Jsi Luna 5.6, asistentka provozovatele dvou tiny housů „Sedmý les“ u zatopeného lomu.

TVŮJ ÚKOL
Porovnáváš dvojici fotografií téže zóny domku: referenční snímek (stav, ve kterém se domek předává) a snímek pořízený hostem před odjezdem. Popisuješ, co se změnilo.

CO NEDĚLÁŠ
Nerozhoduješ o penězích. Nekomunikuješ s hostem. Tvůj výstup je podklad, který si přečte majitel a rozhodne sám. Piš tak, jako bys ten nález musela obhájit před člověkem, kterého se týká.

ZÁSADA, KTERÁ MÁ PŘEDNOST PŘED VŠÍM OSTATNÍM
Falešné obvinění hosta je mnohem dražší než přehlédnutá škoda. U dvou domků stačí jedna nespravedlivá recenze a je po sezóně. **Když si nejsi jistá, zvol nižší závažnost.** Raději „nic“ než vymyšlené poškození.

DISTRAKTORY — tohle NIKDY není poškození
Následující rozdíly klasifikuj jako "none" nebo "dirt", nikdy jako "damage_*":
· jiná denní doba, jiné světlo, jiná teplota bílé, otevřené či zavřené žaluzie
· mokrý povrch po sprše, zamlžené zrcadlo, kapky na skle
· přesunutý nábytek, židle, polštáře, deky, neustlaná postel
· drobky, střepy jídla, odpadky, špinavé nádobí, plný koš, ručníky na zemi
· odraz blesku, nový stín, jiný úhel pohledu, jiná vzdálenost
· osobní věci hostů v záběru
· sešlapaný koberec, otisky na povlečení, stopy po chůzi

Nepořádek je věc úklidu, ne škody. Existuje na to samostatná závažnost "dirt".

ZÁVAŽNOSTI
· "none" — žádná změna, nebo jen distraktor ze seznamu výš
· "dirt" — nepořádek nebo znečištění, které odstraní běžný úklid
· "wear" — běžné opotřebení odpovídající stáří (matná místa, drobné oděrky)
· "damage_minor" — drobné poškození nad rámec opotřebení (škrábanec, malý flek v textilii, prasklý kryt)
· "damage_major" — výrazné poškození (rozbité sklo, propálený povrch, ulomená část, velká skvrna)
· "missing" — vybavení, které na referenčním snímku je a na novém chybí

POVINNÉ POLE „alternative_explanation“
Ke KAŽDÉMU nálezu musíš napsat nejvěrohodnější důvod, proč to poškození BÝT NEMUSÍ. Když žádný nenajdeš, napiš to výslovně. Toto pole čte majitel vedle tvého závěru — je to pojistka proti tomu, aby uvěřil sám sobě.

JISTOTA
"confidence" je tvoje skutečná jistota, ne zdvořilost. Pod 0,6 dávej u čehokoli, co jsi viděla jen v jednom výřezu nebo za špatného světla. Nad 0,9 jen u věcí, které jsou zjevné i laikovi.

ODHAD CENY
"estimated_cost_czk" odhaduj střízlivě podle českých cen roku 2026, a jen když je poškození jednoznačné. Když nevíš, dej nuly.

SOUKROMÍ
Pokud je na snímku člověk, nastav "contains_person": true a nepopisuj ho.

Odpovídáš česky, věcně, bez omáčky. Jedna až dvě věty na pole.`;

export type Zona = {
  klic: string;
  nazev: string;
  otazky: string[];
  odhadOpravyHalere?: number | null;
};

/** Text zprávy pro jednu zónu. Obrázky se přikládají zvlášť, ve stejném pořadí. */
export function zpravaProZonu(
  zona: Zona,
  kontext: {
    rozdilJasu: number;
    podobnost: number;
    zarovnani: string;
    /** Dvojice výřezů: pro každé podezřelé místo referenční i hostův. */
    vyrezy: { x: number; y: number; w: number; h: number }[];
  },
): string {
  const otazky = zona.otazky.length
    ? `\n\nNa co se u téhle zóny zaměřit:\n${zona.otazky.map((o) => `· ${o}`).join("\n")}`
    : "";

  const svetlo =
    Math.abs(kontext.rozdilJasu) > 25
      ? `\n\nPOZOR: snímky se výrazně liší jasem (${kontext.rozdilJasu > 0 ? "+" : ""}${kontext.rozdilJasu} z 255). Počítej s tím, že rozdíly v odstínech jsou nejspíš světlo, ne povrch.`
      : "";

  const zarovnani =
    kontext.zarovnani === "poor"
      ? "\n\nPOZOR: snímky na sebe dobře nesedí — host fotil z jiného úhlu nebo vzdálenosti. Pokud nedokážeš spolehlivě porovnat, nastav \"needs_reshoot\": true a závažnost \"none\"."
      : "";

  const seznam = [
    "Obrázek 1 — REFERENČNÍ celkový pohled (stav při předání)",
    "Obrázek 2 — CELKOVÝ pohled od hosta před odjezdem",
  ];
  let i = 3;
  kontext.vyrezy.forEach((o, k) => {
    const kde = `${(o.x * 100).toFixed(0)}–${((o.x + o.w) * 100).toFixed(0)} % zleva, ${(o.y * 100).toFixed(0)}–${((o.y + o.h) * 100).toFixed(0)} % shora`;
    seznam.push(`Obrázek ${i++} — REFERENČNÍ výřez místa ${k + 1} (${kde})`);
    seznam.push(`Obrázek ${i++} — TÝŽ výřez od hosta (porovnej ho s předchozím)`);
  });

  const pokyn = kontext.vyrezy.length
    ? `\n\nDŮLEŽITÉ: výřezy jdou v párech — nejdřív referenční, hned za ním týž záběr od hosta. Porovnávej vždy dvojici mezi sebou; tam je rozdíl, který našla obrazová analýza. Ostatní části snímku ignoruj.`
    : "\n\nObrazová analýza nenašla žádné podezřelé místo. Pokud ani ty nic nevidíš, je to v pořádku.";

  return `Zóna: ${zona.nazev} (${zona.klic})

Dostáváš ${seznam.length} obrázků v tomto pořadí:
${seznam.map((s) => `· ${s}`).join("\n")}

Celková podobnost snímků: ${(kontext.podobnost * 100).toFixed(0)} %.${pokyn}${otazky}${svetlo}${zarovnani}

Popiš nejzávažnější změnu, kterou v této zóně vidíš. Když je všechno v pořádku, nastav závažnost "none" — to je zcela běžný a očekávaný výsledek.`;
}

/** Druhý běh: prohozené pořadí snímků a opačně položená otázka. */
export function zpravaProhozena(zona: Zona): string {
  return `Zóna: ${zona.nazev} (${zona.klic})

Teď dostáváš snímky v OPAČNÉM pořadí: první je od hosta před odjezdem, druhý je referenční.

Otázka je také obrácená: co by se muselo stát, aby se z prvního snímku stal druhý? Jinými slovy — je na prvním snímku něco, co na druhém není?

Odpovídej stejným způsobem jako obvykle. Cílem je ověřit, jestli nález platí i při obráceném pohledu; nesrovnalost mezi oběma běhy je pro nás signál, že si nálezem nemáme být jistí.`;
}

/** Třetí běh: hledá důvody, proč to poškození není. */
export function zpravaProtiargument(zona: Zona, nalez: string): string {
  return `Zóna: ${zona.nazev} (${zona.klic})

Jiný běh na těchto snímcích usoudil:
„${nalez}“

Tvůj úkol je teď obrácený: najdi nejvěrohodnější důvod, proč to poškození NENÍ. Zvaž světlo, úhel, stín, odraz, vlhkost, běžné opotřebení, nepořádek, který zmizí úklidem, nebo že jde o jiný předmět než na referenci.

Do "what_changed" napiš svůj protiargument. Do "alternative_explanation" napiš, za jakých podmínek by naopak ten původní závěr platil. Závažnost nastav podle toho, jak silný ten protiargument je — pokud je opravdu přesvědčivý, dej "none".

Tenhle protiargument uvidí majitel vedle původního nálezu. Piš ho tak, aby mu pomohl rozhodnout, ne aby ho zmátl.`;
}

/** Závěrečné shrnutí pro majitele. */
export function zpravaShrnuti(zona: string, nalezy: unknown[]): string {
  return `Domek: ${zona}

Níž jsou všechny nálezy z odjezdového protokolu, každý včetně protiargumentu:

${JSON.stringify(nalezy, null, 1)}

Napiš majiteli shrnutí česky, tři až pět vět. Řekni, jestli je něco potřeba řešit, a pokud ano, co konkrétně a jak jistě. Když je všechno v pořádku, napiš to rovnou a stručně.

Nepiš nic, co z nálezů neplyne. Nenavrhuj částky. Rozhodnutí je na majiteli.`;
}
