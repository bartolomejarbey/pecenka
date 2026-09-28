import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { Kicker } from "./ui";

const rise = (i: number) => ({ "--rise-i": i }) as CSSProperties;

/**
 * Hlavička podstránky s fotkou přes celou šířku — pro stránky, kde je místo
 * samo obsahem (lokalita, okolí). Text sedí dole na tmavém přechodu, aby
 * fotka nahoře zůstala čitelná jako fotka. Naběhnutí jde přes CSS `.rise-in`
 * stejně jako u textové hlavičky.
 */
export default function FotoHero({
  kicker,
  title,
  accent,
  lead,
  src,
  alt,
  children,
}: {
  kicker: string;
  title: string;
  accent?: string;
  lead?: string;
  src: string;
  alt: string;
  children?: ReactNode;
}) {
  return (
    <section className="grain relative flex min-h-[70svh] flex-col justify-end overflow-hidden bg-night pb-12 pt-40 md:min-h-[76svh] md:pb-16">
      <Image src={src} alt={alt} fill priority fetchPriority="high" sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-night via-night/55 to-night/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-night/55 via-night/5 to-transparent" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 md:px-8">
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
          <p
            className="rise-in mt-7 max-w-2xl text-lg leading-relaxed text-linen/85"
            style={rise(2)}
          >
            {lead}
          </p>
        )}
        {children && (
          <div className="rise-in mt-8" style={rise(3)}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
