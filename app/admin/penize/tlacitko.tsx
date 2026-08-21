"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { oznacZaplaceno } from "@/lib/admin/akce";

/** „Platba dorazila" — dokud neběží párování z banky, je to hlavní cesta. */
export default function TlacitkoZaplaceno({ platbaId }: { platbaId: string }) {
  const router = useRouter();
  const [probiha, start] = useTransition();
  const [chyba, setChyba] = useState<string | null>(null);

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={probiha}
        onClick={() =>
          start(async () => {
            const v = await oznacZaplaceno(platbaId);
            setChyba(v.ok ? null : v.chyba);
            // Zaplacená platba mizí ze seznamu čekajících — bez překreslení
            // by tam zůstala a majitel by ji odklikl podruhé.
            if (v.ok) router.refresh();
          })
        }
        className="shrink-0 rounded-xl border border-ember/40 px-4 py-2 text-[13.5px] font-medium text-ember transition-colors hover:bg-ember/10 disabled:opacity-50"
      >
        {probiha ? "Zapisuji…" : "Dorazilo"}
      </button>
      {chyba && <span className="text-[12px] text-red-300">{chyba}</span>}
    </span>
  );
}
