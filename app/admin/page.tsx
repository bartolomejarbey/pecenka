import type { Metadata } from "next";
import { vyzadujPrihlaseni } from "@/lib/auth/dal";
import { nactiDnes, type Pobyt } from "@/lib/admin/dnes";
import Shell from "@/components/admin/Shell";
import {
  Karta,
  Odznak,
  OdkazNaRezervaci,
  Prazdno,
  StavPlatby,
  Telefon,
  den,
  denSDnem,
} from "@/components/admin/prvky";

export const metadata: Metadata = { title: "Dnes", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminDnes() {
  const kdo = await vyzadujPrihlaseni();
  const d = await nactiDnes();

  const dnesniDatum = new Date().toLocaleDateString("cs-CZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Shell
      kdo={kdo}
      aktivni="/admin"
      nadpis="Dnes"
      akce={<span className="text-[13.5px] text-sage">{dnesniDatum}</span>}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Karta nadpis="Odjíždí dnes" pocet={d.odjizdi.length}>
          {d.odjizdi.length ? (
            d.odjizdi.map((p) => <RadekPobytu key={p.kod} p={p} druh="odjizdi" />)
          ) : (
            <Prazdno>Nikdo neodjíždí.</Prazdno>
          )}
        </Karta>

        <Karta nadpis="Přijíždí dnes" pocet={d.prijizdi.length}>
          {d.prijizdi.length ? (
            d.prijizdi.map((p) => <RadekPobytu key={p.kod} p={p} druh="prijizdi" />)
          ) : (
            <Prazdno>
              Nikdo nepřijíždí.
              {d.pristiPrijezd && (
                <>
                  {" "}
                  Příští příjezd {denSDnem(d.pristiPrijezd.prijezd)} —{" "}
                  <span className="text-linen">{d.pristiPrijezd.jmeno ?? d.pristiPrijezd.kod}</span>,{" "}
                  {d.pristiPrijezd.domek}.
                </>
              )}
            </Prazdno>
          )}
        </Karta>

        <Karta nadpis="Zůstává" pocet={d.zustava.length}>
          {d.zustava.length ? (
            d.zustava.map((p) => <RadekPobytu key={p.kod} p={p} druh="zustava" />)
          ) : (
            <Prazdno>Domky jsou prázdné.</Prazdno>
          )}
        </Karta>

        <Karta nadpis="Vyžaduje pozornost" pocet={d.ukoly.length}>
          {d.ukoly.length ? (
            d.ukoly.map((u) => (
              <div key={u.id} className="flex items-start gap-3 px-5 py-4">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    u.zavaznost === "urgent"
                      ? "bg-red-400"
                      : u.zavaznost === "warn"
                        ? "bg-ember"
                        : "bg-sage/50"
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-[15px] text-linen">{u.nadpis}</p>
                  {u.detail && <p className="mt-0.5 text-[13.5px] text-sage">{u.detail}</p>}
                  {u.kodRezervace && (
                    <p className="mt-1.5">
                      <OdkazNaRezervaci kod={u.kodRezervace} />
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <Prazdno>Nic nečeká. Dobrá zpráva.</Prazdno>
          )}
        </Karta>
      </div>
    </Shell>
  );
}

function RadekPobytu({ p, druh }: { p: Pobyt; druh: "odjizdi" | "prijizdi" | "zustava" }) {
  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[15.5px] font-medium text-linen">{p.jmeno ?? "Bez jména"}</p>
        <OdkazNaRezervaci kod={p.kod} />
      </div>

      <p className="mt-1 text-[13.5px] text-sage">
        {p.domek} · {den(p.prijezd)} – {den(p.odjezd)} · {p.hostu}{" "}
        {p.hostu === 1 ? "host" : p.hostu < 5 ? "hosté" : "hostů"}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <StavPlatby stav={p.stavPlatby} celkem={p.celkemHalere} zaplaceno={p.zaplacenoHalere} />
        {p.navazuje && <Odznak ton="pozor">Hned po odjezdu přijíždí další</Odznak>}
        {druh === "prijizdi" &&
          p.doplnky.map((d) => (
            <Odznak key={d} ton="neutral">
              {d}
            </Odznak>
          ))}
      </div>

      <p className="mt-2.5 text-[14px]">
        <Telefon cislo={p.telefon} />
      </p>
    </div>
  );
}
