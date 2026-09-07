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

        {/*
          * Na telefonu vodorovně, ne pod sebou.
          *
          * Šest karet pod sebou je šest obrazovek rolování a úvodní stránka
          * jich měla osmadvacet. Vodorovný pás se snapem je zvyk z každé
          * aplikace, palcem se listuje pohodlně a pořád je vidět, že je
          * karet víc — další kouká zprava.
          */}
        <div className="-mx-5 mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 sm:grid-cols-2 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
          {EXPERIENCES.map((exp, i) => (
            <Reveal key={exp.title} i={i} className="h-full w-[82vw] shrink-0 snap-center sm:w-auto sm:shrink">
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
