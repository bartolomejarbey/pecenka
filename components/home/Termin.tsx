"use client";

import { useState } from "react";

/**
 * Termín rovnou v hero.
 *
 * Každý web, který prodává noci, má datum hned nahoře — a tenhle měl jen
 * tlačítko „Rezervovat pobyt", za kterým teprve začínal čtyřkrokový průvodce.
 * Host, který přijde s otázkou „je volno o víkendu 20. září?", ji chce
 * položit hned, ne po výběru domku.
 *
 * Obyčejný formulář s GET: bez JavaScriptu odešle a průvodce si termín
 * přečte z adresy. Skript jen hlídá, ať odjezd není před příjezdem, a doplní
 * rozumné výchozí hodnoty. Nativní `<input type="date">` na telefonu otevře
 * systémový kalendář, který je lepší než cokoli, co bychom napsali sami.
 */

const den = (posun: number) => {
  const d = new Date();
  d.setDate(d.getDate() + posun);
  return d.toISOString().slice(0, 10);
};

export default function Termin() {
  const [od, setOd] = useState("");
  const [do_, setDo] = useState("");

  const dnes = den(0);
  // Nejdřív možný odjezd je den po příjezdu; minimum jsou dvě noci, ale to
  // ať řekne průvodce s vysvětlením, ne formulář mlčky.
  const minOdjezd = od ? den(Math.round((new Date(od).getTime() - Date.now()) / 86_400_000) + 2) : den(2);

  return (
    <form
      action="/rezervace"
      method="get"
      className="grid grid-cols-2 gap-2 rounded-[22px] border border-linen/15 bg-night/55 p-2 backdrop-blur-md sm:flex sm:items-stretch"
      aria-label="Ověření dostupnosti"
    >
      <Pole popis="Příjezd">
        <input
          type="date"
          name="prijezd"
          value={od}
          min={dnes}
          onChange={(e) => {
            setOd(e.target.value);
            if (do_ && e.target.value && do_ <= e.target.value) setDo("");
          }}
          className="w-full bg-transparent text-[16px] text-linen outline-none [color-scheme:dark]"
        />
      </Pole>
      <Pole popis="Odjezd">
        <input
          type="date"
          name="odjezd"
          value={do_}
          min={minOdjezd}
          onChange={(e) => setDo(e.target.value)}
          className="w-full bg-transparent text-[16px] text-linen outline-none [color-scheme:dark]"
        />
      </Pole>
      <button
        type="submit"
        className="col-span-2 flex min-h-[56px] items-center justify-center rounded-2xl bg-ember px-6 text-[15.5px] font-semibold text-night transition-colors hover:bg-ember-soft sm:col-span-1 sm:min-w-[190px]"
      >
        {od && do_ ? "Zjistit dostupnost" : "Vybrat termín"}
      </button>
    </form>
  );
}

function Pole({ popis, children }: { popis: string; children: React.ReactNode }) {
  return (
    <label className="flex min-h-[56px] min-w-0 flex-1 flex-col justify-center rounded-2xl px-3.5 py-2 transition-colors hover:bg-linen/[0.05] focus-within:bg-linen/[0.06] sm:px-4">
      <span className="text-[11px] uppercase tracking-[0.16em] text-linen/60">{popis}</span>
      {children}
    </label>
  );
}
