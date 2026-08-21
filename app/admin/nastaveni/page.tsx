import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { radky, jeLokalniDb } from "@/lib/db/client";
import { vyzadujPrihlaseni } from "@/lib/auth/dal";
import { odhlasSe } from "@/lib/auth/akce";
import { SITE } from "@/lib/content";
import { COMGATE_ZAPNUT } from "@/lib/payments/nastaveni";
import { podpisyNastaveny } from "@/lib/payments/podpis";
import Shell from "@/components/admin/Shell";
import { Karta } from "@/components/admin/prvky";
import FormularFirmy from "./formular";

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
    address: { street?: string; city?: string; zip?: string } | null;
    bank_iban: string;
    bank_display: string;
    vat_payer: boolean;
    city_tax_cents: string | number;
    city_tax_ozv_ref: string | null;
    security_deposit_cents: string | number;
    deposit_share_bp: number;
    invoice_due_days: number;
  }>(sql`
    SELECT legal_name, ico, dic, address, bank_iban, bank_display, vat_payer,
           city_tax_cents, city_tax_ozv_ref, security_deposit_cents,
           deposit_share_bp, invoice_due_days
      FROM company_settings WHERE id = 1
  `);

  // Zástupné hodnoty ze seedu se do formuláře nepředávají — prázdné pole
  // s nápovědou je srozumitelnější než „DOPLNIT", které vypadá jako údaj.
  const bezZastupne = (h: string, vzor: RegExp) => (vzor.test(h) ? "" : h);
  const vychozi = {
    nazev: bezZastupne(firma?.legal_name ?? "", /^DOPLNIT/i),
    ico: bezZastupne(firma?.ico ?? "", /^0{8}$|^DOPLNIT/i),
    dic: firma?.dic ?? "",
    ulice: bezZastupne(firma?.address?.street ?? "", /^DOPLNIT/i),
    mesto: firma?.address?.city ?? "",
    psc: (firma?.address?.zip ?? "").replace(/\s/g, ""),
    ucet: bezZastupne(firma?.bank_display ?? "", /^0+\//),
    platceDph: Boolean(firma?.vat_payer),
    poplatekKc: String(Number(firma?.city_tax_cents ?? 0) / 100),
    vyhlaska: firma?.city_tax_ozv_ref ?? "",
    zalohaProcent: String((firma?.deposit_share_bp ?? 5000) / 100),
    kauceKc: String(Number(firma?.security_deposit_cents ?? 0) / 100),
    splatnostDni: String(firma?.invoice_due_days ?? 14),
  };

  const nedodelky = [
    !firma || firma.legal_name.startsWith("DOPLNIT")
      ? "Doplnit jméno podnikatele nebo název firmy a IČO."
      : null,
    !firma || firma.bank_iban.startsWith("CZ00000")
      ? "Doplnit bankovní účet — bez něj se negeneruje QR platba."
      : null,
    !firma?.address?.street || firma.address.street.startsWith("DOPLNIT")
      ? "Doplnit adresu — je to povinná náležitost dokladu."
      : null,
    SITE.phone.includes("777 000 777")
      ? "Na webu je zástupné telefonní číslo. Pošlete to skutečné — doplní se při nejbližším nasazení."
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

        <Karta nadpis="Fakturační údaje">
          <FormularFirmy vychozi={vychozi} />
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
