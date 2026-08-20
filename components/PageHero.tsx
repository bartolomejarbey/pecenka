import type { CSSProperties, ReactNode } from "react";
import { Kicker } from "./ui";

const rise = (i: number) => ({ "--rise-i": i }) as CSSProperties;

/**
 * Hlavička podstránek — kapitola, titulek s kurzívním akcentem, perex.
 *
 * Naběhnutí jede přes CSS `.rise-in`, ne přes scroll reveal: hlavička je vždy
 * nad ohybem, takže nemá smysl čekat na JS a IntersectionObserver. Titulek se
 * tím vykreslí dřív (a je to obvykle LCP element podstránky).
 */
export default function PageHero({
  kicker,
  title,
  accent,
  lead,
  children,
}: {
  kicker: string;
  title: string;
  /** Slovo či část titulku vysazená kurzívou v ember barvě. */
  accent?: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <section className="grain contours relative overflow-hidden bg-night pb-14 pt-32 md:pb-20 md:pt-40">
      <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
        <div className="rise-in">
          <Kicker>{kicker}</Kicker>
        </div>
        <h1
          className="display-hero rise-in mt-6 max-w-4xl text-5xl text-linen md:text-7xl"
          style={rise(1)}
        >
          {title} {accent && <span className="accent-italic">{accent}</span>}
        </h1>
        {lead && (
          <p className="rise-in mt-7 max-w-xl text-lg leading-relaxed text-sage" style={rise(2)}>
            {lead}
          </p>
        )}
        {children && (
          <div className="rise-in" style={rise(3)}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
