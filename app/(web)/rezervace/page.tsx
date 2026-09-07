import { Suspense } from "react";
import PageHero from "@/components/PageHero";
import BookingWizard from "@/components/booking/BookingWizard";
import WizardSkeleton from "@/components/booking/WizardSkeleton";
import JsonLd from "@/components/JsonLd";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { nactiRezervacniData } from "@/lib/booking/server";

/**
 * Vykresluje se při každém požadavku.
 *
 * Předgenerovat stránku, jejímž jediným obsahem je živá obsazenost, nedává
 * smysl — první návštěvník po nasazení by viděl stav z okamžiku buildu.
 * Skutečnou pojistkou proti dvojímu prodeji je stejně databázové omezení
 * `reservation_units.no_overlap` při zakládání rezervace, ne tenhle kalendář.
 */
export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "Rezervace",
  description:
    "Rezervujte si tiny house Achát nebo Mech u zatopeného lomu na okraji Českého ráje. Termín vám zablokujeme hned, zálohu pošlete do tří dnů.",
  path: "/rezervace",
});

export default async function RezervacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { domek, prijezd, odjezd } = await searchParams;
  const predvolenyDomek = domek === "achat" || domek === "mech" ? domek : null;
  const predvolenyTermin = overTermin(prijezd, odjezd);

  const { dostupnost, ceniky } = await nactiRezervacniData(["achat", "mech"]);
  const data = Object.fromEntries(
    (["achat", "mech"] as const).map((s) => [
      s,
      { obsazene: dostupnost[s].obsazene, cenik: ceniky[s] },
    ]),
  );

  return (
    <main>
      <JsonLd
        data={breadcrumbLd([
          { name: "Domů", path: "/" },
          { name: "Rezervace", path: "/rezervace" },
        ])}
      />
      <PageHero
        kicker="Rezervace"
        title="Vyberte si svůj"
        accent="kus ticha."
        lead="Čtyři kroky a je to. Termín vám zablokujeme hned po odeslání a držíme ho tři dny — akorát tak dlouho, abyste v klidu poslali zálohu."
      />

      <section
        className="grain relative overflow-x-clip bg-night pb-24 md:pb-32"
        aria-label="Rezervační průvodce"
      >
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <Suspense fallback={<WizardSkeleton />}>
            <BookingWizard
              data={data}
              predvolenyDomek={predvolenyDomek}
              predvolenyTermin={predvolenyTermin}
            />
          </Suspense>

          <ul className="mt-9 flex flex-wrap items-center justify-center gap-x-9 gap-y-3 text-sm text-sage">
            {[
              "Termín blokujeme hned",
              "Záloha 50 % do tří dnů",
              "Kauci dopředu nevybíráme",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <span className="h-1 w-1 rounded-full bg-ember" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

/**
 * Termín z adresy — jen když dává smysl.
 *
 * Přichází z formuláře v hero nebo z detailu domku, ale je to vstup jako
 * každý jiný: špatný tvar, minulost nebo odjezd před příjezdem znamenají
 * „žádný termín", ne chybu. Host pak začne od začátku, což je pořád lepší
 * než průvodce s nesmyslem uvnitř.
 */
function overTermin(
  prijezd: string | string[] | undefined,
  odjezd: string | string[] | undefined,
): { od: string; do: string } | null {
  const od = typeof prijezd === "string" ? prijezd : "";
  const do_ = typeof odjezd === "string" ? odjezd : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(od) || !/^\d{4}-\d{2}-\d{2}$/.test(do_)) return null;
  const a = new Date(`${od}T12:00:00`);
  const b = new Date(`${do_}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const dnes = new Date();
  dnes.setHours(0, 0, 0, 0);
  if (a < dnes || b <= a) return null;
  // Rok dopředu stačí — dál ceník nesahá.
  if ((b.getTime() - a.getTime()) / 86_400_000 > 30) return null;
  return { od, do: do_ };
}
