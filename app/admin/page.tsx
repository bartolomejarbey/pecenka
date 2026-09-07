import type { Metadata } from "next";
import Link from "next/link";
import { vyzadujPrihlaseni } from "@/lib/auth/dal";
import { nactiDnes, type Dnes, type Pobyt, type Ukol } from "@/lib/admin/dnes";
import { nactiInfoOPobytu } from "@/lib/admin/pobyt";
import { formatHalere } from "@/lib/booking";
import Shell from "@/components/admin/Shell";
import { Odznak, StavPlatby } from "@/components/admin/prvky";
import { formatTelefon, telOdkaz } from "@/lib/format";

export const metadata: Metadata = { title: "Dnes", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Dnešek.
 *
 * Předchozí verze byla čtyři stejné karty — Odjíždí, Přijíždí, Zůstává,
 * Vyžaduje pozornost — a v klidný den tři z nich hlásily „nikdo". Osmdesát
 * procent obrazovky nezobrazovalo nic a jediný užitečný údaj (příští příjezd)
 * byl šedý text uvnitř prázdného stavu.
 *
 * Majitel v sedm ráno neřeší, jak se ta data jmenují v databázi. Ptá se
 * „co dnes musím udělat a v kolik". Obrazovka proto začíná **jednou větou**
 * a pak dává **časovou osu dne**, kde má každý řádek jednu hlavní akci —
 * skoro vždycky zavolat. Když je den prázdný, ukáže se týden, ať to není
 * bílé místo.
 */
export default async function AdminDnes() {
  const kdo = await vyzadujPrihlaseni();
  const [d, info] = await Promise.all([nactiDnes(), nactiInfoOPobytu()]);

  const casy = Object.fromEntries(
    info.map((i) => [i.domek, { prijezd: i.prijezdOd, odjezd: i.odjezdDo }]),
  );
  const kdyOdjezd = (p: Pobyt) => casy[p.domekSlug]?.odjezd ?? "10:00";
  const kdyPrijezd = (p: Pobyt) => casy[p.domekSlug]?.prijezd ?? "15:00";

  /* Časová osa: odjezdy dřív než příjezdy, uvnitř podle hodiny. */
  const osa = [
    ...d.odjizdi.map((p) => ({ p, druh: "odjezd" as const, cas: kdyOdjezd(p) })),
    ...d.prijizdi.map((p) => ({ p, druh: "prijezd" as const, cas: kdyPrijezd(p) })),
  ].sort((a, b) => a.cas.localeCompare(b.cas));

  const urgentni = d.ukoly.filter((u) => u.zavaznost === "urgent");
  const ostatniUkoly = d.ukoly.filter((u) => u.zavaznost !== "urgent");

  return (
    <Shell
      kdo={kdo}
      aktivni="/admin"
      nadpis="Dnes"
      akce={
        <span className="text-[13px] text-sage">
          {new Date().toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" })}
        </span>
      }
    >
      <p className="font-display text-[26px] leading-snug text-linen sm:text-[30px]">
        {shrnutiDne(d)}
      </p>

      {/* Nejdřív to, co hoří. Když nic nehoří, není tu nic. */}
      {urgentni.length > 0 && (
        <ul className="mt-6 space-y-2.5">
          {urgentni.map((u) => (
            <UkolRadek key={u.id} u={u} />
          ))}
        </ul>
      )}

      {/* Časová osa dne */}
      {osa.length > 0 ? (
        <ol className="mt-8 space-y-3">
          {osa.map(({ p, druh, cas }) => (
            <PobytRadek key={`${druh}-${p.kod}`} p={p} druh={druh} cas={cas} />
          ))}
        </ol>
      ) : (
        <PrazdnyDen d={d} />
      )}

      {/* Kdo je uvnitř, ale dnes nikam nejde */}
      {d.zustava.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[12px] uppercase tracking-[0.14em] text-sage/80">V domcích</h2>
          <ul className="mt-3 space-y-3">
            {d.zustava.map((p) => (
              <PobytRadek key={`zustava-${p.kod}`} p={p} druh="zustava" cas="" />
            ))}
          </ul>
        </section>
      )}

      {ostatniUkoly.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[12px] uppercase tracking-[0.14em] text-sage/80">K vyřízení</h2>
          <ul className="mt-3 space-y-2.5">
            {ostatniUkoly.map((u) => (
              <UkolRadek key={u.id} u={u} />
            ))}
          </ul>
        </section>
      )}

      <TydenPruh tyden={d.tyden} />

      {d.penize.cekaHalere > 0 && (
        <Link
          href="/admin/penize"
          className="mt-6 flex min-h-[64px] items-center justify-between gap-4 rounded-2xl border border-linen/10 bg-bark px-5 transition-colors hover:border-ember/40"
        >
          <span>
            <span className="block text-[12px] uppercase tracking-[0.14em] text-sage/80">
              Čeká na zaplacení
            </span>
            <span className="font-display mt-0.5 block text-[20px] text-linen">
              {formatHalere(d.penize.cekaHalere)}
              <span className="ml-2 text-[13.5px] font-normal text-sage">
                {d.penize.rezervaci}{" "}
                {d.penize.rezervaci === 1 ? "rezervace" : d.penize.rezervaci < 5 ? "rezervace" : "rezervací"}
              </span>
            </span>
          </span>
          {d.penize.poSplatnostiHalere > 0 && (
            <Odznak ton="nezaplaceno">po splatnosti {formatHalere(d.penize.poSplatnostiHalere)}</Odznak>
          )}
        </Link>
      )}
    </Shell>
  );
}

/**
 * Věta, kterou majitel přečte za dvě vteřiny.
 *
 * Schválně věta, ne čísla vedle sebe. „Klid, nikdo nikam nejede" je taky
 * odpověď — a je to ta nejčastější.
 */
function shrnutiDne(d: Dnes): string {
  if (!d.odjizdi.length && !d.prijizdi.length) {
    return d.zustava.length
      ? "Dnes nikdo nepřijíždí ani neodjíždí."
      : "Dnes se nic neděje. Domky jsou prázdné.";
  }

  const casti: string[] = [];
  if (d.odjizdi.length) {
    casti.push(`${cislovka(d.odjizdi.length, "jeden")} ${slovo(d.odjizdi.length, "odjezd", "odjezdy", "odjezdů")}`);
  }
  if (d.prijizdi.length) {
    casti.push(`${cislovka(d.prijizdi.length, "jeden")} ${slovo(d.prijizdi.length, "příjezd", "příjezdy", "příjezdů")}`);
  }

  const veta = `Dnes ${casti.join(" a ")}`;
  // Odjezd a příjezd v témže domku ve stejný den je jediná věc, kterou se dá
  // reálně nestihnout. Ať to majitel vidí ve větě, ne až v odznaku.
  return d.odjizdi.some((p) => p.navazuje)
    ? `${veta}. Mezi tím se musí stihnout úklid.`
    : `${veta}.`;
}

/** „jeden odjezd", ne „1 odjezd" — je to věta, ne tabulka. */
const cislovka = (n: number, jeden: string) =>
  n === 1 ? jeden : n === 2 ? "dva" : n === 3 ? "tři" : n === 4 ? "čtyři" : String(n);

const slovo = (n: number, jeden: string, dva: string, pet: string) =>
  n === 1 ? jeden : n < 5 ? dva : pet;

/* ===== Řádky ===== */

function PobytRadek({
  p,
  druh,
  cas,
}: {
  p: Pobyt;
  druh: "odjezd" | "prijezd" | "zustava";
  cas: string;
}) {
  const stitek =
    druh === "odjezd" ? "Odjezd" : druh === "prijezd" ? "Příjezd" : "Do";

  return (
    <li className="overflow-hidden rounded-2xl border border-linen/10 bg-bark">
      <div className="flex items-stretch">
        {/* Čas jako kotva. Podle něj se den plánuje. */}
        <div
          className={`flex w-[74px] shrink-0 flex-col items-center justify-center gap-0.5 border-r px-2 py-4 ${
            druh === "odjezd"
              ? "border-ember/25 bg-ember/[0.07] text-ember"
              : druh === "prijezd"
                ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300"
                : "border-linen/8 text-sage"
          }`}
        >
          <span className="font-display text-[17px] tabular-nums">
            {cas || new Date(p.odjezd).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })}
          </span>
          <span className="text-[11px] uppercase tracking-[0.1em]">{stitek}</span>
        </div>

        <div className="min-w-0 flex-1 px-4 py-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <Link
              href={`/admin/rezervace/${p.kod}`}
              className="text-[16.5px] font-medium text-linen hover:text-ember"
            >
              {p.jmeno ?? "Bez jména"}
            </Link>
            <span className="text-[13px] text-sage">{p.domek}</span>
          </div>

          <p className="mt-0.5 text-[13.5px] text-sage">
            {cislovka(p.hostu, "jeden")} {slovo(p.hostu, "host", "hosté", "hostů")}
            {druh !== "zustava" && ` · ${p.kod}`}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <StavPlatby stav={p.stavPlatby} celkem={p.celkemHalere} zaplaceno={p.zaplacenoHalere} />
            {p.navazuje && <Odznak ton="pozor">Hned po odjezdu přijíždí další</Odznak>}
            {druh === "prijezd" &&
              p.doplnky.map((x) => (
                <Odznak key={x} ton="neutral">
                  {x}
                </Odznak>
              ))}
          </div>
        </div>
      </div>

      {/* Hlavní akce dne je skoro vždycky „zavolat". Ať je palcem dosažitelná. */}
      {p.telefon && (
        <a
          href={telOdkaz(p.telefon)}
          className="flex min-h-[52px] items-center justify-center gap-2.5 border-t border-linen/8 text-[15px] font-medium text-ember transition-colors hover:bg-ember/[0.07]"
        >
          <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor"
               strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6.2 3.5h3l1.4 3.6-2 1.4a12 12 0 0 0 5.4 5.4l1.4-2 3.6 1.4v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.2 5.7a2 2 0 0 1 2-2.2z" />
          </svg>
          Zavolat · {formatTelefon(p.telefon)}
        </a>
      )}
    </li>
  );
}

function UkolRadek({ u }: { u: Ukol }) {
  const ton =
    u.zavaznost === "urgent"
      ? "border-red-400/35 bg-red-400/[0.08]"
      : u.zavaznost === "warn"
        ? "border-ember/30 bg-ember/[0.05]"
        : "border-linen/10 bg-bark";

  return (
    <li className={`rounded-2xl border px-5 py-4 ${ton}`}>
      <p className="text-[15.5px] leading-snug text-linen">{u.nadpis}</p>
      {u.detail && <p className="mt-1 text-[13.5px] leading-relaxed text-sage">{u.detail}</p>}
      {u.kodRezervace && (
        <Link
          href={`/admin/rezervace/${u.kodRezervace}`}
          className="mt-2.5 inline-flex min-h-11 items-center text-[14px] text-ember underline underline-offset-2"
        >
          Otevřít {u.kodRezervace}
        </Link>
      )}
    </li>
  );
}

function PrazdnyDen({ d }: { d: Dnes }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-linen/15 px-5 py-8 text-center">
      <p className="text-[15px] leading-relaxed text-sage">
        {d.zustava.length
          ? "Dnes nikdo nepřijíždí ani neodjíždí."
          : "Dnes nikdo nepřijíždí ani neodjíždí a domky jsou prázdné."}
      </p>
      {d.pristiPrijezd && (
        <p className="mt-3 text-[15px] leading-relaxed text-linen">
          Příští příjezd{" "}
          {new Date(d.pristiPrijezd.prijezd).toLocaleDateString("cs-CZ", {
            weekday: "long",
            day: "numeric",
            month: "numeric",
          })}
          {" — "}
          <Link href={`/admin/rezervace/${d.pristiPrijezd.kod}`} className="text-ember hover:underline">
            {d.pristiPrijezd.jmeno ?? d.pristiPrijezd.kod}
          </Link>
          , {d.pristiPrijezd.domek}.
        </p>
      )}
    </div>
  );
}

/**
 * Sedm dní dopředu jedním pruhem.
 *
 * V klidný den byla obrazovka prázdná a majitel stejně přepnul do kalendáře,
 * aby zjistil, kdy se něco stane. Tohle mu to řekne rovnou.
 */
function TydenPruh({ tyden }: { tyden: Dnes["tyden"] }) {
  if (!tyden.length) return null;
  const DNY = ["ne", "po", "út", "st", "čt", "pá", "so"];

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-[12px] uppercase tracking-[0.14em] text-sage/80">Příštích sedm dní</h2>
        <Link href="/admin/kalendar" className="text-[13.5px] text-sage hover:text-ember">
          Kalendář →
        </Link>
      </div>
      <ol className="mt-3 grid grid-cols-7 gap-1.5">
        {tyden.map((den, i) => {
          const d = new Date(den.datum);
          return (
            <li
              key={den.datum}
              className={`rounded-xl border px-1 py-2.5 text-center ${
                den.obsazeno > 0 ? "border-linen/12 bg-linen/[0.05]" : "border-linen/8"
              }`}
            >
              <p className="text-[11px] uppercase tracking-[0.08em] text-sage/80">
                {i === 0 ? "dnes" : DNY[d.getDay()]}
              </p>
              <p className="font-display mt-0.5 text-[15px] tabular-nums text-linen">{d.getDate()}</p>
              <p className="mt-1 flex items-center justify-center gap-0.5" aria-hidden="true">
                {Array.from({ length: Math.min(den.odjezdu, 2) }).map((_, k) => (
                  <span key={`o${k}`} className="h-1.5 w-1.5 rounded-full bg-ember" />
                ))}
                {Array.from({ length: Math.min(den.prijezdu, 2) }).map((_, k) => (
                  <span key={`p${k}`} className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                ))}
                {den.odjezdu + den.prijezdu === 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-linen/15" />
                )}
              </p>
              <span className="sr-only">
                {den.odjezdu} odjezdů, {den.prijezdu} příjezdů
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2.5 flex items-center gap-4 text-[12.5px] text-sage/80">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-ember" aria-hidden="true" /> odjezd
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" /> příjezd
        </span>
      </p>
    </section>
  );
}
