"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { spustVyhodnoceni, uzavriInspekci } from "@/lib/luna/rozhodnuti";

export default function Uzavrit({ inspekceId }: { inspekceId: string }) {
  const router = useRouter();
  const [probiha, start] = useTransition();
  const [hlaska, setHlaska] = useState<string | null>(null);

  const tl = "rounded-xl border border-linen/15 px-4 py-2.5 text-[14px] text-sage transition-colors hover:border-linen/30 hover:text-linen disabled:opacity-40";

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <button
        type="button" className={tl} disabled={probiha}
        onClick={() =>
          start(async () => {
            const v = await uzavriInspekci(inspekceId);
            setHlaska(v.ok ? "Uzavřeno." : "Nepovedlo se.");
            if (v.ok) router.refresh();
          })
        }
      >
        Uzavřít bez nároku
      </button>
      <button
        type="button" className={tl} disabled={probiha}
        onClick={() => start(async () => {
          const v = await spustVyhodnoceni(inspekceId);
          setHlaska(v.ok ? v.zprava : v.chyba);
        })}
      >
        {probiha ? "Pracuji…" : "Vyhodnotit znovu"}
      </button>
      {hlaska && <span className="text-[13.5px] text-sage">{hlaska}</span>}
    </div>
  );
}
