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
      className="cookie-bar fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-xl rounded-3xl border border-linen/10 bg-pine p-5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] md:inset-x-auto md:bottom-6 md:right-6"
    >
      <p className="text-sm leading-relaxed text-sage">
        I v lese máme pár nezbytných cookies, aby web fungoval. Žádné sledovací
        ani marketingové nepoužíváme. Víc v{" "}
        <Link href="/cookies" className="text-ember underline underline-offset-2">
          zásadách cookies
        </Link>
        .
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={acknowledge}
          className="rounded-full bg-ember px-5 py-2 text-sm font-semibold text-night transition-colors hover:bg-ember-soft"
        >
          Rozumím
        </button>
      </div>
    </div>
  );
}
