import "server-only";

import QRCode from "qrcode";

/**
 * Vykreslení QR platby.
 *
 * `errorCorrectionLevel: 'M'` a `margin: 4` jsou doporučení QR Platby ČBA —
 * bankovní aplikace s nižší korekcí a bez klidové zóny občas nenačtou.
 * Na web jde SVG (ostré v každé velikosti), do e-mailu a PDF PNG buffer.
 */

const NASTAVENI = { errorCorrectionLevel: "M", margin: 4 } as const;

export async function qrSvg(spayd: string): Promise<string> {
  return QRCode.toString(spayd, {
    ...NASTAVENI,
    type: "svg",
    color: { dark: "#0c110f", light: "#ffffff" },
  });
}

export async function qrPng(spayd: string, sirka = 512): Promise<Buffer> {
  return QRCode.toBuffer(spayd, { ...NASTAVENI, type: "png", width: sirka });
}
