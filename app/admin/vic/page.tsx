import type { Metadata } from "next";
import Link from "next/link";
import { vyzadujPrihlaseni } from "@/lib/auth/dal";
import { odhlasSe } from "@/lib/auth/akce";
import Shell from "@/components/admin/Shell";

export const metadata: Metadata = { title: "Víc", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Rozcestník.
 *
 * Spodní lišta telefonu unese pět položek; šestá a další patří sem. Není to
 * skrytá zásuvka, ale plnohodnotná stránka s velkými cíli — majitel ji
 * otevírá venku, jednou rukou.
 */
const ODKAZY = [
  {
    href: "/admin/penize",
    nadpis: "Peníze",
    popis: "Co je zaplaceno, co se čeká a co je po splatnosti.",
  },
  {
    href: "/admin/doklady",
    nadpis: "Doklady",
    popis: "Vystavené faktury, zálohy a dobropisy.",
  },
  {
    href: "/admin/reference",
    nadpis: "Referenční fotky",
    popis: "Jak domek vypadá při předání. Proti tomu se porovnávají odjezdové fotky.",
  },
  {
    href: "/admin/test-ai",
    nadpis: "Testování systému AI",
    popis: "Deset zkušebních dvojic před a po — a co by u nich systém řekl hostovi.",
  },
  {
    href: "/pobyt/ukazka",
    nadpis: "Ukázka portálu hosta",
    popis: "Projděte si aplikaci očima hosta — před příjezdem, na místě i u odjezdu.",
  },
  {
    href: "/admin/nastaveni",
    nadpis: "Nastavení",
    popis: "Údaje firmy, informace k pobytu, infolinka a stav systému.",
  },
] as const;

export default async function AdminVic() {
  const kdo = await vyzadujPrihlaseni();

  return (
    <Shell kdo={kdo} aktivni="/admin/vic" nadpis="Víc">
      <ul className="space-y-3">
        {ODKAZY.map((o) => (
          <li key={o.href}>
            <Link
              href={o.href}
              className="flex min-h-[72px] items-center justify-between gap-4 rounded-2xl border border-linen/10 bg-bark px-5 py-4 transition-colors hover:border-ember/40"
            >
              <span className="min-w-0">
                <span className="block text-[16px] text-linen">{o.nadpis}</span>
                <span className="mt-0.5 block text-[13.5px] leading-relaxed text-sage">
                  {o.popis}
                </span>
              </span>
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0 text-sage"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8 rounded-2xl border border-linen/10 bg-bark px-5 py-5">
        <p className="text-[15px] text-linen">{kdo.jmeno}</p>
        <p className="mt-0.5 text-[13px] text-sage">{kdo.email}</p>
        <form action={odhlasSe}>
          <button className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-full border border-linen/20 px-5 text-[15px] text-sage transition-colors hover:border-ember/40 hover:text-ember">
            Odhlásit
          </button>
        </form>
      </div>
    </Shell>
  );
}
