"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HOUSES } from "@/lib/content";
import {
  calcPrice,
  formatCzDate,
  formatHalere,
  isRangeFree,
  toKey,
  validateRange,
  type AddonSelection,
  type Cenik,
  type HouseSlug,
} from "@/lib/booking";
import { Button } from "@/components/ui";
import Steps from "./Steps";
import HouseStep from "./HouseStep";
import Calendar from "./Calendar";
import AddonsStep from "./AddonsStep";
import ContactStep, { type Contact } from "./ContactStep";
import Summary from "./Summary";
import WizardSkeleton from "./WizardSkeleton";
import { nightsLabel } from "./format";

type Step = 1 | 2 | 3 | 4;
type Range = { from: Date | null; to: Date | null };
type Status = "idle" | "sending" | "sent" | "error";

/** Dostupnost a ceník jednoho domku, jak je připraví server. */
export type DataDomku = { obsazene: string[]; cenik: Cenik };

/** Co vrátí `/api/rezervace` po úspěšném založení. */
type VysledekRezervace = {
  kod: string;
  vs: string;
  stav: "hold" | "inquiry";
  celkem: number;
  zaloha: number;
  drziDo: string | null;
};


function StepHeading({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="mb-8">
      <h2 className="font-display text-2xl text-linen md:text-[32px]">{title}</h2>
      {sub && <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-sage">{sub}</p>}
    </header>
  );
}

/**
 * Čtyřkrokový rezervační průvodce — interaktivní srdce webu.
 *
 * Obsazenost i ceny dostává z serveru (`nactiRezervacniData`). Dřív si je
 * vyráběl sám z konstant a determinovaného generátoru; jakmile na web přijdou
 * skutečné rezervace, je to rozdíl mezi „volno" a dvojím prodejem.
 */
export default function BookingWizard({ data }: { data: Record<string, DataDomku> }) {
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [house, setHouse] = useState<HouseSlug | null>(() => {
    const param = searchParams.get("domek");
    return param === "achat" || param === "mech" ? param : null;
  });
  const [range, setRange] = useState<Range>({ from: null, to: null });
  const [guests, setGuests] = useState(2);
  const [addons, setAddons] = useState<AddonSelection>({});
  const [contact, setContact] = useState<Contact>({
    name: "",
    email: "",
    phone: "",
    note: "",
  });
  const [web, setWeb] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [apiError, setApiError] = useState<string | null>(null);
  const [vysledek, setVysledek] = useState<VysledekRezervace | null>(null);

  const topRef = useRef<HTMLDivElement>(null);

  // Hydratační bezpečnost — veškerá logika s daty se počítá až na klientu.
  useEffect(() => setMounted(true), []);

  // Při změně kroku se vrátit k začátku průvodce, pokud uživatel odscrolloval.
  useEffect(() => {
    const el = topRef.current;
    if (el && el.getBoundingClientRect().top < 0) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [step]);

  const houseData = useMemo(
    () => (house ? (HOUSES.find((h) => h.slug === house) ?? null) : null),
    [house],
  );

  const domek = house ? data[house] : undefined;

  const booked = useMemo(
    () => new Set(domek?.obsazene ?? []),
    [domek],
  );

  const rangeError = useMemo(() => {
    if (!range.from || !range.to || !domek) return null;
    // Ceníkový kalendář může u konkrétních termínů žádat delší pobyt než dvě noci.
    const minNoci = Math.max(
      2,
      ...Object.entries(domek.cenik.minNoci)
        .filter(([d]) => d >= toKey(range.from!) && d < toKey(range.to!))
        .map(([, n]) => n),
    );
    const invalid = validateRange(range.from, range.to, minNoci);
    if (invalid) return invalid;
    if (!isRangeFree(booked, range.from, range.to)) {
      return "Vybraný termín zasahuje do obsazených nocí. Zkuste prosím jiný.";
    }
    return null;
  }, [range, booked, domek]);

  const rangeValid = range.from !== null && range.to !== null && rangeError === null;

  // Živý řádek pod kalendářem — jen cena ubytování, bez doplňků.
  const stay = useMemo(() => {
    if (!range.from || !range.to || rangeError || !domek) return null;
    return calcPrice(range.from, range.to, {}, domek.cenik);
  }, [range, rangeError, domek]);

  // Plný rozpad ceny pro souhrn — včetně doplňků.
  const breakdown = useMemo(() => {
    if (!range.from || !range.to || !domek) return null;
    return calcPrice(range.from, range.to, addons, domek.cenik);
  }, [range, addons, domek]);

  function handleDaySelect(day: Date) {
    setRange((r) => {
      if (!r.from || r.to) return { from: day, to: null };
      if (day.getTime() <= r.from.getTime()) return { from: day, to: null };
      return { from: r.from, to: day };
    });
  }

  function setAddonQty(id: string, qty: number) {
    setAddons((a) => ({ ...a, [id]: Math.max(0, Math.min(5, qty)) }));
  }

  async function submit() {
    if (!houseData || !range.from || !range.to || !breakdown || status === "sending") return;
    setStatus("sending");
    setApiError(null);
    try {
      const res = await fetch("/api/rezervace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domek: house,
          prijezd: toKey(range.from),
          odjezd: toKey(range.to),
          hoste: guests,
          doplnky: addons,
          // Server si cenu spočítá sám a tuhle jen porovná — když se rozejdou,
          // rezervaci nezaloží a host uvidí aktuální souhrn.
          celkem: breakdown.total,
          jmeno: contact.name,
          email: contact.email,
          telefon: contact.phone || undefined,
          poznamka: contact.note || undefined,
          web,
        }),
      });
      const json: Partial<VysledekRezervace> & { ok?: boolean; error?: string } = await res
        .json()
        .catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(
          json.error ?? "Odeslání se nepovedlo. Zkuste to prosím znovu za chvíli.",
        );
      }
      setVysledek({
        kod: json.kod!,
        vs: json.vs!,
        stav: json.stav!,
        celkem: json.celkem!,
        zaloha: json.zaloha!,
        drziDo: json.drziDo ?? null,
      });
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setApiError(
        err instanceof Error && err.message
          ? err.message
          : "Odeslání se nepovedlo. Zkuste to prosím znovu za chvíli.",
      );
    }
  }

  if (!mounted) return <WizardSkeleton />;

  /* ===== Úspěšné odeslání — nahradí celý průvodce ===== */
  if (status === "sent") {
    return (
      <div className="rise-in rounded-[34px] border border-linen/8 bg-bark px-6 py-16 text-center md:px-10 md:py-24">
        <div
          className="rise-in mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-ember text-night shadow-[0_18px_60px_-12px_rgba(217,145,78,0.6)]"
          style={{ "--rise-i": 1 } as React.CSSProperties}
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-9 w-9">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {houseData && range.from && range.to && (
          <p className="kicker mt-8 text-sage">
            {houseData.name} · {formatCzDate(range.from)} – {formatCzDate(range.to)}
          </p>
        )}
        <h2 className="display-hero mx-auto mt-5 max-w-2xl text-4xl text-linen md:text-6xl">
          {vysledek?.stav === "hold" ? (
            <>
              Termín je <span className="accent-italic">váš.</span>
            </>
          ) : (
            <>
              Poptávka je <span className="accent-italic">na cestě.</span>
            </>
          )}
        </h2>

        {vysledek?.stav === "hold" ? (
          <>
            <p className="mx-auto mt-6 max-w-lg text-[16px] leading-relaxed text-sage">
              Termín jsme pro vás zablokovali
              {vysledek.drziDo && ` do ${formatCzDate(new Date(vysledek.drziDo))}`}. Do té
              doby stačí poslat zálohu — platební údaje máte v e-mailu.
            </p>
            <dl className="mx-auto mt-9 grid max-w-md gap-px overflow-hidden rounded-2xl border border-linen/10 bg-linen/10 text-left sm:grid-cols-3">
              {[
                ["Číslo rezervace", vysledek.kod],
                ["Variabilní symbol", vysledek.vs],
                ["Záloha", formatHalere(vysledek.zaloha)],
              ].map(([popis, hodnota]) => (
                <div key={popis} className="bg-bark px-5 py-4">
                  <dt className="text-[12px] uppercase tracking-[0.14em] text-sage/70">{popis}</dt>
                  <dd className="font-display mt-1.5 text-lg text-linen">{hodnota}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <>
            <p className="mx-auto mt-6 max-w-lg text-[16px] leading-relaxed text-sage">
              Ozveme se do 24 hodin s potvrzením termínu a platebními údaji. Termín zatím
              nedržíme — u pobytů na poslední chvíli a u celého lesa to potvrzujeme ručně.
            </p>
            {vysledek && (
              <p className="mt-7 inline-block rounded-full border border-linen/15 px-5 py-2 text-sm text-sage">
                Číslo poptávky <span className="font-display text-linen">{vysledek.kod}</span>
              </p>
            )}
          </>
        )}
        <div className="mt-10">
          <Button href="/" variant="outline">
            Zpět na úvod
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={topRef}
      id="pruvodce"
      className="rounded-[34px] border border-linen/8 bg-bark p-6 md:p-10"
    >
      <Steps step={step} onBackTo={(s) => s < step && setStep(s as Step)} />

      <div className="mt-10 md:mt-12">
        {/* key={step} → React uzel přemontuje a CSS animace se přehraje znovu */}
        <div key={step} className="step-in">
            {/* ===== Krok 1 — Domek ===== */}
            {step === 1 && (
              <div>
                <StepHeading
                  title="Který domek to bude?"
                  sub="Achát má prosklenou stěnu přes celý les, Mech navíc dřevěnou žaluziovou clonu. Oba jsou pro dva — a dají se spojit v jeden velký."
                />
                <HouseStep selected={house} onSelect={setHouse} />
                <div className="mt-10 flex justify-end">
                  <Button onClick={() => setStep(2)} disabled={!house}>
                    Pokračovat
                  </Button>
                </div>
              </div>
            )}

            {/* ===== Krok 2 — Termín ===== */}
            {step === 2 && (
              <div>
                <StepHeading
                  title="Kdy chcete zmizet?"
                  sub={`Domek ${houseData?.name ?? ""} · minimálně 2 noci. Přeškrtnuté dny jsou obsazené — první klik vybere příjezd, druhý odjezd.`}
                />
                <Calendar
                  booked={booked}
                  from={range.from}
                  to={range.to}
                  onSelect={handleDaySelect}
                />

                <div className="mt-7 min-h-12" aria-live="polite">
                  {range.from && !range.to && !rangeError && (
                    <p className="text-sm text-sage">
                      Příjezd{" "}
                      <span className="text-linen">{formatCzDate(range.from)}</span> —
                      teď vyberte den odjezdu.
                    </p>
                  )}
                  {rangeError && <p className="text-sm text-ember">{rangeError}</p>}
                  {rangeValid && stay && range.from && range.to && (
                    <p className="inline-flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-2xl border border-ember/25 bg-ember/5 px-5 py-3.5 text-[15px] text-sage">
                      <span className="text-linen">
                        {formatCzDate(range.from)} – {formatCzDate(range.to)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{nightsLabel(stay.nights)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-display text-xl text-ember">
                        {formatHalere(stay.total)}
                      </span>
                    </p>
                  )}
                </div>

                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="ghost" onClick={() => setStep(1)}>
                    ← Zpět
                  </Button>
                  <Button onClick={() => setStep(3)} disabled={!rangeValid}>
                    Pokračovat
                  </Button>
                </div>
              </div>
            )}

            {/* ===== Krok 3 — Hosté a doplňky ===== */}
            {step === 3 && (
              <div>
                <StepHeading
                  title="Kolik vás bude — a co k tomu?"
                  sub="Všechno je dobrovolné. Snídaňový koš na kliku, lahev moravského vína do lednice, dřevo do ohniště — nachystáme, než dorazíte."
                />
                <AddonsStep
                  guests={guests}
                  onGuestsChange={(n) => setGuests(Math.max(1, Math.min(2, n)))}
                  addons={addons}
                  onQtyChange={setAddonQty}
                  nights={breakdown?.nights ?? 0}
                  doplnky={domek?.cenik.doplnky ?? []}
                />
                {breakdown && (
                  <p className="mt-8 inline-flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-2xl border border-ember/25 bg-ember/5 px-5 py-3.5 text-[15px] text-sage">
                    <span>Ubytování ({nightsLabel(breakdown.nights)})</span>
                    {breakdown.addonsTotal > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>doplňky {formatHalere(breakdown.addonsTotal)}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="text-linen">celkem</span>
                    <span className="font-display text-xl text-ember">
                      {formatHalere(breakdown.total)}
                    </span>
                  </p>
                )}
                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="ghost" onClick={() => setStep(2)}>
                    ← Zpět
                  </Button>
                  <Button onClick={() => setStep(4)}>Pokračovat</Button>
                </div>
              </div>
            )}

            {/* ===== Krok 4 — Kontakt a souhrn ===== */}
            {step === 4 && houseData && range.from && range.to && breakdown && (
              <div>
                <StepHeading
                  title="Kam pošleme potvrzení?"
                  sub="Žádná platba teď. Do 24 hodin potvrdíme termín a pošleme platební údaje."
                />
                <ContactStep
                  contact={contact}
                  onChange={(patch) => setContact((c) => ({ ...c, ...patch }))}
                  web={web}
                  onWebChange={setWeb}
                  onSubmit={submit}
                  onBack={() => setStep(3)}
                  sending={status === "sending"}
                  error={status === "error" ? apiError : null}
                  summary={
                    <Summary
                      house={houseData}
                      from={range.from}
                      to={range.to}
                      guests={guests}
                      breakdown={breakdown}
                    />
                  }
                />
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
