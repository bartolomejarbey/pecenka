import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import HouseCard from "@/components/HouseCard";
import CtaBanner from "@/components/CtaBanner";
import Reveal from "@/components/Reveal";
import { Kicker } from "@/components/ui";
import { HOUSES } from "@/lib/content";

export const metadata: Metadata = {
  title: "Domky",
  description:
    "Žula nad zatopeným lomem se saunou, Mech na kraji louky s koupacím sudem. Dva černé tiny housy pro dva (plus dva), celoroční provoz, ticho v ceně.",
};

const zula = HOUSES.find((h) => h.slug === "zula")!;
const mech = HOUSES.find((h) => h.slug === "mech")!;

const COMPARISON: { label: string; zula: string; mech: string }[] = [
  { label: "Kapacita", zula: zula.capacity, mech: mech.capacity },
  { label: "Plocha", zula: zula.area, mech: mech.area },
  { label: "Postele", zula: zula.beds, mech: mech.beds },
  { label: "Rituál", zula: zula.signature.title, mech: mech.signature.title },
  { label: "Výhled", zula: "Hladina zatopeného lomu", mech: "Louka a západy slunce" },
];

export default function DomkyPage() {
  return (
    <main>
      <PageHero
        kicker="Dva domky"
        title="Každý jiná"
        accent="pohádka."
        lead="Žula bydlí na hraně skály nad lomem. Mech na kraji louky, kde končí les. Oba jsou pro dva (plus dva), oba celoroční, každý s vlastním rituálem."
      />

      {/* Karty domků */}
      <section
        className="grain relative overflow-hidden bg-night pb-24 md:pb-32"
        aria-label="Přehled domků"
      >
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <div className="grid gap-6 md:grid-cols-2 md:gap-8">
            {HOUSES.map((house, i) => (
              <HouseCard key={house.slug} house={house} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Srovnání — světlá kapitola */}
      <section className="grain relative overflow-hidden bg-mist py-24 text-night md:py-32">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <Kicker tone="light">Žula, nebo Mech?</Kicker>
          </Reveal>
          <Reveal i={1}>
            <h2 className="font-display mt-6 max-w-2xl text-4xl text-night md:text-5xl">
              Stejné ticho,{" "}
              <span className="font-display italic text-ember-deep">jiný příběh.</span>
            </h2>
          </Reveal>

          <Reveal i={2}>
            <div className="mt-12 md:mt-16">
              {/* Hlavička tabulky */}
              <div className="grid grid-cols-2 gap-x-6 border-b-2 border-night/15 pb-5 md:grid-cols-[180px_1fr_1fr] md:gap-x-10">
                <span className="hidden md:block" aria-hidden="true" />
                <h3 className="font-display text-2xl text-night md:text-3xl">{zula.name}</h3>
                <h3 className="font-display text-2xl text-night md:text-3xl">{mech.name}</h3>
              </div>

              {COMPARISON.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-2 gap-x-6 gap-y-2 border-b border-night/10 py-5 md:grid-cols-[180px_1fr_1fr] md:gap-x-10"
                >
                  <p className="kicker col-span-2 text-night/45 md:col-span-1 md:self-center">
                    {row.label}
                  </p>
                  <p className="font-display text-[17px] leading-snug text-night md:text-lg">
                    {row.zula}
                  </p>
                  <p className="font-display text-[17px] leading-snug text-night md:text-lg">
                    {row.mech}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal i={3}>
            <p className="mt-10 max-w-xl text-[15px] leading-relaxed text-night/60">
              Nemůžete se rozhodnout? Žula je pro otužilce a milovníky mlhy nad vodou. Mech pro
              ty, kdo chtějí snídat bosí v trávě. Špatná volba neexistuje.
            </p>
          </Reveal>
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
