"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { HOUSES } from "@/lib/content";
import {
  calcPrice,
  formatCzDate,
  formatPrice,
  getBookedDays,
  isRangeFree,
  validateRange,
  type AddonSelection,
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

const STEP_EASE = [0.16, 1, 0.3, 1] as const;

function StepHeading({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="mb-8">
      <h2 className="font-display text-2xl text-linen md:text-[32px]">{title}</h2>
      {sub && <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-sage">{sub}</p>}
    </header>
  );
}

/** Čtyřkrokový rezervační průvodce — interaktivní srdce webu. */
export default function BookingWizard() {
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [house, setHouse] = useState<HouseSlug | null>(() => {
    const param = searchParams.get("domek");
    return param === "zula" || param === "mech" ? param : null;
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

  const booked = useMemo(
    () => (house ? getBookedDays(house) : new Set<string>()),
    [house],
  );

  const rangeError = useMemo(() => {
    if (!range.from || !range.to) return null;
    const invalid = validateRange(range.from, range.to);
    if (invalid) return invalid;
    if (!isRangeFree(booked, range.from, range.to)) {
      return "Vybraný termín zasahuje do obsazených nocí. Zkuste prosím jiný.";
    }
    return null;
  }, [range, booked]);

  const rangeValid = range.from !== null && range.to !== null && rangeError === null;

  // Živý řádek pod kalendářem — jen cena ubytování, bez doplňků.
  const stay = useMemo(() => {
    if (!range.from || !range.to || rangeError) return null;
    return calcPrice(range.from, range.to, {});
  }, [range, rangeError]);

  // Plný rozpad ceny pro souhrn — včetně doplňků.
  const breakdown = useMemo(() => {
    if (!range.from || !range.to) return null;
    return calcPrice(range.from, range.to, addons);
  }, [range, addons]);

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
          house: houseData.name,
          from: formatCzDate(range.from),
          to: formatCzDate(range.to),
          nights: breakdown.nights,
          guests,
          addons: breakdown.addonItems,
          total: breakdown.total,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          note: contact.note,
          web,
        }),
      });
      const json: { ok?: boolean; error?: string } = await res
        .json()
        .catch(() => ({}) as { ok?: boolean; error?: string });
      if (!res.ok) {
        throw new Error(
          json.error ?? "Odeslání se nepovedlo. Zkuste to prosím znovu za chvíli.",
        );
      }
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
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: STEP_EASE }}
        className="rounded-[34px] border border-linen/8 bg-bark/60 px-6 py-16 text-center backdrop-blur md:px-10 md:py-24"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: STEP_EASE }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-ember text-night shadow-[0_18px_60px_-12px_rgba(217,145,78,0.6)]"
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
        </motion.div>
        {houseData && range.from && range.to && (
          <p className="kicker mt-8 text-sage">
            {houseData.name} · {formatCzDate(range.from)} – {formatCzDate(range.to)}
          </p>
        )}
        <h2 className="display-hero mx-auto mt-5 max-w-2xl text-4xl text-linen md:text-6xl">
          Poptávka je <span className="accent-italic">na cestě.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-md text-[16px] leading-relaxed text-sage">
          Ozveme se do 24 hodin s potvrzením termínu a platebními údaji. Zatím si můžete
          balit — moc toho nepotřebujete.
        </p>
        <div className="mt-10">
          <Button href="/" variant="outline">
            Zpět na úvod
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div
      ref={topRef}
      id="pruvodce"
      className="rounded-[34px] border border-linen/8 bg-bark/60 p-6 backdrop-blur md:p-10"
    >
      <Steps step={step} onBackTo={(s) => s < step && setStep(s as Step)} />

      <div className="mt-10 md:mt-12">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.5, ease: STEP_EASE }}
          >
            {/* ===== Krok 1 — Domek ===== */}
            {step === 1 && (
              <div>
                <StepHeading
                  title="Který domek to bude?"
                  sub="Žula stojí nad zatopeným lomem a má finskou saunu. Mech sedí na kraji louky a hřeje koupacím sudem."
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
                        {formatPrice(stay.total)}
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
                  sub="Všechno je dobrovolné. Sauna i sud ale stojí za to — vytopíme je, než dorazíte."
                />
                <AddonsStep
                  guests={guests}
                  onGuestsChange={(n) => setGuests(Math.max(1, Math.min(4, n)))}
                  addons={addons}
                  onQtyChange={setAddonQty}
                  nights={breakdown?.nights ?? 0}
                  house={house}
                />
                {breakdown && (
                  <p className="mt-8 inline-flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-2xl border border-ember/25 bg-ember/5 px-5 py-3.5 text-[15px] text-sage">
                    <span>Ubytování ({nightsLabel(breakdown.nights)})</span>
                    {breakdown.addonsTotal > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>doplňky {formatPrice(breakdown.addonsTotal)}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="text-linen">celkem</span>
                    <span className="font-display text-xl text-ember">
                      {formatPrice(breakdown.total)}
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
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
