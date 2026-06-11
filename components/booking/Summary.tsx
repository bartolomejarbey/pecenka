import Image from "next/image";
import type { House } from "@/lib/content";
import { formatCzDate, formatPrice, type PriceBreakdown } from "@/lib/booking";
import { daysLabel, guestsLabel, nightsLabel } from "./format";

/** Souhrn rezervace — pravý sloupec posledního kroku. */
export default function Summary({
  house,
  from,
  to,
  guests,
  breakdown,
}: {
  house: House;
  from: Date;
  to: Date;
  guests: number;
  breakdown: PriceBreakdown;
}) {
  return (
    <aside
      className="rounded-[28px] border border-linen/8 bg-pine p-7"
      aria-label="Souhrn rezervace"
    >
      <p className="kicker text-ember">Souhrn pobytu</p>

      <div className="mt-5 flex items-center gap-4">
        <div className="photo-frame relative h-16 w-20 shrink-0 overflow-hidden rounded-xl">
          <Image
            src={house.photo}
            alt={house.photoAlt}
            fill
            sizes="80px"
            className="object-cover"
          />
        </div>
        <div>
          <p className="font-display text-2xl text-linen">{house.name}</p>
          <p className="mt-0.5 text-sm text-sage">
            {formatCzDate(from)} – {formatCzDate(to)} · {guestsLabel(guests)}
          </p>
        </div>
      </div>

      <ul className="mt-6 space-y-2.5 border-t border-linen/10 pt-6 text-[15px]">
        <li className="flex items-baseline justify-between gap-4">
          <span className="text-sage">Ubytování ({nightsLabel(breakdown.nights)})</span>
          <span className="text-linen">{formatPrice(breakdown.nightsTotal)}</span>
        </li>
        {breakdown.weekDiscount > 0 && (
          <li className="flex items-baseline justify-between gap-4 text-ember">
            <span>Sleva za týden −10 %</span>
            <span>−{formatPrice(breakdown.weekDiscount)}</span>
          </li>
        )}
        {breakdown.addonItems.map((item) => (
          <li key={item.id} className="flex items-baseline justify-between gap-4">
            <span className="text-sage">
              {item.name}
              {item.qty > 1 ? ` ×${item.qty}` : ""}
              {item.perDay ? ` · ${daysLabel(item.days)}` : ""}
            </span>
            <span className="text-linen">{formatPrice(item.total)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-linen/10 pt-6">
        <span className="text-[15px] text-sage">Celkem</span>
        <span className="font-display text-3xl text-linen">
          {formatPrice(breakdown.total)}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-sage">
        + vratná kauce {formatPrice(breakdown.deposit)}
        <br />
        Záloha 50 % po potvrzení termínu.
      </p>
    </aside>
  );
}
