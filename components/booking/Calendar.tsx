"use client";

import { useMemo, useState } from "react";
import { formatCzDate, isRangeFree, startOfDay, toKey } from "@/lib/booking";

const WEEKDAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const MAX_MONTH_OFFSET = 7; // ilustrační dostupnost máme ~8 měsíců dopředu

function monthLabel(d: Date): string {
  const s = d.toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Buňky jednoho měsíce — pondělí jako první den týdne. */
function monthCells(year: number, month: number): (Date | null)[] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

/**
 * Vlastní rozsahový kalendář — 2 měsíce vedle sebe na desktopu, 1 na mobilu.
 * Renderuje se až po mountu (řeší nadřazený průvodce), takže `new Date()`
 * je tu bezpečné.
 */
export default function Calendar({
  booked,
  from,
  to,
  onSelect,
}: {
  booked: Set<string>;
  from: Date | null;
  to: Date | null;
  onSelect: (day: Date) => void;
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const todayKey = toKey(today);
  const [offset, setOffset] = useState(0);
  const [hover, setHover] = useState<Date | null>(null);

  const months = [0, 1].map(
    (i) => new Date(today.getFullYear(), today.getMonth() + offset + i, 1),
  );

  const renderDay = (day: Date) => {
    const key = toKey(day);
    const isPast = day.getTime() < today.getTime();
    const isBooked = booked.has(key);
    const isEdge =
      (from !== null && key === toKey(from)) || (to !== null && key === toKey(to));
    const inRange =
      from !== null &&
      to !== null &&
      day.getTime() > from.getTime() &&
      day.getTime() < to.getTime();
    const inPreview =
      from !== null &&
      to === null &&
      hover !== null &&
      hover.getTime() > from.getTime() &&
      day.getTime() > from.getTime() &&
      day.getTime() <= hover.getTime();
    // První den obsazeného bloku smí sloužit jako den odjezdu —
    // noc z něj už patří dalším hostům, ale ráno se v něm odjíždí.
    const canCheckout =
      from !== null &&
      to === null &&
      day.getTime() > from.getTime() &&
      isRangeFree(booked, from, day);
    const disabled = isPast || (isBooked && !canCheckout);

    let tone = "cursor-pointer text-linen hover:bg-pine";
    if (isPast) tone = "cursor-not-allowed text-linen/15";
    else if (isEdge) tone = "bg-ember font-semibold text-night";
    else if (isBooked && !canCheckout) tone = "cursor-not-allowed text-moss line-through";
    else if (isBooked) tone = "cursor-pointer text-moss line-through hover:bg-pine";
    else if (inRange) tone = "bg-ember/15 text-linen";
    else if (inPreview) tone = "bg-ember/10 text-linen";

    return (
      <button
        key={key}
        type="button"
        disabled={disabled}
        onClick={() => onSelect(day)}
        onMouseEnter={() => !disabled && setHover(day)}
        onFocus={() => !disabled && setHover(day)}
        aria-label={`${formatCzDate(day)}${
          isBooked ? (canCheckout ? " — obsazeno, lze jen jako den odjezdu" : " — obsazeno") : ""
        }`}
        aria-pressed={isEdge}
        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm transition-colors duration-200 md:h-11 md:w-11 ${tone} ${
          key === todayKey && !isEdge ? "ring-1 ring-inset ring-linen/25" : ""
        }`}
      >
        {day.getDate()}
      </button>
    );
  };

  return (
    <div className="relative">
      {/* Šipky měsíců */}
      <button
        type="button"
        onClick={() => setOffset((o) => Math.max(0, o - 1))}
        disabled={offset === 0}
        aria-label="Předchozí měsíc"
        className="absolute left-0 top-0 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-linen/15 text-linen transition-colors duration-300 hover:border-ember hover:text-ember disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-linen/15 disabled:hover:text-linen"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
          <path
            d="M10 3.5L5.5 8 10 12.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => setOffset((o) => Math.min(MAX_MONTH_OFFSET, o + 1))}
        disabled={offset >= MAX_MONTH_OFFSET}
        aria-label="Další měsíc"
        className="absolute right-0 top-0 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-linen/15 text-linen transition-colors duration-300 hover:border-ember hover:text-ember disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-linen/15 disabled:hover:text-linen"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
          <path
            d="M6 3.5L10.5 8 6 12.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Měsíce */}
      <div
        className="grid gap-x-12 gap-y-8 md:grid-cols-2"
        onMouseLeave={() => setHover(null)}
      >
        {months.map((month, i) => (
          <div key={toKey(month)} className={i === 1 ? "hidden md:block" : ""}>
            <p className="text-center font-display text-lg leading-9 text-linen">
              {monthLabel(month)}
            </p>
            <div className="mt-4 grid grid-cols-7 justify-items-center gap-y-1.5">
              {WEEKDAYS.map((w) => (
                <span
                  key={w}
                  className="pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sage/60"
                  aria-hidden="true"
                >
                  {w}
                </span>
              ))}
              {monthCells(month.getFullYear(), month.getMonth()).map((day, idx) =>
                day ? renderDay(day) : <span key={`empty-${idx}`} aria-hidden="true" />,
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legenda — vzorky odpovídají skutečnému vzhledu dnů v mřížce */}
      <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-2.5 border-t border-linen/8 pt-5 text-[13px] text-sage">
        <span className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] text-linen"
            aria-hidden="true"
          >
            21
          </span>
          Volno
        </span>
        <span className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full bg-ember text-[12px] font-semibold text-night"
            aria-hidden="true"
          >
            22
          </span>
          Váš výběr
        </span>
        <span className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] text-moss line-through"
            aria-hidden="true"
          >
            23
          </span>
          Obsazeno
        </span>
        <span className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] text-linen ring-1 ring-inset ring-linen/25"
            aria-hidden="true"
          >
            24
          </span>
          Dnes
        </span>
      </div>
    </div>
  );
}
