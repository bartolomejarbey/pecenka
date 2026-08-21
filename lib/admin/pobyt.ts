import "server-only";

import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";

/**
 * Praktické informace k pobytu.
 *
 * Jeden řádek na domek: klíče i wifi se u Acháta a Mechu liší. Adresa se
 * schválně nedává na web — posílá se až s potvrzenou rezervací, aby na
 * samotu u lomu nejezdil kdokoliv.
 */

export type InfoOPobytu = {
  domek: string;
  domekNazev: string;
  adresa: string;
  mapa: string;
  prijezdOd: string;
  odjezdDo: string;
  klice: string;
  wifiSit: string;
  wifiHeslo: string;
  poznamky: string;
  telefon: string;
};

/** Čas z databáze chodí jako `15:00:00`, do formuláře patří `15:00`. */
const cas = (h: unknown) => String(h ?? "").slice(0, 5);

export async function nactiInfoOPobytu(): Promise<InfoOPobytu[]> {
  const r = await radky<Record<string, unknown>>(sql`
    SELECT u.slug, u.name,
           si.address, si.map_url, si.arrival_from, si.departure_by,
           si.access_note, si.wifi_ssid, si.wifi_password, si.house_notes, si.contact_phone
      FROM units u
      LEFT JOIN stay_info si ON si.unit_id = u.id
     WHERE u.active AND NOT u.is_virtual
     ORDER BY u.sort_order
  `);

  return r.map((x) => ({
    domek: String(x.slug),
    domekNazev: String(x.name),
    adresa: String(x.address ?? ""),
    mapa: String(x.map_url ?? ""),
    prijezdOd: cas(x.arrival_from) || "15:00",
    odjezdDo: cas(x.departure_by) || "10:00",
    klice: String(x.access_note ?? ""),
    wifiSit: String(x.wifi_ssid ?? ""),
    wifiHeslo: String(x.wifi_password ?? ""),
    poznamky: String(x.house_notes ?? ""),
    telefon: String(x.contact_phone ?? ""),
  }));
}

/** Informace pro jeden domek — pro portál hosta. */
export async function nactiInfoDomku(slug: string): Promise<InfoOPobytu | null> {
  const vse = await nactiInfoOPobytu();
  return vse.find((i) => i.domek === slug) ?? null;
}
