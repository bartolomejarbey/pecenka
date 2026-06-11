import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import CtaBanner from "@/components/CtaBanner";
import Reveal from "@/components/Reveal";
import { Kicker, LogoMark } from "@/components/ui";
import { LOCATION } from "@/lib/content";

export const metadata: Metadata = {
  title: "Lokalita",
  description:
    "Sedmý les leží na severu středních Čech, na samotě u zatopeného žulového lomu. Přesné souřadnice posíláme s potvrzenou rezervací — z Prahy do hodiny autem.",
};

/** Kompasová růžice — dekorace mapy, sever žhne ember. */
function CompassRose({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <circle cx="32" cy="32" r="21" stroke="currentColor" strokeWidth="0.8" opacity="0.22" />
      <path d="M32 8 L35.5 32 L32 56 L28.5 32 Z" fill="currentColor" opacity="0.35" />
      <path d="M8 32 L32 28.5 L56 32 L32 35.5 Z" fill="currentColor" opacity="0.22" />
      <path d="M32 8 L35.5 32 H28.5 Z" fill="var(--color-ember)" opacity="0.9" />
      <circle cx="32" cy="32" r="2.2" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Souřadnice a video s cestou",
    desc: "Den před příjezdem vám pošleme přesné souřadnice a krátké video posledních kilometrů. Nezabloudíte — a kouzlo místa zůstane jen vaše.",
  },
  {
    n: "02",
    title: "Poslední dva kilometry lesem",
    desc: "K domkům vede zpevněná lesní cesta. V zimě ji protahujeme; stačí běžné zimní pneumatiky a chuť dojet až na konec mapy.",
  },
  {
    n: "03",
    title: "Parkování přímo u domku",
    desc: "Auto necháte pár kroků od dveří. Pak už jen kufr, klíč ze schránky a první nádech lesního vzduchu.",
  },
];

export default function LokalitaPage() {
  return (
    <main>
      <PageHero
        kicker="Lokalita"
        title="Kde přesně? To je"
        accent="tajemství."
        lead={`${LOCATION.secretNote} Prozradíme jen tolik: sever středních Čech, žulový lom a kolem dokola les.`}
      />

      {/* ===== Kapitola I · Mapa ===== */}
      <section className="grain relative overflow-hidden bg-night pb-24 md:pb-32">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <Kicker>Kapitola I · Mapa</Kicker>
          </Reveal>
          <Reveal i={1}>
            <h2 className="font-display mt-6 max-w-2xl text-4xl text-linen md:text-6xl">
              Mapa, která <span className="accent-italic">mlčí.</span>
            </h2>
          </Reveal>

          <Reveal i={2} className="mt-12 md:mt-16">
            <div className="contours relative h-[420px] overflow-hidden rounded-[34px] border border-linen/8 bg-pine">
              {/* Kompas v rohu */}
              <CompassRose className="absolute right-7 top-7 h-14 w-14 text-sage md:right-10 md:top-10 md:h-20 md:w-20" />

              {/* „tady někde" — žhnoucí bod mimo střed */}
              <div className="absolute left-[16%] top-[64%] flex items-center gap-3 md:left-[22%]">
                <span className="relative flex h-3 w-3" aria-hidden="true">
                  <span className="animate-ember absolute -inset-1.5 rounded-full bg-ember/40 blur-[6px]" />
                  <span className="animate-ember relative h-3 w-3 rounded-full bg-ember" />
                </span>
                <span className="font-display text-sm italic text-sage">tady někde</span>
              </div>

              {/* Střed mapy */}
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <LogoMark className="h-7 w-auto text-sage" />
                <p className="font-display mt-6 text-2xl text-linen md:text-3xl">
                  50.?° N, 14.?° E
                </p>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-sage">
                  Souřadnice dostanete s potvrzenou rezervací.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Kapitola II · Vzdálenosti ===== */}
      <section className="grain relative overflow-hidden bg-bark py-24 md:py-32">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <Kicker>Kapitola II · Vzdálenosti</Kicker>
          </Reveal>
          <Reveal i={1}>
            <h2 className="font-display mt-6 max-w-2xl text-4xl text-linen md:text-6xl">
              Daleko od všeho. <span className="accent-italic">Blízko autem.</span>
            </h2>
          </Reveal>

          <div className="mt-12 max-w-3xl md:mt-16">
            {LOCATION.distances.map((d, i) => (
              <Reveal key={d.place} i={i} as="div">
                <div className="flex items-baseline justify-between gap-6 border-b border-linen/8 py-5 md:py-6">
                  <span className="text-[15.5px] text-sage">{d.place}</span>
                  <span className="font-display whitespace-nowrap text-lg text-linen md:text-xl">
                    {d.time}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Kapitola III · Okolí (světlá) ===== */}
      <section className="grain relative overflow-hidden bg-mist py-24 text-night md:py-32">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <Kicker tone="light">Kapitola III · Okolí</Kicker>
          </Reveal>
          <Reveal i={1}>
            <h2 className="font-display mt-6 max-w-2xl text-4xl md:text-6xl">
              Co najdete, když{" "}
              <span className="font-display italic text-ember-deep">vyjdete ven.</span>
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-5 md:mt-16 md:grid-cols-2 md:gap-6">
            {LOCATION.around.map((a, i) => (
              <Reveal key={a.title} i={i}>
                <div className="h-full rounded-[28px] border border-night/10 bg-linen p-8 transition-colors duration-300 hover:border-ember-deep/40 md:p-10">
                  <h3 className="font-display text-2xl">{a.title}</h3>
                  <p className="mt-4 leading-relaxed text-night/60">{a.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Kapitola IV · Jak k nám ===== */}
      <section className="grain contours relative overflow-hidden bg-night py-24 md:py-32">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <Kicker>Kapitola IV · Cesta</Kicker>
          </Reveal>
          <Reveal i={1}>
            <h2 className="font-display mt-6 max-w-2xl text-4xl text-linen md:text-6xl">
              Jak <span className="accent-italic">k nám.</span>
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-10 md:mt-16 md:grid-cols-3 md:gap-8">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} i={i}>
                <div className="border-t border-linen/10 pt-7">
                  <span className="font-display text-3xl italic text-ember">{s.n}</span>
                  <h3 className="font-display mt-5 text-xl text-linen md:text-2xl">{s.title}</h3>
                  <p className="mt-4 text-[15.5px] leading-relaxed text-sage">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
