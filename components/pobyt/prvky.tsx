"use client";

import { useState } from "react";

/**
 * Stavební prvky portálu hosta.
 *
 * Jedno pravidlo drží celý portál: **na obrazovce je vždycky jedna velká
 * věc a zbytek je tichý.** Původní verze měla všechno ve stejné kartě se
 * stejným rámečkem, takže variabilní symbol křičel stejně jako kód od
 * schránky. Člověk pak nečte nic.
 */

/**
 * Údaj, který si host potřebuje přenést jinam — kód od schránky, heslo k wifi.
 *
 * Ťuknutím se zkopíruje. Opisovat osmimístné heslo z displeje do nastavení
 * wifi je přesně ta drobnost, kvůli které lidé volají — a volají zbytečně.
 * Když schránka není k dispozici (starší prohlížeč, http), zůstane aspoň
 * text vybratelný.
 */
export function Zkopiruj({
  hodnota,
  popis,
  velky = false,
}: {
  hodnota: string;
  popis: string;
  velky?: boolean;
}) {
  const [stav, setStav] = useState<"klid" | "hotovo" | "nejde">("klid");

  async function zkopiruj() {
    try {
      await navigator.clipboard.writeText(hodnota);
      setStav("hotovo");
      setTimeout(() => setStav("klid"), 2000);
    } catch {
      setStav("nejde");
    }
  }

  return (
    <button
      type="button"
      onClick={zkopiruj}
      className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-linen/12 bg-linen/[0.04] px-5 py-4 text-left transition-colors hover:border-ember/40"
    >
      <span className="min-w-0">
        <span className="block text-[12px] uppercase tracking-[0.14em] text-sage/80">{popis}</span>
        <span
          className={`mt-1 block select-all break-words font-display text-linen ${
            velky ? "text-[34px] leading-tight tracking-[0.08em]" : "text-[20px] tracking-[0.04em]"
          }`}
        >
          {hodnota}
        </span>
      </span>
      <span
        aria-live="polite"
        className={`shrink-0 text-[12.5px] ${stav === "hotovo" ? "text-emerald-300" : "text-sage/80"}`}
      >
        {stav === "hotovo" ? "zkopírováno" : stav === "nejde" ? "označ a zkopíruj" : "kopírovat"}
      </span>
    </button>
  );
}

/**
 * Tichý řádek s informací.
 *
 * Bez rámečku, bez karty. Karta znamená „tohle je důležité"; když je kartou
 * všechno, neznamená to nic.
 */
export function Radek({
  popis,
  children,
}: {
  popis: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-linen/8 py-4">
      <p className="text-[12px] uppercase tracking-[0.14em] text-sage/80">{popis}</p>
      <div className="mt-1.5 whitespace-pre-line text-[15.5px] leading-relaxed text-linen">
        {children}
      </div>
    </div>
  );
}
