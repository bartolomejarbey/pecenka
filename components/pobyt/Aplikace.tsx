"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Obal aplikace pro hosta.
 *
 * Do teď to byla webová stránka: logo a „Odhlásit" nahoře, pak dlouhé
 * rolování, dole nic. Host to otevírá na telefonu — v autě, u závory, v posteli
 * — a čeká aplikaci: pevné záložky dole, palcem dosažitelné, a obsah, který
 * se nemusí hledat rolováním.
 *
 * Čtyři záložky, protože čtyři otázky: Co je teď? Jak funguje domek? Jak
 * odjet? Komu zavolat? Pátá by už byla menu.
 *
 * Přihlášení a focení domku jsou mimo obal: přihlášení nemá kam přepínat
 * a focení je celoobrazovkový tok, ze kterého se nemá odbíhat.
 */

const ZALOZKY = [
  { href: "/pobyt", popis: "Pobyt", ikona: IkonaPobyt },
  { href: "/pobyt/domek", popis: "Domek", ikona: IkonaDomek },
  { href: "/pobyt/odjezd", popis: "Odjezd", ikona: IkonaOdjezd },
  { href: "/pobyt/pomoc", popis: "Pomoc", ikona: IkonaPomoc },
] as const;

export default function Aplikace({ children }: { children: React.ReactNode }) {
  const cesta = usePathname();
  const aktivni = (href: string) => (href === "/pobyt" ? cesta === "/pobyt" : cesta.startsWith(href));

  return (
    <div className="min-h-svh bg-night">
      {/* Obsah — spodní odsazení kvůli záložkám a bezpečné zóně iPhonu. */}
      <div className="pb-[calc(76px+env(safe-area-inset-bottom))]">{children}</div>

      <nav
        aria-label="Aplikace"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-linen/10 bg-night/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {ZALOZKY.map((z) => {
            const je = aktivni(z.href);
            return (
              <li key={z.href}>
                <Link
                  href={z.href}
                  aria-current={je ? "page" : undefined}
                  className={`flex min-h-[64px] flex-col items-center justify-center gap-1 text-[11.5px] transition-colors ${
                    je ? "text-ember" : "text-sage hover:text-linen"
                  }`}
                >
                  <z.ikona className="h-[22px] w-[22px]" aktivni={je} />
                  {z.popis}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/* ===== Ikony ===== */

type I = { className?: string; aktivni?: boolean };
const obrys = (aktivni?: boolean) =>
  ({
    fill: "none",
    stroke: "currentColor",
    strokeWidth: aktivni ? 2 : 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  }) as const;

function IkonaPobyt({ className, aktivni }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...obrys(aktivni)}>
      <path d="M12 3 4 11v9h5v-6h6v6h5v-9z" />
    </svg>
  );
}
function IkonaDomek({ className, aktivni }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...obrys(aktivni)}>
      <rect x="4" y="9" width="16" height="11" rx="1.5" />
      <path d="M8 9V6a4 4 0 0 1 8 0v3M12 13v3" />
    </svg>
  );
}
function IkonaOdjezd({ className, aktivni }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...obrys(aktivni)}>
      <path d="M4 12.5 9 17l11-11" />
      <path d="M4 20h16" opacity=".4" />
    </svg>
  );
}
function IkonaPomoc({ className, aktivni }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...obrys(aktivni)}>
      <path d="M6.2 3.5h3l1.4 3.6-2 1.4a12 12 0 0 0 5.4 5.4l1.4-2 3.6 1.4v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.2 5.7a2 2 0 0 1 2-2.2z" />
    </svg>
  );
}
