import PageHero from "@/components/PageHero";
import CtaBanner from "@/components/CtaBanner";
import Faq from "@/components/Faq";
import Reveal from "@/components/Reveal";
import JsonLd from "@/components/JsonLd";
import { Button } from "@/components/ui";
import { FAQ_ITEMS, SITE } from "@/lib/content";
import { breadcrumbLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Časté dotazy",
  description:
    "Odpovědi na nejčastější otázky o pobytu v Sedmém lese — lokalita, check-in, domky, koupání v lomu, storno a platba.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <main>
      <JsonLd
        data={breadcrumbLd([
          { name: "Domů", path: "/" },
          { name: "Časté dotazy", path: "/faq" },
        ])}
      />
      <PageHero
        kicker="Časté dotazy"
        title="Na všechno jsme"
        accent="mysleli."
        lead={`A na co ne, na to odpovíme do pár hodin na ${SITE.email}.`}
      />

      {/* ===== Akordeon ===== */}
      <section className="grain relative overflow-hidden bg-night pb-24 md:pb-32">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <Reveal className="mx-auto max-w-3xl" amount={0.1}>
            <Faq items={FAQ_ITEMS} />
          </Reveal>

          {/* Nenašli jste odpověď? */}
          <Reveal className="mx-auto mt-16 max-w-3xl md:mt-24">
            <div className="flex flex-col items-start justify-between gap-6 rounded-[28px] border border-linen/8 bg-pine p-8 transition-colors duration-300 hover:border-ember/30 md:flex-row md:items-center md:p-10">
              <div>
                <h2 className="font-display text-2xl text-linen md:text-3xl">
                  Nenašli jste <span className="accent-italic">odpověď?</span>
                </h2>
                <p className="mt-3 max-w-sm leading-relaxed text-sage">
                  Napište nám. Odpovídáme rychle a rádi — i na otázky, které tu nejsou.
                </p>
              </div>
              <Button href="/kontakt" variant="outline" className="shrink-0">
                Napsat dotaz
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
