import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { vyzadujPrihlaseni } from "@/lib/auth/dal";
import { nactiDetail } from "@/lib/admin/rezervace";
import { formatHalere } from "@/lib/booking";
import Shell from "@/components/admin/Shell";
import { Odznak, StavPlatby, StavRezervace, Telefon, den } from "@/components/admin/prvky";
import Akce from "./akce";
import Poznamka from "./poznamka";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ kod: string }> };

/** Sedm uzlů časové osy — v tomto pořadí se rezervace odehrává. */
const OSA = [
  { klic: "poptavka", popis: "Poptávka" },
  { klic: "potvrzeno", popis: "Potvrzeno" },
  { klic: "zaloha", popis: "Záloha" },
  { klic: "doplatek", popis: "Doplatek" },
  { klic: "prijezd", popis: "Příjezd" },
  { klic: "odjezd", popis: "Odjezd" },
  { klic: "vyporadano", popis: "Vypořádáno" },
] as const;

export default async function DetailRezervace({ params }: Props) {
  const kdo = await vyzadujPrihlaseni();
  const { kod } = await params;
  const r = await nactiDetail(kod);
  if (!r) notFound();

  const zaloha = r.platby.find((p) => p.druh === "deposit");
  const doplatek = r.platby.find((p) => p.druh === "balance");

  const hotovo: Record<string, boolean> = {
    poptavka: true,
    potvrzeno: ["confirmed", "checked_in", "checked_out", "closed"].includes(r.stav),
    zaloha: zaloha?.stav === "paid" || r.stavPlatby === "paid" || r.stavPlatby === "deposit_paid",
    doplatek: r.stavPlatby === "paid" || r.stavPlatby === "overpaid",
    prijezd: ["checked_in", "checked_out", "closed"].includes(r.stav),
    odjezd: ["checked_out", "closed"].includes(r.stav),
    vyporadano: r.stav === "closed",
  };
  const prvniNehotovy = OSA.find((u) => !hotovo[u.klic])?.klic ?? null;

  return (
    <Shell
      kdo={kdo}
      aktivni="/admin/rezervace"
      nadpis={r.jmeno ?? r.kod}
      akce={
        <Link href="/admin/rezervace" className="text-[13.5px] text-sage hover:text-ember">
          ← Zpět
        </Link>
      }
    >
      {/* Hlavička */}
      <div className="rounded-2xl border border-linen/10 bg-bark p-5 md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <div>
            <p className="font-display text-2xl text-linen">{r.jmeno ?? "Bez jména"}</p>
            <p className="mt-1 text-[14px] text-sage">
              {r.domek} · {den(r.prijezd)} – {den(r.odjezd)} · {r.noci}{" "}
              {r.noci === 1 ? "noc" : r.noci < 5 ? "noci" : "nocí"} · {r.dospeli + r.deti} hostů
            </p>
          </div>
          <p className="font-display text-[15px] text-sage">{r.kod}</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StavRezervace stav={r.stav} />
          <StavPlatby stav={r.stavPlatby} celkem={r.celkemHalere} zaplaceno={r.zaplacenoHalere} />
          <Odznak ton="neutral">VS {r.vs}</Odznak>
          {r.zdroj !== "web" && <Odznak ton="neutral">{r.zdroj}</Odznak>}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[14.5px]">
          <Telefon cislo={r.telefon} />
          {r.email && (
            <a href={`mailto:${r.email}`} className="text-ember hover:underline">
              {r.email}
            </a>
          )}
        </div>

        {r.drziDo && (
          <p className="mt-4 rounded-xl border border-ember/25 bg-ember/5 px-4 py-2.5 text-[13.5px] text-sage">
            Termín se drží do {new Date(r.drziDo).toLocaleString("cs-CZ")}.
          </p>
        )}
        {r.stornoDuvod && (
          <p className="mt-4 rounded-xl border border-red-400/25 bg-red-400/5 px-4 py-2.5 text-[13.5px] text-red-200">
            Storno: {r.stornoDuvod}
          </p>
        )}
      </div>

      <Poznamka kod={r.kod} text={r.poznamkaInterni} />

      {/* Časová osa */}
      <section className="mt-5 rounded-2xl border border-linen/10 bg-bark p-5 md:p-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-sage">Průběh</h2>
        <ol className="mt-5 space-y-0">
          {OSA.map((u, i) => {
            const done = hotovo[u.klic];
            const aktualni = prvniNehotovy === u.klic;
            return (
              <li key={u.klic} className="relative flex gap-4 pb-5 last:pb-0">
                {i < OSA.length - 1 && (
                  <span
                    className={`absolute left-[7px] top-4 h-full w-px ${done ? "bg-ember/40" : "bg-linen/12"}`}
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`relative z-10 mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 ${
                    done
                      ? "border-ember bg-ember"
                      : aktualni
                        ? "border-ember bg-bark"
                        : "border-linen/20 bg-bark"
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-[15px] ${done ? "text-linen" : aktualni ? "text-linen" : "text-sage/60"}`}>
                    {u.popis}
                  </p>
                  {aktualni && (
                    <div className="mt-3">
                      <Akce kod={r.kod} uzel={u.klic} zalohaId={zaloha?.id ?? null} doplatekId={doplatek?.id ?? null} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Cena */}
      <section className="mt-5 rounded-2xl border border-linen/10 bg-bark p-5 md:p-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-sage">
          Cena a doplňky
        </h2>
        <table className="mt-4 w-full text-[14.5px]">
          <tbody className="divide-y divide-linen/8">
            {r.polozky.map((p, i) => (
              <tr key={i}>
                <td className="py-2 pr-3 text-sage">
                  {p.popis}
                  {p.datum && <span className="ml-2 text-sage/60">{den(p.datum)}</span>}
                  {p.mnozstvi > 1 && <span className="ml-2 text-sage/60">×{p.mnozstvi}</span>}
                </td>
                <td className="py-2 text-right text-sage/70">
                  {p.sazbaDph !== null ? `${p.sazbaDph} %` : "—"}
                </td>
                <td className="py-2 pl-3 text-right text-linen">{formatHalere(p.celkemHalere)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-linen/15">
              <td className="py-3 font-medium text-linen" colSpan={2}>
                Celkem
              </td>
              <td className="py-3 text-right font-display text-lg text-ember">
                {formatHalere(r.celkemHalere)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Platby */}
      {r.platby.length > 0 && (
        <section className="mt-5 rounded-2xl border border-linen/10 bg-bark p-5 md:p-6">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-sage">Platby</h2>
          <ul className="mt-4 divide-y divide-linen/8">
            {r.platby.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-[15px] text-linen">
                    {p.druh === "deposit" ? "Záloha" : p.druh === "balance" ? "Doplatek" : p.druh} ·{" "}
                    {formatHalere(p.castkaHalere)}
                  </p>
                  <p className="mt-0.5 text-[13px] text-sage">
                    VS {p.vs}
                    {p.splatnost && ` · splatnost ${den(p.splatnost)}`}
                    {p.zaplaceno && ` · zaplaceno ${den(p.zaplaceno)}`}
                  </p>
                </div>
                <Odznak ton={p.stav === "paid" ? "zaplaceno" : p.stav === "expired" || p.stav === "cancelled" ? "neutral" : "nezaplaceno"}>
                  {p.stav === "paid" ? "Zaplaceno" : p.stav === "created" ? "Čeká" : p.stav}
                </Odznak>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Historie */}
      {r.historie.length > 0 && (
        <section className="mt-5 rounded-2xl border border-linen/10 bg-bark p-5 md:p-6">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-sage">Historie</h2>
          <ul className="mt-4 space-y-2 text-[13.5px] text-sage">
            {r.historie.map((h, i) => (
              <li key={i}>
                <span className="text-sage/60">{new Date(h.kdy).toLocaleString("cs-CZ")}</span>{" "}
                {POPIS_AKCE[h.akce] ?? h.akce}
              </li>
            ))}
          </ul>
        </section>
      )}
    </Shell>
  );
}

/** Auditní deník se v rozhraní ukazuje česky, ne jako JSON diff. */
const POPIS_AKCE: Record<string, string> = {
  "rezervace.potvrzena": "rezervace potvrzena",
  "rezervace.stornovana": "rezervace stornována",
  "rezervace.checked_in": "host se ubytoval",
  "rezervace.checked_out": "host odjel",
  "rezervace.no_show": "host nedorazil",
  "rezervace.poznamka": "upravena interní poznámka",
  "platba.oznacena_zaplacena": "platba označena jako zaplacená",
};
