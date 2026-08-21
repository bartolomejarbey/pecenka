import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pripravDb } from "./pomocnici/db";

/**
 * Vyúčtování rozhodnuté škody.
 *
 * Rozhodnutí se dosud jen zapsalo — hláška slibovala „vyfakturuje se",
 * ale nebylo kudy. Testuje se rozdíl, na kterém záleží: náhrada škody je
 * mimo předmět daně a sazbu nést nesmí, služba navíc ji nést má.
 */

let db: Awaited<ReturnType<typeof nactiModuly>>;
let uklid: () => void;

async function nactiModuly() {
  const [vytvor, vystav, klient, drizzle] = await Promise.all([
    import("@/lib/reservations/vytvor"),
    import("@/lib/doklady/vystav"),
    import("@/lib/db/client"),
    import("drizzle-orm"),
  ]);
  return { ...vytvor, ...vystav, ...klient, sql: drizzle.sql };
}

const za = (dni: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + dni);
  return d;
};

async function rezervace(posun: number) {
  const v = await db.vytvorRezervaci({
    domek: "achat",
    prijezd: za(posun),
    odjezd: za(posun + 2),
    dospeli: 2,
    doplnky: {},
    host: { jmeno: "Karel Škoda", email: "karel.skoda@example.com" },
  });
  if (!v.ok) throw new Error(v.zprava);
  const [r] = await db.radky<{ id: string }>(
    db.sql`SELECT id::text AS id FROM reservations WHERE code = ${v.kod}`,
  );
  return r.id;
}

beforeAll(async () => {
  const p = await pripravDb();
  uklid = p.uklid;
  db = await nactiModuly();

  // Bez údajů firmy se doklad schválně nevystaví.
  await db.radky(db.sql`
    UPDATE company_settings
       SET legal_name = 'Bartoloměj Rota', ico = '27074358',
           address = '{"street":"Jílové 42","city":"Jílové u Držkova","zip":"46822","country":"CZ"}'::jsonb
     WHERE id = 1
  `);
}, 90_000);

afterAll(() => uklid?.());

describe("doúčtování po pobytu", () => {
  it("náhrada škody nenese sazbu a doklad se nejmenuje daňový", async () => {
    const id = await rezervace(60);
    const v = await db.vystavDouctovani(id, "Propálená díra v čalounění křesla.", 250000, false);
    expect(v.ok, v.ok ? "" : v.chyba).toBe(true);
    if (!v.ok) return;

    expect(v.doklad.cislo).toMatch(/^NDD-/);
    const radky = await db.radky<{ vat_rate: number | null; line_kind: string; total_cents: number }>(
      db.sql`SELECT vat_rate, line_kind, total_cents FROM invoice_lines
              WHERE invoice_id = ${v.doklad.id}::uuid`,
    );
    expect(radky).toHaveLength(1);
    expect(radky[0].vat_rate, "náhrada škody nesmí nést sazbu").toBeNull();
    expect(Number(radky[0].total_cents)).toBe(250000);
    expect(v.doklad.nazev.toLowerCase()).not.toContain("daňov");
  });

  it("služba navíc jde na fakturu", async () => {
    const id = await rezervace(70);
    const v = await db.vystavDouctovani(id, "Úklid nad rámec — vyčištění koberce.", 90000, true);
    expect(v.ok, v.ok ? "" : v.chyba).toBe(true);
    if (!v.ok) return;

    expect(v.doklad.cislo).toMatch(/^FAK-/);
    const [r] = await db.radky<{ line_kind: string; total_cents: number }>(
      db.sql`SELECT line_kind, total_cents FROM invoice_lines WHERE invoice_id = ${v.doklad.id}::uuid`,
    );
    expect(r.line_kind).toBe("TAXABLE");
    expect(Number(r.total_cents)).toBe(90000);
  });

  it("neplátce DPH sazbu neuvádí ani u služby", async () => {
    const id = await rezervace(80);
    const v = await db.vystavDouctovani(id, "Oprava zábradlí na patře.", 120000, true);
    if (!v.ok) throw new Error(v.chyba);
    const [r] = await db.radky<{ vat_rate: number | null }>(
      db.sql`SELECT vat_rate FROM invoice_lines WHERE invoice_id = ${v.doklad.id}::uuid`,
    );
    expect(r.vat_rate).toBeNull();
  });

  it("nulovou ani zápornou částku nevystaví", async () => {
    const id = await rezervace(90);
    expect((await db.vystavDouctovani(id, "Nic se nestalo.", 0, false)).ok).toBe(false);
    expect((await db.vystavDouctovani(id, "Nic se nestalo.", -100, true)).ok).toBe(false);
  });

  it("bez popisu to neprojde — na dokladu musí být důvod", async () => {
    const id = await rezervace(100);
    const v = await db.vystavDouctovani(id, "ok", 50000, false);
    expect(v.ok).toBe(false);
  });
});
