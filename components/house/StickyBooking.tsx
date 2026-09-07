"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatHalere } from "@/lib/booking";

/**
 * Lišta s cenou a tlačítkem, která se drží dole.
 *
 * Detail domku je sedm obrazovek dlouhý a tlačítko „Rezervovat" bylo až u
 * kalendáře v šesté. Host, který se rozhodl u třetí fotky, musel rolovat
 * nebo hledat v menu. Tohle je věc, kterou má každý web prodávající noci
 * a kterou tu nikdo nepostavil.
 *
 * Objeví se až po odrolování hero — nahoře by se tloukla s velkou fotkou
 * a s tlačítkem v hlavičce. Zmizí u patičky, kde je stejně velké CTA.
 */
export default function StickyBooking({
  slug,
  houseName,
  odCenyHalere,
}: {
  slug: string;
  houseName: string;
  odCenyHalere: number;
}) {
  const [videt, setVidet] = useState(false);

  useEffect(() => {
    // Hranice: konec hero (výška okna) a začátek patičky.
    const patka = document.querySelector("footer");
    const prah = () => {
      const y = window.scrollY;
      const dolni = patka ? patka.getBoundingClientRect().top < window.innerHeight * 0.9 : false;
      setVidet(y > window.innerHeight * 0.7 && !dolni);
    };
    prah();
    window.addEventListener("scroll", prah, { passive: true });
    return () => window.removeEventListener("scroll", prah);
  }, []);

  return (
    <div
      aria-hidden={!videt}
      className={`fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 ease-out ${
        videt ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="border-t border-linen/10 bg-night/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 md:px-8">
          <div className="min-w-0">
            <p className="text-[12px] uppercase tracking-[0.14em] text-sage/80">{houseName}</p>
            <p className="font-display text-[19px] leading-tight text-linen">
              od {formatHalere(odCenyHalere)}
              <span className="ml-1.5 text-[13px] font-normal text-sage">/ noc</span>
            </p>
          </div>
          <Link
            href={`/rezervace?domek=${slug}`}
            tabIndex={videt ? 0 : -1}
            className="flex min-h-[50px] shrink-0 items-center justify-center rounded-full bg-ember px-6 text-[15px] font-semibold text-night transition-colors hover:bg-ember-soft"
          >
            Rezervovat {houseName}
          </Link>
        </div>
      </div>
    </div>
  );
}
