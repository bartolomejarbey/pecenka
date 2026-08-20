import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { vyzadujMajitele } from "@/lib/auth/dal";
import { formatHalere } from "@/lib/booking";
import { nazevDokladu, type TypDokladu } from "@/lib/doklady/typy";
import Shell from "@/components/admin/Shell";
import { Karta, Odznak, Prazdno, den } from "@/components/admin/prvky";

export const metadata: Metadata = { title: "Doklady", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TON: Record<string, "zaplaceno" | "zaloha" | "neutral" | "pozor"> = {
  ISSUED: "zaloha",
  PAID: "zaplaceno",
  CORRECTED: "pozor",
  CANCELLED: "neutral",
  DRAFT: "neutral",
};

const STAV: Record<string, string> = {
  DRAFT: "Koncept",
  ISSUED: "Vystaveno",
  PAID: "Zaplaceno",
  PARTIALLY_PAID: "Částečně",
  CANCELLED: "Storno",
  CORRECTED: "Opraveno",
};

export default async function AdminDoklady() {
  const kdo = await vyzadujMajitele();

  const doklady = await radky<{
    id: string;
    number: string;
    doc_type: TypDokladu;
    status: string;
    issue_date: string | null;
    due_date: string | null;
    total_with_vat_cents: string | number;
    amount_to_pay_cents: string | number;
    vat_applicable: boolean;
    customer: { jmeno?: string } | string;
    code: string;
    correction_reason: string | null;
  }>(sql`
    SELECT i.id::text AS id, i.number, i.doc_type, i.status,
           i.issue_date::text AS issue_date, i.due_date::text AS due_date,
           i.total_with_vat_cents, i.amount_to_pay_cents, i.vat_applicable,
           i.customer, i.correction_reason, r.code
      FROM invoices i JOIN reservations r ON r.id = i.reservation_id
     ORDER BY i.created_at DESC LIMIT 200
  `);

  const [souhrn] = await radky<{ vystaveno: string | number; pocet: number }>(sql`
    SELECT coalesce(sum(total_with_vat_cents), 0) AS vystaveno, count(*)::int AS pocet
      FROM invoices WHERE doc_type IN ('FINAL','ADVANCE_TAX') AND status <> 'CANCELLED'
  `);

  return (
    <Shell kdo={kdo} aktivni="/admin/doklady" nadpis="Doklady">
      <div className="mb-5 rounded-2xl border border-linen/10 bg-bark p-5">
        <p className="text-[12px] uppercase tracking-[0.14em] text-sage/70">Vyfakturováno celkem</p>
        <p className="font-display mt-2 text-3xl text-ember">
          {formatHalere(Number(souhrn?.vystaveno ?? 0))}
        </p>
        <p className="mt-1 text-[13.5px] text-sage">{souhrn?.pocet ?? 0} dokladů</p>
      </div>

      <Karta nadpis="Všechny doklady" pocet={doklady.length}>
        {doklady.length ? (
          doklady.map((d) => {
            const zakaznik =
              typeof d.customer === "string" ? JSON.parse(d.customer) : d.customer;
            return (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[15px] text-linen">
                    <span className="font-display">{d.number}</span>
                    <span className="ml-2.5 text-sage">
                      {nazevDokladu(d.doc_type, d.vat_applicable)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[13.5px] text-sage">
                    {zakaznik?.jmeno ?? "—"} ·{" "}
                    <Link href={`/admin/rezervace/${d.code}`} className="hover:text-ember">
                      {d.code}
                    </Link>
                    {d.issue_date && ` · vystaveno ${den(d.issue_date)}`}
                    {d.due_date && ` · splatnost ${den(d.due_date)}`}
                  </p>
                  {d.correction_reason && (
                    <p className="mt-1 text-[13px] text-sage/70">{d.correction_reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-display text-[15px] ${
                      Number(d.total_with_vat_cents) < 0 ? "text-red-300" : "text-linen"
                    }`}
                  >
                    {formatHalere(Number(d.total_with_vat_cents))}
                  </span>
                  <Odznak ton={TON[d.status] ?? "neutral"}>{STAV[d.status] ?? d.status}</Odznak>
                </div>
              </div>
            );
          })
        ) : (
          <Prazdno>
            Zatím žádné doklady. Vystavují se z detailu rezervace — zálohová faktura
            po potvrzení, konečná po odjezdu.
          </Prazdno>
        )}
      </Karta>

      <p className="mt-5 rounded-xl border border-linen/10 bg-bark px-5 py-4 text-[13.5px] leading-relaxed text-sage">
        <strong className="text-linen">Vystavený doklad se needituje.</strong> Oprava se dělá
        jedině opravným dokladem, a ten se vystavuje až poté, co peníze skutečně odejdou —
        vratka se může nepovést a doklad bez odeslaných peněz je vadný účetní záznam.
      </p>
    </Shell>
  );
}
