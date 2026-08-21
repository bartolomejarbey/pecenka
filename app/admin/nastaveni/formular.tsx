"use client";

import { useState, useTransition } from "react";
import { ulozFirmu } from "@/lib/admin/akce";

/**
 * Fakturační údaje.
 *
 * Jeden formulář, jedno tlačítko. Kontroly běží na serveru — kontrolní
 * číslice IČO i účtu se dá spočítat a chyba se pak pozná hned, ne až
 * na první faktuře.
 */

const POLE =
  "w-full rounded-xl border border-linen/15 bg-bark px-4 py-2.5 text-[15px] text-linen " +
  "placeholder:text-sage/40 focus:border-ember focus:outline-none";

export type Hodnoty = {
  nazev: string;
  ico: string;
  dic: string;
  ulice: string;
  mesto: string;
  psc: string;
  ucet: string;
  platceDph: boolean;
  poplatekKc: string;
  vyhlaska: string;
  zalohaProcent: string;
  kauceKc: string;
  splatnostDni: string;
};

function Pole({
  jmeno,
  popis,
  hodnota,
  zmen,
  napoveda,
  drzitel,
  sirka = "",
  typ = "text",
}: {
  jmeno: keyof Hodnoty;
  popis: string;
  hodnota: string;
  zmen: (k: keyof Hodnoty, v: string) => void;
  napoveda?: string;
  drzitel?: string;
  sirka?: string;
  typ?: string;
}) {
  return (
    <label className={`block ${sirka}`}>
      <span className="text-[13px] text-sage">{popis}</span>
      <input
        name={jmeno}
        type={typ}
        inputMode={typ === "text" ? undefined : "decimal"}
        value={hodnota}
        onChange={(e) => zmen(jmeno, e.target.value)}
        placeholder={drzitel}
        className={`mt-1.5 ${POLE}`}
      />
      {napoveda && <span className="mt-1.5 block text-[12.5px] leading-relaxed text-sage/70">{napoveda}</span>}
    </label>
  );
}

export default function FormularFirmy({ vychozi }: { vychozi: Hodnoty }) {
  const [v, setV] = useState(vychozi);
  const [probiha, start] = useTransition();
  const [hlaska, setHlaska] = useState<{ ok: boolean; text: string } | null>(null);

  const zmen = (k: keyof Hodnoty, hodnota: string) => {
    setV((p) => ({ ...p, [k]: hodnota }));
    setHlaska(null);
  };

  const uloz = () =>
    start(async () => {
      const r = await ulozFirmu(v);
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Pole
          jmeno="nazev"
          popis="Jméno podnikatele nebo název firmy"
          hodnota={v.nazev}
          zmen={zmen}
          sirka="sm:col-span-2"
          drzitel="Jan Novák"
          napoveda="Přesně tak, jak je to zapsané v živnostenském rejstříku."
        />
        <Pole jmeno="ico" popis="IČO" hodnota={v.ico} zmen={zmen} drzitel="27074358" />
        <Pole
          jmeno="dic"
          popis="DIČ"
          hodnota={v.dic}
          zmen={zmen}
          drzitel="CZ27074358"
          napoveda="Nechte prázdné, pokud nejste plátce DPH."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-[2fr_1.4fr_0.8fr]">
        <Pole jmeno="ulice" popis="Ulice a číslo" hodnota={v.ulice} zmen={zmen} drzitel="Jílové 42" />
        <Pole jmeno="mesto" popis="Obec" hodnota={v.mesto} zmen={zmen} drzitel="Jílové u Držkova" />
        <Pole jmeno="psc" popis="PSČ" hodnota={v.psc} zmen={zmen} drzitel="46822" />
      </div>

      <Pole
        jmeno="ucet"
        popis="Bankovní účet"
        hodnota={v.ucet}
        zmen={zmen}
        drzitel="1920001453/0800"
        napoveda="Stačí běžný tvar s lomítkem, IBAN si dopočítáme. Z tohohle účtu se skládá QR platba."
      />

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-linen/10 bg-bark px-4 py-3">
        <input
          type="checkbox"
          checked={v.platceDph}
          onChange={(e) => {
            setV((p) => ({ ...p, platceDph: e.target.checked }));
            setHlaska(null);
          }}
          className="mt-1 h-4 w-4 accent-ember"
        />
        <span>
          <span className="block text-[15px] text-linen">Jsem plátce DPH</span>
          <span className="mt-0.5 block text-[12.5px] leading-relaxed text-sage/70">
            Ubytování má sazbu 12 %, alkohol 21 %. Zapnutím se změní všechny doklady vystavené
            od té chvíle — dřívější zůstanou, jak byly.
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Pole
          jmeno="poplatekKc"
          popis="Poplatek z pobytu (Kč za osobu a započatý den)"
          hodnota={v.poplatekKc}
          zmen={zmen}
          typ="number"
          drzitel="0"
          napoveda="Nula znamená, že obec poplatek nezavedla. Ověřte to na obecním úřadě."
        />
        <Pole
          jmeno="vyhlaska"
          popis="Číslo vyhlášky obce"
          hodnota={v.vyhlaska}
          zmen={zmen}
          drzitel="OZV č. 1/2025"
          napoveda="Patří na doklad jako důvod účtování poplatku."
        />
        <Pole
          jmeno="zalohaProcent"
          popis="Záloha (% z ceny pobytu)"
          hodnota={v.zalohaProcent}
          zmen={zmen}
          typ="number"
          drzitel="50"
        />
        <Pole
          jmeno="kauceKc"
          popis="Kauce (Kč)"
          hodnota={v.kauceKc}
          zmen={zmen}
          typ="number"
          drzitel="3000"
          napoveda="Neúčtuje se předem. Slouží jako strop případné náhrady škody."
        />
        <Pole
          jmeno="splatnostDni"
          popis="Splatnost faktur (dní)"
          hodnota={v.splatnostDni}
          zmen={zmen}
          typ="number"
          drzitel="14"
        />
      </div>

      {hlaska && (
        <p
          className={`rounded-xl px-4 py-3 text-[14.5px] ${
            hlaska.ok ? "bg-ok/15 text-ok" : "bg-vazne/15 text-vazne"
          }`}
          role="status"
        >
          {hlaska.text}
        </p>
      )}

      <button
        type="submit"
        disabled={probiha}
        className="w-full rounded-xl bg-ember px-5 py-3 text-[15px] font-semibold text-night transition-colors hover:bg-ember-soft disabled:opacity-50 sm:w-auto"
      >
        {probiha ? "Ukládám…" : "Uložit údaje"}
      </button>
    </form>
  );
}
