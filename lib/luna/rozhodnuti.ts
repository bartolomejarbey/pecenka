"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { zapisDoDeniku } from "@/lib/auth/audit";
import { vyzadujMajitele } from "@/lib/auth/dal";

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

  const cisty = duvod.trim();
  if (cisty.length < 20) {
    return {
      ok: false,
      chyba: "Napiš prosím vlastními slovy, proč to považuješ za škodu — aspoň 20 znaků. Bez toho to nejde uložit.",
    };
  }
  if (castkaKc < 0) return { ok: false, chyba: "Částka nemůže být záporná." };

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

/** Uzavření inspekce, když není co řešit. */
export async function uzavriInspekci(inspekceId: string): Promise<Vysledek> {
  const kdo = await vyzadujMajitele();
  await radky(sql`
    UPDATE inspections SET status = 'closed', closed_at = now() WHERE id = ${inspekceId}::uuid
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
