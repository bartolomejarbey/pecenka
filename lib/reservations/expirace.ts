import "server-only";

import { sql } from "drizzle-orm";
import { radkyT, transakce } from "@/lib/db/client";

/**
 * Uvolnění termínů, které si někdo zablokoval a nezaplatil.
 *
 * Rezervace ve stavu `hold` drží termín 72 hodin. Po marném uplynutí se
 * překlopí na `expired`. Klíčový je přitom `reservation_units.status` —
 * teprve jeho změna vypustí databázové omezení a termín se zase dá prodat.
 * Kdyby se přepsala jen `reservations.status`, termín by zůstal navždy
 * blokovaný a nikdo by nechápal proč.
 *
 * Logika je schválně mimo route handler, aby šla testovat bez HTTP.
 */
export async function uvolniVyprseleDrzeni(): Promise<string[]> {
  return transakce(async (tx) => {
    const vyprsele = await radkyT<{ id: string; code: string }>(
      tx,
      sql`SELECT id, code FROM reservations
          WHERE status = 'hold' AND hold_expires_at IS NOT NULL AND hold_expires_at < now()
          FOR UPDATE`,
    );
    if (!vyprsele.length) return [];

    const ids = sql.join(
      vyprsele.map((r) => sql`${r.id}`),
      sql`, `,
    );

    // Pořadí je důležité: nejdřív uvolnit blokaci, pak přepsat rezervaci.
    await tx.execute(sql`
      UPDATE reservation_units SET status = 'expired'::reservation_status
      WHERE reservation_id IN (${ids})
    `);
    await tx.execute(sql`
      UPDATE reservations
      SET status = 'expired'::reservation_status, updated_at = now(),
          cancel_reason = 'Záloha nedorazila v době držení termínu.'
      WHERE id IN (${ids})
    `);
    await tx.execute(sql`
      UPDATE payments SET status = 'expired'
      WHERE reservation_id IN (${ids}) AND kind = 'deposit' AND status IN ('created','pending')
    `);
    await tx.execute(sql`
      INSERT INTO tasks (kind, severity, reservation_id, title, detail)
      SELECT 'expired_hold', 'info', r.id, 'Termín uvolněn: ' || r.code,
             'Záloha nedorazila do 72 hodin, termín se vrátil do nabídky.'
      FROM reservations r WHERE r.id IN (${ids})
    `);
    // Původní úkol „nová rezervace" v adminu nesmí zůstat viset.
    await tx.execute(sql`
      UPDATE tasks SET resolved_at = now(), resolved_by = 'cron',
                       resolution_note = 'Držení termínu vypršelo.'
      WHERE reservation_id IN (${ids}) AND kind = 'new_hold' AND resolved_at IS NULL
    `);

    return vyprsele.map((r) => r.code);
  });
}
