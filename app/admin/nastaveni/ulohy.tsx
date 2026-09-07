"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { spustUlohu } from "@/lib/admin/crony";
import { ULOHY, type VysledekUlohy } from "@/lib/admin/ulohy";

/**
 * Ruční spuštění naplánovaných úloh.
 *
 * Jedno tlačítko na úlohu. Běží to sekundy až desítky sekund, takže se
 * po dobu běhu ztlumí všechna tlačítka — dvakrát spuštěná retence by
 * nezpůsobila nic zlého, ale majitel má vědět, že se něco děje.
 */
export default function Ulohy() {
  const [stav, akce, probiha] = useActionState<VysledekUlohy, FormData>(spustUlohu, {});
  const router = useRouter();

  useEffect(() => {
    if (stav.ok) router.refresh();
  }, [stav.ok, router]);

  return (
    <div className="px-5 py-5">
      <ul className="space-y-3">
        {ULOHY.map((u) => (
          <li key={u.klic} className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] text-linen">{u.nazev}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-sage">{u.popis}</p>
            </div>
            <form action={akce}>
              <input type="hidden" name="uloha" value={u.klic} />
              <button
                disabled={probiha}
                className="flex min-h-11 items-center rounded-full border border-linen/20 px-4 text-[14.5px] text-sage transition-colors hover:border-ember/50 hover:text-ember disabled:opacity-40"
              >
                Spustit teď
              </button>
            </form>
          </li>
        ))}
      </ul>

      {stav.ok && (
        <p role="status" className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-[14px] text-emerald-200">
          {stav.ok}
        </p>
      )}
      {stav.chyba && (
        <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[14px] text-red-200">
          {stav.chyba}
        </p>
      )}
    </div>
  );
}
