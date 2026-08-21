import type { Metadata } from "next";
import Link from "next/link";
import { vyzadujPrihlaseni } from "@/lib/auth/dal";
import { nactiFrontu } from "@/lib/luna/admin";
import { dostupnyModel } from "@/lib/luna/model";
import { formatHalere } from "@/lib/booking";
import Shell from "@/components/admin/Shell";
import { Karta, Odznak, Prazdno, den } from "@/components/admin/prvky";

export const metadata: Metadata = { title: "Inspekce", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STAV: Record<string, { popis: string; ton: "zaplaceno" | "zaloha" | "neutral" | "pozor" }> = {
  submitted: { popis: "Čeká na vyhodnocení", ton: "zaloha" },
  analyzing: { popis: "Vyhodnocuje se", ton: "zaloha" },
  auto_clear: { popis: "Bez nálezu", ton: "zaplaceno" },
  needs_review: { popis: "Ke schválení", ton: "pozor" },
  closed: { popis: "Uzavřeno", ton: "neutral" },
};

const ZAVAZNOST: Record<string, string> = {
  none: "nic", dirt: "nepořádek", wear: "opotřebení",
  damage_minor: "drobné poškození", damage_major: "výrazné poškození", missing: "chybí vybavení",
};

export default async function AdminInspekce() {
  const kdo = await vyzadujPrihlaseni();
  const fronta = await nactiFrontu();
  const model = dostupnyModel();

  return (
    <Shell kdo={kdo} aktivni="/admin/inspekce" nadpis="Foto-protokoly">
      {model === "zadny" && (
        <p className="mb-5 rounded-xl border border-ember/30 bg-ember/10 px-4 py-3 text-[14px] text-sage">
          Není nastavený klíč k modelu. Obrazová analýza běží dál, ale rozdíly
          posuzuješ sám — což je z hlediska ochrany hostů nejbezpečnější stav.
        </p>
      )}

      <p className="mb-5 text-[14px] text-sage">
        Jak kontrola rozhoduje a co pozná, ukazuje{" "}
        <Link href="/kontrola-stavu" className="text-ember hover:text-ember-soft">
          přehled dvaceti tří případů
        </Link>{" "}
        — od vlasové praskliny ve skle po propálenou díru v čalounění, i s tím, co systém přehlédl.
      </p>

      <Karta nadpis="Fronta" pocet={fronta.length}>
        {fronta.length ? (
          fronta.map((i) => {
            const s = STAV[i.stav] ?? { popis: i.stav, ton: "neutral" as const };
            return (
              <Link
                key={i.id}
                href={`/admin/inspekce/${i.id}`}
                className="block px-5 py-4 transition-colors hover:bg-linen/5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="text-[15.5px] font-medium text-linen">{i.jmeno ?? "Bez jména"}</p>
                  <span className="font-display text-[14px] text-sage">{i.kodRezervace}</span>
                </div>
                <p className="mt-1 text-[13.5px] text-sage">
                  {i.domek}
                  {i.odeslano && ` · odesláno ${den(i.odeslano)}`}
                  {i.nakladHalere > 0 && ` · ${formatHalere(i.nakladHalere)} za vyhodnocení`}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <Odznak ton={s.ton}>{s.popis}</Odznak>
                  {i.nejhorsi && i.nejhorsi !== "none" && (
                    <Odznak ton="neutral">{ZAVAZNOST[i.nejhorsi] ?? i.nejhorsi}</Odznak>
                  )}
                  {i.kPosouzeni > 0 && <Odznak ton="pozor">{i.kPosouzeni} k rozhodnutí</Odznak>}
                </div>
              </Link>
            );
          })
        ) : (
          <Prazdno>
            Zatím žádné odeslané protokoly. Hosté je vyplňují v portálu na{" "}
            <code className="text-sage">/pobyt</code> před odjezdem.
          </Prazdno>
        )}
      </Karta>

      <p className="mt-5 rounded-xl border border-linen/10 bg-bark px-5 py-4 text-[13.5px] leading-relaxed text-sage">
        <strong className="text-linen">Luna nikdy nerozhoduje o penězích.</strong> Vyhodnotí fotky
        a napíše, co vidí — včetně důvodu, proč to poškození být nemusí. Nárok
        vzniká jedině tvým rozhodnutím s vlastnoručně napsaným odůvodněním.
      </p>
    </Shell>
  );
}
