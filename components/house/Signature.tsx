import type { House } from "@/lib/content";
import { ADDONS } from "@/lib/content";
import { formatPrice } from "@/lib/booking";
import Reveal from "@/components/Reveal";
import { Kicker } from "@/components/ui";

/** Stylizovaná pára ze sauny — tři vlnité tahy. */
function SteamGlyph({ className }: { className?: string }) {
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
      <path d="M32 106c-11-17 11-27 0-44s11-27 0-44" />
      <path d="M60 112c-11-17 11-27 0-44s11-27 0-44" />
      <path d="M88 106c-11-17 11-27 0-44s11-27 0-44" />
    </svg>
  );
}

/** Kruhy na hladině — koupací sud pod hvězdami. */
function RippleGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      className={className}
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="12" />
      <circle cx="60" cy="60" r="27" opacity="0.75" />
      <circle cx="60" cy="60" r="42" opacity="0.5" />
      <circle cx="60" cy="60" r="56" opacity="0.3" />
    </svg>
  );
}

/** Kapitola II · Rituál — signature zážitek domku ve zvláštní kartě. */
export default function Signature({ house }: { house: House }) {
  const ritualAddon = ADDONS.find((a) => a.id === "sauna");
  const Glyph = house.slug === "zula" ? SteamGlyph : RippleGlyph;

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
              {ritualAddon && (
                <p className="mt-8 border-t border-linen/8 pt-5 text-sm text-sage/80">
                  Vytopíme před vaším příjezdem i každý den pobytu —{" "}
                  <span className="text-linen">{formatPrice(ritualAddon.price)}</span>{" "}
                  {ritualAddon.unit}.
                </p>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
