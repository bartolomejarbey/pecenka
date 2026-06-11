import Image from "next/image";
import Reveal from "./Reveal";
import { Button, Kicker } from "./ui";

/** Závěrečná výzva — používá se na konci většiny stránek. */
export default function CtaBanner({
  title = "Les už na vás čeká.",
  accent = "Ticho taky.",
  text = "Vyberte si domek, zvolte termín a my se postaráme o zbytek. Vytopená sauna, nachystané dřevo a nebe plné hvězd.",
}: {
  title?: string;
  accent?: string;
  text?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-night">
      <div className="photo-frame absolute inset-0">
        <Image
          src="/foto/tiny2.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/70 to-night/40" />
      </div>
      <div className="grain relative z-10 mx-auto max-w-7xl px-5 py-24 text-center md:px-8 md:py-36">
        <Reveal>
          <Kicker className="justify-center">Poslední kapitola je vaše</Kicker>
        </Reveal>
        <Reveal i={1}>
          <h2 className="display-hero mx-auto mt-6 max-w-3xl text-4xl text-linen md:text-6xl">
            {title} <span className="accent-italic">{accent}</span>
          </h2>
        </Reveal>
        <Reveal i={2}>
          <p className="mx-auto mt-6 max-w-lg text-[17px] leading-relaxed text-sage">{text}</p>
        </Reveal>
        <Reveal i={3}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button href="/rezervace">Rezervovat termín</Button>
            <Button href="/domky" variant="outline">
              Prohlédnout domky
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
