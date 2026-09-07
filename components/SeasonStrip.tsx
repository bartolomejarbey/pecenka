import type { ComponentType } from "react";
import Reveal from "@/components/Reveal";
import { Kicker } from "@/components/ui";
import { SEASONS } from "@/lib/content";

type IconProps = { className?: string };

/** Jaro — pučící výhonek. */
function SproutIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 21v-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M12 12C12 9 9.5 6.5 5.5 6.5 5.5 10 8 12 12 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 13.5C12 11 14 9 17.5 9 17.5 12 15 13.5 12 13.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Léto — slunce. */
function SunIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2.5v2.5M12 19v2.5M2.5 12h2.5M19 12h2.5M5.2 5.2l1.8 1.8M17 17l1.8 1.8M18.8 5.2L17 7M7 17l-1.8 1.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Podzim — padající list. */
function LeafIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M19 5C11 5 5 9 5 16c0 1.4.4 2.6.9 3.6C12 19 19 13 19 5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M5.9 19.6L13 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Zima — vločka. */
function SnowflakeIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2L3.8 16.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12 6l-2 2M12 6l2 2M12 18l-2-2M12 18l2-2M5.7 8.5l.3 2.8M5.7 8.5l2.7-.7M18.3 15.5l-.3-2.8M18.3 15.5l-2.7.7M5.7 15.5l2.7.7M5.7 15.5l-.3-2.8M18.3 8.5l-2.7-.7M18.3 8.5l.3 2.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ICONS: ComponentType<IconProps>[] = [SproutIcon, SunIcon, LeafIcon, SnowflakeIcon];

/** Kapitola · Roční období — celoroční nálada lesa ve čtyřech kartách. */
export default function SeasonStrip() {
  return (
    <section className="grain relative overflow-hidden bg-night py-20 md:py-26">
      <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <Kicker>Kapitola · Roční období</Kicker>
        </Reveal>
        <Reveal i={1} as="h2" className="font-display mt-6 max-w-2xl text-4xl text-linen md:text-6xl">
          Celý rok <span className="accent-italic">jinak.</span>
        </Reveal>

        {/* Na telefonu vodorovný pás — viz komentář v Experiences. */}
        <div className="-mx-5 mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:gap-5 md:grid-cols-4 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
          {SEASONS.map((season, i) => {
            const Icon = ICONS[i];
            return (
              <Reveal key={season.name} i={i} className="h-full w-[76vw] shrink-0 snap-center md:w-auto md:shrink">
                <article className="flex h-full flex-col rounded-[28px] border border-linen/8 bg-pine p-7 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-ember/30 md:p-8">
                  <Icon className="h-6 w-6 text-ember" />
                  <h3 className="font-display mt-6 text-xl text-linen">{season.name}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-sage">{season.desc}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
