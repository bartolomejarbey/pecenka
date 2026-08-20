"use client";

import { useState, useTransition } from "react";
import { konecnaFaktura, nedanovyDoklad, opravnyDoklad, zalohovaFaktura, type Vysledek } from "@/lib/doklady/akce";

/**
 * Doklady k rezervaci.
 *
 * Dobropis má schválně vlastní potvrzení: peníze musí odejít dřív než doklad.
 * Vratka se legitimně nepovede (nedostatek prostředků, uplynulá lhůta) a doklad
 * bez odeslaných peněz je vadný účetní záznam. Opačné pořadí jde vždycky
 * napravit, tohle ne.
 */

export type DokladKRezervaci = {
  id: string;
  cislo: string;
  nazev: string;
  stav: string;
  celkemHalere: number;
  vystaveno: string | null;
  lzeOpravit: boolean;
};

const TL =
  "rounded-xl border border-linen/15 px-4 py-2.5 text-[14px] text-sage transition-colors " +
  "hover:border-linen/30 hover:text-linen disabled:opacity-40";
const TL_HLAVNI =
  "rounded-xl bg-ember px-4 py-2.5 text-[14px] font-semibold text-night transition-colors " +
  "hover:bg-ember-soft disabled:opacity-40";

export default function Doklady({
  kod,
  doklady,
}: {
  kod: string;
  doklady: DokladKRezervaci[];
}) {
  const [probiha, start] = useTransition();
  const [hlaska, setHlaska] = useState<{ ok: boolean; text: string } | null>(null);
  const [opravuje, setOpravuje] = useState<string | null>(null);
  const [duvod, setDuvod] = useState("");
  const [vraceno, setVraceno] = useState(false);
  const [nedanovy, setNedanovy] = useState(false);
  const [popis, setPopis] = useState("");
  const [castka, setCastka] = useState("");

  const spust = (fn: () => Promise<Vysledek>) =>
    start(async () => {
      const v = await fn();
      setHlaska(v.ok ? { ok: true, text: v.zprava } : { ok: false, text: v.chyba });
      if (v.ok) {
        setOpravuje(null);
        setNedanovy(false);
        setDuvod("");
        setVraceno(false);
        setPopis("");
        setCastka("");
      }
    });

  const kc = (h: number) => (h / 100).toLocaleString("cs-CZ") + " Kč";

  return (
    <section className="mt-5 rounded-2xl border border-linen/10 bg-bark p-5 md:p-6">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-sage">Doklady</h2>

      {doklady.length > 0 && (
        <ul className="mt-4 divide-y divide-linen/8">
          {doklady.map((d) => (
            <li key={d.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[15px] text-linen">
                    <span className="font-display">{d.cislo}</span>
                    <span className="ml-2.5 text-sage">{d.nazev}</span>
                  </p>
                  {d.vystaveno && (
                    <p className="mt-0.5 text-[13px] text-sage">
                      vystaveno {new Date(d.vystaveno).toLocaleDateString("cs-CZ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-display text-[15px] ${d.celkemHalere < 0 ? "text-red-300" : "text-linen"}`}>
                    {kc(d.celkemHalere)}
                  </span>
                  {d.lzeOpravit && (
                    <button type="button" className={TL} onClick={() => setOpravuje(d.id)}>
                      Opravný doklad
                    </button>
                  )}
                </div>
              </div>

              {opravuje === d.id && (
                <div className="mt-3 rounded-xl border border-linen/15 bg-night p-4">
                  <label htmlFor={`duvod-${d.id}`} className="text-[13px] uppercase tracking-[0.14em] text-sage/70">
                    Důvod opravy
                  </label>
                  <input
                    id={`duvod-${d.id}`}
                    value={duvod}
                    onChange={(e) => setDuvod(e.target.value)}
                    placeholder="Např. „Host stornoval pobyt 21 dní předem."
                    className="mt-2 w-full rounded-lg border border-linen/15 bg-bark px-3.5 py-2.5 text-[14.5px] text-linen placeholder:text-sage/40 focus:border-ember focus:outline-none"
                  />
                  <label className="mt-3.5 flex cursor-pointer items-start gap-2.5 text-[14px] text-sage">
                    <input
                      type="checkbox"
                      checked={vraceno}
                      onChange={(e) => setVraceno(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[#d9914e]"
                    />
                    <span>
                      Peníze už jsem hostovi vrátil.{" "}
                      <span className="text-sage/70">
                        Dobropis se vystavuje až po vratce — nepovedená vratka a vystavený
                        doklad je vadný účetní záznam.
                      </span>
                    </span>
                  </label>
                  <div className="mt-3.5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className={TL_HLAVNI}
                      disabled={probiha || duvod.trim().length < 5 || !vraceno}
                      onClick={() => spust(() => opravnyDoklad(kod, d.id, duvod, vraceno))}
                    >
                      {probiha ? "Vystavuji…" : "Vystavit opravný doklad"}
                    </button>
                    <button type="button" className={TL} onClick={() => setOpravuje(null)}>
                      Zpět
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className={TL} disabled={probiha} onClick={() => spust(() => zalohovaFaktura(kod))}>
          Zálohová faktura
        </button>
        <button type="button" className={TL} disabled={probiha} onClick={() => spust(() => konecnaFaktura(kod))}>
          Konečná faktura
        </button>
        <button type="button" className={TL} disabled={probiha} onClick={() => setNedanovy((v) => !v)}>
          Vyúčtování bez DPH
        </button>
      </div>

      {nedanovy && (
        <div className="mt-3 rounded-xl border border-linen/15 bg-night p-4">
          <p className="text-[13.5px] leading-relaxed text-sage">
            Pro stornovací poplatek nebo náhradu škody — <strong className="text-linen">není to
            plnění</strong>, takže se nedaní. Mimořádný úklid nebo ztracený klíč naopak služba
            je a patří na běžnou fakturu.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_9rem]">
            <input
              value={popis}
              onChange={(e) => setPopis(e.target.value)}
              placeholder="Co se účtuje"
              className="w-full rounded-lg border border-linen/15 bg-bark px-3.5 py-2.5 text-[14.5px] text-linen placeholder:text-sage/40 focus:border-ember focus:outline-none"
            />
            <input
              value={castka}
              onChange={(e) => setCastka(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder="Kč"
              className="w-full rounded-lg border border-linen/15 bg-bark px-3.5 py-2.5 text-[14.5px] tabular-nums text-linen placeholder:text-sage/40 focus:border-ember focus:outline-none"
            />
          </div>
          <button
            type="button"
            className={`${TL_HLAVNI} mt-3`}
            disabled={probiha || popis.trim().length < 5 || !Number(castka)}
            onClick={() => spust(() => nedanovyDoklad(kod, popis, Number(castka)))}
          >
            {probiha ? "Vystavuji…" : "Vystavit"}
          </button>
        </div>
      )}

      {hlaska && (
        <p role="status" className={`mt-4 text-[14px] ${hlaska.ok ? "text-emerald-300" : "text-red-300"}`}>
          {hlaska.text}
        </p>
      )}
    </section>
  );
}
