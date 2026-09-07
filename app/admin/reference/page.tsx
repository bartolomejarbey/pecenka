import type { Metadata } from "next";
import Link from "next/link";
import { vyzadujPrihlaseni } from "@/lib/auth/dal";
import { nactiDomkySReferencemi } from "@/lib/admin/reference";
import { stavUloziste } from "@/lib/luna/uloziste";
import Shell from "@/components/admin/Shell";
import { Karta, Prazdno } from "@/components/admin/prvky";

export const metadata: Metadata = {
  title: "Referenční fotky",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Referenční fotky domků.
 *
 * Tohle je vstup celého porovnávání stavu. Dokud tady nic není, každý
 * odjezdový protokol skončí u člověka s poznámkou „nemáme s čím porovnat" —
 * což je poctivé, ale k ničemu.
 */
export default async function AdminReference() {
  const kdo = await vyzadujPrihlaseni();
  const domky = await nactiDomkySReferencemi();
  const uloziste = stavUloziste();

  return (
    <Shell kdo={kdo} aktivni="/admin/reference" nadpis="Referenční fotky">
      <p className="mb-6 max-w-2xl text-[15px] leading-relaxed text-sage">
        Takhle domek vypadá, když ho předáváte. Odjezdové fotky od hostů se
        porovnávají právě proti těmhle snímkům — co tu chybí, to systém nemá
        jak posoudit. Až něco v domku vyměníte, nahrajte novou fotku;{" "}
        <span className="text-linen">stará zůstane uložená</span>, aby šly starší
        protokoly pořád doložit.
      </p>

      {!uloziste.vporadku && (
        <p
          role="alert"
          className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-[14.5px] leading-relaxed text-red-200"
        >
          <strong className="font-semibold">Úložiště fotek není připravené.</strong>{" "}
          {uloziste.popis}. Dokud se to nespraví, nahrávání skončí chybou a hosté
          nebudou moct odeslat protokol.
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {domky.length ? (
          domky.map((d) => {
            const chybi = d.zony.filter((z) => z.povinna && !z.snimky.length).length;
            return (
              <Karta key={d.slug} nadpis={d.nazev}>
                <div className="px-5 py-5">
                  <p className="text-[15px] text-linen">
                    {d.hotovoZon} z {d.zony.length} zón má referenční snímek
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-linen/10">
                    <div
                      className="h-full rounded-full bg-ember transition-[width]"
                      style={{ width: `${Math.round((d.hotovoZon / d.zony.length) * 100)}%` }}
                    />
                  </div>

                  <p className="mt-3.5 text-[13.5px] leading-relaxed text-sage">
                    {d.verze
                      ? `Sada verze ${d.verze}${d.pouzita ? " — už se podle ní hodnotilo" : ""}.`
                      : "Zatím žádná sada."}
                    {chybi > 0 && (
                      <>
                        {" "}
                        <span className="text-ember">
                          Chybí {chybi} {chybi === 1 ? "povinná zóna" : chybi < 5 ? "povinné zóny" : "povinných zón"}.
                        </span>
                      </>
                    )}
                  </p>

                  <Link
                    href={`/admin/reference/${d.slug}`}
                    className="mt-5 flex min-h-[48px] items-center justify-center rounded-full border border-ember px-5 text-[15px] font-semibold text-ember transition-colors hover:bg-ember/10"
                  >
                    {d.hotovoZon ? "Otevřít a doplnit" : "Nafotit referenci"}
                  </Link>
                </div>
              </Karta>
            );
          })
        ) : (
          <Karta nadpis="Domky">
            <Prazdno>Žádný fyzický domek není aktivní.</Prazdno>
          </Karta>
        )}
      </div>

      <div className="mt-5">
      <Karta nadpis="Jak na to">
        <div className="space-y-3 px-5 py-5 text-[14.5px] leading-relaxed text-sage">
          <p>
            Foťte <span className="text-linen">z místa, odkud bude fotit host</span> — návod
            u každé zóny je tentýž, jaký uvidí on. Čím podobnější záběr, tím míň
            zbytečných nálezů.
          </p>
          <p>
            Domek musí být <span className="text-linen">uklizený a nepoškozený</span>. Co je
            na referenci rozbité, to už nikdy nikdo nenajde — a naopak.
          </p>
          <p>
            Klidně nahrajte tutéž zónu vícekrát za různého světla. Systém si
            k odjezdové fotce vybere tu, která má nejblíž stejný jas.
          </p>
        </div>
      </Karta>
      </div>
    </Shell>
  );
}
