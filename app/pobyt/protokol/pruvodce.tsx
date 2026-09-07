"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
 * neodešle vůbec. Ze stejného důvodu si stránka **drží soubor v paměti**,
 * dokud se nenahraje — po výpadku stačí ťuknout na „Zkusit znovu" a host
 * nemusí fotit podruhé.
 */

/**
 * Klíč stavu jedné zóny.
 *
 * Musí nést i domek: u „Celého lesa" má Achát i Mech zónu `seating` a bez
 * rozlišení by se fotky navzájem přepisovaly ve stavu průvodce.
 */
const klicZony = (z: { domekSlug: string; klic: string }) => `${z.domekSlug}/${z.klic}`;

type Stav = {
  hotovo: boolean;
  nahled: string | null;
  /** Náhled je z prohlížeče a je potřeba ho po sobě uklidit. */
  nahledJeMistni: boolean;
  nahravaSe: boolean;
  chyba: string | null;
  /** Nenahraný soubor, na který jde zopakovat pokus. */
  cekajici: Blob | null;
};

/**
 * Zmenšení v prohlížeči.
 *
 * Fotka z dnešního telefonu má osm až dvanáct megabajtů a na kraji signálu
 * se nahrává minuty — když vůbec. Server ji stejně zmenší na 1092 px, takže
 * posílat originál je jen daň za pomalejší připojení. Vedlejší přínos:
 * prohlížeč dekóduje i HEIC z iPhonu a ven jde obyčejný JPEG.
 *
 * Když cokoli selže, pošle se původní soubor. Zmenšení je optimalizace,
 * ne podmínka.
 */
const HRANA = 1920;

async function zmensi(soubor: File): Promise<Blob> {
  try {
    const bitmapa = await createImageBitmap(soubor);
    const pomer = Math.min(1, HRANA / Math.max(bitmapa.width, bitmapa.height));
    const sirka = Math.round(bitmapa.width * pomer);
    const vyska = Math.round(bitmapa.height * pomer);

    const platno = document.createElement("canvas");
    platno.width = sirka;
    platno.height = vyska;
    const ctx = platno.getContext("2d");
    if (!ctx) return soubor;
    ctx.drawImage(bitmapa, 0, 0, sirka, vyska);
    bitmapa.close();

    const blob = await new Promise<Blob | null>((r) => platno.toBlob(r, "image/jpeg", 0.85));
    // Pojistka: kdyby zmenšení vyrobilo něco většího nebo prázdného.
    return blob && blob.size > 1000 && blob.size < soubor.size ? blob : soubor;
  } catch {
    return soubor;
  }
}

export default function Pruvodce({
  domek,
  zony,
  doplneni = false,
  viceDomku = false,
}: {
  domek: string;
  zony: StavZony[];
  /** Druhé kolo — host doplňuje jen zóny, o které jsme si řekli. */
  doplneni?: boolean;
  /** „Celý les" jsou dva domky. Pak se u každé zóny musí ukázat, který to je. */
  viceDomku?: boolean;
}) {
  const [krok, setKrok] = useState(() => {
    const i = zony.findIndex((z) => !z.hotovo);
    return i === -1 ? 0 : i;
  });
  const [stavy, setStavy] = useState<Record<string, Stav>>(() =>
    Object.fromEntries(
      zony.map((z) => [
        klicZony(z),
        {
          hotovo: z.hotovo,
          nahled: z.fotkaUrl,
          nahledJeMistni: false,
          nahravaSe: false,
          chyba: null,
          cekajici: null,
        },
      ]),
    ),
  );
  const vstup = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const nadpis = useRef<HTMLHeadingElement>(null);
  /* Ať automatický přechod nepřepíše krok, na který host mezitím sám přešel. */
  const krokRef = useRef(krok);
  krokRef.current = krok;

  const zona = zony[krok];
  const stav = stavy[klicZony(zona)];
  const chybejici = useMemo(
    () => zony.filter((z) => z.povinna && !stavy[klicZony(z)]?.hotovo),
    [zony, stavy],
  );
  const hotovychCelkem = zony.filter((z) => stavy[klicZony(z)]?.hotovo).length;

  /* Po přechodu na jinou zónu srolovat nahoru — jinak host kouká doprostřed
     předchozí obrazovky a neví, že se něco změnilo. */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    nadpis.current?.focus();
  }, [krok]);

  /* Náhledy z prohlížeče po sobě uklidit. Dvanáct osmimegových obrázků
     v paměti Safari znamená, že se karta na půl cesty zavře. */
  useEffect(() => {
    return () => {
      for (const s of Object.values(stavy)) {
        if (s.nahledJeMistni && s.nahled) URL.revokeObjectURL(s.nahled);
      }
    };
    // Úklid má proběhnout jen při opuštění průvodce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const posli = useCallback(
    async (z: StavZony, data: Blob) => {
      const form = new FormData();
      form.append("fotka", data, "fotka.jpg");
      form.append("zona", z.klic);
      form.append("dum", z.domekSlug);
      // Stálý identifikátor na zónu: opakované focení tutéž fotku nahradí,
      // místo aby vyrábělo řádky, mezi kterými se pak neví, který platí.
      form.append("id", z.klic);

      const o = await fetch("/api/pobyt/foto", { method: "POST", body: form });
      const d = (await o.json()) as { ok?: boolean; error?: string; nahled?: string | null };
      if (!o.ok || !d.ok) throw new Error(d.error ?? "Nahrání se nepovedlo.");
      return d.nahled ?? null;
    },
    [],
  );

  const nahraj = useCallback(
    async (z: StavZony, vstupniData: Blob, nahledUrl: string | null) => {
      const klic = klicZony(z);
      setStavy((s) => {
        const stary = s[klic];
        if (stary.nahledJeMistni && stary.nahled && stary.nahled !== nahledUrl) {
          URL.revokeObjectURL(stary.nahled);
        }
        return {
          ...s,
          [klic]: {
            ...stary,
            nahravaSe: true,
            chyba: null,
            cekajici: vstupniData,
            nahled: nahledUrl ?? stary.nahled,
            nahledJeMistni: nahledUrl ? true : stary.nahledJeMistni,
          },
        };
      });

      try {
        const zeServeru = await posli(z, vstupniData);
        setStavy((s) => {
          const stary = s[klic];
          // Náhled ze serveru je ta fotka, kterou se opravdu bude porovnávat.
          if (zeServeru && stary.nahledJeMistni && stary.nahled) URL.revokeObjectURL(stary.nahled);
          return {
            ...s,
            [klic]: {
              ...stary,
              hotovo: true,
              nahravaSe: false,
              cekajici: null,
              nahled: zeServeru ?? stary.nahled,
              nahledJeMistni: zeServeru ? false : stary.nahledJeMistni,
            },
          };
        });
        // Automaticky dál — host nemá klikat víc, než musí.
        const kdyzToBylTenhle = zony.findIndex((x) => klicZony(x) === klic);
        setTimeout(() => {
          if (krokRef.current === kdyzToBylTenhle) {
            setKrok((k) => Math.min(k + 1, zony.length - 1));
          }
        }, 500);
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
    },
    [posli, zony],
  );

  async function vybrano(soubor: File) {
    const kteraZona = zona;
    const nahled = URL.createObjectURL(soubor);
    const zmensena = await zmensi(soubor);
    void nahraj(kteraZona, zmensena, nahled);
  }

  return (
    <main
      className="mx-auto flex min-h-svh max-w-lg flex-col px-5 py-6"
      /* Seznam zón i pro automatický průchod — průvodce ukazuje vždy jen
         jednu zónu, takže z viditelné stránky se ostatní vyčíst nedají.
         Tvar `domek/zóna`, protože „Celý les" má tutéž zónu dvakrát. */
      data-zony={zony.map(klicZony).join(",")}
    >
      {/* Postup */}
      <div className="flex items-center gap-3">
        <Link
          href="/pobyt/odjezd"
          className="-ml-2 flex min-h-11 items-center px-2 text-[14px] text-sage hover:text-ember"
        >
          ← Odjezd
        </Link>
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {zony.map((z, i) => (
            <span
              key={klicZony(z)}
              className={`h-1 flex-1 rounded-full ${
                stavy[klicZony(z)]?.hotovo ? "bg-ember" : i === krok ? "bg-ember/40" : "bg-linen/12"
              }`}
            />
          ))}
        </div>
        <span className="text-[13px] tabular-nums text-sage">
          {krok + 1}/{zony.length}
        </span>
      </div>

      <p className="kicker mt-7 text-sage">
        {viceDomku ? zona.domek : domek}
        {doplneni && " · doplnění"}
      </p>
      <h1
        ref={nadpis}
        tabIndex={-1}
        data-fokus-tise
        className="font-display mt-2 text-3xl text-linen"
      >
        {zona.nazev}
        {!zona.povinna && <span className="ml-3 text-[14px] font-normal text-sage/80">nepovinné</span>}
      </h1>
      <p className="mt-3 text-[15.5px] leading-relaxed text-sage">{zona.navod}</p>

      {/* Referenční snímek */}
      {zona.referenceUrl && (
        <figure className="mt-6">
          <figcaption className="text-[12px] uppercase tracking-[0.14em] text-sage/80">
            Takhle to vypadalo při předání
          </figcaption>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zona.referenceUrl}
            alt=""
            className="mt-2 w-full rounded-2xl border border-linen/10"
            loading="lazy"
          />
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
          <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-linen/20 text-[14.5px] text-sage/80">
            Zatím bez fotky
          </div>
        )}

        <p aria-live="polite" className="sr-only">
          {stav.nahravaSe
            ? "Nahrávám fotku."
            : stav.hotovo
              ? `${zona.nazev} — fotka uložena.`
              : ""}
        </p>

        {stav.chyba && (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-ember/40 bg-ember/10 px-4 py-3.5 text-[14.5px] leading-relaxed text-ember"
          >
            {stav.chyba}
            {stav.cekajici && (
              <button
                type="button"
                onClick={() => void nahraj(zona, stav.cekajici!, null)}
                className="mt-3 flex min-h-11 w-full items-center justify-center rounded-full border border-ember px-5 text-[15px] font-semibold text-ember"
              >
                Zkusit znovu
              </button>
            )}
          </div>
        )}
      </div>

      {/* Ovládání */}
      <div className="sticky bottom-0 -mx-5 mt-8 bg-night px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <input
          ref={vstup}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void vybrano(f);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => vstup.current?.click()}
          disabled={stav.nahravaSe}
          className="flex min-h-[56px] w-full items-center justify-center rounded-full bg-ember px-6 text-[16px] font-semibold text-night transition-colors hover:bg-ember-soft disabled:opacity-50"
        >
          {stav.hotovo ? "Vyfotit znovu" : "Vyfotit"}
        </button>

        <div className="mt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setKrok((k) => Math.max(0, k - 1))}
            disabled={krok === 0}
            className="-ml-3 flex min-h-11 items-center px-3 text-[15px] text-sage disabled:opacity-30"
          >
            Předchozí
          </button>
          <button
            type="button"
            onClick={() => setKrok((k) => Math.min(zony.length - 1, k + 1))}
            disabled={krok === zony.length - 1}
            className="-mr-3 flex min-h-11 items-center px-3 text-[15px] text-sage disabled:opacity-30"
          >
            {zona.povinna && !stav.hotovo ? "Přeskočit" : "Další"}
          </button>
        </div>

        {(krok === zony.length - 1 || chybejici.length === 0) && (
          <div className="mt-4 border-t border-linen/10 pt-4">
            {chybejici.length > 0 ? (
              <>
                <p className="text-[14.5px] leading-relaxed text-sage">
                  Ještě {chybejici.length}{" "}
                  {chybejici.length === 1
                    ? "povinné místo"
                    : chybejici.length < 5
                      ? "povinná místa"
                      : "povinných míst"}
                  . Ťukněte a doplňte:
                </p>
                <ul className="mt-2.5 flex flex-wrap gap-2">
                  {chybejici.map((z) => (
                    <li key={klicZony(z)}>
                      <button
                        type="button"
                        onClick={() => setKrok(zony.findIndex((x) => klicZony(x) === klicZony(z)))}
                        className="flex min-h-11 items-center rounded-full border border-ember/40 px-4 text-[14.5px] text-ember"
                      >
                        {viceDomku ? `${z.domek} — ${z.nazev}` : z.nazev}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              /*
               * Průvodce nic neodesílá.
               *
               * Odjezd má tři části a fotky jsou jedna z nich; odeslat pobyt
               * uprostřed focení by znamenalo, že se host o zbytku nedozví.
               * Odsud vede cesta zpátky na „Dokončení pobytu", kde to má
               * všechno pohromadě.
               */
              <button
                type="button"
                onClick={() => router.push("/pobyt/odjezd")}
                className="flex min-h-[56px] w-full items-center justify-center rounded-full bg-ember px-6 text-[16px] font-semibold text-night transition-colors hover:bg-ember-soft"
              >
                {doplneni ? "Hotovo — zpět na odjezd" : `Mám všech ${hotovychCelkem} fotek — zpět na odjezd`}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
