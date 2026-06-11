import Link from "next/link";
import { SITE, NAV_LINKS, LEGAL_LINKS, HOUSES } from "@/lib/content";
import { Logo } from "./ui";

export default function Footer() {
  return (
    <footer className="grain relative overflow-hidden border-t border-linen/8 bg-night">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" aria-label="Sedmý les — úvodní stránka">
              <Logo />
            </Link>
            <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-sage">
              Dva tiny housy u zatopeného lomu. {SITE.claim}
            </p>
          </div>

          <nav aria-label="Domky">
            <p className="kicker mb-4 text-linen/50">Domky</p>
            <ul className="space-y-2.5">
              {HOUSES.map((h) => (
                <li key={h.slug}>
                  <Link
                    href={`/domky/${h.slug}`}
                    className="text-[15px] text-sage transition-colors hover:text-ember"
                  >
                    {h.name} — {h.tagline.toLowerCase()}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/rezervace"
                  className="text-[15px] text-sage transition-colors hover:text-ember"
                >
                  Rezervace termínu
                </Link>
              </li>
              <li>
                <Link
                  href="/darkovy-poukaz"
                  className="text-[15px] text-sage transition-colors hover:text-ember"
                >
                  Dárkový poukaz
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Informace">
            <p className="kicker mb-4 text-linen/50">Na webu</p>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[15px] text-sage transition-colors hover:text-ember"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="kicker mb-4 text-linen/50">Kontakt</p>
            <ul className="space-y-2.5 text-[15px] text-sage">
              <li>
                <a href={`mailto:${SITE.email}`} className="transition-colors hover:text-ember">
                  {SITE.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${SITE.phone.replace(/\s/g, "")}`}
                  className="transition-colors hover:text-ember"
                >
                  {SITE.phone}
                </a>
              </li>
              <li>
                <a
                  href={SITE.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-ember"
                >
                  Instagram
                </a>
              </li>
              <li className="pt-1 text-[13px] text-sage/80">
                {SITE.region} · přesnou polohu
                <br />
                posíláme s rezervací
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-linen/8 pt-7 text-[13px] text-sage/80 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {SITE.name} · {SITE.domain}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-linen">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Vodoznak */}
      <div
        className="font-display pointer-events-none select-none whitespace-nowrap text-center text-[21vw] font-medium leading-[0.72] tracking-tight text-linen/[0.035]"
        aria-hidden="true"
      >
        sedmý les
      </div>
    </footer>
  );
}
