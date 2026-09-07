/**
 * Prožene zkušební sadu celým řetězem a uloží výsledek pro administraci.
 *
 * Řetěz je **tentýž kód, který běží naostro**: obrazová brána z `lib/luna/obraz`,
 * prompt z `lib/luna/prompt`, model z `lib/luna/model`, skládání vzkazu
 * hostovi z `lib/luna/vzkaz`. Nic se tu nesimuluje — jinak by stránka
 * dokládala vlastnosti něčeho, co v provozu neexistuje.
 *
 *   node scripts/dev/ai-sada-vyhodnot.mts
 *
 * Každý případ se ukládá zvlášť do mezipaměti, takže se běh dá přerušit
 * a navázat, aniž by se platilo znovu za to, co už model zhodnotil.
 */
import fs from "node:fs";
import path from "node:path";

const KOREN = path.resolve(import.meta.dirname, "../..");
for (const r of fs.readFileSync(path.join(KOREN, ".env.local"), "utf8").split("\n")) {
  const m = r.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const { PRIPADY, ZONY } = await import("./ai-sada-obrazky.mts");
const { porovnej, posudFotku, pripravFotku, vyrez } = await import("../../lib/luna/obraz.ts");
const { zeptejSe } = await import("../../lib/luna/model.ts");
const { zpravaProZonu, zpravaProhozena, zpravaProtiargument, VERZE_PROMPTU } = await import(
  "../../lib/luna/prompt.ts"
);
const { sestavVzkaz } = await import("../../lib/luna/vzkaz.ts");

const FOTKY = path.join(KOREN, "public/test-ai");
const CACHE = path.join(KOREN, ".cache-test-ai");
const VYSTUP = path.join(KOREN, "lib/ukazka/test-ai.json");
fs.mkdirSync(CACHE, { recursive: true });

/** Infolinka do vzkazu. Stejné číslo jako výchozí v nastavení firmy. */
const KONTAKT = { telefon: "+420 733 418 260", email: "ahoj@sedmyles.cz" };

type Zaznam = {
  id: string;
  nazev: string;
  zona: string;
  zonaKlic: string;
  ocekavano: string;
  proc: string;
  pred: string;
  po: string;
  vyrezPred: string | null;
  vyrezPo: string | null;
  posudek: { pouzitelna: boolean; vzkaz: string; jas: number; ostrost: number };
  brana: {
    podobnost: number;
    zarovnani: string;
    rozdilJasu: number;
    mist: number;
    otevrena: boolean;
  };
  luna: {
    zavaznost: string;
    jistota: number;
    coSeZmenilo: string;
    alternativa: string;
    protiargument: string | null;
    stabilita: string | null;
    neporadek: boolean;
    svetloUhel: boolean;
    noveFoto: boolean;
    prosba: string | null;
    odhad: { min: number; max: number };
    model: string;
    trvaniMs: number;
    cenaHalere: number;
  } | null;
  vzkaz: ReturnType<typeof sestavVzkaz>;
  vysledek: "trefa" | "minula" | "planyPoplach";
};

const PORADI = ["none", "dirt", "wear", "damage_minor", "damage_major", "missing"];
const jePoskozeni = (z: string) => PORADI.indexOf(z) >= PORADI.indexOf("damage_minor");

async function odolne<T>(popis: string, co: () => Promise<T>): Promise<T | null> {
  for (let i = 1; i <= 3; i++) {
    try {
      return await co();
    } catch (e) {
      console.log(`   ✗ ${popis} (${i}/3): ${(e as Error).message.slice(0, 120)}`);
      await new Promise((r) => setTimeout(r, 8000 * i));
    }
  }
  return null;
}

/**
 * Dopočítá vzkaz a verdikt z uloženého nálezu.
 *
 * Do mezipaměti jde jen to, co stálo peníze — odpověď modelu a čísla
 * z obrazové brány. Pravidla, podle kterých z toho vzniká vzkaz hostovi, se
 * mění často a musí se přepočítat pokaždé, jinak by stránka ukazovala systém,
 * jaký býval, a ne jaký je.
 */
function dopocitej(d: Zaznam, p: (typeof PRIPADY)[number]): Zaznam {
  const zonaDef = ZONY[p.zona];
  const l = d.luna;
  const vzkaz = l
    ? sestavVzkaz(
        [
          {
            klic: zonaDef.klic,
            nazev: zonaDef.nazev,
            zavaznost: (d.brana.zarovnani === "poor" ? "none" : l.zavaznost) as never,
            jistota: l.jistota,
            prahEskalace: zonaDef.prahEskalace,
            stabilita: l.stabilita as "stable" | "unstable" | null,
            zarovnani: d.brana.zarovnani as "good" | "fair" | "poor",
            potrebaNoveFoto: l.noveFoto || d.brana.zarovnani === "poor",
            svetloUhel: l.svetloUhel,
            neporadek: l.neporadek,
            prosba: d.brana.zarovnani === "poor" ? null : l.prosba,
          },
        ],
        KONTAKT,
      )
    : sestavVzkaz([], KONTAKT);

  const vysledek: Zaznam["vysledek"] =
    p.ocekavano === "skoda"
      ? vzkaz.ton === "telefon" ? "trefa" : "minula"
      : p.ocekavano === "uklid"
        ? vzkaz.ton === "prosba" ? "trefa" : vzkaz.ton === "telefon" ? "planyPoplach" : "minula"
        : vzkaz.ton === "telefon" ? "planyPoplach" : "trefa";

  return { ...d, proc: p.proc, nazev: p.nazev, ocekavano: p.ocekavano, vzkaz, vysledek };
}

const zaznamy: Zaznam[] = [];
let naklad = 0;

for (const p of PRIPADY) {
  const cache = path.join(CACHE, `${p.id}.json`);
  if (fs.existsSync(cache)) {
    // Vzkaz a vyhodnocení se z mezipaměti neberou — přepočítají se pokaždé
    // podle aktuálních pravidel. Jinak by stránka po změně prahu ukazovala,
    // jak se systém choval minulý týden.
    const d = dopocitej(JSON.parse(fs.readFileSync(cache, "utf8")) as Zaznam, p);
    zaznamy.push(d);
    naklad += d.luna?.cenaHalere ?? 0;
    console.log(`  ${p.id}  ${p.nazev.padEnd(30)} z dřívějška → ${d.vzkaz.ton.padEnd(8)} ${d.vysledek}`);
    continue;
  }

  const zonaDef = ZONY[p.zona];
  const pred = (await pripravFotku(fs.readFileSync(path.join(FOTKY, `${p.id}-pred.jpg`)))).data;
  const po = (await pripravFotku(fs.readFileSync(path.join(FOTKY, `${p.id}-po.jpg`)))).data;

  const posudek = await posudFotku(po);
  const g = await porovnej(pred, po);
  const otevrena = g.oblasti.length > 0 || g.zarovnani === "poor";

  const zaznam: Partial<Zaznam> = {
    id: p.id,
    nazev: p.nazev,
    zona: zonaDef.nazev,
    zonaKlic: p.zona,
    ocekavano: p.ocekavano,
    proc: p.proc,
    pred: `/test-ai/${p.id}-pred.jpg`,
    po: `/test-ai/${p.id}-po.jpg`,
    vyrezPred: null,
    vyrezPo: null,
    posudek: { pouzitelna: posudek.pouzitelna, vzkaz: posudek.vzkaz, jas: +posudek.jas.toFixed(1), ostrost: +posudek.ostrost.toFixed(0) },
    brana: {
      podobnost: +(g.podobnost * 100).toFixed(1),
      zarovnani: g.zarovnani,
      rozdilJasu: g.rozdilJasu,
      mist: g.oblasti.length,
      otevrena,
    },
    luna: null,
  };

  if (otevrena) {
    const mista = g.oblasti.slice(0, 2);
    const pary = await Promise.all(
      mista.map(async (o) => [await vyrez(pred, o), await vyrez(po, o)] as const),
    );
    pary.forEach(([a, b], i) => {
      if (i > 0) return;
      fs.writeFileSync(path.join(FOTKY, `${p.id}-vyrez-pred.jpg`), a);
      fs.writeFileSync(path.join(FOTKY, `${p.id}-vyrez-po.jpg`), b);
      zaznam.vyrezPred = `/test-ai/${p.id}-vyrez-pred.jpg`;
      zaznam.vyrezPo = `/test-ai/${p.id}-vyrez-po.jpg`;
    });

    const obrazky = [
      { data: pred, popis: "referenční celek" },
      { data: po, popis: "celek od hosta" },
      ...pary.flatMap(([a, b], i) => [
        { data: a, popis: `referenční výřez ${i + 1}` },
        { data: b, popis: `výřez ${i + 1} od hosta` },
      ]),
    ];

    const o = await odolne(p.id, () =>
      zeptejSe(
        zpravaProZonu(
          { klic: zonaDef.klic, nazev: zonaDef.nazev, otazky: zonaDef.otazky },
          { rozdilJasu: g.rozdilJasu, podobnost: g.podobnost, zarovnani: g.zarovnani, vyrezy: mista },
        ),
        obrazky,
        zonaDef.klic,
      ),
    );

    if (o) {
      naklad += o.uzitek.cenaHalere;
      let nalez = o.nalez;
      let stabilita: string | null = null;
      let protiargument: string | null = null;

      // Tytéž pojistky jako v `lib/luna/run.ts`. Kdyby se lišily, stránka
      // by ukazovala jiný systém, než jaký běží hostům.
      if (nalez.is_guest_mess_not_damage && jePoskozeni(nalez.severity)) {
        nalez = { ...nalez, severity: "dirt", estimated_cost_czk: { min: 0, max: 0 } };
      }
      if (nalez.is_lighting_or_angle_artifact && jePoskozeni(nalez.severity)) {
        nalez = { ...nalez, confidence: Math.min(nalez.confidence, 0.5) };
      }

      if (jePoskozeni(nalez.severity)) {
        if (nalez.severity !== "missing") {
          const pr = await odolne(`${p.id} prohozeně`, () =>
            zeptejSe(
              zpravaProhozena({ klic: zonaDef.klic, nazev: zonaDef.nazev, otazky: zonaDef.otazky }),
              [{ data: po, popis: "od hosta" }, { data: pred, popis: "referenční" }],
              zonaDef.klic,
            ),
          );
          if (pr) {
            naklad += pr.uzitek.cenaHalere;
            const rozdil = Math.abs(
              PORADI.indexOf(nalez.severity) - PORADI.indexOf(pr.nalez.severity),
            );
            stabilita = rozdil >= 2 ? "unstable" : "stable";
          }
        }
        const op = await odolne(`${p.id} protiargument`, () =>
          zeptejSe(
            zpravaProtiargument(
              { klic: zonaDef.klic, nazev: zonaDef.nazev, otazky: zonaDef.otazky },
              nalez.what_changed,
            ),
            obrazky,
            zonaDef.klic,
          ),
        );
        if (op) {
          naklad += op.uzitek.cenaHalere;
          protiargument = op.nalez.what_changed;
          if (!jePoskozeni(op.nalez.severity)) {
            nalez = { ...nalez, confidence: Math.min(nalez.confidence, 0.75) };
          }
        }
        if (stabilita === "unstable") nalez = { ...nalez, confidence: Math.min(nalez.confidence, 0.5) };
      }

      zaznam.luna = {
        zavaznost: nalez.severity,
        jistota: +nalez.confidence.toFixed(2),
        coSeZmenilo: nalez.what_changed,
        alternativa: nalez.alternative_explanation,
        protiargument,
        stabilita,
        neporadek: nalez.is_guest_mess_not_damage,
        svetloUhel: nalez.is_lighting_or_angle_artifact,
        noveFoto: nalez.needs_reshoot,
        prosba: nalez.guest_tidy_hint,
        odhad: nalez.estimated_cost_czk,
        model: o.uzitek.model,
        trvaniMs: o.uzitek.trvaniMs,
        cenaHalere: o.uzitek.cenaHalere,
      };
      zaznam.vzkaz = sestavVzkaz(
        [
          {
            klic: zonaDef.klic,
            nazev: zonaDef.nazev,
            zavaznost: g.zarovnani === "poor" ? "none" : nalez.severity,
            jistota: nalez.confidence,
            prahEskalace: zonaDef.prahEskalace,
            stabilita: stabilita as "stable" | "unstable" | null,
            zarovnani: g.zarovnani,
            potrebaNoveFoto: nalez.needs_reshoot || g.zarovnani === "poor",
            svetloUhel: nalez.is_lighting_or_angle_artifact,
            neporadek: nalez.is_guest_mess_not_damage,
            prosba: g.zarovnani === "poor" ? null : nalez.guest_tidy_hint,
          },
        ],
        KONTAKT,
      );
    }
  }

  if (!zaznam.vzkaz) zaznam.vzkaz = sestavVzkaz([], KONTAKT);

  // Vyhodnocení proti očekávání. Rozhoduje **vzkaz hostovi**, ne závažnost —
  // to je jediné, co host doopravdy uvidí.
  const ton = zaznam.vzkaz.ton;
  zaznam.vysledek =
    p.ocekavano === "skoda"
      ? ton === "telefon"
        ? "trefa"
        : "minula"
      : p.ocekavano === "uklid"
        ? ton === "prosba"
          ? "trefa"
          : ton === "telefon"
            ? "planyPoplach"
            : "minula"
        : ton === "telefon"
          ? "planyPoplach"
          : "trefa";

  const hotovy = dopocitej(zaznam as Zaznam, p);
  fs.writeFileSync(cache, JSON.stringify(hotovy, null, 1));
  zaznamy.push(hotovy);
  console.log(
    `  ${p.id}  ${p.nazev.padEnd(30)} ${(hotovy.luna?.zavaznost ?? "brána zavřena").padEnd(14)} → ${ton.padEnd(8)} ${hotovy.vysledek}`,
  );
}

/* ===== souhrn ===== */

const cekaneSkody = zaznamy.filter((z) => z.ocekavano === "skoda");
const cekanyUklid = zaznamy.filter((z) => z.ocekavano === "uklid");
const cekaneNic = zaznamy.filter((z) => z.ocekavano === "bez_nalezu");

const souhrn = {
  vytvoreno: new Date().toISOString().slice(0, 10),
  verzePromptu: VERZE_PROMPTU,
  model: zaznamy.find((z) => z.luna)?.luna?.model ?? "—",
  nakladHalere: naklad,
  celkem: zaznamy.length,
  poskozeniNalezeno: cekaneSkody.filter((z) => z.vysledek === "trefa").length,
  poskozeniCelkem: cekaneSkody.length,
  uklidNalezen: cekanyUklid.filter((z) => z.vysledek === "trefa").length,
  uklidCelkem: cekanyUklid.length,
  planePoplachy: zaznamy.filter((z) => z.vysledek === "planyPoplach").length,
  bezNalezuCelkem: cekaneNic.length,
  branaOtevrena: zaznamy.filter((z) => z.brana.otevrena).length,
  volaniModelu: zaznamy.filter((z) => z.luna).length,
  pripady: zaznamy,
};

fs.writeFileSync(VYSTUP, JSON.stringify(souhrn, null, 1));
console.log(
  `\nhotovo · ${souhrn.celkem} případů · poškození ${souhrn.poskozeniNalezeno}/${souhrn.poskozeniCelkem}` +
    ` · úklid ${souhrn.uklidNalezen}/${souhrn.uklidCelkem} · planých poplachů ${souhrn.planePoplachy}` +
    ` · ${(naklad / 100).toFixed(2)} Kč`,
);
process.exit(0);
