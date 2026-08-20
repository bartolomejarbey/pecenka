"use client";

import { useState, useTransition } from "react";
import { ulozPoznamku } from "@/lib/admin/akce";

/**
 * Interní poznámka — žlutá, vždycky nahoře, editace na místě.
 * Host ji nikdy neuvidí; je to lísteček na ledničce.
 */
export default function Poznamka({ kod, text }: { kod: string; text: string | null }) {
  const [hodnota, setHodnota] = useState(text ?? "");
  const [upravuje, setUpravuje] = useState(false);
  const [probiha, start] = useTransition();

  if (!upravuje && !hodnota) {
    return (
      <button
        type="button"
        onClick={() => setUpravuje(true)}
        className="mt-5 text-[13.5px] text-sage underline underline-offset-2 hover:text-ember"
      >
        + Přidat interní poznámku
      </button>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/[0.07] p-5">
      <p className="text-[12px] uppercase tracking-[0.14em] text-amber-200/70">Interní poznámka</p>
      {upravuje ? (
        <>
          <textarea
            value={hodnota}
            onChange={(e) => setHodnota(e.target.value)}
            rows={3}
            autoFocus
            className="mt-2.5 w-full resize-y rounded-lg border border-amber-300/25 bg-night px-3.5 py-2.5 text-[14.5px] text-linen focus:border-amber-300/60 focus:outline-none"
          />
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              disabled={probiha}
              onClick={() =>
                start(async () => {
                  await ulozPoznamku(kod, hodnota);
                  setUpravuje(false);
                })
              }
              className="rounded-lg bg-amber-300/90 px-4 py-2 text-[14px] font-semibold text-night hover:bg-amber-300 disabled:opacity-50"
            >
              {probiha ? "Ukládám…" : "Uložit"}
            </button>
            <button
              type="button"
              onClick={() => {
                setHodnota(text ?? "");
                setUpravuje(false);
              }}
              className="text-[14px] text-sage hover:text-linen"
            >
              Zrušit
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setUpravuje(true)}
          className="mt-2 block w-full whitespace-pre-wrap text-left text-[14.5px] leading-relaxed text-linen"
        >
          {hodnota}
        </button>
      )}
    </div>
  );
}
