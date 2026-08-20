import Link from "next/link";
import { formatHalere } from "@/lib/booking";

/** Drobné stavební prvky administrace — karty, odznaky, prázdné stavy. */

export function Karta({
  nadpis,
  pocet,
  akce,
  children,
}: {
  nadpis: string;
  pocet?: number;
  akce?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-linen/10 bg-bark">
      <header className="flex items-center justify-between gap-3 border-b border-linen/8 px-5 py-3.5">
        <h2 className="flex items-center gap-2.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-sage">
          {nadpis}
          {pocet !== undefined && pocet > 0 && (
            <span className="rounded-full bg-linen/10 px-2 py-0.5 text-[12px] tracking-normal text-linen">
              {pocet}
            </span>
          )}
        </h2>
        {akce}
      </header>
      <div className="divide-y divide-linen/8">{children}</div>
    </section>
  );
}

export function Prazdno({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-6 text-[14.5px] leading-relaxed text-sage/70">{children}</p>;
}

const TONY = {
  zaplaceno: "bg-emerald-400/15 text-emerald-300",
  zaloha: "bg-ember/15 text-ember",
  nezaplaceno: "bg-red-400/15 text-red-300",
  neutral: "bg-linen/10 text-sage",
  pozor: "bg-red-500/20 text-red-200",
} as const;

export function Odznak({
  ton = "neutral",
  children,
}: {
  ton?: keyof typeof TONY;
  children: React.ReactNode;
}) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${TONY[ton]}`}>
      {children}
    </span>
  );
}

/** Stav platby jako odznak — tři stavy, žádné odstíny. */
export function StavPlatby({
  stav,
  celkem,
  zaplaceno,
}: {
  stav: string;
  celkem: number;
  zaplaceno: number;
}) {
  // Rezervace bez ceny (ruční zápis, import) — „Nezaplaceno 0 Kč" by mátlo.
  if (celkem === 0) return <Odznak ton="neutral">Bez ceny</Odznak>;
  if (stav === "paid" || stav === "overpaid") return <Odznak ton="zaplaceno">Zaplaceno</Odznak>;
  if (stav === "deposit_paid") {
    return <Odznak ton="zaloha">Záloha · zbývá {formatHalere(celkem - zaplaceno)}</Odznak>;
  }
  if (stav === "refunded") return <Odznak ton="neutral">Vráceno</Odznak>;
  return <Odznak ton="nezaplaceno">Nezaplaceno {formatHalere(celkem - zaplaceno)}</Odznak>;
}

const STAVY: Record<string, { popis: string; ton: keyof typeof TONY }> = {
  inquiry: { popis: "Poptávka", ton: "pozor" },
  hold: { popis: "Drží se", ton: "zaloha" },
  confirmed: { popis: "Potvrzeno", ton: "zaplaceno" },
  checked_in: { popis: "Ubytováni", ton: "zaplaceno" },
  checked_out: { popis: "Odjeli", ton: "neutral" },
  closed: { popis: "Uzavřeno", ton: "neutral" },
  cancelled: { popis: "Storno", ton: "neutral" },
  expired: { popis: "Propadlo", ton: "neutral" },
  no_show: { popis: "Nedorazili", ton: "pozor" },
};

export function StavRezervace({ stav }: { stav: string }) {
  const s = STAVY[stav] ?? { popis: stav, ton: "neutral" as const };
  return <Odznak ton={s.ton}>{s.popis}</Odznak>;
}

/** Telefon jako odkaz — na mobilu se z něj rovnou volá. */
export function Telefon({ cislo }: { cislo: string | null }) {
  if (!cislo) return <span className="text-sage/50">telefon nemáme</span>;
  return (
    <a href={`tel:${cislo.replace(/\s/g, "")}`} className="text-ember hover:underline">
      {cislo}
    </a>
  );
}

export function OdkazNaRezervaci({ kod }: { kod: string }) {
  return (
    <Link
      href={`/admin/rezervace/${kod}`}
      className="font-display text-[15px] text-linen hover:text-ember"
    >
      {kod}
    </Link>
  );
}

export function den(iso: string): string {
  return new Date(iso).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
}

export function denSDnem(iso: string): string {
  const d = new Date(iso);
  const dny = ["ne", "po", "út", "st", "čt", "pá", "so"];
  return `${dny[d.getDay()]} ${d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })}`;
}
