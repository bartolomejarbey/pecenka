"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { otevriTermin, zavriTermin, zmenCenu } from "@/lib/admin/akce";

/**
 * Zavírání termínů a přepisování cen.
 *
 * Dvě věci, které majitel dělá běžně a dosud nešly vůbec: vyřadit domek na
 * údržbu nebo vlastní pobyt a zvednout cenu na konkrétní týden.
 */

const POLE =
  "w-full rounded-xl border border-linen/15 bg-bark px-3.5 py-2.5 text-[15px] text-linen " +
  "placeholder:text-sage/40 focus:border-ember focus:outline-none";

const DOMKY = [
  { slug: "achat", nazev: "Achát" },
  { slug: "mech", nazev: "Mech" },
];

const DRUHY = [
  { klic: "maintenance", popis: "Údržba" },
  { klic: "owner", popis: "Vlastní pobyt" },
  { klic: "closed", popis: "Zavřeno" },
];

export type Zavreno = {
  id: string;
  domek: string;
  domekNazev: string;
  od: string;
  do: string;
  druh: string;
  duvod: string | null;
};

function zaDni(dni: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dni);
  return d.toISOString().slice(0, 10);
}

const den = (s: string) => new Date(s).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });

export default function Upravy({ zavreno }: { zavreno: Zavreno[] }) {
  const router = useRouter();
  const [probiha, start] = useTransition();
  const [hlaska, setHlaska] = useState<{ ok: boolean; text: string } | null>(null);
  const [karta, setKarta] = useState<"zavrit" | "cena">("zavrit");

  const [blok, setBlok] = useState({
    domek: "achat",
    od: zaDni(7),
    do: zaDni(9),
    druh: "maintenance",
    duvod: "",
  });
  const [cena, setCena] = useState({
    domek: "achat",
    od: zaDni(7),
    do: zaDni(13),
    cenaKc: "3490",
    minNoci: "2",
  });

  const spust = (fn: () => Promise<{ ok: boolean; zprava?: string; chyba?: string }>) =>
    start(async () => {
      const v = await fn();
      setHlaska(v.ok ? { ok: true, text: v.zprava ?? "Hotovo." } : { ok: false, text: v.chyba ?? "Nepovedlo se." });
      if (v.ok) router.refresh();
    });

  return (
    <section className="mt-6 rounded-2xl border border-linen/10 bg-bark p-5">
      <div className="flex flex-wrap gap-2">
        {[
          { klic: "zavrit" as const, popis: "Zavřít termín" },
          { klic: "cena" as const, popis: "Změnit cenu" },
        ].map((z) => (
          <button
            key={z.klic}
            type="button"
            onClick={() => {
              setKarta(z.klic);
              setHlaska(null);
            }}
            className={`rounded-xl px-4 py-2 text-[14px] transition-colors ${
              karta === z.klic
                ? "bg-ember text-night font-semibold"
                : "border border-linen/15 text-sage hover:text-linen"
            }`}
          >
            {z.popis}
          </button>
        ))}
      </div>

      {karta === "zavrit" ? (
        <form
          className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          onSubmit={(e) => {
            e.preventDefault();
            spust(() => zavriTermin(blok));
          }}
        >
          <label className="block">
            <span className="text-[13px] text-sage">Domek</span>
            <select
              value={blok.domek}
              onChange={(e) => setBlok((p) => ({ ...p, domek: e.target.value }))}
              className={`mt-1.5 ${POLE}`}
            >
              {DOMKY.map((d) => (
                <option key={d.slug} value={d.slug} className="bg-bark">{d.nazev}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[13px] text-sage">Od</span>
            <input type="date" value={blok.od}
              onChange={(e) => setBlok((p) => ({ ...p, od: e.target.value }))}
              className={`mt-1.5 ${POLE}`} />
          </label>
          <label className="block">
            <span className="text-[13px] text-sage">Do (nezahrnuje)</span>
            <input type="date" value={blok.do}
              onChange={(e) => setBlok((p) => ({ ...p, do: e.target.value }))}
              className={`mt-1.5 ${POLE}`} />
          </label>
          <label className="block">
            <span className="text-[13px] text-sage">Důvod</span>
            <select
              value={blok.druh}
              onChange={(e) => setBlok((p) => ({ ...p, druh: e.target.value }))}
              className={`mt-1.5 ${POLE}`}
            >
              {DRUHY.map((d) => (
                <option key={d.klic} value={d.klic} className="bg-bark">{d.popis}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[13px] text-sage">Poznámka</span>
            <input value={blok.duvod}
              onChange={(e) => setBlok((p) => ({ ...p, duvod: e.target.value }))}
              placeholder="Výměna bojleru"
              className={`mt-1.5 ${POLE}`} />
          </label>

          <div className="sm:col-span-2 lg:col-span-5">
            <button type="submit" disabled={probiha}
              className="rounded-xl bg-ember px-5 py-2.5 text-[14.5px] font-semibold text-night transition-colors hover:bg-ember-soft disabled:opacity-50">
              {probiha ? "Zavírám…" : "Zavřít termín"}
            </button>
          </div>
        </form>
      ) : (
        <form
          className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          onSubmit={(e) => {
            e.preventDefault();
            spust(() => zmenCenu(cena));
          }}
        >
          <label className="block">
            <span className="text-[13px] text-sage">Domek</span>
            <select
              value={cena.domek}
              onChange={(e) => setCena((p) => ({ ...p, domek: e.target.value }))}
              className={`mt-1.5 ${POLE}`}
            >
              {DOMKY.map((d) => (
                <option key={d.slug} value={d.slug} className="bg-bark">{d.nazev}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[13px] text-sage">Od</span>
            <input type="date" value={cena.od}
              onChange={(e) => setCena((p) => ({ ...p, od: e.target.value }))}
              className={`mt-1.5 ${POLE}`} />
          </label>
          <label className="block">
            <span className="text-[13px] text-sage">Do (včetně)</span>
            <input type="date" value={cena.do}
              onChange={(e) => setCena((p) => ({ ...p, do: e.target.value }))}
              className={`mt-1.5 ${POLE}`} />
          </label>
          <label className="block">
            <span className="text-[13px] text-sage">Cena za noc (Kč)</span>
            <input type="number" value={cena.cenaKc}
              onChange={(e) => setCena((p) => ({ ...p, cenaKc: e.target.value }))}
              className={`mt-1.5 ${POLE}`} />
          </label>
          <label className="block">
            <span className="text-[13px] text-sage">Minimum nocí</span>
            <input type="number" min={1} max={30} value={cena.minNoci}
              onChange={(e) => setCena((p) => ({ ...p, minNoci: e.target.value }))}
              className={`mt-1.5 ${POLE}`} />
          </label>

          <div className="sm:col-span-2 lg:col-span-5">
            <button type="submit" disabled={probiha}
              className="rounded-xl bg-ember px-5 py-2.5 text-[14.5px] font-semibold text-night transition-colors hover:bg-ember-soft disabled:opacity-50">
              {probiha ? "Ukládám…" : "Přepsat ceny"}
            </button>
            <p className="mt-3 text-[13px] leading-relaxed text-sage/80">
              Přepsané ceny se označí jako ruční, takže je případné přegenerování
              ceníku nevrátí zpátky. Už založené rezervace se nemění — cena se
              u nich zmrazila při objednání.
            </p>
          </div>
        </form>
      )}

      {hlaska && (
        <p
          role="status"
          className={`mt-4 rounded-xl px-4 py-3 text-[14.5px] ${
            hlaska.ok ? "bg-ok/15 text-ok" : "bg-vazne/15 text-vazne"
          }`}
        >
          {hlaska.text}
        </p>
      )}

      {zavreno.length > 0 && (
        <div className="mt-6 border-t border-linen/10 pt-4">
          <p className="text-[13px] uppercase tracking-[0.14em] text-sage/70">Zavřené termíny</p>
          <ul className="mt-3 divide-y divide-linen/8">
            {zavreno.map((z) => (
              <li key={z.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span className="text-[14.5px] text-linen">
                  {z.domekNazev} · {den(z.od)} – {den(z.do)}
                  <span className="ml-2.5 text-sage">
                    {DRUHY.find((d) => d.klic === z.druh)?.popis ?? z.druh}
                    {z.duvod ? ` · ${z.duvod}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={probiha}
                  onClick={() => spust(() => otevriTermin(z.id))}
                  className="rounded-lg border border-linen/15 px-3 py-1.5 text-[13px] text-sage transition-colors hover:border-linen/30 hover:text-linen disabled:opacity-50"
                >
                  Otevřít
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
