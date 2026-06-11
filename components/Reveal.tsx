"use client";

import { motion, type Variants } from "motion/react";
import type { ReactNode } from "react";

const variants: Variants = {
  hidden: { opacity: 0, y: 38 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.9,
      delay: i * 0.08,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

const TAGS = {
  div: motion.div,
  span: motion.span,
  li: motion.li,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
} as const;

/** Staggered fade-up that fires once when the element scrolls into view. */
export default function Reveal({
  children,
  i = 0,
  className,
  as = "div",
  amount = 0.3,
}: {
  children: ReactNode;
  i?: number;
  className?: string;
  as?: keyof typeof TAGS;
  amount?: number;
}) {
  const MotionTag = TAGS[as];
  return (
    <MotionTag
      className={className}
      custom={i}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
    >
      {children}
    </MotionTag>
  );
}
