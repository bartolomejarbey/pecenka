import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import CtaBanner from "@/components/CtaBanner";
import Reveal from "@/components/Reveal";
import { ArrowIcon, Kicker } from "@/components/ui";
import { ADDONS, PRICING } from "@/lib/content";
import { formatPrice } from "@/lib/booking";

export const metadata: Metadata = {
  title: "Ceník",
  description:
    "Cena je za jeden domek a noc — ne–čt 2 890 Kč, pá+so 3 490 Kč. Chcete oba domky nebo je spojit v jeden? Napište nám. V ceně povlečení, dřevo do ohniště, káva i závěrečný úklid.",
};

const PRICE_BLOCKS = [
  {
    label: "Neděle–čtvrtek",
    price: formatPrice(PRICING.baseNight),
    sub: "za domek a noc",
  },
  {
    label: "Pátek a sobota",
    price: formatPrice(PRICING.weekendNight),
    sub: "za domek a noc",
  },
  {
    label: "Vysoká sezóna",
    price: `+${formatPrice(PRICING.highSeasonExtra)}`,
    sub: "15. 6. – 15. 9. a 20. 12. – 2. 1.",
  },
];

const PAYMENT_ROWS = [
  "Záloha 50 % do 3 dnů po potvrzení rezervace.",
  "Doplatek 14 dní před příjezdem.",
  `Vratná kauce ${formatPrice(PRICING.deposit)} — vracíme do 3 dnů po odjezdu.`,
];

const STORNO_ROWS = [
  { when: "30 a více dní před příjezdem", what: "vracíme 100 % uhrazených plateb" },
  { when: "14–29 dní před příjezdem", what: "vracíme 50 % uhrazených plateb" },
  { when: "Později", what: "nabídneme náhradní termín do roka" },
  { when: "Když zrušíme my (kalamita apod.)", what: "vracíme vše do koruny" },
];

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className="mt-1 h-4 w-4 shrink-0 text-ember-deep"
      aria-hidden="true"
    >
      <path
        d="M3 8.5 6.5 12 13 4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CenikPage() {
  return (
    <main>
      <PageHero
        kicker="Ceník"
        title="Férové ceny,"
        accent="žádné hvězdičky."
        lead="Cena je za jeden domek a noc, ať jste dva, nebo přijedete sami. Chcete oba domky či je spojit v jeden? Napište nám. V ceně povlečení, dřevo do ohniště, káva i závěrečný úklid."
      />

      {/* ===== Kapitola I · Noci (světlá) ===== */}
      <section className="grain relative overflow-hidden bg-mist py-24 text-night md:py-32">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <Kicker tone="light">Kapitola I · Noci</Kicker>
          </Reveal>
          <Reveal i={1}>
            <h2 className="font-display mt-6 max-w-2xl text-4xl md:text-6xl">
              Kolik stojí <span className="font-display italic text-ember-deep">ticho.</span>
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-5 md:mt-16 md:grid-cols-3 md:gap-6">
            {PRICE_BLOCKS.map((b, i) => (
              <Reveal key={b.label} i={i}>
                <div className="h-full rounded-[28px] border border-night/10 bg-linen p-8 transition-colors duration-300 hover:border-ember-deep/40 md:p-10">
                  <p className="kicker text-night/50">{b.label}</p>
                  <p className="font-display mt-6 text-4xl md:text-5xl">{b.price}</p>
                  <p className="mt-3 text-[15px] text-night/60">{b.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12 md:mt-16">
            <ul className="grid max-w-4xl gap-x-12 gap-y-4 md:grid-cols-2">
              {PRICING.notes.map((note) => (
                <li key={note} className="flex items-start gap-3">
                  <CheckIcon />
                  <span className="text-[15.5px] leading-relaxed text-night/70">{note}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ===== Kapitola II · Doplňky ===== */}
      <section className="grain relative overflow-hidden bg-night py-24 md:py-32">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <Kicker>Kapitola II · Doplňky</Kicker>
          </Reveal>
          <Reveal i={1}>
            <h2 className="font-display mt-6 max-w-2xl text-4xl text-linen md:text-6xl">
              Maličkosti, které <span className="accent-italic">chystáme my.</span>
            </h2>
          </Reveal>

          <div className="mt-10 grid md:mt-14 md:grid-cols-2 md:gap-x-14">
            {ADDONS.map((a, i) => (
              <Reveal key={a.id} i={i % 2}>
                <div className="flex items-start justify-between gap-6 border-b border-linen/8 py-7">
                  <div>
                    <h3 className="font-display text-xl text-linen">{a.name}</h3>
                    <p className="mt-2 max-w-sm text-[14.5px] leading-relaxed text-sage">
                      {a.desc}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-xl text-ember md:text-2xl">
                      {formatPrice(a.price)}
                    </p>
                    <p className="mt-1 text-xs text-sage">{a.unit}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Kapitola III · Platba a storno ===== */}
      <section className="grain relative overflow-hidden bg-bark py-24 md:py-32">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <Kicker>Kapitola III · Platba a storno</Kicker>
          </Reveal>
          <Reveal i={1}>
            <h2 className="font-display mt-6 max-w-2xl text-4xl text-linen md:text-6xl">
              Bez drobného <span className="accent-italic">písma.</span>
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-5 md:mt-16 md:grid-cols-2 md:gap-6">
            <Reveal>
              <div className="h-full rounded-[28px] border border-linen/8 bg-pine p-8 transition-colors duration-300 hover:border-ember/30 md:p-10">
                <h3 className="font-display text-2xl text-linen">Platba</h3>
                <ul className="mt-6 space-y-4">
                  {PAYMENT_ROWS.map((row) => (
                    <li key={row} className="flex items-start gap-3">
                      <span
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ember"
                        aria-hidden="true"
                      />
                      <span className="text-[15.5px] leading-relaxed text-sage">{row}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal i={1}>
              <div className="h-full rounded-[28px] border border-linen/8 bg-pine p-8 transition-colors duration-300 hover:border-ember/30 md:p-10">
                <h3 className="font-display text-2xl text-linen">Storno</h3>
                <ul className="mt-6 space-y-4">
                  {STORNO_ROWS.map((row) => (
                    <li
                      key={row.when}
                      className="flex items-baseline justify-between gap-4 border-b border-linen/8 pb-4 last:border-0 last:pb-0"
                    >
                      <span className="text-[15px] text-sage">{row.when}</span>
                      <span className="font-display whitespace-nowrap text-[15px] italic text-linen">
                        {row.what}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          {/* Poukaz — teaser */}
          <Reveal className="mt-6">
            <Link
              href="/darkovy-poukaz"
              className="group flex flex-col items-start justify-between gap-5 rounded-[28px] border border-ember/25 bg-pine p-8 transition-colors duration-300 hover:border-ember/50 md:flex-row md:items-center md:p-10"
            >
              <p className="font-display text-2xl text-linen md:text-3xl">
                Nevíte termín? <span className="accent-italic">Darujte ticho poukazem.</span>
              </p>
              <span className="flex items-center gap-2 text-sm font-semibold text-ember transition-transform duration-300 group-hover:translate-x-1">
                Dárkový poukaz <ArrowIcon />
              </span>
            </Link>
          </Reveal>
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
