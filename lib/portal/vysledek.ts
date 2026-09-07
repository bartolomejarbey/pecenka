import "server-only";

import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { slucVzkazy, vzkazBezVyhodnoceni, type Vzkaz } from "@/lib/luna/vzkaz";

/**
 * Co po odeslání protokolu uvidí host.
 *
 * Rozlišují se tři stavy, protože každý znamená pro člověka stojícího
 * v domku něco jiného:
 *
 *  · `ceka` — fotky jsou nahrané, vyhodnocení běží. Host čeká pár desítek
 *    sekund a vidí, že se něco děje.
 *  · `hotovo` — vzkaz je připravený.
 *  · `bez_vyhodnoceni` — vyhodnocení se nepovedlo nebo trvá nesmyslně dlouho.
 *    Host dostane poděkování a jde domů; že nám spadl model, není jeho starost.
 */

/** Po téhle době se přestane čekat. Běžné vyhodnocení trvá do minuty. */
const TRPELIVOST_MS = 4 * 60 * 1000;

export type StavProtokolu =
  | { stav: "nezalozen" }
  /** Pobyt ještě nezačal — protokol se otevře až na místě. */
  | { stav: "prilis_brzy"; otevreOd: string }
  | { stav: "rozpracovano"; hotovo: number; povinnych: number }
  | { stav: "ceka"; odeslano: string }
  | { stav: "hotovo"; vzkaz: Vzkaz }
  | { stav: "bez_vyhodnoceni"; vzkaz: Vzkaz };

/**
 * Odkdy má smysl protokol vyplňovat.
 *
 * Den před příjezdem, ne dřív. Host mohl protokol otevřít a odeslat den po
 * zaplacení zálohy — tedy klidně tři měsíce před pobytem, na fotky prázdného
 * domku, které nikdo nepořídil. Vznikla inspekce, spustil se model a mohly
 * vzniknout případy škody k pobytu, který se ještě nekonal.
 */
export function protokolOtevrenOd(prijezd: string): Date {
  const d = new Date(prijezd);
  d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function nactiStavProtokolu(rezervaceId: string): Promise<StavProtokolu> {
  // Rezervace může pokrývat víc fyzických domků („Celý les"), a pak má víc
  // inspekcí. Host o tom neví a vidí jeden protokol — stav i vzkaz se proto
  // skládají ze všech.
  const inspekce = await radky<{
    id: string;
    status: string;
    submitted_at: string | null;
    guest_message_json: Vzkaz | string | null;
    hotovo: number;
    povinnych: number;
    checkin: string;
  }>(sql`
    SELECT i.id::text AS id, i.status, i.submitted_at::text AS submitted_at,
           i.guest_message_json, r.checkin::text AS checkin,
           (SELECT count(*)::int FROM inspection_photos p
             WHERE p.inspection_id = i.id AND p.deleted_at IS NULL) AS hotovo,
           (SELECT count(*)::int FROM checklist_zones cz
             WHERE cz.checklist_version_id = i.checklist_version_id AND cz.required) AS povinnych
      FROM inspections i
      JOIN reservations r ON r.id = i.reservation_id
     WHERE i.reservation_id = ${rezervaceId}::uuid AND i.type = 'checkout'
     ORDER BY i.id
  `);

  if (!inspekce.length) return { stav: "nezalozen" };

  const otevreOd = protokolOtevrenOd(inspekce[0].checkin);
  const rozpracovane = inspekce.filter((i) => i.status === "draft");

  if (rozpracovane.length && Date.now() < otevreOd.getTime()) {
    return { stav: "prilis_brzy", otevreOd: otevreOd.toISOString().slice(0, 10) };
  }
  if (rozpracovane.length) {
    return {
      stav: "rozpracovano",
      hotovo: inspekce.reduce((s, i) => s + i.hotovo, 0),
      povinnych: inspekce.reduce((s, i) => s + i.povinnych, 0),
    };
  }

  const vzkazy = inspekce.map((i) => rozbal(i.guest_message_json));
  if (vzkazy.every((v) => v !== null)) {
    return { stav: "hotovo", vzkaz: slucVzkazy(vzkazy as Vzkaz[]) };
  }

  // Vyhodnocení běží. Čekáme, ale ne donekonečna.
  const odeslano = Math.min(
    ...inspekce.map((i) => (i.submitted_at ? new Date(i.submitted_at).getTime() : 0)),
  );
  const beziDlouho = !odeslano || Date.now() - odeslano > TRPELIVOST_MS;
  if (inspekce.every((i) => i.status === "closed") || beziDlouho) {
    return { stav: "bez_vyhodnoceni", vzkaz: vzkazBezVyhodnoceni() };
  }
  return {
    stav: "ceka",
    odeslano: inspekce[0].submitted_at ?? new Date().toISOString(),
  };
}

/** PGlite vrací jsonb jako objekt, ostrý Postgres přes driver taky — ale ne vždy. */
function rozbal(hodnota: Vzkaz | string | null): Vzkaz | null {
  if (!hodnota) return null;
  try {
    const v = typeof hodnota === "string" ? (JSON.parse(hodnota) as Vzkaz) : hodnota;
    return v && typeof v.ton === "string" ? v : null;
  } catch {
    return null;
  }
}
