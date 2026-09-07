"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Chyba v administraci.
 *
 * Výchozí stránka Next nemá cestu zpět ani tlačítko „zkusit znovu" — majitel
 * uvízne u výpadku databáze na prázdné obrazovce. Text zůstává v češtině
 * a bez technických podrobností; ty patří do konzole, ne na displej.
 */
export default function ChybaAdmin({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] nezachycená chyba:", error);
  }, [error]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-night px-5 py-16">
      <div className="w-full max-w-md text-center">
        <h1 className="font-display text-3xl text-linen">Něco se pokazilo</h1>
        <p className="mt-4 text-[15.5px] leading-relaxed text-sage">
          Stránku se nepodařilo načíst. Většinou stačí to zkusit znovu — data
          jsou v pořádku, jen se k nim teď nedostáváme.
        </p>
        <button
          onClick={reset}
          className="mt-7 flex min-h-[52px] w-full items-center justify-center rounded-full bg-ember px-6 text-[16px] font-semibold text-night transition-colors hover:bg-ember-soft"
        >
          Zkusit znovu
        </button>
        <Link
          href="/admin"
          className="mt-4 flex min-h-[48px] items-center justify-center text-[15px] text-sage hover:text-ember"
        >
          Zpátky na dnešek
        </Link>
        {error.digest && (
          <p className="mt-6 text-[12px] text-sage/60">Kód chyby: {error.digest}</p>
        )}
      </div>
    </main>
  );
}
