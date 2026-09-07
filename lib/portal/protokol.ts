import "server-only";

import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { nactiZony, zajistiChecklist, type ZonaDef } from "@/lib/luna/checklist";
import { podepsaneOdkazy } from "@/lib/luna/uloziste";
import { poleTextu } from "./foto";

/**
 * Odjezdový foto-protokol z pohledu hosta.
 *
 * Checklist se na rezervaci **pinuje** — když se později zóny upraví, starý
 * případ musí jít pořád obhájit tím, na co přesně se hosta v tu chvíli ptalo.
 *
 * Protokol se zakládá **na fyzický domek, ne na rezervaci.** „Celý les" je
 * prodejná jednotka, která je ale jen složená z Acháta a Mechu: dosud vznikla
 * jedna inspekce se `unit_slug = 'cely-les'`, ke které neexistuje žádná
 * referenční sada, takže se všech dvanáct zón poslalo k ručnímu posouzení —
 * a host přitom fotil dvanáct zón pro dva domky. Teď dostane dvacet čtyři zón
 * ve dvou blocích a každý blok se porovnává proti své vlastní referenci.
 */

export type StavZony = ZonaDef & {
  /** Ke kterému fyzickému domku zóna patří. U jednoho domku je všude stejný. */
  domek: string;
  domekSlug: string;
  inspekceId: string;
  /** Odkaz na referenční snímek, aby host věděl, co má vyfotit. */
  referenceUrl: string | null;
  hotovo: boolean;
  fotkaUrl: string | null;
};

export type Protokol = {
  /** Inspekce po domcích, v pořadí, v jakém je host prochází. */
  inspekce: { id: string; domek: string; domekSlug: string; stav: string }[];
  /** Nejméně hotový stav ze všech domků — podle něj se protokol chová. */
  stav: string;
  /** Zóny, které smí host doplnit, když jsme ho o to požádali. */
  znovuOtevrene: string[];
  /** Víc než jeden domek znamená, že se u zón musí ukazovat, kterého se týkají. */
  viceDomku: boolean;
  zony: StavZony[];
  hotovoZon: number;
  povinnychZbyva: number;
};

/** Pořadí stavů od nejméně hotového. Protokol je tak hotový jako jeho nejhorší část. */
const PORADI_STAVU = ["draft", "needs_photo", "submitted", "analyzing", "needs_review", "auto_clear", "closed"];

/** Najde nebo založí odjezdový protokol pro rezervaci. */
export async function zajistiProtokol(rezervaceId: string): Promise<Protokol> {
  const [rez] = await radky<{ unit_id: string; checklist_version_id: string | null }>(
    sql`SELECT r.unit_id::text AS unit_id, r.checklist_version_id::text AS checklist_version_id
          FROM reservations r WHERE r.id = ${rezervaceId}::uuid`,
  );
  if (!rez) throw new Error("Rezervace nenalezena.");

  const verzeId = rez.checklist_version_id ?? (await zajistiChecklist());
  if (!rez.checklist_version_id) {
    await radky(sql`
      UPDATE reservations SET checklist_version_id = ${verzeId}::uuid WHERE id = ${rezervaceId}::uuid
    `);
  }

  /*
   * Fyzické domky, kterých se rezervace týká.
   *
   * U virtuální jednotky jsou to její součásti z `unit_components`; u obyčejné
   * ona sama. Kdyby složená jednotka neměla součásti (překlep v seedu), vrátí
   * se aspoň ona — protokol bez zón by byl horší než protokol bez reference.
   */
  const domky = await radky<{ slug: string; name: string }>(sql`
    SELECT u.slug, u.name FROM units u WHERE u.id = ${rez.unit_id}::uuid AND NOT u.is_virtual
    UNION ALL
    SELECT c.slug, c.name
      FROM unit_components uc
      JOIN units c ON c.id = uc.member_unit_id
     WHERE uc.composite_unit_id = ${rez.unit_id}::uuid
     ORDER BY slug
  `);
  const fyzicke = domky.length
    ? domky
    : await radky<{ slug: string; name: string }>(
        sql`SELECT slug, name FROM units WHERE id = ${rez.unit_id}::uuid`,
      );

  /* ----- Jedna inspekce na domek ----- */
  const inspekce: Protokol["inspekce"] = [];
  const znovuOtevrene: string[] = [];

  for (const d of fyzicke) {
    const [existujici] = await radky<{ id: string; status: string; reopened: string[] | string | null }>(sql`
      SELECT id::text AS id, status, reopened_zones AS reopened FROM inspections
       WHERE reservation_id = ${rezervaceId}::uuid AND type = 'checkout' AND unit_slug = ${d.slug}
       ORDER BY id LIMIT 1
    `);

    if (existujici) {
      inspekce.push({ id: existujici.id, domek: d.name, domekSlug: d.slug, stav: existujici.status });
      znovuOtevrene.push(...poleTextu(existujici.reopened));
      continue;
    }

    const [baseline] = await radky<{ id: string }>(sql`
      SELECT id::text AS id FROM baseline_sets
       WHERE unit_slug = ${d.slug} AND valid_to IS NULL
       ORDER BY version DESC LIMIT 1
    `);
    const [nova] = await radky<{ id: string }>(sql`
      INSERT INTO inspections (reservation_id, unit_slug, type, checklist_version_id, baseline_set_id)
      VALUES (${rezervaceId}::uuid, ${d.slug}, 'checkout', ${verzeId}::uuid, ${baseline?.id ?? null}::uuid)
      RETURNING id::text AS id
    `);
    inspekce.push({ id: nova.id, domek: d.name, domekSlug: d.slug, stav: "draft" });
  }

  /* ----- Zóny napříč domky ----- */
  const zony = await nactiZony(verzeId);
  const idInspekci = inspekce.map((i) => i.id);

  const fotky = await radky<{ inspection_id: string; zone_key: string; storage_key: string }>(sql`
    SELECT DISTINCT ON (inspection_id, zone_key)
           inspection_id::text AS inspection_id, zone_key, storage_key
      FROM inspection_photos
     WHERE inspection_id = ANY(${sql.raw(poleUuid(idInspekci))}) AND deleted_at IS NULL
     ORDER BY inspection_id, zone_key, uploaded_at DESC
  `);
  const reference = await radky<{ inspection_id: string; zone_key: string; storage_key: string }>(sql`
    SELECT i.id::text AS inspection_id, bs.zone_key, bs.storage_key
      FROM baseline_shots bs
      JOIN inspections i ON i.baseline_set_id = bs.baseline_set_id
     WHERE i.id = ANY(${sql.raw(poleUuid(idInspekci))})
  `);

  // Všechny odkazy jedním voláním. Po jednom to bylo dvacet čtyři
  // round-tripů, než se odešel první bajt stránky — hostovi na mobilu v lese.
  const odkazy = await podepsaneOdkazy(
    [...fotky.map((f) => f.storage_key), ...reference.map((r) => r.storage_key)],
    1800,
  );

  const stavy: StavZony[] = inspekce.flatMap((i) =>
    zony.map((z) => {
      const f = fotky.find((x) => x.inspection_id === i.id && x.zone_key === z.klic);
      const r = reference.find((x) => x.inspection_id === i.id && x.zone_key === z.klic);
      return {
        ...z,
        domek: i.domek,
        domekSlug: i.domekSlug,
        inspekceId: i.id,
        hotovo: Boolean(f),
        fotkaUrl: (f && odkazy.get(f.storage_key)) ?? null,
        referenceUrl: (r && odkazy.get(r.storage_key)) ?? null,
      };
    }),
  );

  const stav = inspekce
    .map((i) => i.stav)
    .sort((a, b) => PORADI_STAVU.indexOf(a) - PORADI_STAVU.indexOf(b))[0] ?? "draft";

  return {
    inspekce,
    stav,
    znovuOtevrene: [...new Set(znovuOtevrene)],
    viceDomku: inspekce.length > 1,
    zony: stavy,
    hotovoZon: stavy.filter((z) => z.hotovo).length,
    povinnychZbyva: stavy.filter((z) => z.povinna && !z.hotovo).length,
  };
}

/**
 * Seznam identifikátorů do `ANY(...)`.
 *
 * Drizzle neumí předat pole uuid jako parametr, takže se skládá do literálu —
 * a proto se hodnoty **musí** ověřit. Jsou to identifikátory z naší databáze,
 * ale vlepovat cokoli nekontrolovaného do SQL je zvyk, který se jednou vymstí.
 */
function poleUuid(ids: string[]): string {
  const ciste = ids.filter((i) => /^[0-9a-f-]{36}$/i.test(i));
  return `ARRAY[${ciste.map((i) => `'${i}'::uuid`).join(",") || "NULL::uuid"}]`;
}
