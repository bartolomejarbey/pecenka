"use client";

import Image from "next/image";
import { HOUSES } from "@/lib/content";
import type { HouseSlug } from "@/lib/booking";
import { CheckIcon } from "./Steps";

/** Krok 1 — výběr domku. */
export default function HouseStep({
  selected,
  onSelect,
}: {
  selected: HouseSlug | null;
  onSelect: (slug: HouseSlug) => void;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {HOUSES.map((house) => {
        const active = selected === house.slug;
        return (
          <button
            key={house.slug}
            type="button"
            onClick={() => onSelect(house.slug)}
            aria-pressed={active}
            className={`group relative overflow-hidden rounded-[28px] border bg-pine text-left transition-all duration-300 ${
              active
                ? "border-transparent ring-2 ring-ember"
                : "border-linen/8 hover:border-ember/30"
            }`}
          >
            <span
              className={`absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ember text-night shadow-[0_10px_30px_-8px_rgba(217,145,78,0.7)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                active ? "scale-100" : "scale-0"
              }`}
              aria-hidden="true"
            >
              <CheckIcon className="h-4.5 w-4.5" />
            </span>

            <span className="photo-frame relative block aspect-[16/10] overflow-hidden">
              <Image
                src={house.photo}
                alt={house.photoAlt}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.045]"
              />
              <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-night/85 to-transparent" />
              <span className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3">
                <span className="font-display text-3xl font-light text-linen md:text-4xl">
                  {house.name}
                </span>
                <span className="rounded-full border border-linen/20 bg-night/50 px-3.5 py-1 text-[12.5px] font-medium text-linen backdrop-blur-md">
                  {house.capacity}
                </span>
              </span>
            </span>

            <span className="block p-5 md:p-6">
              <span className="kicker block text-ember">{house.tagline}</span>
              <span className="mt-3 flex items-center gap-2.5 text-sm text-sage">
                <span className="h-1 w-1 shrink-0 rounded-full bg-ember" aria-hidden="true" />
                {house.signature.title}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
