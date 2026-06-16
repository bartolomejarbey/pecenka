"use client";

import type { ComponentType } from "react";
import { motion } from "motion/react";
import Reveal from "@/components/Reveal";
import { Kicker } from "@/components/ui";

type StepIconProps = { className?: string };

/** Kalendář — vyberete termín. */
function CalendarIcon({ className = "h-6 w-6" }: StepIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8.5 14l1.5 1.5L13 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Obálka s fajfkou — potvrdíme. */
function EnvelopeCheckIcon({ className = "h-6 w-6" }: StepIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.8 7.5l8.2 6 8.2-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 14.5l1.8 1.8 3.5-3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Klíč — přijedete a odemknete. */
function KeyIcon({ className = "h-6 w-6" }: StepIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 11l8.5 8.5M16.5 16.5l2-2M19 19l2-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STEPS: {
  n: string;
  title: string;
  desc: string;
  Icon: ComponentType<StepIconProps>;
}[] = [
  {
    n: "01",
    title: "Vyberete domek a termín",
    desc: "Achát, nebo Mech? Kalendář vám ukáže volné noci a cenu spočítá za vás. Rezervace je nezávazná poptávka.",
    Icon: CalendarIcon,
  },
  {
    n: "02",
    title: "Do 24 hodin potvrdíme",
    desc: "Ozveme se s potvrzením a pošleme platební údaje. Den před příjezdem dostanete přesné souřadnice a kód od schránky s klíčem.",
    Icon: EnvelopeCheckIcon,
  },
  {
    n: "03",
    title: "Přijedete do ticha",
    desc: "Vytopený domek, nachystané dřevo do ohniště, klíč ve schránce. Zbytek pohádky už píšete sami.",
    Icon: KeyIcon,
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
          {/* Kreslená spojnice kroků na desktopu — naběhne podle scrollu */}
          <svg
            className="absolute left-0 right-0 top-8 hidden h-px w-full overflow-visible text-ember md:block"
            viewBox="0 0 100 1"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
          >
            <motion.path
              d="M0 0.5 H100"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity={0.5}
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>

          <ol className="grid gap-12 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} i={i} as="li">
                <span className="font-display relative z-10 inline-flex items-center gap-3 bg-bark pr-5 text-5xl font-light text-ember md:text-6xl">
                  <step.Icon className="h-6 w-6 shrink-0 text-ember" />
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
