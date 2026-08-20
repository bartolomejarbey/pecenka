import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import LogoMark from "@/components/LogoMark";
import { formatCzDate } from "@/lib/booking";
import { odhlas } from "@/lib/portal/akce";
import { ktoJePrihlasen } from "@/lib/portal/pristup";

export const dynamic = "force-dynamic";

export default async function PobytPrehled() {
  const pobyt = await ktoJePrihlasen();
  if (!pobyt) redirect("/pobyt/prihlaseni");

  const [protokol] = await radky<{ status: string; hotovo: number; povinnych: number }>(sql`
    SELECT i.status,
           (SELECT count(*)::int FROM inspection_photos p WHERE p.inspection_id = i.id) AS hotovo,
           (SELECT count(*)::int FROM checklist_zones cz
             WHERE cz.checklist_version_id = i.checklist_version_id AND cz.required) AS povinnych
      FROM inspections i
     WHERE i.reservation_id = ${pobyt.rezervaceId}::uuid AND i.type = 'checkout'
     ORDER BY i.id LIMIT 1
  `);

  const odjezd = new Date(pobyt.odjezd);
  const dnuDoOdjezdu = Math.ceil((odjezd.getTime() - Date.now()) / 86400000);
  const odeslano = protokol && protokol.status !== "draft";

  return (
    <main className="mx-auto max-w-lg px-5 py-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-linen">
          <LogoMark className="h-6 w-auto" />
          <span className="font-display text-[15px] uppercase tracking-[0.16em]">Sedmý les</span>
        </div>
        <form action={odhlas}>
          <button className="text-[13px] text-sage hover:text-ember">Odhlásit</button>
        </form>
      </div>

      <h1 className="font-display mt-9 text-3xl text-linen">Dobrý den</h1>
      <p className="mt-3 text-[15.5px] leading-relaxed text-sage">
        {pobyt.domek} · {formatCzDate(new Date(pobyt.prijezd))} – {formatCzDate(odjezd)}
      </p>

      <dl className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-linen/10 bg-linen/10 sm:grid-cols-2">
        <div className="bg-bark px-5 py-4">
          <dt className="text-[12px] uppercase tracking-[0.14em] text-sage/70">Rezervace</dt>
          <dd className="font-display mt-1 text-lg text-linen">{pobyt.kod}</dd>
        </div>
        <div className="bg-bark px-5 py-4">
          <dt className="text-[12px] uppercase tracking-[0.14em] text-sage/70">Variabilní symbol</dt>
          <dd className="font-display mt-1 text-lg text-linen">{pobyt.vs}</dd>
        </div>
      </dl>

      {/* Foto-protokol */}
      <section className="mt-6 rounded-2xl border border-linen/10 bg-bark p-6">
        <h2 className="font-display text-xl text-linen">Před odjezdem</h2>

        {odeslano ? (
          <>
            <p className="mt-3 text-[15px] leading-relaxed text-sage">
              Protokol máme, děkujeme. Projdeme ho a ozveme se jen v případě, že by
              bylo něco potřeba řešit.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-[13.5px] text-emerald-300">
              Odesláno
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 text-[15px] leading-relaxed text-sage">
              Než odjedete, projděte prosím domek a vyfoťte pár míst. Zabere to
              tři minuty a je to ochrana pro obě strany — vy máte doloženo, v jakém
              stavu jste ho nechali.
            </p>
            {dnuDoOdjezdu >= 0 && (
              <p className="mt-3 text-[13.5px] text-sage/70">
                {dnuDoOdjezdu === 0
                  ? "Odjezd je dnes."
                  : `Do odjezdu ${dnuDoOdjezdu} ${dnuDoOdjezdu === 1 ? "den" : dnuDoOdjezdu < 5 ? "dny" : "dní"}.`}
              </p>
            )}
            {protokol && protokol.hotovo > 0 && (
              <p className="mt-3 text-[13.5px] text-ember">
                Rozpracováno: {protokol.hotovo} z {protokol.povinnych} povinných zón.
              </p>
            )}
            <Link
              href="/pobyt/protokol"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-ember px-6 py-4 text-[16px] font-semibold text-night transition-colors hover:bg-ember-soft"
            >
              {protokol && protokol.hotovo > 0 ? "Pokračovat ve fotkách" : "Začít fotit"}
            </Link>
          </>
        )}
      </section>

      <p className="mt-8 text-[13.5px] leading-relaxed text-sage/70">
        Fotky slouží jen k porovnání stavu domku. Uchováváme je 90 dní po odjezdu
        a pak je mažeme. Vyhodnocení je automatické, ale <strong className="text-sage">o čemkoli
        dalším rozhoduje vždy člověk</strong> — a než by se cokoli účtovalo, ozveme se vám.
      </p>
    </main>
  );
}
