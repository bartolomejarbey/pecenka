"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { StavZony } from "@/lib/portal/protokol";

/**
 * Foto-protokol pro hosta.
 *
 * Jedna zóna na obrazovku, velké tlačítko, žádné rozhodování. Host stojí
 * v domku s taškou v ruce a chce být hotový — každý krok navíc znamená,
 * že to vzdá v polovině.
 *
 * Nahrává se hned po vyfocení, ne až na konci: v lese padá signál a vracet
 * se k dvanácti fotkám najednou je jistá cesta k tomu, že se protokol
 * neodešle vůbec.
 */

type Stav = { hotovo: boolean; nahled: string | null; nahravaSe: boolean; chyba: string | null };

export default function Pruvodce({ domek, zony }: { domek: string; zony: StavZony[] }) {
  const [krok, setKrok] = useState(() => {
    const i = zony.findIndex((z) => !z.hotovo);
    return i === -1 ? 0 : i;
  });
  const [stavy, setStavy] = useState<Record<string, Stav>>(() =>
    Object.fromEntries(
      zony.map((z) => [z.klic, { hotovo: z.hotovo, nahled: z.fotkaUrl, nahravaSe: false, chyba: null }]),
    ),
  );
  const [odesila, setOdesila] = useState(false);
  const [chybaOdeslani, setChybaOdeslani] = useState<string | null>(null);
  const [hotovo, setHotovo] = useState(false);
  const vstup = useRef<HTMLInputElement>(null);

  const zona = zony[krok];
  const stav = stavy[zona.klic];
  const povinnychZbyva = useMemo(
    () => zony.filter((z) => z.povinna && !stavy[z.klic]?.hotovo).length,
    [zony, stavy],
  );
  const hotovychCelkem = zony.filter((z) => stavy[z.klic]?.hotovo).length;

  async function nahraj(soubor: File) {
    const klic = zona.klic;
    setStavy((s) => ({
      ...s,
      [klic]: { ...s[klic], nahravaSe: true, chyba: null, nahled: URL.createObjectURL(soubor) },
    }));

    const form = new FormData();
    form.append("fotka", soubor);
    form.append("zona", klic);
    form.append("id", `${klic}-${Date.now()}`);

    try {
      const o = await fetch("/api/pobyt/foto", { method: "POST", body: form });
      const d = (await o.json()) as { ok?: boolean; error?: string };
      if (!o.ok || !d.ok) throw new Error(d.error ?? "Nahrání se nepovedlo.");
      setStavy((s) => ({ ...s, [klic]: { ...s[klic], hotovo: true, nahravaSe: false } }));
      // Automaticky dál — host nemá klikat víc, než musí.
      setTimeout(() => setKrok((k) => Math.min(k + 1, zony.length - 1)), 450);
    } catch (e) {
      setStavy((s) => ({
        ...s,
        [klic]: {
          ...s[klic],
          nahravaSe: false,
          chyba: e instanceof Error ? e.message : "Nahrání se nepovedlo.",
        },
      }));
    }
  }

  async function odesli() {
    setOdesila(true);
    setChybaOdeslani(null);
    try {
      const o = await fetch("/api/pobyt/odeslat", { method: "POST" });
      const d = (await o.json()) as { ok?: boolean; error?: string };
      if (!o.ok || !d.ok) throw new Error(d.error ?? "Odeslání se nepovedlo.");
      setHotovo(true);
    } catch (e) {
      setChybaOdeslani(e instanceof Error ? e.message : "Odeslání se nepovedlo.");
    } finally {
      setOdesila(false);
    }
  }

  if (hotovo) {
    return (
      <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center px-5 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-ember text-night">
          <svg viewBox="0 0 24 24" fill="none" className="h-9 w-9">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="font-display mt-7 text-3xl text-linen">Hotovo, děkujeme.</h1>
        <p className="mt-4 max-w-sm text-[15.5px] leading-relaxed text-sage">
          Protokol máme. Projdeme ho a ozveme se jen tehdy, kdyby bylo něco
          potřeba řešit. Šťastnou cestu domů.
        </p>
        <Link href="/pobyt" className="mt-8 text-[15px] text-ember underline underline-offset-4">
          Zpět na přehled
        </Link>
      </main>
    );
  }

  return (
    <main
      className="mx-auto flex min-h-svh max-w-lg flex-col px-5 py-8"
      /* Seznam zón i pro automatický průchod — průvodce ukazuje vždy jen
         jednu zónu, takže z viditelné stránky se ostatní vyčíst nedají. */
      data-zony={zony.map((z) => z.klic).join(",")}
    >
      {/* Postup */}
      <div className="flex items-center gap-3">
        <Link href="/pobyt" className="text-[13.5px] text-sage hover:text-ember">← Zpět</Link>
        <div className="flex flex-1 gap-1">
          {zony.map((z, i) => (
            <span
              key={z.klic}
              className={`h-1 flex-1 rounded-full ${
                stavy[z.klic]?.hotovo ? "bg-ember" : i === krok ? "bg-ember/40" : "bg-linen/12"
              }`}
            />
          ))}
        </div>
        <span className="text-[13px] tabular-nums text-sage">
          {krok + 1}/{zony.length}
        </span>
      </div>

      <p className="kicker mt-8 text-sage">{domek}</p>
      <h1 className="font-display mt-2 text-3xl text-linen">
        {zona.nazev}
        {!zona.povinna && <span className="ml-3 text-[14px] font-normal text-sage/60">nepovinné</span>}
      </h1>
      <p className="mt-3 text-[15.5px] leading-relaxed text-sage">{zona.navod}</p>

      {/* Referenční snímek */}
      {zona.referenceUrl && (
        <figure className="mt-6">
          <figcaption className="text-[12px] uppercase tracking-[0.14em] text-sage/70">
            Takhle to vypadalo při předání
          </figcaption>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zona.referenceUrl} alt="" className="mt-2 w-full rounded-2xl border border-linen/10" />
        </figure>
      )}

      {/* Fotka od hosta */}
      <div className="mt-6 flex-1">
        {stav.nahled ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={stav.nahled} alt="Vaše fotka" className="w-full rounded-2xl border border-ember/30" />
            {stav.nahravaSe && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-night/70 text-[15px] text-linen">
                Nahrávám…
              </div>
            )}
            {stav.hotovo && !stav.nahravaSe && (
              <span className="absolute right-3 top-3 rounded-full bg-ember px-3 py-1 text-[12px] font-semibold text-night">
                Uloženo
              </span>
            )}
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-linen/20 text-[14.5px] text-sage/60">
            Zatím bez fotky
          </div>
        )}

        {stav.chyba && (
          <p role="alert" className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {stav.chyba}
          </p>
        )}
      </div>

      {/* Ovládání */}
      <div className="sticky bottom-0 -mx-5 mt-8 bg-night px-5 pb-6 pt-4">
        <input
          ref={vstup}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void nahraj(f);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => vstup.current?.click()}
          disabled={stav.nahravaSe}
          className="w-full rounded-full bg-ember px-6 py-4 text-[16px] font-semibold text-night transition-colors hover:bg-ember-soft disabled:opacity-50"
        >
          {stav.hotovo ? "Vyfotit znovu" : "Vyfotit"}
        </button>

        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setKrok((k) => Math.max(0, k - 1))}
            disabled={krok === 0}
            className="text-[14.5px] text-sage disabled:opacity-30"
          >
            Předchozí
          </button>
          <button
            type="button"
            onClick={() => setKrok((k) => Math.min(zony.length - 1, k + 1))}
            disabled={krok === zony.length - 1}
            className="text-[14.5px] text-sage disabled:opacity-30"
          >
            {zona.povinna && !stav.hotovo ? "Přeskočit" : "Další"}
          </button>
        </div>

        {krok === zony.length - 1 && (
          <div className="mt-5 border-t border-linen/10 pt-5">
            {povinnychZbyva > 0 ? (
              <p className="text-[14.5px] text-sage">
                Ještě {povinnychZbyva}{" "}
                {povinnychZbyva === 1 ? "povinná zóna" : povinnychZbyva < 5 ? "povinné zóny" : "povinných zón"}.
                Vraťte se prosím a doplňte je.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={odesli}
                  disabled={odesila}
                  className="w-full rounded-full border border-ember px-6 py-4 text-[16px] font-semibold text-ember transition-colors hover:bg-ember/10 disabled:opacity-50"
                >
                  {odesila ? "Odesílám…" : `Odeslat protokol (${hotovychCelkem} fotek)`}
                </button>
                {chybaOdeslani && (
                  <p role="alert" className="mt-3 text-sm text-red-300">{chybaOdeslani}</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
