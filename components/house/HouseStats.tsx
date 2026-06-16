import type { House } from "@/lib/content";
import Reveal from "@/components/Reveal";
import Counter from "@/components/Counter";

type Stat = {
  /** Counter value — číslo se napočítá, string se vykreslí staticky. */
  value: number | string;
  suffix?: string;
  label: string;
};

/** Kompaktní statistický pás domku — čtyři klíčové údaje s počítadly. */
export default function HouseStats({ house }: { house: House }) {
  const stats: Stat[] = [
    { value: house.areaM2, suffix: " m²", label: "obytná plocha" },
    { value: 2, suffix: " lůžka", label: "spací patro pro dva" },
    {
      // Strop 3,5 m — desetinné číslo radši staticky, Counter ho vykreslí beze změny.
      value: house.ceilingM.toLocaleString("cs-CZ"),
      suffix: " m",
      label: "vzdušný strop",
    },
    { value: 30, suffix: " m²", label: "po spojení obou domků" },
  ];

  return (
    <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 border-t border-linen/8 pt-12 md:mt-20 md:grid-cols-4 md:gap-x-10">
      {stats.map((stat, i) => (
        <Reveal key={stat.label} i={i}>
          <p className="font-display text-4xl text-ember md:text-5xl">
            <Counter value={stat.value} suffix={stat.suffix} />
          </p>
          <p className="mt-2 text-[13.5px] leading-snug text-sage">{stat.label}</p>
        </Reveal>
      ))}
    </div>
  );
}
