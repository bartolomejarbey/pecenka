import type { Metadata } from "next";
import Link from "next/link";
import { vyzadujPrihlaseni } from "@/lib/auth/dal";
import { nactiKalendar, type Pruh } from "@/lib/admin/kalendar";
import { formatHalere } from "@/lib/booking";
import Shell from "@/components/admin/Shell";

export const metadata: Metadata = { title: "Kalendář", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const DNY_ZKRATKY = ["ne", "po", "út", "st", "čt", "pá", "so"];

/**
 * Kalendář obsazenosti.
 *
 * Žádná knihovna — dva domky na šedesát dní je obyčejný CSS grid. FullCalendar
 * by sem přinesl 200 kB a vlastní představu o tom, jak má den vypadat.
 */
export default async function AdminKalendar() {
  const kdo = await vyzadujPrihlaseni();
  const k = await nactiKalendar(60);
  const indexDne = new Map(k.dny.map((d, i) => [d, i]));

  /** Pruh převedený na pozici v mřížce; ořízne se na zobrazené okno. */
  const doMrizky = (p: Pruh) => {
    const zacatek = Math.max(0, indexDne.get(p.od) ?? 0);
    const konec = indexDne.has(p.do) ? indexDne.get(p.do)! : k.dny.length;
    return { start: zacatek, span: Math.max(1, konec - zacatek) };
  };

  return (
    <Shell kdo={kdo} aktivni="/admin/kalendar" nadpis="Kalendář">
      <Legenda />

      {/* Mobil: svislý pás dnů */}
      <div className="mt-5 lg:hidden">
        <div className="overflow-hidden rounded-2xl border border-linen/10 bg-bark">
          <div className="grid grid-cols-[64px_1fr_1fr] border-b border-linen/10 text-[12px] uppercase tracking-[0.12em] text-sage/70">
            <span className="px-3 py-2.5">Den</span>
            {k.domky.map((d) => (
              <span key={d.slug} className="px-3 py-2.5">
                {d.nazev}
              </span>
            ))}
          </div>
          {k.dny.slice(0, 21).map((den) => {
            const d = new Date(den);
            const vikend = d.getDay() === 0 || d.getDay() === 6;
            return (
              <div
                key={den}
                className={`grid min-h-[44px] grid-cols-[64px_1fr_1fr] items-stretch border-b border-linen/6 last:border-b-0 ${
                  vikend ? "bg-linen/[0.02]" : ""
                }`}
              >
                <span className="flex items-center px-3 py-2 text-[13px] text-sage">
                  {DNY_ZKRATKY[d.getDay()]} <span className="ml-1.5 text-linen">{d.getDate()}.</span>
                </span>
                {k.domky.map((dm) => {
                  const p = k.pruhy.find((x) => x.domekSlug === dm.slug && x.od <= den && x.do > den);
                  return (
                    <span key={dm.slug} className="p-1">
                      {p ? (
                        <BunkaPruhu p={p} maly />
                      ) : (
                        <span className="flex h-full items-center px-2 text-[12px] text-sage/40">
                          {k.ceny[dm.slug]?.[den]
                            ? formatHalere(k.ceny[dm.slug][den]).replace(" Kč", "")
                            : ""}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[13px] text-sage/70">Zobrazeny tři týdny. Delší výhled je na počítači.</p>
      </div>

      {/* Desktop: vodorovná osa 60 dní */}
      <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-linen/10 bg-bark lg:block">
        <div className="min-w-[1100px] p-4">
          <div
            className="grid gap-px text-[12px] text-sage/70"
            style={{ gridTemplateColumns: `110px repeat(${k.dny.length}, minmax(0, 1fr))` }}
          >
            <span />
            {k.dny.map((den, i) => {
              const d = new Date(den);
              return (
                <span key={den} className="whitespace-nowrap text-center">
                  {d.getDate() === 1 || i === 0 ? d.toLocaleDateString("cs-CZ", { month: "short" }) : ""}
                </span>
              );
            })}
          </div>

          <div
            className="mt-1 grid gap-px text-[11px]"
            style={{ gridTemplateColumns: `110px repeat(${k.dny.length}, minmax(0, 1fr))` }}
          >
            <span />
            {k.dny.map((den) => {
              const d = new Date(den);
              const vikend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <span key={den} className={`py-1 text-center ${vikend ? "text-ember/70" : "text-sage/60"}`}>
                  {d.getDate()}
                </span>
              );
            })}
          </div>

          {k.domky.map((dm) => (
            <div
              key={dm.slug}
              className="mt-2 grid items-center gap-px"
              style={{ gridTemplateColumns: `110px repeat(${k.dny.length}, minmax(0, 1fr))` }}
            >
              <span className="pr-3 text-[14px] text-linen" style={{ gridRow: 1, gridColumn: 1 }}>
                {dm.nazev}
              </span>
              {k.dny.map((den, i) => {
                const d = new Date(den);
                const vikend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <span
                    key={den}
                    className={`h-9 rounded-[3px] ${vikend ? "bg-linen/[0.05]" : "bg-linen/[0.03]"}`}
                    style={{ gridRow: 1, gridColumn: i + 2 }}
                  />
                );
              })}
              {k.pruhy
                .filter((p) => p.domekSlug === dm.slug)
                .map((p, i) => {
                  const { start, span } = doMrizky(p);
                  return (
                    <span
                      key={i}
                      className="z-10 h-9"
                      style={{ gridRow: 1, gridColumn: `${start + 2} / span ${span}` }}
                    >
                      <BunkaPruhu p={p} />
                    </span>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function BunkaPruhu({ p, maly }: { p: Pruh; maly?: boolean }) {
  const styl =
    p.druh === "blok"
      ? "bg-[repeating-linear-gradient(45deg,rgba(157,179,162,0.25)_0_6px,transparent_6px_12px)] border border-sage/25 text-sage"
      : p.stav === "hold"
        ? "bg-[repeating-linear-gradient(45deg,rgba(217,145,78,0.4)_0_6px,rgba(217,145,78,0.12)_6px_12px)] border border-ember/45 text-ember"
        : "bg-ember/85 text-night";

  const obsah = p.druh === "blok" ? "údržba" : (p.jmeno ?? p.kod ?? "rezervace");
  const telo = (
    <span
      className={`flex h-full items-center overflow-hidden truncate rounded-[6px] px-2 ${
        maly ? "text-[12px]" : "text-[12.5px] font-medium"
      } ${styl}`}
      title={`${obsah} · ${p.od} → ${p.do}`}
    >
      {obsah}
    </span>
  );

  return p.kod ? (
    <Link href={`/admin/rezervace/${p.kod}`} className="block h-full">
      {telo}
    </Link>
  ) : (
    telo
  );
}

function Legenda() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-sage">
      <span className="flex items-center gap-2">
        <span className="h-3 w-6 rounded-[3px] bg-ember/85" aria-hidden="true" /> potvrzeno
      </span>
      <span className="flex items-center gap-2">
        <span
          className="h-3 w-6 rounded-[3px] border border-ember/45 bg-[repeating-linear-gradient(45deg,rgba(217,145,78,0.4)_0_5px,rgba(217,145,78,0.12)_5px_10px)]"
          aria-hidden="true"
        />{" "}
        drží se, čeká na zálohu
      </span>
      <span className="flex items-center gap-2">
        <span
          className="h-3 w-6 rounded-[3px] border border-sage/25 bg-[repeating-linear-gradient(45deg,rgba(157,179,162,0.25)_0_5px,transparent_5px_10px)]"
          aria-hidden="true"
        />{" "}
        blokace
      </span>
    </div>
  );
}
