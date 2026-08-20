import "server-only";

import { sql } from "drizzle-orm";
import { radkyT, type Spousteni } from "@/lib/db/client";
import { RADA, type TypDokladu } from "./typy";

/**
 * Přidělení čísla dokladu.
 *
 * Číslo se přiděluje **až při vystavení**, ne při založení konceptu — koncept
 * se dá zahodit a číselná řada musí zůstat nepřerušená. `UPDATE … RETURNING`
 * je atomický, takže dvě souběžná vystavení nedostanou stejné číslo.
 *
 * Tvar: `FAK-2026-0042`.
 */
export async function dalsiCislo(
  tx: Spousteni,
  typ: TypDokladu,
  rok: number,
): Promise<{ cislo: string; rada: string; poradi: number }> {
  const rada = RADA[typ];
  const [radek] = await radkyT<{ last_number: number; format_mask: string }>(
    tx,
    sql`INSERT INTO invoice_series (code, year, last_number) VALUES (${rada}, ${rok}, 1)
        ON CONFLICT (code, year) DO UPDATE SET last_number = invoice_series.last_number + 1
        RETURNING last_number, format_mask`,
  );
  const poradi = radek.last_number;
  const cislo = (radek.format_mask ?? "{code}-{year}-{seq:04}")
    .replace("{code}", rada)
    .replace("{year}", String(rok))
    .replace(/\{seq:0(\d)\}/, (_, m) => String(poradi).padStart(Number(m), "0"));
  return { cislo, rada, poradi };
}
