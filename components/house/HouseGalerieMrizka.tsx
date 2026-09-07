"use client";

import Image from "next/image";
import Reveal from "@/components/Reveal";
import Lightbox, { useLightbox, type FotkaLightboxu } from "@/components/Lightbox";

/**
 * Fotky domku: jedna velká, čtyři menší, všechny klepnutím na celou obrazovku.
 *
 * Detail domku měl dvě fotky. Host, který se rozhoduje mezi dvěma domky
 * a patnácti tisíci, chce vidět kuchyň, koupelnu a postel — ne dvě nálady.
 * Fotek je pořád málo (interiéry obou domků jsou totožné, takže se sdílí),
 * ale pět s možností zvětšit je jiná liga než dvě bez ní.
 */
export default function HouseGalerieMrizka({ fotky }: { fotky: FotkaLightboxu[] }) {
  const lb = useLightbox();
  const [hlavni, ...dalsi] = fotky;

  return (
    <>
      <div className="mt-12 grid gap-3 md:mt-16 md:grid-cols-[1.6fr_1fr] md:gap-4">
        <Reveal as="div">
          <Fotka f={hlavni} i={0} otevri={lb.otevri} pomer="aspect-[4/3]" sizes="(max-width: 768px) 100vw, 60vw" />
        </Reveal>
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {dalsi.map((f, k) => (
            <Reveal key={f.src} as="div" i={k + 1}>
              <Fotka f={f} i={k + 1} otevri={lb.otevri} pomer="aspect-square" sizes="(max-width: 768px) 50vw, 20vw" />
            </Reveal>
          ))}
        </div>
      </div>
      <p className="mt-4 text-sm text-sage">{hlavni.caption}</p>

      <Lightbox fotky={fotky} index={lb.otevreno} onZavrit={lb.zavri} />
    </>
  );
}

function Fotka({
  f,
  i,
  otevri,
  pomer,
  sizes,
}: {
  f: FotkaLightboxu;
  i: number;
  otevri: (i: number) => void;
  pomer: string;
  sizes: string;
}) {
  return (
    <button
      type="button"
      onClick={() => otevri(i)}
      className={`photo-frame group relative block w-full overflow-hidden rounded-[22px] ${pomer}`}
      aria-label={`Zvětšit: ${f.alt}`}
    >
      <Image
        src={f.src}
        alt={f.alt}
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.045]"
      />
      <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-night/50 to-transparent" />
    </button>
  );
}
