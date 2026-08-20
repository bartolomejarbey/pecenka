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

export default async function RezervacePage() {
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
            <BookingWizard data={data} />
          </Suspense>

          <ul className="mt-9 flex flex-wrap items-center justify-center gap-x-9 gap-y-3 text-sm text-sage">
            {[
              "Termín blokujeme hned",
              "Záloha 50 % do tří dnů",
              "Vratná kauce 3 000 Kč",
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
