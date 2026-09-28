"use client";

import { useEffect, useMemo, useState } from "react";
import LeafletMapa, { type BodMapy } from "./LeafletMapa";
import { LOCATION } from "@/lib/content";
import {
  KATEGORIE,
  SEZONNOST_POPIS,
  filtrujMista,
  odLomuKm,
  odkazMapy,
  popisProSezonu,
  type Filtr,
  type Misto,
} from "@/lib/okoli";
import { SEZONA_POPIS, sezonaKDatu, type Sezona } from "@/lib/sezona";

/**
 * Mapa okolí s přepínačem léto/zima, filtry a seznamem míst.
 *
 * Výchozí sezónu dostane ze serveru (podle data v pražském čase). Stránka se
 * ale generuje dopředu, takže po připojení v prohlížeči datum zkontrolujeme
 * znovu — kdyby mezitím přišel prosinec. Jakmile host přepne sám, jeho volba
 * platí a kalendář už do toho nemluví.
 */

const TON: Record<Misto["sezona"], string> = {
  leto: "bg-birch/35 text-night",
  zima: "bg-azure/20 text-night",
  celorocne: "bg-night/8 text-night",
};

function SlunceIkona({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2.5M12 19v2.5M2.5 12h2.5M19 12h2.5M5.2 5.2l1.8 1.8M17 17l1.8 1.8M18.8 5.2L17 7M7 17l-1.8 1.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function VlockaIkona({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2L3.8 16.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const plynule = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";

export default function MapaOkoli({
  mista,
  vychoziSezona,
}: {
  mista: Misto[];
  vychoziSezona: Sezona;
}) {
  const [sezona, setSezona] = useState<Sezona>(vychoziSezona);
  const [rucne, setRucne] = useState(false);
  const [filtr, setFiltr] = useState<Filtr>(null);
  const [vybrany, setVybrany] = useState<string | null>(null);

  useEffect(() => {
    if (rucne) return;
    const ted = sezonaKDatu();
    if (ted !== vychoziSezona) setSezona(ted);
  }, [rucne, vychoziSezona]);

  const vybrana = useMemo(() => filtrujMista(mista, sezona, filtr), [mista, sezona, filtr]);
  const body = useMemo<BodMapy[]>(
    () =>
      vybrana.map((m) => ({
        id: m.id,
        nazev: m.nazev,
        lat: m.lat,
        lng: m.lng,
        ton: m.doma ? "doma" : m.sezona,
        podtitul: m.doma ? "Tady jste — Sedmý les" : `${m.misto} · ≈ ${m.autem} min autem`,
      })),
    [vybrana],
  );

  const prepni = (s: Sezona) => {
    setRucne(true);
    setSezona(s);
    setVybrany(null);
  };

  const ukazNaMape = (id: string) => {
    setVybrany(id);
    document.getElementById("mapa-okoli")?.scrollIntoView({ behavior: plynule(), block: "nearest" });
  };

  const vyberZMapy = (id: string) => {
    setVybrany(id);
    document.getElementById(`misto-${id}`)?.scrollIntoView({ behavior: plynule(), block: "nearest" });
  };

  const pocet = (f: Filtr) => filtrujMista(mista, sezona, f).length;
  const FILTRY: { id: Filtr; nazev: string }[] = [
    { id: null, nazev: "Vše" },
    ...KATEGORIE,
    { id: "deti", nazev: "S dětmi" },
  ];

  return (
    <div>
      {/* ===== Přepínač sezóny ===== */}
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div
            role="group"
            aria-label="Roční období"
            className="inline-flex rounded-full border border-night/15 bg-cloud p-1"
          >
            {(["leto", "zima"] as Sezona[]).map((s) => {
              const aktivni = sezona === s;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={aktivni}
                  onClick={() => prepni(s)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-semibold transition-colors duration-200 ${
                    aktivni
                      ? s === "leto"
                        ? "bg-birch-deep text-cloud"
                        : "bg-azure-deep text-cloud"
                      : "text-night/65 hover:text-night"
                  }`}
                >
                  {s === "leto" ? <SlunceIkona /> : <VlockaIkona />}
                  {SEZONA_POPIS[s].nazev}
                </button>
              );
            })}
          </div>
          <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-night/60">
            {rucne
              ? `Přepnuto ručně — ${SEZONA_POPIS[sezona].nazev.toLowerCase()} (${SEZONA_POPIS[sezona].kdy}).`
              : `Podle kalendáře je teď ${SEZONA_POPIS[sezona].nazev.toLowerCase()} (${SEZONA_POPIS[sezona].kdy}).`}{" "}
            {SEZONA_POPIS[sezona].veta}
          </p>
        </div>
        <p className="text-[13.5px] text-night/50" aria-live="polite">
          {vybrana.length} míst · řazeno podle doby jízdy od lomu
        </p>
      </div>

      {/* ===== Filtry ===== */}
      <div role="group" aria-label="Druh aktivity" className="mt-6 flex flex-wrap gap-2">
        {FILTRY.map((f) => {
          const n = pocet(f.id);
          const aktivni = filtr === f.id;
          return (
            <button
              key={f.id ?? "vse"}
              type="button"
              aria-pressed={aktivni}
              disabled={n === 0}
              onClick={() => {
                setFiltr(f.id);
                setVybrany(null);
              }}
              className={`min-h-10 rounded-full border px-4 text-[13.5px] font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-35 ${
                aktivni
                  ? "border-night bg-night text-linen"
                  : "border-night/15 bg-cloud text-night/75 hover:border-night/40 hover:text-night"
              }`}
            >
              {f.nazev} <span className={aktivni ? "text-linen/60" : "text-night/40"}>{n}</span>
            </button>
          );
        })}
      </div>

      {/* ===== Mapa + seznam ===== */}
      <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:gap-8">
        <div id="mapa-okoli" className="lg:col-span-7 lg:sticky lg:top-24 lg:self-start">
          <LeafletMapa
            body={body}
            stred={{ lat: LOCATION.lat, lng: LOCATION.lng }}
            zoom={11}
            vybrany={vybrany}
            onVyber={vyberZMapy}
            prizpusobit
            className="h-[64vw] min-h-[320px] max-h-[520px] lg:h-[calc(100svh-8rem)] lg:max-h-none"
            popisek="Mapa míst v okolí lomu Jílové u Držkova"
          />
          <p className="mt-3 text-[12.5px] leading-relaxed text-night/50">
            Zelená značka léto, modrá zima, oranžová celoročně; větší oranžová je lom.
            Kolečkem přiblížíte po klepnutí do mapy.
          </p>
        </div>

        <ol className="space-y-4 lg:col-span-5">
          {vybrana.map((m) => {
            const aktivni = vybrany === m.id;
            const kategorie = KATEGORIE.find((k) => k.id === m.kategorie)?.nazev;
            return (
              <li key={m.id} id={`misto-${m.id}`} className="scroll-mt-28">
                <article
                  className={`rounded-[24px] border bg-cloud p-6 transition-[border-color,box-shadow] duration-300 ${
                    aktivni
                      ? "border-ember-deep shadow-[0_18px_44px_-28px_rgba(10,20,22,0.55)]"
                      : "border-night/10 hover:border-night/30"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11.5px] font-semibold uppercase tracking-[0.14em]">
                    <span className={`rounded-full px-2.5 py-1 ${TON[m.sezona]}`}>
                      {SEZONNOST_POPIS[m.sezona]}
                    </span>
                    <span className="text-night/50">{kategorie}</span>
                    {m.deti && <span className="text-night/50">· s dětmi</span>}
                  </div>
                  <h3 className="font-display mt-3 text-2xl text-night">{m.nazev}</h3>
                  <p className="mt-1 text-[14px] text-night/60">
                    {m.misto}
                    {!m.doma && ` · ≈ ${odLomuKm(m)} km vzdušnou čarou · ${m.autem} min autem`}
                  </p>
                  <p className="mt-3 text-[15px] leading-relaxed text-night/75">
                    {popisProSezonu(m, sezona)}
                  </p>
                  {m.tip && <p className="mt-2 text-[13.5px] italic leading-relaxed text-shale-deep">{m.tip}</p>}
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[14px] font-semibold">
                    <button
                      type="button"
                      onClick={() => ukazNaMape(m.id)}
                      className="min-h-11 text-ember-deep transition-colors hover:text-night"
                    >
                      Ukázat na mapě
                    </button>
                    <a
                      href={odkazMapy(m)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center text-night/65 transition-colors hover:text-ember-deep"
                    >
                      Otevřít v Mapách ↗
                    </a>
                    {m.web && (
                      <a
                        href={m.web}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center text-night/65 transition-colors hover:text-ember-deep"
                      >
                        Web ↗
                      </a>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
