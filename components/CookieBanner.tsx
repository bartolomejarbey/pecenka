"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "sedmyles-cookies";

/** Lišta o cookies. Nájezd i odjezd řeší CSS — žádná animační knihovna. */
export default function CookieBanner() {
  const [state, setState] = useState<"hidden" | "open" | "closing">("hidden");

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setState("open");
  }, []);

  useEffect(() => {
    if (state !== "closing") return;
    const t = setTimeout(() => setState("hidden"), 320);
    return () => clearTimeout(t);
  }, [state]);

  if (state === "hidden") return null;

  const acknowledge = () => {
    localStorage.setItem(KEY, "ack");
    setState("closing");
  };

  return (
    <div
      role="dialog"
      aria-label="Nastavení cookies"
      data-closing={state === "closing" ? "" : undefined}
      className="cookie-bar fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-lg flex-col gap-3 rounded-2xl border border-linen/10 bg-pine p-4 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] sm:flex-row sm:items-center md:inset-x-auto md:bottom-5 md:right-5"
    >
      <p className="text-[13.5px] leading-relaxed text-sage">
        Používáme jen nezbytné cookies, aby web fungoval. Žádné sledovací ani
        marketingové. Víc v{" "}
        <Link href="/cookies" className="text-ember underline underline-offset-2">
          zásadách cookies
        </Link>
        .
      </p>
      <div className="shrink-0">
        <button
          onClick={acknowledge}
          className="w-full rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-night transition-colors hover:bg-ember-soft sm:w-auto"
        >
          Rozumím
        </button>
      </div>
    </div>
  );
}
