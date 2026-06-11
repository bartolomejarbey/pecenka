import type { House } from "@/lib/content";
import Reveal from "@/components/Reveal";
import { Kicker } from "@/components/ui";

/** Kapitola III · Vybavení — světlá sekce s dvouřadým checklistem. */
export default function Amenities({ house }: { house: House }) {
  return (
    <section className="grain relative overflow-hidden bg-mist py-24 text-night md:py-32">
      <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <Kicker tone="light">Kapitola III · Vybavení</Kicker>
        </Reveal>

        <Reveal i={1}>
          <h2 className="font-display mt-6 max-w-2xl text-4xl text-night md:text-5xl">
            Všechno připravené.{" "}
            <span className="font-display italic text-ember-deep">Stačí přijet.</span>
          </h2>
        </Reveal>

        <ul className="mt-12 grid gap-x-12 gap-y-4 md:mt-16 md:grid-cols-2">
          {house.amenities.map((item, i) => (
            <Reveal
              key={item}
              as="li"
              i={i % 2}
              className="flex items-start gap-4 border-b border-night/10 pb-4"
            >
              <span
                className="mt-[7px] inline-block h-2 w-2 shrink-0 rotate-45 bg-ember-deep"
                aria-hidden="true"
              />
              <span className="text-[15.5px] leading-relaxed text-night/70">{item}</span>
            </Reveal>
          ))}
        </ul>

        <Reveal i={2}>
          <p className="mt-10 max-w-xl text-sm leading-relaxed text-night/50">
            V ceně každého pobytu: povlečení, ručníky, župany, výběrová káva, dřevo do kamen
            a závěrečný úklid.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
