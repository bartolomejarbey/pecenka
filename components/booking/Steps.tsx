"use client";

export const STEP_LABELS = ["Domek", "Termín", "Hosté a doplňky", "Kontakt"] as const;

export function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 8.5l3.2 3.2L13 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Horizontální ukazatel kroků — zpět se dá klikat, dopředu ne. */
export default function Steps({
  step,
  onBackTo,
}: {
  step: number;
  onBackTo: (step: number) => void;
}) {
  return (
    <nav aria-label="Postup rezervace">
      {/* Mobil — kompaktní řádek s progresem */}
      <div className="md:hidden">
        <p className="kicker text-sage">
          Krok {step} / {STEP_LABELS.length} ·{" "}
          <span className="text-ember">{STEP_LABELS[step - 1]}</span>
        </p>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-pine">
          <div
            className="h-full rounded-full bg-ember transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ width: `${(step / STEP_LABELS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop — tečky s popisky a spojnicemi */}
      <ol className="hidden items-center md:flex">
        {STEP_LABELS.map((label, idx) => {
          const n = idx + 1;
          const done = n < step;
          const current = n === step;
          return (
            <li
              key={label}
              className={`flex items-center ${idx < STEP_LABELS.length - 1 ? "flex-1" : ""}`}
            >
              <button
                type="button"
                onClick={() => done && onBackTo(n)}
                disabled={!done}
                aria-current={current ? "step" : undefined}
                aria-label={done ? `Zpět na krok ${n} — ${label}` : `Krok ${n} — ${label}`}
                className={`group flex items-center gap-3 ${done ? "cursor-pointer" : "cursor-default"}`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors duration-300 ${
                    done || current
                      ? "border-ember bg-ember text-night"
                      : "border-linen/15 text-sage/70"
                  } ${done ? "group-hover:border-ember-soft group-hover:bg-ember-soft" : ""}`}
                >
                  {done ? <CheckIcon /> : n}
                </span>
                <span
                  className={`whitespace-nowrap text-sm font-medium transition-colors duration-300 ${
                    current
                      ? "text-linen"
                      : done
                        ? "text-sage group-hover:text-ember"
                        : "text-sage/50"
                  }`}
                >
                  {label}
                </span>
              </button>
              {idx < STEP_LABELS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`mx-5 h-px flex-1 transition-colors duration-500 ${
                    n < step ? "bg-ember/50" : "bg-linen/10"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
