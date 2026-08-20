import "server-only";

import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";

/**
 * Checklist zón, které host fotí před odjezdem.
 *
 * Verze je **neměnná** a rezervace se na ni pinuje při založení. Bez toho by
 * se po první úpravě checklistu rozpadla obhajitelnost starých případů —
 * u sporu o škodu musí jít doložit, na co přesně se host v tu chvíli ptal.
 *
 * Dvanáct zón je horní hranice toho, co host ochotně vyfotí. Víc znamená,
 * že to vzdá v polovině.
 */

export type ZonaDef = {
  klic: string;
  nazev: string;
  poradi: number;
  povinna: boolean;
  snimku: number;
  navod: string;
  otazky: string[];
  prahEskalace: number;
  odhadOpravyKc: number | null;
};

export const VYCHOZI_ZONY: ZonaDef[] = [
  {
    klic: "floor", nazev: "Podlaha", poradi: 1, povinna: true, snimku: 2,
    navod: "Postavte se do dveří a vyfoťte celou podlahu. Pak druhý snímek od okna zpátky ke dveřím.",
    otazky: ["Nejsou ve vinylu rýhy nebo promáčkliny?", "Nechybí lišta?", "Nejsou skvrny, které nejdou setřít?"],
    prahEskalace: 0.8, odhadOpravyKc: 4000,
  },
  {
    klic: "kitchen", nazev: "Kuchyňská linka", poradi: 2, povinna: true, snimku: 2,
    navod: "Celá linka zepředu. Druhý snímek shora na pracovní desku.",
    otazky: ["Není deska propálená nebo pořezaná?", "Fungují dvířka a nejsou uražená?", "Není poškozený dřez nebo baterie?"],
    prahEskalace: 0.8, odhadOpravyKc: 6000,
  },
  {
    klic: "fridge", nazev: "Lednice", poradi: 3, povinna: true, snimku: 1,
    navod: "Otevřete lednici a vyfoťte vnitřek.",
    otazky: ["Není prasklá police?", "Nezůstaly potraviny?", "Nechybí přihrádka?"],
    prahEskalace: 0.85, odhadOpravyKc: 1500,
  },
  {
    klic: "bathroom", nazev: "Koupelna a sprcha", poradi: 4, povinna: true, snimku: 2,
    navod: "Celá koupelna a zvlášť sprchový kout.",
    otazky: ["Není prasklá sprchová zástěna?", "Drží držák sprchy?", "Nejsou uvolněné obklady?"],
    prahEskalace: 0.85, odhadOpravyKc: 5000,
  },
  {
    klic: "wc", nazev: "WC", poradi: 5, povinna: true, snimku: 1,
    navod: "Vyfoťte záchod včetně prkénka.",
    otazky: ["Není prasklé prkénko nebo nádržka?", "Drží držák papíru?"],
    prahEskalace: 0.85, odhadOpravyKc: 2000,
  },
  {
    klic: "loft", nazev: "Spací patro", poradi: 6, povinna: true, snimku: 1,
    navod: "Vylezte na patro a vyfoťte ho celé i se zábradlím.",
    otazky: ["Drží zábradlí pevně?", "Nejsou poškozené schůdky?"],
    prahEskalace: 0.8, odhadOpravyKc: 3000,
  },
  {
    klic: "mattress", nazev: "Matrace", poradi: 7, povinna: true, snimku: 1,
    navod: "Stáhněte prostěradlo a vyfoťte matraci. Povlečení nechte klidně vedle.",
    otazky: ["Nejsou na matraci skvrny?", "Není propálená nebo protržená?"],
    prahEskalace: 0.75, odhadOpravyKc: 8000,
  },
  {
    klic: "seating", nazev: "Sedačka a nábytek", poradi: 8, povinna: true, snimku: 1,
    navod: "Sedačku a stolek zepředu, ať je vidět čalounění.",
    otazky: ["Nejsou v čalounění díry, skvrny nebo propálená místa?", "Nechybí noha u stolku?"],
    prahEskalace: 0.8, odhadOpravyKc: 7000,
  },
  {
    klic: "window", nazev: "Prosklená stěna a žaluzie", poradi: 9, povinna: true, snimku: 1,
    navod: "Celá prosklená stěna zevnitř. Žaluzie prosím vytáhněte nahoru.",
    otazky: ["Není sklo prasklé nebo naprasklé v rohu?", "Jede žaluzie nahoru i dolů?"],
    prahEskalace: 0.9, odhadOpravyKc: 25000,
  },
  {
    klic: "ceiling", nazev: "Strop a stěny", poradi: 10, povinna: false, snimku: 1,
    navod: "Zakloňte se a vyfoťte strop, ať jsou vidět i horní části stěn.",
    otazky: ["Nejsou na stropě mapy od vlhkosti?", "Nechybí lampa nebo kryt světla?"],
    prahEskalace: 0.85, odhadOpravyKc: 3000,
  },
  {
    klic: "terrace", nazev: "Terasa", poradi: 11, povinna: false, snimku: 1,
    navod: "Terasu ode dveří, i s nábytkem.",
    otazky: ["Nejsou prkna prasklá nebo uvolněná?", "Je nábytek celý?"],
    prahEskalace: 0.85, odhadOpravyKc: 4000,
  },
  {
    klic: "grill", nazev: "Ohniště a gril", poradi: 12, povinna: false, snimku: 1,
    navod: "Ohniště a gril. Popel klidně nechte, jen ať je vidět stav.",
    otazky: ["Není rošt prohořelý nebo zdeformovaný?", "Je ohniště celé?"],
    prahEskalace: 0.85, odhadOpravyKc: 2500,
  },
];

/** Publikuje výchozí checklist, pokud ještě žádný není. Vrací id verze. */
export async function zajistiChecklist(): Promise<string> {
  const [aktivni] = await radky<{ id: string }>(
    sql`SELECT cv.id::text AS id FROM checklist_versions cv
         WHERE cv.is_active ORDER BY cv.published_at DESC LIMIT 1`,
  );
  if (aktivni) return aktivni.id;

  const [sablona] = await radky<{ id: string }>(
    sql`INSERT INTO checklist_templates (name, draft_json)
        VALUES ('Odjezdový protokol', ${JSON.stringify(VYCHOZI_ZONY)}::jsonb)
        RETURNING id::text AS id`,
  );
  const [verze] = await radky<{ id: string }>(
    sql`INSERT INTO checklist_versions (template_id, semver, schema_json, published_by)
        VALUES (${sablona.id}::uuid, '1.0.0', ${JSON.stringify(VYCHOZI_ZONY)}::jsonb, 'system')
        RETURNING id::text AS id`,
  );
  for (const z of VYCHOZI_ZONY) {
    await radky(sql`
      INSERT INTO checklist_zones (checklist_version_id, zone_key, label, order_index, required,
                                   shots_count, guide_text, llm_questions, escalation_threshold,
                                   repair_cost_hint_cents)
      VALUES (${verze.id}::uuid, ${z.klic}, ${z.nazev}, ${z.poradi}, ${z.povinna}, ${z.snimku},
              ${z.navod}, ${JSON.stringify(z.otazky)}::jsonb, ${z.prahEskalace},
              ${z.odhadOpravyKc === null ? null : z.odhadOpravyKc * 100})
    `);
  }
  return verze.id;
}

export async function nactiZony(verzeId: string): Promise<ZonaDef[]> {
  const z = await radky<{
    zone_key: string; label: string; order_index: number; required: boolean;
    shots_count: number; guide_text: string; llm_questions: string[] | string;
    escalation_threshold: string | number; repair_cost_hint_cents: string | number | null;
  }>(sql`
    SELECT zone_key, label, order_index, required, shots_count, guide_text,
           llm_questions, escalation_threshold, repair_cost_hint_cents
      FROM checklist_zones WHERE checklist_version_id = ${verzeId}::uuid ORDER BY order_index
  `);
  return z.map((r) => ({
    klic: r.zone_key,
    nazev: r.label,
    poradi: r.order_index,
    povinna: r.required,
    snimku: r.shots_count,
    navod: r.guide_text,
    otazky: typeof r.llm_questions === "string" ? JSON.parse(r.llm_questions) : r.llm_questions,
    prahEskalace: Number(r.escalation_threshold),
    odhadOpravyKc: r.repair_cost_hint_cents === null ? null : Number(r.repair_cost_hint_cents) / 100,
  }));
}
