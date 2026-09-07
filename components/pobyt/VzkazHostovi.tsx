import Link from "next/link";
import { formatTelefon, telOdkaz } from "@/lib/format";
import type { Vzkaz } from "@/lib/luna/vzkaz";

/**
 * Vzkaz po odeslání protokolu.
 *
 * Tři tóny, tři vzhledy — ale žádný z nich nekřičí. I ten nejzávažnější je
 * prosba o telefonát, ne výstraha: host, na kterého po dovolené vyskočí
 * červený rámeček s vykřičníkem, si zapamatuje jen ten rámeček.
 *
 * Proto se tady nepoužívá červená ani ikona nebezpečí. Nejsilnější prvek na
 * obrazovce je telefonní číslo — a to je celý účel.
 */

const VZHLED = {
  dik: {
    ram: "border-emerald-400/25 bg-emerald-400/[0.06]",
    znak: "bg-emerald-400/15 text-emerald-300",
    nadpis: "text-linen",
  },
  prosba: {
    ram: "border-linen/12 bg-linen/[0.04]",
    znak: "bg-linen/10 text-sage",
    nadpis: "text-linen",
  },
  telefon: {
    ram: "border-ember/35 bg-ember/[0.07]",
    znak: "bg-ember/15 text-ember",
    nadpis: "text-linen",
  },
  dofoceni: {
    ram: "border-linen/12 bg-linen/[0.04]",
    znak: "bg-linen/10 text-sage",
    nadpis: "text-linen",
  },
} as const;

export default function VzkazHostovi({ vzkaz }: { vzkaz: Vzkaz }) {
  const v = VZHLED[vzkaz.ton];

  return (
    <section className={`rounded-2xl border px-5 py-6 sm:px-6 ${v.ram}`}>
      <div className="flex items-start gap-4">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${v.znak}`}
          aria-hidden="true"
        >
          {vzkaz.ton === "telefon" ? (
            <IkonaTelefon />
          ) : vzkaz.ton === "dofoceni" ? (
            <IkonaFotak />
          ) : vzkaz.ton === "prosba" ? (
            <IkonaKostka />
          ) : (
            <IkonaFajfka />
          )}
        </span>
        <div className="min-w-0">
          <h2 className={`font-display text-2xl leading-tight ${v.nadpis}`}>{vzkaz.nadpis}</h2>
          <p className="mt-3 text-[15.5px] leading-relaxed text-sage">{vzkaz.text}</p>
        </div>
      </div>

      {vzkaz.telefon && (
        <a
          href={telOdkaz(vzkaz.telefon)}
          className="mt-6 flex min-h-[56px] w-full items-center justify-center gap-3 rounded-full bg-ember px-6 text-[17px] font-semibold text-night transition-colors hover:bg-ember-soft"
        >
          <IkonaTelefon className="h-[19px] w-[19px]" />
          {formatTelefon(vzkaz.telefon)}
        </a>
      )}

      {vzkaz.zonyKDofoceni.length > 0 && (
        <>
          <ul className="mt-5 flex flex-wrap gap-2">
            {vzkaz.zonyKDofoceni.map((z) => (
              <li
                key={z.klic}
                className="rounded-full border border-linen/15 px-3.5 py-1.5 text-[13.5px] text-linen"
              >
                {z.nazev}
              </li>
            ))}
          </ul>
          <Link
            href="/pobyt/protokol"
            className="mt-5 flex min-h-[56px] w-full items-center justify-center rounded-full bg-ember px-6 text-[16px] font-semibold text-night transition-colors hover:bg-ember-soft"
          >
            Vyfotit znovu
          </Link>
        </>
      )}

      {vzkaz.prosby.length > 0 && (
        <ul className="mt-5 space-y-2.5">
          {vzkaz.prosby.map((p) => (
            <li key={p} className="flex items-start gap-3 text-[15.5px] leading-relaxed text-linen">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-ember" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-5 text-[13.5px] leading-relaxed text-sage/75">{vzkaz.patka}</p>
    </section>
  );
}

/* ===== ikony ===== */

const obrys = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function IkonaTelefon({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...obrys}>
      <path d="M6.2 3.5h3l1.4 3.6-2 1.4a12 12 0 0 0 5.4 5.4l1.4-2 3.6 1.4v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.2 5.7a2 2 0 0 1 2-2.2z" />
    </svg>
  );
}
function IkonaKostka({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...obrys}>
      <path d="M3.5 9.5 12 5l8.5 4.5v5L12 19l-8.5-4.5z" />
      <path d="M3.5 9.5 12 14l8.5-4.5M12 14v5" />
    </svg>
  );
}
function IkonaFotak({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...obrys}>
      <rect x="2.5" y="6.5" width="19" height="13" rx="2.5" />
      <circle cx="12" cy="13" r="3.6" />
      <path d="M8.5 6.5 10 4.5h4l1.5 2" />
    </svg>
  );
}
function IkonaFajfka({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...obrys} strokeWidth={2.1}>
      <path d="M5 12.5 9.5 17 19 7.5" />
    </svg>
  );
}
