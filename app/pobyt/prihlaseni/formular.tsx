"use client";

import { useActionState } from "react";
import { prihlas, type StavPrihlaseni } from "@/lib/portal/akce";

const POLE =
  "mt-2 w-full rounded-xl border border-linen/15 bg-bark px-4 py-3.5 text-[16px] text-linen " +
  "placeholder:text-sage/40 focus:border-ember focus:outline-none";

export default function Formular() {
  const [stav, akce, probiha] = useActionState<StavPrihlaseni, FormData>(prihlas, {});

  return (
    <form action={akce} className="mt-8 space-y-5">
      <div>
        <label htmlFor="vs" className="text-[13px] uppercase tracking-[0.14em] text-sage/70">
          Variabilní symbol
        </label>
        <input
          id="vs" name="vs" inputMode="numeric" autoComplete="off" required
          placeholder="2609000018" className={POLE}
        />
      </div>
      <div>
        <label htmlFor="kod" className="text-[13px] uppercase tracking-[0.14em] text-sage/70">
          Přístupový kód
        </label>
        <input
          id="kod" name="kod" autoComplete="off" required
          placeholder="8 znaků z e-mailu"
          className={`${POLE} font-display tracking-[0.2em]`}
          style={{ textTransform: "uppercase" }}
        />
      </div>

      {stav.chyba && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {stav.chyba}
        </p>
      )}

      <button
        type="submit" disabled={probiha}
        className="w-full rounded-full bg-ember px-6 py-4 text-[16px] font-semibold text-night transition-colors hover:bg-ember-soft disabled:opacity-50"
      >
        {probiha ? "Přihlašuji…" : "Vstoupit"}
      </button>

      <p className="text-[13.5px] leading-relaxed text-sage/70">
        Kód nemáte? Napište nám na{" "}
        <a href="mailto:ahoj@sedmyles.cz" className="text-ember underline underline-offset-2">
          ahoj@sedmyles.cz
        </a>{" "}
        a pošleme ho znovu.
      </p>
    </form>
  );
}
