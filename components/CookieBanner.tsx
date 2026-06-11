"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const KEY = "sedmyles-cookies";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setVisible(true);
  }, []);

  const decide = (value: "all" | "necessary") => {
    localStorage.setItem(KEY, value);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-xl rounded-3xl border border-linen/10 bg-pine/95 p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl md:inset-x-auto md:right-6 md:bottom-6"
          role="dialog"
          aria-label="Nastavení cookies"
        >
          <p className="text-sm leading-relaxed text-sage">
            I v lese máme pár cookies. Nutné pro chod webu a — jen pokud dovolíte —
            anonymní statistiky návštěvnosti. Podrobnosti v{" "}
            <Link href="/cookies" className="text-ember underline underline-offset-2">
              zásadách cookies
            </Link>
            .
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => decide("all")}
              className="rounded-full bg-ember px-5 py-2 text-sm font-semibold text-night transition-colors hover:bg-ember-soft"
            >
              Přijmout vše
            </button>
            <button
              onClick={() => decide("necessary")}
              className="rounded-full border border-linen/20 px-5 py-2 text-sm font-semibold text-linen transition-colors hover:border-linen/50"
            >
              Jen nutné
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
