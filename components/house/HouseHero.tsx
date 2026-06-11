"use client";

import Image from "next/image";
import { motion } from "motion/react";
import type { House } from "@/lib/content";
import { Kicker } from "@/components/ui";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Celostránkové hero detailu domku — pomalý Ken Burns, jméno přes fotku. */
export default function HouseHero({ house }: { house: House }) {
  const chips = [house.capacity, house.area, house.beds];

  return (
    <section className="grain relative h-[85vh] min-h-[560px] overflow-hidden bg-night">
      {/* Fotka s pomalým zoomem */}
      <motion.div
        className="photo-frame absolute inset-0"
        initial={{ scale: 1.14 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.4, ease: EASE }}
      >
        <Image
          src={house.photo}
          alt={house.photoAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>

      {/* Přechody do tmy — čitelnost navigace i titulku */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-night/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-night via-night/45 to-transparent" />

      {/* Obsah dole vlevo */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto max-w-7xl px-5 pb-12 md:px-8 md:pb-16">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.25, ease: EASE }}
          >
            <Kicker>{house.tagline}</Kicker>
          </motion.div>

          <motion.h1
            className="display-hero mt-5 text-6xl text-linen md:text-8xl"
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: EASE }}
          >
            {house.name}
          </motion.h1>

          <motion.ul
            className="mt-7 flex flex-wrap gap-2.5"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
            aria-label="Základní parametry domku"
          >
            {chips.map((chip) => (
              <li
                key={chip}
                className="rounded-full border border-linen/20 bg-night/40 px-4 py-1.5 text-[13px] font-medium text-linen backdrop-blur-md"
              >
                {chip}
              </li>
            ))}
          </motion.ul>
        </div>
      </div>
    </section>
  );
}
