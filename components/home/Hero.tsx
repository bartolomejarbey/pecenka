"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { ArrowIcon, Button, Kicker } from "@/components/ui";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Vstupní animace — jemný fade-up se zpožděním. */
const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 1, delay, ease: EASE },
});

/** Světlušky — deterministické pozice kvůli hydrataci.
 *  Drží se v horní polovině a vpravo, aby nepadaly do textu. */
const FIREFLIES = [
  { left: "9%", top: "16%", delay: "0s" },
  { left: "22%", top: "10%", delay: "2.2s" },
  { left: "34%", top: "20%", delay: "4.5s" },
  { left: "47%", top: "12%", delay: "6.4s" },
  { left: "61%", top: "24%", delay: "1.3s" },
  { left: "72%", top: "14%", delay: "3.4s" },
  { left: "83%", top: "28%", delay: "5.5s" },
  { left: "92%", top: "18%", delay: "2.8s" },
];

const TRUST = [
  "Celoroční provoz",
  "Sauna a koupací sud",
  "Pes vítán",
  "Do 90 minut z Prahy i Brna",
];

export default function Hero() {
  return (
    <section className="grain relative flex min-h-svh flex-col justify-end overflow-hidden bg-night">
      {/* Fotka s pomalým Ken Burns zoomem */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.6, ease: EASE }}
      >
        <Image
          src="/foto/tiny3.jpg"
          alt="Černý tiny house Žula na skále nad zatopeným lomem, nad hladinou se drží mlha"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-night via-night/40 to-night/25" />
      <div className="absolute inset-0 bg-gradient-to-r from-night/65 via-night/10 to-transparent" />

      {/* Světlušky — jen na větších displejích, na mobilu by padaly do textu */}
      <div className="absolute inset-0 hidden md:block" aria-hidden="true">
        {FIREFLIES.map((f) => (
          <span
            key={`${f.left}-${f.top}`}
            className="firefly"
            style={{ left: f.left, top: f.top, animationDelay: f.delay }}
          />
        ))}
      </div>

      {/* Obsah — dole vlevo */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-9 pt-44 md:px-8">
        <motion.div {...fadeUp(0.25)}>
          <Kicker>Pronájem dvou tiny housů u zatopeného lomu</Kicker>
        </motion.div>

        <motion.h1
          {...fadeUp(0.4)}
          className="display-hero mt-6 max-w-4xl text-5xl text-linen md:text-8xl"
        >
          Za sedmero horami,
          <br />
          <span className="accent-italic">v sedmém lese.</span>
        </motion.h1>

        <motion.p
          {...fadeUp(0.55)}
          className="mt-7 max-w-md text-[17px] leading-relaxed text-linen/85"
        >
          Dva černé domky na samotě u zatopeného lomu. Ticho, které uslyšíte.
          Tma, ve které jsou konečně vidět hvězdy.
        </motion.p>

        <motion.div {...fadeUp(0.7)} className="mt-10 flex flex-wrap items-center gap-4">
          <Button href="/rezervace">Rezervovat pobyt</Button>
          <Button href="/domky" variant="outline">
            Prohlédnout domky
          </Button>
        </motion.div>

        {/* Trust strip + scroll hint */}
        <motion.div
          {...fadeUp(0.9)}
          className="mt-14 flex flex-wrap items-center justify-between gap-x-10 gap-y-4 border-t border-linen/15 pt-6"
        >
          <ul className="flex flex-wrap items-center gap-x-7 gap-y-2.5 text-sm text-linen/70">
            {TRUST.map((item, i) => (
              <li key={item} className="flex items-center gap-3">
                {i > 0 && (
                  <span
                    className="inline-block h-1 w-1 rounded-full bg-ember/60"
                    aria-hidden="true"
                  />
                )}
                {item}
              </li>
            ))}
          </ul>
          <div
            className="hidden items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-linen/45 md:flex"
            aria-hidden="true"
          >
            Posuňte níž
            <motion.span
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              className="text-ember"
            >
              <ArrowIcon className="h-3.5 w-3.5 rotate-90" />
            </motion.span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
