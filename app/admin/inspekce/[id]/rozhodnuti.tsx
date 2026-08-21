"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { rozhodniOSkode } from "@/lib/luna/rozhodnuti";

/**
 * Rozhodnutí o škodě.
 *
 * Schválně tu **není tlačítko „souhlasím s AI"**. Odůvodnění musí majitel
 * napsat sám — u rozhodnutí, které se dotkne peněz hosta, se podle čl. 22
 * GDPR zkoumá, jestli byl lidský zásah skutečný. Odkliknutí návrhu stroje
 * se za lidský zásah nepovažuje.
 */
export default function Rozhodnuti({
  pripadId,
  zona,
  odhadMin,
  odhadMax,
}: {
  pripadId: string;
  zona: string;
  odhadMin: number;
  odhadMax: number;
}) {
  const [otevreno, setOtevreno] = useState(false);
  const [castka, setCastka] = useState(odhadMax ? String(Math.round(odhadMax)) : "");
  const [duvod, setDuvod] = useState("");
  const [sluzba, setSluzba] = useState(false);
  const router = useRouter();
  const [probiha, start] = useTransition();
  const [hlaska, setHlaska] = useState<{ ok: boolean; text: string } | null>(null);

  const spust = (kc: number) =>
    start(async () => {
      const v = await rozhodniOSkode(pripadId, kc, duvod, sluzba);
      setHlaska(v.ok ? { ok: true, text: v.zprava } : { ok: false, text: v.chyba });
      // Rozhodnutí mění stav protokolu, který vykresluje server.
      if (v.ok) router.refresh();
    });

  const kratky = duvod.trim().length < 20;

  if (!otevreno) {
    return (
      <button
        type="button"
        onClick={() => setOtevreno(true)}
        className="mt-5 rounded-xl bg-ember px-5 py-3 text-[14.5px] font-semibold text-night transition-colors hover:bg-ember-soft"
      >
        Rozhodnout o {zona.toLowerCase()}
      </button>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-linen/15 bg-night p-4 md:p-5">
      <p className="text-[13.5px] leading-relaxed text-sage">
        Napiš prosím <strong className="text-linen">vlastními slovy</strong>, co jsi na fotkách
        viděl a proč to považuješ za škodu. Tenhle text uvidí host a je to jediný
        doklad o tom, že rozhodl člověk, ne stroj.
      </p>

      <textarea
        value={duvod}
        onChange={(e) => setDuvod(e.target.value)}
        rows={4}
        placeholder="Např. „Na sedáku křesla je tmavá skvrna o průměru asi 15 cm, která na fotce při předání není. Vypadá na rozlitou kávu vsáklou do látky."
        className="mt-3 w-full resize-y rounded-lg border border-linen/15 bg-bark px-3.5 py-3 text-[14.5px] leading-relaxed text-linen placeholder:text-sage/40 focus:border-ember focus:outline-none"
      />
      <p className={`mt-1.5 text-[12.5px] ${kratky ? "text-sage/60" : "text-emerald-300"}`}>
        {duvod.trim().length} / 20 znaků {kratky ? "— zatím málo" : "✓"}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[9rem_1fr]">
        <div>
          <label htmlFor={`c-${pripadId}`} className="text-[12px] uppercase tracking-[0.14em] text-sage/70">
            Částka (Kč)
          </label>
          <input
            id={`c-${pripadId}`}
            value={castka}
            onChange={(e) => setCastka(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            className="mt-2 w-full rounded-lg border border-linen/15 bg-bark px-3.5 py-2.5 text-[14.5px] tabular-nums text-linen focus:border-ember focus:outline-none"
          />
          {(odhadMin > 0 || odhadMax > 0) && (
            <p className="mt-1.5 text-[12px] text-sage/60">
              Luna odhadla {odhadMin}–{odhadMax} Kč
            </p>
          )}
        </div>

        <fieldset className="min-w-0">
          <legend className="text-[12px] uppercase tracking-[0.14em] text-sage/70">
            Jak se to vyúčtuje
          </legend>
          <div className="mt-2 space-y-2">
            {[
              [false, "Náhrada škody", "Není to plnění — účtuje se bez DPH."],
              [true, "Služba", "Mimořádný úklid, ztracený klíč. Plnění s DPH."],
            ].map(([hodnota, popis, vysvetleni]) => (
              <label
                key={String(hodnota)}
                className={`flex cursor-pointer gap-2.5 rounded-lg border px-3.5 py-2.5 text-[14px] transition-colors ${
                  sluzba === hodnota ? "border-ember/50 bg-ember/[0.07]" : "border-linen/12"
                }`}
              >
                <input
                  type="radio"
                  name={`rezim-${pripadId}`}
                  checked={sluzba === hodnota}
                  onChange={() => setSluzba(hodnota as boolean)}
                  className="mt-0.5 accent-[#d9914e]"
                />
                <span>
                  <span className="block text-linen">{popis as string}</span>
                  <span className="block text-[12.5px] text-sage/70">{vysvetleni as string}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={probiha || kratky || !Number(castka)}
          onClick={() => spust(Number(castka))}
          className="rounded-xl bg-ember px-5 py-3 text-[14.5px] font-semibold text-night transition-colors hover:bg-ember-soft disabled:opacity-40"
        >
          {probiha ? "Ukládám…" : `Uplatnit ${Number(castka).toLocaleString("cs-CZ")} Kč`}
        </button>
        <button
          type="button"
          disabled={probiha || kratky}
          onClick={() => spust(0)}
          className="rounded-xl border border-linen/15 px-5 py-3 text-[14.5px] text-sage transition-colors hover:border-linen/30 hover:text-linen disabled:opacity-40"
        >
          Bez nároku
        </button>
        <button
          type="button"
          onClick={() => setOtevreno(false)}
          className="px-2 text-[14px] text-sage hover:text-linen"
        >
          Zrušit
        </button>
      </div>

      {hlaska && (
        <p role="status" className={`mt-4 text-[14px] ${hlaska.ok ? "text-emerald-300" : "text-red-300"}`}>
          {hlaska.text}
        </p>
      )}
    </div>
  );
}
