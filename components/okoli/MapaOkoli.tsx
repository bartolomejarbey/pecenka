"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import LeafletMapa, { type BodMapy, type Vrstva } from "./LeafletMapa";
import { Kicker } from "@/components/ui";
import { LOCATION } from "@/lib/content";
import {
  KATEGORIE,
  SEZONNOST_POPIS,
  filtrujMista,
  fotoMista,
  odLomuKm,
  odkazMapy,
  popisProSezonu,
  vybraneProSezonu,
  type Filtr,
  type Kategorie,
  type Misto,
} from "@/lib/okoli";
import { SEZONA_POPIS, sezonaKDatu, type Sezona } from "@/lib/sezona";

/**
 * Mapa okolí: přepínač léto/zima, satelitní nebo turistický podklad, filtry,
 * tři vybraná místa pro sezónu a mřížka míst po kategoriích s fotkami.
 *
 * Výchozí sezónu dostane ze serveru (podle data v pražském čase). Stránka se
 * generuje dopředu, takže po připojení v prohlížeči datum zkontrolujeme
 * znovu — kdyby mezitím přišel prosinec. Jakmile host přepne sám, jeho volba
 * platí a kalendář už do toho nemluví.
 *
 * Jedna klientská komponenta přes dvě sekce (tmavou s mapou a světlou se
 * seznamem), protože obě sdílejí týž stav: co je vybrané na mapě, je
 * zvýrazněné v seznamu a naopak.
 */

const TON: Record<Misto["sezona"], string> = {
  leto: "bg-birch text-night",
  zima: "bg-azure-soft text-night",
  celorocne: "bg-ember text-night",
};

const LEGENDA: { ton: Misto["sezona"] | "doma"; nazev: string; barva: string }[] = [
  { ton: "leto", nazev: "léto", barva: "bg-birch" },
  { ton: "zima", nazev: "zima", barva: "bg-azure-soft" },
  { ton: "celorocne", nazev: "celoročně", barva: "bg-ember" },
  { ton: "doma", nazev: "lom a domky", barva: "bg-ember ring-4 ring-ember/30" },
];

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

/** Drobný popisek autora přes roh fotky — licence CC BY(-SA) ho vyžadují. */
function Kredit({ id, className = "" }: { id: string; className?: string }) {
  const f = fotoMista(id);
  if (!f || f.licence === "vlastní") return null;
  return (
    <a
      href={f.zdroj}
      target="_blank"
      rel="noopener noreferrer"
      className={`absolute bottom-2 right-2 z-20 inline-flex min-h-6 items-center rounded-full bg-night/65 px-2.5 text-[10px] leading-none text-linen/80 backdrop-blur-sm hover:text-linen ${className}`}
      title={`${f.autor}, ${f.licence}, Wikimedia Commons`}
    >
      © {f.autor} · {f.licence}
    </a>
  );
}

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
  const [vrstva, setVrstva] = useState<Vrstva>("satelit");
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
        foto: fotoMista(m.id)?.src,
      })),
    [vybrana],
  );
  const vybrane = useMemo(() => (filtr === null ? vybraneProSezonu(mista, sezona) : []), [mista, sezona, filtr]);
  const skupiny = useMemo(
    () =>
      KATEGORIE.map((k) => ({ ...k, mista: vybrana.filter((m) => m.kategorie === k.id) })).filter(
        (k) => k.mista.length > 0,
      ),
    [vybrana],
  );
  const vybranyMisto = vybrany ? mista.find((m) => m.id === vybrany) ?? null : null;

  const prepni = (s: Sezona) => {
    setRucne(true);
    setSezona(s);
    setVybrany(null);
  };

  const ukazNaMape = (id: string) => {
    setVybrany(id);
    document.getElementById("mapa-okoli")?.scrollIntoView({ behavior: plynule(), block: "start" });
  };

  const naKartu = (id: string) => {
    document.getElementById(`misto-${id}`)?.scrollIntoView({ behavior: plynule(), block: "center" });
  };

  const pocet = (f: Filtr) => filtrujMista(mista, sezona, f).length;
  const FILTRY: { id: Filtr; nazev: string }[] = [
    { id: null, nazev: "Vše" },
    ...KATEGORIE,
    { id: "deti", nazev: "S dětmi" },
  ];

  return (
    <>
      {/* ===== Kapitola I · Mapa (tmavá) ===== */}
      <section id="mapa-okoli" className="grain relative scroll-mt-20 overflow-hidden bg-night pb-10 pt-16 md:pt-20">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <Kicker>Kapitola I · Mapa</Kicker>
          <h2 className="font-display mt-6 max-w-3xl text-4xl text-linen md:text-6xl">
            Sedmý les je uprostřed. <span className="accent-italic">Všechno ostatní kolem.</span>
          </h2>

          <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div
                role="group"
                aria-label="Roční období"
                className="inline-flex rounded-full border border-linen/15 bg-bark p-1"
              >
                {(["leto", "zima"] as Sezona[]).map((s) => {
                  const aktivni = sezona === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={aktivni}
                      onClick={() => prepni(s)}
                      className={`inline-flex min-h-12 items-center gap-2.5 rounded-full px-6 text-[15px] font-semibold transition-colors duration-200 ${
                        aktivni
                          ? s === "leto"
                            ? "bg-birch text-night"
                            : "bg-azure-soft text-night"
                          : "text-sage hover:text-linen"
                      }`}
                    >
                      {s === "leto" ? <SlunceIkona className="h-[18px] w-[18px]" /> : <VlockaIkona className="h-[18px] w-[18px]" />}
                      {SEZONA_POPIS[s].nazev}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-sage">
                {rucne
                  ? `Přepnuto ručně — ${SEZONA_POPIS[sezona].nazev.toLowerCase()} (${SEZONA_POPIS[sezona].kdy}).`
                  : `Podle kalendáře je teď ${SEZONA_POPIS[sezona].nazev.toLowerCase()} (${SEZONA_POPIS[sezona].kdy}).`}{" "}
                {SEZONA_POPIS[sezona].veta}
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <div
                role="group"
                aria-label="Podklad mapy"
                className="inline-flex rounded-full border border-linen/15 bg-bark p-1 text-[13.5px] font-semibold"
              >
                {(["satelit", "turisticka"] as Vrstva[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={vrstva === v}
                    onClick={() => setVrstva(v)}
                    className={`min-h-10 rounded-full px-4 transition-colors duration-200 ${
                      vrstva === v ? "bg-linen text-night" : "text-sage hover:text-linen"
                    }`}
                  >
                    {v === "satelit" ? "Satelit" : "Turistická"}
                  </button>
                ))}
              </div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-sage" aria-label="Legenda">
                {LEGENDA.map((l) => (
                  <li key={l.ton} className="flex items-center gap-2">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${l.barva}`} aria-hidden="true" />
                    {l.nazev}
                  </li>
                ))}
              </ul>
            </div>
          </div>

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
                      ? "border-ember bg-ember text-night"
                      : "border-linen/15 text-sage hover:border-linen/40 hover:text-linen"
                  }`}
                >
                  {f.nazev} <span className={aktivni ? "text-night/60" : "text-sage/60"}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mapa přes celou šířku; na desktopu se zaoblenými rohy a plovoucí kartou vybraného místa. */}
        <div className="relative z-10 mt-8 md:px-5 lg:px-8">
          <div className="relative mx-auto max-w-[1400px]">
            <LeafletMapa
              body={body}
              stred={{ lat: LOCATION.lat, lng: LOCATION.lng }}
              zoom={11}
              vrstva={vrstva}
              vybrany={vybrany}
              onVyber={(id) => {
                setVybrany(id);
              }}
              prizpusobit
              className="h-[64svh] min-h-[440px] max-h-[780px] md:rounded-[32px] md:border md:border-linen/10"
              popisek="Mapa míst v okolí lomu Jílové u Držkova"
            />
            {vybranyMisto && (
              <aside
                className="absolute bottom-5 left-5 z-[500] hidden w-[340px] overflow-hidden rounded-[22px] border border-linen/15 bg-night/92 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] backdrop-blur-md lg:block"
                aria-label="Vybrané místo"
              >
                {fotoMista(vybranyMisto.id) && (
                  <div className="relative aspect-[16/9]">
                    <Image
                      src={fotoMista(vybranyMisto.id)!.src}
                      alt={fotoMista(vybranyMisto.id)!.alt}
                      fill
                      sizes="340px"
                      className="object-cover"
                    />
                    <Kredit id={vybranyMisto.id} />
                  </div>
                )}
                <div className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sage">
                    {SEZONNOST_POPIS[vybranyMisto.sezona]} ·{" "}
                    {KATEGORIE.find((k) => k.id === vybranyMisto.kategorie)?.nazev}
                  </p>
                  <p className="font-display mt-2 text-2xl text-linen">{vybranyMisto.nazev}</p>
                  <p className="mt-1 text-[13.5px] text-sage">
                    {vybranyMisto.misto}
                    {!vybranyMisto.doma &&
                      ` · ≈ ${odLomuKm(vybranyMisto)} km · ${vybranyMisto.autem} min autem`}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[13.5px] font-semibold">
                    <button type="button" onClick={() => naKartu(vybranyMisto.id)} className="min-h-9 text-ember hover:text-ember-soft">
                      Podrobnosti ↓
                    </button>
                    <a
                      href={odkazMapy(vybranyMisto)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-9 items-center text-linen/75 hover:text-ember"
                    >
                      Otevřít v Mapách ↗
                    </a>
                    <button
                      type="button"
                      onClick={() => setVybrany(null)}
                      className="ml-auto min-h-9 text-sage hover:text-linen"
                      aria-label="Zavřít"
                    >
                      Zavřít
                    </button>
                  </div>
                </div>
              </aside>
            )}
          </div>
          <p className="mx-auto mt-3 max-w-7xl px-5 text-[12.5px] text-sage/80 md:px-0">
            {vybrana.length} míst pro {SEZONA_POPIS[sezona].nazev.toLowerCase()}. Kolečkem přiblížíte po klepnutí do mapy;
            klepnutí na značku ukáže fotku a jméno.
          </p>
        </div>
      </section>

      {/* ===== Kapitola II · Vybrané + všechna místa (obloha) ===== */}
      <section className="obloha relative overflow-hidden py-20 text-night md:py-28">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          {vybrane.length > 0 && (
            <>
              <Kicker tone="light">Kapitola II · Vybrané pro {SEZONA_POPIS[sezona].nazev.toLowerCase()}</Kicker>
              <h2 className="font-display mt-6 max-w-3xl text-4xl md:text-6xl">
                Kdybyste měli{" "}
                <span className="font-display italic text-ember-deep">jen jeden den.</span>
              </h2>
              <div className="mt-10 grid gap-5 md:grid-cols-3 md:gap-6">
                {vybrane.map((m) => {
                  const f = fotoMista(m.id);
                  return (
                    <article
                      key={m.id}
                      className="group relative overflow-hidden rounded-[28px] border border-night/10 bg-night text-linen"
                    >
                      <div className="relative aspect-[4/5] md:aspect-[3/4]">
                        {f && (
                          <Image
                            src={f.src}
                            alt={f.alt}
                            fill
                            sizes="(max-width: 768px) 100vw, 400px"
                            className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/35 to-transparent" />
                        <Kredit id={m.id} className="!bottom-auto !top-3" />
                        <div className="absolute inset-x-0 bottom-0 p-6">
                          <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${TON[m.sezona]}`}>
                            {SEZONNOST_POPIS[m.sezona]}
                          </span>
                          <h3 className="font-display mt-3 text-2xl md:text-3xl">{m.nazev}</h3>
                          <p className="mt-1 text-[14px] text-sage">
                            {m.misto} · {m.autem} min autem
                          </p>
                          <p className="mt-3 line-clamp-3 text-[14.5px] leading-relaxed text-linen/85">
                            {popisProSezonu(m, sezona)}
                          </p>
                          <button
                            type="button"
                            onClick={() => ukazNaMape(m.id)}
                            className="mt-4 inline-flex min-h-10 items-center gap-2 text-[14px] font-semibold text-ember hover:text-ember-soft"
                          >
                            Ukázat na mapě ↑
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          <div className={vybrane.length > 0 ? "mt-24" : ""}>
            <Kicker tone="light">Kapitola III · Všechna místa</Kicker>
            <h2 className="font-display mt-6 max-w-3xl text-4xl md:text-5xl">
              {filtr === null
                ? `${vybrana.length} míst do ${Math.max(...vybrana.map((m) => m.autem))} minut autem.`
                : `${vybrana.length} míst: ${FILTRY.find((f) => f.id === filtr)?.nazev.toLowerCase()}.`}
            </h2>
            <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-night/60">
              Řazeno podle doby jízdy od lomu. Fotky u míst jsou z Wikimedia Commons — autoři a licence jsou
              u každé fotky a v seznamu na konci stránky.
            </p>
          </div>

          {skupiny.map((sk) => (
            <div key={sk.id} className="mt-14 first:mt-10">
              <div className="flex items-baseline gap-3 border-b border-night/10 pb-4">
                <h3 className="font-display text-3xl">{sk.nazev}</h3>
                <span className="text-[14px] text-night/45">
                  {sk.mista.length} {sk.mista.length === 1 ? "místo" : sk.mista.length < 5 ? "místa" : "míst"}
                </span>
              </div>
              <ol className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {sk.mista.map((m) => (
                  <KartaMista
                    key={m.id}
                    m={m}
                    sezona={sezona}
                    aktivni={vybrany === m.id}
                    naMapu={() => ukazNaMape(m.id)}
                  />
                ))}
              </ol>
            </div>
          ))}

          <div className="mt-20 rounded-[22px] border border-night/10 bg-cloud/70 p-5 text-[13px] leading-6 text-night/65">
            <p className="font-semibold text-night/80">Autoři fotografií míst</p>
            <ul className="mt-2 columns-1 gap-8 sm:columns-2 lg:columns-3">
              {mista
                .map((m) => ({ m, f: fotoMista(m.id) }))
                .filter((x) => x.f && x.f.licence !== "vlastní")
                .map(({ m, f }) => (
                  <li key={m.id} className="break-inside-avoid py-0.5">
                    {m.nazev}:{" "}
                    <a href={f!.zdroj} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ember-deep">
                      {f!.autor}
                    </a>
                    , {f!.licenceUrl ? (
                      <a href={f!.licenceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ember-deep">
                        {f!.licence}
                      </a>
                    ) : (
                      f!.licence
                    )}
                    , Wikimedia Commons
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

/* ===== Karta místa ===== */

const IKONA_KATEGORIE: Record<Kategorie, string> = {
  voda: "〰",
  hory: "△",
  skaly: "⛰",
  vylety: "⚑",
  vyhledy: "◎",
  "pod-strechou": "⌂",
};

function KartaMista({
  m,
  sezona,
  aktivni,
  naMapu,
}: {
  m: Misto;
  sezona: Sezona;
  aktivni: boolean;
  naMapu: () => void;
}) {
  const f = fotoMista(m.id);
  const kategorie = KATEGORIE.find((k) => k.id === m.kategorie)?.nazev;
  return (
    <li id={`misto-${m.id}`} className="scroll-mt-28">
      <article
        className={`flex h-full flex-col overflow-hidden rounded-[26px] border bg-cloud transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 ${
          aktivni
            ? "border-ember-deep shadow-[0_22px_50px_-28px_rgba(10,20,22,0.6)]"
            : "border-night/10 hover:border-night/30"
        }`}
      >
        <button
          type="button"
          onClick={naMapu}
          className="group relative block aspect-[3/2] w-full overflow-hidden bg-mist-dim text-left"
          aria-label={`Ukázat na mapě: ${m.nazev}`}
        >
          {f ? (
            <Image
              src={f.src}
              alt={f.alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 400px"
              className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-5xl text-shale" aria-hidden="true">
              {IKONA_KATEGORIE[m.kategorie]}
            </span>
          )}
          <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${TON[m.sezona]}`}>
            {SEZONNOST_POPIS[m.sezona]}
          </span>
          {m.deti && (
            <span className="absolute right-3 top-3 rounded-full bg-cloud/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-night">
              s dětmi
            </span>
          )}
          {f && <Kredit id={m.id} />}
        </button>
        <div className="flex flex-1 flex-col p-6">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-night/50">{kategorie}</p>
          <h4 className="font-display mt-2 text-2xl text-night">{m.nazev}</h4>
          <p className="mt-1 text-[14px] text-night/60">
            {m.misto}
            {!m.doma && ` · ≈ ${odLomuKm(m)} km · ${m.autem} min autem`}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-night/75">{popisProSezonu(m, sezona)}</p>
          {m.tip && <p className="mt-2 text-[13.5px] italic leading-relaxed text-shale-deep">{m.tip}</p>}
          <div className="mt-auto flex flex-wrap gap-x-5 gap-y-1 pt-5 text-[14px] font-semibold">
            <button type="button" onClick={naMapu} className="min-h-10 text-ember-deep transition-colors hover:text-night">
              Na mapě ↑
            </button>
            <a
              href={odkazMapy(m)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center text-night/65 transition-colors hover:text-ember-deep"
            >
              Mapy ↗
            </a>
            {m.web && (
              <a
                href={m.web}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center text-night/65 transition-colors hover:text-ember-deep"
              >
                Web ↗
              </a>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}
