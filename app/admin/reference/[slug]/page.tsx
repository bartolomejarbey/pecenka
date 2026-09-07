import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { vyzadujPrihlaseni } from "@/lib/auth/dal";
import { nactiDomek, popisVarianty } from "@/lib/admin/reference";
import Shell from "@/components/admin/Shell";
import { Odznak } from "@/components/admin/prvky";
import Nahrat from "./nahrat";

export const metadata: Metadata = {
  title: "Referenční fotky domku",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminReferenceDomku({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const kdo = await vyzadujPrihlaseni();
  const { slug } = await params;

  const domek = await nactiDomek(slug).catch(() => null);
  if (!domek) notFound();

  return (
    <Shell
      kdo={kdo}
      aktivni="/admin/reference"
      nadpis={domek.nazev}
      akce={
        <Link href="/admin/reference" className="text-[13.5px] text-sage hover:text-ember">
          ← Domky
        </Link>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        <Odznak ton={domek.hotovoZon === domek.zony.length ? "zaplaceno" : "zaloha"}>
          {domek.hotovoZon} / {domek.zony.length} zón
        </Odznak>
        {domek.verze && <Odznak ton="neutral">Sada verze {domek.verze}</Odznak>}
        {domek.pouzita && <Odznak ton="neutral">Už se podle ní hodnotilo</Odznak>}
      </div>

      <div className="space-y-5">
        {domek.zony.map((z) => (
          <section
            key={z.klic}
            className="overflow-hidden rounded-2xl border border-linen/10 bg-bark"
          >
            <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-linen/8 px-5 py-3.5">
              <h2 className="text-[15.5px] font-medium text-linen">
                {z.poradi}. {z.nazev}
                {!z.povinna && (
                  <span className="ml-2.5 text-[13px] font-normal text-sage/70">nepovinné</span>
                )}
              </h2>
              {z.snimky.length ? (
                <Odznak ton="zaplaceno">
                  {z.snimky.length === 1 ? "reference je" : `${z.snimky.length} varianty světla`}
                </Odznak>
              ) : (
                <Odznak ton={z.povinna ? "nezaplaceno" : "neutral"}>chybí</Odznak>
              )}
            </header>

            <div className="px-5 py-5">
              <p className="text-[14.5px] leading-relaxed text-sage">{z.navod}</p>

              {z.snimky.length > 0 && (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {z.snimky.map((s) => (
                    <li key={s.id}>
                      {s.url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={s.url}
                          alt={`Reference — ${z.nazev}, ${popisVarianty(s.varianta)}`}
                          className="aspect-[3/2] w-full rounded-xl border border-linen/10 object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex aspect-[3/2] items-center justify-center rounded-xl border border-dashed border-linen/20 text-[13.5px] text-sage/70">
                          Náhled se nepodařilo načíst
                        </div>
                      )}
                      <p className="mt-1.5 text-[12.5px] text-sage/80">
                        {popisVarianty(s.varianta)} · jas {s.jas} ·{" "}
                        {new Date(s.kdy).toLocaleDateString("cs-CZ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              <Nahrat domek={domek.slug} zona={z.klic} maSnimek={z.snimky.length > 0} />

              {z.otazky.length > 0 && (
                <details className="mt-4 text-[14px] text-sage">
                  <summary className="cursor-pointer list-none py-2 text-[13.5px] text-sage/80 hover:text-ember">
                    Na co se u téhle zóny systém ptá
                  </summary>
                  <ul className="mt-1.5 space-y-1.5 pl-1">
                    {z.otazky.map((o) => (
                      <li key={o} className="flex gap-2.5 leading-relaxed">
                        <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-sage/60" aria-hidden="true" />
                        {o}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </section>
        ))}
      </div>
    </Shell>
  );
}
