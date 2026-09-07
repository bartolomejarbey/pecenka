import "server-only";

import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { nactiZony, type ZonaDef } from "./checklist";
import { dostupnyModel, zeptejSe, VERZE, type Nalez, type Zavaznost } from "./model";
import { porovnej, vyrez, type Porovnani } from "./obraz";
import {
  zpravaProhozena,
  zpravaProtiargument,
  zpravaProZonu,
  zpravaShrnuti,
} from "./prompt";
import { stahni } from "./uloziste";
import { sestavVzkaz, type PodkladZony, type Vzkaz } from "./vzkaz";
import { SITE } from "@/lib/content";

/**
 * Luna 5.6 — vyhodnocení odjezdového foto-protokolu.
 *
 * Co tenhle modul **nikdy** neudělá: nenapíše hostovi obvinění, nesáhne na
 * kauci a nerozhodne o koruně. Vyrobí podklad, který si přečte majitel. Aby
 * to nešlo obejít omylem, vyžaduje zápis do `damage_decisions` člověka
 * a ručně psané odůvodnění — a je to databázové omezení, ne domluva.
 *
 * Přesnost před úplností. U dvoudomkového provozu zničí jedno falešné
 * obvinění víc, než ušetří všechny nalezené škody dohromady.
 *
 * Běh má tři fáze a to pořadí je záměrné:
 *
 *  1. **Obrazová brána** projde všechny zóny. Je zadarmo a rozhodne, které
 *     zóny má vůbec smysl někomu ukazovat.
 *  2. **Primární běh** modelu, ale **od nejdražší zóny**. Rozpočet volání je
 *     omezený a dřív ho přidělovalo pořadí v checklistu — podlaha za 4 000 Kč
 *     byla první, prosklená stěna za 25 000 Kč devátá. U rozmláceného domku
 *     tak ta drahá zóna nedostala nic.
 *  3. **Přehodnocení** jen u nálezů, které vypadají na poškození.
 */

/**
 * Strop volání modelu na jednu inspekci.
 *
 * Brána typicky propustí tři až pět zón z dvanácti; poškozená zóna spotřebuje
 * tři volání. Osmnáct pokryje i špatný den, a přitom drží náklad pod padesáti
 * korunami — tedy pod cenou deseti minut úklidu.
 */
const STROP_VOLANI = 18;

const PORADI: Zavaznost[] = ["none", "dirt", "wear", "damage_minor", "damage_major", "missing"];
const stupen = (z: Zavaznost) => PORADI.indexOf(z);
const jePoskozeni = (z: Zavaznost) => stupen(z) >= stupen("damage_minor");

export type ZonaVysledku = PodkladZony & {
  coSeZmenilo: string;
  protiargument: string | null;
  alternativa: string;
  kLidskemuPosouzeni: boolean;
  /** Zóna, ke které chybí reference — to není nález, jen dluh na naší straně. */
  chybiReference: boolean;
  odhadKc: { min: number; max: number };
};

export type VysledekInspekce = {
  stav: "auto_clear" | "needs_review" | "needs_photo" | "closed";
  shrnuti: string;
  nakladHalere: number;
  volani: number;
  /** Co se ukáže hostovi. Skládá se z týchž zón, ale podle vlastních pravidel. */
  vzkaz: Vzkaz;
  zony: ZonaVysledku[];
};

type FotkaRadek = {
  id: string;
  zone_key: string;
  storage_key: string;
  dhash64: string | number | null;
  /** Kdy fotoaparát říká, že snímek vznikl. Padělatelné, ale absence je taky signál. */
  exif_taken_at: string | null;
};

/**
 * O kolik smí být fotka starší než odeslání protokolu.
 *
 * Host, který vyfotí v pondělí a ve středu protrhne matraci, by jinak měl
 * doloženo, že odjížděl z nepoškozeného domku. Den je velkorysá tolerance —
 * fotit večer před odjezdem a odeslat ráno je běžné. EXIF nemá časové pásmo,
 * takže se čte jako serverový čas; pár hodin nepřesnosti se do tolerance vejde.
 */
const NEJSTARSI_FOTKA_H = 24;

type BaselineRadek = {
  id: string;
  zone_key: string;
  storage_key: string;
  mean_luminance: number;
  light_variant: string;
};

/** Zóna, kterou obrazová brána propustila k modelu. */
type Kandidat = {
  zona: ZonaDef;
  fotkaId: string;
  pred: Buffer;
  po: Buffer;
  srovnani: Porovnani;
};

export async function vyhodnotInspekci(inspekceId: string): Promise<VysledekInspekce> {
  const [insp] = await radky<{
    id: string;
    unit_slug: string;
    checklist_version_id: string;
    baseline_set_id: string | null;
    status: string;
    uz_prosili: boolean;
  }>(sql`
    SELECT id::text AS id, unit_slug, checklist_version_id::text AS checklist_version_id,
           baseline_set_id::text AS baseline_set_id, status,
           -- O doplňující fotku se prosí jen jednou. Podruhé už je to
           -- otravování a dopadlo by to stejně.
           (cardinality(reopened_zones) > 0) AS uz_prosili
      FROM inspections WHERE id = ${inspekceId}::uuid
  `);
  if (!insp) throw new Error("Inspekce nenalezena.");

  // Počítadlo pokusů. Protokol, který spolehlivě padá, se jinak zkouší
  // z cronu každých patnáct minut donekonečna a pokaždé stojí peníze.
  await radky(sql`
    UPDATE inspections
       SET status = 'analyzing', attempts = attempts + 1, last_attempt_at = now(), last_error = NULL
     WHERE id = ${inspekceId}::uuid
  `);

  try {
    const v = await proved(inspekceId, insp);
    return v;
  } catch (e) {
    const zprava = e instanceof Error ? e.message : String(e);
    await radky(sql`
      UPDATE inspections SET status = 'submitted', last_error = ${zprava.slice(0, 500)}
       WHERE id = ${inspekceId}::uuid
    `).catch(() => {});
    throw e;
  }
}

async function proved(
  inspekceId: string,
  insp: {
    unit_slug: string;
    checklist_version_id: string;
    baseline_set_id: string | null;
    uz_prosili: boolean;
  },
): Promise<VysledekInspekce> {
  const hranice = Date.now() - NEJSTARSI_FOTKA_H * 3600_000;
  /** Fotka pořízená dávno před odjezdem nedokládá stav při odjezdu. */
  const vyfocenoDopredu = (f: FotkaRadek) =>
    Boolean(f.exif_taken_at) && new Date(f.exif_taken_at!).getTime() < hranice;

  const zony = await nactiZony(insp.checklist_version_id);

  // Nejnovější fotka na zónu. Dřív se braly všechny a vybírala se první,
  // tedy nejstarší — host přefotil rozmazaný snímek a systém pořád hodnotil
  // ten původní.
  const [fotky, baseline] = await Promise.all([
    radky<FotkaRadek>(sql`
      SELECT DISTINCT ON (zone_key)
             id::text AS id, zone_key, storage_key, dhash64,
             exif_taken_at::text AS exif_taken_at
        FROM inspection_photos
       WHERE inspection_id = ${inspekceId}::uuid AND deleted_at IS NULL
       ORDER BY zone_key, uploaded_at DESC
    `),
    insp.baseline_set_id
      ? radky<BaselineRadek>(sql`
          SELECT id::text AS id, zone_key, storage_key, mean_luminance, light_variant
            FROM baseline_shots WHERE baseline_set_id = ${insp.baseline_set_id}::uuid
        `)
      : Promise.resolve([] as BaselineRadek[]),
  ]);

  let volani = 0;
  let naklad = 0;
  const vysledky: ZonaVysledku[] = [];
  const kandidati: Kandidat[] = [];

  /* ===== Fáze 1 — obrazová brána ===== */
  for (const zona of zony) {
    const fotkaZony = fotky.find((f) => f.zone_key === zona.klic);
    if (!fotkaZony) continue;

    if (vyfocenoDopredu(fotkaZony)) {
      // Neobviňujeme — jen to nemůže projít samo. Host mohl fotit v klidu
      // předem a nic tím nemyslet.
      vysledky.push(
        prazdnaZona(
          zona,
          "good",
          `Fotka je podle metadat starší než ${NEJSTARSI_FOTKA_H} hodin — nedokládá stav při odjezdu. Posuď ji prosím sám.`,
          { kLidem: true },
        ),
      );
      continue;
    }

    const reference = baseline.filter((b) => b.zone_key === zona.klic);
    if (!reference.length) {
      // Bez referenčního snímku není s čím porovnávat. Nic to neznamená
      // a hlavně to není nález — je to dluh na naší straně.
      vysledky.push(
        prazdnaZona(zona, "good", "Pro tuhle zónu zatím nemáme referenční snímek.", {
          chybiReference: true,
        }),
      );
      continue;
    }

    let pred: Buffer;
    let po: Buffer;
    let nejblizsi: BaselineRadek;
    try {
      po = await stahni(fotkaZony.storage_key);
      // Referenční snímek vybíráme podle nejbližšího světla — porovnávat
      // večerní fotku s poledním baseline je zbytečná práce navíc.
      const jasPo = await prumernyJas(po);
      nejblizsi = reference.reduce((a, b) =>
        Math.abs(b.mean_luminance - jasPo) < Math.abs(a.mean_luminance - jasPo) ? b : a,
      );
      pred = await stahni(nejblizsi.storage_key);
    } catch (e) {
      console.error(`[luna] zónu ${zona.klic} nelze načíst z úložiště:`, e);
      vysledky.push(prazdnaZona(zona, "good", "Fotku se nepodařilo načíst z úložiště."));
      continue;
    }

    const srovnani = await porovnej(pred, po);

    await radky(sql`
      INSERT INTO photo_pairs (inspection_id, zone_key, before_shot_id, after_photo_id,
                               align_status, ssim_global, diff_regions)
      VALUES (${inspekceId}::uuid, ${zona.klic}, ${nejblizsi.id}::uuid, ${fotkaZony.id}::uuid,
              ${srovnani.zarovnani}, ${srovnani.podobnost}, ${JSON.stringify(srovnani.oblasti)}::jsonb)
      ON CONFLICT (inspection_id, zone_key) DO UPDATE
        SET before_shot_id = EXCLUDED.before_shot_id, after_photo_id = EXCLUDED.after_photo_id,
            align_status = EXCLUDED.align_status, ssim_global = EXCLUDED.ssim_global,
            diff_regions = EXCLUDED.diff_regions
    `);

    // BRÁNA: bez podezřelé oblasti se model nevolá vůbec.
    if (srovnani.oblasti.length === 0 && srovnani.zarovnani !== "poor") {
      vysledky.push(prazdnaZona(zona, srovnani.zarovnani, "Beze změny oproti referenci."));
      continue;
    }
    kandidati.push({ zona, fotkaId: fotkaZony.id, pred, po, srovnani });
  }

  /* ===== Fáze 2 — model, od nejdražší zóny ===== */
  // Rozpočet přiděluje cena opravy, ne pořadí v checklistu. Když se strop
  // vyčerpá, zůstane neposouzená levná zóna, ne prosklená stěna.
  kandidati.sort((a, b) => (b.zona.odhadOpravyKc ?? 0) - (a.zona.odhadOpravyKc ?? 0));

  type Rozpracovana = Kandidat & { nalez: Nalez; runId: string; obrazky: Obrazky };
  const kPrehodnoceni: Rozpracovana[] = [];

  for (const k of kandidati) {
    if (dostupnyModel() === "zadny") {
      vysledky.push(
        prazdnaZona(
          k.zona,
          k.srovnani.zarovnani,
          "Vyhodnocení modelem není nastavené — obrazová analýza našla rozdíl, posuď ho prosím sám.",
          { kLidem: true },
        ),
      );
      continue;
    }
    if (volani >= STROP_VOLANI) {
      vysledky.push(
        prazdnaZona(k.zona, k.srovnani.zarovnani, "Vyčerpán limit volání modelu pro tuhle inspekci.", {
          kLidem: true,
        }),
      );
      continue;
    }

    // Výřezy se posílají v PÁRECH — bez referenčního výřezu nemá model
    // co s čím porovnat a hlásí „nic" i tam, kde je rozdíl zjevný.
    const obrazky = await sestavObrazky(k);
    const hlavni = await zeptejSe(
      zpravaProZonu(
        { klic: k.zona.klic, nazev: k.zona.nazev, otazky: k.zona.otazky },
        {
          rozdilJasu: k.srovnani.rozdilJasu,
          podobnost: k.srovnani.podobnost,
          zarovnani: k.srovnani.zarovnani,
          vyrezy: obrazky.mista,
        },
      ),
      obrazky.vse,
      k.zona.klic,
    ).catch((e) => {
      console.error(`[luna] primární běh zóny ${k.zona.klic} selhal:`, e);
      return null;
    });
    volani++;

    if (!hlavni) {
      vysledky.push(prazdnaZona(k.zona, k.srovnani.zarovnani, "Model neodpověděl.", { kLidem: true }));
      continue;
    }
    naklad += hlavni.uzitek.cenaHalere;
    const runId = await zapisBeh(inspekceId, k.zona.klic, volani, "primary", hlavni);
    kPrehodnoceni.push({ ...k, nalez: hlavni.nalez, runId, obrazky });
  }

  /* ===== Fáze 3 — přehodnocení nálezů, které vypadají na poškození ===== */
  for (const r of kPrehodnoceni) {
    let nalez = r.nalez;
    let stabilita: "stable" | "unstable" | null = null;
    let protiargument: string | null = null;

    /*
     * Model sám říká, že jde o nepořádek hosta.
     *
     * Dřív se tahle informace zapsala do databáze a při rozhodování se
     * ignorovala, takže nález „damage_minor, ale je to nepořádek" založil
     * případ škody. Přesně to, co má systém zakázané.
     */
    if (nalez.is_guest_mess_not_damage && jePoskozeni(nalez.severity)) {
      nalez = { ...nalez, severity: "dirt", estimated_cost_czk: { min: 0, max: 0 } };
    }
    if (nalez.is_lighting_or_angle_artifact && jePoskozeni(nalez.severity)) {
      nalez = { ...nalez, confidence: Math.min(nalez.confidence, 0.5) };
    }

    if (jePoskozeni(nalez.severity) && volani + 2 <= STROP_VOLANI) {
      /*
       * Prohozený běh se u chybějícího vybavení vynechává.
       *
       * Otázka „co je na prvním snímku a není na druhém" je při prohození
       * pořadí logicky opačná, takže `missing` vždycky vyšlo jako `none` —
       * rozdíl pěti stupňů, tedy „nestabilní". Nejlépe doložitelný typ škody
       * si tím systém sám znehodnocoval.
       */
      if (nalez.severity !== "missing") {
        const prohozene = await zeptejSe(
          zpravaProhozena({ klic: r.zona.klic, nazev: r.zona.nazev, otazky: r.zona.otazky }),
          [{ data: r.po, popis: "od hosta" }, { data: r.pred, popis: "referenční" }],
          r.zona.klic,
        ).catch(() => null);
        volani++;
        if (prohozene) {
          naklad += prohozene.uzitek.cenaHalere;
          await zapisBeh(inspekceId, r.zona.klic, volani, "swapped", prohozene);
          const rozdil = Math.abs(stupen(nalez.severity) - stupen(prohozene.nalez.severity));
          stabilita = rozdil >= 2 ? "unstable" : "stable";
        }
      }

      const oponent = await zeptejSe(
        zpravaProtiargument(
          { klic: r.zona.klic, nazev: r.zona.nazev, otazky: r.zona.otazky },
          nalez.what_changed,
        ),
        r.obrazky.vse,
        r.zona.klic,
      ).catch(() => null);
      volani++;
      if (oponent) {
        naklad += oponent.uzitek.cenaHalere;
        await zapisBeh(inspekceId, r.zona.klic, volani, "devils_advocate", oponent);
        protiargument = oponent.nalez.what_changed;
        // Když protiargument sám usoudí, že o škodu nejde, není to remíza —
        // je to důvod k opatrnosti.
        if (!jePoskozeni(oponent.nalez.severity)) {
          nalez = { ...nalez, confidence: Math.min(nalez.confidence, 0.75) };
        }
      }

      // Nestabilní nález se nikdy nepoužije jako tvrzení — jde jen k člověku.
      if (stabilita === "unstable") {
        nalez = { ...nalez, confidence: Math.min(nalez.confidence, 0.5) };
      }
    }

    /*
     * Potlačení kvůli špatnému zarovnání se musí projevit i v datech.
     *
     * Dřív se maskovalo jen v návratové hodnotě, ale administrace čte
     * `luna_findings` — majitel tedy viděl „výrazné poškození" u zóny,
     * kterou pipeline záměrně neuznala.
     */
    const potlaceno = r.srovnani.zarovnani === "poor" && jePoskozeni(nalez.severity);
    const zavaznost: Zavaznost = potlaceno ? "none" : nalez.severity;
    await zapisNalez(
      r.runId,
      { ...nalez, severity: zavaznost },
      protiargument,
      stabilita,
      potlaceno
        ? `Snímky na sebe nesedí (podobnost ${(r.srovnani.podobnost * 100).toFixed(0)} %) — původní závažnost ${nalez.severity} potlačena.`
        : null,
    );
    await radky(sql`
      UPDATE inspection_photos SET contains_person = ${nalez.contains_person}
       WHERE id = ${r.fotkaId}::uuid
    `);

    // Špatné zarovnání ani žádost o nové foto nikdy neeskaluje jako škoda —
    // jde k člověku, ale jako „nedá se posoudit", ne jako obvinění.
    const kLidskemuPosouzeni =
      r.srovnani.zarovnani === "poor" ||
      nalez.needs_reshoot ||
      (jePoskozeni(zavaznost) && nalez.confidence >= 0.6) ||
      stabilita === "unstable";

    vysledky.push({
      klic: r.zona.klic,
      nazev: r.zona.nazev,
      zavaznost,
      jistota: nalez.confidence,
      prahEskalace: r.zona.prahEskalace,
      coSeZmenilo: nalez.what_changed,
      protiargument,
      alternativa: nalez.alternative_explanation,
      stabilita,
      zarovnani: r.srovnani.zarovnani,
      potrebaNoveFoto: nalez.needs_reshoot || r.srovnani.zarovnani === "poor",
      svetloUhel: nalez.is_lighting_or_angle_artifact,
      neporadek: nalez.is_guest_mess_not_damage,
      // Prosba se bere jen ze zóny, kterou šlo pořádně porovnat. Ze snímku,
      // co na sebe nesedí, neplyne ani „srovnejte peřinu".
      prosba: r.srovnani.zarovnani === "poor" ? null : nalez.guest_tidy_hint,
      kLidskemuPosouzeni,
      chybiReference: false,
      odhadKc: potlaceno ? { min: 0, max: 0 } : nalez.estimated_cost_czk,
    });
  }

  // Zpátky do pořadí checklistu — člověk čte protokol tak, jak ho host fotil.
  const poradi = new Map(zony.map((z, i) => [z.klic, i]));
  vysledky.sort((a, b) => (poradi.get(a.klic) ?? 99) - (poradi.get(b.klic) ?? 99));

  /* ===== Vyhodnocení celé inspekce ===== */
  /*
   * Protokol bez jediné fotky se nesmí uzavřít jako „vše v pořádku".
   *
   * Odesílací brána sice vyžaduje všechny povinné zóny, jenže vyhodnocení
   * se spouští ze tří míst — po odeslání, z cronu a ručně z administrace —
   * a prázdná inspekce jimi projde. Výsledek „všechny zóny odpovídají stavu
   * při předání" u protokolu, ve kterém nic není, je to nejhorší, co může
   * systém tvrdit: vypadá jako doklad, a přitom nedokládá nic.
   */
  if (!vysledky.length) {
    const vzkazPrazdny = sestavVzkaz([], await kontaktProHosta());
    await radky(sql`
      UPDATE inspections
         SET status = 'needs_review', analyzed_at = now(), attempts = ${STROP_VOLANI},
             summary_cs = 'V protokolu není jediná fotka — není co porovnávat. Zkontroluj to prosím ručně.',
             guest_message_cs = ${vzkazPrazdny.text}, guest_message_tone = ${vzkazPrazdny.ton},
             guest_message_at = now(), guest_message_json = ${JSON.stringify(vzkazPrazdny)}::jsonb
       WHERE id = ${inspekceId}::uuid
    `);
    await radky(sql`
      INSERT INTO tasks (kind, severity, reservation_id, inspection_id, title, detail)
      SELECT 'luna_review', 'warn', i.reservation_id, i.id,
             'Protokol bez fotek — ' || coalesce(u.name, i.unit_slug),
             'Vyhodnocení se pustilo nad inspekcí, ve které není jediná fotka.'
        FROM inspections i
        LEFT JOIN units u ON u.slug = i.unit_slug
       WHERE i.id = ${inspekceId}::uuid
    `);
    return {
      stav: "needs_review",
      shrnuti: "V protokolu není jediná fotka — není co porovnávat.",
      nakladHalere: 0,
      volani: 0,
      vzkaz: vzkazPrazdny,
      zony: [],
    };
  }

  const kPosouzeni = vysledky.filter((z) => z.kLidskemuPosouzeni);
  const shrnuti = await sestavShrnuti(insp.unit_slug, vysledky, volani, () => volani++);
  const vzkaz = sestavVzkaz(vysledky, await kontaktProHosta(), {
    uzJsmeProsiliOFotku: insp.uz_prosili,
  });

  // Když prosíme o doplňující fotku, protokol se hostovi znovu otevře — ale
  // jen pro ty zóny, o které jde. Zbytek zůstává odeslaný a nedá se přepsat.
  const dofoceni = vzkaz.ton === "dofoceni" ? vzkaz.zonyKDofoceni.map((z) => z.klic) : [];
  const stav: VysledekInspekce["stav"] = dofoceni.length
    ? "needs_photo"
    : kPosouzeni.length
      ? "needs_review"
      : "auto_clear";

  await radky(sql`
    UPDATE inspections
       SET status = ${stav}, analyzed_at = now(), summary_cs = ${shrnuti}, cost_cents = ${naklad},
           reopened_zones = ${`{${dofoceni.join(",")}}`}::text[],
           guest_message_cs = ${vzkaz.text}, guest_message_tone = ${vzkaz.ton},
           guest_message_at = now(), guest_message_json = ${JSON.stringify(vzkaz)}::jsonb
     WHERE id = ${inspekceId}::uuid
  `);

  // Případ ke schválení. Sám o sobě nic neznamená — je to fronta pro člověka.
  // Unikátní index drží jeden případ na zónu, takže opakované vyhodnocení
  // nevyrobí druhý.
  // Práh z checklistu rozhoduje tady, ne u vzkazu hostovi: založit případ
  // škody je formální krok, kterým se otevírá cesta k faktuře. U prosklené
  // stěny je práh 0,9, protože prasklina se plete s odrazem.
  for (const z of kPosouzeni.filter((z) => jePoskozeni(z.zavaznost) && z.jistota >= z.prahEskalace)) {
    await radky(sql`
      INSERT INTO damage_cases (reservation_id, inspection_id, zone_key,
                                proposed_amount_cents, finding_ids)
      SELECT i.reservation_id, i.id, ${z.klic}, ${Math.round(z.odhadKc.max * 100)}, '{}'::uuid[]
        FROM inspections i WHERE i.id = ${inspekceId}::uuid
      ON CONFLICT (inspection_id, zone_key) DO NOTHING
    `);
  }

  if (stav === "needs_photo") {
    await radky(sql`
      INSERT INTO tasks (kind, severity, reservation_id, inspection_id, title, detail)
      SELECT 'luna_review', 'info', i.reservation_id, i.id,
             'Čekáme na doplňující fotku — ' || coalesce(u.name, i.unit_slug),
             ${`Snímky ${vzkaz.zonyKDofoceni.map((z) => z.nazev).join(", ")} nešlo porovnat. Host byl požádán, aby je vyfotil znovu.`}
        FROM inspections i
        LEFT JOIN units u ON u.slug = i.unit_slug
       WHERE i.id = ${inspekceId}::uuid
    `);
  }

  if (stav === "needs_review") {
    // Zóny bez reference se do počtu nepočítají. Kdyby ano, majitel by po
    // třech protokolech přestal úkoly číst — a přehlédl by ten jeden skutečný.
    const skutecnych = kPosouzeni.filter((z) => !z.chybiReference).length;
    const chybejici = kPosouzeni.length - skutecnych;
    await radky(sql`
      INSERT INTO tasks (kind, severity, reservation_id, inspection_id, title, detail)
      SELECT 'luna_review', ${skutecnych ? "warn" : "info"}, i.reservation_id, i.id,
             -- Název domku, ne slug: úkol čte člověk a ten zná „Achát".
             'Fotoprotokol ke schválení — ' || coalesce(u.name, i.unit_slug),
             ${popisUkolu(skutecnych, chybejici)}
        FROM inspections i
        LEFT JOIN units u ON u.slug = i.unit_slug
       WHERE i.id = ${inspekceId}::uuid
    `);
  }

  return { stav, shrnuti, nakladHalere: naklad, volani, vzkaz, zony: vysledky };
}

/* ===== pomocné ===== */

type Obrazky = {
  vse: { data: Buffer; popis: string }[];
  mista: { x: number; y: number; w: number; h: number }[];
};

async function sestavObrazky(k: Kandidat): Promise<Obrazky> {
  const mista = k.srovnani.oblasti.slice(0, 2);
  const pary = await Promise.all(
    mista.map(async (o) => [await vyrez(k.pred, o), await vyrez(k.po, o)] as const),
  );
  return {
    mista,
    vse: [
      { data: k.pred, popis: "referenční celek" },
      { data: k.po, popis: "celek od hosta" },
      ...pary.flatMap(([a, b], i) => [
        { data: a, popis: `referenční výřez ${i + 1}` },
        { data: b, popis: `výřez ${i + 1} od hosta` },
      ]),
    ],
  };
}

function popisUkolu(skutecnych: number, chybejici: number): string {
  const casti: string[] = [];
  if (skutecnych) {
    casti.push(
      `Luna našla ${skutecnych} ${skutecnych === 1 ? "zónu" : skutecnych < 5 ? "zóny" : "zón"} k posouzení.`,
    );
  }
  if (chybejici) {
    casti.push(
      `U ${chybejici} ${chybejici === 1 ? "zóny chybí" : "zón chybí"} referenční snímek — doplň ho prosím v referenčních fotkách domku.`,
    );
  }
  casti.push("Rozhodnutí je na tobě.");
  return casti.join(" ");
}

function prazdnaZona(
  zona: ZonaDef,
  zarovnani: Porovnani["zarovnani"],
  duvod: string,
  volby: { kLidem?: boolean; chybiReference?: boolean } = {},
): ZonaVysledku {
  const kLidem = volby.kLidem ?? volby.chybiReference ?? false;
  return {
    klic: zona.klic,
    nazev: zona.nazev,
    zavaznost: "none",
    jistota: kLidem ? 0 : 0.95,
    prahEskalace: zona.prahEskalace,
    coSeZmenilo: duvod,
    protiargument: null,
    alternativa: "—",
    stabilita: null,
    zarovnani,
    potrebaNoveFoto: false,
    svetloUhel: false,
    neporadek: false,
    prosba: null,
    kLidskemuPosouzeni: kLidem,
    chybiReference: Boolean(volby.chybiReference),
    odhadKc: { min: 0, max: 0 },
  };
}

async function prumernyJas(data: Buffer): Promise<number> {
  const sharp = (await import("sharp")).default;
  const { channels } = await sharp(data).greyscale().stats();
  return channels[0]?.mean ?? 0;
}

/**
 * Odkud vzít číslo pro hosta.
 *
 * Infolinka je v nastavení firmy, ne v kódu — majitel ji může přesměrovat na
 * správce, aniž by kdokoli nasazoval novou verzi.
 */
async function kontaktProHosta(): Promise<{ telefon: string; email: string }> {
  const [f] = await radky<{ checkout_hotline: string | null }>(
    sql`SELECT checkout_hotline FROM company_settings WHERE id = 1`,
  ).catch(() => [] as { checkout_hotline: string | null }[]);
  return { telefon: f?.checkout_hotline?.trim() || SITE.phone, email: SITE.email };
}

async function zapisBeh(
  inspekceId: string,
  zona: string,
  index: number,
  rezim: "primary" | "swapped" | "devils_advocate" | "aggregate",
  odpoved: NonNullable<Awaited<ReturnType<typeof zeptejSe>>>,
): Promise<string> {
  const [r] = await radky<{ id: string }>(sql`
    INSERT INTO luna_runs (inspection_id, zone_key, run_index, mode, model, prompt_version,
                           input_tokens, cache_read_tokens, output_tokens, cost_cents, latency_ms,
                           raw_response)
    VALUES (${inspekceId}::uuid, ${zona}, ${index}, ${rezim}, ${odpoved.uzitek.model}, ${VERZE},
            ${odpoved.uzitek.vstupniTokeny}, ${odpoved.uzitek.kesovaneTokeny},
            ${odpoved.uzitek.vystupniTokeny}, ${odpoved.uzitek.cenaHalere},
            ${odpoved.uzitek.trvaniMs}, ${JSON.stringify(odpoved.nalez)}::jsonb)
    RETURNING id::text AS id
  `);
  return r.id;
}

async function zapisNalez(
  runId: string,
  n: Nalez,
  protiargument: string | null,
  stabilita: "stable" | "unstable" | null,
  potlaceno: string | null,
): Promise<void> {
  await radky(sql`
    INSERT INTO luna_findings (luna_run_id, zone_key, severity, confidence, evidence_bbox,
                               what_changed, alternative_explanation, counter_argument,
                               is_lighting_or_angle_artifact, is_guest_mess_not_damage,
                               estimated_cost_min_cents, estimated_cost_max_cents,
                               needs_reshoot, stability, suppressed_reason)
    VALUES (${runId}::uuid, ${n.zone_key}, ${n.severity}, ${n.confidence},
            ${n.evidence_bbox ? JSON.stringify(n.evidence_bbox) : null}::jsonb,
            ${n.what_changed}, ${n.alternative_explanation}, ${protiargument},
            ${n.is_lighting_or_angle_artifact}, ${n.is_guest_mess_not_damage},
            ${Math.round(n.estimated_cost_czk.min * 100)}, ${Math.round(n.estimated_cost_czk.max * 100)},
            ${n.needs_reshoot}, ${stabilita}, ${potlaceno})
  `);
}

async function sestavShrnuti(
  domek: string,
  zony: ZonaVysledku[],
  volani: number,
  pricti: () => void,
): Promise<string> {
  const zajimave = zony.filter((z) => z.zavaznost !== "none" || z.kLidskemuPosouzeni);
  if (!zajimave.length) {
    return "Všechny zóny odpovídají stavu při předání. Není co řešit.";
  }
  if (volani >= STROP_VOLANI || dostupnyModel() === "zadny") {
    return `${zajimave.length} ${zajimave.length === 1 ? "zóna vyžaduje" : "zón vyžaduje"} posouzení: ${zajimave.map((z) => z.nazev).join(", ")}.`;
  }
  const o = await zeptejSe(zpravaShrnuti(domek, zajimave), [], "aggregate").catch(() => null);
  pricti();
  return o?.nalez.what_changed || `Posuď prosím: ${zajimave.map((z) => z.nazev).join(", ")}.`;
}
