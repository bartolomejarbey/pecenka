"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { calcPrice, formatHalere, isRangeFree, validateRange, type Cenik } from "@/lib/booking";

/**
 * Kolik bude stát můj víkend.
 *
 * Ceník říkal „2 890 Kč ve všední den, 3 490 Kč o víkendu, +400 Kč v sezóně,
 * −10 % nad týden" a nechal hosta to složit v hlavě. Většina lidí sem přijde
 * s konkrétním víkendem a jednou otázkou. Tohle na ni odpoví a rovnou pustí
 * dál do rezervace s vyplněným termínem.
 *
 * Počítá stejnou funkcí jako průvodce a server (`calcPrice`), z téhož ceníku
 * — takže číslo tady a číslo v souhrnu rezervace nemůžou být jiné.
 */
export default function Kalkulacka({
  ceniky,
  obsazene,
}: {
  ceniky: Record<string, Cenik>;
  obsazene: Record<string, string[]>;
}) {
  const [od, setOd] = useState("");
  const [do_, setDo] = useState("");

  const dnes = new Date().toISOString().slice(0, 10);

  type Vysledek =
    | { chyba: string }
    | { domky: { slug: string; cena: ReturnType<typeof calcPrice>; volno: boolean }[] };

  const vysledek = useMemo((): Vysledek | null => {
    if (!od || !do_) return null;
    const a = new Date(`${od}T12:00:00`);
    const b = new Date(`${do_}T12:00:00`);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b <= a) return null;

    const chyba = validateRange(a, b, 2);
    if (chyba) return { chyba };

    const domky = Object.entries(ceniky).map(([slug, cenik]) => {
      const cena = calcPrice(a, b, {}, cenik);
      return {
        slug,
        cena,
        volno: isRangeFree(new Set(obsazene[slug] ?? []), a, b),
      };
    });
    return { domky };
  }, [od, do_, ceniky, obsazene]);

  const nazev = (slug: string) => (slug === "achat" ? "Achát" : slug === "mech" ? "Mech" : slug);
  const noci = (n: number) => `${n} ${n === 1 ? "noc" : n < 5 ? "noci" : "nocí"}`;

  return (
    <div className="rounded-[28px] border border-night/10 bg-linen p-6 md:p-8">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[12px] uppercase tracking-[0.14em] text-night/55">Příjezd</span>
          <input
            type="date"
            value={od}
            min={dnes}
            onChange={(e) => {
              setOd(e.target.value);
              if (do_ && do_ <= e.target.value) setDo("");
            }}
            className="mt-1.5 w-full rounded-xl border border-night/15 bg-white/60 px-4 py-3 text-[16px] text-night outline-none focus:border-ember-deep"
          />
        </label>
        <label className="block">
          <span className="text-[12px] uppercase tracking-[0.14em] text-night/55">Odjezd</span>
          <input
            type="date"
            value={do_}
            min={od || dnes}
            onChange={(e) => setDo(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-night/15 bg-white/60 px-4 py-3 text-[16px] text-night outline-none focus:border-ember-deep"
          />
        </label>
      </div>

      <div className="mt-5 min-h-[72px]" aria-live="polite">
        {!vysledek && (
          <p className="text-[15px] leading-relaxed text-night/60">
            Vyberte termín a hned uvidíte cenu za celý pobyt — včetně víkendů, sezóny
            i slevy za týden.
          </p>
        )}
        {vysledek && "chyba" in vysledek && (
          <p className="text-[15px] leading-relaxed text-night/70">{vysledek.chyba}</p>
        )}
        {vysledek && "domky" in vysledek && (
          <ul className="divide-y divide-night/10">
            {vysledek.domky.map((d) => (
              <li key={d.slug} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-display text-xl text-night">{nazev(d.slug)}</p>
                  <p className="text-[13.5px] text-night/60">
                    {noci(d.cena.nights)}
                    {d.cena.weekDiscount > 0 && ` · sleva ${formatHalere(d.cena.weekDiscount)}`}
                    {!d.volno && " · v tomhle termínu obsazeno"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className={`font-display text-2xl ${d.volno ? "text-night" : "text-night/40 line-through"}`}>
                    {formatHalere(d.cena.total)}
                  </p>
                  {d.volno && (
                    <Link
                      href={`/rezervace?domek=${d.slug}&prijezd=${od}&odjezd=${do_}`}
                      className="flex min-h-11 items-center rounded-full bg-ember-deep px-5 text-[14.5px] font-semibold text-linen transition-colors hover:bg-ember"
                    >
                      Rezervovat
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
