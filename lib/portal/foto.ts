import "server-only";

import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { otiskProDb, posudFotku, pripravFotku, vzdalenostOtisku } from "@/lib/luna/obraz";
import { cestaFotky, nahraj, podepsanyOdkaz } from "@/lib/luna/uloziste";
import { protokolOtevrenOd } from "./vysledek";

/**
 * Příjem jedné fotky do odjezdového protokolu.
 *
 * Bydlí to mimo routu schválně: je to jediné místo, kudy se do systému
 * dostane snímek, na kterém pak může stát nárok na peníze, a chce to umět
 * projet testem bez cookies a bez HTTP.
 *
 * Pravidla, která tu platí:
 *
 *  · **Zóna se ověřuje proti checklistu**, ne proti tomu, co přišlo v poli.
 *    Klíč zóny se lepí do cesty v úložišti; bez kontroly by šlo poslat
 *    `../../baseline/achat/v1` a přepsat referenční snímek fotkou už
 *    poškozeného domku.
 *  · **Název souboru určuje server.** Klientský identifikátor slouží jen
 *    k idempotenci — do cesty se nedostane.
 *  · **Po odeslání se nepřijímá nic**, ledaže jsme si sami řekli o doplňující
 *    snímek. Jinak by šlo přepsat fotku, na které už stojí případ škody.
 *  · **Fotka se hned posoudí.** Tmavou, rozmazanou nebo záběr, který už máme
 *    u jiné zóny, vrátíme, dokud host stojí v místnosti.
 */

export type Prijem =
  | { ok: true; zona: string; nahled: string | null }
  | { ok: false; stav: number; chyba: string; kvalita?: boolean };

export type Zadost = {
  rezervaceId: string;
  /** Kód rezervace — je součástí cesty v úložišti, ať jde fotka dohledat ručně. */
  kodRezervace: string;
  odjezd: string;
  /** Fyzický domek. U „Celého lesa" jich rezervace pokrývá víc. */
  domekSlug?: string;
  zona: string;
  klientId: string;
  data: Buffer;
};

/** Pod tolik bitů rozdílu jsou dva snímky prakticky týž záběr. */
const PRAH_STEJNE = 6;

export async function prijmiFotku(z: Zadost): Promise<Prijem> {
  if (!/^[a-z0-9_-]{1,64}$/.test(z.zona) || !/^[A-Za-z0-9._-]{1,80}$/.test(z.klientId)) {
    return { ok: false, stav: 400, chyba: "Neplatný požadavek." };
  }
  if (z.domekSlug && !/^[a-z0-9-]{1,64}$/.test(z.domekSlug)) {
    return { ok: false, stav: 400, chyba: "Neplatný požadavek." };
  }

  const [inspekce] = await radky<{
    id: string;
    status: string;
    reopened: string[] | string | null;
    zona_existuje: boolean;
    checkin: string;
  }>(sql`
    SELECT i.id::text AS id, i.status, i.reopened_zones AS reopened,
           r.checkin::text AS checkin,
           EXISTS (SELECT 1 FROM checklist_zones cz
                    WHERE cz.checklist_version_id = i.checklist_version_id
                      AND cz.zone_key = ${z.zona}) AS zona_existuje
      FROM inspections i
      JOIN reservations r ON r.id = i.reservation_id
     WHERE i.reservation_id = ${z.rezervaceId}::uuid AND i.type = 'checkout'
       AND (${z.domekSlug ?? null}::text IS NULL OR i.unit_slug = ${z.domekSlug ?? null}::text)
     ORDER BY i.id LIMIT 1
  `);
  if (!inspekce) return { ok: false, stav: 400, chyba: "Protokol není založený." };
  // Kontrola je i tady, ne jen v rozhraní: routa je veřejné API a host se
  // do ní může trefit s cookie z jiné záložky.
  if (Date.now() < protokolOtevrenOd(inspekce.checkin).getTime()) {
    return {
      ok: false,
      stav: 409,
      chyba: "Protokol se otevře až v den před příjezdem. Fotit má smysl na místě.",
    };
  }
  if (!inspekce.zona_existuje) {
    return { ok: false, stav: 400, chyba: "Tahle část domku v protokolu není." };
  }

  const znovu = poleTextu(inspekce.reopened);
  if (inspekce.status !== "draft" && !(inspekce.status === "needs_photo" && znovu.includes(z.zona))) {
    return {
      ok: false,
      stav: 409,
      chyba: "Protokol už je odeslaný. Kdybyste potřebovali něco doplnit, napište nám.",
    };
  }

  let pripravena;
  try {
    pripravena = await pripravFotku(z.data);
  } catch (e) {
    // Formát, který sharp nepřečte (HEIC z galerie, video, poškozený soubor),
    // vypadá stejně jako výpadek úložiště. Hostovi je ale potřeba říct něco
    // úplně jiného, jinak to zkusí desetkrát se stejným výsledkem.
    console.error("[protokol] fotku nelze přečíst:", e);
    return {
      ok: false,
      stav: 415,
      chyba:
        "Tenhle soubor neumíme přečíst. Vyfoťte to prosím přímo v aplikaci " +
        "(tlačítkem Vyfotit) místo výběru z galerie.",
    };
  }

  const posudek = await posudFotku(pripravena.data);
  if (!posudek.pouzitelna) {
    return { ok: false, stav: 422, chyba: posudek.vzkaz, kvalita: true };
  }

  // Hlídá se v rámci jednoho domku. Dva domky vypadají uvnitř skoro stejně,
  // takže porovnávat je mezi sebou by hlásilo shodu pořád.
  const jine = await radky<{ zone_key: string; dhash64: string | number | null }>(sql`
    SELECT zone_key, dhash64 FROM inspection_photos
     WHERE inspection_id = ${inspekce.id}::uuid AND zone_key <> ${z.zona} AND deleted_at IS NULL
  `);
  const shoda = jine.find(
    (f) =>
      f.dhash64 !== null &&
      vzdalenostOtisku(BigInt.asUintN(64, BigInt(f.dhash64)), BigInt.asUintN(64, pripravena.dhash)) <=
        PRAH_STEJNE,
  );
  if (shoda) {
    return {
      ok: false,
      stav: 422,
      kvalita: true,
      chyba:
        "Vypadá to jako tentýž záběr, který už máme u jiné části domku. " +
        "Otočte se prosím k tomu, co je právě na řadě.",
    };
  }

  try {
    const cesta = cestaFotky(
      z.domekSlug ? `${z.kodRezervace}/${z.domekSlug}` : z.kodRezervace,
      z.zona,
      randomUUID(),
    );
    const zadrzeni = new Date(z.odjezd);
    zadrzeni.setDate(zadrzeni.getDate() + 90); // fotky se pak automaticky mažou

    // Nejdřív řádek, pak soubor. Kdyby zápis do úložiště selhal, zůstane
    // v databázi věta bez fotky — a to pozná úklidový cron. Obráceně by
    // v úložišti zůstal sirotek, o kterém nikdo neví.
    const [radek] = await radky<{ storage_key: string }>(sql`
      INSERT INTO inspection_photos (inspection_id, zone_key, client_uuid, storage_key, sha256,
                                     width, height, bytes, exif_taken_at, dhash64, delete_after)
      VALUES (${inspekce.id}::uuid, ${z.zona}, ${z.klientId}, ${cesta}, ${pripravena.sha256},
              ${pripravena.sirka}, ${pripravena.vyska}, ${pripravena.data.length},
              ${pripravena.porizeno?.toISOString() ?? null}::timestamptz,
              ${otiskProDb(pripravena.dhash).toString()}::bigint,
              ${zadrzeni.toISOString().slice(0, 10)}::date)
      ON CONFLICT (inspection_id, client_uuid) DO UPDATE
        SET storage_key = EXCLUDED.storage_key, sha256 = EXCLUDED.sha256,
            width = EXCLUDED.width, height = EXCLUDED.height, bytes = EXCLUDED.bytes,
            dhash64 = EXCLUDED.dhash64, exif_taken_at = EXCLUDED.exif_taken_at,
            deleted_at = NULL, uploaded_at = now()
      RETURNING storage_key
    `);
    await nahraj(radek.storage_key, pripravena.data);

    return {
      ok: true,
      zona: z.zona,
      // Náhled ze serveru: je to ta fotka, kterou budeme opravdu porovnávat,
      // ne osmimegový originál z telefonu, který by Safari drželo v paměti.
      nahled: await podepsanyOdkaz(radek.storage_key, 1800).catch(() => null),
    };
  } catch (e) {
    console.error("[protokol] nahrání fotky selhalo:", e);
    return { ok: false, stav: 500, chyba: "Fotku se nepodařilo uložit. Zkuste to znovu." };
  }
}

/** PGlite vrací `text[]` jako pole, ostrý driver jako `{a,b}`. */
export function poleTextu(hodnota: string[] | string | null): string[] {
  if (Array.isArray(hodnota)) return hodnota;
  return String(hodnota ?? "").replace(/[{}]/g, "").split(",").filter(Boolean);
}
