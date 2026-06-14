import type { House } from "@/lib/content";
import Reveal from "@/components/Reveal";
import { Kicker } from "@/components/ui";

/** Velké okno do lesa — rám s paprsky světla. */
function WindowGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="30" y="24" width="60" height="72" rx="2" />
      <path d="M60 24v72" opacity="0.6" />
      <path d="M30 60h60" opacity="0.6" />
      <path d="M96 18l16-8" opacity="0.4" />
      <path d="M100 36l18-2" opacity="0.4" />
      <path d="M96 54l16 4" opacity="0.4" />
    </svg>
  );
}

/** Stínicí žaluziová stěna — vodorovné lamely. */
function LouvreGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M24 30h72" />
      <path d="M24 44h72" opacity="0.85" />
      <path d="M24 58h72" opacity="0.7" />
      <path d="M24 72h72" opacity="0.55" />
      <path d="M24 86h72" opacity="0.4" />
    </svg>
  );
}

/** Kapitola II · Rituál — signature prvek domku ve zvláštní kartě. */
export default function Signature({ house }: { house: House }) {
  const Glyph = house.slug === "achat" ? WindowGlyph : LouvreGlyph;

  return (
    <section className="grain relative overflow-hidden bg-bark py-24 md:py-32">
      <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <Kicker>Kapitola II · Rituál</Kicker>
        </Reveal>

        <Reveal i={1}>
          <div className="contours relative mt-10 overflow-hidden rounded-[28px] border border-linen/8 bg-pine p-10 md:p-14">
            <Glyph className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 text-ember opacity-30 md:-right-4 md:top-1/2 md:h-64 md:w-64 md:-translate-y-1/2" />

            <div className="relative max-w-xl">
              <p className="kicker text-ember">Patří jen vám</p>
              <h2 className="font-display mt-5 text-3xl text-linen md:text-4xl">
                {house.signature.title}
              </h2>
              <p className="mt-5 text-[16px] leading-relaxed text-sage">{house.signature.desc}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
