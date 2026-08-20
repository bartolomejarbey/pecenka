import Image from "next/image";
import type { House } from "@/lib/content";
import { Kicker } from "@/components/ui";

/**
 * Celostránkové hero detailu domku. Server komponenta — vstupní animace jede
 * přes CSS, fotka se vykreslí rovnou (dřív ji Ken Burns zoom držel v pohybu
 * první 2,4 s, což na Safari zdržovalo LCP).
 */
export default function HouseHero({ house }: { house: House }) {
  const chips = [house.capacity, house.area, house.beds];

  return (
    <section className="grain relative h-[85vh] min-h-[560px] overflow-hidden bg-night">
      <div className="photo-frame absolute inset-0">
        <Image
          src={house.photo}
          alt={house.photoAlt}
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover"
        />
      </div>

      {/* Přechody do tmy — čitelnost navigace i titulku */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-night/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-night via-night/45 to-transparent" />

      {/* Obsah dole vlevo */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto max-w-7xl px-5 pb-12 md:px-8 md:pb-16">
          <div className="rise-in">
            <Kicker>{house.tagline}</Kicker>
          </div>

          <h1
            className="display-hero rise-in mt-5 text-6xl text-linen md:text-8xl"
            style={{ "--rise-i": 1 } as React.CSSProperties}
          >
            {house.name}
          </h1>

          <ul
            className="rise-in mt-7 flex flex-wrap gap-2.5"
            style={{ "--rise-i": 2 } as React.CSSProperties}
            aria-label="Základní parametry domku"
          >
            {chips.map((chip) => (
              <li
                key={chip}
                className="rounded-full border border-linen/20 bg-night/60 px-4 py-1.5 text-[13px] font-medium text-linen"
              >
                {chip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
