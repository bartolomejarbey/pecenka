"use client";

import Image from "next/image";
import Reveal from "@/components/Reveal";
import Lightbox, { useLightbox } from "@/components/Lightbox";

export type FotkaGalerie = {
  src: string;
  alt: string;
  caption: string;
  aspect: string;
  span?: string;
  offset?: string;
  sizes: string;
};

/**
 * Mřížka galerie, ze které se dá klepnout do celoobrazovkového prohlížení.
 *
 * Klientská komponenta jen kvůli tomu klepnutí — rozvržení i fotky přijdou
 * ze serveru vykreslené, hydratuje se jen obsluha.
 */
export default function GalerieMrizka({ fotky }: { fotky: FotkaGalerie[] }) {
  const lb = useLightbox();

  return (
    <>
      <div className="grid gap-10 md:grid-cols-2 md:gap-x-8 md:gap-y-12">
        {fotky.map((photo, i) => (
          <Reveal key={photo.src} i={i} className={`${photo.span ?? ""} ${photo.offset ?? ""}`}>
            <figure className="group">
              <button
                type="button"
                onClick={() => lb.otevri(i)}
                className={`photo-frame relative block w-full overflow-hidden rounded-[28px] border border-linen/8 text-left ${photo.aspect}`}
                aria-label={`Zvětšit: ${photo.alt}`}
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes={photo.sizes}
                  className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.045]"
                />
                <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-night/60 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-40" />
                <span
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-night/60 text-linen opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100 md:opacity-0"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6" />
                  </svg>
                </span>
              </button>
              <figcaption className="font-display mt-4 text-lg italic text-sage transition-colors duration-300 group-hover:text-linen md:mt-5">
                {photo.caption}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>

      <Lightbox fotky={fotky} index={lb.otevreno} onZavrit={lb.zavri} />
    </>
  );
}
