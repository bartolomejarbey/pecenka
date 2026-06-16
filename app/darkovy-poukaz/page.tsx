import PageHero from "@/components/PageHero";
import CtaBanner from "@/components/CtaBanner";
import Reveal from "@/components/Reveal";
import JsonLd from "@/components/JsonLd";
import { Button, Kicker } from "@/components/ui";
import { SITE, VOUCHER } from "@/lib/content";
import { formatPrice } from "@/lib/booking";
import { breadcrumbLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Dárkový poukaz",
  description:
    "Darujte pobyt v Sedmém lese. Dárkový poukaz s platností 12 měsíců, termín si obdarovaný vybere sám.",
  path: "/darkovy-poukaz",
});

/** Index zvýrazněné varianty — prodloužený víkend. */
const HIGHLIGHT = 1;

const STEPS = [
  {
    n: "01",
    title: "Napíšete nám",
    desc: "Vyberete variantu a pošlete e-mail. Stačí pár řádků — pro koho poukaz je a jestli ho chcete v PDF, nebo poštou.",
  },
  {
    n: "02",
    title: "Do hodiny máte poukaz",
    desc: "Elegantní PDF posíláme do hodiny. Tištěnou verzi na bavlněném papíře pošleme poštou do pár dní.",
  },
  {
    n: "03",
    title: "Obdarovaný si vybere termín",
    desc: "Poukaz platí 12 měsíců. Termín si obdarovaný vybere sám — klidně až na první sníh.",
  },
];

export default function DarkovyPoukazPage() {
  return (
    <main>
      <JsonLd
        data={breadcrumbLd([
          { name: "Domů", path: "/" },
          { name: "Dárkový poukaz", path: "/darkovy-poukaz" },
        ])}
      />
      <PageHero kicker="Dárkový poukaz" title="Darujte" accent="ticho." lead={VOUCHER.desc} />

      {/* ===== Varianty ===== */}
      <section className="grain relative overflow-hidden bg-night pb-24 pt-4 md:pb-32">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <div className="grid gap-5 md:grid-cols-3 md:gap-6">
            {VOUCHER.variants.map((v, i) => {
              const highlighted = i === HIGHLIGHT;
              return (
                <Reveal key={v.name} i={i}>
                  <div
                    className={`relative flex h-full flex-col rounded-[28px] border bg-pine p-8 transition-colors duration-300 md:p-10 ${
                      highlighted
                        ? "border-ember/40 hover:border-ember/60"
                        : "border-linen/8 hover:border-ember/30"
                    }`}
                  >
                    {highlighted && (
                      <span className="absolute -top-3.5 left-8 rounded-full bg-ember px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-night">
                        Nejoblíbenější
                      </span>
                    )}
                    <h2 className="font-display text-xl text-linen">{v.name}</h2>
                    {v.price > 0 ? (
                      <p className="font-display mt-6 text-3xl text-ember md:text-4xl">
                        {formatPrice(v.price)}
                      </p>
                    ) : (
                      <p className="font-display mt-6 text-2xl italic text-ember md:text-3xl">
                        částka dle vás
                      </p>
                    )}
                    <div className="mt-8 flex grow items-end">
                      <Button
                        href={`mailto:${SITE.email}?subject=${encodeURIComponent(
                          `Dárkový poukaz — ${v.name}`,
                        )}`}
                        variant="outline"
                        className="w-full"
                      >
                        Objednat poukaz
                      </Button>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Jak to probíhá (světlá) ===== */}
      <section className="grain relative overflow-hidden bg-mist py-24 text-night md:py-32">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <Kicker tone="light">Kapitola I · Jak to probíhá</Kicker>
          </Reveal>
          <Reveal i={1}>
            <h2 className="font-display mt-6 max-w-2xl text-4xl md:text-6xl">
              Tři kroky <span className="font-display italic text-ember-deep">k dárku.</span>
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-10 md:mt-16 md:grid-cols-3 md:gap-8">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} i={i}>
                <div className="border-t border-night/15 pt-7">
                  <span className="font-display text-3xl italic text-ember-deep">{s.n}</span>
                  <h3 className="font-display mt-5 text-xl md:text-2xl">{s.title}</h3>
                  <p className="mt-4 text-[15.5px] leading-relaxed text-night/60">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-14 md:mt-20">
            <p className="flex items-start gap-3 text-[15.5px] leading-relaxed text-night/70">
              <span
                className="animate-ember mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ember-deep"
                aria-hidden="true"
              />
              Poukaz lze použít na pobyt i na doplňky — snídaňové koše, dřevo do ohniště nebo lahev
              moravského vína.
            </p>
          </Reveal>
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
