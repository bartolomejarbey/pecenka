import "server-only";

import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { addDays, startOfDay, toKey } from "@/lib/booking";

/** Obsazenost obou domků pro kalendář administrace. */

export type Pruh = {
  kod: string | null;
  jmeno: string | null;
  druh: "rezervace" | "blok";
  stav: string;
  od: string;
  do: string;
  domekSlug: string;
};

export type Kalendar = {
  dny: string[];
  domky: { slug: string; nazev: string }[];
  pruhy: Pruh[];
  /** Cena noci v haléřích podle domku a dne — pro rychlý přehled. */
  ceny: Record<string, Record<string, number>>;
};

export async function nactiKalendar(dni = 60): Promise<Kalendar> {
  const zacatek = startOfDay(new Date());
  const konec = addDays(zacatek, dni);
  const od = toKey(zacatek);
  const doKdy = toKey(konec);

  const domky = await radky<{ slug: string; name: string }>(
    sql`SELECT slug, name FROM units WHERE active AND NOT is_virtual ORDER BY sort_order`,
  );

  const pruhy = await radky<{
    code: string | null;
    jmeno: string | null;
    druh: "rezervace" | "blok";
    status: string;
    od: string;
    do_: string;
    slug: string;
  }>(sql`
    SELECT r.code, u.slug,
           ru.checkin::text AS od, ru.checkout::text AS do_,
           ru.status::text AS status, 'rezervace' AS druh,
           (SELECT trim(coalesce(g.first_name,'') || ' ' || coalesce(g.last_name,''))
              FROM reservation_guests rg JOIN guests g ON g.id = rg.guest_id
             WHERE rg.reservation_id = r.id LIMIT 1) AS jmeno
      FROM reservation_units ru
      JOIN reservations r ON r.id = ru.reservation_id
      JOIN units u ON u.id = ru.unit_id
     WHERE ru.status IN ('hold','confirmed','checked_in')
       AND ru.checkout > ${od}::date AND ru.checkin < ${doKdy}::date
    UNION ALL
    SELECT NULL, u.slug, cb.date_from::text, cb.date_to::text, cb.kind, 'blok', cb.reason
      FROM calendar_blocks cb JOIN units u ON u.id = cb.unit_id
     WHERE cb.date_to > ${od}::date AND cb.date_from < ${doKdy}::date
    ORDER BY od
  `);

  const cenik = await radky<{ slug: string; date: string; price_cents: string | number }>(sql`
    SELECT u.slug, rc.date::text AS date, rc.price_cents
      FROM rate_calendar rc JOIN units u ON u.id = rc.unit_id
     WHERE rc.date >= ${od}::date AND rc.date < ${doKdy}::date AND NOT u.is_virtual
  `);

  const ceny: Record<string, Record<string, number>> = {};
  for (const c of cenik) {
    (ceny[c.slug] ??= {})[c.date] = Number(c.price_cents);
  }

  const dny: string[] = [];
  for (let d = zacatek; d < konec; d = addDays(d, 1)) dny.push(toKey(d));

  return {
    dny,
    domky: domky.map((d) => ({ slug: d.slug, nazev: d.name })),
    pruhy: pruhy.map((p) => ({
      kod: p.code,
      jmeno: p.jmeno,
      druh: p.druh,
      stav: p.status,
      od: p.od,
      do: p.do_,
      domekSlug: p.slug,
    })),
    ceny,
  };
}
