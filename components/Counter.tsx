"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animované počítadlo — naběhne z 0 na cílové číslo, jakmile se dostane do
 * viewportu. Nečíselné hodnoty (např. „∞") vykreslí staticky.
 *
 * Bez motion/react: vlastní requestAnimationFrame + IntersectionObserver je
 * pár řádků a ušetří kus JS bundlu na stránkách, kde jinak nic klientského není.
 */
export default function Counter({
  value,
  prefix = "",
  suffix = "",
  duration = 1400,
  className,
}: {
  value: number | string;
  prefix?: string;
  suffix?: string;
  /** Doba náběhu v milisekundách. */
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const numeric = typeof value === "number";
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!numeric || !el) return;

    const target = value as number;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(target);
      return;
    }

    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          // ease-out-expo — stejná křivka jako zbytek webu
          const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
          setDisplay(Math.round(target * eased));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [numeric, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {numeric ? display.toLocaleString("cs-CZ") : value}
      {suffix}
    </span>
  );
}
