import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { radky, jeLokalniDb } from "@/lib/db/client";
import { vyzadujPrihlaseni } from "@/lib/auth/dal";
import { odhlasSe } from "@/lib/auth/akce";
import { formatHalere } from "@/lib/booking";
import { COMGATE_ZAPNUT } from "@/lib/payments/nastaveni";
import { podpisyNastaveny } from "@/lib/payments/podpis";
import Shell from "@/components/admin/Shell";
import { Karta } from "@/components/admin/prvky";

export const metadata: Metadata = { title: "Nastavení", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Nastavení a kontrola připravenosti.
 *
 * Nejdůležitější část je seznam toho, co ještě není hotové — placeholdery
 * v údajích firmy nebo chybějící bankovní účet se jinak pozná až na první
 * faktuře, kterou nelze vystavit.
 */
export default async function AdminNastaveni() {
  const kdo = await vyzadujPrihlaseni();

  const [firma] = await radky<{
    legal_name: string;
    ico: string;
    dic: string | null;
    bank_iban: string;
    bank_display: string;
    vat_payer: boolean;
    city_tax_cents: string | number;
    security_deposit_cents: string | number;
    deposit_share_bp: number;
  }>(sql`
    SELECT legal_name, ico, dic, bank_iban, bank_display, vat_payer,
           city_tax_cents, security_deposit_cents, deposit_share_bp
      FROM company_settings WHERE id = 1
  `);

  const nedodelky = [
    !firma || firma.legal_name.startsWith("DOPLNIT")
      ? "Doplnit jméno podnikatele nebo název firmy a IČO."
      : null,
    !firma || firma.bank_iban.startsWith("CZ00000")
      ? "Doplnit bankovní účet — bez něj se negeneruje QR platba."
      : null,
    !podpisyNastaveny() ? "Nastavit PAYMENTS_SIGNING_KEY (podpis odkazů na platbu)." : null,
    !process.env.SMTP_HOST ? "Nastavit SMTP — bez něj se e-maily jen logují." : null,
    !process.env.CRON_SECRET ? "Nastavit CRON_SECRET — bez něj neběží uvolňování termínů." : null,
    jeLokalniDb() ? "Napojit ostrou databázi (DATABASE_URL). Teď běží lokální PGlite." : null,
    !COMGATE_ZAPNUT ? "Zasmluvnit platební bránu ComGate (volitelné, QR platba funguje)." : null,
    Number(firma?.city_tax_cents ?? 0) === 0
      ? "Ověřit u obce Jílové u Držkova sazbu poplatku z pobytu a číslo vyhlášky."
      : null,
  ].filter(Boolean) as string[];

  return (
    <Shell kdo={kdo} aktivni="/admin/nastaveni" nadpis="Nastavení">
      <div className="space-y-5">
        <Karta nadpis="Než se spustí naostro" pocet={nedodelky.length}>
          {nedodelky.length ? (
            nedodelky.map((n) => (
              <p key={n} className="flex gap-3 px-5 py-3.5 text-[14.5px] text-sage">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" aria-hidden="true" />
                {n}
              </p>
            ))
          ) : (
            <p className="px-5 py-6 text-[14.5px] text-emerald-300">Všechno je nastavené.</p>
          )}
        </Karta>

        <Karta nadpis="Firma a platby">
          <Radek popis="Název" hodnota={firma?.legal_name ?? "—"} />
          <Radek popis="IČO" hodnota={firma?.ico ?? "—"} />
          <Radek popis="DIČ" hodnota={firma?.dic ?? "není plátce DPH"} />
          <Radek popis="Účet" hodnota={firma?.bank_display ?? "—"} />
          <Radek popis="Záloha" hodnota={`${(firma?.deposit_share_bp ?? 0) / 100} % z ceny pobytu`} />
          <Radek
            popis="Kauce"
            hodnota={formatHalere(Number(firma?.security_deposit_cents ?? 0)) + " (neúčtuje se předem)"}
          />
          <Radek
            popis="Poplatek obci"
            hodnota={
              Number(firma?.city_tax_cents ?? 0) > 0
                ? `${formatHalere(Number(firma!.city_tax_cents))} za osobu a noc`
                : "obec ho zatím nemá zavedený / neověřeno"
            }
          />
        </Karta>

        <Karta nadpis="Účet">
          <Radek popis="Přihlášen" hodnota={`${kdo.jmeno} · ${kdo.email}`} />
          <Radek popis="Role" hodnota={kdo.role} />
          <div className="px-5 py-4">
            <form action={odhlasSe}>
              <button className="rounded-xl border border-linen/15 px-4 py-2.5 text-[14px] text-sage transition-colors hover:border-linen/30 hover:text-linen">
                Odhlásit se
              </button>
            </form>
          </div>
        </Karta>
      </div>
    </Shell>
  );
}

function Radek({ popis, hodnota }: { popis: string; hodnota: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 px-5 py-3.5 text-[14.5px]">
      <span className="text-sage">{popis}</span>
      <span className="text-linen">{hodnota}</span>
    </div>
  );
}
