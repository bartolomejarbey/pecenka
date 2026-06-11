import Image from "next/image";
import Link from "next/link";
import type { House } from "@/lib/content";
import Reveal from "@/components/Reveal";
import { ArrowIcon, Kicker } from "@/components/ui";

/* Fotky místa — záměrně ne hero fotka domku (tu už návštěvník viděl).
   Popisky jsou pravdivé k tomu, co je na snímku; druhý domek
   se ukazuje jako „soused“, což podtrhuje příběh dvou domků. */
const PLACE_PHOTOS: Record<House["slug"], { src: string; alt: string; caption: string }[]> = {
  zula: [
    {
      src: "/foto/tiny1.jpg",
      alt: "Černý domek mezi stromy za soumraku, okna svítí teplým světlem",
      caption: "Večer v Sedmém lese — okna, která topí.",
    },
    {
      src: "/foto/tiny2.jpg",
      alt: "Domek Mech na kraji louky při západu slunce",
      caption: "Louka u souseda Mechu, večer celá ve zlatě.",
    },
  ],
  mech: [
    {
      src: "/foto/tiny1.jpg",
      alt: "Černý domek mezi stromy za soumraku, okna svítí teplým světlem",
      caption: "Večer v Sedmém lese — okna, která topí.",
    },
    {
      src: "/foto/tiny3.jpg",
      alt: "Domek Žula na skále nad zatopeným lomem s ranní mlhou",
      caption: "Sousedka Žula na hraně lomu — pět minut pěšky.",
    },
  ],
};

/** Kapitola IV · Obrazem — místo, kde domek bydlí. */
export default function HouseGallery({ house }: { house: House }) {
  const photos = PLACE_PHOTOS[house.slug];
  return (
    <section className="grain relative overflow-hidden bg-night py-24 md:py-32">
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
              className="group flex items-center gap-2 text-sm font-semibold text-ember transition-colors duration-300 hover:text-ember-soft"
            >
              Celá galerie
              <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 md:mt-16 md:grid-cols-[1.4fr_1fr] md:gap-8">
          <Reveal as="div" amount={0.2}>
            <figure className="group">
              <div className="photo-frame relative aspect-[4/3] overflow-hidden rounded-[28px]">
                <Image
                  src={photos[0].src}
                  alt={photos[0].alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 58vw"
                  className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.045]"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-night/60 to-transparent" />
              </div>
              <figcaption className="mt-4 text-sm text-sage">{photos[0].caption}</figcaption>
            </figure>
          </Reveal>

          <Reveal as="div" i={1} amount={0.2} className="md:mt-14">
            <figure className="group">
              <div className="photo-frame relative aspect-[3/4] overflow-hidden rounded-[28px]">
                <Image
                  src={photos[1].src}
                  alt={photos[1].alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.045]"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-night/60 to-transparent" />
              </div>
              <figcaption className="mt-4 text-sm text-sage">{photos[1].caption}</figcaption>
            </figure>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
