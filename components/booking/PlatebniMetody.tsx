import Image from "next/image";

/**
 * Výčet přijímaných platebních metod.
 *
 * Loga jsou ochranné známky — nepřekreslujeme je, nepřebarvujeme a necháváme
 * kolem nich vzduch (Apple Pay Identity Guidelines žádají volný prostor
 * minimálně 1/10 výšky značky). Podrobnosti v `public/platby/README.md`.
 *
 * Apple Pay a Google Pay se tu zobrazují jako **acceptance marks**, ne jako
 * tlačítka — tlačítko musí vykreslit platební brána na svojí straně.
 */

const LOGA = [
  { src: "/platby/visa.png", alt: "Visa", w: 360, h: 144, vyska: "h-4" },
  { src: "/platby/mastercard.png", alt: "Mastercard", w: 360, h: 144, vyska: "h-5" },
  { src: "/platby/applepay-mark.svg", alt: "Apple Pay", w: 166, h: 106, vyska: "h-6" },
  { src: "/platby/gpay-mark-dark.svg", alt: "Google Pay", w: 41, h: 17, vyska: "h-4" },
];

export default function PlatebniMetody({
  zapnuto,
  className = "",
}: {
  /** Je brána zasmluvněná? Když ne, jsou loga tlumená a je u nich poznámka. */
  zapnuto: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div
        className={`flex flex-wrap items-center gap-x-6 gap-y-4 ${zapnuto ? "" : "opacity-45 grayscale"}`}
      >
        {LOGA.map((l) => (
          <Image
            key={l.alt}
            src={l.src}
            alt={l.alt}
            width={l.w}
            height={l.h}
            className={`${l.vyska} w-auto`}
            unoptimized={l.src.endsWith(".svg")}
          />
        ))}
        <span className="flex items-center gap-2 text-xs text-sage/70">
          <span className="hidden h-4 w-px bg-linen/15 sm:block" aria-hidden="true" />
          zajišťuje
          <Image
            src="/platby/comgate.png"
            alt="Comgate Payments, a. s."
            width={848}
            height={200}
            className="h-4 w-auto"
          />
        </span>
      </div>
      {!zapnuto && (
        <p className="mt-4 text-sm leading-relaxed text-sage/80">
          Platbu kartou, přes Apple Pay a Google Pay teprve zprovozňujeme. Zatím
          platíte převodem — QR kód nahoře načtete přímo v bankovní aplikaci.
        </p>
      )}
    </div>
  );
}
