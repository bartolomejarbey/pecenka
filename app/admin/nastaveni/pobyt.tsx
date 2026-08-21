"use client";

import { useState, useTransition } from "react";
import { ulozInfoOPobytu } from "@/lib/admin/akce";
import type { InfoOPobytu } from "@/lib/admin/pobyt";

/**
 * Informace, které host uvidí po přihlášení do portálu.
 *
 * Jeden formulář na domek — klíče i wifi se liší. Prázdné pole se hostovi
 * neukáže vůbec; lepší než prázdná kolonka nebo vymyšlený údaj.
 */

const POLE =
  "w-full rounded-xl border border-linen/15 bg-bark px-3.5 py-2.5 text-[15px] text-linen " +
  "placeholder:text-sage/40 focus:border-ember focus:outline-none";

export default function Pobyt({ domky }: { domky: InfoOPobytu[] }) {
  const [ktery, setKtery] = useState(0);
  const [stav, setStav] = useState(domky);
  const [probiha, start] = useTransition();
  const [hlaska, setHlaska] = useState<{ ok: boolean; text: string } | null>(null);

  if (!domky.length) return null;
  const v = stav[ktery];

  const zmen = (k: keyof InfoOPobytu, h: string) => {
    setStav((p) => p.map((d, i) => (i === ktery ? { ...d, [k]: h } : d)));
    setHlaska(null);
  };

  const uloz = () =>
    start(async () => {
      const r = await ulozInfoOPobytu(v);
      setHlaska(r.ok ? { ok: true, text: r.zprava ?? "Uloženo." } : { ok: false, text: r.chyba });
    });

  return (
    <form
      className="space-y-5 px-5 py-5"
      onSubmit={(e) => {
        e.preventDefault();
        uloz();
      }}
    >
      <div className="flex flex-wrap gap-2">
        {stav.map((d, i) => (
          <button
            key={d.domek}
            type="button"
            onClick={() => {
              setKtery(i);
              setHlaska(null);
            }}
            className={`rounded-xl px-4 py-2 text-[14px] transition-colors ${
              i === ktery
                ? "bg-ember font-semibold text-night"
                : "border border-linen/15 text-sage hover:text-linen"
            }`}
          >
            {d.domekNazev}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="text-[13px] text-sage">Přesná adresa</span>
        <input
          value={v.adresa}
          onChange={(e) => zmen("adresa", e.target.value)}
          placeholder="Jílové u Držkova 42, 468 22"
          className={`mt-1.5 ${POLE}`}
        />
        <span className="mt-1.5 block text-[12.5px] text-sage/70">
          Na webu není schválně — host ji uvidí až po zaplacení zálohy.
        </span>
      </label>

      <label className="block">
        <span className="text-[13px] text-sage">Odkaz do mapy</span>
        <input
          value={v.mapa}
          onChange={(e) => zmen("mapa", e.target.value)}
          placeholder="https://mapy.cz/…"
          className={`mt-1.5 ${POLE}`}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[13px] text-sage">Příjezd od</span>
          <input type="time" value={v.prijezdOd} onChange={(e) => zmen("prijezdOd", e.target.value)}
            className={`mt-1.5 ${POLE}`} />
        </label>
        <label className="block">
          <span className="text-[13px] text-sage">Odjezd do</span>
          <input type="time" value={v.odjezdDo} onChange={(e) => zmen("odjezdDo", e.target.value)}
            className={`mt-1.5 ${POLE}`} />
        </label>
      </div>

      <label className="block">
        <span className="text-[13px] text-sage">Jak se dostane dovnitř</span>
        <textarea
          rows={2}
          value={v.klice}
          onChange={(e) => zmen("klice", e.target.value)}
          placeholder="Klíč je ve schránce vpravo od dveří, kód 1234."
          className={`mt-1.5 resize-y ${POLE}`}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[13px] text-sage">Wi-Fi síť</span>
          <input value={v.wifiSit} onChange={(e) => zmen("wifiSit", e.target.value)}
            placeholder="SedmyLes-Achat" className={`mt-1.5 ${POLE}`} />
        </label>
        <label className="block">
          <span className="text-[13px] text-sage">Wi-Fi heslo</span>
          <input value={v.wifiHeslo} onChange={(e) => zmen("wifiHeslo", e.target.value)}
            className={`mt-1.5 ${POLE}`} />
        </label>
      </div>

      <label className="block">
        <span className="text-[13px] text-sage">Co je dobré vědět</span>
        <textarea
          rows={3}
          value={v.poznamky}
          onChange={(e) => zmen("poznamky", e.target.value)}
          placeholder="Topení, teplá voda, kam s odpadem, kde je dřevo."
          className={`mt-1.5 resize-y ${POLE}`}
        />
      </label>

      <label className="block">
        <span className="text-[13px] text-sage">Telefon, když je něco potřeba</span>
        <input value={v.telefon} onChange={(e) => zmen("telefon", e.target.value)}
          placeholder="+420 …" className={`mt-1.5 ${POLE}`} />
      </label>

      {hlaska && (
        <p
          role="status"
          className={`rounded-xl px-4 py-3 text-[14.5px] ${
            hlaska.ok ? "bg-ok/15 text-ok" : "bg-vazne/15 text-vazne"
          }`}
        >
          {hlaska.text}
        </p>
      )}

      <button
        type="submit"
        disabled={probiha}
        className="w-full rounded-xl bg-ember px-5 py-3 text-[15px] font-semibold text-night transition-colors hover:bg-ember-soft disabled:opacity-50 sm:w-auto"
      >
        {probiha ? "Ukládám…" : `Uložit pro ${v.domekNazev}`}
      </button>
    </form>
  );
}
