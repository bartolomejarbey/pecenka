import Link from "next/link";
import type { House } from "@/lib/content";
import Reveal from "@/components/Reveal";
import { ArrowIcon, Kicker } from "@/components/ui";
import HouseGalerieMrizka from "./HouseGalerieMrizka";

/* Fotky místa — záměrně ne hero fotka domku (tu už návštěvník viděl).
   Popisky jsou pravdivé k tomu, co je na snímku: interiér a okolí lomu,
   ke kterému to máte od terasy jen pár kroků. */
const PLACE_PHOTOS: Record<House["slug"], { src: string; alt: string; caption: string }[]> = {
  achat: [
    {
      src: "/foto/interier-obyvak.jpg",
      alt: "Interiér domku — obývací část s velkým oknem do lesa, petrolejová zeleň a překližka",
      caption: "Celá jedna stěna je okno — les si pustíte rovnou dovnitř.",
    },
    {
      src: "/foto/interier-patro.jpg",
      alt: "Spací patro pod stropem s postelí pro dva",
      caption: "Spací patro — postel pro dva pod 3,5m stropem.",
    },
    {
      src: "/foto/interier-koupelna.jpg",
      alt: "Koupelna se sprchovým koutem a umyvadlem",
      caption: "Koupelna se sprchou, ručníky a mýdlem v ceně.",
    },
    {
      src: "/foto/lom-rano.jpg",
      alt: "Zatopený břidlicový lom za svítání, nad hladinou ranní mlha",
      caption: "Zatopený lom pár kroků od domku, ráno celý v mlze.",
    },
    {
      src: "/foto/ohniste-vecer.jpg",
      alt: "Ohniště na dřevěné terase za večera",
      caption: "Ohniště na terase. První náruč dřeva je v ceně.",
    },
  ],
  mech: [
    {
      src: "/foto/interier-kuchyne.jpg",
      alt: "Detail kuchyňské linky v domku — překližka, černé prvky a spací patro nad ní",
      caption: "Plně vybavená kuchyňka, nad ní spací patro.",
    },
    {
      src: "/foto/interier-patro.jpg",
      alt: "Spací patro pod stropem s postelí pro dva",
      caption: "Spací patro — postel pro dva pod 3,5m stropem.",
    },
    {
      src: "/foto/interier-koupelna.jpg",
      alt: "Koupelna se sprchovým koutem a umyvadlem",
      caption: "Koupelna se sprchou, ručníky a mýdlem v ceně.",
    },
    {
      src: "/foto/koupani-lom.jpg",
      alt: "Dřevěné molo na křišťálově čistém zatopeném lomu, letní den",
      caption: "Křišťálová voda lomu — od terasy je to jen pár kroků.",
    },
    {
      src: "/foto/domky-spojene.jpg",
      alt: "Oba domky vedle sebe se společnou terasou",
      caption: "Achát a Mech se dají spojit v jeden celek pro čtyři.",
    },
  ],
};

/** Kapitola IV · Obrazem — místo, kde domek bydlí. */
export default function HouseGallery({ house }: { house: House }) {
  const photos = PLACE_PHOTOS[house.slug];
  return (
    <section className="grain relative overflow-hidden bg-night py-20 md:py-26">
      <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Reveal>
            <Kicker>Kapitola IV · Obrazem</Kicker>
            <h2 className="font-display mt-6 text-4xl text-linen md:text-5xl">
              Místo, kde {house.name} <span className="accent-italic">bydlí.</span>
            </h2>
          </Reveal>
          <Reveal i={1}>
            <Link
              href="/galerie"
              className="group flex items-center gap-2 py-1 text-sm font-semibold text-ember transition-colors duration-300 hover:text-ember-soft"
            >
              Celá galerie
              <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>

        <HouseGalerieMrizka fotky={photos} />
      </div>
    </section>
  );
}
