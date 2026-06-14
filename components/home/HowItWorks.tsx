import Reveal from "@/components/Reveal";
import { Kicker } from "@/components/ui";

const STEPS = [
  {
    n: "01",
    title: "Vyberete domek a termín",
    desc: "Achát, nebo Mech? Kalendář vám ukáže volné noci a cenu spočítá za vás. Rezervace je nezávazná poptávka.",
  },
  {
    n: "02",
    title: "Do 24 hodin potvrdíme",
    desc: "Ozveme se s potvrzením a pošleme platební údaje. Den před příjezdem dostanete přesné souřadnice a kód od schránky s klíčem.",
  },
  {
    n: "03",
    title: "Přijedete do ticha",
    desc: "Vytopený domek, nachystané dřevo do ohniště, klíč ve schránce. Zbytek pohádky už píšete sami.",
  },
];

/** Kapitola V — tři kroky rezervace. */
export default function HowItWorks() {
  return (
    <section className="grain relative overflow-hidden bg-bark py-24 md:py-32">
      <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <Kicker>Kapitola V · Jak to funguje</Kicker>
        </Reveal>
        <Reveal i={1} as="h2" className="font-display mt-6 max-w-2xl text-4xl text-linen md:text-6xl">
          Tři kroky <span className="accent-italic">a jste v lese.</span>
        </Reveal>

        <div className="relative mt-16">
          {/* Spojnice kroků na desktopu */}
          <div
            className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-linen/15 to-transparent md:block"
            aria-hidden="true"
          />
          <ol className="grid gap-12 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} i={i} as="li">
                <span className="font-display relative z-10 inline-block bg-bark pr-5 text-5xl font-light text-ember md:text-6xl">
                  {step.n}
                </span>
                <h3 className="mt-6 text-xl font-semibold text-linen">{step.title}</h3>
                <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-sage">
                  {step.desc}
                </p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
