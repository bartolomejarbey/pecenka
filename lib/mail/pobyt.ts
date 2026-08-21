import "server-only";

import { formatCzDate } from "@/lib/booking";
import { esc, hlavicka } from "./html";
import { posli } from "./odeslat";

/**
 * E-mail s přístupem do portálu hosta.
 *
 * Chodí ve chvíli, kdy dorazí záloha — do té doby není co zpřístupňovat.
 * Přihlašuje se variabilním symbolem a osmiznakovým kódem: host obojí zná
 * z platby a nemusí si zakládat účet ani vymýšlet heslo.
 */

type Vstup = {
  komu: string;
  jmeno: string;
  kodRezervace: string;
  vs: string;
  kodPristupu: string;
  domek: string;
  prijezd: Date;
  odjezd: Date;
};

export async function posliPristupDoPortalu(v: Vstup): Promise<boolean> {
  const zaklad = process.env.APP_URL ?? "https://sedmyles.cz";
  const odkaz = `${zaklad}/pobyt/prihlaseni`;

  const html = `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a18">
    <div style="background:#0c110f;color:#f3efe5;padding:28px 32px;border-radius:16px 16px 0 0">
      <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#d9914e">Sedmý les</p>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:500">Záloha dorazila, termín je potvrzený</h1>
    </div>
    <div style="border:1px solid #e5e1d5;border-top:none;padding:28px 32px;border-radius:0 0 16px 16px">
      <p style="margin:0 0 18px;font-size:15px;line-height:1.7">
        Dobrý den ${esc(v.jmeno, 120)},<br>
        záloha za pobyt v domku <strong>${esc(v.domek)}</strong>
        (${esc(formatCzDate(v.prijezd))} – ${esc(formatCzDate(v.odjezd))}) je připsaná.
        Termín je potvrzený.
      </p>

      <p style="margin:0 0 12px;font-size:15px;line-height:1.7">
        Připravili jsme vám přístup, kde najdete podrobnosti k pobytu a kde
        se před odjezdem vyfotí domek. Fotky slouží oběma stranám: vám jako
        doklad, že jste odjížděli z domku v pořádku.
      </p>

      <div style="margin:18px 0;padding:16px 18px;background:#f6f4ec;border-radius:12px">
        <p style="margin:0 0 10px;font-size:13px;color:#666">Přihlášení na ${esc(odkaz)}</p>
        <p style="margin:0;font-size:15px;line-height:1.9">
          Variabilní symbol: <code style="font-size:16px"><strong>${esc(v.vs)}</strong></code><br>
          Kód: <code style="font-size:18px;letter-spacing:2px"><strong>${esc(v.kodPristupu)}</strong></code>
        </p>
      </div>

      <p style="margin:18px 0 0">
        <a href="${esc(odkaz)}" style="display:inline-block;background:#d9914e;color:#0c110f;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:15px;font-weight:600">
          Otevřít pobyt
        </a>
      </p>

      <p style="margin:22px 0 0;font-size:13px;color:#666;line-height:1.6">
        Kód platí do dvou týdnů po odjezdu. Rezervace ${esc(v.kodRezervace)}.
      </p>
    </div>
  </div>`;

  const text = [
    `Dobrý den ${v.jmeno},`,
    "",
    `záloha za pobyt v domku ${v.domek} (${formatCzDate(v.prijezd)} – ${formatCzDate(v.odjezd)}) je připsaná. Termín je potvrzený.`,
    "",
    `Přihlášení do pobytu: ${odkaz}`,
    `Variabilní symbol: ${v.vs}`,
    `Kód: ${v.kodPristupu}`,
    "",
    `Kód platí do dvou týdnů po odjezdu. Rezervace ${v.kodRezervace}.`,
    "",
    "Sedmý les · Jílové u Držkova",
  ].join("\n");

  return posli({
    komu: v.komu,
    predmet: hlavicka(`Sedmý les — termín ${v.kodRezervace} je potvrzený, tady je váš přístup`),
    html,
    text,
  });
}
