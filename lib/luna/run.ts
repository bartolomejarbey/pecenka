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

/**
 * Luna 5.6 — vyhodnocení odjezdového foto-protokolu.
 *
 * Co tenhle modul **nikdy** neudělá: nenapíše hostovi, nesáhne na kauci
 * a nerozhodne o koruně. Vyrobí podklad, který si přečte majitel. Aby to
 * nešlo obejít omylem, vyžaduje zápis do `damage_decisions` člověka
 * a ručně psané odůvodnění — a je to databázové omezení, ne domluva.
 *
 * Přesnost před úplností. U dvoudomkového provozu zničí jedno falešné
 * obvinění víc, než ušetří všechny nalezené škody dohromady.
 */

/** Tvrdý strop volání modelu na jednu inspekci, ať retry smyčka nevyrobí účet. */
const STROP_VOLANI = 8;

const PORADI: Zavaznost[] = ["none", "dirt", "wear", "damage_minor", "damage_major", "missing"];
const stupen = (z: Zavaznost) => PORADI.indexOf(z);
const jePoskozeni = (z: Zavaznost) => stupen(z) >= stupen("damage_minor");

export type VysledekInspekce = {
  stav: "auto_clear" | "needs_review" | "closed";
  shrnuti: string;
  nakladHalere: number;
  volani: number;
  zony: {
    klic: string;
    nazev: string;
    zavaznost: Zavaznost;
    jistota: number;
    coSeZmenilo: string;
    protiargument: string | null;
    alternativa: string;
    stabilita: "stable" | "unstable" | null;
    zarovnani: Porovnani["zarovnani"];
    kLidskemuPosouzeni: boolean;
    odhadKc: { min: number; max: number };
  }[];
};

type FotkaRadek = {
  id: string;
  zone_key: string;
  storage_key: string;
  dhash64: string | number | null;
};

type BaselineRadek = {
  id: string;
  zone_key: string;
  storage_key: string;
  mean_luminance: number;
  light_variant: string;
};

export async function vyhodnotInspekci(inspekceId: string): Promise<VysledekInspekce> {
  const [insp] = await radky<{
    id: string;
    unit_slug: string;
    checklist_version_id: string;
    baseline_set_id: string | null;
    status: string;
  }>(sql`
    SELECT id::text AS id, unit_slug, checklist_version_id::text AS checklist_version_id,
           baseline_set_id::text AS baseline_set_id, status
      FROM inspections WHERE id = ${inspekceId}::uuid
  `);
  if (!insp) throw new Error("Inspekce nenalezena.");

  await radky(sql`UPDATE inspections SET status = 'analyzing' WHERE id = ${inspekceId}::uuid`);

  const zony = await nactiZony(insp.checklist_version_id);
  const fotky = await radky<FotkaRadek>(sql`
    SELECT id::text AS id, zone_key, storage_key, dhash64
      FROM inspection_photos WHERE inspection_id = ${inspekceId}::uuid ORDER BY uploaded_at
  `);
  const baseline = insp.baseline_set_id
    ? await radky<BaselineRadek>(sql`
        SELECT id::text AS id, zone_key, storage_key, mean_luminance, light_variant
          FROM baseline_shots WHERE baseline_set_id = ${insp.baseline_set_id}::uuid
      `)
    : [];

  let volani = 0;
  let naklad = 0;
  const vysledky: VysledekInspekce["zony"] = [];

  for (const zona of zony) {
    const fotkaZony = fotky.find((f) => f.zone_key === zona.klic);
    if (!fotkaZony) continue;

    const kandidati = baseline.filter((b) => b.zone_key === zona.klic);
    if (!kandidati.length) {
      // Bez referenčního snímku není s čím porovnávat. Nic to neznamená —
      // jen to jde k člověku.
      vysledky.push(prazdnaZona(zona, "good", true, "Pro tuhle zónu zatím nemáme referenční snímek."));
      continue;
    }

    const po = await stahni(fotkaZony.storage_key);
    // Referenční snímek vybíráme podle nejbližšího světla — porovnávat
    // večerní fotku s poledním baseline je zbytečná práce navíc.
    const jasPo = await prumernyJas(po);
    const nejblizsi = kandidati.reduce((a, b) =>
      Math.abs(b.mean_luminance - jasPo) < Math.abs(a.mean_luminance - jasPo) ? b : a,
    );
    const pred = await stahni(nejblizsi.storage_key);

    const srovnani = await porovnej(pred, po);

    await radky(sql`
      INSERT INTO photo_pairs (inspection_id, zone_key, before_shot_id, after_photo_id,
                               align_status, ssim_global, diff_regions)
      VALUES (${inspekceId}::uuid, ${zona.klic}, ${nejblizsi.id}::uuid, ${fotkaZony.id}::uuid,
              ${srovnani.zarovnani}, ${srovnani.podobnost}, ${JSON.stringify(srovnani.oblasti)}::jsonb)
    `);

    // BRÁNA: bez podezřelé oblasti se model nevolá vůbec.
    if (srovnani.oblasti.length === 0 && srovnani.zarovnani !== "poor") {
      vysledky.push(prazdnaZona(zona, srovnani.zarovnani, false, "Beze změny oproti referenci."));
      continue;
    }

    if (volani >= STROP_VOLANI || dostupnyModel() === "zadny") {
      vysledky.push(
        prazdnaZona(
          zona,
          srovnani.zarovnani,
          true,
          dostupnyModel() === "zadny"
            ? "Vyhodnocení modelem není nastavené — obrazová analýza našla rozdíl, posuď ho prosím sám."
            : "Vyčerpán limit volání modelu pro tuhle inspekci.",
        ),
      );
      continue;
    }

    /* ----- Hlavní běh ----- */
    // Výřezy se posílají v PÁRECH — bez referenčního výřezu nemá model
    // co s čím porovnat a hlásí „nic" i tam, kde je rozdíl zjevný.
    const mista = srovnani.oblasti.slice(0, 2);
    const paryVyrezu = await Promise.all(
      mista.map(async (o) => [await vyrez(pred, o), await vyrez(po, o)] as const),
    );
    const obrazky = [
      { data: pred, popis: "referenční celek" },
      { data: po, popis: "celek od hosta" },
      ...paryVyrezu.flatMap(([a, b], i) => [
        { data: a, popis: `referenční výřez ${i + 1}` },
        { data: b, popis: `výřez ${i + 1} od hosta` },
      ]),
    ];

    const hlavni = await zeptejSe(
      zpravaProZonu(
        { klic: zona.klic, nazev: zona.nazev, otazky: zona.otazky },
        {
          rozdilJasu: srovnani.rozdilJasu,
          podobnost: srovnani.podobnost,
          zarovnani: srovnani.zarovnani,
          vyrezy: mista,
        },
      ),
      obrazky,
      zona.klic,
    );
    volani++;
    if (!hlavni) {
      vysledky.push(prazdnaZona(zona, srovnani.zarovnani, true, "Model neodpověděl."));
      continue;
    }
    naklad += hlavni.uzitek.cenaHalere;
    const runId = await zapisBeh(inspekceId, zona.klic, volani, "primary", hlavni);

    let nalez = hlavni.nalez;
    let stabilita: "stable" | "unstable" | null = null;
    let protiargument: string | null = null;

    /* ----- Přehodnocení: jen když jde o poškození ----- */
    if (jePoskozeni(nalez.severity) && volani + 2 <= STROP_VOLANI) {
      const prohozene = await zeptejSe(
        zpravaProhozena({ klic: zona.klic, nazev: zona.nazev, otazky: zona.otazky }),
        [{ data: po, popis: "od hosta" }, { data: pred, popis: "referenční" }],
        zona.klic,
      );
      volani++;
      if (prohozene) {
        naklad += prohozene.uzitek.cenaHalere;
        await zapisBeh(inspekceId, zona.klic, volani, "swapped", prohozene);
        const rozdil = Math.abs(stupen(nalez.severity) - stupen(prohozene.nalez.severity));
        stabilita = rozdil >= 2 ? "unstable" : "stable";
      }

      const oponent = await zeptejSe(
        zpravaProtiargument(
          { klic: zona.klic, nazev: zona.nazev, otazky: zona.otazky },
          nalez.what_changed,
        ),
        obrazky,
        zona.klic,
      );
      volani++;
      if (oponent) {
        naklad += oponent.uzitek.cenaHalere;
        await zapisBeh(inspekceId, zona.klic, volani, "devils_advocate", oponent);
        protiargument = oponent.nalez.what_changed;
      }

      // Nestabilní nález se nikdy nepoužije jako tvrzení — jde jen k člověku.
      if (stabilita === "unstable") {
        nalez = { ...nalez, confidence: Math.min(nalez.confidence, 0.5) };
      }
    }

    await zapisNalez(runId, nalez, protiargument, stabilita);

    // Špatné zarovnání ani žádost o nové foto nikdy neeskaluje.
    const kLidskemuPosouzeni =
      srovnani.zarovnani === "poor" ||
      nalez.needs_reshoot ||
      (jePoskozeni(nalez.severity) && nalez.confidence >= 0.6) ||
      stabilita === "unstable";

    vysledky.push({
      klic: zona.klic,
      nazev: zona.nazev,
      zavaznost: srovnani.zarovnani === "poor" ? "none" : nalez.severity,
      jistota: nalez.confidence,
      coSeZmenilo: nalez.what_changed,
      protiargument,
      alternativa: nalez.alternative_explanation,
      stabilita,
      zarovnani: srovnani.zarovnani,
      kLidskemuPosouzeni,
      odhadKc: nalez.estimated_cost_czk,
    });
  }

  /* ----- Vyhodnocení celé inspekce ----- */
  const kPosouzeni = vysledky.filter((z) => z.kLidskemuPosouzeni);
  const stav: VysledekInspekce["stav"] = kPosouzeni.length ? "needs_review" : "auto_clear";

  const shrnuti = await sestavShrnuti(insp.unit_slug, vysledky, volani, () => volani++);

  await radky(sql`
    UPDATE inspections
       SET status = ${stav}, analyzed_at = now(), summary_cs = ${shrnuti}, cost_cents = ${naklad}
     WHERE id = ${inspekceId}::uuid
  `);

  // Případ ke schválení. Sám o sobě nic neznamená — je to fronta pro člověka.
  for (const z of kPosouzeni.filter((z) => jePoskozeni(z.zavaznost))) {
    await radky(sql`
      INSERT INTO damage_cases (reservation_id, inspection_id, zone_key,
                                proposed_amount_cents, finding_ids)
      SELECT i.reservation_id, i.id, ${z.klic}, ${Math.round(z.odhadKc.max * 100)}, '{}'::uuid[]
        FROM inspections i
        LEFT JOIN units u ON u.slug = i.unit_slug
       WHERE i.id = ${inspekceId}::uuid
    `);
  }

  if (stav === "needs_review") {
    await radky(sql`
      INSERT INTO tasks (kind, severity, reservation_id, inspection_id, title, detail)
      SELECT 'luna_review', 'warn', i.reservation_id, i.id,
             -- Název domku, ne slug: úkol čte člověk a ten zná „Achát".
             'Fotoprotokol ke schválení — ' || coalesce(u.name, i.unit_slug),
             ${`Luna našla ${kPosouzeni.length} ${kPosouzeni.length === 1 ? "zónu" : "zón"} k posouzení. Rozhodnutí je na tobě.`}
        FROM inspections i
        LEFT JOIN units u ON u.slug = i.unit_slug
       WHERE i.id = ${inspekceId}::uuid
    `);
  }

  return { stav, shrnuti, nakladHalere: naklad, volani, zony: vysledky };
}

/* ===== pomocné ===== */

function prazdnaZona(
  zona: ZonaDef,
  zarovnani: Porovnani["zarovnani"],
  kLidem: boolean,
  duvod: string,
): VysledekInspekce["zony"][number] {
  return {
    klic: zona.klic,
    nazev: zona.nazev,
    zavaznost: "none",
    jistota: kLidem ? 0 : 0.95,
    coSeZmenilo: duvod,
    protiargument: null,
    alternativa: "—",
    stabilita: null,
    zarovnani,
    kLidskemuPosouzeni: kLidem,
    odhadKc: { min: 0, max: 0 },
  };
}

async function prumernyJas(data: Buffer): Promise<number> {
  const sharp = (await import("sharp")).default;
  const { channels } = await sharp(data).greyscale().stats();
  return channels[0]?.mean ?? 0;
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
): Promise<void> {
  await radky(sql`
    INSERT INTO luna_findings (luna_run_id, zone_key, severity, confidence, evidence_bbox,
                               what_changed, alternative_explanation, counter_argument,
                               is_lighting_or_angle_artifact, is_guest_mess_not_damage,
                               estimated_cost_min_cents, estimated_cost_max_cents,
                               needs_reshoot, stability)
    VALUES (${runId}::uuid, ${n.zone_key}, ${n.severity}, ${n.confidence},
            ${n.evidence_bbox ? JSON.stringify(n.evidence_bbox) : null}::jsonb,
            ${n.what_changed}, ${n.alternative_explanation}, ${protiargument},
            ${n.is_lighting_or_angle_artifact}, ${n.is_guest_mess_not_damage},
            ${Math.round(n.estimated_cost_czk.min * 100)}, ${Math.round(n.estimated_cost_czk.max * 100)},
            ${n.needs_reshoot}, ${stabilita})
  `);
}

async function sestavShrnuti(
  domek: string,
  zony: VysledekInspekce["zony"],
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
  const o = await zeptejSe(zpravaShrnuti(domek, zajimave), [], "aggregate");
  pricti();
  return o?.nalez.what_changed || `Posuď prosím: ${zajimave.map((z) => z.nazev).join(", ")}.`;
}
