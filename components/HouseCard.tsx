"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import type { House } from "@/lib/content";
import { formatPrice } from "@/lib/booking";
import { PRICING } from "@/lib/content";
import { ArrowIcon } from "./ui";

/** Karta domku — homepage i přehled /domky. */
export default function HouseCard({ house, index = 0 }: { house: House; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 44 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.9, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/domky/${house.slug}`}
        className="group block overflow-hidden rounded-[28px] border border-linen/8 bg-pine transition-colors duration-500 hover:border-ember/30"
      >
        <div className="photo-frame relative aspect-[4/3] overflow-hidden">
          <Image
            src={house.photo}
            alt={house.photoAlt}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.045]"
          />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-night/80 to-transparent" />
          <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between">
            <h3 className="font-display text-4xl font-light text-linen md:text-5xl">
              {house.name}
            </h3>
            <span className="rounded-full border border-linen/20 bg-night/50 px-4 py-1.5 text-[13px] font-medium text-linen backdrop-blur-md">
              {house.capacity}
            </span>
          </div>
        </div>
        <div className="p-6 md:p-8">
          <p className="kicker text-ember">{house.tagline}</p>
          <p className="mt-4 text-[15.5px] leading-relaxed text-sage">{house.story}</p>
          <div className="mt-6 flex items-center justify-between border-t border-linen/8 pt-5">
            <p className="text-sm text-sage">
              od{" "}
              <span className="font-display text-xl text-linen">
                {formatPrice(PRICING.baseNight)}
              </span>{" "}
              / noc
            </p>
            <span className="flex items-center gap-2 text-sm font-semibold text-ember transition-transform duration-300 group-hover:translate-x-1">
              Prohlédnout domek <ArrowIcon />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
