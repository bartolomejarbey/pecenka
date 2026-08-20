import Reveal from "@/components/Reveal";
import { LOCATION } from "@/lib/content";

/**
 * Infografika vzdáleností — pro každý cíl z LOCATION.distances tenká kolejnice
 * s žhnoucím barem, jehož délka odpovídá času jízdy vůči nejvzdálenějšímu cíli.
 * Bar naběhne škálováním, jakmile řádek vjede do viewportu (jednou).
 * Bez JS je rovnou v cílové délce.
 */
export default function DistanceBars() {
  const maxMinutes = Math.max(...LOCATION.distances.map((d) => d.minutes));

  return (
    <div className="mt-12 max-w-3xl md:mt-16">
      {LOCATION.distances.map((d, i) => (
        <Reveal
          key={d.place}
          i={i}
          className="border-b border-linen/8 py-5 last:border-b-0 md:py-6"
        >
          <div className="flex items-baseline justify-between gap-6">
            <span className="text-[15.5px] text-sage">{d.place}</span>
            <span className="font-display whitespace-nowrap text-lg text-linen md:text-xl">
              {d.time}
            </span>
          </div>
          <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-linen/8">
            <div
              className="distance-bar h-2 w-full rounded-full bg-ember/70"
              style={{ "--bar-w": d.minutes / maxMinutes } as React.CSSProperties}
            />
          </div>
        </Reveal>
      ))}
    </div>
  );
}
