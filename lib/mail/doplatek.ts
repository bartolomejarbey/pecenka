import "server-only";

import { formatCzDate, formatHalere } from "@/lib/booking";
import { qrPng } from "@/lib/payments/qr";
import type { PlatbaKZaplaceni } from "@/lib/payments/priprav";
import { esc, hlavicka } from "./html";
import { posli } from "./odeslat";

/**
 * Výzva k doplatku.
 *
 * Chodí, až když se blíží příjezd. QR kód jde jako CID příloha, ne jako
 * `data:` URI — Gmail data URI v obrázcích zahazuje a host by viděl prázdné
 * místo místo platby. Vedle QR jsou vždy i údaje textem, protože ne každá
 * banka QR načte.
 */

type Vstup = {
  komu: string;
  jmeno: string;
  kodRezervace: string;
  domek: string;
  prijezd: Date;
  platba: PlatbaKZaplaceni;
  odkaz: string | null;
};

export async function posliVyzvuKDoplatku(v: Vstup): Promise<boolean> {
  const zaklad = process.env.APP_URL ?? "https://sedmyles.cz";
  const plnyOdkaz = v.odkaz ? (v.odkaz.startsWith("http") ? v.odkaz : zaklad + v.odkaz) : null;

  const html = `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a18">
    <div style="background:#0c110f;color:#f3efe5;padding:28px 32px;border-radius:16px 16px 0 0">
      <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#d9914e">Sedmý les</p>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:500">Blíží se váš pobyt</h1>
    </div>
    <div style="border:1px solid #e5e1d5;border-top:none;padding:28px 32px;border-radius:0 0 16px 16px">
      <p style="margin:0 0 18px;font-size:15px;line-height:1.7">
        Dobrý den ${esc(v.jmeno, 120)},<br>
        za chvíli se uvidíme — ${esc(v.domek)}, příjezd
        ${esc(formatCzDate(v.prijezd))}. Zbývá doplatit
        <strong>${esc(formatHalere(v.platba.castkaHalere))}</strong>.
      </p>

      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="vertical-align:top;padding-right:20px">
            <img src="cid:qrdoplatek" alt="QR platba" width="180" height="180"
                 style="display:block;border-radius:12px;background:#fff">
          </td>
          <td style="vertical-align:top;font-size:14px;line-height:1.9">
            Účet: <strong>${esc(v.platba.ucet.zobrazit)}</strong><br>
            Částka: <strong>${esc(formatHalere(v.platba.castkaHalere))}</strong><br>
            Variabilní symbol: <strong>${esc(v.platba.variabilniSymbol)}</strong><br>
            ${v.platba.splatnost ? `Splatnost: ${esc(formatCzDate(v.platba.splatnost))}` : ""}
          </td>
        </tr>
      </table>

      ${
        plnyOdkaz
          ? `<p style="margin:22px 0 0">
               <a href="${esc(plnyOdkaz)}" style="display:inline-block;background:#d9914e;color:#0c110f;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:15px;font-weight:600">
                 Otevřít platební stránku
               </a>
             </p>`
          : ""
      }

      <p style="margin:22px 0 0;font-size:13px;color:#666;line-height:1.6">
        Rezervace ${esc(v.kodRezervace)}. Kdyby něco nesedělo, stačí odpovědět na tenhle e-mail.
      </p>
    </div>
  </div>`;

  const text = [
    `Dobrý den ${v.jmeno},`,
    "",
    `za chvíli se uvidíme — ${v.domek}, příjezd ${formatCzDate(v.prijezd)}.`,
    `Zbývá doplatit ${formatHalere(v.platba.castkaHalere)}.`,
    "",
    `Účet: ${v.platba.ucet.zobrazit}`,
    `Variabilní symbol: ${v.platba.variabilniSymbol}`,
    ...(v.platba.splatnost ? [`Splatnost: ${formatCzDate(v.platba.splatnost)}`] : []),
    ...(plnyOdkaz ? ["", plnyOdkaz] : []),
    "",
    `Rezervace ${v.kodRezervace}`,
    "",
    "Sedmý les · Jílové u Držkova",
  ].join("\n");

  return posli({
    komu: v.komu,
    predmet: hlavicka(`Sedmý les — doplatek k rezervaci ${v.kodRezervace}`),
    html,
    text,
    prilohy: [
      {
        filename: "qr-doplatek.png",
        content: await qrPng(v.platba.spayd),
        contentType: "image/png",
        cid: "qrdoplatek",
      },
    ],
  });
}
