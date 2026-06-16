"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";

/**
 * Animované počítadlo — naběhne z 0 na cílové číslo, jakmile se dostane do
 * viewportu. Nečíselné hodnoty (např. „∞") vykreslí staticky. Respektuje
 * prefers-reduced-motion.
 */
export default function Counter({
  value,
  prefix = "",
  suffix = "",
  duration = 1.6,
  className,
}: {
  value: number | string;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const numeric = typeof value === "number";
  const [display, setDisplay] = useState<number>(numeric ? 0 : 0);

  useEffect(() => {
    if (!inView || !numeric) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(value as number);
      return;
    }
    const controls = animate(0, value as number, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, numeric, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {numeric ? display.toLocaleString("cs-CZ") : value}
      {suffix}
    </span>
  );
}
