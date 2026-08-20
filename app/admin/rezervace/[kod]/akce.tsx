"use client";

import { useState, useTransition } from "react";
import { oznacZaplaceno, potvrdRezervaci, zmenStav, zrusRezervaci, type Vysledek } from "@/lib/admin/akce";

/**
 * Jedno velké tlačítko pro krok, na kterém rezervace stojí.
 *
 * Záměrně jedno, ne pět — když se majitel dívá na rezervaci, ve většině
 * případů je zřejmé, co se má stát dál. Ostatní možnosti jsou pod „Další".
 */

const HLAVNI =
  "w-full rounded-xl bg-ember px-5 py-3 text-[15px] font-semibold text-night transition-colors " +
  "hover:bg-ember-soft disabled:opacity-50 sm:w-auto";
const VEDLEJSI =
  "rounded-xl border border-linen/15 px-4 py-2.5 text-[14px] text-sage transition-colors " +
  "hover:border-linen/30 hover:text-linen disabled:opacity-50";

export default function Akce({
  kod,
  uzel,
  zalohaId,
  doplatekId,
}: {
  kod: string;
  uzel: string;
  zalohaId: string | null;
  doplatekId: string | null;
}) {
  const [probiha, start] = useTransition();
  const [hlaska, setHlaska] = useState<{ ok: boolean; text: string } | null>(null);
  const [stornujeSe, setStornujeSe] = useState(false);
  const [duvod, setDuvod] = useState("");

  const spust = (fn: () => Promise<Vysledek>) =>
    start(async () => {
      const v = await fn();
      setHlaska(v.ok ? { ok: true, text: v.zprava ?? "Hotovo." } : { ok: false, text: v.chyba });
      if (v.ok) setStornujeSe(false);
    });

  const hlavni = (() => {
    switch (uzel) {
      case "potvrzeno":
        return { popis: "Potvrdit rezervaci", akce: () => potvrdRezervaci(kod) };
      case "zaloha":
        return zalohaId
          ? { popis: "Záloha dorazila", akce: () => oznacZaplaceno(zalohaId) }
          : null;
      case "doplatek":
        return doplatekId
          ? { popis: "Doplatek dorazil", akce: () => oznacZaplaceno(doplatekId) }
          : null;
      case "prijezd":
        return { popis: "Host se ubytoval", akce: () => zmenStav(kod, "checked_in") };
      case "odjezd":
        return { popis: "Host odjel", akce: () => zmenStav(kod, "checked_out") };
      default:
        return null;
    }
  })();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {hlavni && (
          <button type="button" className={HLAVNI} disabled={probiha} onClick={() => spust(hlavni.akce)}>
            {probiha ? "Pracuji…" : hlavni.popis}
          </button>
        )}
        {uzel === "prijezd" && (
          <button
            type="button"
            className={VEDLEJSI}
            disabled={probiha}
            onClick={() => spust(() => zmenStav(kod, "no_show"))}
          >
            Nedorazil
          </button>
        )}
        {!stornujeSe && (
          <button type="button" className={VEDLEJSI} onClick={() => setStornujeSe(true)}>
            Stornovat
          </button>
        )}
      </div>

      {stornujeSe && (
        <div className="rounded-xl border border-linen/15 bg-night p-4">
          <label htmlFor="duvod" className="text-[13px] uppercase tracking-[0.14em] text-sage/70">
            Důvod storna
          </label>
          <input
            id="duvod"
            value={duvod}
            onChange={(e) => setDuvod(e.target.value)}
            placeholder="Napiš, proč se ruší — objeví se v historii i na dokladu."
            className="mt-2 w-full rounded-lg border border-linen/15 bg-bark px-3.5 py-2.5 text-[14.5px] text-linen placeholder:text-sage/40 focus:border-ember focus:outline-none"
          />
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              className="rounded-xl bg-red-500/80 px-4 py-2.5 text-[14px] font-semibold text-linen transition-colors hover:bg-red-500 disabled:opacity-50"
              disabled={probiha || duvod.trim().length < 5}
              onClick={() => spust(() => zrusRezervaci(kod, duvod))}
            >
              Opravdu stornovat
            </button>
            <button type="button" className={VEDLEJSI} onClick={() => setStornujeSe(false)}>
              Zpět
            </button>
          </div>
        </div>
      )}

      {hlaska && (
        <p
          role="status"
          className={`text-[14px] ${hlaska.ok ? "text-emerald-300" : "text-red-300"}`}
        >
          {hlaska.text}
        </p>
      )}
    </div>
  );
}
