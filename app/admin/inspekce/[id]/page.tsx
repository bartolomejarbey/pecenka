import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { vyzadujPrihlaseni } from "@/lib/auth/dal";
import { nactiDetailInspekce } from "@/lib/luna/admin";
import { formatHalere } from "@/lib/booking";
import Shell from "@/components/admin/Shell";
import { Odznak } from "@/components/admin/prvky";
import Rozhodnuti from "./rozhodnuti";
import Uzavrit from "./uzavrit";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const ZAVAZNOST: Record<string, { popis: string; ton: "zaplaceno" | "zaloha" | "neutral" | "pozor" }> = {
  none: { popis: "Beze změny", ton: "zaplaceno" },
  dirt: { popis: "Nepořádek", ton: "neutral" },
  wear: { popis: "Opotřebení", ton: "neutral" },
  damage_minor: { popis: "Drobné poškození", ton: "zaloha" },
  damage_major: { popis: "Výrazné poškození", ton: "pozor" },
  missing: { popis: "Chybí vybavení", ton: "pozor" },
};

export default async function DetailInspekce({ params }: { params: Promise<{ id: string }> }) {
  const kdo = await vyzadujPrihlaseni();
  const { id } = await params;
  const i = await nactiDetailInspekce(id);
  if (!i) notFound();

  const kRozhodnuti = i.zony.filter((z) => z.pripadId && !z.rozhodnuto);

  return (
    <Shell
      kdo={kdo}
      aktivni="/admin/inspekce"
      nadpis={i.jmeno ?? i.kodRezervace}
      akce={<Link href="/admin/inspekce" className="text-[13.5px] text-sage hover:text-ember">← Zpět</Link>}
    >
      <div className="rounded-2xl border border-linen/10 bg-bark p-5 md:p-6">
        <p className="text-[14px] text-sage">
          {i.domek} ·{" "}
          <Link href={`/admin/rezervace/${i.kodRezervace}`} className="hover:text-ember">
            {i.kodRezervace}
          </Link>
          {i.nakladHalere > 0 && ` · vyhodnocení stálo ${formatHalere(i.nakladHalere)}`}
        </p>
        {i.shrnuti && (
          <p className="mt-4 rounded-xl border border-linen/10 bg-night px-4 py-3.5 text-[15px] leading-relaxed text-linen">
            {i.shrnuti}
          </p>
        )}
        {i.stav !== "closed" && kRozhodnuti.length === 0 && <Uzavrit inspekceId={i.id} />}
      </div>

      <div className="mt-5 space-y-5">
        {i.zony.map((z) => {
          const zv = ZAVAZNOST[z.zavaznost] ?? ZAVAZNOST.none;
          const zajimava = z.zavaznost !== "none" || z.pripadId || z.potrebaNoveFoto || z.zarovnani === "poor";
          return (
            <section
              key={z.klic}
              className={`rounded-2xl border bg-bark p-5 md:p-6 ${
                zajimava ? "border-linen/15" : "border-linen/8 opacity-70"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl text-linen">{z.nazev}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Odznak ton={zv.ton}>{zv.popis}</Odznak>
                  {z.jistota > 0 && (
                    <Odznak ton="neutral">jistota {(z.jistota * 100).toFixed(0)} %</Odznak>
                  )}
                  {z.stabilita === "unstable" && <Odznak ton="pozor">nestabilní nález</Odznak>}
                  {z.zarovnani === "poor" && <Odznak ton="pozor">špatné zarovnání</Odznak>}
                  {z.potrebaNoveFoto && <Odznak ton="pozor">chce nové foto</Odznak>}
                </div>
              </div>

              {/* Fotky vedle sebe */}
              {(z.predUrl || z.poUrl) && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Při předání", z.predUrl],
                    ["Od hosta", z.poUrl],
                  ].map(([popis, url]) => (
                    <figure key={popis as string}>
                      <figcaption className="text-[12px] uppercase tracking-[0.14em] text-sage/70">
                        {popis}
                      </figcaption>
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url as string}
                          alt={popis as string}
                          className="mt-2 w-full rounded-xl border border-linen/10"
                        />
                      ) : (
                        <div className="mt-2 flex h-32 items-center justify-center rounded-xl border border-dashed border-linen/15 text-[13px] text-sage/50">
                          není
                        </div>
                      )}
                    </figure>
                  ))}
                </div>
              )}

              {zajimava && (
                <div className="mt-5 space-y-3 text-[14.5px] leading-relaxed">
                  <p className="text-linen">{z.coSeZmenilo}</p>
                  <p className="rounded-xl border border-linen/10 bg-night px-4 py-3 text-sage">
                    <span className="mb-1 block text-[12px] uppercase tracking-[0.14em] text-sage/60">
                      Proč to nemusí být škoda
                    </span>
                    {z.alternativa}
                  </p>
                  {z.protiargument && (
                    <p className="rounded-xl border border-linen/10 bg-night px-4 py-3 text-sage">
                      <span className="mb-1 block text-[12px] uppercase tracking-[0.14em] text-sage/60">
                        Protiargument z nezávislého běhu
                      </span>
                      {z.protiargument}
                    </p>
                  )}
                </div>
              )}

              {z.rozhodnuto ? (
                <div className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] px-4 py-3.5">
                  <p className="text-[13px] uppercase tracking-[0.14em] text-emerald-300/80">
                    Rozhodnuto {new Date(z.rozhodnuto.kdy).toLocaleDateString("cs-CZ")}
                  </p>
                  <p className="mt-1.5 text-[15px] text-linen">
                    {z.rozhodnuto.castka > 0
                      ? `${z.rozhodnuto.castka.toLocaleString("cs-CZ")} Kč — ${z.rozhodnuto.sluzba ? "služba s DPH" : "náhrada škody bez DPH"}`
                      : "Bez nároku"}
                  </p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-sage">{z.rozhodnuto.duvod}</p>
                </div>
              ) : z.pripadId ? (
                <Rozhodnuti
                  pripadId={z.pripadId}
                  zona={z.nazev}
                  odhadMin={z.odhadMin}
                  odhadMax={z.odhadMax}
                />
              ) : null}
            </section>
          );
        })}
      </div>
    </Shell>
  );
}
