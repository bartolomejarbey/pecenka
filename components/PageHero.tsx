import type { ReactNode } from "react";
import Reveal from "./Reveal";
import { Kicker } from "./ui";

/** Hlavička podstránek — kapitola, titulek s kurzívním akcentem, perex. */
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
    <section className="grain contours relative overflow-hidden bg-night pb-16 pt-36 md:pb-24 md:pt-44">
      <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <Kicker>{kicker}</Kicker>
        </Reveal>
        <Reveal i={1}>
          <h1 className="display-hero mt-6 max-w-4xl text-5xl text-linen md:text-7xl">
            {title}{" "}
            {accent && <span className="accent-italic">{accent}</span>}
          </h1>
        </Reveal>
        {lead && (
          <Reveal i={2}>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-sage">{lead}</p>
          </Reveal>
        )}
        {children && <Reveal i={3}>{children}</Reveal>}
      </div>
    </section>
  );
}
