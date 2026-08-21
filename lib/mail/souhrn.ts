import "server-only";

import { formatCzDate, formatHalere } from "@/lib/booking";
import { esc, hlavicka } from "./html";
import { posli } from "./odeslat";
import type { Dnes } from "@/lib/admin/dnes";

/**
 * Ranní souhrn pro provozovatele.
 *
 * Úkoly se v systému zakládaly, ale nikam se neozvaly — o nálezu v protokolu
 * nebo o vypršené záloze se majitel dozvěděl, jen když se sám přihlásil.
 * Jeden e-mail ráno, ne upozornění na každou drobnost: u dvou domků se
 * z deseti notifikací denně stane šum, který se přestane číst.
 *
 * Když se nic neděje a nic nečeká, e-mail nechodí vůbec.
 */

/**
 * Kolik úkolů se do e-mailu vejde.
 *
 * Když jich čeká dvacet, seznam přestane být přehled a stane se z něj zeď
 * textu, kterou nikdo nečte — přesně ve chvíli, kdy je to nejdůležitější.
 * Zbytek se shrne do jedné věty a majitel klikne do administrace.
 */
const MAX_UKOLU = 8;

const ZAVAZNOST: Record<string, string> = {
  urgent: "#d97070",
  warn: "#d9b04e",
  info: "#9db3a2",
};

export type SouhrnVstup = {
  komu: string;
  dnes: Dnes;
  odkazAdmin: string;
};

/** Má vůbec smysl e-mail posílat? */
export function stojiZaOdeslani(d: Dnes): boolean {
  return d.odjizdi.length > 0 || d.prijizdi.length > 0 || d.ukoly.length > 0;
}

function radekPobytu(p: { kod: string; jmeno: string | null; domek: string; hostu: number;
                          stavPlatby: string; celkemHalere: number; zaplacenoHalere: number }): string {
  const dluh = p.celkemHalere - p.zaplacenoHalere;
  return `<tr>
    <td style="padding:6px 12px 6px 0;white-space:nowrap"><strong>${esc(p.domek)}</strong></td>
    <td style="padding:6px 12px 6px 0">${esc(p.jmeno ?? "—", 60)}</td>
    <td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap">${esc(p.kod)} · ${p.hostu} ${p.hostu === 1 ? "host" : p.hostu < 5 ? "hosté" : "hostů"}</td>
    <td style="padding:6px 0;white-space:nowrap;color:${dluh > 0 ? "#b06f33" : "#4a7a52"}">
      ${dluh > 0 ? `dluží ${esc(formatHalere(dluh))}` : "uhrazeno"}
    </td>
  </tr>`;
}

function sekce(nadpis: string, pobyty: SouhrnVstup["dnes"]["odjizdi"]): string {
  if (!pobyty.length) return "";
  return `
    <h2 style="margin:26px 0 8px;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;color:#666;font-weight:600">
      ${esc(nadpis)}
    </h2>
    <table style="font-size:14px;line-height:1.6;border-collapse:collapse;width:100%">
      ${pobyty.map(radekPobytu).join("")}
    </table>`;
}

export async function posliRanniSouhrn(v: SouhrnVstup): Promise<boolean> {
  const d = v.dnes;
  const dnesniDatum = formatCzDate(new Date());

  // Nejnaléhavější nahoru — když se seznam usekne, ať zbydou ty správné.
  const poradi = { urgent: 0, warn: 1, info: 2 } as const;
  const serazene = [...d.ukoly].sort(
    (a, b) => (poradi[a.zavaznost] ?? 3) - (poradi[b.zavaznost] ?? 3),
  );
  const vypsane = serazene.slice(0, MAX_UKOLU);
  const zbyva = serazene.length - vypsane.length;

  const ukoly = d.ukoly.length
    ? `
    <h2 style="margin:26px 0 8px;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;color:#666;font-weight:600">
      Čeká na vás
    </h2>
    <table style="font-size:14px;line-height:1.6;border-collapse:collapse;width:100%">
      ${vypsane
        .map(
          (u) => `<tr>
            <td style="padding:6px 10px 6px 0;vertical-align:top">
              <span style="display:inline-block;width:7px;height:7px;border-radius:99px;background:${
                ZAVAZNOST[u.zavaznost] ?? ZAVAZNOST.info
              }"></span>
            </td>
            <td style="padding:6px 0">
              <strong>${esc(u.nadpis, 120)}</strong>
              ${
                // Kód se přidává, jen když ho název úkolu ještě nenese —
                // „Nová rezervace SL-26-0001 · SL-26-0001" je jen šum.
                u.kodRezervace && !u.nadpis.includes(u.kodRezervace)
                  ? `<span style="color:#666"> · ${esc(u.kodRezervace)}</span>`
                  : ""
              }
              ${u.detail ? `<br><span style="color:#666">${esc(u.detail, 240)}</span>` : ""}
            </td>
          </tr>`,
        )
        .join("")}
    </table>
    ${
      zbyva > 0
        ? `<p style="margin:10px 0 0;font-size:14px;color:#666">
             a ${zbyva} ${zbyva < 5 ? "další" : "dalších"} — celý seznam je v administraci.
           </p>`
        : ""
    }`
    : "";

  const nicSeNedeje =
    !d.odjizdi.length && !d.prijizdi.length
      ? `<p style="margin:20px 0 0;font-size:14px;color:#666">
           Dnes se nikdo nestěhuje.${
             d.pristiPrijezd
               ? ` Nejbližší příjezd ${esc(formatCzDate(new Date(d.pristiPrijezd.prijezd)))} — ${esc(d.pristiPrijezd.domek)}, ${esc(d.pristiPrijezd.jmeno ?? "—", 60)}.`
               : ""
           }
         </p>`
      : "";

  const html = `
  <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1a1a18">
    <div style="background:#0c110f;color:#f3efe5;padding:26px 30px;border-radius:16px 16px 0 0">
      <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#d9914e">Sedmý les</p>
      <h1 style="margin:8px 0 0;font-size:21px;font-weight:500">${esc(dnesniDatum)}</h1>
    </div>
    <div style="border:1px solid #e5e1d5;border-top:none;padding:22px 30px 28px;border-radius:0 0 16px 16px">
      ${sekce("Dnes odjíždí", d.odjizdi)}
      ${sekce("Dnes přijíždí", d.prijizdi)}
      ${sekce("Zůstává", d.zustava)}
      ${nicSeNedeje}
      ${ukoly}
      <p style="margin:28px 0 0">
        <a href="${esc(v.odkazAdmin)}" style="display:inline-block;background:#d9914e;color:#0c110f;text-decoration:none;padding:11px 20px;border-radius:999px;font-size:14px;font-weight:600">
          Otevřít administraci
        </a>
      </p>
    </div>
  </div>`;

  const radek = (p: { domek: string; jmeno: string | null; kod: string }) =>
    `  ${p.domek} · ${p.jmeno ?? "—"} (${p.kod})`;
  const text = [
    `Sedmý les — ${dnesniDatum}`,
    "",
    ...(d.odjizdi.length ? ["Dnes odjíždí:", ...d.odjizdi.map(radek), ""] : []),
    ...(d.prijizdi.length ? ["Dnes přijíždí:", ...d.prijizdi.map(radek), ""] : []),
    ...(d.zustava.length ? ["Zůstává:", ...d.zustava.map(radek), ""] : []),
    ...(d.ukoly.length
      ? ["Čeká na vás:", ...d.ukoly.map((u) => `  ${u.nadpis}${u.kodRezervace ? ` (${u.kodRezervace})` : ""}`), ""]
      : []),
    v.odkazAdmin,
    "",
    "Sedmý les · Jílové u Držkova",
  ].join("\n");

  const cast = [
    d.prijizdi.length ? `${d.prijizdi.length}× příjezd` : null,
    d.odjizdi.length ? `${d.odjizdi.length}× odjezd` : null,
    d.ukoly.length ? `${d.ukoly.length}× k vyřízení` : null,
  ].filter(Boolean);

  return posli({
    komu: v.komu,
    predmet: hlavicka(`🌲 ${dnesniDatum} — ${cast.join(", ") || "klid"}`),
    html,
    text,
  });
}
