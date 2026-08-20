import "server-only";

import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";

/**
 * Data pro obrazovku „Dnes".
 *
 * Odpovídá na jedinou otázku, kterou majitel má devadesát procent času:
 * co se dnes děje. Jeden dotaz, ne pět — na telefonu v lese se každý požadavek
 * navíc pozná.
 */

export type Pobyt = {
  kod: string;
  jmeno: string | null;
  telefon: string | null;
  email: string | null;
  domek: string;
  domekSlug: string;
  prijezd: string;
  odjezd: string;
  hostu: number;
  stav: string;
  stavPlatby: string;
  celkemHalere: number;
  zaplacenoHalere: number;
  doplnky: string[];
  /** V témže domku dnes někdo odjíždí a někdo přijíždí. */
  navazuje: boolean;
};

export type Ukol = {
  id: string;
  druh: string;
  zavaznost: "info" | "warn" | "urgent";
  nadpis: string;
  detail: string | null;
  kodRezervace: string | null;
  splatnost: string | null;
};

export type Dnes = {
  odjizdi: Pobyt[];
  prijizdi: Pobyt[];
  zustava: Pobyt[];
  ukoly: Ukol[];
  /** Když se dnes nic neděje, ať obrazovka není prázdná. */
  pristiPrijezd: { kod: string; jmeno: string | null; domek: string; prijezd: string } | null;
};

type RadekPobytu = {
  druh: "odjizdi" | "prijizdi" | "zustava";
  code: string;
  jmeno: string | null;
  phone_e164: string | null;
  email: string | null;
  unit_name: string;
  unit_slug: string;
  checkin: string;
  checkout: string;
  hostu: number;
  status: string;
  payment_state: string;
  total_cents: string | number;
  paid_cents: string | number;
  doplnky: string[] | null;
};

const cislo = (v: string | number) => (typeof v === "number" ? v : Number(v));

function naPobyt(r: RadekPobytu, navazujici: Set<string>): Pobyt {
  return {
    kod: r.code,
    jmeno: r.jmeno,
    telefon: r.phone_e164,
    email: r.email,
    domek: r.unit_name,
    domekSlug: r.unit_slug,
    prijezd: r.checkin,
    odjezd: r.checkout,
    hostu: r.hostu,
    stav: r.status,
    stavPlatby: r.payment_state,
    celkemHalere: cislo(r.total_cents),
    zaplacenoHalere: cislo(r.paid_cents),
    doplnky: r.doplnky ?? [],
    navazuje: navazujici.has(r.unit_slug),
  };
}

export async function nactiDnes(): Promise<Dnes> {
  const pobyty = await radky<RadekPobytu>(sql`
    WITH zaklad AS (
      SELECT r.id, r.code, r.checkin::text AS checkin, r.checkout::text AS checkout,
             r.status::text AS status, r.payment_state::text AS payment_state,
             r.total_cents, r.paid_cents, r.adults + r.children_u18 AS hostu,
             u.name AS unit_name, u.slug AS unit_slug,
             (SELECT trim(coalesce(g.first_name,'') || ' ' || coalesce(g.last_name,''))
                FROM reservation_guests rg JOIN guests g ON g.id = rg.guest_id
               WHERE rg.reservation_id = r.id AND rg.role = 'payer' LIMIT 1) AS jmeno,
             (SELECT g.phone_e164 FROM reservation_guests rg JOIN guests g ON g.id = rg.guest_id
               WHERE rg.reservation_id = r.id AND rg.role = 'payer' LIMIT 1) AS phone_e164,
             (SELECT g.email FROM reservation_guests rg JOIN guests g ON g.id = rg.guest_id
               WHERE rg.reservation_id = r.id AND rg.role = 'payer' LIMIT 1) AS email,
             (SELECT array_agg(ri.label ORDER BY ri.label)
                FROM reservation_items ri
               WHERE ri.reservation_id = r.id AND ri.kind = 'addon') AS doplnky
        FROM reservations r JOIN units u ON u.id = r.unit_id
       WHERE r.status IN ('confirmed','checked_in','hold')
    )
    SELECT 'odjizdi' AS druh, * FROM zaklad WHERE checkout::date = CURRENT_DATE
    UNION ALL
    SELECT 'prijizdi', * FROM zaklad WHERE checkin::date = CURRENT_DATE
    UNION ALL
    SELECT 'zustava', * FROM zaklad
     WHERE checkin::date < CURRENT_DATE AND checkout::date > CURRENT_DATE
    ORDER BY unit_slug, checkin
  `);

  // Back-to-back: v témže domku dnes někdo odjíždí a někdo přijíždí.
  const odjezdy = new Set(pobyty.filter((p) => p.druh === "odjizdi").map((p) => p.unit_slug));
  const prijezdy = new Set(pobyty.filter((p) => p.druh === "prijizdi").map((p) => p.unit_slug));
  const navazujici = new Set([...odjezdy].filter((s) => prijezdy.has(s)));

  const ukoly = await radky<{
    id: string;
    kind: string;
    severity: Ukol["zavaznost"];
    title: string;
    detail: string | null;
    due_at: string | null;
    code: string | null;
  }>(sql`
    SELECT t.id::text AS id, t.kind, t.severity, t.title, t.detail,
           t.due_at::text AS due_at, r.code
      FROM tasks t LEFT JOIN reservations r ON r.id = t.reservation_id
     WHERE t.resolved_at IS NULL
     ORDER BY CASE t.severity WHEN 'urgent' THEN 0 WHEN 'warn' THEN 1 ELSE 2 END,
              t.due_at NULLS LAST, t.created_at
     LIMIT 30
  `);

  const [pristi] = await radky<{
    code: string;
    jmeno: string | null;
    unit_name: string;
    checkin: string;
  }>(sql`
    SELECT r.code, u.name AS unit_name, r.checkin::text AS checkin,
           (SELECT trim(coalesce(g.first_name,'') || ' ' || coalesce(g.last_name,''))
              FROM reservation_guests rg JOIN guests g ON g.id = rg.guest_id
             WHERE rg.reservation_id = r.id LIMIT 1) AS jmeno
      FROM reservations r JOIN units u ON u.id = r.unit_id
     WHERE r.checkin > CURRENT_DATE AND r.status IN ('confirmed','hold')
     ORDER BY r.checkin LIMIT 1
  `);

  return {
    odjizdi: pobyty.filter((p) => p.druh === "odjizdi").map((p) => naPobyt(p, navazujici)),
    prijizdi: pobyty.filter((p) => p.druh === "prijizdi").map((p) => naPobyt(p, navazujici)),
    zustava: pobyty.filter((p) => p.druh === "zustava").map((p) => naPobyt(p, navazujici)),
    ukoly: ukoly.map((u) => ({
      id: u.id,
      druh: u.kind,
      zavaznost: u.severity,
      nadpis: u.title,
      detail: u.detail,
      kodRezervace: u.code,
      splatnost: u.due_at,
    })),
    pristiPrijezd: pristi
      ? { kod: pristi.code, jmeno: pristi.jmeno, domek: pristi.unit_name, prijezd: pristi.checkin }
      : null,
  };
}
