import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { vyzadujMajitele } from "@/lib/auth/dal";
import { formatHalere } from "@/lib/booking";
import { podpisyNastaveny } from "@/lib/payments/podpis";
import { COMGATE_ZAPNUT } from "@/lib/payments/nastaveni";
import Shell from "@/components/admin/Shell";
import { Karta, Odznak, Prazdno, den } from "@/components/admin/prvky";
import TlacitkoZaplaceno from "./tlacitko";

export const metadata: Metadata = { title: "Peníze", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPenize() {
  const kdo = await vyzadujMajitele();

  const cekajici = await radky<{
    id: string;
    code: string;
    jmeno: string | null;
    kind: string;
    amount_cents: string | number;
    variable_symbol: string;
    due_at: string | null;
    po_splatnosti: boolean;
  }>(sql`
    SELECT p.id::text AS id, r.code, p.kind, p.amount_cents, p.variable_symbol,
           p.due_at::text AS due_at, (p.due_at < now()) AS po_splatnosti,
           (SELECT trim(coalesce(g.first_name,'') || ' ' || coalesce(g.last_name,''))
              FROM reservation_guests rg JOIN guests g ON g.id = rg.guest_id
             WHERE rg.reservation_id = r.id LIMIT 1) AS jmeno
      FROM payments p JOIN reservations r ON r.id = p.reservation_id
     WHERE p.direction = 'IN' AND p.status IN ('created','pending')
       AND r.status NOT IN ('cancelled','expired')
     ORDER BY p.due_at NULLS LAST
  `);

  const [souhrn] = await radky<{ nezaplaceno: string | number; pocet: number }>(sql`
    SELECT coalesce(sum(r.total_cents - r.paid_cents), 0) AS nezaplaceno, count(*)::int AS pocet
      FROM reservations r
     WHERE r.status IN ('hold','confirmed','checked_in','checked_out')
       AND r.paid_cents < r.total_cents
  `);

  const nesparovane = await radky<{
    id: string;
    prijato: string;
    castka: string | number;
    vs: string | null;
    zprava: string | null;
  }>(sql`
    SELECT id::text AS id, value_date::text AS prijato, amount_cents AS castka,
           variable_symbol AS vs, counterparty_name AS zprava
      FROM bank_transactions WHERE matched_payment_id IS NULL AND amount_cents > 0
     ORDER BY value_date DESC LIMIT 20
  `).catch(() => []);

  return (
    <Shell kdo={kdo} aktivni="/admin/penize" nadpis="Peníze">
      {!podpisyNastaveny() && (
        <p className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-[14px] text-red-200">
          Není nastavený <code>PAYMENTS_SIGNING_KEY</code>. Odkazy na platební stránku se
          negenerují a hosté dostávají údaje jen e-mailem.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-linen/10 bg-bark p-5">
          <p className="text-[12px] uppercase tracking-[0.14em] text-sage/70">Nezaplaceno celkem</p>
          <p className="font-display mt-2 text-3xl text-ember">
            {formatHalere(Number(souhrn?.nezaplaceno ?? 0))}
          </p>
          <p className="mt-1 text-[13.5px] text-sage">
            {souhrn?.pocet ?? 0} {(souhrn?.pocet ?? 0) === 1 ? "rezervace" : "rezervací"}
          </p>
        </div>
        <div className="rounded-2xl border border-linen/10 bg-bark p-5">
          <p className="text-[12px] uppercase tracking-[0.14em] text-sage/70">Platební brána</p>
          <p className="mt-2 text-[15px] text-linen">
            {COMGATE_ZAPNUT ? "ComGate je zapnutá" : "Zatím jen převodem s QR"}
          </p>
          <p className="mt-1 text-[13.5px] text-sage">
            {COMGATE_ZAPNUT
              ? "Karty, Apple Pay i Google Pay jsou v provozu."
              : "Po zasmluvnění stačí doplnit COMGATE_MERCHANT a COMGATE_SECRET."}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <Karta nadpis="Čeká na zaplacení" pocet={cekajici.length}>
          {cekajici.length ? (
            cekajici.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[15px] text-linen">
                    {p.jmeno ?? "Bez jména"} ·{" "}
                    <Link href={`/admin/rezervace/${p.code}`} className="font-display text-sage hover:text-ember">
                      {p.code}
                    </Link>
                  </p>
                  <p className="mt-0.5 text-[13.5px] text-sage">
                    {p.kind === "deposit" ? "Záloha" : p.kind === "balance" ? "Doplatek" : p.kind} ·{" "}
                    <span className="text-linen">{formatHalere(Number(p.amount_cents))}</span> · VS {p.variable_symbol}
                    {p.due_at && ` · splatnost ${den(p.due_at)}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {p.po_splatnosti && <Odznak ton="pozor">Po splatnosti</Odznak>}
                  <TlacitkoZaplaceno platbaId={p.id} />
                </div>
              </div>
            ))
          ) : (
            <Prazdno>Všechno je zaplacené.</Prazdno>
          )}
        </Karta>

        <Karta nadpis="Nespárované platby z účtu" pocet={nesparovane.length}>
          {nesparovane.length ? (
            nesparovane.map((b) => (
              <div key={b.id} className="px-5 py-4 text-[14.5px] text-sage">
                {den(b.prijato)} · <span className="text-linen">{formatHalere(Number(b.castka))}</span>
                {b.vs && ` · VS ${b.vs}`}
                {b.zprava && ` · ${b.zprava}`}
              </div>
            ))
          ) : (
            <Prazdno>
              Napojení na bankovní účet zatím neběží — platby se označují ručně tlačítkem výš.
              Automatické párování podle variabilního symbolu přijde s napojením na Fio API.
            </Prazdno>
          )}
        </Karta>
      </div>
    </Shell>
  );
}
