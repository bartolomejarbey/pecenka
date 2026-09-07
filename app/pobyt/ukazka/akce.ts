"use server";

import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { prihlasUkazkove } from "@/lib/portal/pristup";
import { ukazkaPovolena } from "@/lib/portal/ukazka";

/**
 * Přepnutí fáze ukázkového pobytu.
 *
 * Posouvá **termín rezervace**, ne příznak v adrese. Portál pak neví, že jde
 * o ukázku, a chová se přesně jako hostům — včetně toho, co je odemčené
 * (kód od schránky den před příjezdem) a co ne. Ukázka, která se chová jinak
 * než provoz, neukazuje nic.
 *
 * Mění se ukázková rezervace ze seedu. Naostro to nefunguje.
 */

export type FazeUkazky = "pred" | "prijezd" | "behem" | "odjezd" | "po";

/** Posun příjezdu a odjezdu ode dneška, ve dnech. */
const POSUNY: Record<FazeUkazky, { prijezd: number; odjezd: number }> = {
  pred: { prijezd: 5, odjezd: 8 },
  prijezd: { prijezd: 0, odjezd: 3 },
  behem: { prijezd: -1, odjezd: 2 },
  odjezd: { prijezd: -2, odjezd: 0 },
  po: { prijezd: -4, odjezd: -1 },
};

/**
 * Otevřít ukázku bez posouvání termínu — v tom stavu, v jakém rezervace je.
 *
 * Vlastní akce, protože cookie jde nastavit **jen v serverové akci nebo
 * routě**, ne při vykreslení stránky. Rozcestník proto nic nepřihlašuje;
 * přihlašuje se až klepnutím.
 */
export async function otevriUkazku(form: FormData): Promise<void> {
  if (!ukazkaPovolena()) redirect("/pobyt/prihlaseni");

  const id = String(form.get("rezervace") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/pobyt/ukazka");

  await prihlasUkazkove(id);
  redirect(String(form.get("kam") ?? "/pobyt"));
}

export async function nastavFaziUkazky(form: FormData): Promise<void> {
  if (!ukazkaPovolena()) redirect("/pobyt/prihlaseni");

  const id = String(form.get("rezervace") ?? "");
  const faze = String(form.get("faze") ?? "") as FazeUkazky;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !(faze in POSUNY)) redirect("/pobyt/ukazka");

  const p = POSUNY[faze];
  // Stav rezervace musí sedět s termínem: „odjel" znamená checked_out,
  // jinak by se pobyt tvářil, že pořád běží.
  const stav = p.odjezd < 0 ? "checked_out" : p.prijezd <= 0 ? "checked_in" : "confirmed";

  // `current_date + $1` bez typu Postgres neumí přiřadit — nepozná, jestli je
  // parametr počet dní nebo interval, a skončí na „could not choose a best
  // candidate operator".
  await radky(sql`
    UPDATE reservations
       SET checkin = current_date + ${p.prijezd}::int,
           checkout = current_date + ${p.odjezd}::int,
           status = ${stav}::reservation_status
     WHERE id = ${id}::uuid
  `);
  await radky(sql`
    UPDATE reservation_units
       SET checkin = current_date + ${p.prijezd}::int,
           checkout = current_date + ${p.odjezd}::int,
           status = ${stav}::reservation_status
     WHERE reservation_id = ${id}::uuid
  `);

  /*
   * Odjezdový protokol zpátky na začátek.
   *
   * Bez toho by po přepnutí do fáze „před příjezdem" zůstal protokol odeslaný
   * z předchozí ukázky a host by viděl vzkaz k pobytu, který ještě nezačal.
   */
  await radky(sql`
    DELETE FROM inspection_photos WHERE inspection_id IN (
      SELECT id FROM inspections WHERE reservation_id = ${id}::uuid)
  `);
  await radky(sql`
    DELETE FROM photo_pairs WHERE inspection_id IN (
      SELECT id FROM inspections WHERE reservation_id = ${id}::uuid)
  `);
  await radky(sql`
    UPDATE inspections
       SET status = 'draft', submitted_at = NULL, analyzed_at = NULL, summary_cs = NULL,
           guest_message_cs = NULL, guest_message_json = NULL, guest_message_tone = NULL,
           guest_message_at = NULL, reopened_zones = '{}'::text[], attempts = 0
     WHERE reservation_id = ${id}::uuid
  `);

  await prihlasUkazkove(id);
  redirect("/pobyt");
}
