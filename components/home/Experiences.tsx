import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { ArrowIcon, Kicker } from "@/components/ui";
import { EXPERIENCES } from "@/lib/content";

/**
 * Kapitola III — světlá sekce, co tu hosté najdou. Každá karta má fotku:
 * lom z dronu, domek za soumraku a tři místa v okolí z Wikimedia Commons
 * (autor a licence přes roh fotky, jak licence žádají).
 *
 * Karta není odkaz. Odkaz je jen titulek, roztažený pseudoprvkem přes celou
 * kartu — popisek autora je taky odkaz a odkaz v odkazu prohlížeč rozloží
 * jinak než server (hydratace pak padá).
 */
export default function Experiences() {
  return (
    <section className="obloha relative overflow-hidden py-24 text-night md:py-32">
      <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <Kicker tone="light">Kapitola III · Co tu najdete</Kicker>
        </Reveal>
        <Reveal i={1} as="h2" className="font-display mt-6 max-w-3xl text-4xl md:text-6xl">
          Šest věcí, které{" "}
          <span className="font-light italic text-ember-deep">ve městě nekoupíte.</span>
        </Reveal>

        {/*
          * Na telefonu vodorovně, ne pod sebou — šest karet s fotkou pod sebou
          * by byla desítka obrazovek. Vodorovný pás se snapem listuje palcem.
          */}
        <div className="-mx-5 mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 sm:grid-cols-2 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
          {EXPERIENCES.map((exp, i) => (
            <Reveal key={exp.title} i={i} className="h-full w-[82vw] shrink-0 snap-center sm:w-auto sm:shrink">
              <article className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-night/10 bg-cloud transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-ember-deep/40">
                <div className="relative aspect-[4/3] overflow-hidden bg-mist-dim">
                  <Image
                    src={exp.photo}
                    alt={exp.photoAlt}
                    fill
                    sizes="(max-width: 640px) 82vw, (max-width: 1024px) 50vw, 400px"
                    className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                  />
                  <span className="font-display absolute left-4 top-4 rounded-full bg-night/70 px-2.5 py-1 text-sm italic text-ember backdrop-blur-sm">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {exp.credit && (
                    <a
                      href={exp.credit.zdroj}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 z-20 inline-flex min-h-6 items-center rounded-full bg-night/65 px-2.5 text-[10px] leading-none text-linen/80 backdrop-blur-sm hover:text-linen"
                      title={`${exp.credit.autor}, ${exp.credit.licence}, Wikimedia Commons`}
                    >
                      © {exp.credit.autor} · {exp.credit.licence}
                    </a>
                  )}
                </div>
                <div className="p-6 md:p-7">
                  <h3 className="font-display text-xl md:text-2xl">
                    {exp.href ? (
                      <Link href={exp.href} className="after:absolute after:inset-0 after:content-['']">
                        {exp.title}
                      </Link>
                    ) : (
                      exp.title
                    )}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-night/60">{exp.desc}</p>
                  {exp.href && (
                    <span className="mt-4 inline-flex items-center gap-2 text-[14px] font-semibold text-ember-deep" aria-hidden="true">
                      Víc
                      <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
