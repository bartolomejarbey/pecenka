"use client";

import { useActionState } from "react";
import { prihlas, type StavPrihlaseni } from "@/lib/portal/akce";
import { SITE } from "@/lib/content";
import { telOdkaz } from "@/lib/format";

const POLE =
  "mt-2 w-full rounded-xl border border-linen/15 bg-bark px-4 py-3.5 text-[16px] text-linen " +
  "placeholder:text-sage/70 focus:border-ember focus:outline-none";

export default function Formular({ chybaZOdkazu }: { chybaZOdkazu: string | null }) {
  const [stav, akce, probiha] = useActionState<StavPrihlaseni, FormData>(prihlas, {
    chyba: chybaZOdkazu ?? undefined,
  });

  return (
    <form action={akce} className="mt-7 space-y-4">
      <div>
        <label htmlFor="vs" className="text-[13px] uppercase tracking-[0.14em] text-sage/70">
          Variabilní symbol
        </label>
        <input
          id="vs" name="vs" inputMode="numeric" autoComplete="off" required
          placeholder="2609000018" className={POLE}
          // Deset číslic — číselná klávesnice a žádné automatické opravy.
          maxLength={10} pattern="[0-9]*"
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
          maxLength={8} autoCapitalize="characters" autoCorrect="off" spellCheck={false}
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

      <p className="text-[13.5px] leading-relaxed text-sage/80">
        Kód nemáte, nebo vám nesedí?
      </p>
      {/*
        * Cesta ven, ne odkaz uvnitř věty.
        *
        * Host bez kódu je tady zaseknutý — tohle je jediná obrazovka, kterou
        * vidí. Malý odkaz v odstavci je pro něj slepá ulička; potřebuje
        * tlačítko, které se dá trefit palcem.
        */}
      <div className="grid grid-cols-2 gap-2.5">
        <a
          href={telOdkaz(SITE.phone)}
          className="flex min-h-[52px] items-center justify-center rounded-full border border-linen/20 text-[15px] text-linen transition-colors hover:border-ember/45 hover:text-ember"
        >
          Zavolat
        </a>
        <a
          href={`mailto:${SITE.email}?subject=${encodeURIComponent("Přístup k pobytu")}`}
          className="flex min-h-[52px] items-center justify-center rounded-full border border-linen/20 text-[15px] text-linen transition-colors hover:border-ember/45 hover:text-ember"
        >
          Napsat e-mail
        </a>
      </div>
      <p className="text-[13.5px] leading-relaxed text-sage/80">
        Pošleme ho znovu, obvykle do pár minut.
      </p>
    </form>
  );
}
