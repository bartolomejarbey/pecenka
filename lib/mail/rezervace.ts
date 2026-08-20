import "server-only";

import { formatCzDate, formatHalere } from "@/lib/booking";
import { esc, hlavicka } from "./html";
import { posli } from "./odeslat";
import { qrPng } from "@/lib/payments/qr";
import type { PlatbaKZaplaceni } from "@/lib/payments/priprav";

/**
 * E-mail hostovi po založení rezervace.
 *
 * QR kód jde jako **CID příloha**, ne jako `data:` URI — Gmail data URI
 * v obrázcích zahazuje a host by viděl prázdné místo místo platby.
 * Vedle QR jsou vždy vypsané i údaje textem, protože ne každá banka QR načte
 * a ne každý e-mailový klient obrázek zobrazí.
 */

type Vstup = {
  komu: string;
  jmeno: string;
  kodRezervace: string;
  domek: string;
  prijezd: Date;
  odjezd: Date;
  celkemHalere: number;
  stav: "hold" | "inquiry";
  drziDo: Date | null;
  platba: PlatbaKZaplaceni | null;
  odkazPlatba: string | null;
};

export async function posliPotvrzeniHostovi(v: Vstup): Promise<boolean> {
  const zaklad = process.env.APP_URL ?? "https://sedmyles.cz";
  const prilohy = v.platba
    ? [
        {
          filename: "qr-platba.png",
          content: await qrPng(v.platba.spayd),
          contentType: "image/png",
          cid: "qrplatba",
        },
      ]
    : undefined;

  const platebniBlok =
    v.platba &&
    `
    <h2 style="margin:32px 0 6px;font-size:17px;font-weight:600">Záloha ${esc(formatHalere(v.platba.castkaHalere))}</h2>
    <p style="margin:0 0 18px;font-size:14px;color:#666;line-height:1.6">
      Načtěte QR kód v bankovní aplikaci, nebo přepište údaje ručně.
    </p>
    <table style="font-size:15px;line-height:1.7">
      <tr>
        <td style="padding-right:24px;vertical-align:top">
          <img src="cid:qrplatba" alt="QR platba" width="220" height="220"
               style="display:block;border:8px solid #fff;border-radius:8px" />
        </td>
        <td style="vertical-align:top">
          <table style="font-size:15px;line-height:1.7">
            <tr><td style="padding:2px 14px 2px 0;color:#666">Účet</td><td><strong>${esc(v.platba.ucet.zobrazit)}</strong></td></tr>
            <tr><td style="padding:2px 14px 2px 0;color:#666">Částka</td><td><strong>${esc(formatHalere(v.platba.castkaHalere))}</strong></td></tr>
            <tr><td style="padding:2px 14px 2px 0;color:#666">Variabilní symbol</td><td><strong>${esc(v.platba.variabilniSymbol)}</strong></td></tr>
            <tr><td style="padding:2px 14px 2px 0;color:#666">Zpráva</td><td>${esc(v.platba.zprava)}</td></tr>
            ${v.platba.splatnost ? `<tr><td style="padding:2px 14px 2px 0;color:#666">Splatnost</td><td>${esc(formatCzDate(v.platba.splatnost))}</td></tr>` : ""}
          </table>
        </td>
      </tr>
    </table>`;

  const html = `
  <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1a1a18">
    <div style="background:#0c110f;color:#f3efe5;padding:30px 34px;border-radius:16px 16px 0 0">
      <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#d9914e">Sedmý les</p>
      <h1 style="margin:10px 0 0;font-size:24px;font-weight:500">
        ${v.stav === "hold" ? "Termín je váš" : "Poptávku máme"}
      </h1>
    </div>
    <div style="border:1px solid #e5e1d5;border-top:none;padding:30px 34px;border-radius:0 0 16px 16px">
      <p style="margin:0 0 20px;font-size:16px;line-height:1.7">
        Dobrý den ${esc(v.jmeno, 120)},
      </p>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.7">
        ${
          v.stav === "hold"
            ? `termín jsme vám zablokovali${v.drziDo ? ` a držíme ho do <strong>${esc(formatCzDate(v.drziDo))}</strong>` : ""}. Do té doby stačí poslat zálohu — pak je rezervace závazná a nic dalšího řešit nemusíte.`
            : "ozveme se vám do 24 hodin s potvrzením. U pobytů na poslední chvíli a u obou domků dohromady to potvrzujeme ručně, aby nedošlo k nedorozumění."
        }
      </p>

      <table style="font-size:15px;line-height:1.7;border-top:1px solid #eee;padding-top:14px">
        <tr><td style="padding:6px 18px 6px 0;color:#666">Rezervace</td><td><strong>${esc(v.kodRezervace)}</strong></td></tr>
        <tr><td style="padding:6px 18px 6px 0;color:#666">Domek</td><td>${esc(v.domek)}</td></tr>
        <tr><td style="padding:6px 18px 6px 0;color:#666">Termín</td><td>${esc(formatCzDate(v.prijezd))} – ${esc(formatCzDate(v.odjezd))}</td></tr>
        <tr><td style="padding:6px 18px 6px 0;color:#666">Cena pobytu</td><td>${esc(formatHalere(v.celkemHalere))}</td></tr>
      </table>

      ${platebniBlok ?? ""}

      ${
        v.odkazPlatba
          ? `<p style="margin:30px 0 0">
               <a href="${esc(zaklad + v.odkazPlatba, 400)}"
                  style="display:inline-block;background:#d9914e;color:#0c110f;text-decoration:none;
                         padding:13px 26px;border-radius:999px;font-family:Helvetica,Arial,sans-serif;
                         font-size:15px;font-weight:600">Otevřít platební stránku</a>
             </p>`
          : ""
      }

      <p style="margin:30px 0 0;font-size:13.5px;color:#777;line-height:1.7">
        Kdyby cokoli, stačí odpovědět na tenhle e-mail.<br />Sedmý les · Jílové u Držkova
      </p>
    </div>
  </div>`;

  const text = [
    `Dobrý den ${v.jmeno},`,
    "",
    v.stav === "hold"
      ? `termín jsme vám zablokovali${v.drziDo ? ` a držíme do ${formatCzDate(v.drziDo)}` : ""}.`
      : "ozveme se do 24 hodin s potvrzením.",
    "",
    `Rezervace: ${v.kodRezervace}`,
    `Domek: ${v.domek}`,
    `Termín: ${formatCzDate(v.prijezd)} – ${formatCzDate(v.odjezd)}`,
    `Cena pobytu: ${formatHalere(v.celkemHalere)}`,
    ...(v.platba
      ? [
          "",
          `Záloha: ${formatHalere(v.platba.castkaHalere)}`,
          `Účet: ${v.platba.ucet.zobrazit}`,
          `Variabilní symbol: ${v.platba.variabilniSymbol}`,
          `Zpráva: ${v.platba.zprava}`,
          ...(v.platba.splatnost ? [`Splatnost: ${formatCzDate(v.platba.splatnost)}`] : []),
        ]
      : []),
    "",
    "Sedmý les · Jílové u Držkova",
  ].join("\n");

  return posli({
    komu: v.komu,
    predmet: hlavicka(
      v.stav === "hold"
        ? `Sedmý les — termín ${v.kodRezervace} je váš, zbývá záloha`
        : `Sedmý les — poptávku ${v.kodRezervace} máme`,
    ),
    html,
    text,
    prilohy,
  });
}
