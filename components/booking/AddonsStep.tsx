"use client";

import { formatHalere, type Doplnek } from "@/lib/booking";
import { daysLabel } from "./format";

/** Jak se jednotka doplňku píše v souhrnu. */
const JEDNOTKA: Record<Doplnek["unit"], string> = {
  per_day: "za den",
  per_piece: "za kus",
  per_stay: "za pobyt",
};

function StepperButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-linen/15 text-base text-linen transition-colors duration-300 hover:border-ember hover:text-ember disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-linen/15 disabled:hover:text-linen"
    >
      {children}
    </button>
  );
}

/** Krok 3 — počet hostů a doplňky pobytu. */
export default function AddonsStep({
  guests,
  onGuestsChange,
  addons,
  onQtyChange,
  nights,
  doplnky,
}: {
  guests: number;
  onGuestsChange: (n: number) => void;
  addons: Record<string, number>;
  onQtyChange: (id: string, qty: number) => void;
  nights: number;
  /** Nabídka doplňků z databáze — ceny i maxima se dají měnit bez nasazení. */
  doplnky: Doplnek[];
}) {
  return (
    <div className="space-y-8">
      {/* Hosté */}
      <div className="flex flex-col gap-5 rounded-2xl border border-linen/10 bg-bark/40 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div>
          <p className="font-semibold text-linen">Počet hostů</p>
          <p className="mt-1 text-sm text-sage">
            Domek je pro dva. Chcete být čtyři? Vezměte oba domky — napište nám.
          </p>
        </div>
        <div className="flex items-center gap-4" role="group" aria-label="Počet hostů">
          <StepperButton
            onClick={() => onGuestsChange(guests - 1)}
            disabled={guests <= 1}
            label="Ubrat hosta"
          >
            −
          </StepperButton>
          <span
            className="w-10 text-center font-display text-2xl text-linen"
            aria-live="polite"
          >
            {guests}
          </span>
          <StepperButton
            onClick={() => onGuestsChange(guests + 1)}
            disabled={guests >= 2}
            label="Přidat hosta"
          >
            +
          </StepperButton>
        </div>
      </div>

      {/* Doplňky */}
      <div>
        <p className="kicker mb-4 text-sage">Doplňky pobytu</p>
        <ul className="space-y-3.5">
          {doplnky.map((addon) => {
            const qty = addons[addon.id] ?? 0;
            const active = qty > 0;
            const isQty = addon.maxQty > 1;
            const perDay = addon.unit === "per_day";
            return (
              <li
                key={addon.id}
                className={`flex flex-col gap-4 rounded-2xl border p-5 transition-colors duration-300 sm:flex-row sm:items-center sm:justify-between md:p-6 ${
                  active ? "border-ember/40 bg-ember/5" : "border-linen/10 bg-bark/40"
                }`}
              >
                <div className="max-w-md">
                  <p className="font-semibold text-linen">{addon.name}</p>
                  <p className="mt-1 text-sm leading-relaxed text-sage">{addon.description}</p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-6 sm:justify-end">
                  <p className="text-[15px] text-linen">
                    {formatHalere(addon.priceHalere)}{" "}
                    <span className="text-sm text-sage">· {JEDNOTKA[addon.unit]}</span>
                    {perDay && active && nights > 0 && (
                      <span className="mt-0.5 block text-sm text-ember">
                        = {formatHalere(addon.priceHalere * qty * nights)} / {daysLabel(nights)}
                      </span>
                    )}
                  </p>
                  {isQty ? (
                    <div
                      className="flex items-center gap-3"
                      role="group"
                      aria-label={`Množství — ${addon.name}`}
                    >
                      <StepperButton
                        onClick={() => onQtyChange(addon.id, qty - 1)}
                        disabled={qty <= 0}
                        label={`Ubrat — ${addon.name}`}
                      >
                        −
                      </StepperButton>
                      <span
                        className={`w-6 text-center font-display text-xl ${
                          active ? "text-ember" : "text-linen"
                        }`}
                        aria-live="polite"
                      >
                        {qty}
                      </span>
                      <StepperButton
                        onClick={() => onQtyChange(addon.id, qty + 1)}
                        disabled={qty >= addon.maxQty}
                        label={`Přidat — ${addon.name}`}
                      >
                        +
                      </StepperButton>
                    </div>
                  ) : (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={active}
                      aria-label={`${addon.name} — ${active ? "objednáno" : "neobjednáno"}`}
                      onClick={() => onQtyChange(addon.id, active ? 0 : 1)}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 ${
                        active ? "bg-ember" : "bg-pine-edge"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-linen shadow-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          active ? "left-6" : "left-1"
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
