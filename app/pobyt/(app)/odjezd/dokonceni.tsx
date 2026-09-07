"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import VzkazHostovi from "@/components/pobyt/VzkazHostovi";
import type { StavProtokolu } from "@/lib/portal/vysledek";

/**
 * Dokončení pobytu.
 *
 * Dřív to nebylo nikde. Během pobytu portál o odjezdu mlčel a v den odjezdu
 * na hosta vyskočilo tlačítko „Začít fotit" — bez kontextu, bez toho, aby
 * věděl, kolik toho po něm chceme a co ještě bude následovat.
 *
 * Odjezd má tři části a host je má vidět všechny naráz, i kdyby jednu z nich
 * dělal až za dvě hodiny. Dvě z nich jsou **připomínky, ne podmínky**: klíč
 * se vrací až ve dveřích a nutit hosta odškrtnout „vráceno", když ho ještě
 * drží v ruce, by znamenalo, že si ho odškrtne a zapomene. Odeslání drží
 * jediná věc — fotky.
 */

type Krok = { klic: string; nazev: string; popis: string };

const PRIPOMINKY: Krok[] = [
  {
    klic: "klic",
    nazev: "Klíč zpátky do schránky",
    popis: "Zamkněte prosím a klíč vraťte tam, odkud jste ho brali.",
  },
  {
    klic: "dum",
    nazev: "Okna, topení, odpadky",
    popis: "Zavřít okna, přiložit už nemusíte, koš prosím do popelnice u parkoviště.",
  },
];

const ULOZISTE = "sedmyles-odjezd";

export default function Dokonceni({
  hotovoZon,
  povinnychZon,
  chybiZon,
  odeslano,
  pocatecni,
}: {
  hotovoZon: number;
  povinnychZon: number;
  chybiZon: number;
  odeslano: boolean;
  pocatecni: StavProtokolu;
}) {
  const [stav, setStav] = useState<StavProtokolu>(pocatecni);
  const [odesila, setOdesila] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [odskrtnuto, setOdskrtnuto] = useState<Record<string, boolean>>({});

  /* Odškrtnuté připomínky přežijí obnovení stránky — host se sem vrací. */
  useEffect(() => {
    try {
      const ulozene = window.localStorage.getItem(ULOZISTE);
      if (ulozene) setOdskrtnuto(JSON.parse(ulozene) as Record<string, boolean>);
    } catch {
      /* Soukromé okno, zakázaná úložiště — nevadí, jen se to nezapamatuje. */
    }
  }, []);

  const prepni = (klic: string) => {
    setOdskrtnuto((s) => {
      const novy = { ...s, [klic]: !s[klic] };
      try {
        window.localStorage.setItem(ULOZISTE, JSON.stringify(novy));
      } catch {
        /* viz výš */
      }
      return novy;
    });
  };

  const nactiStav = useCallback(async () => {
    try {
      const o = await fetch("/api/pobyt/stav", { cache: "no-store" });
      if (!o.ok) return false;
      const d = (await o.json()) as StavProtokolu;
      setStav(d);
      return d.stav === "hotovo" || d.stav === "bez_vyhodnoceni";
    } catch {
      return false;
    }
  }, []);

  /*
   * Čekání na vzkaz.
   *
   * Vyhodnocení běží na pozadí a trvá desítky sekund. Host mezitím stojí
   * v domku — a právě tehdy má smysl mu říct, ať srovná peřinu nebo zavolá.
   * Za pár minut sedí v autě a je to k ničemu.
   */
  useEffect(() => {
    if (stav.stav !== "ceka") return;
    let zive = true;
    let casovac: ReturnType<typeof setTimeout>;
    const konec = Date.now() + 120_000;

    const kolo = async () => {
      if (!zive) return;
      if (await nactiStav()) return;
      if (Date.now() > konec) return;
      casovac = setTimeout(kolo, 3000);
    };
    void kolo();
    return () => {
      zive = false;
      clearTimeout(casovac);
    };
  }, [stav.stav, nactiStav]);

  async function dokonci() {
    setOdesila(true);
    setChyba(null);
    try {
      const o = await fetch("/api/pobyt/odeslat", { method: "POST" });
      const d = (await o.json()) as { ok?: boolean; error?: string };
      if (!o.ok || !d.ok) throw new Error(d.error ?? "Odeslání se nepovedlo.");
      setStav({ stav: "ceka", odeslano: new Date().toISOString() });
      void nactiStav();
    } catch (e) {
      setChyba(e instanceof Error ? e.message : "Odeslání se nepovedlo.");
    } finally {
      setOdesila(false);
    }
  }

  /* ===== Hotovo ===== */
  if (stav.stav === "hotovo" || stav.stav === "bez_vyhodnoceni") {
    return (
      <div className="mt-8">
        <VzkazHostovi vzkaz={stav.vzkaz} />
      </div>
    );
  }

  if (stav.stav === "ceka" || odeslano) {
    return (
      <div className="mt-8 rounded-2xl border border-linen/12 bg-linen/[0.04] px-6 py-8 text-center">
        <h2 className="font-display text-2xl text-linen">Pobyt máte dokončený</h2>
        <p className="mt-3 text-[15.5px] leading-relaxed text-sage">
          Fotky procházíme. Vydržte prosím pár vteřin, ať víte, jestli od vás
          ještě něco potřebujeme.
        </p>
        <span className="mt-5 inline-flex items-center gap-2.5 text-[13.5px] text-sage/80">
          <span className="h-2 w-2 animate-pulse rounded-full bg-ember" aria-hidden="true" />
          Prohlížím fotky…
        </span>
      </div>
    );
  }

  /* ===== Kroky ===== */
  const fotkyHotovo = chybiZon === 0;

  return (
    <div className="mt-8">
      <ol className="space-y-3">
        {/* 1. Fotky — jediná část, která něco blokuje */}
        <li
          className={`rounded-2xl border px-5 py-5 ${
            fotkyHotovo ? "border-emerald-400/25 bg-emerald-400/[0.06]" : "border-ember/35 bg-ember/[0.07]"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <Cislo hotovo={fotkyHotovo}>1</Cislo>
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-medium text-linen">Vyfotit domek</h2>
              <p className="mt-1 text-[14.5px] leading-relaxed text-sage">
                {fotkyHotovo
                  ? "Máme všechno, co potřebujeme. Kdyby se vám něco nezdálo, můžete zóny přefotit."
                  : "Pár míst v domku, ať je doloženo, v jakém stavu jste ho nechali. Tři minuty."}
              </p>
              <p className="mt-2 text-[13.5px] text-sage/80">
                Hotovo {hotovoZon} z {povinnychZon} povinných míst
              </p>
              <Link
                href="/pobyt/protokol"
                className={`mt-4 flex min-h-[52px] w-full items-center justify-center rounded-full px-6 text-[16px] font-semibold transition-colors ${
                  fotkyHotovo
                    ? "border border-linen/20 text-sage hover:border-ember/40 hover:text-ember"
                    : "bg-ember text-night hover:bg-ember-soft"
                }`}
              >
                {fotkyHotovo ? "Projít fotky znovu" : hotovoZon > 0 ? "Pokračovat" : "Začít fotit"}
              </Link>
            </div>
          </div>
        </li>

        {/* 2 a 3. Připomínky — odškrtnutí nic neblokuje */}
        {PRIPOMINKY.map((k, i) => (
          <li key={k.klic}>
            <button
              type="button"
              aria-pressed={Boolean(odskrtnuto[k.klic])}
              onClick={() => prepni(k.klic)}
              className="flex w-full items-start gap-3.5 rounded-2xl border border-linen/10 bg-bark px-5 py-5 text-left transition-colors hover:border-linen/25"
            >
              <Cislo hotovo={Boolean(odskrtnuto[k.klic])}>{i + 2}</Cislo>
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-[17px] font-medium ${
                    odskrtnuto[k.klic] ? "text-sage line-through" : "text-linen"
                  }`}
                >
                  {k.nazev}
                </span>
                <span className="mt-1 block text-[14.5px] leading-relaxed text-sage">{k.popis}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-7">
        <button
          type="button"
          onClick={dokonci}
          disabled={!fotkyHotovo || odesila}
          className="flex min-h-[56px] w-full items-center justify-center rounded-full bg-ember px-6 text-[16px] font-semibold text-night transition-colors hover:bg-ember-soft disabled:cursor-not-allowed disabled:bg-linen/10 disabled:text-sage"
        >
          {odesila ? "Odesílám…" : "Dokončit pobyt"}
        </button>
        {!fotkyHotovo && (
          <p className="mt-3 text-center text-[14px] leading-relaxed text-sage">
            Zbývá vyfotit {chybiZon}{" "}
            {chybiZon === 1 ? "místo" : chybiZon < 5 ? "místa" : "míst"}. Nic víc po vás nechceme.
          </p>
        )}
        {chyba && (
          <p role="alert" className="mt-3 text-center text-[14.5px] text-red-300">
            {chyba}
          </p>
        )}
      </div>
    </div>
  );
}

function Cislo({ children, hotovo }: { children: React.ReactNode; hotovo: boolean }) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold ${
        hotovo ? "bg-emerald-400/20 text-emerald-300" : "bg-linen/10 text-sage"
      }`}
      aria-hidden="true"
    >
      {hotovo ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"
             strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5 9.5 17 19 7.5" />
        </svg>
      ) : (
        children
      )}
    </span>
  );
}
