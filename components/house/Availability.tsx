"use client";

import { useEffect, useState } from "react";
import type { HouseSlug } from "@/lib/booking";
import { getBookedDays, toKey, startOfDay, formatPrice } from "@/lib/booking";
import { PRICING } from "@/lib/content";
import Reveal from "@/components/Reveal";
import { Button, Kicker } from "@/components/ui";

const WEEKDAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

type CalendarData = {
  booked: Set<string>;
  months: { year: number; month: number }[];
  todayKey: string;
};

function monthLabel(year: number, month: number): string {
  const label = new Date(year, month, 1).toLocaleDateString("cs-CZ", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function MonthGrid({
  year,
  month,
  booked,
  todayKey,
}: {
  year: number;
  month: number;
  booked: Set<string>;
  todayKey: string;
}) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // pondělí první

  return (
    <div className="rounded-[28px] border border-linen/8 bg-pine p-6 md:p-8">
      <p className="font-display text-xl text-linen">{monthLabel(year, month)}</p>

      <div className="mt-6 grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((wd) => (
          <span
            key={wd}
            className="pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sage/70"
          >
            {wd}
          </span>
        ))}

        {Array.from({ length: offset }).map((_, i) => (
          <span key={`empty-${i}`} aria-hidden="true" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const date = new Date(year, month, i + 1);
          const key = toKey(date);
          const isToday = key === todayKey;
          const isPast = key < todayKey;
          const isBooked = booked.has(key);

          const tone = isPast
            ? "text-linen/15"
            : isBooked
              ? "bg-moss/25 text-sage/60 line-through"
              : "text-linen";

          return (
            <span
              key={key}
              className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm ${tone} ${
                isToday ? "border border-ember" : ""
              }`}
              aria-label={`${i + 1}. ${month + 1}. — ${
                isPast ? "minulost" : isBooked ? "obsazeno" : "volno"
              }`}
            >
              {i + 1}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Kapitola IV · Volné termíny — orientační kalendář dvou měsíců.
 *  Počítá se až po mountu (hydration safety — závisí na dnešním datu). */
export default function Availability({
  slug,
  houseName,
}: {
  slug: HouseSlug;
  houseName: string;
}) {
  const [data, setData] = useState<CalendarData | null>(null);
  // 4. pád pro CTA — „Rezervovat Žulu", ale „Rezervovat Mech".
  const nameAccusative = slug === "zula" ? "Žulu" : houseName;

  useEffect(() => {
    const today = startOfDay(new Date());
    const y = today.getFullYear();
    const m = today.getMonth();
    setData({
      booked: getBookedDays(slug),
      months: [
        { year: y, month: m },
        { year: m === 11 ? y + 1 : y, month: (m + 1) % 12 },
      ],
      todayKey: toKey(today),
    });
  }, [slug]);

  return (
    <section className="grain relative overflow-hidden bg-bark py-24 md:py-32">
      <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <Kicker>Kapitola V · Volné termíny</Kicker>
        </Reveal>
        <Reveal i={1}>
          <h2 className="font-display mt-6 max-w-2xl text-4xl text-linen md:text-5xl">
            Kdy můžete <span className="accent-italic">přijet.</span>
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 md:mt-16 md:grid-cols-2 md:gap-8">
          {data ? (
            data.months.map((mo, i) => (
              <div key={`${mo.year}-${mo.month}`} className={i === 1 ? "hidden md:block" : ""}>
                <MonthGrid
                  year={mo.year}
                  month={mo.month}
                  booked={data.booked}
                  todayKey={data.todayKey}
                />
              </div>
            ))
          ) : (
            <>
              <div className="h-[380px] animate-pulse rounded-[28px] border border-linen/8 bg-pine" />
              <div className="hidden h-[380px] animate-pulse rounded-[28px] border border-linen/8 bg-pine md:block" />
            </>
          )}
        </div>

        <Reveal i={1}>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-sage">
            <span className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-linen" aria-hidden="true" />
              volno
            </span>
            <span className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-moss/40" aria-hidden="true" />
              obsazeno
            </span>
            <span className="flex items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 rounded-full border border-ember"
                aria-hidden="true"
              />
              dnes
            </span>
          </div>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-sage/80">
            Kalendář je orientační — termín potvrdíme do 24 hodin.
          </p>
        </Reveal>

        <Reveal i={2}>
          <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-linen/8 pt-10">
            <Button href={`/rezervace?domek=${slug}`}>Rezervovat {nameAccusative}</Button>
            <p className="text-sm text-sage">
              od{" "}
              <span className="font-display text-xl text-linen">
                {formatPrice(PRICING.baseNight)}
              </span>{" "}
              / noc
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
