import "server-only";

import { sql } from "drizzle-orm";
import { radky, jeLokalniDb } from "@/lib/db/client";
import { dostupnyModel } from "@/lib/luna/model";
import { stavUloziste } from "@/lib/luna/uloziste";
import { podpisyNastaveny } from "@/lib/payments/podpis";
import { pristupNastaven } from "@/lib/portal/pristup";

/**
 * Stav systému.
 *
 * Nastavení dosud ukazovalo jen seznam nedodělků z proměnných prostředí.
 * Neřeklo ale to podstatné: **jestli věci, na kterých provoz stojí, opravdu
 * fungují**. Na Vercelu bez Supabase se třeba fotky nemají kam ukládat —
 * a přišlo by se na to až tím, že host nedokáže odeslat protokol.
 *
 * Každý řádek odpovídá na jednu otázku a říká, co se stane, když to nejde.
 */

export type Radek = {
  nazev: string;
  hodnota: string;
  stav: "ok" | "pozor" | "chyba";
  /** Co to znamená v provozu. */
  dopad?: string;
};

export async function nactiStavSystemu(): Promise<Radek[]> {
  const uloziste = stavUloziste();
  const model = dostupnyModel();

  const [protokoly] = await radky<{
    ceka: number;
    selhalo: number;
    fotek_po_lhute: number;
  }>(sql`
    SELECT
      (SELECT count(*)::int FROM inspections
        WHERE status IN ('submitted','analyzing') AND attempts < 3) AS ceka,
      (SELECT count(*)::int FROM inspections
        WHERE status IN ('submitted','analyzing') AND attempts >= 3) AS selhalo,
      (SELECT count(*)::int FROM inspection_photos
        WHERE delete_after <= current_date AND deleted_at IS NULL AND NOT legal_hold) AS fotek_po_lhute
  `).catch(() => [{ ceka: 0, selhalo: 0, fotek_po_lhute: 0 }]);

  const [reference] = await radky<{ domku: number; sezon: number }>(sql`
    SELECT (SELECT count(*)::int FROM units WHERE NOT is_virtual AND active) AS domku,
           (SELECT count(DISTINCT unit_slug)::int FROM baseline_sets WHERE valid_to IS NULL) AS sezon
  `).catch(() => [{ domku: 0, sezon: 0 }]);

  return [
    {
      nazev: "Databáze",
      hodnota: jeLokalniDb() ? "Lokální PGlite (.pglite)" : "Ostrý Postgres",
      stav: jeLokalniDb() ? "pozor" : "ok",
      dopad: jeLokalniDb() ? "Data jsou jen na tomhle stroji a nasazením zmizí." : undefined,
    },
    {
      nazev: "Úložiště fotek",
      hodnota: uloziste.popis,
      stav: uloziste.vporadku ? "ok" : "chyba",
      dopad: uloziste.vporadku
        ? undefined
        : "Host nedokáže odeslat odjezdový protokol a nahrávání referencí selže.",
    },
    {
      nazev: "Vyhodnocení fotek",
      hodnota:
        model === "openai" ? "ChatGPT" : model === "anthropic" ? "Claude" : "Není nastavený klíč",
      stav: model === "zadny" ? "pozor" : "ok",
      dopad:
        model === "zadny"
          ? "Fotky se porovnají obrazově, ale všechny rozdíly půjdou k ručnímu posouzení."
          : undefined,
    },
    {
      nazev: "Referenční fotky",
      hodnota: `${reference.sezon} z ${reference.domku} domků má sadu`,
      stav: reference.domku > 0 && reference.sezon >= reference.domku ? "ok" : "pozor",
      dopad:
        reference.sezon >= reference.domku
          ? undefined
          : "Bez reference nemá systém co s čím porovnat a protokol jde celý k člověku.",
    },
    {
      nazev: "Odesílání pošty",
      hodnota: process.env.SMTP_HOST ? `SMTP ${process.env.SMTP_HOST}` : "Nenastaveno",
      stav: process.env.SMTP_HOST ? "ok" : "pozor",
      dopad: process.env.SMTP_HOST
        ? undefined
        : "E-maily se jen vypisují do konzole — host nedostane potvrzení ani přístup do portálu.",
    },
    {
      nazev: "Podpis odkazů",
      hodnota: podpisyNastaveny() ? "Nastaveno" : "Chybí PAYMENTS_SIGNING_KEY",
      stav: podpisyNastaveny() ? "ok" : "chyba",
      dopad: podpisyNastaveny() ? undefined : "Odkazy na platbu se vůbec negenerují.",
    },
    {
      nazev: "Ochrana portálu hostů",
      hodnota: process.env.PORTAL_SECRET ? "Vlastní klíč" : pristupNastaven() ? "Sdílený klíč plateb" : "Chybí",
      stav: process.env.PORTAL_SECRET ? "ok" : pristupNastaven() ? "pozor" : "chyba",
      dopad: process.env.PORTAL_SECRET
        ? undefined
        : pristupNastaven()
          ? "Portál jede na klíči pro podpisy plateb. Funguje to, ale vlastní PORTAL_SECRET je čistší."
          : "Bez PORTAL_SECRET se hosté do portálu vůbec nepřihlásí — kódy by šlo spočítat z variabilního symbolu, takže systém raději nefunguje.",
    },
    {
      nazev: "Naplánované úlohy",
      hodnota: process.env.CRON_SECRET ? "Chráněné tajemstvím" : "Nenastaveno",
      stav: process.env.CRON_SECRET ? "ok" : "pozor",
      dopad: process.env.CRON_SECRET
        ? undefined
        : "Naostro se crony vůbec nespustí — držené termíny se neuvolní a fotky se nesmažou.",
    },
    {
      nazev: "Protokoly ve frontě",
      hodnota:
        protokoly.selhalo > 0
          ? `${protokoly.ceka} čeká, ${protokoly.selhalo} selhalo`
          : `${protokoly.ceka} čeká na vyhodnocení`,
      stav: protokoly.selhalo > 0 ? "chyba" : "ok",
      dopad:
        protokoly.selhalo > 0
          ? "Tyhle protokoly se nepodařilo vyhodnotit ani napotřetí — projdi je prosím ručně."
          : undefined,
    },
    {
      nazev: "Fotky po lhůtě",
      hodnota:
        protokoly.fotek_po_lhute > 0
          ? `${protokoly.fotek_po_lhute} čeká na smazání`
          : "Žádné, úklid je hotový",
      stav: protokoly.fotek_po_lhute > 0 ? "pozor" : "ok",
      dopad:
        protokoly.fotek_po_lhute > 0
          ? "Hostům slibujeme mazání po 90 dnech. Spusť prosím úlohu „Mazání fotek po lhůtě“."
          : undefined,
    },
  ];
}
