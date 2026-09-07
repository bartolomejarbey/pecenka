import Image from "next/image";
import { redirect } from "next/navigation";
import { Zkopiruj } from "@/components/pobyt/prvky";
import { HOUSES } from "@/lib/content";
import { nactiInfoDomku } from "@/lib/admin/pobyt";
import { ktoJePrihlasen } from "@/lib/portal/pristup";
import { nactiPrehled } from "@/lib/portal/prehled";

export const dynamic = "force-dynamic";

/**
 * Záložka Domek — všechno o místě, kde host bydlí.
 *
 * Adresa, vstup, wifi, jak funguje topení a voda. Věci, které host hledá
 * opakovaně během pobytu, takže mají vlastní záložku a stálé pořadí: až si
 * jednou najde heslo k wifi, najde ho podruhé na stejném místě.
 */
export default async function DomekPage() {
  const pobyt = await ktoJePrihlasen();
  if (!pobyt) redirect("/pobyt/prihlaseni");

  const [info, prehled] = await Promise.all([
    nactiInfoDomku(pobyt.domekSlug),
    nactiPrehled(pobyt),
  ]);
  const dum = HOUSES.find((h) => h.slug === pobyt.domekSlug);
  const kod = vytahniKod(info?.klice ?? "");

  return (
    <main className="mx-auto max-w-lg px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <h1 className="font-display text-[34px] leading-[1.05] text-linen">{pobyt.domek}</h1>
      {dum && <p className="mt-1.5 text-[15px] text-sage">{dum.tagline}</p>}

      {dum && (
        <div className="relative mt-5 aspect-[4/3] overflow-hidden rounded-2xl">
          <Image src={dum.photoSecondary} alt={dum.photoAlt} fill sizes="(max-width: 640px) 100vw, 512px" className="object-cover" />
        </div>
      )}

      <div className="mt-6 space-y-3">
        {/* Kde to je */}
        <Blok nadpis="Kde to je">
          {info?.adresa ? (
            <>
              <p className="text-[16px] leading-snug text-linen">{info.adresa}</p>
              {info.mapa && (
                <a
                  href={info.mapa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex min-h-[52px] items-center justify-center rounded-full bg-ember px-6 text-[15.5px] font-semibold text-night hover:bg-ember-soft"
                >
                  Navigovat
                </a>
              )}
            </>
          ) : (
            <p className="text-[15px] leading-relaxed text-sage">Adresu doplníme před příjezdem.</p>
          )}
        </Blok>

        {/* Vstup */}
        <Blok nadpis="Jak se dostanete dovnitř">
          {prehled.vstupOdemcen ? (
            <>
              {kod && <Zkopiruj hodnota={kod} popis="Kód od schránky" velky />}
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-linen">
                {info?.klice || "Pokyny doplníme před příjezdem. Kdyby tu nic nebylo, zavolejte — otevřeme na dálku."}
              </p>
            </>
          ) : (
            <p className="text-[15px] leading-relaxed text-sage">
              Kód od schránky se tu ukáže den před příjezdem, ať to nemusíte hledat v e-mailech.
            </p>
          )}
        </Blok>

        {/* Wifi */}
        {prehled.vstupOdemcen && info?.wifiSit && (
          <Blok nadpis="Wi-Fi">
            <div className="space-y-2.5">
              <Zkopiruj hodnota={info.wifiSit} popis="Síť" />
              {info.wifiHeslo && <Zkopiruj hodnota={info.wifiHeslo} popis="Heslo" />}
            </div>
          </Blok>
        )}

        {/* Jak to tu funguje */}
        {info?.poznamky && (
          <Blok nadpis="Jak to tu funguje">
            <ul className="space-y-2.5">
              {info.poznamky
                .split(/\n+/)
                .map((r) => r.trim())
                .filter(Boolean)
                .map((r) => (
                  <li key={r} className="flex gap-3 text-[15px] leading-relaxed text-linen">
                    <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-ember" aria-hidden="true" />
                    {r}
                  </li>
                ))}
            </ul>
          </Blok>
        )}

        <Blok nadpis="Předání">
          <p className="text-[15px] leading-relaxed text-linen">
            Příjezd od {info?.prijezdOd ?? "15:00"}, odjezd do {info?.odjezdDo ?? "10:00"}.
          </p>
          {prehled.doplnky.length > 0 && (
            <p className="mt-2 text-[14.5px] leading-relaxed text-sage">
              Máte objednáno:{" "}
              <span className="text-linen">
                {prehled.doplnky.map((d) => (d.pocet > 1 ? `${d.nazev} ×${d.pocet}` : d.nazev)).join(" · ")}
              </span>
            </p>
          )}
        </Blok>
      </div>
    </main>
  );
}

function Blok({ nadpis, children }: { nadpis: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-linen/10 bg-bark px-5 py-5">
      <h2 className="text-[12px] uppercase tracking-[0.14em] text-sage/80">{nadpis}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function vytahniKod(text: string): string | null {
  const m = text.match(/\b(\d{4,8})\b/);
  return m ? m[1] : null;
}
