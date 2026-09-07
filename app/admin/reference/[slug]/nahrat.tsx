"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { nahrajReferenciAkce, type StavReference } from "@/lib/admin/reference-akce";

/**
 * Nahrání jedné referenční fotky.
 *
 * Formulář na zónu, ne jeden na celou stránku: majitel obchází domek a fotí
 * postupně, ne že by dvanáct souborů vybral najednou. Po úspěchu se stránka
 * překreslí, aby byl nový snímek hned vidět — bez toho vypadá uložení jako
 * by se nic nestalo.
 */
export default function Nahrat({
  domek,
  zona,
  maSnimek,
}: {
  domek: string;
  zona: string;
  maSnimek: boolean;
}) {
  const [stav, akce, probiha] = useActionState<StavReference, FormData>(nahrajReferenciAkce, {});
  const vstup = useRef<HTMLInputElement>(null);
  const formular = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (stav.ok) router.refresh();
  }, [stav.ok, router]);

  return (
    <form ref={formular} action={akce} className="mt-4">
      <input type="hidden" name="domek" value={domek} />
      <input type="hidden" name="zona" value={zona} />
      <input
        ref={vstup}
        type="file"
        name="fotka"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={() => formular.current?.requestSubmit()}
      />

      <button
        type="button"
        onClick={() => vstup.current?.click()}
        disabled={probiha}
        className="flex min-h-[48px] w-full items-center justify-center rounded-full border border-ember px-5 text-[15px] font-semibold text-ember transition-colors hover:bg-ember/10 disabled:opacity-50"
      >
        {probiha ? "Nahrávám…" : maSnimek ? "Nahradit fotku" : "Nahrát fotku"}
      </button>

      {stav.chyba && (
        <p role="alert" className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[14px] leading-relaxed text-red-200">
          {stav.chyba}
        </p>
      )}
      {stav.ok && (
        <p
          role="status"
          className={`mt-3 rounded-xl px-4 py-3 text-[14px] leading-relaxed ${
            stav.varovani
              ? "border border-ember/40 bg-ember/10 text-ember"
              : "border border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
          }`}
        >
          {stav.ok} {stav.varovani}
        </p>
      )}
    </form>
  );
}
