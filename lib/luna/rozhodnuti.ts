"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { zapisDoDeniku } from "@/lib/auth/audit";
import { vyzadujMajitele } from "@/lib/auth/dal";
import { zkontrolujRozhodnuti } from "./kontrola";

/**
 * Rozhodnutí o škodě.
 *
 * Tohle je jediné místo, kde se z nálezu Luny může stát nárok — a schválně
 * to není jedno tlačítko „souhlasím s AI". Majitel musí odůvodnění **napsat
 * sám**, minimálně dvaceti znaky, a databáze to vynucuje omezením
 * `length(btrim(reason_cs)) >= 20` spolu s `decided_by NOT NULL`.
 *
 * Není to formalita: podle čl. 22 GDPR se u rozhodnutí s právním účinkem
 * zkoumá, jestli byl lidský zásah skutečný. Odkliknutí návrhu stroje se za
 * lidský zásah nepovažuje.
 */

export type Vysledek = { ok: true; zprava: string } | { ok: false; chyba: string };

export async function rozhodniOSkode(
  pripadId: string,
  castkaKc: number,
  duvod: string,
  jeSluzba: boolean,
): Promise<Vysledek> {
  const kdo = await vyzadujMajitele();

  const kontrola = zkontrolujRozhodnuti(castkaKc, duvod);
  if (!kontrola.ok) return { ok: false, chyba: kontrola.chyba };
  const cisty = kontrola.duvod;

  const [pripad] = await radky<{ id: string; reservation_id: string; zone_key: string }>(
    sql`SELECT id::text AS id, reservation_id::text AS reservation_id, zone_key
          FROM damage_cases WHERE id = ${pripadId}::uuid AND state = 'pending'`,
  );
  if (!pripad) return { ok: false, chyba: "Případ nenalezen nebo už je uzavřený." };

  try {
    await radky(sql`
      INSERT INTO damage_decisions (damage_case_id, reservation_id, decided_by, amount_cents,
                                    reason_cs, is_service_not_damage)
      VALUES (${pripadId}::uuid, ${pripad.reservation_id}::uuid, ${kdo.id}::uuid,
              ${Math.round(castkaKc * 100)}, ${cisty}, ${jeSluzba})
    `);
    await radky(sql`
      UPDATE damage_cases SET state = ${castkaKc > 0 ? "decided" : "dismissed"}
       WHERE id = ${pripadId}::uuid
    `);
  } catch (e) {
    console.error("[luna] rozhodnutí selhalo:", e);
    return { ok: false, chyba: "Rozhodnutí se nepodařilo uložit." };
  }

  await zapisZpetnouVazbu(pripadId, castkaKc > 0 ? "true_positive" : "false_positive", cisty);

  await zapisDoDeniku({
    akce: castkaKc > 0 ? "skoda.rozhodnuta" : "skoda.zamitnuta",
    typEntity: "damage_case",
    idEntity: pripadId,
    kdo: kdo.id,
    zmena: { zona: pripad.zone_key, castkaKc, jeSluzba, duvod: cisty },
  });

  revalidatePath("/admin", "layout");
  return {
    ok: true,
    zprava:
      castkaKc > 0
        ? `Zapsáno. ${jeSluzba ? "Vyfakturuje se jako služba s DPH." : "Vyúčtuje se jako náhrada škody bez DPH."} Hostovi se to zatím neposlalo.`
        : "Zapsáno jako bez nároku. Hostovi se nic neúčtuje.",
  };
}

/**
 * Zpětná vazba od člověka k nálezu modelu.
 *
 * Tabulka `luna_feedback` existovala od začátku a nikdo do ní nikdy nezapsal.
 * Přitom „bez nároku" u nálezu `damage_major` je učebnicový falešný poplach —
 * a bez záznamu se nedá poznat, jestli se systém po změně promptu zlepšil,
 * nebo zhoršil. Je to jediná měřitelná pravda, kterou o vlastní přesnosti máme;
 * deset vygenerovaných dvojic v testovací sadě ji nenahradí.
 *
 * Selhání se jen zaloguje — kalibrační poznámka nesmí shodit rozhodnutí,
 * na kterém stojí peníze.
 */
async function zapisZpetnouVazbu(
  pripadId: string,
  hodnoceni: "true_positive" | "false_positive",
  poznamka: string,
): Promise<void> {
  try {
    await radky(sql`
      INSERT INTO luna_feedback (finding_id, human_label, note)
      SELECT lf.id, ${hodnoceni}, ${poznamka.slice(0, 500)}
        FROM damage_cases dc
        JOIN luna_runs lr ON lr.inspection_id = dc.inspection_id AND lr.zone_key = dc.zone_key
        JOIN luna_findings lf ON lf.luna_run_id = lr.id
       WHERE dc.id = ${pripadId}::uuid AND lr.mode = 'primary'
       ORDER BY lr.created_at DESC LIMIT 1
    `);
  } catch (e) {
    console.error("[luna] zpětnou vazbu se nepodařilo zapsat:", e);
  }
}

/** Uzavření inspekce, když není co řešit. */
export async function uzavriInspekci(inspekceId: string): Promise<Vysledek> {
  const kdo = await vyzadujMajitele();
  await radky(sql`
    UPDATE inspections SET status = 'closed', closed_at = now() WHERE id = ${inspekceId}::uuid
  `);
  // Případy, které zůstaly viset, byly plané poplachy. Zapíšeme to dřív,
  // než je zavřeme — potom už není podle čeho je najít.
  const nevyrizene = await radky<{ id: string }>(sql`
    SELECT id::text AS id FROM damage_cases
     WHERE inspection_id = ${inspekceId}::uuid AND state = 'pending'
  `);
  for (const p of nevyrizene) {
    await zapisZpetnouVazbu(p.id, "false_positive", "Protokol uzavřen bez nároku.");
  }
  await radky(sql`
    UPDATE damage_cases SET state = 'dismissed'
     WHERE inspection_id = ${inspekceId}::uuid AND state = 'pending'
  `);
  await radky(sql`
    UPDATE tasks SET resolved_at = now(), resolved_by = ${kdo.id},
                     resolution_note = 'Protokol uzavřen bez nároku.'
     WHERE inspection_id = ${inspekceId}::uuid AND resolved_at IS NULL
  `);
  await zapisDoDeniku({
    akce: "inspekce.uzavrena", typEntity: "inspection", idEntity: inspekceId, kdo: kdo.id,
  });
  revalidatePath("/admin", "layout");
  return { ok: true, zprava: "Protokol uzavřen." };
}

/** Ruční spuštění vyhodnocení — po doplnění baseline nebo při opakování. */
export async function spustVyhodnoceni(inspekceId: string): Promise<Vysledek> {
  await vyzadujMajitele();
  try {
    const { vyhodnotInspekci } = await import("./run");
    const v = await vyhodnotInspekci(inspekceId);
    revalidatePath("/admin", "layout");
    return { ok: true, zprava: `Hotovo — ${v.stav === "auto_clear" ? "bez nálezu" : "něco k posouzení"}, ${v.volani} volání modelu.` };
  } catch (e) {
    console.error("[luna] ruční vyhodnocení selhalo:", e);
    return { ok: false, chyba: "Vyhodnocení se nepovedlo. Zkontroluj, jestli je nastavený klíč k modelu." };
  }
}

/**
 * Vyúčtování rozhodnuté škody hostovi.
 *
 * Rozhodnutí se dosud jen zapsalo. Hláška slibovala „vyfakturuje se jako
 * služba" nebo „vyúčtuje se jako náhrada škody", ale nebylo kudy — provozovatel
 * měl v systému rozhodnutí a nic, co by z něj udělalo doklad.
 *
 * Doklad se vystaví z toho, co provozovatel napsal vlastními slovy. Ten text
 * jde hostovi na doklad jako důvod, takže se nedá účtovat nic, co by se
 * nedalo obhájit.
 */
export async function vyuctujSkodu(pripadId: string): Promise<Vysledek> {
  const kdo = await vyzadujMajitele();

  const [r] = await radky<{
    reservation_id: string;
    castka: string | number;
    duvod: string;
    sluzba: boolean;
    zona: string;
    stav: string;
    uz_vyuctovano: boolean;
  }>(sql`
    SELECT d.reservation_id::text AS reservation_id, d.amount_cents AS castka,
           d.reason_cs AS duvod, d.is_service_not_damage AS sluzba,
           c.zone_key AS zona, c.state AS stav,
           EXISTS (SELECT 1 FROM invoices i
                    WHERE i.reservation_id = d.reservation_id
                      AND i.status <> 'DRAFT'
                      AND i.doc_type IN ('NON_TAX','FINAL')
                      AND i.created_at > d.decided_at) AS uz_vyuctovano
      FROM damage_decisions d
      JOIN damage_cases c ON c.id = d.damage_case_id
     WHERE d.damage_case_id = ${pripadId}::uuid
     ORDER BY d.decided_at DESC LIMIT 1
  `);

  if (!r) return { ok: false, chyba: "Rozhodnutí nenalezeno." };
  if (r.stav !== "decided") return { ok: false, chyba: "Tenhle nález se neúčtuje." };
  // `uz_vyuctovano` se počítalo a nikde nepoužilo: dvojklik nebo dvě otevřené
  // záložky znamenaly dvě faktury hostovi za jednu prasklou tabuli.
  if (r.uz_vyuctovano) {
    return {
      ok: false,
      chyba: "Tahle škoda už je vyúčtovaná. Doklad najdeš v dokladech rezervace.",
    };
  }

  const castka = Number(r.castka);
  if (castka <= 0) return { ok: false, chyba: "Rozhodnutá částka je nulová." };

  const { vystavDouctovani } = await import("@/lib/doklady/vystav");
  const v = await vystavDouctovani(r.reservation_id, r.duvod, castka, r.sluzba);
  if (!v.ok) return { ok: false, chyba: v.chyba };

  await zapisDoDeniku({
    akce: "skoda.vyuctovana",
    typEntity: "invoice",
    idEntity: v.doklad.id,
    kdo: kdo.id,
    zmena: { pripadId, zona: r.zona, castkaHalere: castka, jeSluzba: r.sluzba, doklad: v.doklad.cislo },
  });

  revalidatePath("/admin", "layout");
  return { ok: true, zprava: `Vystaveno ${v.doklad.cislo}. Otevřít ho můžeš v dokladech rezervace.` };
}
