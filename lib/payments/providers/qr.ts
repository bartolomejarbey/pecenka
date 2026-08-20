import "server-only";

import { sestavSpayd, zpravaProPrijemce } from "../spayd";
import type { BankovniSpojeni } from "../nastaveni";
import type { PlatebniMetoda, StavPlatby, VstupPlatby, ZalozenaPlatba } from "../types";

/**
 * Platba převodem s QR kódem.
 *
 * Vždycky dostupná, nic nestojí a nepotřebuje žádnou smlouvu. Nevýhoda je
 * zpoždění: platba se objeví až na bankovním výpisu, takže potvrzení není
 * okamžité. Proto se termín drží 72 hodin — to je čas na převod i přes víkend.
 */
export function qrMetoda(spojeni: BankovniSpojeni): PlatebniMetoda {
  return {
    id: "qr",
    nazev: "Převodem (QR platba)",
    schopnosti: {
      okamzitePotvrzeni: false,
      vratky: true, // ručně z banky
      castecneVratky: true,
      preautorizace: false,
      applePay: false,
      googlePay: false,
      storno: true,
    },
    dostupna: () => Boolean(spojeni.iban),

    async zalozPlatbu(vstup: VstupPlatby): Promise<ZalozenaPlatba> {
      const spayd = sestavSpayd({
        iban: spojeni.iban,
        bic: spojeni.bic || undefined,
        castkaHalere: vstup.castkaHalere,
        prijemce: spojeni.prijemce,
        splatnost: vstup.splatnost,
        vs: vstup.variabilniSymbol,
        ss: vstup.specifickySymbol,
        zprava: zpravaProPrijemce(vstup.variabilniSymbol, vstup.ucel),
      });
      return { spayd, vyprsi: vstup.splatnost };
    },

    /**
     * U převodu se stav nezjišťuje dotazem — přichází z bankovního výpisu
     * (párování podle VS). Tahle metoda jen říká „pořád čekáme".
     */
    async zjistiStav(): Promise<StavPlatby> {
      return "pending";
    },
  };
}
