"use client";

import Image from "next/image";
import { motion } from "motion/react";
import Reveal from "./Reveal";
import { Button, Kicker } from "./ui";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Závěrečná výzva — používá se na konci většiny stránek. */
export default function CtaBanner({
  title = "Les už na vás čeká.",
  accent = "Ticho taky.",
  text = "Vyberte si domek, zvolte termín a my se postaráme o zbytek. Nachystané dřevo do ohniště, čistá voda lomu a nebe plné hvězd.",
}: {
  title?: string;
  accent?: string;
  text?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-night">
      <div className="photo-frame absolute inset-0">
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.08 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 6, ease: EASE }}
        >
          <Image
            src="/foto/lom-rano.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-35"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/70 to-night/40" />
      </div>
      <div className="grain relative z-10 mx-auto max-w-7xl px-5 py-24 text-center md:px-8 md:py-36">
        <Reveal>
          <Kicker className="justify-center">Poslední kapitola je vaše</Kicker>
        </Reveal>
        <Reveal i={1}>
          <h2 className="display-hero mx-auto mt-6 max-w-3xl text-4xl text-linen md:text-6xl">
            {title} <span className="accent-italic">{accent}</span>
          </h2>
        </Reveal>
        <Reveal i={2}>
          <p className="mx-auto mt-6 max-w-lg text-[17px] leading-relaxed text-sage">{text}</p>
        </Reveal>
        <Reveal i={3}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button href="/rezervace">Rezervovat termín</Button>
            <Button href="/domky" variant="outline">
              Prohlédnout domky
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
