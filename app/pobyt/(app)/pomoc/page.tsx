import { redirect } from "next/navigation";
import { SITE } from "@/lib/content";
import { formatTelefon, telOdkaz } from "@/lib/format";
import { nactiInfoDomku } from "@/lib/admin/pobyt";
import { ktoJePrihlasen } from "@/lib/portal/pristup";

export const dynamic = "force-dynamic";

/**
 * Záložka Pomoc — komu zavolat a co dělat, když něco nejde.
 *
 * Host v jedenáct večer bez klíče nechce číst. Chce telefon, velký, hned
 * nahoře. Pod ním pár situací, které se opravdu stávají, s jednou větou,
 * co udělat — a nic víc. Odkaz na obchodní podmínky je až úplně dole,
 * protože tam patří.
 */
/**
 * Situace jsou schválně obecné — konkrétní věci o domku (kde je jistič, jak
 * se topí) píše majitel v nastavení a host je má v záložce Domek. Tady je
 * jen první krok a ujištění, že zavolat je v pořádku.
 */
const SITUACE = [
  {
    otazka: "Nemůžu se dostat dovnitř",
    odpoved:
      "Kód od schránky je v záložce Domek. Ve tmě pomůže svítilna v telefonu. Když to nejde, zavolejte — poradíme po telefonu nebo přijedeme.",
  },
  {
    otazka: "Netopí to nebo neteče voda",
    odpoved:
      "Podívejte se do záložky Domek na část Jak to tu funguje. Když to nepomůže, zavolejte. Není to obtěžování, je to přesně to, na co jsme.",
  },
  {
    otazka: "Vypadl proud",
    odpoved:
      "Nejdřív jistič v rozvaděči. Když nepomůže, může být výpadek v obci — zavolejte, obvykle o něm víme.",
  },
  {
    otazka: "Něco se rozbilo",
    odpoved:
      "Stane se. Dejte nám vědět, ať víme, co se stalo — vyřešíme to v klidu a společně. Nic se neúčtuje automaticky a bez rozhovoru s vámi.",
  },
  {
    otazka: "Potřebuju přijet později nebo odjet dřív",
    odpoved: "Klidně, jen dejte vědět. Pozdní odjezd jde domluvit podle toho, kdo přijíždí po vás.",
  },
  {
    otazka: "Nemám signál",
    odpoved:
      "V lese padá. Nejlepší je u domku na terase nebo o kus dál na cestě. Wi-Fi v domku funguje i pro hovory přes internet.",
  },
];

export default async function PomocPage() {
  const pobyt = await ktoJePrihlasen();
  if (!pobyt) redirect("/pobyt/prihlaseni");

  const info = await nactiInfoDomku(pobyt.domekSlug);
  const telefon = info?.telefon || SITE.phone;

  return (
    <main className="mx-auto max-w-lg px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <h1 className="font-display text-[34px] leading-[1.05] text-linen">Pomoc</h1>
      <p className="mt-1.5 text-[15px] text-sage">Jsme kousek. Volejte klidně i kvůli maličkosti.</p>

      <a
        href={telOdkaz(telefon)}
        className="mt-5 flex min-h-[64px] items-center justify-center gap-3 rounded-2xl bg-ember px-6 text-[19px] font-semibold text-night hover:bg-ember-soft"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"
             strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6.2 3.5h3l1.4 3.6-2 1.4a12 12 0 0 0 5.4 5.4l1.4-2 3.6 1.4v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.2 5.7a2 2 0 0 1 2-2.2z" />
        </svg>
        {formatTelefon(telefon)}
      </a>
      <a
        href={`mailto:${SITE.email}?subject=Pobyt%20${encodeURIComponent(pobyt.kod)}`}
        className="mt-3 flex min-h-[52px] items-center justify-center rounded-2xl border border-linen/15 text-[15px] text-linen hover:border-ember/40"
      >
        Napsat e-mail · {SITE.email}
      </a>

      <h2 className="mt-9 text-[12px] uppercase tracking-[0.14em] text-sage/80">Když se něco děje</h2>
      <ul className="mt-3 divide-y divide-linen/8 rounded-2xl border border-linen/10 bg-bark">
        {SITUACE.map((s) => (
          <li key={s.otazka}>
            <details className="group px-5">
              <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-3 text-[15.5px] text-linen">
                {s.otazka}
                <span className="shrink-0 text-sage transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="pb-4 text-[14.5px] leading-relaxed text-sage">{s.odpoved}</p>
            </details>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-[13px] leading-relaxed text-sage/80">
        Rezervace {pobyt.kod} · variabilní symbol {pobyt.vs}. Fotky z odjezdu si
        necháme 90 dní a pak je smažeme; o čemkoli dalším rozhoduje vždy člověk.{" "}
        <a href="/obchodni-podminky" className="underline underline-offset-2">Podmínky</a> ·{" "}
        <a href="/ochrana-osobnich-udaju" className="underline underline-offset-2">Soukromí</a>
      </p>
    </main>
  );
}
