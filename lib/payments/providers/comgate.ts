import "server-only";

import { COMGATE_TESTOVACI, COMGATE_ZAPNUT } from "../nastaveni";
import type {
  PlatebniMetoda,
  StavPlatby,
  VstupPlatby,
  VysledekVratky,
  ZalozenaPlatba,
} from "../types";

/**
 * ComGate — REST API v2.0.
 *
 * **Zatím není zasmluvněná.** Kód je hotový a čeká na `COMGATE_MERCHANT`
 * a `COMGATE_SECRET`; bez nich se metoda v rozhraní vůbec nenabídne
 * a endpointy vracejí 503. Po podpisu smlouvy to jsou tři proměnné
 * ve Vercelu a jedno volání `POST /config.json` — nic se nepřepisuje.
 *
 * Karta se nikdy nedotkne naší domény (žádný iframe s formulářem),
 * takže projekt zůstává na PCI DSS SAQ A.
 */

const ZAKLAD = "https://payments.comgate.cz/v2.0";

/** ComGate má na `label` tvrdý limit 16 znaků — identifikace jde přes refId. */
const LABEL = "SEDMY LES";

function hlavicky(): HeadersInit {
  const merchant = process.env.COMGATE_MERCHANT ?? "";
  const secret = process.env.COMGATE_SECRET ?? "";
  return {
    Authorization: "Basic " + Buffer.from(`${merchant}:${secret}`).toString("base64"),
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/** Stavy ComGate → naše stavy. */
const STAVY: Record<string, StavPlatby> = {
  PENDING: "pending",
  PAID: "paid",
  CANCELLED: "cancelled",
  AUTHORIZED: "pending", // předautorizace: peníze blokované, ne stržené
};

export function comgateMetoda(): PlatebniMetoda {
  return {
    id: "comgate",
    nazev: "Kartou, Apple Pay nebo Google Pay",
    schopnosti: {
      okamzitePotvrzeni: true,
      vratky: true,
      castecneVratky: true,
      preautorizace: true,
      applePay: true,
      googlePay: true,
      storno: true,
    },
    dostupna: () => COMGATE_ZAPNUT,

    async zalozPlatbu(vstup: VstupPlatby): Promise<ZalozenaPlatba> {
      if (!COMGATE_ZAPNUT) throw new Error("ComGate není zasmluvněný.");
      const zaklad = process.env.APP_URL ?? "";
      const odpoved = await fetch(`${ZAKLAD}/payment.json`, {
        method: "POST",
        headers: hlavicky(),
        body: JSON.stringify({
          price: vstup.castkaHalere,
          curr: "CZK",
          label: LABEL,
          refId: vstup.variabilniSymbol,
          email: vstup.host.email,
          phone: vstup.host.telefon,
          fullName: vstup.host.jmeno,
          lang: "cs",
          country: "CZ",
          category: "OTHER",
          method: "ALL",
          test: COMGATE_TESTOVACI,
          expirationTime: "3d",
          enableApplePayGooglePay: true,
          threeDSPreference: "AUTO",
          url_paid: `${zaklad}/api/platba/navrat/zaplaceno?k=${vstup.kodRezervace}`,
          url_cancelled: `${zaklad}/api/platba/navrat/zruseno?k=${vstup.kodRezervace}`,
          url_pending: `${zaklad}/api/platba/navrat/ceka?k=${vstup.kodRezervace}`,
        }),
      });
      if (!odpoved.ok) {
        throw new Error(`ComGate odmítl založení platby: ${odpoved.status} ${await odpoved.text()}`);
      }
      const data = (await odpoved.json()) as { transId: string; redirect: string };
      return {
        transakceId: data.transId,
        presmerovani: data.redirect,
        vyprsi: vstup.splatnost,
      };
    },

    async zjistiStav(transakceId: string): Promise<StavPlatby> {
      const odpoved = await fetch(`${ZAKLAD}/payment/transId/${transakceId}.json`, {
        headers: hlavicky(),
      });
      if (!odpoved.ok) throw new Error(`ComGate nevrátil stav: ${odpoved.status}`);
      const data = (await odpoved.json()) as { state?: string };
      return STAVY[data.state ?? ""] ?? "pending";
    },

    async vratPenize(transakceId, castkaHalere, refId): Promise<VysledekVratky> {
      const odpoved = await fetch(`${ZAKLAD}/refund.json`, {
        method: "POST",
        headers: hlavicky(),
        body: JSON.stringify({ transId: transakceId, amount: castkaHalere, refId }),
      });
      return odpoved.ok
        ? { ok: true, transakceId }
        : { ok: false, zprava: `${odpoved.status} ${await odpoved.text()}` };
    },

    async stornuj(transakceId: string): Promise<void> {
      const odpoved = await fetch(`${ZAKLAD}/payment/transId/${transakceId}.json`, {
        method: "DELETE",
        headers: hlavicky(),
      });
      if (!odpoved.ok) throw new Error(`ComGate storno selhalo: ${odpoved.status}`);
    },
  };
}
