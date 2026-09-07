"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Prohlížení fotek na celou obrazovku.
 *
 * Galerie byla mřížka statických obrázků: na telefonu dva sloupce po
 * 180 pixelech a žádný způsob, jak si fotku prohlédnout větší. Host, který
 * se rozhoduje podle interiéru, potřeboval přiblížit prsty — a to přiblíží
 * celou stránku.
 *
 * Bez knihovny: nativní `<dialog>` a vodorovný pás se snapem. Snap dává
 * listování prstem zadarmo a `<dialog>` řeší fokus, Escape i zavření
 * klepnutím mimo. Obrázky se v dialogu načítají až po otevření, takže
 * stránka samotná nezpomalí.
 */

export type FotkaLightboxu = { src: string; alt: string; caption?: string };

export function useLightbox() {
  const [otevreno, setOtevreno] = useState<number | null>(null);
  return { otevreno, otevri: (i: number) => setOtevreno(i), zavri: () => setOtevreno(null) };
}

export default function Lightbox({
  fotky,
  index,
  onZavrit,
}: {
  fotky: FotkaLightboxu[];
  /** Které začít; `null` = zavřeno. */
  index: number | null;
  onZavrit: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pas = useRef<HTMLDivElement>(null);
  const [aktualni, setAktualni] = useState(0);

  /* Otevření a zavření podle indexu — dialog se řídí sám. */
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (index === null) {
      if (d.open) d.close();
      return;
    }
    if (!d.open) d.showModal();
    setAktualni(index);
    // Odrolovat na vybranou fotku bez animace, ať to neproletí přes všechny.
    requestAnimationFrame(() => {
      pas.current?.children[index]?.scrollIntoView({ behavior: "instant" as ScrollBehavior, inline: "start" });
    });
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [index]);

  /* Počítadlo podle toho, kde pás právě stojí. */
  const naScroll = useCallback(() => {
    const el = pas.current;
    if (!el) return;
    setAktualni(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  const posun = (o: number) => {
    const el = pas.current;
    if (!el) return;
    const cil = Math.max(0, Math.min(fotky.length - 1, aktualni + o));
    el.children[cil]?.scrollIntoView({ behavior: "smooth", inline: "start" });
  };

  useEffect(() => {
    if (index === null) return;
    const klavesa = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") posun(1);
      if (e.key === "ArrowLeft") posun(-1);
    };
    window.addEventListener("keydown", klavesa);
    return () => window.removeEventListener("keydown", klavesa);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, aktualni]);

  return (
    <dialog
      ref={dialog}
      onClose={onZavrit}
      onClick={(e) => {
        // Klepnutí mimo obrázek zavírá — obrázky mají vlastní stopPropagation.
        if (e.target === dialog.current) onZavrit();
      }}
      className="m-0 h-full max-h-none w-full max-w-none bg-night/95 p-0 text-linen backdrop:bg-night/90 open:flex open:flex-col"
      aria-label="Fotogalerie"
    >
      <div className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <span className="text-[13px] tabular-nums text-sage">
          {aktualni + 1} / {fotky.length}
        </span>
        <button
          type="button"
          onClick={onZavrit}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-linen/10 text-linen hover:bg-linen/20"
          aria-label="Zavřít"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div
        ref={pas}
        onScroll={naScroll}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {index !== null &&
          fotky.map((f, i) => (
            <figure
              key={f.src}
              className="flex h-full w-full shrink-0 snap-start flex-col items-center justify-center px-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-[72svh] w-full">
                <Image
                  src={f.src}
                  alt={f.alt}
                  fill
                  sizes="100vw"
                  // Sousední fotky napřed, ostatní až když na ně dojde.
                  loading={Math.abs(i - aktualni) <= 1 ? "eager" : "lazy"}
                  className="object-contain"
                />
              </div>
              {f.caption && (
                <figcaption className="font-display mt-4 max-w-xl px-2 text-center text-[16px] italic text-sage">
                  {f.caption}
                </figcaption>
              )}
            </figure>
          ))}
      </div>

      {/* Šipky pro desktop; na telefonu se listuje prstem. */}
      <div className="hidden items-center justify-center gap-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:flex">
        <button
          type="button"
          onClick={() => posun(-1)}
          disabled={aktualni === 0}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-linen/20 text-linen hover:border-ember hover:text-ember disabled:opacity-30"
          aria-label="Předchozí"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => posun(1)}
          disabled={aktualni === fotky.length - 1}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-linen/20 text-linen hover:border-ember hover:text-ember disabled:opacity-30"
          aria-label="Další"
        >
          →
        </button>
      </div>
      <div className="h-[max(1rem,env(safe-area-inset-bottom))] md:hidden" />
    </dialog>
  );
}
