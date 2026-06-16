import type { House } from "@/lib/content";
import Reveal from "@/components/Reveal";
import HouseStats from "@/components/house/HouseStats";
import { Kicker } from "@/components/ui";

/** Kapitola I · Příběh — velký editorial text a dva detailní bloky. */
export default function HouseStory({ house }: { house: House }) {
  return (
    <section className="grain relative overflow-hidden bg-night py-24 md:py-32">
      <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <Kicker>Kapitola I · Příběh</Kicker>
        </Reveal>

        <Reveal i={1}>
          <p className="font-display mt-8 max-w-4xl text-2xl font-light leading-snug text-linen md:text-4xl">
            {house.story}
          </p>
        </Reveal>

        <div className="mt-16 grid gap-10 border-t border-linen/8 pt-12 md:mt-20 md:grid-cols-2 md:gap-14">
          {house.detail.map((block, i) => (
            <Reveal key={block.title} i={i + 2}>
              <h2 className="font-display text-xl text-linen md:text-2xl">{block.title}</h2>
              <p className="mt-4 text-[15.5px] leading-relaxed text-sage">{block.text}</p>
            </Reveal>
          ))}
        </div>

        <HouseStats house={house} />
      </div>
    </section>
  );
}
