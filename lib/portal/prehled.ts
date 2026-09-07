import "server-only";

import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { nactiInfoDomku, type InfoOPobytu } from "@/lib/admin/pobyt";
import type { Pobyt } from "./pristup";

/**
 * Co host v portálu potřebuje — a kdy.
 *
 * Původní verze byla výpis databáze: pozdrav, číslo rezervace, variabilní
 * symbol, definiční seznam adresy a wifi, prosba o fotky. Člověk, který stojí
 * v deset večer u závory na kraji lesa, nepotřebuje účetní číslo. Potřebuje
 * vědět, **kudy** a **jak se dostane dovnitř**. A za tři dny ráno potřebuje
 * něco úplně jiného.
 *
 * Portál se proto neptá „co o téhle rezervaci víme", ale „kde v pobytu ten
 * člověk právě je". Podle toho se mění, co je nahoře a velké:
 *
 *  · `pred`    — ještě nevyjel. Nejdůležitější je cesta a čas příjezdu.
 *  · `prijezd` — jede dnes nebo zítra. Nejdůležitější je vstup do domku.
 *  · `behem`   — je uvnitř. Nejdůležitější je wifi, topení a telefon.
 *  · `odjezd`  — odjíždí dnes nebo zítra. Nejdůležitější je protokol.
 *  · `po`      — už odjel. Zbývá vzkaz a poděkování.
 *
 * Vstup do domku se schválně odemyká **až den před příjezdem**. Kód od
 * schránky poslaný tři měsíce dopředu se ztratí v e-mailu a stejně se na něj
 * host bude ptát telefonem.
 */

export type Faze = "pred" | "prijezd" | "behem" | "odjezd" | "po";

export type Doplnek = { nazev: string; pocet: number };

export type Prehled = {
  faze: Faze;
  /** Kolik dní zbývá do příjezdu (kladné), nebo do odjezdu (u probíhajícího pobytu). */
  dniDoPrijezdu: number;
  dniDoOdjezdu: number;
  /** Noci celkem — do věty „tři noci v Achátu". */
  noci: number;
  info: InfoOPobytu | null;
  /** Vstupní pokyny se ukazují až od téhle chvíle. */
  vstupOdemcen: boolean;
  doplnky: Doplnek[];
};

const DEN = 86_400_000;

/** Rozdíl ve dnech mezi dvěma daty, bez ohledu na čas a letní čas. */
export function rozdilDnu(od: Date, do_: Date): number {
  const a = Date.UTC(od.getFullYear(), od.getMonth(), od.getDate());
  const b = Date.UTC(do_.getFullYear(), do_.getMonth(), do_.getDate());
  return Math.round((b - a) / DEN);
}

export function urciFazi(prijezd: Date, odjezd: Date, dnes = new Date()): Faze {
  const doPrijezdu = rozdilDnu(dnes, prijezd);
  const doOdjezdu = rozdilDnu(dnes, odjezd);

  if (doOdjezdu < 0) return "po";
  // Den odjezdu i den před ním — protokol je to jediné, co po hostovi chceme.
  if (doOdjezdu <= 1) return "odjezd";
  // Dnes nebo zítra přijíždí: host je na cestě, ne v domku. Potřebuje
  // navigaci a kód od schránky, ne „Vítejte". Den příjezdu se dřív počítal
  // jako „během pobytu", takže host ve tři odpoledne na parkovišti četl,
  // že už je uvnitř.
  if (doPrijezdu >= 2) return "pred";
  if (doPrijezdu >= 0) return "prijezd";
  return "behem";
}

export async function nactiPrehled(pobyt: Pobyt): Promise<Prehled> {
  const prijezd = new Date(pobyt.prijezd);
  const odjezd = new Date(pobyt.odjezd);
  const dnes = new Date();

  const [info, doplnky] = await Promise.all([
    nactiInfoDomku(pobyt.domekSlug),
    radky<{ label: string; qty: number }>(sql`
      SELECT label, quantity AS qty FROM reservation_items
       WHERE reservation_id = ${pobyt.rezervaceId}::uuid AND kind = 'addon'
       ORDER BY label
    `).catch(() => []),
  ]);

  const dniDoPrijezdu = rozdilDnu(dnes, prijezd);

  return {
    faze: urciFazi(prijezd, odjezd, dnes),
    dniDoPrijezdu,
    dniDoOdjezdu: rozdilDnu(dnes, odjezd),
    noci: rozdilDnu(prijezd, odjezd),
    info,
    // Den předem, ne dřív. Kód poslaný tři měsíce dopředu se ztratí.
    vstupOdemcen: dniDoPrijezdu <= 1,
    doplnky: doplnky.map((d) => ({ nazev: d.label, pocet: Number(d.qty) || 1 })),
  };
}
