import "server-only";

import { formatCzDate, formatHalere } from "@/lib/booking";
import { esc, hlavicka } from "./html";
import { posli } from "./odeslat";

/**
 * E-mail s dokladem.
 *
 * Posílá odkaz, ne přílohu. Doklad se vykresluje jako stránka a host si ho
 * uloží jako PDF tlačítkem v prohlížeči — je to o jednu knihovnu a jeden
 * vložený font méně a výsledek je stejný. Odkaz nese podpis, takže z něj
 * nejde odvodit cizí doklad.
 */

type Vstup = {
  komu: string;
  jmeno: string;
  nazev: string;
  cislo: string;
  celkemHalere: number;
  kUhradeHalere: number;
  splatnost: Date | null;
  vs: string;
  ucet: string;
  odkaz: string;
};

export async function posliDoklad(v: Vstup): Promise<boolean> {
  const zaklad = process.env.APP_URL ?? "https://sedmyles.cz";
  const plnyOdkaz = v.odkaz.startsWith("http") ? v.odkaz : zaklad + v.odkaz;
  const vraci = v.kUhradeHalere < 0;

  const html = `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a18">
    <div style="background:#0c110f;color:#f3efe5;padding:28px 32px;border-radius:16px 16px 0 0">
      <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#d9914e">Sedmý les</p>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:500">${esc(v.nazev)} ${esc(v.cislo)}</h1>
    </div>
    <div style="border:1px solid #e5e1d5;border-top:none;padding:28px 32px;border-radius:0 0 16px 16px">
      <p style="margin:0 0 18px;font-size:15px;line-height:1.7">
        Dobrý den ${esc(v.jmeno, 120)},<br>
        posíláme ${esc(v.nazev.toLowerCase())} ${esc(v.cislo)}
        na ${esc(formatHalere(Math.abs(v.celkemHalere)))}.
      </p>

      ${
        vraci
          ? `<p style="margin:0 0 18px;padding:12px 14px;background:#f2f7f2;border-radius:10px;font-size:14px;line-height:1.6">
               K vrácení <strong>${esc(formatHalere(Math.abs(v.kUhradeHalere)))}</strong>.
               Peníze posíláme zpět na účet, ze kterého platba přišla.
             </p>`
          : v.kUhradeHalere > 0
            ? `<div style="margin:0 0 18px;padding:14px 16px;background:#f6f4ec;border-radius:10px;font-size:14px;line-height:1.9">
                 K úhradě <strong>${esc(formatHalere(v.kUhradeHalere))}</strong><br>
                 Účet: <strong>${esc(v.ucet)}</strong><br>
                 Variabilní symbol: <strong>${esc(v.vs)}</strong>
                 ${v.splatnost ? `<br>Splatnost: ${esc(formatCzDate(v.splatnost))}` : ""}
               </div>`
            : `<p style="margin:0 0 18px;padding:12px 14px;background:#f2f7f2;border-radius:10px;font-size:14px">
                 Uhrazeno, nic dalšího posílat nemusíte.
               </p>`
      }

      <p style="margin:0">
        <a href="${esc(plnyOdkaz)}" style="display:inline-block;background:#d9914e;color:#0c110f;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:15px;font-weight:600">
          Otevřít doklad
        </a>
      </p>
      <p style="margin:14px 0 0;font-size:13px;color:#666;line-height:1.6">
        Na stránce dokladu je tlačítko „Uložit jako PDF".
      </p>
    </div>
  </div>`;

  const text = [
    `Dobrý den ${v.jmeno},`,
    "",
    `posíláme ${v.nazev.toLowerCase()} ${v.cislo} na ${formatHalere(Math.abs(v.celkemHalere))}.`,
    "",
    ...(vraci
      ? [`K vrácení ${formatHalere(Math.abs(v.kUhradeHalere))}. Peníze posíláme zpět na účet, ze kterého platba přišla.`]
      : v.kUhradeHalere > 0
        ? [
            `K úhradě: ${formatHalere(v.kUhradeHalere)}`,
            `Účet: ${v.ucet}`,
            `Variabilní symbol: ${v.vs}`,
            ...(v.splatnost ? [`Splatnost: ${formatCzDate(v.splatnost)}`] : []),
          ]
        : ["Uhrazeno, nic dalšího posílat nemusíte."]),
    "",
    `Doklad: ${plnyOdkaz}`,
    "",
    "Sedmý les · Jílové u Držkova",
  ].join("\n");

  return posli({
    komu: v.komu,
    predmet: hlavicka(`Sedmý les — ${v.nazev} ${v.cislo}`),
    html,
    text,
  });
}
