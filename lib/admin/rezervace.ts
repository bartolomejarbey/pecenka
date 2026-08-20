import "server-only";

import { sql, type SQL } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { bezDiakritiky } from "@/lib/db/text";
import { nazevDokladu, type TypDokladu } from "@/lib/doklady/typy";

/** Seznam a detail rezervací pro administraci. */

export type Radek = {
  kod: string;
  vs: string;
  jmeno: string | null;
  email: string | null;
  telefon: string | null;
  domek: string;
  domekSlug: string;
  prijezd: string;
  odjezd: string;
  noci: number;
  stav: string;
  stavPlatby: string;
  celkemHalere: number;
  zaplacenoHalere: number;
  zalohaHalere: number;
  zdroj: string;
  minulost: boolean;
};

export type Filtry = {
  hledat?: string;
  nezaplacene?: boolean;
  nepotvrzene?: boolean;
  domek?: string;
  zrusene?: boolean;
};

const cislo = (v: string | number) => (typeof v === "number" ? v : Number(v));

const ZAKLAD = sql`
  SELECT r.code, r.variable_symbol AS vs, r.checkin::text AS prijezd, r.checkout::text AS odjezd,
         (r.checkout - r.checkin) AS noci, r.status::text AS stav,
         r.payment_state::text AS stav_platby, r.total_cents, r.paid_cents,
         r.deposit_required_cents, r.source, u.name AS domek, u.slug AS domek_slug,
         (r.checkout < CURRENT_DATE) AS minulost,
         (SELECT trim(coalesce(g.first_name,'') || ' ' || coalesce(g.last_name,''))
            FROM reservation_guests rg JOIN guests g ON g.id = rg.guest_id
           WHERE rg.reservation_id = r.id AND rg.role = 'payer' LIMIT 1) AS jmeno,
         (SELECT g.email FROM reservation_guests rg JOIN guests g ON g.id = rg.guest_id
           WHERE rg.reservation_id = r.id AND rg.role = 'payer' LIMIT 1) AS email,
         (SELECT g.phone_e164 FROM reservation_guests rg JOIN guests g ON g.id = rg.guest_id
           WHERE rg.reservation_id = r.id AND rg.role = 'payer' LIMIT 1) AS telefon
    FROM reservations r JOIN units u ON u.id = r.unit_id
`;

type RadekDb = {
  code: string;
  vs: string;
  jmeno: string | null;
  email: string | null;
  telefon: string | null;
  domek: string;
  domek_slug: string;
  prijezd: string;
  odjezd: string;
  noci: number;
  stav: string;
  stav_platby: string;
  total_cents: string | number;
  paid_cents: string | number;
  deposit_required_cents: string | number;
  source: string;
  minulost: boolean;
};

const prelozRadek = (r: RadekDb): Radek => ({
  kod: r.code,
  vs: r.vs,
  jmeno: r.jmeno,
  email: r.email,
  telefon: r.telefon,
  domek: r.domek,
  domekSlug: r.domek_slug,
  prijezd: r.prijezd,
  odjezd: r.odjezd,
  noci: Number(r.noci),
  stav: r.stav,
  stavPlatby: r.stav_platby,
  celkemHalere: cislo(r.total_cents),
  zaplacenoHalere: cislo(r.paid_cents),
  zalohaHalere: cislo(r.deposit_required_cents),
  zdroj: r.source,
  minulost: r.minulost,
});

export async function hledejRezervace(f: Filtry): Promise<Radek[]> {
  const podminky: SQL[] = [];

  if (f.hledat?.trim()) {
    // `search_text` je uložený bez diakritiky, takže dotaz srovnáme taky.
    const dotaz = `%${bezDiakritiky(f.hledat.trim())}%`;
    podminky.push(sql`r.search_text LIKE ${dotaz}`);
  }
  if (f.nezaplacene) podminky.push(sql`r.payment_state IN ('unpaid','deposit_paid')`);
  if (f.nepotvrzene) podminky.push(sql`r.status IN ('inquiry','hold')`);
  if (f.domek) podminky.push(sql`u.slug = ${f.domek}`);
  if (!f.zrusene) podminky.push(sql`r.status NOT IN ('cancelled','expired')`);

  const kde = podminky.length
    ? sql` WHERE ${sql.join(podminky, sql` AND `)}`
    : sql``;

  // Nejbližší příjezd nahoře, minulost pod čarou.
  const radkyDb = await radky<RadekDb>(sql`
    ${ZAKLAD}${kde}
    ORDER BY (r.checkout < CURRENT_DATE) ASC, r.checkin ASC
    LIMIT 200
  `);
  return radkyDb.map(prelozRadek);
}

/* ===== Detail ===== */

export type Polozka = {
  druh: string;
  popis: string;
  datum: string | null;
  mnozstvi: number;
  celkemHalere: number;
  sazbaDph: number | null;
};

export type Platba = {
  id: string;
  druh: string;
  poskytovatel: string;
  castkaHalere: number;
  stav: string;
  vs: string;
  splatnost: string | null;
  zaplaceno: string | null;
};

export type DokladRadek = {
  id: string;
  cislo: string;
  nazev: string;
  stav: string;
  celkemHalere: number;
  vystaveno: string | null;
  lzeOpravit: boolean;
};

export type Detail = Radek & {
  id: string;
  dospeli: number;
  deti: number;
  poznamkaHosta: string | null;
  poznamkaInterni: string | null;
  drziDo: string | null;
  vytvoreno: string;
  stornoDuvod: string | null;
  polozky: Polozka[];
  platby: Platba[];
  historie: { kdy: string; akce: string; kdo: string | null }[];
  doklady: DokladRadek[];
};

export async function nactiDetail(kod: string): Promise<Detail | null> {
  const [zaklad] = await radky<RadekDb>(sql`${ZAKLAD} WHERE r.code = ${kod}`);
  if (!zaklad) return null;

  const [extra] = await radky<{
    id: string;
    adults: number;
    children_u18: number;
    note_guest: string | null;
    note_internal: string | null;
    hold_expires_at: string | null;
    created_at: string;
    cancel_reason: string | null;
  }>(sql`
    SELECT id::text AS id, adults, children_u18, note_guest, note_internal,
           hold_expires_at::text AS hold_expires_at, created_at::text AS created_at, cancel_reason
      FROM reservations WHERE code = ${kod}
  `);

  const polozky = await radky<{
    kind: string;
    label: string;
    date: string | null;
    qty: string | number;
    total_cents: string | number;
    vat_rate: number | null;
  }>(sql`
    SELECT ri.kind, ri.label, ri.date::text AS date, ri.qty, ri.total_cents, ri.vat_rate
      FROM reservation_items ri JOIN reservations r ON r.id = ri.reservation_id
     WHERE r.code = ${kod}
     ORDER BY CASE ri.kind WHEN 'night' THEN 0 WHEN 'addon' THEN 1 WHEN 'discount' THEN 2 ELSE 3 END,
              ri.date NULLS LAST, ri.label
  `);

  const platby = await radky<{
    id: string;
    kind: string;
    provider: string;
    amount_cents: string | number;
    status: string;
    variable_symbol: string;
    due_at: string | null;
    paid_at: string | null;
  }>(sql`
    SELECT p.id::text AS id, p.kind, p.provider, p.amount_cents, p.status,
           p.variable_symbol, p.due_at::text AS due_at, p.paid_at::text AS paid_at
      FROM payments p JOIN reservations r ON r.id = p.reservation_id
     WHERE r.code = ${kod} ORDER BY p.created_at
  `);

  const doklady = await radky<{
    id: string;
    number: string;
    doc_type: string;
    status: string;
    issue_date: string | null;
    total_with_vat_cents: string | number;
    vat_applicable: boolean;
  }>(sql`
    SELECT i.id::text AS id, i.number, i.doc_type, i.status,
           i.issue_date::text AS issue_date, i.total_with_vat_cents, i.vat_applicable
      FROM invoices i JOIN reservations r ON r.id = i.reservation_id
     WHERE r.code = ${kod} ORDER BY i.created_at
  `);

  const historie = await radky<{ at: string; action: string; actor_id: string | null }>(sql`
    SELECT a.at::text AS at, a.action, a.actor_id
      FROM audit_log a
     WHERE a.entity_type = 'reservation' AND a.entity_id = ${extra?.id ?? ""}
     ORDER BY a.at DESC LIMIT 50
  `);

  return {
    ...prelozRadek(zaklad),
    id: extra?.id ?? "",
    dospeli: extra?.adults ?? 0,
    deti: extra?.children_u18 ?? 0,
    poznamkaHosta: extra?.note_guest ?? null,
    poznamkaInterni: extra?.note_internal ?? null,
    drziDo: extra?.hold_expires_at ?? null,
    vytvoreno: extra?.created_at ?? "",
    stornoDuvod: extra?.cancel_reason ?? null,
    polozky: polozky.map((p) => ({
      druh: p.kind,
      popis: p.label,
      datum: p.date,
      mnozstvi: Number(p.qty),
      celkemHalere: cislo(p.total_cents),
      sazbaDph: p.vat_rate,
    })),
    platby: platby.map((p) => ({
      id: p.id,
      druh: p.kind,
      poskytovatel: p.provider,
      castkaHalere: cislo(p.amount_cents),
      stav: p.status,
      vs: p.variable_symbol,
      splatnost: p.due_at,
      zaplaceno: p.paid_at,
    })),
    historie: historie.map((h) => ({ kdy: h.at, akce: h.action, kdo: h.actor_id })),
    doklady: doklady.map((d) => ({
      id: d.id,
      cislo: d.number,
      nazev: nazevDokladu(d.doc_type as TypDokladu, d.vat_applicable),
      stav: d.status,
      celkemHalere: cislo(d.total_with_vat_cents),
      vystaveno: d.issue_date,
      // Zálohová faktura není doklad a opravený doklad se neopravuje podruhé.
      lzeOpravit: d.doc_type !== "PROFORMA" && !["CORRECTED", "CANCELLED", "DRAFT"].includes(d.status),
    })),
  };
}
