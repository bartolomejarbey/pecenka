import PageHero from "@/components/PageHero";
import WizardSkeleton from "@/components/booking/WizardSkeleton";

/**
 * Mezistav, než dorazí živá obsazenost.
 *
 * Dřív tu bylo logo doprostřed obrazovky. Vypadalo to čistě, ale mělo výšku
 * jedné obrazovky, zatímco hotová stránka má přes dva tisíce pixelů —
 * jakmile data dorazila, patička spadla o 561 pixelů níž (posun rozvržení
 * 0,25, dvaapůlnásobek limitu). Kostra má proto rozvržení skutečné stránky:
 * záhlaví je úplně stejné, průvodce zabírá stejné místo.
 */
export default function Loading() {
  return (
    <main>
      <PageHero
        kicker="Rezervace"
        title="Vyberte si svůj"
        accent="kus ticha."
        lead="Čtyři kroky a je to. Termín vám zablokujeme hned po odeslání a držíme ho tři dny — akorát tak dlouho, abyste v klidu poslali zálohu."
      />

      <section
        className="grain relative overflow-x-clip bg-night pb-24 md:pb-32"
        aria-label="Načítáme volné termíny"
      >
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <WizardSkeleton />
          <div className="mt-9 h-5" />
        </div>
      </section>
    </main>
  );
}
