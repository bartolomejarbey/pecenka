import Link from "next/link";
import type { ReactNode } from "react";

/* ===== Logo ===== */

/** Sedm stromů — šest tlumených, sedmý žhne. */
export function LogoMark({ className = "h-6 w-auto" }: { className?: string }) {
  const bars = [
    { x: 2, h: 12 },
    { x: 8, h: 17 },
    { x: 14, h: 14 },
    { x: 20, h: 21 },
    { x: 26, h: 15 },
    { x: 32, h: 18 },
  ];
  return (
    <svg viewBox="0 0 44 24" className={className} aria-hidden="true">
      {bars.map((b) => (
        <rect
          key={b.x}
          x={b.x}
          y={24 - b.h}
          width="2.4"
          height={b.h}
          rx="1.2"
          fill="currentColor"
          opacity="0.65"
        />
      ))}
      <rect x={38} y={24 - 23} width="2.6" height={23} rx="1.3" fill="var(--color-ember)" />
    </svg>
  );
}

export function Logo({ light = true }: { light?: boolean }) {
  return (
    <span className={`flex items-center gap-3 ${light ? "text-linen" : "text-night"}`}>
      <LogoMark />
      <span className="font-display text-[1.05rem] font-medium uppercase tracking-[0.18em]">
        Sedmý&nbsp;les
      </span>
    </span>
  );
}

/* ===== Kicker / nadpisy kapitol ===== */

export function Kicker({
  children,
  className = "",
  tone = "dark",
}: {
  children: ReactNode;
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <p
      className={`kicker flex items-center gap-2.5 ${
        tone === "dark" ? "text-sage" : "text-ember-deep"
      } ${className}`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-ember animate-ember" />
      {children}
    </p>
  );
}

/* ===== Tlačítka ===== */

type BtnProps = {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  variant?: "ember" | "outline" | "outline-dark" | "ghost";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
};

const VARIANTS: Record<NonNullable<BtnProps["variant"]>, string> = {
  ember:
    "bg-ember text-night hover:bg-ember-soft hover:-translate-y-0.5 shadow-[0_18px_40px_-18px_rgba(217,145,78,0.55)]",
  outline:
    "border border-linen/25 text-linen hover:border-ember hover:text-ember",
  "outline-dark":
    "border border-night/30 text-night hover:border-ember-deep hover:text-ember-deep",
  ghost: "text-linen/80 hover:text-ember",
};

export function Button({
  href,
  onClick,
  children,
  variant = "ember",
  className = "",
  type = "button",
  disabled,
}: BtnProps) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M2 8h11m0 0L8.5 3.5M13 8l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ===== Marquee ===== */

export function Marquee({
  items,
  tone = "ember",
}: {
  items: string[];
  tone?: "ember" | "mist";
}) {
  const row = items.join("  ·  ") + "  ·  ";
  return (
    <div
      className={`overflow-hidden border-y py-4 ${
        tone === "ember"
          ? "border-ember/20 bg-bark text-ember"
          : "border-night/10 bg-mist-dim text-night/70"
      }`}
      aria-hidden="true"
    >
      <div className="animate-marquee flex w-max whitespace-nowrap">
        {[0, 1].map((k) => (
          <span
            key={k}
            className="font-display px-2 text-lg font-light italic tracking-wide"
          >
            {row}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ===== Hvězdičky recenzí ===== */

export function Stars({ count = 5 }: { count?: number }) {
  return (
    <span className="flex gap-1 text-ember" aria-label={`${count} z 5 hvězd`}>
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} viewBox="0 0 12 12" className="h-3 w-3 fill-current" aria-hidden="true">
          <path d="M6 .5l1.7 3.4 3.8.6-2.7 2.7.6 3.8L6 9.2 2.6 11l.6-3.8L.5 4.5l3.8-.6L6 .5z" />
        </svg>
      ))}
    </span>
  );
}
