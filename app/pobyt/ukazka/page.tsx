import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import LogoMark from "@/components/LogoMark";
import { ukazkaPovolena } from "@/lib/portal/ukazka";
import { nastavFaziUkazky, otevriUkazku, type FazeUkazky } from "./akce";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ukázka portálu", robots: { index: false, follow: false } };

/**
 * Ukázka portálu bez přihlašování.
 *
 * Portál vypadá jinak podle toho, kde v pobytu host je — a to je jeho celý
 * smysl. Ukázat to jde jen tak, že se ta fáze dá přepnout: jinak by majitel
 * viděl vždycky jen tu jednu, kterou zrovna má ukázková rezervace.
 *
 * Přepínač **posouvá termín ukázkové rezervace**, ne nějaký příznak v URL.
 * Portál tedy netuší, že jde o ukázku, a chová se přesně jako hostům —
 * včetně toho, co je odemčené a co ne.
 *
 * Naostro se stránka nezobrazí. Je to obejití přihlášení a v produkci nemá
 * co dělat.
 */
const FAZE: { klic: FazeUkazky; nazev: string; popis: string }[] = [
  { klic: "pred", nazev: "Před příjezdem", popis: "Za pět dní. Cesta a mapa; kód od schránky ještě ne." },
  { klic: "prijezd", nazev: "Den příjezdu", popis: "Dnes přijíždí. Kód od schránky velký, navigace." },
  { klic: "behem", nazev: "Během pobytu", popis: "Druhá noc ze tří. Wi-Fi, kód, co bude u odjezdu." },
  { klic: "odjezd", nazev: "Den odjezdu", popis: "Dnes odjíždí. Dokončení pobytu jako hlavní věc." },
  { klic: "po", nazev: "Po odjezdu", popis: "Odjel včera. Poděkování a vzkaz." },
];

export default async function UkazkaPage({
  searchParams,
}: {
  searchParams: Promise<{ faze?: string }>;
}) {
  if (!ukazkaPovolena()) redirect("/pobyt/prihlaseni");

  const { faze } = await searchParams;
  const aktivni = (FAZE.find((f) => f.klic === faze)?.klic ?? null) as FazeUkazky | null;

  /*
   * Rezervace domku, který je připravený.
   *
   * Ukázka na domku bez adresy, kódu od schránky a referenčních fotek by
   * ukazovala prázdné bloky — a to je horší než neukázat nic. Přednost má
   * domek s vyplněnými informacemi k pobytu a s referenční sadou.
   */
  const [rez] = await radky<{ id: string; code: string; jmeno: string | null; domek: string }>(sql`
    SELECT r.id::text AS id, r.code, u.name AS domek,
           (SELECT g.first_name FROM reservation_guests rg JOIN guests g ON g.id = rg.guest_id
             WHERE rg.reservation_id = r.id LIMIT 1) AS jmeno
      FROM reservations r JOIN units u ON u.id = r.unit_id
      LEFT JOIN stay_info si ON si.unit_id = u.id
     WHERE r.status IN ('confirmed','checked_in','checked_out') AND NOT u.is_virtual
     ORDER BY (si.address IS NOT NULL) DESC,
              (EXISTS (SELECT 1 FROM baseline_sets bs
                        WHERE bs.unit_slug = u.slug AND bs.valid_to IS NULL)) DESC,
              r.checkin
     LIMIT 1
  `);

  if (!rez) {
    return (
      <Obal>
        <p className="text-[15px] leading-relaxed text-sage">
          V databázi není žádná potvrzená rezervace, kterou by šlo ukázat.
          Spusť <code className="text-linen">node scripts/dev/seed-ukazka.mjs</code>.
        </p>
      </Obal>
    );
  }

  return (
    <Obal>
      <p className="text-[15px] leading-relaxed text-sage">
        Portál se mění podle toho, kde v pobytu host je. Vyberte fázi a otevře se
        tak, jak by ho v tu chvíli viděl{rez.jmeno ? ` ${rez.jmeno}` : " host"} —
        {" "}
        {rez.domek}, rezervace {rez.code}.
      </p>

      <ul className="mt-7 space-y-2.5">
        {FAZE.map((f) => (
          <li key={f.klic}>
            <form action={nastavFaziUkazky}>
              <input type="hidden" name="rezervace" value={rez.id} />
              <input type="hidden" name="faze" value={f.klic} />
              <button
                className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-left transition-colors ${
                  aktivni === f.klic
                    ? "border-ember/50 bg-ember/[0.08]"
                    : "border-linen/10 bg-bark hover:border-ember/35"
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-[16px] text-linen">{f.nazev}</span>
                  <span className="mt-0.5 block text-[13.5px] leading-relaxed text-sage">
                    {f.popis}
                  </span>
                </span>
                <span className="shrink-0 text-[13.5px] text-ember">Otevřít →</span>
              </button>
            </form>
          </li>
        ))}
      </ul>

      <div className="mt-8 space-y-2.5">
        <Odkaz rezervace={rez.id} kam="/pobyt">
          Otevřít portál v aktuálním stavu
        </Odkaz>
        <Odkaz rezervace={rez.id} kam="/pobyt/protokol">
          Rovnou na focení domku
        </Odkaz>
      </div>

      <p className="mt-8 text-[13px] leading-relaxed text-sage/80">
        Přepínač posouvá termín ukázkové rezervace v databázi — portál sám netuší,
        že jde o ukázku, takže se chová přesně jako hostům. Naostro se tahle
        stránka nezobrazí.
      </p>
    </Obal>
  );
}

function Obal({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-lg px-5 py-12">
      <div className="flex items-center gap-2.5 text-linen">
        <LogoMark className="h-6 w-auto" />
        <span className="font-display text-[15px] uppercase tracking-[0.16em]">Sedmý les</span>
      </div>
      <h1 className="font-display mt-7 text-[32px] leading-[1.05] text-linen">
        Ukázka portálu hosta
      </h1>
      <div className="mt-4">{children}</div>
    </main>
  );
}

function Odkaz({
  rezervace,
  kam,
  children,
}: {
  rezervace: string;
  kam: string;
  children: React.ReactNode;
}) {
  return (
    <form action={otevriUkazku}>
      <input type="hidden" name="rezervace" value={rezervace} />
      <input type="hidden" name="kam" value={kam} />
      <button className="flex min-h-[52px] w-full items-center justify-center rounded-full border border-linen/20 px-5 text-[15px] text-linen transition-colors hover:border-ember/45 hover:text-ember">
        {children}
      </button>
    </form>
  );
}
