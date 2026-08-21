"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { vyuctujSkodu } from "@/lib/luna/rozhodnuti";

/**
 * Vyúčtování rozhodnuté škody.
 *
 * Rozhodnutí se dosud jen zapsalo a hláška slibovala, že se to „vyfakturuje" —
 * ale nebylo kudy. Doklad se vystaví z toho, co provozovatel napsal vlastními
 * slovy; ten text jde hostovi na doklad jako důvod.
 */
export default function Vyuctovat({
  pripadId,
  castka,
  sluzba,
}: {
  pripadId: string;
  castka: number;
  sluzba: boolean;
}) {
  const router = useRouter();
  const [probiha, start] = useTransition();
  const [hlaska, setHlaska] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={probiha}
        onClick={() =>
          start(async () => {
            const v = await vyuctujSkodu(pripadId);
            setHlaska(v.ok ? { ok: true, text: v.zprava ?? "Hotovo." } : { ok: false, text: v.chyba });
            if (v.ok) router.refresh();
          })
        }
        className="rounded-xl border border-ember/40 px-4 py-2 text-[13.5px] font-medium text-ember transition-colors hover:bg-ember/10 disabled:opacity-50"
      >
        {probiha
          ? "Vystavuji…"
          : `Vyúčtovat ${castka.toLocaleString("cs-CZ")} Kč hostovi`}
      </button>
      <p className="mt-2 text-[12.5px] text-sage/70">
        {sluzba
          ? "Vystaví se faktura za službu."
          : "Vystaví se vyúčtování náhrady škody — mimo předmět DPH."}
      </p>
      {hlaska && (
        <p
          role="status"
          className={`mt-2.5 text-[13.5px] ${hlaska.ok ? "text-ok" : "text-vazne"}`}
        >
          {hlaska.text}
        </p>
      )}
    </div>
  );
}
