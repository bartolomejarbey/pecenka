import Image from "next/image";
import { ArrowIcon, Button, Kicker } from "@/components/ui";
import Termin from "./Termin";
import { PRICING } from "@/lib/content";

/** Světlušky — deterministické pozice, drží se v horní části a mimo text. */
const FIREFLIES = [
  { left: "12%", top: "16%", delay: "0s" },
  { left: "34%", top: "11%", delay: "2.4s" },
  { left: "58%", top: "22%", delay: "4.8s" },
  { left: "76%", top: "14%", delay: "1.6s" },
  { left: "90%", top: "26%", delay: "3.6s" },
];

const TRUST = [
  "Celoroční provoz",
  "Sauna a sud připravujeme",
  "Pes vítán",
  "Do 90 minut z Prahy",
];

/**
 * Úvodní obrazovka. Server komponenta — vstupní animace jede přes CSS
 * (`.rise-in`), takže na hero nejede žádný JS a fotka se vykreslí hned.
 */
export default function Hero() {
  return (
    <section className="grain relative flex min-h-svh flex-col justify-end overflow-hidden bg-night">
      <Image
        src="/foto/lom-jilove.jpg"
        alt="Lom Jílové u Držkova: tmavá hladina zrcadlí oblohu s mraky, kolem břízy a smrky, vpravo břidlicová stěna"
        fill
        priority
        fetchPriority="high"
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-night via-night/45 to-night/15" />
      <div className="absolute inset-0 bg-gradient-to-r from-night/70 via-night/15 to-transparent" />

      {/* Světlušky — jen na větších displejích, na mobilu by padaly do textu */}
      <div className="absolute inset-0 hidden md:block" aria-hidden="true">
        {FIREFLIES.map((f) => (
          <span
            key={f.left}
            className="firefly"
            style={{ left: f.left, top: f.top, animationDelay: f.delay }}
          />
        ))}
      </div>

      {/* Obsah — dole vlevo */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-9 pt-44 md:px-8">
        <div className="rise-in">
          <Kicker>Tiny housy u lomu Jílové u Držkova · Liberecký kraj</Kicker>
        </div>

        <h1
          className="display-hero rise-in mt-6 max-w-4xl text-5xl text-linen md:text-8xl"
          style={{ "--rise-i": 1 } as React.CSSProperties}
        >
          Za sedmero horami,
          <br />
          <span className="accent-italic">v sedmém lese.</span>
        </h1>

        <p
          className="rise-in mt-7 max-w-md text-[17px] leading-relaxed text-linen/85"
          style={{ "--rise-i": 2 } as React.CSSProperties}
        >
          Dva černé domky u zatopeného lomu v Jílovém u Držkova, kterému
          místní říkají České Chorvatsko. Ticho, které uslyšíte. Tma, ve
          které jsou konečně vidět hvězdy.
        </p>

        {/*
          * Termín hned tady. Tlačítko „Rezervovat" zůstává pro toho, kdo
          * ještě neví kdy — ale většina lidí přichází s víkendem v hlavě.
          */}
        <div
          className="rise-in mt-9 max-w-2xl"
          style={{ "--rise-i": 3 } as React.CSSProperties}
        >
          <Termin />
        </div>

        <div
          className="rise-in mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14.5px]"
          style={{ "--rise-i": 3 } as React.CSSProperties}
        >
          <Button href="/domky" variant="outline" className="!px-5 !py-2.5 !text-[14px]">
            Prohlédnout domky
          </Button>
          <span className="text-linen/60">od {PRICING.baseNight.toLocaleString("cs-CZ")} Kč za noc · minimálně {PRICING.minNights} noci</span>
        </div>

        {/* Trust strip + scroll hint */}
        <div
          className="rise-in mt-14 flex flex-wrap items-center justify-between gap-x-10 gap-y-4 border-t border-linen/15 pt-6"
          style={{ "--rise-i": 4 } as React.CSSProperties}
        >
          <ul className="flex flex-wrap items-center gap-x-7 gap-y-2.5 text-sm text-linen/70">
            {TRUST.map((item, i) => (
              <li key={item} className="flex items-center gap-3">
                {i > 0 && (
                  <span
                    className="inline-block h-1 w-1 rounded-full bg-ember/60"
                    aria-hidden="true"
                  />
                )}
                {item}
              </li>
            ))}
          </ul>
          <div
            className="hidden items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-linen/45 md:flex"
            aria-hidden="true"
          >
            Posuňte níž
            <span className="animate-nudge text-ember">
              <ArrowIcon className="h-3.5 w-3.5 rotate-90" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
