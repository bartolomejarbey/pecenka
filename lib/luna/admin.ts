import "server-only";

import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { podepsanyOdkaz } from "./uloziste";

/** Fronta inspekcí a detail pro administraci. */

export type RadekFronty = {
  id: string;
  kodRezervace: string;
  domek: string;
  jmeno: string | null;
  stav: string;
  odeslano: string | null;
  nejhorsi: string | null;
  kPosouzeni: number;
  nakladHalere: number;
};

const RIZIKO: Record<string, number> = {
  missing: 5, damage_major: 4, damage_minor: 3, wear: 2, dirt: 1, none: 0,
};

export async function nactiFrontu(): Promise<RadekFronty[]> {
  const r = await radky<{
    id: string; code: string; unit_slug: string; status: string;
    submitted_at: string | null; cost_cents: string | number; jmeno: string | null;
    nejhorsi: string | null; k_posouzeni: number;
  }>(sql`
    SELECT i.id::text AS id, r.code, i.unit_slug, i.status,
           i.submitted_at::text AS submitted_at, i.cost_cents,
           (SELECT trim(coalesce(g.first_name,'') || ' ' || coalesce(g.last_name,''))
              FROM reservation_guests rg JOIN guests g ON g.id = rg.guest_id
             WHERE rg.reservation_id = r.id LIMIT 1) AS jmeno,
           (SELECT lf.severity FROM luna_findings lf
              JOIN luna_runs lr ON lr.id = lf.luna_run_id
             WHERE lr.inspection_id = i.id
             ORDER BY CASE lf.severity WHEN 'missing' THEN 5 WHEN 'damage_major' THEN 4
                                       WHEN 'damage_minor' THEN 3 WHEN 'wear' THEN 2
                                       WHEN 'dirt' THEN 1 ELSE 0 END DESC LIMIT 1) AS nejhorsi,
           (SELECT count(*)::int FROM damage_cases dc
             WHERE dc.inspection_id = i.id AND dc.state = 'pending') AS k_posouzeni
      FROM inspections i JOIN reservations r ON r.id = i.reservation_id
     WHERE i.status <> 'draft'
     ORDER BY CASE i.status WHEN 'needs_review' THEN 0 WHEN 'analyzing' THEN 1
                            WHEN 'submitted' THEN 2 ELSE 3 END,
              i.submitted_at DESC NULLS LAST
     LIMIT 100
  `);
  return r.map((x) => ({
    id: x.id, kodRezervace: x.code, domek: x.unit_slug, jmeno: x.jmeno,
    stav: x.status, odeslano: x.submitted_at, nejhorsi: x.nejhorsi,
    kPosouzeni: x.k_posouzeni, nakladHalere: Number(x.cost_cents),
  }));
}

export type ZonaDetail = {
  klic: string;
  nazev: string;
  zavaznost: string;
  jistota: number;
  coSeZmenilo: string;
  alternativa: string;
  protiargument: string | null;
  stabilita: string | null;
  zarovnani: string;
  podobnost: number;
  odhadMin: number;
  odhadMax: number;
  potrebaNoveFoto: boolean;
  predUrl: string | null;
  poUrl: string | null;
  pripadId: string | null;
  rozhodnuto: { castka: number; duvod: string; kdy: string; sluzba: boolean } | null;
};

export type DetailInspekce = {
  id: string;
  kodRezervace: string;
  rezervaceId: string;
  domek: string;
  jmeno: string | null;
  stav: string;
  odeslano: string | null;
  shrnuti: string | null;
  nakladHalere: number;
  zony: ZonaDetail[];
};

export async function nactiDetailInspekce(id: string): Promise<DetailInspekce | null> {
  const [i] = await radky<{
    id: string; code: string; reservation_id: string; unit_slug: string; status: string;
    submitted_at: string | null; summary_cs: string | null; cost_cents: string | number;
    jmeno: string | null;
  }>(sql`
    SELECT i.id::text AS id, r.code, r.id::text AS reservation_id, i.unit_slug, i.status,
           i.submitted_at::text AS submitted_at, i.summary_cs, i.cost_cents,
           (SELECT trim(coalesce(g.first_name,'') || ' ' || coalesce(g.last_name,''))
              FROM reservation_guests rg JOIN guests g ON g.id = rg.guest_id
             WHERE rg.reservation_id = r.id LIMIT 1) AS jmeno
      FROM inspections i JOIN reservations r ON r.id = i.reservation_id
     WHERE i.id = ${id}::uuid
  `);
  if (!i) return null;

  const zony = await radky<{
    zone_key: string; label: string; severity: string | null; confidence: string | number | null;
    what_changed: string | null; alternative_explanation: string | null;
    counter_argument: string | null; stability: string | null;
    align_status: string | null; ssim_global: string | number | null;
    min_c: string | number | null; max_c: string | number | null;
    needs_reshoot: boolean | null;
    pred_key: string | null; po_key: string | null;
    pripad_id: string | null;
    r_castka: string | number | null; r_duvod: string | null; r_kdy: string | null; r_sluzba: boolean | null;
  }>(sql`
    SELECT cz.zone_key, cz.label,
           lf.severity, lf.confidence, lf.what_changed, lf.alternative_explanation,
           lf.counter_argument, lf.stability,
           lf.estimated_cost_min_cents AS min_c, lf.estimated_cost_max_cents AS max_c,
           lf.needs_reshoot,
           pp.align_status, pp.ssim_global,
           bs.storage_key AS pred_key, ip.storage_key AS po_key,
           dc.id::text AS pripad_id,
           dd.amount_cents AS r_castka, dd.reason_cs AS r_duvod,
           dd.decided_at::text AS r_kdy, dd.is_service_not_damage AS r_sluzba
      FROM inspections i
      JOIN checklist_zones cz ON cz.checklist_version_id = i.checklist_version_id
      LEFT JOIN photo_pairs pp ON pp.inspection_id = i.id AND pp.zone_key = cz.zone_key
      LEFT JOIN inspection_photos ip ON ip.id = pp.after_photo_id
      LEFT JOIN baseline_shots bs ON bs.id = pp.before_shot_id
      LEFT JOIN LATERAL (
        SELECT lf.* FROM luna_findings lf
          JOIN luna_runs lr ON lr.id = lf.luna_run_id
         WHERE lr.inspection_id = i.id AND lf.zone_key = cz.zone_key AND lr.mode = 'primary'
         ORDER BY lr.created_at DESC LIMIT 1) lf ON true
      LEFT JOIN damage_cases dc ON dc.inspection_id = i.id AND dc.zone_key = cz.zone_key
      LEFT JOIN damage_decisions dd ON dd.damage_case_id = dc.id
     WHERE i.id = ${id}::uuid
     ORDER BY cz.order_index
  `);

  return {
    id: i.id, kodRezervace: i.code, rezervaceId: i.reservation_id, domek: i.unit_slug,
    jmeno: i.jmeno, stav: i.status, odeslano: i.submitted_at, shrnuti: i.summary_cs,
    nakladHalere: Number(i.cost_cents),
    zony: await Promise.all(
      zony.map(async (z) => ({
        klic: z.zone_key,
        nazev: z.label,
        zavaznost: z.severity ?? "none",
        jistota: Number(z.confidence ?? 0),
        coSeZmenilo: z.what_changed ?? "Bez nálezu.",
        alternativa: z.alternative_explanation ?? "—",
        protiargument: z.counter_argument,
        stabilita: z.stability,
        zarovnani: z.align_status ?? "good",
        podobnost: Number(z.ssim_global ?? 1),
        odhadMin: Number(z.min_c ?? 0) / 100,
        odhadMax: Number(z.max_c ?? 0) / 100,
        potrebaNoveFoto: Boolean(z.needs_reshoot),
        predUrl: z.pred_key ? await podepsanyOdkaz(z.pred_key, 1800).catch(() => null) : null,
        poUrl: z.po_key ? await podepsanyOdkaz(z.po_key, 1800).catch(() => null) : null,
        pripadId: z.pripad_id,
        rozhodnuto: z.r_kdy
          ? {
              castka: Number(z.r_castka ?? 0) / 100,
              duvod: z.r_duvod ?? "",
              kdy: z.r_kdy,
              sluzba: Boolean(z.r_sluzba),
            }
          : null,
      })),
    ),
  };
}

export const rizikoZavaznosti = (s: string) => RIZIKO[s] ?? 0;
