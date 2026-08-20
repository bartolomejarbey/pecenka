import "server-only";

import type { PlatebniMetoda, StavPlatby, VstupPlatby, ZalozenaPlatba } from "../types";

/**
 * Nanečisto — pro vývoj a testy.
 *
 * Chová se jako brána s přesměrováním, ale místo na ComGate posílá na
 * `/dev/platebni-brana`, kde jsou tři tlačítka: zaplatit, zrušit, nechat viset.
 * Díky tomu se dá celý platební tok proklikat dřív, než je smlouva podepsaná.
 * Mimo vývoj se nikdy nenabídne.
 */
export function mockMetoda(): PlatebniMetoda {
  const stavy = new Map<string, StavPlatby>();

  return {
    id: "mock",
    nazev: "Zkušební brána (jen ve vývoji)",
    schopnosti: {
      okamzitePotvrzeni: true,
      vratky: true,
      castecneVratky: true,
      preautorizace: false,
      applePay: false,
      googlePay: false,
      storno: true,
    },
    dostupna: () => process.env.NODE_ENV !== "production",

    async zalozPlatbu(vstup: VstupPlatby): Promise<ZalozenaPlatba> {
      const transakceId = `MOCK-${vstup.variabilniSymbol}`;
      stavy.set(transakceId, "pending");
      return {
        transakceId,
        presmerovani: `/dev/platebni-brana?t=${transakceId}&castka=${vstup.castkaHalere}&k=${vstup.kodRezervace}`,
        vyprsi: vstup.splatnost,
      };
    },

    async zjistiStav(transakceId: string): Promise<StavPlatby> {
      return stavy.get(transakceId) ?? "pending";
    },

    async vratPenize(transakceId: string) {
      stavy.set(transakceId, "refunded_full");
      return { ok: true, transakceId };
    },

    async stornuj(transakceId: string) {
      stavy.set(transakceId, "cancelled");
    },
  };
}
