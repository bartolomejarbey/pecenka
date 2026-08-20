import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";

/**
 * Zápis do auditního deníku.
 *
 * Řádky jsou zřetězené otiskem (`prev_hash` → `hash`), takže dodatečná úprava
 * historie jde poznat. Není to blockchain, jen ochrana proti „to tam nikdy
 * nebylo" — u agendy, kde se strhávají peníze z kauce, se to hodí.
 */

export type Zapis = {
  akce: string;
  typEntity: string;
  idEntity: string;
  kdoTyp?: "admin" | "guest" | "system" | "agent";
  kdo?: string | null;
  zmena?: unknown;
};

export async function zapisDoDeniku(z: Zapis): Promise<void> {
  try {
    const h = await headers();
    const [posledni] = await radky<{ hash: string | null }>(
      sql`SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1`,
    );
    const prev = posledni?.hash ?? "";
    const telo = JSON.stringify({
      akce: z.akce,
      typEntity: z.typEntity,
      idEntity: z.idEntity,
      kdo: z.kdo ?? null,
      zmena: z.zmena ?? null,
    });
    const hash = createHash("sha256").update(prev + telo).digest("hex");

    await radky(sql`
      INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id, diff, ip, user_agent, prev_hash, hash)
      VALUES (${z.kdoTyp ?? "admin"}, ${z.kdo ?? null}, ${z.akce}, ${z.typEntity}, ${z.idEntity},
              ${z.zmena ? JSON.stringify(z.zmena) : null}::jsonb,
              ${h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null}::inet,
              ${(h.get("user-agent") ?? "").slice(0, 300)},
              ${prev || null}, ${hash})
    `);
  } catch (e) {
    // Deník nesmí shodit akci, kterou zaznamenává.
    console.error("[audit] zápis selhal:", e);
  }
}
