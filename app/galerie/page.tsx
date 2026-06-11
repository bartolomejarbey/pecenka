import type { Metadata } from "next";
import Image from "next/image";
import PageHero from "@/components/PageHero";
import CtaBanner from "@/components/CtaBanner";
import Reveal from "@/components/Reveal";
import { ArrowIcon } from "@/components/ui";
import { SITE } from "@/lib/content";

export const metadata: Metadata = {
  title: "Galerie",
  description:
    "Mlha nad lomem, první sníh, světlo z okna. Momenty ze Sedmého lesa — dva černé tiny housy na samotě u zatopeného žulového lomu.",
};

type Photo = {
  src: string;
  alt: string;
  caption: string;
  aspect: string;
  span?: string;
  offset?: string;
  sizes: string;
};

const PHOTOS: Photo[] = [
  {
    src: "/foto/tiny3.jpg",
    alt: "Tiny house Žula na skále nad zatopeným lomem, ranní mlha nad hladinou",
    caption: "„Ráno, kdy se lom nadechl.“",
    aspect: "aspect-[16/9]",
    span: "md:col-span-2",
    sizes: "(max-width: 768px) 100vw, 1216px",
  },
  {
    src: "/foto/tiny1.jpg",
    alt: "Tiny house v lese za soumraku, teplé světlo z okna mezi žulovými balvany",
    caption: "„Žula za soumraku — okno, které topí.“",
    aspect: "aspect-[4/5]",
    sizes: "(max-width: 768px) 100vw, 596px",
  },
  {
    src: "/foto/tiny2.jpg",
    alt: "Tiny house Mech na louce při západu slunce, dřevěná terasa s lehátky",
    caption: "„Mech a poslední slunce dne.“",
    aspect: "aspect-[4/3]",
    offset: "md:mt-16",
    sizes: "(max-width: 768px) 100vw, 596px",
  },
];

function GalleryFigure({ photo, i }: { photo: Photo; i: number }) {
  return (
    <Reveal i={i} className={`${photo.span ?? ""} ${photo.offset ?? ""}`}>
      <figure className="group">
        <div
          className={`photo-frame relative overflow-hidden rounded-[28px] border border-linen/8 ${photo.aspect}`}
        >
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes={photo.sizes}
            className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.045]"
          />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-night/60 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-40" />
        </div>
        <figcaption className="font-display mt-4 text-lg italic text-sage transition-colors duration-300 group-hover:text-linen md:mt-5">
          {photo.caption}
        </figcaption>
      </figure>
    </Reveal>
  );
}

export default function GaleriePage() {
  return (
    <main>
      <PageHero
        kicker="Galerie"
        title="Místo, které se"
        accent="nedá vyfotit."
        lead="Ale zkoušíme to. Mlha nad lomem, první sníh, světlo z okna — tady je pár momentů ze Sedmého lesa."
      />

      {/* ===== Editorial galerie ===== */}
      <section className="grain relative overflow-hidden bg-night pb-24 md:pb-32">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <div className="grid gap-10 md:grid-cols-2 md:gap-x-8 md:gap-y-12">
            {PHOTOS.map((p, i) => (
              <GalleryFigure key={p.src} photo={p} i={i} />
            ))}
          </div>

          {/* Instagram ===== */}
          <Reveal className="mt-16 md:mt-24">
            <div className="flex flex-col items-start justify-between gap-7 rounded-[28px] border border-linen/8 bg-pine p-8 transition-colors duration-300 hover:border-ember/30 md:flex-row md:items-center md:p-12">
              <div>
                <h2 className="font-display text-2xl text-linen md:text-3xl">
                  Další fotky přibývají <span className="accent-italic">každou sezónu.</span>
                </h2>
                <p className="mt-3 max-w-md leading-relaxed text-sage">
                  Čerstvé najdete na Instagramu — mlhy, sníh i první borůvky.
                </p>
              </div>
              <a
                href={SITE.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-linen/25 px-7 py-3.5 text-[15px] font-semibold text-linen transition-all duration-300 hover:border-ember hover:text-ember"
              >
                Sledovat @sedmyles.cz <ArrowIcon />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
