"use client";

import { useState } from "react";

/** Tlačítko, které dá souřadnice do schránky — do navigace se pak jen vloží. */
export default function KopirujGps({ hodnota }: { hodnota: string }) {
  const [stav, setStav] = useState<"klid" | "hotovo" | "chyba">("klid");

  const kopiruj = async () => {
    try {
      await navigator.clipboard.writeText(hodnota);
      setStav("hotovo");
    } catch {
      setStav("chyba");
    }
    setTimeout(() => setStav("klid"), 2400);
  };

  return (
    <button
      type="button"
      onClick={kopiruj}
      aria-live="polite"
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-linen/25 px-5 text-[14.5px] font-semibold text-linen transition-colors duration-300 hover:border-ember hover:text-ember"
    >
      {stav === "hotovo" ? "Zkopírováno" : stav === "chyba" ? "Opište ručně" : "Zkopírovat GPS"}
    </button>
  );
}
