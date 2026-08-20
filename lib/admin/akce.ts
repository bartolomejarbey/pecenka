"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { radky, radkyT, transakce, jePrekryvTerminu, type Spousteni } from "@/lib/db/client";
import { zapisDoDeniku } from "@/lib/auth/audit";
import { vyzadujMajitele, vyzadujPrihlaseni } from "@/lib/auth/dal";

/**
 * Akce administrace.
 *
 * Zásady, které platí všude:
 *  · **Nic se nemaže.** Rezervace se stornuje, doklad se opravuje dobropisem.
 *  · Každá změna jde do auditního deníku — u agendy, kde se strhávají peníze
 *    z kauce, musí jít dohledat, kdo co kdy udělal.
 *  · Stav plateb se nikdy nenastavuje ručně, vždy se přepočítá z `payments`.
 */

export type Vysledek = { ok: true; zprava?: string } | { ok: false; chyba: string };

/** Přepočet stavu plateb z toho, co reálně dorazilo. */
async function prepocitejPlatby(tx: Spousteni, rezervaceId: string): Promise<void> {
  await tx.execute(sql`
    WITH souhrn AS (
      SELECT coalesce(sum(amount_cents) FILTER (WHERE direction = 'IN' AND status IN ('paid','overpaid')), 0)
           - coalesce(sum(amount_cents) FILTER (WHERE direction = 'OUT' AND status IN ('paid','refunded_full')), 0)
             AS zaplaceno
        FROM payments WHERE reservation_id = ${rezervaceId}::uuid
    )
    UPDATE reservations r
       SET paid_cents = souhrn.zaplaceno,
           payment_state = CASE
             WHEN souhrn.zaplaceno <= 0 THEN 'unpaid'
             WHEN souhrn.zaplaceno > r.total_cents THEN 'overpaid'
             WHEN souhrn.zaplaceno >= r.total_cents THEN 'paid'
             WHEN souhrn.zaplaceno >= r.deposit_required_cents THEN 'deposit_paid'
             ELSE 'unpaid'
           END::payment_state,
           updated_at = now()
      FROM souhrn
     WHERE r.id = ${rezervaceId}::uuid
  `);
}

async function najdi(tx: Spousteni, kod: string) {
  const [r] = await radkyT<{ id: string; status: string }>(
    tx,
    sql`SELECT id::text AS id, status::text AS status FROM reservations WHERE code = ${kod}`,
  );
  return r ?? null;
}

/* ===== Potvrzení rezervace ===== */

export async function potvrdRezervaci(kod: string): Promise<Vysledek> {
  const kdo = await vyzadujMajitele();
  try {
    const vysledek = await transakce(async (tx) => {
      const r = await najdi(tx, kod);
      if (!r) return { ok: false as const, chyba: "Rezervace nenalezena." };
      if (!["inquiry", "hold", "confirmed"].includes(r.status)) {
        return { ok: false as const, chyba: `Rezervaci ve stavu „${r.status}" nelze potvrdit.` };
      }

      // Poptávka termín neblokovala — blokaci zakládáme teprve teď.
      const [maBlokaci] = await radkyT<{ n: number }>(
        tx,
        sql`SELECT count(*)::int AS n FROM reservation_units WHERE reservation_id = ${r.id}::uuid`,
      );
      if (!maBlokaci || maBlokaci.n === 0) {
        await tx.execute(sql`
          INSERT INTO reservation_units (reservation_id, unit_id, checkin, checkout, status)
          SELECT r.id, coalesce(uc.member_unit_id, r.unit_id), r.checkin, r.checkout, 'confirmed'::reservation_status
            FROM reservations r
            LEFT JOIN unit_components uc ON uc.composite_unit_id = r.unit_id
           WHERE r.id = ${r.id}::uuid
        `);
      } else {
        await tx.execute(sql`
          UPDATE reservation_units SET status = 'confirmed'::reservation_status
           WHERE reservation_id = ${r.id}::uuid
        `);
      }

      await tx.execute(sql`
        UPDATE reservations
           SET status = 'confirmed'::reservation_status, hold_expires_at = NULL, updated_at = now()
         WHERE id = ${r.id}::uuid
      `);
      await tx.execute(sql`
        UPDATE tasks SET resolved_at = now(), resolved_by = ${kdo.id},
                         resolution_note = 'Potvrzeno v administraci.'
         WHERE reservation_id = ${r.id}::uuid AND kind IN ('manual_confirm','new_hold')
           AND resolved_at IS NULL
      `);
      return { ok: true as const, id: r.id };
    });

    if (!vysledek.ok) return vysledek;
    await zapisDoDeniku({
      akce: "rezervace.potvrzena",
      typEntity: "reservation",
      idEntity: vysledek.id,
      kdo: kdo.id,
      zmena: { kod },
    });
    revalidatePath("/admin", "layout");
    return { ok: true, zprava: "Rezervace potvrzena." };
  } catch (e) {
    if (jePrekryvTerminu(e)) {
      return { ok: false, chyba: "Termín mezitím obsadila jiná rezervace. Zkontroluj kalendář." };
    }
    console.error("[admin] potvrzení selhalo:", e);
    return { ok: false, chyba: "Potvrzení se nepovedlo." };
  }
}

/* ===== Označení platby ===== */

export async function oznacZaplaceno(platbaId: string): Promise<Vysledek> {
  const kdo = await vyzadujMajitele();
  try {
    const id = await transakce(async (tx) => {
      const [p] = await radkyT<{ reservation_id: string; status: string }>(
        tx,
        sql`SELECT reservation_id::text AS reservation_id, status FROM payments WHERE id = ${platbaId}::uuid`,
      );
      if (!p) return null;
      if (p.status !== "paid") {
        await tx.execute(sql`
          UPDATE payments SET status = 'paid', paid_at = now(), matched_by = 'MANUAL'
           WHERE id = ${platbaId}::uuid
        `);
      }
      await prepocitejPlatby(tx, p.reservation_id);

      // Zaplacená záloha potvrzuje rezervaci, která se do té doby jen držela.
      await tx.execute(sql`
        UPDATE reservation_units SET status = 'confirmed'::reservation_status
         WHERE reservation_id = ${p.reservation_id}::uuid
           AND status = 'hold'::reservation_status
      `);
      await tx.execute(sql`
        UPDATE reservations
           SET status = 'confirmed'::reservation_status, hold_expires_at = NULL, updated_at = now()
         WHERE id = ${p.reservation_id}::uuid AND status = 'hold'::reservation_status
      `);
      return p.reservation_id;
    });

    if (!id) return { ok: false, chyba: "Platba nenalezena." };
    await zapisDoDeniku({
      akce: "platba.oznacena_zaplacena",
      typEntity: "reservation",
      idEntity: id,
      kdo: kdo.id,
      zmena: { platbaId },
    });
    revalidatePath("/admin", "layout");
    return { ok: true, zprava: "Platba zapsána." };
  } catch (e) {
    console.error("[admin] označení platby selhalo:", e);
    return { ok: false, chyba: "Platbu se nepodařilo zapsat." };
  }
}

/* ===== Storno ===== */

export async function zrusRezervaci(kod: string, duvod: string): Promise<Vysledek> {
  const kdo = await vyzadujMajitele();
  if (duvod.trim().length < 5) {
    return { ok: false, chyba: "Napiš prosím důvod storna — bude na dokladu i v historii." };
  }
  try {
    const id = await transakce(async (tx) => {
      const r = await najdi(tx, kod);
      if (!r) return null;
      // Uvolnění termínu je to podstatné: bez změny reservation_units by
      // databázové omezení drželo termín zabraný napořád.
      await tx.execute(sql`
        UPDATE reservation_units SET status = 'cancelled'::reservation_status
         WHERE reservation_id = ${r.id}::uuid
      `);
      await tx.execute(sql`
        UPDATE reservations
           SET status = 'cancelled'::reservation_status, cancelled_at = now(),
               cancel_reason = ${duvod.trim()}, hold_expires_at = NULL, updated_at = now()
         WHERE id = ${r.id}::uuid
      `);
      await tx.execute(sql`
        UPDATE payments SET status = 'cancelled'
         WHERE reservation_id = ${r.id}::uuid AND status IN ('created','pending')
      `);
      await tx.execute(sql`
        UPDATE tasks SET resolved_at = now(), resolved_by = ${kdo.id},
                         resolution_note = 'Rezervace stornována.'
         WHERE reservation_id = ${r.id}::uuid AND resolved_at IS NULL
      `);
      return r.id;
    });

    if (!id) return { ok: false, chyba: "Rezervace nenalezena." };
    await zapisDoDeniku({
      akce: "rezervace.stornovana",
      typEntity: "reservation",
      idEntity: id,
      kdo: kdo.id,
      zmena: { kod, duvod },
    });
    revalidatePath("/admin", "layout");
    return { ok: true, zprava: "Rezervace stornována, termín uvolněn." };
  } catch (e) {
    console.error("[admin] storno selhalo:", e);
    return { ok: false, chyba: "Storno se nepovedlo." };
  }
}

/* ===== Příjezd a odjezd ===== */

export async function zmenStav(
  kod: string,
  novy: "checked_in" | "checked_out" | "no_show",
): Promise<Vysledek> {
  const kdo = await vyzadujPrihlaseni();
  try {
    const id = await transakce(async (tx) => {
      const r = await najdi(tx, kod);
      if (!r) return null;
      await tx.execute(sql`
        UPDATE reservations SET status = ${novy}::reservation_status, updated_at = now()
         WHERE id = ${r.id}::uuid
      `);
      if (novy === "checked_in") {
        await tx.execute(sql`
          UPDATE reservation_units SET status = 'checked_in'::reservation_status
           WHERE reservation_id = ${r.id}::uuid
        `);
      }
      return r.id;
    });
    if (!id) return { ok: false, chyba: "Rezervace nenalezena." };
    await zapisDoDeniku({
      akce: `rezervace.${novy}`,
      typEntity: "reservation",
      idEntity: id,
      kdo: kdo.id,
      zmena: { kod },
    });
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    console.error("[admin] změna stavu selhala:", e);
    return { ok: false, chyba: "Změna se nepovedla." };
  }
}

/* ===== Interní poznámka ===== */

export async function ulozPoznamku(kod: string, text: string): Promise<Vysledek> {
  const kdo = await vyzadujPrihlaseni();
  const [r] = await radky<{ id: string }>(
    sql`SELECT id::text AS id FROM reservations WHERE code = ${kod}`,
  );
  if (!r) return { ok: false, chyba: "Rezervace nenalezena." };

  await radky(sql`
    UPDATE reservations SET note_internal = ${text.trim() || null}, updated_at = now()
     WHERE id = ${r.id}::uuid
  `);
  await zapisDoDeniku({
    akce: "rezervace.poznamka",
    typEntity: "reservation",
    idEntity: r.id,
    kdo: kdo.id,
  });
  revalidatePath(`/admin/rezervace/${kod}`);
  return { ok: true, zprava: "Poznámka uložena." };
}
