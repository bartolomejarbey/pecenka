import "server-only";

import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { nactiZony, zajistiChecklist, type ZonaDef } from "@/lib/luna/checklist";
import { otiskProDb, porovnej, posudFotku, pripravFotku } from "@/lib/luna/obraz";
import { cestaBaseline, nahraj, podepsaneOdkazy, stahni } from "@/lib/luna/uloziste";

/**
 * Referenční („před") snímky domku.
 *
 * Celá Luna porovnává odjezdové fotky proti téhle sadě. Dosud ji uměl založit
 * jen vývojářský skript, takže majitel neměl jak systém naučit, že se vyměnil
 * gauč nebo přemalovala stěna — a po první změně v domku by systém hlásil
 * poškození tam, kde je nový nábytek.
 *
 * Sada se **nikdy nepřepisuje, když už podle ní někdo hodnotil.** Vznikne
 * nová verze a stará se uzavře. Bez toho by rezervace z minulého měsíce
 * ztratila snímek, na kterém stojí nárok, a spor by nešlo obhájit.
 */

export type StavZony = ZonaDef & {
  /** Varianty světla, které pro tuhle zónu máme. */
  snimky: { id: string; varianta: string; url: string | null; kdy: string; jas: number }[];
};

export type StavDomku = {
  slug: string;
  nazev: string;
  verze: number | null;
  zalozeno: string | null;
  pouzita: boolean;
  hotovoZon: number;
  povinnychZon: number;
  zony: StavZony[];
};

const VARIANTY: Record<string, string> = {
  day: "slunečno",
  overcast: "zataženo",
  artificial: "umělé světlo",
};

export const popisVarianty = (v: string) => VARIANTY[v] ?? v;

/**
 * Varianta světla podle jasu snímku.
 *
 * Majitel nemá řešit, do které škatulky fotka patří — vyfotí ji a systém si
 * ji zařadí sám. Rozhoduje průměrný jas, protože právě podle něj se pak při
 * porovnání vybírá nejbližší reference.
 */
export function variantaPodleJasu(jas: number): "day" | "overcast" | "artificial" {
  if (jas >= 145) return "day";
  if (jas >= 70) return "overcast";
  return "artificial";
}

export async function nactiDomkySReferencemi(): Promise<StavDomku[]> {
  const jednotky = await radky<{ slug: string; name: string }>(
    sql`SELECT slug, name FROM units WHERE NOT is_virtual AND active ORDER BY sort_order, slug`,
  );
  const stavy = await Promise.all(jednotky.map((j) => nactiDomek(j.slug, j.name)));
  return stavy.filter((s): s is StavDomku => s !== null);
}

export async function nactiDomek(slug: string, nazev?: string): Promise<StavDomku | null> {
  const [jednotka] = nazev
    ? [{ name: nazev }]
    : await radky<{ name: string }>(
        sql`SELECT name FROM units WHERE slug = ${slug} AND NOT is_virtual`,
      );
  if (!jednotka) return null;

  const verzeId = await zajistiChecklist();
  const zonyDef = await nactiZony(verzeId);

  const [sada] = await radky<{ id: string; version: number; created_at: string; pouzita: boolean }>(sql`
    SELECT s.id::text AS id, s.version, s.created_at::text AS created_at,
           EXISTS (SELECT 1 FROM inspections i WHERE i.baseline_set_id = s.id) AS pouzita
      FROM baseline_sets s
     WHERE s.unit_slug = ${slug} AND s.valid_to IS NULL
     ORDER BY s.version DESC LIMIT 1
  `);

  const snimky = sada
    ? await radky<{
        id: string; zone_key: string; light_variant: string; storage_key: string;
        created_at: string; mean_luminance: number;
      }>(sql`
        SELECT id::text AS id, zone_key, light_variant, storage_key,
               created_at::text AS created_at, mean_luminance
          FROM baseline_shots WHERE baseline_set_id = ${sada.id}::uuid
         ORDER BY zone_key, light_variant
      `)
    : [];

  const odkazy = await podepsaneOdkazy(snimky.map((s) => s.storage_key), 1800);

  const zony: StavZony[] = zonyDef.map((z) => ({
    ...z,
    snimky: snimky
      .filter((s) => s.zone_key === z.klic)
      .map((s) => ({
        id: s.id,
        varianta: s.light_variant,
        url: odkazy.get(s.storage_key) ?? null,
        kdy: s.created_at,
        jas: Math.round(s.mean_luminance),
      })),
  }));

  return {
    slug,
    nazev: jednotka.name,
    verze: sada?.version ?? null,
    zalozeno: sada?.created_at ?? null,
    pouzita: Boolean(sada?.pouzita),
    hotovoZon: zony.filter((z) => z.snimky.length > 0).length,
    povinnychZon: zony.filter((z) => z.povinna).length,
    zony,
  };
}

export type VysledekNahrani =
  | {
      ok: true;
      zprava: string;
      /** Podobnost s předchozí referencí téže zóny, když nějaká byla. */
      podobnostSPredchozi: number | null;
      novaVerze: boolean;
    }
  | { ok: false; chyba: string };

/**
 * Nahraje nebo nahradí referenční snímek jedné zóny.
 *
 * Podobnost s předchozí referencí se počítá schválně a ukazuje se majiteli:
 * když vyjde nízká, buď se v domku opravdu něco změnilo (a je dobře, že
 * referenci mění), nebo omylem nahrál koupelnu do WC — a to je chyba, která
 * otráví každou další inspekci té jednotky.
 */
export async function nahrajReferenci(
  slugDomku: string,
  zonaKlic: string,
  data: Buffer,
  kdo: string,
): Promise<VysledekNahrani> {
  const verzeChecklistu = await zajistiChecklist();
  const zony = await nactiZony(verzeChecklistu);
  if (!zony.some((z) => z.klic === zonaKlic)) {
    return { ok: false, chyba: "Tahle zóna v checklistu není." };
  }

  const [jednotka] = await radky<{ slug: string }>(
    sql`SELECT slug FROM units WHERE slug = ${slugDomku} AND NOT is_virtual`,
  );
  if (!jednotka) return { ok: false, chyba: "Domek nenalezen." };

  let pripravena;
  try {
    pripravena = await pripravFotku(data);
  } catch {
    return { ok: false, chyba: "Tenhle soubor neumíme přečíst. Zkus JPEG nebo PNG." };
  }

  const posudek = await posudFotku(pripravena.data);
  if (!posudek.pouzitelna) {
    // U reference je laťka tvrdá: rozmazaná reference znehodnotí každou
    // budoucí inspekci téhle zóny, ne jednu fotku.
    return { ok: false, chyba: `${posudek.vzkaz} (Reference musí být v pořádku — porovnává se proti ní každý odjezd.)` };
  }

  const varianta = variantaPodleJasu(posudek.jas);

  /* ----- Která sada ----- */
  const [aktivni] = await radky<{ id: string; version: number; pouzita: boolean }>(sql`
    SELECT s.id::text AS id, s.version,
           EXISTS (SELECT 1 FROM inspections i WHERE i.baseline_set_id = s.id) AS pouzita
      FROM baseline_sets s
     WHERE s.unit_slug = ${slugDomku} AND s.valid_to IS NULL
     ORDER BY s.version DESC LIMIT 1
  `);

  let sadaId = aktivni?.id;
  let verze = aktivni?.version ?? 1;
  let novaVerze = false;

  if (!aktivni) {
    const [n] = await radky<{ id: string }>(sql`
      INSERT INTO baseline_sets (unit_slug, version, valid_from, created_by, note)
      VALUES (${slugDomku}, 1, now(), ${kdo}, 'Založeno z administrace')
      RETURNING id::text AS id
    `);
    sadaId = n.id;
  } else if (aktivni.pouzita) {
    // Podle téhle sady už někdo hodnotil. Přepsat ji by znamenalo, že
    // hotová inspekce ztratí snímek, na kterém stojí. Zakládá se nová verze
    // a snímky ostatních zón se do ní přenesou beze změny.
    verze = aktivni.version + 1;
    const [n] = await radky<{ id: string }>(sql`
      INSERT INTO baseline_sets (unit_slug, version, valid_from, created_by, note)
      VALUES (${slugDomku}, ${verze}, now(), ${kdo},
              ${`Nová verze kvůli změně zóny ${zonaKlic}`})
      RETURNING id::text AS id
    `);
    await radky(sql`
      INSERT INTO baseline_shots (baseline_set_id, zone_key, light_variant, storage_key,
                                  dhash64, mean_luminance, guide_outline_svg, created_at,
                                  uploaded_by, note)
      SELECT ${n.id}::uuid, zone_key, light_variant, storage_key, dhash64, mean_luminance,
             guide_outline_svg, created_at, uploaded_by, note
        FROM baseline_shots WHERE baseline_set_id = ${aktivni.id}::uuid
    `);
    await radky(sql`UPDATE baseline_sets SET valid_to = now() WHERE id = ${aktivni.id}::uuid`);
    sadaId = n.id;
    novaVerze = true;
  }

  /* ----- Kontrola proti tomu, co tam bylo ----- */
  const [predchozi] = await radky<{ storage_key: string }>(sql`
    SELECT storage_key FROM baseline_shots
     WHERE baseline_set_id = ${sadaId}::uuid AND zone_key = ${zonaKlic}
     ORDER BY created_at DESC LIMIT 1
  `);
  let podobnost: number | null = null;
  if (predchozi) {
    podobnost = await stahni(predchozi.storage_key)
      .then((stara) => porovnej(stara, pripravena.data))
      .then((p) => Math.round(p.podobnost * 100))
      .catch(() => null);
  }

  /* ----- Uložení ----- */
  const cesta = cestaBaseline(slugDomku, verze, zonaKlic, varianta);
  await nahraj(cesta, pripravena.data);

  await radky(sql`
    INSERT INTO baseline_shots (baseline_set_id, zone_key, light_variant, storage_key,
                                dhash64, mean_luminance, uploaded_by)
    VALUES (${sadaId}::uuid, ${zonaKlic}, ${varianta}, ${cesta},
            ${otiskProDb(pripravena.dhash).toString()}::bigint, ${posudek.jas}, ${kdo})
    ON CONFLICT (baseline_set_id, zone_key, light_variant) DO UPDATE
      SET storage_key = EXCLUDED.storage_key, dhash64 = EXCLUDED.dhash64,
          mean_luminance = EXCLUDED.mean_luminance, created_at = now(),
          uploaded_by = EXCLUDED.uploaded_by
  `);

  const zprava =
    `Uloženo jako reference „${popisVarianty(varianta)}"` +
    (novaVerze ? `, sada povýšena na verzi ${verze}.` : ".") +
    (podobnost !== null
      ? podobnost >= 60
        ? ` Předchozí snímek byl podobný na ${podobnost} % — sedí to.`
        : ` Pozor: s předchozím snímkem té zóny se shoduje jen na ${podobnost} %. Zkontroluj prosím, jestli je to opravdu ${zonaKlic}.`
      : "");

  return { ok: true, zprava, podobnostSPredchozi: podobnost, novaVerze };
}

/** Smaže jednu variantu reference. Blob zůstává — starší verze na něj míří. */
export async function smazReferenci(snimekId: string): Promise<{ ok: boolean; chyba?: string }> {
  const [s] = await radky<{ id: string; pouzita: boolean }>(sql`
    SELECT b.id::text AS id,
           EXISTS (SELECT 1 FROM inspections i WHERE i.baseline_set_id = b.baseline_set_id) AS pouzita
      FROM baseline_shots b WHERE b.id = ${snimekId}::uuid
  `);
  if (!s) return { ok: false, chyba: "Snímek nenalezen." };
  if (s.pouzita) {
    return {
      ok: false,
      chyba:
        "Podle téhle sady se už hodnotilo — mazat z ní nejde. Nahraj místo toho nový snímek, " +
        "sada se povýší na novou verzi a stará zůstane doložitelná.",
    };
  }
  await radky(sql`DELETE FROM baseline_shots WHERE id = ${snimekId}::uuid`);
  return { ok: true };
}
