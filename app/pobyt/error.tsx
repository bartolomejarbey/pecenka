"use client";

import { useEffect } from "react";
import { SITE } from "@/lib/content";
import { telOdkaz } from "@/lib/format";

/**
 * Chyba v portálu hosta.
 *
 * Host tu stojí s taškou v ruce a nemá důvod chápat, co se rozbilo. Dostane
 * tlačítko a telefon — víc mu nepomůže.
 */
export default function ChybaPobyt({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("[pobyt] nezachycená chyba:", error);
  }, [error]);

  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-3xl text-linen">Něco se nám zaseklo</h1>
        <p className="mt-4 text-[15.5px] leading-relaxed text-sage">
          Omlouváme se. Zkuste to prosím ještě jednou — a kdyby to nešlo, nic
          se neděje, ozvěte se nám a vyřešíme to za vás.
        </p>
        <button
          onClick={reset}
          className="mt-7 flex min-h-[52px] w-full items-center justify-center rounded-full bg-ember px-6 text-[16px] font-semibold text-night transition-colors hover:bg-ember-soft"
        >
          Zkusit znovu
        </button>
        <a
          href={telOdkaz(SITE.phone)}
          className="mt-4 flex min-h-[48px] items-center justify-center text-[15px] text-sage hover:text-ember"
        >
          Zavolat {SITE.phone}
        </a>
      </div>
    </main>
  );
}
