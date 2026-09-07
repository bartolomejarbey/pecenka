"use client";

import Image from "next/image";
import { HOUSES } from "@/lib/content";
import { formatHalere, type HouseSlug } from "@/lib/booking";
import { CheckIcon } from "./Steps";

export type DostupnostDomku = { volno: boolean; cena: number | null; noci: number };

/**
 * Krok 1 — výběr domku.
 *
 * Když host přišel s termínem, karta říká rovnou „volno · 3 noci · 8 970 Kč"
 * nebo „obsazeno". Obsazený domek se dá pořád vybrat — termín jde ve druhém
 * kroku změnit — jen se netváří jako nabídka.
 */
export default function HouseStep({
  selected,
  onSelect,
  dostupnost = null,
}: {
  selected: HouseSlug | null;
  onSelect: (slug: HouseSlug) => void;
  dostupnost?: Partial<Record<HouseSlug, DostupnostDomku>> | null;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {HOUSES.map((house) => {
        const active = selected === house.slug;
        const d = dostupnost?.[house.slug] ?? null;
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
            } ${d && !d.volno ? "opacity-70" : ""}`}
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
                <span className="rounded-full border border-linen/20 bg-night/75 px-3.5 py-1 text-[12.5px] font-medium text-linen">
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

              {d && (
                <span
                  className={`mt-4 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-[14px] ${
                    d.volno
                      ? "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-200"
                      : "border-linen/12 bg-linen/[0.04] text-sage"
                  }`}
                >
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${d.volno ? "bg-emerald-400" : "bg-linen/30"}`}
                      aria-hidden="true"
                    />
                    {d.volno
                      ? `Volno · ${d.noci} ${d.noci === 1 ? "noc" : d.noci < 5 ? "noci" : "nocí"}`
                      : "V tomhle termínu obsazeno"}
                  </span>
                  {d.volno && d.cena !== null && (
                    <span className="font-display whitespace-nowrap text-[17px] text-linen">
                      {formatHalere(d.cena)}
                    </span>
                  )}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
