import Link from "next/link";
import LogoMark from "@/components/LogoMark";
import { odhlasSe } from "@/lib/auth/akce";
import type { Prihlaseny } from "@/lib/auth/session";

/**
 * Obal administrace.
 *
 * Mobile-first: majitel to bude otevírat hlavně na telefonu, často venku.
 * Spodní navigace je proto palcem dosažitelná, položky mají 56 px a nic
 * důležitého není schované v hamburgeru.
 */

export const POLOZKY = [
  { href: "/admin", popis: "Dnes", ikona: DnesIkona },
  { href: "/admin/kalendar", popis: "Kalendář", ikona: KalendarIkona },
  { href: "/admin/rezervace", popis: "Rezervace", ikona: RezervaceIkona },
  { href: "/admin/penize", popis: "Peníze", ikona: PenizeIkona },
  { href: "/admin/doklady", popis: "Doklady", ikona: DokladyIkona },
  { href: "/admin/nastaveni", popis: "Víc", ikona: VicIkona },
] as const;

export default function Shell({
  kdo,
  aktivni,
  nadpis,
  akce,
  children,
}: {
  kdo: Prihlaseny;
  /** Která položka navigace svítí. */
  aktivni: string;
  nadpis: string;
  akce?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-night pb-24 lg:flex lg:gap-0 lg:pb-0">
      {/* Boční navigace na velkém displeji */}
      <aside className="hidden w-56 shrink-0 border-r border-linen/8 bg-bark lg:block">
        <div className="sticky top-0 flex h-svh flex-col p-5">
          <Link href="/admin" className="flex items-center gap-2.5 text-linen">
            <LogoMark className="h-5 w-auto" />
            <span className="font-display text-[15px] uppercase tracking-[0.14em]">Sedmý les</span>
          </Link>

          <nav className="mt-9 flex flex-1 flex-col gap-1" aria-label="Administrace">
            {POLOZKY.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                aria-current={aktivni === p.href ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14.5px] transition-colors ${
                  aktivni === p.href
                    ? "bg-ember/12 text-ember"
                    : "text-sage hover:bg-linen/5 hover:text-linen"
                }`}
              >
                <p.ikona className="h-[18px] w-[18px]" />
                {p.popis}
              </Link>
            ))}
          </nav>

          <div className="border-t border-linen/8 pt-4">
            <p className="text-[13px] text-linen">{kdo.jmeno}</p>
            <p className="text-[12px] text-sage/70">{kdo.email}</p>
            <form action={odhlasSe}>
              <button className="mt-2.5 text-[13px] text-sage underline underline-offset-2 hover:text-ember">
                Odhlásit
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-linen/8 bg-night/95 px-5 py-4 md:px-8">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <h1 className="font-display text-xl text-linen md:text-2xl">{nadpis}</h1>
            {akce}
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-5 py-6 md:px-8 md:py-8">{children}</div>
      </div>

      {/* Spodní navigace na telefonu */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-linen/10 bg-bark lg:hidden"
        aria-label="Administrace"
      >
        {POLOZKY.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            aria-current={aktivni === p.href ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-1 py-3 text-[11px] ${
              aktivni === p.href ? "text-ember" : "text-sage"
            }`}
          >
            <p.ikona className="h-[19px] w-[19px]" />
            {p.popis}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/* ===== Ikony ===== */

type I = { className?: string };
const obrys = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function DnesIkona({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...obrys}>
      <path d="M4 12h4l2.5-6 3 12L16 12h4" />
    </svg>
  );
}
function KalendarIkona({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...obrys}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  );
}
function RezervaceIkona({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...obrys}>
      <path d="M5 4.5h14v15l-7-3.5-7 3.5z" />
    </svg>
  );
}
function PenizeIkona({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...obrys}>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}
function DokladyIkona({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...obrys}>
      <path d="M6 3.5h8l4 4v13H6z" />
      <path d="M14 3.5v4h4M9 12h6M9 16h4" />
    </svg>
  );
}
function VicIkona({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...obrys}>
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
    </svg>
  );
}
