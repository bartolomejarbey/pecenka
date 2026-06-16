import Link from "next/link";
import Reveal from "@/components/Reveal";
import { ArrowIcon, Button, Kicker } from "@/components/ui";
import { FAQ_ITEMS, LOCATION } from "@/lib/content";

/** Praktické minimum — FAQ teaser + lokalita. */
export default function Practical() {
  const questions = FAQ_ITEMS.slice(0, 4);
  const distances = LOCATION.distances.slice(0, 2);

  return (
    <section className="grain relative overflow-hidden bg-bark py-24 md:py-32">
      <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid items-stretch gap-16 lg:grid-cols-2 lg:gap-14">
          {/* FAQ teaser */}
          <div>
            <Reveal>
              <Kicker>Kapitola VII · Praktické minimum</Kicker>
            </Reveal>
            <Reveal i={1} as="h2" className="font-display mt-6 text-3xl text-linen md:text-4xl">
              Na všechno jsme <span className="accent-italic">mysleli.</span>
            </Reveal>
            <Reveal i={2}>
              <ul className="mt-9 border-t border-linen/10">
                {questions.map((item) => (
                  <li key={item.q} className="border-b border-linen/10">
                    <Link
                      href="/faq"
                      className="group flex items-center justify-between gap-6 py-5 text-[15.5px] text-linen/85 transition-colors duration-300 hover:text-ember"
                    >
                      <span>{item.q}</span>
                      <ArrowIcon className="h-4 w-4 shrink-0 text-moss transition-all duration-300 group-hover:translate-x-1 group-hover:text-ember" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal i={3}>
              <Button href="/faq" variant="outline" className="mt-10">
                Všechny otázky
              </Button>
            </Reveal>
          </div>

          {/* Lokalita teaser */}
          <Reveal i={2} className="h-full">
            <aside className="flex h-full flex-col rounded-[28px] border border-linen/8 bg-pine p-8 transition-colors duration-300 hover:border-ember/30 md:p-10">
              <Kicker>Kde to je</Kicker>
              <p
                className="font-display mt-7 text-2xl font-light italic text-linen"
                style={{ lineHeight: 1.35 }}
              >
                „{LOCATION.secretNote}“
              </p>
              <div className="mt-9 border-t border-linen/10">
                {distances.map((d) => (
                  <div
                    key={d.place}
                    className="flex items-center justify-between gap-6 border-b border-linen/10 py-4 text-[15px]"
                  >
                    <span className="text-sage">{d.place}</span>
                    <span className="font-medium text-linen">{d.time}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-10">
                <Link
                  href="/lokalita"
                  className="group inline-flex items-center gap-2 text-[15px] font-semibold text-ember transition-colors duration-300 hover:text-ember-soft"
                >
                  Kde nás najdete
                  <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </aside>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
