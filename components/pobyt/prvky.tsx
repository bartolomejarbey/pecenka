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
 *
 * **Popis nahoře, hodnota pod ním, ikona v rohu.** Vedle sebe to nešlo:
 * „lomasvetlusky" se v půlce obrazovky lámalo na tři řádky a „KÓD OD
 * SCHRÁNKY" naráželo do slova „kopírovat". Ikona místo slova ušetří místo
 * a rozumí jí každý — je to týž symbol jako všude jinde.
 */
export function Zkopiruj({
  hodnota,
  popis,
  velky = false,
}: {
  hodnota: string;
  popis: string;
  /** Kód od schránky v den příjezdu — jediná věc na obrazovce, ať je vidět z dálky. */
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

  /*
   * Dlouhá hodnota dostane menší písmo, ne zalomení.
   *
   * Heslo rozlámané na tři řádky vypadá rozbitě a hůř se opisuje. Práh je
   * odhad podle šířky displeje: čtrnáct znaků se do 393 px vejde velkým
   * písmem, dvacet už ne.
   */
  const dlouha = hodnota.length > 14;

  return (
    <button
      type="button"
      onClick={zkopiruj}
      className="group flex w-full flex-col items-start gap-1 rounded-2xl border border-linen/12 bg-linen/[0.04] px-5 py-4 text-left transition-colors hover:border-ember/40"
    >
      <span className="flex w-full items-center justify-between gap-3">
        <span className="text-[12px] uppercase tracking-[0.14em] text-sage/80">{popis}</span>
        <span
          aria-live="polite"
          className={`shrink-0 text-[12.5px] ${stav === "hotovo" ? "text-emerald-300" : "text-sage/80"}`}
        >
          {stav === "hotovo" ? (
            "zkopírováno"
          ) : stav === "nejde" ? (
            "označte a zkopírujte"
          ) : (
            <IkonaKopie />
          )}
        </span>
      </span>
      <span
        className={`block w-full select-all break-words font-display leading-tight text-linen ${
          velky && !dlouha
            ? "text-[34px] tracking-[0.08em]"
            : dlouha
              ? "text-[20px] tracking-[0.02em]"
              : "text-[24px] tracking-[0.04em]"
        }`}
      >
        {hodnota}
      </span>
    </button>
  );
}

function IkonaKopie() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] transition-colors group-hover:text-ember"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Zkopírovat"
      role="img"
    >
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H6.5A2.5 2.5 0 0 0 4 5.5v6A2.5 2.5 0 0 0 6.5 14" />
    </svg>
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
