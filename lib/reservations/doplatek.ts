import "server-only";

import { sql } from "drizzle-orm";
import { radky, radkyT, transakce } from "@/lib/db/client";

/**
 * Předpis doplatku.
 *
 * Systém zakládal jen zálohu. Host ji zaplatil, rezervace se potvrdila —
 * a o zbytek ho nikdo nepožádal. Majitel by si musel pamatovat, komu kdy
 * napsat, a na přehledu peněz stálo „nezaplaceno 5 070 Kč" vedle „všechno
 * je zaplacené", protože jedno počítalo dluh a druhé předpisy.
 *
 * Doplatek se předepíše, až když se blíží příjezd — lhůtu drží
 * `company_settings.balance_due_days_before`. Předepsat ho hned se zálohou
 * by znamenalo posílat hostovi dvě platby najednou půl roku dopředu.
 */

export type Predepsany = {
  platbaId: string;
  kod: string;
  vs: string;
  castkaHalere: number;
  email: string | null;
  jmeno: string | null;
  domek: string;
  prijezd: string;
  splatnost: string;
};

export async function predepisDoplatky(): Promise<Predepsany[]> {
  const [nastaveni] = await radky<{ dni: number }>(
    sql`SELECT balance_due_days_before AS dni FROM company_settings WHERE id = 1`,
  );
  const dni = Number(nastaveni?.dni ?? 14);

  return transakce(async (tx) => {
    /*
     * Vybírají se rezervace, které:
     *   · jsou potvrzené a ještě nezačaly,
     *   · mají do příjezdu méně než `dni`,
     *   · dluží peníze,
     *   · a ještě nemají živý předpis doplatku.
     *
     * `FOR UPDATE SKIP LOCKED` proto, že cron může běžet dvakrát vedle sebe
     * a dvojí předpis by hostovi poslal dvě výzvy na tutéž částku.
     */
    const kandidati = await radkyT<{
      id: string;
      code: string;
      variable_symbol: string;
      dluh: string | number;
      checkin: string;
      domek: string;
      email: string | null;
      jmeno: string | null;
    }>(tx, sql`
      SELECT r.id::text AS id, r.code, r.variable_symbol,
             (r.total_cents - r.paid_cents) AS dluh,
             r.checkin::text AS checkin,
             u.name AS domek,
             (SELECT g.email FROM reservation_guests rg JOIN guests g ON g.id = rg.guest_id
               WHERE rg.reservation_id = r.id AND rg.role = 'payer' LIMIT 1) AS email,
             (SELECT btrim(coalesce(g.first_name,'') || ' ' || coalesce(g.last_name,''))
                FROM reservation_guests rg JOIN guests g ON g.id = rg.guest_id
               WHERE rg.reservation_id = r.id AND rg.role = 'payer' LIMIT 1) AS jmeno
        FROM reservations r
        JOIN units u ON u.id = r.unit_id
       WHERE r.status = 'confirmed'
         AND r.checkin > CURRENT_DATE
         -- Přetypování je nutné: u date + parametr Postgres neumí rozhodnout
         -- mezi přičtením dní a intervalu a odmítne dotaz jako nejednoznačný.
         AND r.checkin <= CURRENT_DATE + ${dni}::int
         AND r.paid_cents < r.total_cents
         AND NOT EXISTS (
           SELECT 1 FROM payments p
            WHERE p.reservation_id = r.id AND p.kind = 'balance'
              AND p.status NOT IN ('cancelled', 'failed')
         )
       ORDER BY r.checkin
       FOR UPDATE OF r SKIP LOCKED
    `);

    const out: Predepsany[] = [];
    for (const k of kandidati) {
      const dluh = Number(k.dluh);
      if (dluh <= 0) continue;

      // Splatnost den před příjezdem — později už by to nemělo smysl.
      const splatnost = new Date(k.checkin);
      splatnost.setDate(splatnost.getDate() - 1);

      const [p] = await radkyT<{ id: string }>(
        tx,
        sql`
        INSERT INTO payments (reservation_id, kind, direction, provider, amount_cents,
                              status, variable_symbol, specific_symbol, due_at)
        VALUES (${k.id}::uuid, 'balance', 'IN', 'qr_transfer', ${dluh}, 'created',
                ${k.variable_symbol}, '2', ${splatnost.toISOString()}::timestamptz)
        RETURNING id::text AS id
      `,
      );

      out.push({
        platbaId: p.id,
        kod: k.code,
        vs: k.variable_symbol,
        castkaHalere: dluh,
        email: k.email,
        jmeno: k.jmeno,
        domek: k.domek,
        prijezd: k.checkin,
        splatnost: splatnost.toISOString(),
      });
    }
    return out;
  });
}
