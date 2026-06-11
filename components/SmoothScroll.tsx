"use client";

import { ReactLenis } from "lenis/react";
import { MotionConfig } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Buttery momentum scrolling that drives the parallax + reveal animations.
 * MotionConfig reducedMotion="user" globally disables transform animations
 * for users with prefers-reduced-motion; Lenis falls back to native scroll.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const content = <MotionConfig reducedMotion="user">{children}</MotionConfig>;

  if (reduced) return content;

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.085,
        duration: 1.25,
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.6,
      }}
    >
      {content}
    </ReactLenis>
  );
}
