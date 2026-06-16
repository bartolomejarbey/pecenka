import Counter from "@/components/Counter";
import Reveal from "@/components/Reveal";
import { Kicker } from "@/components/ui";

const STATS: { value: number | string; suffix?: string; label: string }[] = [
  { value: 0, label: "sousedů v dohledu" },
  { value: 4, suffix: " km", label: "lesní stezka kolem lomu" },
  { value: "∞", label: "hvězd nad terasou" },
];

/** Kapitola I — manifest ticha. */
export default function Story() {
  return (
    <section id="pribeh" className="grain contours relative overflow-hidden bg-night py-24 md:py-32">
      <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <Kicker>Kapitola I · Ticho</Kicker>
        </Reveal>

        <div className="mt-10 grid gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-8">
            <Reveal i={1} as="h2" className="font-display max-w-3xl text-3xl font-light text-linen md:text-5xl">
              <span style={{ lineHeight: 1.18, display: "inline-block" }}>
                Nejdřív přestanete slyšet auta. Pak notifikace. A pak —{" "}
                <span className="accent-italic">poprvé po letech</span> — uslyšíte{" "}
                <span className="accent-italic">vlastní myšlenky.</span>
              </span>
            </Reveal>

            <div className="mt-12 grid max-w-3xl gap-8 md:grid-cols-2">
              <Reveal i={2} as="p" className="text-[15.5px] leading-relaxed text-sage">
                Sedmý les je samota u zatopeného břidlicového lomu nad Jílovým
                u Držkova, na okraji Českého ráje. Dva domky, hladina mezi
                skalami a kolem dokola jen les. Žádní sousedé, žádná silnice,
                žádné světlo kromě toho vašeho.
              </Reveal>
              <Reveal i={3} as="p" className="text-[15.5px] leading-relaxed text-sage">
                Postavili jsme to tu pro jediné: abyste mohli na pár nocí
                zmizet. Ráno mlha nad vodou, přes den les, večer oheň. Nic víc
                tu není. A přesně o to jde.
              </Reveal>
            </div>
          </div>

          {/* Statistiky */}
          <div className="flex flex-col justify-end lg:col-span-4 lg:pl-10">
            <div className="border-t border-linen/10">
              {STATS.map((s, i) => (
                <Reveal key={s.label} i={i + 2}>
                  <div className="flex items-baseline gap-6 border-b border-linen/10 py-6">
                    <Counter
                      value={s.value}
                      suffix={s.suffix}
                      className="font-display min-w-[5rem] text-4xl font-light text-linen md:text-5xl"
                    />
                    <span className="text-sm leading-snug text-sage">{s.label}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
