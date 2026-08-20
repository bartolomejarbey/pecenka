import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pripravDb } from "./pomocnici/db";

/**
 * Fakturační modul nad skutečným Postgresem.
 *
 * Testuje se to, co udělá vadný účetní doklad: sazba DPH tam, kde být nesmí,
 * přerušená číselná řada, opravný doklad bez vazby na původní, kladné částky
 * na dobropisu.
 */

let m: Awaited<ReturnType<typeof nactiModuly>>;
let uklid: () => void;
let rezervaceId: string;
let kod: string;

async function nactiModuly() {
  const [vystav, rez, klient, drizzle] = await Promise.all([
    import("@/lib/doklady/vystav"),
    import("@/lib/reservations/vytvor"),
    import("@/lib/db/client"),
    import("drizzle-orm"),
  ]);
  return { ...vystav, ...rez, ...klient, sql: drizzle.sql };
}

const za = (dni: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + dni);
  return d;
};

beforeAll(async () => {
  const p = await pripravDb();
  uklid = p.uklid;
  m = await nactiModuly();

  // Firma bez vyplněných údajů — doklad nesmí projít.
  const v = await m.vytvorRezervaci({
    domek: "achat",
    prijezd: za(30),
    odjezd: za(33),
    dospeli: 2,
    doplnky: { snidane: 1, vino: 2 },
    host: { jmeno: "Eva Dvořáková", email: "eva@example.com", telefon: "+420602111222" },
  });
  if (!v.ok) throw new Error("rezervace se nezaložila: " + v.zprava);
  kod = v.kod;
  const [r] = await m.radky<{ id: string }>(
    m.sql`SELECT id::text AS id FROM reservations WHERE code = ${kod}`,
  );
  rezervaceId = r.id;
}, 120_000);

afterAll(() => uklid?.());

describe("ochrana proti vadnému dokladu", () => {
  it("bez vyplněných údajů firmy se doklad nevystaví", async () => {
    const v = await m.vystavZalohovou(rezervaceId);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.chyba).toMatch(/IČO|náležitost/i);
  });
});

describe("vystavování dokladů", () => {
  beforeAll(async () => {
    await m.radky(m.sql`
      UPDATE company_settings
         SET legal_name = 'Jan Lesník', ico = '12345678',
             address = '{"street":"Jílové 1","city":"Jílové u Držkova","zip":"468 22","country":"CZ"}'::jsonb,
             bank_iban = 'CZ6508000000192000145399', bank_display = '192000145399/0800'
       WHERE id = 1`);
  });

  it("zálohová faktura má vlastní řadu a splatnost", async () => {
    const v = await m.vystavZalohovou(rezervaceId);
    expect(v.ok, JSON.stringify(v)).toBe(true);
    if (!v.ok) return;
    expect(v.doklad.cislo).toMatch(/^ZAL-\d{4}-\d{4}$/);
    expect(v.doklad.typ).toBe("PROFORMA");
    expect(v.doklad.celkem).toBeGreaterThan(0);
    expect(v.doklad.splatnost).not.toBeNull();
  });

  it("neplátce DPH nemá nikde sazbu ani slovo „daňový“", async () => {
    const v = await m.vystavKonecnou(rezervaceId);
    expect(v.ok, JSON.stringify(v)).toBe(true);
    if (!v.ok) return;

    expect(v.doklad.plátceDph).toBe(false);
    expect(v.doklad.nazev).toBe("Faktura");
    expect(v.doklad.nazev.toLowerCase()).not.toContain("daňov");
    for (const r of v.doklad.radky) expect(r.sazbaDph).toBeNull();
    expect(v.doklad.danCelkem).toBe(0);
    expect(v.doklad.zakladCelkem).toBe(v.doklad.celkem);

    const sazby = await m.radky<{ vat_rate: number | null }>(
      m.sql`SELECT vat_rate FROM invoice_lines il JOIN invoices i ON i.id = il.invoice_id
             WHERE i.number = ${v.doklad.cislo}`,
    );
    expect(sazby.every((s) => s.vat_rate === null)).toBe(true);
  });

  it("noci se slučují do jednoho řádku za domek", async () => {
    const [posledni] = await m.radky<{ number: string }>(
      m.sql`SELECT number FROM invoices WHERE doc_type = 'FINAL' ORDER BY created_at DESC LIMIT 1`,
    );
    const radky = await m.radky<{ description: string; quantity: string | number; unit: string }>(
      m.sql`SELECT description, quantity, unit FROM invoice_lines il
              JOIN invoices i ON i.id = il.invoice_id
             WHERE i.number = ${posledni.number} AND il.price_item_code = 'NIGHT'`,
    );
    expect(radky).toHaveLength(1);
    expect(Number(radky[0].quantity)).toBe(3);
    expect(radky[0].unit).toBe("noc");
  });

  it("konečná faktura odečte uhrazené zálohy", async () => {
    // označíme zálohu jako zaplacenou
    await m.radky(m.sql`
      UPDATE payments SET status = 'paid', paid_at = now()
       WHERE reservation_id = ${rezervaceId}::uuid AND kind = 'deposit'`);

    const v = await m.vystavKonecnou(rezervaceId);
    expect(v.ok, JSON.stringify(v)).toBe(true);
    if (!v.ok) return;
    expect(v.doklad.odectenoZaloh).toBeGreaterThan(0);
    expect(v.doklad.kUhrade).toBe(v.doklad.celkem - v.doklad.odectenoZaloh);
  });

  it("číselné řady jsou nepřerušené a vzestupné", async () => {
    const faktury = await m.radky<{ number: string }>(
      m.sql`SELECT number FROM invoices WHERE series_code = 'FAK' ORDER BY number`,
    );
    const poradi = faktury.map((f) => Number(f.number.split("-")[2]));
    expect(poradi).toEqual(poradi.map((_, i) => i + 1));
  });
});

describe("opravné doklady", () => {
  it("zálohová faktura se neopravuje — není to doklad", async () => {
    const [zal] = await m.radky<{ id: string }>(
      m.sql`SELECT id::text AS id FROM invoices WHERE doc_type = 'PROFORMA' LIMIT 1`,
    );
    const v = await m.vystavOpravny(zal.id, "zkouška opravy zálohové faktury");
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.chyba).toMatch(/zálohová|není doklad/i);
  });

  it("bez důvodu opravy to neprojde — je to povinná náležitost", async () => {
    const [fak] = await m.radky<{ id: string }>(
      m.sql`SELECT id::text AS id FROM invoices WHERE doc_type = 'FINAL' LIMIT 1`,
    );
    const v = await m.vystavOpravny(fak.id, "x");
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.chyba).toMatch(/důvod/i);
  });

  it("dobropis má záporné částky, vlastní řadu a odkaz na původní doklad", async () => {
    const [fak] = await m.radky<{ id: string; number: string; total_with_vat_cents: string | number }>(
      m.sql`SELECT id::text AS id, number, total_with_vat_cents FROM invoices
             WHERE doc_type = 'FINAL' ORDER BY created_at DESC LIMIT 1`,
    );
    const v = await m.vystavOpravny(fak.id, "Host stornoval pobyt tři týdny předem.");
    expect(v.ok, JSON.stringify(v)).toBe(true);
    if (!v.ok) return;

    expect(v.doklad.cislo).toMatch(/^OPD-\d{4}-\d{4}$/);
    expect(v.doklad.celkem).toBe(-Number(fak.total_with_vat_cents));
    expect(v.doklad.radky.every((r) => r.celkemHalere <= 0)).toBe(true);
    // Evidenční číslo původního dokladu musí být na opravném dokladu uvedené.
    expect(v.doklad.duvodOpravy).toContain(fak.number);

    const [vazba] = await m.radky<{ relation_type: string }>(
      m.sql`SELECT relation_type FROM invoice_relations
             WHERE parent_invoice_id = ${fak.id}::uuid`,
    );
    expect(vazba.relation_type).toBe("CORRECTS");

    const [puvodni] = await m.radky<{ status: string }>(
      m.sql`SELECT status FROM invoices WHERE id = ${fak.id}::uuid`,
    );
    expect(puvodni.status).toBe("CORRECTED");
  });

  it("částečný dobropis nesmí přesáhnout původní částku", async () => {
    const [fak] = await m.radky<{ id: string; total_with_vat_cents: string | number }>(
      m.sql`SELECT id::text AS id, total_with_vat_cents FROM invoices
             WHERE doc_type = 'FINAL' AND status <> 'CORRECTED' ORDER BY created_at DESC LIMIT 1`,
    );
    if (!fak) return;
    const moc = await m.vystavOpravny(fak.id, "Pokus o přepálený dobropis", Number(fak.total_with_vat_cents) + 1);
    expect(moc.ok).toBe(false);
    const nula = await m.vystavOpravny(fak.id, "Pokus o nulový dobropis", 0);
    expect(nula.ok).toBe(false);
  });
});

describe("nedaňový doklad", () => {
  it("stornovací poplatek nenese sazbu DPH", async () => {
    const v = await m.vystavNedanovy(rezervaceId, "Stornovací poplatek dle obchodních podmínek", 289000);
    expect(v.ok, JSON.stringify(v)).toBe(true);
    if (!v.ok) return;
    expect(v.doklad.cislo).toMatch(/^NDD-\d{4}-\d{4}$/);
    expect(v.doklad.radky[0].sazbaDph).toBeNull();
    expect(v.doklad.danCelkem).toBe(0);
    expect(v.doklad.nazev.toLowerCase()).not.toContain("daňov");
  });

  it("databáze sama odmítne sazbu na nezdanitelném řádku", async () => {
    const [d] = await m.radky<{ id: string }>(
      m.sql`SELECT id::text AS id FROM invoices WHERE doc_type = 'NON_TAX' LIMIT 1`,
    );
    await expect(
      m.radky(m.sql`
        INSERT INTO invoice_lines (invoice_id, seq, line_kind, description, quantity, unit,
                                   unit_price_with_vat_cents, vat_rate, base_cents, vat_cents, total_cents)
        VALUES (${d.id}::uuid, 99, 'SECURITY_DEPOSIT', 'Kauce se sazbou', 1, 'ks', 100, 21, 83, 17, 100)`),
    ).rejects.toThrow();
  });
});

describe("režim plátce DPH", () => {
  it("po zapnutí plátcovství se sazby objeví a základ + daň dá celkem", async () => {
    await m.radky(m.sql`UPDATE company_settings SET vat_payer = true, dic = 'CZ12345678' WHERE id = 1`);

    const v2 = await m.vytvorRezervaci({
      domek: "mech",
      prijezd: za(60),
      odjezd: za(63),
      dospeli: 2,
      doplnky: { vino: 1, snidane: 1 },
      host: { jmeno: "Martin Svoboda", email: "martin@example.com" },
    });
    expect(v2.ok, JSON.stringify(v2)).toBe(true);
    if (!v2.ok) return;
    const [r2] = await m.radky<{ id: string }>(
      m.sql`SELECT id::text AS id FROM reservations WHERE code = ${v2.kod}`,
    );

    const v = await m.vystavKonecnou(r2.id);
    expect(v.ok, JSON.stringify(v)).toBe(true);
    if (!v.ok) return;

    expect(v.doklad.plátceDph).toBe(true);
    expect(v.doklad.nazev).toContain("daňový");
    expect(v.doklad.danCelkem).toBeGreaterThan(0);
    // Ceník je koncový: základ + daň musí dát přesně to, co host vidí.
    expect(v.doklad.zakladCelkem + v.doklad.danCelkem).toBe(v.doklad.celkem);

    const ubytovani = v.doklad.radky.find((r) => r.kodPolozky === "NIGHT");
    const vino = v.doklad.radky.find((r) => r.kodPolozky === "ADDON_WINE");
    expect(ubytovani?.sazbaDph).toBe(12);
    expect(ubytovani?.czCpa).toBe("55.20");
    expect(vino?.sazbaDph).toBe(21); // alkohol vždy základní sazba

    // Rekapitulace po sazbách je povinná náležitost daňového dokladu.
    const rekapitulace = await m.radky<{ vat_rate: number | null; base_cents: string | number }>(
      m.sql`SELECT vat_rate, base_cents FROM invoice_vat_summary ivs
              JOIN invoices i ON i.id = ivs.invoice_id WHERE i.number = ${v.doklad.cislo}`,
    );
    expect(rekapitulace.length).toBeGreaterThanOrEqual(2);
  });
});
