import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { formatCzDate, formatHalere } from "@/lib/booking";
import { COMGATE_ZAPNUT } from "@/lib/payments";
import { overOdkaz } from "@/lib/payments/odkaz";
import { pripravPlatbu } from "@/lib/payments/priprav";
import PageHero from "@/components/PageHero";
import PlatebniMetody from "@/components/booking/PlatebniMetody";
import { Button } from "@/components/ui";

/**
 * Platební stránka rezervace.
 *
 * Chráněná podpisem v odkazu — kód rezervace je krátký a jde uhodnout,
 * takže sám o sobě nestačí. Bez platného podpisu je stránka 404, ne 403:
 * ani nechceme prozradit, že rezervace s takovým kódem existuje.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = {
  params: Promise<{ kod: string }>;
  searchParams: Promise<{ t?: string }>;
};

type Rezervace = {
  code: string;
  variable_symbol: string;
  status: string;
  checkin: string;
  checkout: string;
  total_cents: string | number;
  deposit_required_cents: string | number;
  hold_expires_at: string | null;
  unit_name: string;
  platba_id: string | null;
};

export default async function PlatbaPage({ params, searchParams }: Props) {
  const { kod } = await params;
  const { t } = await searchParams;
  if (!overOdkaz(kod, t)) notFound();

  const [r] = await radky<Rezervace>(
    sql`SELECT r.code, r.variable_symbol, r.status::text AS status,
               r.checkin::text AS checkin, r.checkout::text AS checkout,
               r.total_cents, r.deposit_required_cents,
               r.hold_expires_at::text AS hold_expires_at, u.name AS unit_name,
               (SELECT p.id::text FROM payments p
                 WHERE p.reservation_id = r.id AND p.kind = 'deposit'
                 ORDER BY p.created_at DESC LIMIT 1) AS platba_id
        FROM reservations r JOIN units u ON u.id = r.unit_id
        WHERE r.code = ${kod}`,
  );
  if (!r) notFound();

  const platba = r.platba_id ? await pripravPlatbu(r.platba_id) : null;
  const zaplaceno = platba?.stav === "paid";
  const propadlo = r.status === "expired" || r.status === "cancelled";

  return (
    <main>
      <PageHero
        kicker={`Rezervace ${r.code}`}
        title={zaplaceno ? "Zaplaceno." : propadlo ? "Rezervace už neplatí." : "Zbývá poslat"}
        accent={zaplaceno ? "Díky!" : propadlo ? "" : "zálohu."}
        lead={
          zaplaceno
            ? "Zálohu máme. Pár dní před příjezdem se ozveme se souřadnicemi a kódem od schránky s klíčem."
            : propadlo
              ? "Termín se vrátil do nabídky. Pokud pořád chcete přijet, zkuste rezervaci znovu — nebo nám napište."
              : `${r.unit_name} · ${formatCzDate(new Date(r.checkin))} – ${formatCzDate(new Date(r.checkout))}`
        }
      />

      <section className="grain relative overflow-hidden bg-night pb-20 md:pb-26">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          {propadlo ? (
            <Button href="/rezervace">Zkusit znovu</Button>
          ) : zaplaceno ? (
            <Button href="/">Zpět na úvod</Button>
          ) : !platba ? (
            <p className="max-w-xl text-[15.5px] leading-relaxed text-sage">
              Platební údaje ještě nemáme připravené. Ozveme se e-mailem — nebo nám
              napište na{" "}
              <a href="mailto:ahoj@sedmyles.cz" className="text-ember underline underline-offset-2">
                ahoj@sedmyles.cz
              </a>
              .
            </p>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
              {/* QR platba */}
              <div className="rounded-[28px] border border-linen/10 bg-bark p-6 md:p-9">
                <h2 className="font-display text-2xl text-linen md:text-3xl">
                  Zaplaťte převodem
                </h2>
                <p className="mt-3 max-w-lg text-[15.5px] leading-relaxed text-sage">
                  Načtěte QR kód v bankovní aplikaci — částka i variabilní symbol se
                  vyplní samy. Nebo přepište údaje ručně, jsou vedle.
                </p>

                <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-start">
                  <div className="shrink-0 rounded-2xl bg-white p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={platba.qrUrl}
                      alt={`QR platba ${formatHalere(platba.castkaHalere)}, variabilní symbol ${platba.variabilniSymbol}`}
                      width={250}
                      height={250}
                      className="h-[250px] w-[250px]"
                    />
                  </div>

                  {/* Vedle QR se údaje vypisují vždy — ne každá banka QR načte. */}
                  <dl className="min-w-0 flex-1 space-y-4 text-[15px]">
                    {[
                      ["Číslo účtu", platba.ucet.zobrazit],
                      ["Částka", formatHalere(platba.castkaHalere)],
                      ["Variabilní symbol", platba.variabilniSymbol],
                      ["Zpráva pro příjemce", platba.zprava],
                      platba.splatnost
                        ? ["Splatnost", formatCzDate(platba.splatnost)]
                        : null,
                    ]
                      .filter(Boolean)
                      .map((radek) => {
                        const [popis, hodnota] = radek as [string, string];
                        return (
                          <div key={popis} className="border-b border-linen/8 pb-3 last:border-b-0">
                            <dt className="text-[12px] uppercase tracking-[0.14em] text-sage/70">
                              {popis}
                            </dt>
                            <dd className="font-display mt-1 break-words text-lg text-linen">
                              {hodnota}
                            </dd>
                          </div>
                        );
                      })}
                  </dl>
                </div>

                <div className="mt-8 border-t border-linen/8 pt-7">
                  <p className="kicker mb-4 text-sage">Přijímáme také</p>
                  <PlatebniMetody zapnuto={COMGATE_ZAPNUT} />
                </div>
              </div>

              {/* Souhrn */}
              <aside className="h-fit rounded-[28px] border border-linen/10 bg-pine p-6 md:p-8">
                <p className="kicker text-sage">Souhrn</p>
                <dl className="mt-6 space-y-3.5 text-[15px]">
                  <div className="flex justify-between gap-4">
                    <dt className="text-sage">Cena pobytu</dt>
                    <dd className="text-linen">{formatHalere(Number(r.total_cents))}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-linen/10 pt-3.5">
                    <dt className="text-sage">Záloha teď</dt>
                    <dd className="font-display text-xl text-ember">
                      {formatHalere(Number(r.deposit_required_cents))}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-sage">Doplatek</dt>
                    <dd className="text-linen">
                      {formatHalere(Number(r.total_cents) - Number(r.deposit_required_cents))}
                    </dd>
                  </div>
                </dl>
                {r.hold_expires_at && (
                  <p className="mt-7 rounded-2xl border border-ember/25 bg-ember/5 px-4 py-3.5 text-sm leading-relaxed text-sage">
                    Termín držíme do{" "}
                    <strong className="text-linen">
                      {formatCzDate(new Date(r.hold_expires_at))}
                    </strong>
                    . Pak se vrátí do nabídky.
                  </p>
                )}
                <p className="mt-5 text-[13.5px] leading-relaxed text-sage/75">
                  Doplatek zbývajících 50 % je splatný 14 dní před příjezdem. Vratnou
                  kauci 3 000 Kč neúčtujeme předem.
                </p>
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
