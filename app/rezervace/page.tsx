import type { Metadata } from "next";
import { Suspense } from "react";
import PageHero from "@/components/PageHero";
import BookingWizard from "@/components/booking/BookingWizard";
import WizardSkeleton from "@/components/booking/WizardSkeleton";

export const metadata: Metadata = {
  title: "Rezervace",
  description:
    "Rezervujte si pobyt v Sedmém lese — domek, termín, doplňky a kontakt ve čtyřech krocích. Žádná platba předem, termín potvrdíme do 24 hodin.",
};

export default function RezervacePage() {
  return (
    <main>
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
