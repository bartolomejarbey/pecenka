import Image from "next/image";
import Reveal from "@/components/Reveal";
import { Kicker } from "@/components/ui";

/**
 * Kapitola IV — celostránkové foto s citátem.
 *
 * Paralaxa (useScroll + useTransform) je pryč: na Safari přepočítávala
 * transformaci velké fotky na každém snímku scrollu. Statická fotka vypadá
 * stejně dobře a nestojí nic.
 */
export default function Evening() {
  return (
    <section className="grain relative flex h-[70svh] min-h-[540px] items-center justify-center overflow-hidden bg-night">
      <div className="photo-frame absolute inset-0">
        <Image
          src="/foto/ohniste-vecer.jpg"
          alt="Ohniště na dřevěné terase před černým domkem za večera"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-night/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-transparent to-night/60" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-5 text-center md:px-8">
        <Reveal>
          <Kicker className="justify-center">Kapitola IV · Večer</Kicker>
        </Reveal>
        <Reveal i={1}>
          <blockquote>
            <p
              className="font-display mt-8 text-3xl font-light italic text-linen md:text-5xl"
              style={{ lineHeight: 1.2 }}
            >
              „Večer nalijete víno, rozsvítí se jediné okno uprostřed lesa a
              svět se zmenší na pár tichých metrů čtverečních.“
            </p>
          </blockquote>
        </Reveal>
      </div>
    </section>
  );
}
