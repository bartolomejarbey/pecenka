import "server-only";

import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { nactiZony, zajistiChecklist, type ZonaDef } from "@/lib/luna/checklist";
import { podepsanyOdkaz } from "@/lib/luna/uloziste";

/**
 * Odjezdový foto-protokol z pohledu hosta.
 *
 * Checklist se na rezervaci **pinuje** — když se později zóny upraví, starý
 * případ musí jít pořád obhájit tím, na co přesně se hosta v tu chvíli ptalo.
 */

export type StavZony = ZonaDef & {
  /** Odkaz na referenční snímek, aby host věděl, co má vyfotit. */
  referenceUrl: string | null;
  hotovo: boolean;
  fotkaUrl: string | null;
};

export type Protokol = {
  inspekceId: string;
  stav: string;
  zony: StavZony[];
  hotovoZon: number;
  povinnychZbyva: number;
};

/** Najde nebo založí odjezdový protokol pro rezervaci. */
export async function zajistiProtokol(rezervaceId: string): Promise<Protokol> {
  const [rez] = await radky<{ unit_slug: string; checklist_version_id: string | null }>(
    sql`SELECT u.slug AS unit_slug, r.checklist_version_id::text AS checklist_version_id
          FROM reservations r JOIN units u ON u.id = r.unit_id
         WHERE r.id = ${rezervaceId}::uuid`,
  );
  if (!rez) throw new Error("Rezervace nenalezena.");

  const verzeId = rez.checklist_version_id ?? (await zajistiChecklist());
  if (!rez.checklist_version_id) {
    await radky(sql`
      UPDATE reservations SET checklist_version_id = ${verzeId}::uuid WHERE id = ${rezervaceId}::uuid
    `);
  }

  const [existujici] = await radky<{ id: string; status: string }>(sql`
    SELECT id::text AS id, status FROM inspections
     WHERE reservation_id = ${rezervaceId}::uuid AND type = 'checkout'
     ORDER BY id LIMIT 1
  `);

  let inspekceId = existujici?.id;
  let stav = existujici?.status ?? "draft";

  if (!inspekceId) {
    const [baseline] = await radky<{ id: string }>(sql`
      SELECT id::text AS id FROM baseline_sets
       WHERE unit_slug = ${rez.unit_slug} AND valid_to IS NULL
       ORDER BY version DESC LIMIT 1
    `);
    const [nova] = await radky<{ id: string }>(sql`
      INSERT INTO inspections (reservation_id, unit_slug, type, checklist_version_id, baseline_set_id)
      VALUES (${rezervaceId}::uuid, ${rez.unit_slug}, 'checkout', ${verzeId}::uuid,
              ${baseline?.id ?? null}::uuid)
      RETURNING id::text AS id
    `);
    inspekceId = nova.id;
  }

  const zony = await nactiZony(verzeId);
  const fotky = await radky<{ zone_key: string; storage_key: string }>(sql`
    SELECT zone_key, storage_key FROM inspection_photos WHERE inspection_id = ${inspekceId}::uuid
  `);
  const reference = await radky<{ zone_key: string; storage_key: string }>(sql`
    SELECT bs.zone_key, bs.storage_key
      FROM baseline_shots bs
      JOIN inspections i ON i.baseline_set_id = bs.baseline_set_id
     WHERE i.id = ${inspekceId}::uuid
  `);

  const stavy: StavZony[] = await Promise.all(
    zony.map(async (z) => {
      const f = fotky.find((x) => x.zone_key === z.klic);
      const r = reference.find((x) => x.zone_key === z.klic);
      return {
        ...z,
        hotovo: Boolean(f),
        fotkaUrl: f ? await podepsanyOdkaz(f.storage_key, 1800).catch(() => null) : null,
        referenceUrl: r ? await podepsanyOdkaz(r.storage_key, 1800).catch(() => null) : null,
      };
    }),
  );

  return {
    inspekceId,
    stav,
    zony: stavy,
    hotovoZon: stavy.filter((z) => z.hotovo).length,
    povinnychZbyva: stavy.filter((z) => z.povinna && !z.hotovo).length,
  };
}
