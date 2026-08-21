"use client";

import { useEffect } from "react";

/**
 * Tlačítko „Uložit jako PDF".
 *
 * Doklad se negeneruje jako soubor — vytiskne ho prohlížeč. Je to o jednu
 * knihovnu a jeden vložený font méně, výsledek vypadá stejně a host si ho
 * uloží tam, kam je zvyklý. Tlačítko se při tisku samo skryje.
 */
export default function Tisk({ nazev }: { nazev: string }) {
  useEffect(() => {
    // Prohlížeč nabídne název souboru podle titulku stránky.
    document.title = nazev.replace(/\.pdf$/, "");
  }, [nazev]);

  return (
    <button type="button" className="tlacitko-tisk" onClick={() => window.print()}>
      Uložit jako PDF
    </button>
  );
}
