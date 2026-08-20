"use client";

import { useActionState } from "react";
import { prihlas, type StavPrihlaseni } from "@/lib/auth/akce";

const POLE =
  "mt-2 w-full rounded-xl border border-linen/15 bg-bark px-4 py-3 text-[15px] text-linen " +
  "placeholder:text-sage/40 focus:border-ember focus:outline-none";

export default function PrihlasovaciFormular() {
  const [stav, akce, probiha] = useActionState<StavPrihlaseni, FormData>(prihlas, {});

  return (
    <form action={akce} className="mt-9 space-y-5">
      <div>
        <label htmlFor="email" className="text-[13px] uppercase tracking-[0.14em] text-sage/70">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className={POLE}
          placeholder="ahoj@sedmyles.cz"
        />
      </div>
      <div>
        <label htmlFor="heslo" className="text-[13px] uppercase tracking-[0.14em] text-sage/70">
          Heslo
        </label>
        <input
          id="heslo"
          name="heslo"
          type="password"
          autoComplete="current-password"
          required
          className={POLE}
        />
      </div>

      {stav.chyba && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {stav.chyba}
        </p>
      )}

      <button
        type="submit"
        disabled={probiha}
        className="w-full rounded-full bg-ember px-6 py-3.5 text-[15px] font-semibold text-night transition-colors hover:bg-ember-soft disabled:opacity-50"
      >
        {probiha ? "Přihlašuji…" : "Přihlásit"}
      </button>
    </form>
  );
}
