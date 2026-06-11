import Image from "next/image";
import Link from "next/link";
import type { House } from "@/lib/content";
import Reveal from "@/components/Reveal";
import { ArrowIcon, Kicker } from "@/components/ui";

/** Cross-sell pás — kompaktní horizontální karta druhého domku. */
export default function OtherHouse({ house }: { house: House }) {
  return (
    <section className="grain relative overflow-hidden border-t border-linen/8 bg-night py-20 md:py-24">
      <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <Kicker>A co ten druhý?</Kicker>
        </Reveal>

        <Reveal i={1}>
          <Link
            href={`/domky/${house.slug}`}
            className="group mt-8 grid overflow-hidden rounded-[28px] border border-linen/8 bg-pine transition-colors duration-500 hover:border-ember/30 sm:grid-cols-[280px_1fr] md:grid-cols-[340px_1fr]"
          >
            <div className="photo-frame relative aspect-[4/3] overflow-hidden sm:aspect-auto sm:h-full sm:min-h-[210px]">
              <Image
                src={house.photo}
                alt={house.photoAlt}
                fill
                sizes="(max-width: 640px) 100vw, 340px"
                className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.045]"
              />
              <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-pine/70 to-transparent sm:block" />
            </div>

            <div className="flex flex-col justify-center gap-3 p-7 md:p-10">
              <p className="kicker text-ember">{house.tagline}</p>
              <h2 className="font-display text-3xl text-linen md:text-4xl">{house.name}</h2>
              <p className="max-w-xl text-[15px] leading-relaxed text-sage">{house.story}</p>
              <span className="mt-3 flex items-center gap-2 text-sm font-semibold text-ember transition-transform duration-300 group-hover:translate-x-1">
                Prohlédnout {house.slug === "zula" ? "Žulu" : "Mech"} <ArrowIcon />
              </span>
            </div>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
