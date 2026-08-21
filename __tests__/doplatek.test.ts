import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pripravDb } from "./pomocnici/db";

/**
 * Předpis doplatku.
 *
 * Systém uměl jen zálohu — host ji zaplatil a o zbytek ho nikdo nepožádal.
 * Testuje se, že doplatek vznikne jen tehdy, kdy má, a že opakovaný běh
 * nevyrobí dvě výzvy na tutéž částku.
 */

let db: Awaited<ReturnType<typeof nactiModuly>>;
let uklid: () => void;

async function nactiModuly() {
  const [vytvor, doplatek, klient, drizzle] = await Promise.all([
    import("@/lib/reservations/vytvor"),
    import("@/lib/reservations/doplatek"),
    import("@/lib/db/client"),
    import("drizzle-orm"),
  ]);
  return { ...vytvor, ...doplatek, ...klient, sql: drizzle.sql };
}

const za = (dni: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + dni);
  return d;
};

const host = { jmeno: "Petr Doplatek", email: "petr.doplatek@example.com" };

/** Rezervace potvrzená se zaplacenou zálohou — na to čeká předpis doplatku. */
async function zaplacenaZaloha(prijezdZa: number) {
  const v = await db.vytvorRezervaci({
    domek: "achat",
    prijezd: za(prijezdZa),
    odjezd: za(prijezdZa + 2),
    dospeli: 2,
    doplnky: {},
    host,
  });
  if (!v.ok) throw new Error(v.zprava);

  await db.radky(db.sql`
    UPDATE payments SET status = 'paid', paid_at = now()
     WHERE reservation_id = (SELECT id FROM reservations WHERE code = ${v.kod})
       AND kind = 'deposit'
  `);
  await db.radky(db.sql`
    UPDATE reservations
       SET status = 'confirmed', paid_cents = deposit_required_cents
     WHERE code = ${v.kod}
  `);
  await db.radky(db.sql`
    UPDATE reservation_units SET status = 'confirmed'
     WHERE reservation_id = (SELECT id FROM reservations WHERE code = ${v.kod})
  `);
  return v;
}

beforeAll(async () => {
  const p = await pripravDb();
  uklid = p.uklid;
  db = await nactiModuly();
}, 90_000);

afterAll(() => uklid?.());

describe("předpis doplatku", () => {
  it("na blížící se pobyt doplatek předepíše", async () => {
    const v = await zaplacenaZaloha(4);
    const p = await db.predepisDoplatky();

    const muj = p.find((x) => x.kod === v.kod);
    expect(muj, "doplatek se nepředepsal").toBeTruthy();
    expect(muj!.castkaHalere).toBe(v.celkemHalere - v.zalohaHalere);
    expect(muj!.email).toBe(host.email);

    // Splatnost den před příjezdem — později by nemělo smysl ji posílat.
    const splatnost = new Date(muj!.splatnost);
    const prijezd = new Date(muj!.prijezd);
    expect(Math.round((prijezd.getTime() - splatnost.getTime()) / 86400000)).toBe(1);
  });

  it("na vzdálený pobyt ještě ne", async () => {
    const v = await zaplacenaZaloha(200);
    const p = await db.predepisDoplatky();
    expect(p.find((x) => x.kod === v.kod)).toBeFalsy();
  });

  it("dvojí běh nevyrobí dvě výzvy", async () => {
    const v = await zaplacenaZaloha(8);
    const prvni = await db.predepisDoplatky();
    expect(prvni.find((x) => x.kod === v.kod)).toBeTruthy();

    const druhy = await db.predepisDoplatky();
    expect(druhy.find((x) => x.kod === v.kod), "předepsal se podruhé").toBeFalsy();

    const [{ n }] = await db.radky<{ n: number }>(db.sql`
      SELECT count(*)::int AS n FROM payments
       WHERE kind = 'balance'
         AND reservation_id = (SELECT id FROM reservations WHERE code = ${v.kod})
    `);
    expect(n).toBe(1);
  });

  it("uhrazenému pobytu se nic nepředepisuje", async () => {
    const v = await zaplacenaZaloha(12);
    await db.radky(db.sql`
      UPDATE reservations SET paid_cents = total_cents WHERE code = ${v.kod}
    `);
    const p = await db.predepisDoplatky();
    expect(p.find((x) => x.kod === v.kod)).toBeFalsy();
  });
});
