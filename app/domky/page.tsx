import Image from "next/image";
import PageHero from "@/components/PageHero";
import HouseCard from "@/components/HouseCard";
import CtaBanner from "@/components/CtaBanner";
import Reveal from "@/components/Reveal";
import JsonLd from "@/components/JsonLd";
import { Kicker } from "@/components/ui";
import { HOUSES, JOIN, PLANNED } from "@/lib/content";
import { breadcrumbLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Domky",
  description:
    "Achát s oknem 3×3 m do lesa a Mech se žaluziovou stěnou — dva černé tiny housy pro dva u lomu na okraji Českého ráje. Spojíte je i v jeden.",
  path: "/domky",
});

const achat = HOUSES.find((h) => h.slug === "achat")!;
const mech = HOUSES.find((h) => h.slug === "mech")!;

const COMPARISON: { label: string; achat: string; mech: string }[] = [
  { label: "Kapacita", achat: achat.capacity, mech: mech.capacity },
  { label: "Plocha", achat: achat.area, mech: mech.area },
  { label: "Postele", achat: achat.beds, mech: mech.beds },
  { label: "Okno", achat: achat.signature.title, mech: mech.signature.title },
  { label: "Výhled", achat: "Okno 3 × 3 m do lesa", mech: "Okno 3 × 2 m + žaluziová stěna" },
];

export default function DomkyPage() {
  return (
    <main>
      <JsonLd
        data={breadcrumbLd([
          { name: "Domů", path: "/" },
          { name: "Domky", path: "/domky" },
        ])}
      />
      <PageHero
        kicker="Dva domky"
        title="Každý jiná"
        accent="pohádka."
        lead="Achát má celou stěnu ze skla — okno tři krát tři metry do lesa. Mech se schovává za dřevěnou žaluziovou stěnu. Dva skoro stejné černé kubusy pro dva, oba celoroční. A když chcete, spojíte si je v jeden velký."
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
            <Kicker tone="light">Achát, nebo Mech?</Kicker>
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
                <h3 className="font-display text-2xl text-night md:text-3xl">{achat.name}</h3>
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
                    {row.achat}
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
              Nemůžete se rozhodnout? Achát je o skle a výhledu — celou stěnu tvoří okno do lesa.
              Mech vám dá víc soukromí za dřevěnou žaluzií. A nejlepší možnost? Vzít si oba.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== Dva domky, nebo jeden velký (JOIN) ===== */}
      <section className="grain relative overflow-hidden bg-bark py-24 md:py-32">
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 md:grid-cols-2 md:gap-16 md:px-8">
          <Reveal>
            <div className="photo-frame relative aspect-[4/3] overflow-hidden rounded-[34px] border border-linen/8">
              <Image
                src="/foto/domky-spojene.jpg"
                alt="Dva černé kubické domky Achát a Mech spojené v jeden obytný celek"
                fill
                sizes="(max-width: 768px) 100vw, 596px"
                className="object-cover"
              />
            </div>
          </Reveal>
          <div>
            <Reveal>
              <Kicker>Jeden, nebo oba</Kicker>
            </Reveal>
            <Reveal i={1}>
              <h2 className="font-display mt-6 max-w-xl text-4xl text-linen md:text-5xl">
                Dva domky, <span className="accent-italic">nebo jeden velký.</span>
              </h2>
            </Reveal>
            <Reveal i={2}>
              <p className="mt-7 max-w-md text-[16px] leading-relaxed text-sage">{JOIN.desc}</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== Co teprve přibude (PLANNED) ===== */}
      <section className="grain relative overflow-hidden bg-mist py-24 text-night md:py-32">
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 md:grid-cols-2 md:gap-16 md:px-8">
          <div>
            <Reveal>
              <Kicker tone="light">Připravujeme</Kicker>
            </Reveal>
            <Reveal i={1}>
              <h2 className="font-display mt-6 max-w-xl text-4xl md:text-5xl">
                Co teprve{" "}
                <span className="font-display italic text-ember-deep">přibude.</span>
              </h2>
            </Reveal>
            <Reveal i={2}>
              <p className="mt-7 max-w-md text-[16px] leading-relaxed text-night/60">
                {PLANNED.desc}
              </p>
            </Reveal>
            <div className="mt-10 space-y-6">
              {PLANNED.items.map((item, i) => (
                <Reveal key={item.title} i={i} as="div">
                  <div className="border-t border-night/10 pt-5">
                    <h3 className="font-display text-xl text-night">{item.title}</h3>
                    <p className="mt-2 max-w-md text-[15px] leading-relaxed text-night/60">
                      {item.desc}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal>
            <div className="photo-frame relative aspect-[4/5] overflow-hidden rounded-[34px] border border-night/10">
              <Image
                src="/foto/sauna-sud.jpg"
                alt="Vizualizace plánované černé sauny a dřevěného koupacího sudu na břehu lomu za soumraku"
                fill
                sizes="(max-width: 768px) 100vw, 596px"
                className="object-cover"
              />
              <div className="absolute left-5 top-5 rounded-full border border-linen/30 bg-night/55 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-linen backdrop-blur-sm">
                Příští sezónu
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
