import "server-only";

import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { addDays, startOfDay, toKey } from "./index";

/**
 * Dostupnost a ceny ze skutečné databáze.
 *
 * Web dřív obsazenost vyráběl determinovaným generátorem. Nikdy se to nesmí
 * vrátit — kalendář, který si nevšimne skutečné rezervace, je nejdražší chyba,
 * kterou tenhle web může udělat. Hlídá to `__tests__/dostupnost.test.ts`.
 *
 * Den je obsazený, když padne aspoň jedno z:
 *   · leží v intervalu rezervace se stavem hold / confirmed / checked_in,
 *   · leží v neprodejném bloku (údržba, vlastní pobyt, import z OTA),
 *   · má v ceníkovém kalendáři `closed = true`.
 *
 * Všechny intervaly jsou půlotevřené `[)` — den odjezdu je zároveň den,
 * kdy může přijet další host.
 */

export type DostupnostJednotky = {
  slug: string;
  /** Klíče YYYY-MM-DD, na které nelze prodat noc. */
  obsazene: string[];
  /** Cena noci v haléřích, klíč YYYY-MM-DD. */
  ceny: Record<string, number>;
  /** Minimální délka pobytu při příjezdu v ten den. */
  minNoci: Record<string, number>;
  /** Dny, kdy nelze přijet / odjet (restrikce z ceníkového kalendáře). */
  bezPrijezdu: string[];
  bezOdjezdu: string[];
};

/** Kolik dní dopředu web ukazuje. Ceníkový kalendář se plní na 730 dní. */
export const OKNO_DNI = 365;

type RadekCeniku = {
  slug: string;
  date: string;
  price_cents: string | number;
  min_nights: number;
  closed: boolean;
  closed_to_arrival: boolean;
  closed_to_departure: boolean;
};

type RadekObsazenosti = { slug: string; od: string; do_: string };

const cislo = (v: string | number) => (typeof v === "number" ? v : Number(v));

/**
 * Seznam hodnot pro `IN (…)`.
 *
 * `= ANY($1)` s polem nepoužíváme schválně: PGlite neumí pole z JS převést na
 * literál a spadne na `22P02`. Rozepsané parametry fungují na obou driverech.
 */
const seznam = (hodnoty: string[]) =>
  sql.join(hodnoty.map((h) => sql`${h}`), sql`, `);

/**
 * Načte dostupnost pro zadané jednotky.
 *
 * Virtuální jednotku (`cely-les`) rozpadá na její fyzické členy — celek je
 * obsazený, jakmile je obsazený kterýkoli z domků.
 */
export async function nactiDostupnost(
  slugy: string[],
  dni: number = OKNO_DNI,
): Promise<Record<string, DostupnostJednotky>> {
  const dnes = startOfDay(new Date());
  const od = toKey(dnes);
  const doKdy = toKey(addDays(dnes, dni));

  const cenik = await radky<RadekCeniku>(sql`
    SELECT u.slug, rc.date::text AS date, rc.price_cents, rc.min_nights,
           rc.closed, rc.closed_to_arrival, rc.closed_to_departure
    FROM rate_calendar rc
    JOIN units u ON u.id = rc.unit_id
    WHERE u.slug IN (${seznam(slugy)}) AND rc.date >= ${od}::date AND rc.date < ${doKdy}::date
    ORDER BY u.slug, rc.date
  `);

  // Obsazenost: rezervace i bloky, u virtuální jednotky i obsazenost jejích členů.
  const obsazenost = await radky<RadekObsazenosti>(sql`
    WITH cil AS (
      SELECT u.id, u.slug FROM units u WHERE u.slug IN (${seznam(slugy)})
    ),
    -- fyzická jednotka blokuje i každý celek, jehož je součástí, a naopak
    dopad AS (
      SELECT c.slug, c.id AS fyzicka_id FROM cil c
      UNION
      SELECT c.slug, uc.member_unit_id FROM cil c
        JOIN unit_components uc ON uc.composite_unit_id = c.id
      UNION
      SELECT c.slug, uc.composite_unit_id FROM cil c
        JOIN unit_components uc ON uc.member_unit_id = c.id
    )
    SELECT d.slug, ru.checkin::text AS od, ru.checkout::text AS do_
      FROM reservation_units ru JOIN dopad d ON d.fyzicka_id = ru.unit_id
      WHERE ru.status IN ('hold','confirmed','checked_in')
        AND ru.checkout > ${od}::date AND ru.checkin < ${doKdy}::date
    UNION ALL
    SELECT d.slug, cb.date_from::text, cb.date_to::text
      FROM calendar_blocks cb JOIN dopad d ON d.fyzicka_id = cb.unit_id
      WHERE cb.date_to > ${od}::date AND cb.date_from < ${doKdy}::date
  `);

  const vysledek: Record<string, DostupnostJednotky> = {};
  for (const slug of slugy) {
    vysledek[slug] = {
      slug,
      obsazene: [],
      ceny: {},
      minNoci: {},
      bezPrijezdu: [],
      bezOdjezdu: [],
    };
  }

  const obsazeneSety = new Map<string, Set<string>>(slugy.map((s) => [s, new Set()]));

  for (const r of cenik) {
    const j = vysledek[r.slug];
    if (!j) continue;
    j.ceny[r.date] = cislo(r.price_cents);
    j.minNoci[r.date] = r.min_nights;
    if (r.closed) obsazeneSety.get(r.slug)!.add(r.date);
    if (r.closed_to_arrival) j.bezPrijezdu.push(r.date);
    if (r.closed_to_departure) j.bezOdjezdu.push(r.date);
  }

  for (const r of obsazenost) {
    const set = obsazeneSety.get(r.slug);
    if (!set) continue;
    for (let d = startOfDay(new Date(r.od)); toKey(d) < r.do_; d = addDays(d, 1)) {
      set.add(toKey(d));
    }
  }

  for (const slug of slugy) {
    vysledek[slug].obsazene = [...obsazeneSety.get(slug)!].sort();
  }
  return vysledek;
}

/* ===== Ceník ===== */

type RadekDoplnku = {
  id: string;
  name: string;
  description: string | null;
  price_cents: string | number;
  unit: "per_stay" | "per_day" | "per_piece";
  max_qty: number;
};

/**
 * Části ceníku, které jsou pro všechny domky stejné.
 *
 * Načítají se **jedním dotazem a jen jednou**. Dřív to byly tři dotazy
 * na každý domek — šest paralelních dotazů, což na vzdálené databázi
 * za transakčním poolerem vyčerpalo spojení a stránka se zasekla.
 * Kromě toho to byla zbytečná práce: doplňky ani výše kauce se podle
 * domku neliší.
 */
export type SpolecnyCenik = {
  doplnky: import("./index").Doplnek[];
  slevaDlouhehoPobytu: { odNoci: number; bodu: number } | null;
  kauceHalere: number;
};

export async function nactiSpolecnyCenik(): Promise<SpolecnyCenik> {
  const [radek] = await radky<{
    doplnky: RadekDoplnku[] | string | null;
    sleva_min_nights: number | null;
    sleva_percent_bp: number | null;
    kauce: string | number | null;
  }>(sql`
    SELECT
      (SELECT json_agg(d ORDER BY d.sort_order)
         FROM (SELECT id, name, description, price_cents, unit, max_qty, sort_order
                 FROM addons
                WHERE active
                  AND (available_from IS NULL OR available_from <= CURRENT_DATE)
                  AND (available_to   IS NULL OR available_to   >= CURRENT_DATE)) d
      ) AS doplnky,
      (SELECT min_nights FROM discount_rules
        WHERE active AND kind = 'length'
          AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
          AND (valid_to   IS NULL OR valid_to   >= CURRENT_DATE)
        ORDER BY min_nights LIMIT 1) AS sleva_min_nights,
      (SELECT percent_bp FROM discount_rules
        WHERE active AND kind = 'length'
          AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
          AND (valid_to   IS NULL OR valid_to   >= CURRENT_DATE)
        ORDER BY min_nights LIMIT 1) AS sleva_percent_bp,
      (SELECT security_deposit_cents FROM company_settings WHERE id = 1) AS kauce
  `);

  const surove = typeof radek?.doplnky === "string" ? JSON.parse(radek.doplnky) : radek?.doplnky;
  return {
    doplnky: (surove ?? []).map((d: RadekDoplnku) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      priceHalere: cislo(d.price_cents),
      unit: d.unit,
      maxQty: d.max_qty,
    })),
    slevaDlouhehoPobytu:
      radek?.sleva_min_nights != null && radek?.sleva_percent_bp != null
        ? { odNoci: radek.sleva_min_nights, bodu: radek.sleva_percent_bp }
        : null,
    kauceHalere: cislo(radek?.kauce ?? 0),
  };
}

/** Ceník pro jednu jednotku = společná část + její ceny nocí. */
export function sestavCenik(
  dostupnost: DostupnostJednotky,
  spolecne: SpolecnyCenik,
): import("./index").Cenik {
  return {
    ceny: dostupnost.ceny,
    minNoci: dostupnost.minNoci,
    doplnky: spolecne.doplnky,
    slevaDlouhehoPobytu: spolecne.slevaDlouhehoPobytu,
    kauceHalere: spolecne.kauceHalere,
  };
}

/**
 * Dostupnost i ceníky pro sadu jednotek.
 *
 * Tři dotazy dohromady, ať se toho po síti nepřenáší víc, než je nutné:
 * ceník, obsazenost, společná část. Žádné paralelní vějíře.
 */
export async function nactiRezervacniData(slugy: string[], dni: number = OKNO_DNI) {
  const dostupnost = await nactiDostupnost(slugy, dni);
  const spolecne = await nactiSpolecnyCenik();
  const ceniky = Object.fromEntries(
    slugy.map((s) => [s, sestavCenik(dostupnost[s], spolecne)]),
  );
  return { dostupnost, ceniky } as {
    dostupnost: Record<string, DostupnostJednotky>;
    ceniky: Record<string, import("./index").Cenik>;
  };
}
