"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zalozRezervaci } from "@/lib/admin/akce";

/**
 * Rezervace zadaná v administraci.
 *
 * Vypadá jako papír na stole u telefonu: domek, od kdy do kdy, kdo. Cena se
 * spočítá stejně jako u webové rezervace — majitel ji uvidí hned na detailu,
 * takže ji hostovi může říct do telefonu.
 */

const POLE =
  "w-full rounded-xl border border-linen/15 bg-bark px-4 py-2.5 text-[15px] text-linen " +
  "placeholder:text-sage/40 focus:border-ember focus:outline-none";

const DOMKY = [
  { slug: "achat", nazev: "Achát" },
  { slug: "mech", nazev: "Mech" },
  { slug: "cely-les", nazev: "Celý les (oba domky)" },
];

const ZDROJE = [
  { klic: "phone", popis: "Telefon" },
  { klic: "admin", popis: "E-mail nebo osobně" },
];

/** Zítřek jako výchozí příjezd — dnešek už se blokovat nedá. */
function zaDni(dni: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dni);
  return d.toISOString().slice(0, 10);
}

export default function NovaRezervace() {
  const router = useRouter();
  const [probiha, start] = useTransition();
  const [hlaska, setHlaska] = useState<{ ok: boolean; text: string } | null>(null);
  const [v, setV] = useState({
    domek: "achat",
    prijezd: zaDni(7),
    odjezd: zaDni(9),
    hoste: "2",
    jmeno: "",
    email: "",
    telefon: "",
    poznamka: "",
    zdroj: "phone",
  });

  const zmen = (k: keyof typeof v, h: string) => {
    setV((p) => ({ ...p, [k]: h }));
    setHlaska(null);
  };

  const uloz = () =>
    start(async () => {
      const r = await zalozRezervaci(v);
      if (r.ok) {
        setHlaska({ ok: true, text: r.zprava ?? "Založeno." });
        // Rovnou na detail: majitel tam vidí cenu a může říct zálohu do telefonu.
        if (r.kod) router.push(`/admin/rezervace/${r.kod}`);
      } else {
        setHlaska({ ok: false, text: r.chyba });
      }
    });

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        uloz();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[13px] text-sage">Domek</span>
          <select
            value={v.domek}
            onChange={(e) => zmen("domek", e.target.value)}
            className={`mt-1.5 ${POLE}`}
          >
            {DOMKY.map((d) => (
              <option key={d.slug} value={d.slug} className="bg-bark">
                {d.nazev}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[13px] text-sage">Odkud přišla</span>
          <select
            value={v.zdroj}
            onChange={(e) => zmen("zdroj", e.target.value)}
            className={`mt-1.5 ${POLE}`}
          >
            {ZDROJE.map((z) => (
              <option key={z.klic} value={z.klic} className="bg-bark">
                {z.popis}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[13px] text-sage">Příjezd</span>
          <input
            type="date"
            value={v.prijezd}
            onChange={(e) => zmen("prijezd", e.target.value)}
            className={`mt-1.5 ${POLE}`}
          />
        </label>

        <label className="block">
          <span className="text-[13px] text-sage">Odjezd</span>
          <input
            type="date"
            value={v.odjezd}
            onChange={(e) => zmen("odjezd", e.target.value)}
            className={`mt-1.5 ${POLE}`}
          />
        </label>

        <label className="block">
          <span className="text-[13px] text-sage">Počet hostů</span>
          <input
            type="number"
            min={1}
            max={4}
            value={v.hoste}
            onChange={(e) => zmen("hoste", e.target.value)}
            className={`mt-1.5 ${POLE}`}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-[13px] text-sage">Jméno hosta</span>
          <input
            value={v.jmeno}
            onChange={(e) => zmen("jmeno", e.target.value)}
            placeholder="Jana Nováková"
            className={`mt-1.5 ${POLE}`}
          />
        </label>
        <label className="block">
          <span className="text-[13px] text-sage">E-mail</span>
          <input
            type="email"
            value={v.email}
            onChange={(e) => zmen("email", e.target.value)}
            placeholder="jana@example.cz"
            className={`mt-1.5 ${POLE}`}
          />
        </label>
        <label className="block">
          <span className="text-[13px] text-sage">Telefon</span>
          <input
            value={v.telefon}
            onChange={(e) => zmen("telefon", e.target.value)}
            placeholder="+420 …"
            className={`mt-1.5 ${POLE}`}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-[13px] text-sage">Poznámka</span>
        <textarea
          value={v.poznamka}
          onChange={(e) => zmen("poznamka", e.target.value)}
          rows={2}
          placeholder="Co si host přál, na čem jste se domluvili."
          className={`mt-1.5 resize-y ${POLE}`}
        />
      </label>

      <p className="text-[13px] leading-relaxed text-sage/80">
        Cena se spočítá z ceníku stejně jako u webové rezervace. Při příjezdu za
        víc než 48 hodin se termín rovnou zablokuje a drží se tři dny na zálohu;
        u bližších termínů vznikne poptávka, kterou potvrdíte ručně.
      </p>

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
        {probiha ? "Zakládám…" : "Založit rezervaci"}
      </button>
    </form>
  );
}
