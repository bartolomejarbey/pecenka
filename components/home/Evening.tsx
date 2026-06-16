"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Reveal from "@/components/Reveal";
import { Kicker } from "@/components/ui";

/** Kapitola IV — celostránkové foto s paralaxou a citátem. */
export default function Evening() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const rawY = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);
  const y = reduced ? "0%" : rawY;

  return (
    <section
      ref={ref}
      className="grain relative flex h-[70vh] min-h-[540px] items-center justify-center overflow-hidden bg-night"
    >
      <div className="photo-frame absolute inset-0">
        {/* Vrstva s fotkou je vyšší než sekce — paralaxa má kam jet */}
        <motion.div style={{ y }} className="absolute inset-x-0 -top-[15%] h-[130%]">
          <Image
            src="/foto/ohniste-vecer.jpg"
            alt="Ohniště na dřevěné terase před černým domkem za večera"
            fill
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>
        <div className="absolute inset-0 bg-night/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-transparent to-night/60" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-5 text-center md:px-8">
        <Reveal>
          <Kicker className="justify-center">Kapitola IV · Večer</Kicker>
        </Reveal>
        <Reveal i={1}>
          <blockquote>
            <p
              className="font-display mt-8 text-3xl font-light italic text-linen md:text-5xl"
              style={{ lineHeight: 1.2 }}
            >
              „Večer nalijete víno, rozsvítí se jediné okno uprostřed lesa a
              svět se zmenší na pár tichých metrů čtverečních.“
            </p>
          </blockquote>
        </Reveal>
      </div>
    </section>
  );
}
