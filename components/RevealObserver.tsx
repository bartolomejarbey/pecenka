"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Jediný IntersectionObserver pro celý web. Sleduje `[data-reveal]` a jakmile
 * se element dostane do viewportu, označí ho `data-revealed` — zbytek dělá CSS.
 *
 * Proč jeden: motion/react zakládal observer a JS animaci pro každý
 * `whileInView` element (na /o-nas jich bylo 45). Tady je jeden observer na
 * dokument a nula JS animací během scrollu.
 *
 * Skrývání zapíná blokující skript v <head> (`data-reveal-armed`), aby obsah
 * neproblikl. Tahle komponenta potvrdí, že JS naběhl (`data-reveal-live`) —
 * pokud by se chunk nenačetl, pojistka ve skriptu skrývání zase vypne.
 */
export default function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-reveal-live", "");

    if (!root.hasAttribute("data-reveal-armed")) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-revealed", "");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );

    // Elementy nad ohybem odhalíme rovnou, ať nikdo nekouká na prázdno.
    const fold = window.innerHeight * 0.92;
    for (const el of document.querySelectorAll<HTMLElement>(
      "[data-reveal]:not([data-revealed])",
    )) {
      if (el.getBoundingClientRect().top < fold) el.setAttribute("data-revealed", "");
      else io.observe(el);
    }

    return () => io.disconnect();
  }, [pathname]);

  return null;
}
