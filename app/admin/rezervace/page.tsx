import type { Metadata } from "next";
import Link from "next/link";
import { vyzadujPrihlaseni } from "@/lib/auth/dal";
import { hledejRezervace } from "@/lib/admin/rezervace";
import { formatHalere } from "@/lib/booking";
import Shell from "@/components/admin/Shell";
import { Prazdno, StavPlatby, StavRezervace, den } from "@/components/admin/prvky";

export const metadata: Metadata = { title: "Rezervace", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

/** Filtry se promítají do adresy, aby šly poslat odkazem a fungovalo zpět. */
const CHIPY = [
  { klic: "nezaplacene", popis: "Nezaplacené" },
  { klic: "nepotvrzene", popis: "Nepotvrzené" },
  { klic: "achat", popis: "Achát", pole: "domek" },
  { klic: "mech", popis: "Mech", pole: "domek" },
  { klic: "zrusene", popis: "Zrušené" },
] as const;

export default async function AdminRezervace({ searchParams }: Props) {
  const kdo = await vyzadujPrihlaseni();
  const q = await searchParams;

  const filtry = {
    hledat: q.q,
    nezaplacene: q.nezaplacene === "1",
    nepotvrzene: q.nepotvrzene === "1",
    domek: q.domek,
    zrusene: q.zrusene === "1",
  };
  const seznam = await hledejRezervace(filtry);
  const budouci = seznam.filter((r) => !r.minulost);
  const minule = seznam.filter((r) => r.minulost);

  const odkaz = (zmena: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...q, ...zmena })) if (v) p.set(k, v);
    return `/admin/rezervace${p.toString() ? `?${p}` : ""}`;
  };

  return (
    <Shell kdo={kdo} aktivni="/admin/rezervace" nadpis="Rezervace">
      <form action="/admin/rezervace" className="mb-4">
        <input
          type="search"
          name="q"
          defaultValue={q.q ?? ""}
          placeholder="Jméno, e-mail, telefon, kód nebo variabilní symbol"
          aria-label="Hledat rezervaci"
          className="w-full rounded-xl border border-linen/15 bg-bark px-4 py-3 text-[15px] text-linen placeholder:text-sage/40 focus:border-ember focus:outline-none"
        />
      </form>

      <div className="mb-5 flex flex-wrap gap-2">
        {CHIPY.map((c) => {
          const pole = "pole" in c ? c.pole : c.klic;
          const aktivni = "pole" in c ? q[pole] === c.klic : q[c.klic] === "1";
          const zmena = "pole" in c
            ? { [pole]: aktivni ? undefined : c.klic }
            : { [c.klic]: aktivni ? undefined : "1" };
          return (
            <Link
              key={c.popis}
              href={odkaz(zmena)}
              className={`rounded-full border px-3.5 py-1.5 text-[13.5px] transition-colors ${
                aktivni
                  ? "border-ember bg-ember/12 text-ember"
                  : "border-linen/15 text-sage hover:border-linen/30 hover:text-linen"
              }`}
            >
              {c.popis}
            </Link>
          );
        })}
      </div>

      {seznam.length === 0 ? (
        <div className="rounded-2xl border border-linen/10 bg-bark">
          <Prazdno>
            {q.q ? `Na „${q.q}" nic nesedí.` : "Zatím žádné rezervace."}
          </Prazdno>
        </div>
      ) : (
        <>
          <Seznam radky={budouci} />
          {minule.length > 0 && (
            <>
              <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-[0.14em] text-sage/60">
                Historie
              </h2>
              <Seznam radky={minule} tlumene />
            </>
          )}
        </>
      )}
    </Shell>
  );
}

function Seznam({
  radky,
  tlumene,
}: {
  radky: Awaited<ReturnType<typeof hledejRezervace>>;
  tlumene?: boolean;
}) {
  if (!radky.length) return null;
  return (
    <ul className={`divide-y divide-linen/8 overflow-hidden rounded-2xl border border-linen/10 bg-bark ${tlumene ? "opacity-70" : ""}`}>
      {radky.map((r) => (
        <li key={r.kod}>
          <Link href={`/admin/rezervace/${r.kod}`} className="block px-5 py-4 transition-colors hover:bg-linen/5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-[15.5px] font-medium text-linen">{r.jmeno ?? "Bez jména"}</p>
              <p className="font-display text-[14px] text-sage">{r.kod}</p>
            </div>
            <p className="mt-1 text-[13.5px] text-sage">
              {r.domek} · {den(r.prijezd)} – {den(r.odjezd)} · {r.noci}{" "}
              {r.noci === 1 ? "noc" : r.noci < 5 ? "noci" : "nocí"} ·{" "}
              <span className="text-linen">{formatHalere(r.celkemHalere)}</span>
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <StavRezervace stav={r.stav} />
              <StavPlatby stav={r.stavPlatby} celkem={r.celkemHalere} zaplaceno={r.zaplacenoHalere} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
