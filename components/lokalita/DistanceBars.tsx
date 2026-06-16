"use client";

import { motion } from "motion/react";
import { LOCATION } from "@/lib/content";

/**
 * Infografika vzdáleností — pro každý cíl z LOCATION.distances tenká kolejnice
 * s žhnoucím barem, jehož šířka odpovídá času jízdy vůči nejvzdálenějšímu cíli.
 * Bar naběhne z 0 na cílovou šířku, jakmile se dostane do viewportu (jednou).
 * MotionConfig v layoutu globálně respektuje prefers-reduced-motion.
 */
export default function DistanceBars() {
  const maxMinutes = Math.max(...LOCATION.distances.map((d) => d.minutes));

  return (
    <div className="mt-12 max-w-3xl md:mt-16">
      {LOCATION.distances.map((d, i) => {
        const width = (d.minutes / maxMinutes) * 100;
        return (
          <div
            key={d.place}
            className="border-b border-linen/8 py-5 last:border-b-0 md:py-6"
          >
            <div className="flex items-baseline justify-between gap-6">
              <span className="text-[15.5px] text-sage">{d.place}</span>
              <span className="font-display whitespace-nowrap text-lg text-linen md:text-xl">
                {d.time}
              </span>
            </div>
            <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-linen/8">
              <motion.div
                className="h-2 rounded-full bg-ember/70"
                initial={{ width: 0 }}
                whileInView={{ width: `${width}%` }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{
                  duration: 1,
                  delay: i * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
