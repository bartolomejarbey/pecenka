import Link from "next/link";
import Reveal from "@/components/Reveal";
import HouseCard from "@/components/HouseCard";
import { ArrowIcon, Kicker } from "@/components/ui";
import { HOUSES } from "@/lib/content";

/** Kapitola II — Achát a Mech. */
export default function Houses() {
  return (
    <section id="domky" className="grain relative overflow-hidden bg-night py-24 md:py-32">
      <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <Kicker>Kapitola II · Dva domky</Kicker>
        </Reveal>
        <Reveal i={1} as="h2" className="font-display mt-6 max-w-3xl text-4xl text-linen md:text-6xl">
          Dva domky. <span className="accent-italic">Každý jiná pohádka.</span>
        </Reveal>
        <Reveal i={2} as="p" className="mt-7 max-w-xl text-[16px] leading-relaxed text-sage">
          Achát má prosklenou stěnu tři krát tři metry s výhledem rovnou do
          lesa. Mech má navíc dřevěnou žaluziovou clonu, za kterou zmizíte světu
          z očí. Oba jsou pro dva — a dají se spojit v jeden celek pro čtyři.
        </Reveal>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          {HOUSES.map((house, i) => (
            <HouseCard key={house.slug} house={house} index={i} />
          ))}
        </div>

        <Reveal className="mt-12 text-center">
          <Link
            href="/cenik"
            className="group inline-flex items-center gap-2 text-[15px] font-semibold text-linen/75 transition-colors duration-300 hover:text-ember"
          >
            Kompletní ceník
            <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
