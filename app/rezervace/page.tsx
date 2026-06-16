import { Suspense } from "react";
import PageHero from "@/components/PageHero";
import BookingWizard from "@/components/booking/BookingWizard";
import WizardSkeleton from "@/components/booking/WizardSkeleton";
import JsonLd from "@/components/JsonLd";
import { breadcrumbLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Rezervace",
  description:
    "Rezervujte si tiny house Achát nebo Mech u zatopeného lomu na okraji Českého ráje. Vyberte termín, my do 24 hodin potvrdíme. Bez platby předem.",
  path: "/rezervace",
});

export default function RezervacePage() {
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
        lead="Čtyři kroky a je to. Žádná platba předem — termín nejdřív do 24 hodin potvrdíme, pak teprve platíte zálohu."
      />

      <section
        className="grain relative overflow-x-clip bg-night pb-24 md:pb-32"
        aria-label="Rezervační průvodce"
      >
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <Suspense fallback={<WizardSkeleton />}>
            <BookingWizard />
          </Suspense>

          <ul className="mt-9 flex flex-wrap items-center justify-center gap-x-9 gap-y-3 text-sm text-sage">
            {[
              "Odpovíme do 24 hodin",
              "Záloha až po potvrzení termínu",
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
