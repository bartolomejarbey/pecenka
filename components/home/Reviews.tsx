import Reveal from "@/components/Reveal";
import { Kicker, Stars } from "@/components/ui";
import { REVIEWS } from "@/lib/content";

/** Kapitola VI — recenze hostů. */
export default function Reviews() {
  return (
    <section className="grain relative overflow-hidden bg-night py-24 md:py-32">
      <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <Kicker>Kapitola VI · Co píší hosté</Kicker>
        </Reveal>
        <Reveal i={1} as="h2" className="font-display mt-6 max-w-2xl text-4xl text-linen md:text-6xl">
          Ticho si odsud <span className="accent-italic">odvážejí domů.</span>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {REVIEWS.map((review, i) => (
            <Reveal key={review.name} i={i} className="h-full">
              <figure className="flex h-full flex-col rounded-[28px] border border-linen/8 bg-pine p-7 transition-colors duration-300 hover:border-ember/30 md:p-9">
                <Stars count={review.stars} />
                <blockquote className="mt-6 flex-1">
                  <p
                    className="font-display text-lg font-light italic text-linen/90"
                    style={{ lineHeight: 1.55 }}
                  >
                    „{review.text}“
                  </p>
                </blockquote>
                <figcaption className="mt-7 flex flex-wrap items-center gap-x-2 border-t border-linen/8 pt-5 text-sm">
                  <span className="font-semibold text-linen">{review.name}</span>
                  <span className="text-sage">· {review.house}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
