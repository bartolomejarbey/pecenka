"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export type FaqItem = { q: string; a: string };

/** Akordeon častých dotazů — jedna otevřená odpověď, plynulá výška. */
export default function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const uid = useId();

  return (
    <div role="list">
      {items.map((item, idx) => {
        const isOpen = open === idx;
        const questionId = `${uid}-otazka-${idx}`;
        const answerId = `${uid}-odpoved-${idx}`;
        return (
          <div key={item.q} role="listitem" className="border-b border-linen/10">
            <button
              type="button"
              id={questionId}
              aria-expanded={isOpen}
              aria-controls={answerId}
              onClick={() => setOpen(isOpen ? null : idx)}
              className="group flex w-full items-center justify-between gap-6 py-6 text-left md:py-7"
            >
              <span
                className={`font-display text-lg transition-colors duration-300 md:text-xl ${
                  isOpen ? "text-linen" : "text-linen/85 group-hover:text-linen"
                }`}
              >
                {item.q}
              </span>
              <span
                aria-hidden="true"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isOpen
                    ? "rotate-45 border-ember/40 text-ember"
                    : "border-linen/15 text-sage group-hover:border-ember/30 group-hover:text-ember"
                }`}
              >
                <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5">
                  <path
                    d="M7 1v12M1 7h12"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="answer"
                  id={answerId}
                  role="region"
                  aria-labelledby={questionId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-2xl pb-7 pr-12 text-[15.5px] leading-relaxed text-sage">
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
