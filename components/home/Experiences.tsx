import Reveal from "@/components/Reveal";
import { Kicker } from "@/components/ui";
import { EXPERIENCES } from "@/lib/content";

/** Kapitola III — světlá sekce, co tu hosté najdou. */
export default function Experiences() {
  return (
    <section className="grain relative overflow-hidden bg-mist py-24 text-night md:py-32">
      <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <Kicker tone="light">Kapitola III · Co tu najdete</Kicker>
        </Reveal>
        <Reveal i={1} as="h2" className="font-display mt-6 max-w-3xl text-4xl md:text-6xl">
          Šest věcí, které{" "}
          <span className="font-light italic text-ember-deep">ve městě nekoupíte.</span>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {EXPERIENCES.map((exp, i) => (
            <Reveal key={exp.title} i={i} className="h-full">
              <article className="group h-full rounded-[28px] border border-night/10 p-7 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-ember-deep/40 md:p-8">
                <span className="font-display text-base italic text-ember-deep">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display mt-7 text-xl">{exp.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-night/60">{exp.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
