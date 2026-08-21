import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatCzDate, formatHalere } from "@/lib/booking";
import { nactiDoklad } from "@/lib/doklady/nacti";
import { SITE } from "@/lib/content";
import Tisk from "./tisk";

/**
 * Doklad k vytištění.
 *
 * Vlastní stránka mimo web i administraci: majitel ji pošle hostovi odkazem
 * a host si ji uloží jako PDF tlačítkem „Tisk" v prohlížeči. Odkaz nese
 * podpis, který kontroluje `proxy.ts` — bez něj vrací poctivou 404, aby
 * se identifikátory dokladů nedaly zkoušet.
 *
 * Světlá stránka schválně: doklad se tiskne a tmavé pozadí by sežralo
 * půl toneru.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DokladPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await nactiDoklad(id);
  if (!d) notFound();

  const a = d.dodavatel.adresa;
  const o = d.odberatel as Record<string, string>;
  const nadpis = `${d.nazev} ${d.cislo}`;

  return (
    <main className="doklad">
      <Tisk nazev={`${d.cislo || "doklad"}.pdf`} />

      <header className="hlava">
        <div>
          <p className="znacka">{SITE.name}</p>
          <h1>{d.nazev}</h1>
          <p className="cislo">{d.cislo}</p>
        </div>
        <dl className="data">
          <div><dt>Vystaveno</dt><dd>{d.vystaveno ? formatCzDate(new Date(d.vystaveno)) : "—"}</dd></div>
          {d.dodavatel.platceDph && d.danovePlneni && (
            <div><dt>Datum plnění</dt><dd>{formatCzDate(new Date(d.danovePlneni))}</dd></div>
          )}
          {d.splatnost && (
            <div><dt>Splatnost</dt><dd>{formatCzDate(new Date(d.splatnost))}</dd></div>
          )}
          <div><dt>Variabilní symbol</dt><dd className="cisla">{d.vs}</dd></div>
        </dl>
      </header>

      <section className="strany">
        <div>
          <p className="stitek">Dodavatel</p>
          <p className="jmeno">{d.dodavatel.nazev}</p>
          <p>{a.street}</p>
          <p>{a.zip} {a.city}</p>
          <p className="ident">IČO {d.dodavatel.ico}</p>
          {d.dodavatel.dic ? (
            <p className="ident">DIČ {d.dodavatel.dic}</p>
          ) : (
            <p className="ident">Neplátce DPH</p>
          )}
        </div>
        <div>
          <p className="stitek">Odběratel</p>
          <p className="jmeno">{o.name ?? o.jmeno ?? "—"}</p>
          {o.street && <p>{o.street}</p>}
          {(o.zip || o.city) && <p>{o.zip} {o.city}</p>}
          {o.ico && <p className="ident">IČO {o.ico}</p>}
          {o.dic && <p className="ident">DIČ {o.dic}</p>}
          {o.email && <p className="ident">{o.email}</p>}
        </div>
      </section>

      {d.duvodOpravy && (
        <p className="duvod"><b>Důvod opravy:</b> {d.duvodOpravy}</p>
      )}

      <table className="polozky">
        <thead>
          <tr>
            <th>Položka</th>
            <th className="c">Počet</th>
            <th className="c">Cena za jedn.</th>
            {d.dodavatel.platceDph && <th className="c">Sazba</th>}
            {d.dodavatel.platceDph && <th className="c">Základ</th>}
            {d.dodavatel.platceDph && <th className="c">DPH</th>}
            <th className="c">Celkem</th>
          </tr>
        </thead>
        <tbody>
          {d.radky.map((r) => (
            <tr key={r.poradi}>
              <td>
                {r.popis}
                {r.odDne && r.doDne && (
                  <span className="obdobi">
                    {formatCzDate(new Date(r.odDne))} – {formatCzDate(new Date(r.doDne))}
                  </span>
                )}
                {r.czCpa && <span className="obdobi">CZ-CPA {r.czCpa}</span>}
              </td>
              <td className="c">{r.mnozstvi} {r.jednotka}</td>
              <td className="c">{formatHalere(r.jednotkovaCena)}</td>
              {d.dodavatel.platceDph && <td className="c">{r.sazba === null ? "—" : `${r.sazba} %`}</td>}
              {d.dodavatel.platceDph && <td className="c">{formatHalere(r.zaklad)}</td>}
              {d.dodavatel.platceDph && <td className="c">{formatHalere(r.dan)}</td>}
              <td className="c silne">{formatHalere(r.celkem)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="souhrn">
        <dl>
          {d.dodavatel.platceDph && (
            <>
              <div><dt>Základ daně</dt><dd>{formatHalere(d.bezDph)}</dd></div>
              <div><dt>DPH</dt><dd>{formatHalere(d.dan)}</dd></div>
            </>
          )}
          {d.zaokrouhleni !== 0 && (
            <div><dt>Zaokrouhlení</dt><dd>{formatHalere(d.zaokrouhleni)}</dd></div>
          )}
          <div className="celkem"><dt>Celkem</dt><dd>{formatHalere(d.sDphCelkem)}</dd></div>
          {d.jizZdaneneZalohy !== 0 && (
            <div><dt>Uhrazené zálohy</dt><dd>−{formatHalere(Math.abs(d.jizZdaneneZalohy))}</dd></div>
          )}
          {/* U dobropisu se neúčtuje, ale vrací — „k úhradě −10 470 Kč" by
              hosta mátlo, i když je to matematicky totéž. */}
          <div className="uhrada">
            <dt>{d.kUhrade < 0 ? "K vrácení" : "K úhradě"}</dt>
            <dd>{formatHalere(Math.abs(d.kUhrade))}</dd>
          </div>
        </dl>
      </section>

      {d.kUhrade > 0 && (
        <section className="platba">
          <p className="stitek">Platební údaje</p>
          <p>Účet <b>{d.dodavatel.ucet}</b> · variabilní symbol <b className="cisla">{d.vs}</b></p>
          <p className="ident">IBAN {d.dodavatel.iban}{d.dodavatel.bic ? ` · BIC ${d.dodavatel.bic}` : ""}</p>
        </section>
      )}

      <footer className="pata">
        <p>
          {d.dodavatel.nazev} · {a.street}, {a.zip} {a.city} · IČO {d.dodavatel.ico}
          {d.dodavatel.dic ? ` · DIČ ${d.dodavatel.dic}` : ""}
        </p>
        <p>Rezervace {d.kodRezervace} · {SITE.email}</p>
        {!d.dodavatel.platceDph && <p>Dodavatel není plátcem DPH.</p>}
      </footer>

      <p className="srt">{nadpis}</p>
    </main>
  );
}
