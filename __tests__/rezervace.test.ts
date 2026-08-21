import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pripravDb } from "./pomocnici/db";

/**
 * Integrační test rezervačního jádra nad skutečným Postgresem (PGlite).
 *
 * Testuje se to, co nejvíc bolí, když se pokazí: dvojí prodej termínu,
 * rozjetá cena mezi klientem a serverem a zmrazený rozpad ceny.
 */

let db: Awaited<ReturnType<typeof nactiModuly>>;
let uklid: () => void;

async function nactiModuly() {
  const [vytvor, klient, drizzle] = await Promise.all([
    import("@/lib/reservations/vytvor"),
    import("@/lib/db/client"),
    import("drizzle-orm"),
  ]);
  return { ...vytvor, ...klient, sql: drizzle.sql };
}

const za = (dni: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + dni);
  return d;
};

const host = { jmeno: "Jana Lesní", email: "jana@example.com", telefon: "+420777123456" };

beforeAll(async () => {
  const p = await pripravDb();
  uklid = p.uklid;
  db = await nactiModuly();
}, 90_000);

afterAll(() => uklid?.());

describe("založení rezervace", () => {
  it("z webu s dostatečným předstihem termín rovnou zablokuje", async () => {
    const v = await db.vytvorRezervaci({
      domek: "achat",
      prijezd: za(30),
      odjezd: za(33),
      dospeli: 2,
      doplnky: {},
      host,
    });
    expect(v.ok, JSON.stringify(v)).toBe(true);
    if (!v.ok) return;

    expect(v.stav).toBe("hold");
    expect(v.kod).toMatch(/^SL-\d{2}-\d{4}$/);
    expect(v.vs).toHaveLength(10);
    expect(v.drziDo).toBeInstanceOf(Date);
    // tři noci od 2 890 Kč výš
    expect(v.celkemHalere).toBeGreaterThanOrEqual(3 * 289000);
    // záloha je polovina
    expect(v.zalohaHalere).toBe(Math.round(v.celkemHalere / 2));

    const [r] = await db.radky<{ status: string; blokaci: number; polozek: number; plateb: number }>(
      db.sql`SELECT r.status,
               (SELECT count(*)::int FROM reservation_units ru WHERE ru.reservation_id = r.id) blokaci,
               (SELECT count(*)::int FROM reservation_items ri WHERE ri.reservation_id = r.id) polozek,
               (SELECT count(*)::int FROM payments p WHERE p.reservation_id = r.id) plateb
             FROM reservations r WHERE r.code = ${v.kod}`,
    );
    expect(r.status).toBe("hold");
    expect(r.blokaci).toBe(1);
    expect(r.polozek).toBe(3); // tři noci, bez slevy a doplňků
    expect(r.plateb).toBe(1); // předpis zálohy
  });

  it("stejný termín podruhé neprodá", async () => {
    const v = await db.vytvorRezervaci({
      domek: "achat",
      prijezd: za(31),
      odjezd: za(34),
      dospeli: 2,
      doplnky: {},
      host: { ...host, email: "druhy@example.com" },
    });
    expect(v.ok).toBe(false);
    if (v.ok) return;
    expect(v.duvod).toBe("obsazeno");
    expect(v.zprava).toMatch(/obsadil/i);
  });

  it("navazující termín (odjezd = příjezd) projde", async () => {
    const v = await db.vytvorRezervaci({
      domek: "achat",
      prijezd: za(33),
      odjezd: za(35),
      dospeli: 2,
      doplnky: {},
      host: { ...host, email: "treti@example.com" },
    });
    expect(v.ok, JSON.stringify(v)).toBe(true);
  });

  it("příjezd do 48 hodin je poptávka, ne blokace", async () => {
    const v = await db.vytvorRezervaci({
      domek: "mech",
      prijezd: za(1),
      odjezd: za(3),
      dospeli: 2,
      doplnky: {},
      host,
    });
    expect(v.ok, JSON.stringify(v)).toBe(true);
    if (!v.ok) return;
    expect(v.stav).toBe("inquiry");
    expect(v.drziDo).toBeNull();

    const [r] = await db.radky<{ blokaci: number }>(
      db.sql`SELECT (SELECT count(*)::int FROM reservation_units ru WHERE ru.reservation_id = r.id) blokaci
             FROM reservations r WHERE r.code = ${v.kod}`,
    );
    expect(r.blokaci).toBe(0);
  });

  it("celý les je vždy poptávka — nikdy neblokuje oba domky automaticky", async () => {
    const v = await db.vytvorRezervaci({
      domek: "cely-les",
      prijezd: za(60),
      odjezd: za(63),
      dospeli: 4,
      doplnky: {},
      host,
    });
    expect(v.ok, JSON.stringify(v)).toBe(true);
    if (!v.ok) return;
    expect(v.stav).toBe("inquiry");
  });

  it("nesouhlas ceny rezervaci nezaloží", async () => {
    const v = await db.vytvorRezervaci({
      domek: "mech",
      prijezd: za(70),
      odjezd: za(72),
      dospeli: 2,
      doplnky: {},
      host,
      ocekavanaCastkaHalere: 1,
    });
    expect(v.ok).toBe(false);
    if (v.ok) return;
    expect(v.duvod).toBe("cena_se_zmenila");
  });

  it("doplňky se zmrazí do položek se správnou sazbou DPH", async () => {
    const v = await db.vytvorRezervaci({
      domek: "mech",
      prijezd: za(80),
      odjezd: za(83),
      dospeli: 2,
      doplnky: { snidane: 1, vino: 2 },
      host,
    });
    expect(v.ok, JSON.stringify(v)).toBe(true);
    if (!v.ok) return;

    const polozky = await db.radky<{
      kind: string;
      label: string;
      price_item_code: string;
      total_cents: number;
      vat_rate: number | null;
    }>(
      db.sql`SELECT ri.kind, ri.label, ri.price_item_code, ri.total_cents, ri.vat_rate
             FROM reservation_items ri JOIN reservations r ON r.id = ri.reservation_id
             WHERE r.code = ${v.kod} AND ri.kind = 'addon' ORDER BY ri.label`,
    );
    expect(polozky).toHaveLength(2);
    const snidane = polozky.find((p) => p.price_item_code === "ADDON_BREAKFAST")!;
    const vino = polozky.find((p) => p.price_item_code === "ADDON_WINE")!;
    expect(snidane, "snídaňový koš mezi položkami chybí").toBeDefined();
    expect(vino, "víno mezi položkami chybí").toBeDefined();
    // snídaně 3 noci × 490 Kč, ubytovací služba 12 %
    expect(Number(snidane.total_cents)).toBe(3 * 49000);
    expect(snidane.vat_rate).toBe(12);
    // víno 2 lahve × 390 Kč, alkohol vždy 21 %
    expect(Number(vino.total_cents)).toBe(2 * 39000);
    expect(vino.vat_rate).toBe(21);
  });

  it("sleva za dlouhý pobyt se zapíše jako záporná položka", async () => {
    const v = await db.vytvorRezervaci({
      domek: "mech",
      prijezd: za(100),
      odjezd: za(108), // 8 nocí
      dospeli: 2,
      doplnky: {},
      host,
    });
    expect(v.ok, JSON.stringify(v)).toBe(true);
    if (!v.ok) return;

    const [sleva] = await db.radky<{ total_cents: number }>(
      db.sql`SELECT ri.total_cents FROM reservation_items ri
             JOIN reservations r ON r.id = ri.reservation_id
             WHERE r.code = ${v.kod} AND ri.kind = 'discount'`,
    );
    expect(Number(sleva.total_cents)).toBeLessThan(0);
  });

  it("odmítne pobyt v minulosti i obrácený termín", async () => {
    const minulost = await db.vytvorRezervaci({
      domek: "achat", prijezd: za(-5), odjezd: za(-2), dospeli: 2, doplnky: {}, host,
    });
    expect(minulost.ok).toBe(false);

    const obraceny = await db.vytvorRezervaci({
      domek: "achat", prijezd: za(20), odjezd: za(18), dospeli: 2, doplnky: {}, host,
    });
    expect(obraceny.ok).toBe(false);
  });

  it("odmítne jednu noc a termín mimo vypsaný ceník", async () => {
    const jednaNoc = await db.vytvorRezervaci({
      domek: "achat", prijezd: za(200), odjezd: za(201), dospeli: 2, doplnky: {}, host,
    });
    expect(jednaNoc.ok).toBe(false);
    if (!jednaNoc.ok) expect(jednaNoc.duvod).toBe("neplatny_termin");

    const daleko = await db.vytvorRezervaci({
      domek: "achat", prijezd: za(900), odjezd: za(903), dospeli: 2, doplnky: {}, host,
    });
    expect(daleko.ok).toBe(false);
    if (!daleko.ok) expect(daleko.duvod).toBe("mimo_cenik");
  });

  it("variabilní symboly a kódy se neopakují", async () => {
    const vsechny = await db.radky<{ variable_symbol: string; code: string }>(
      db.sql`SELECT variable_symbol, code FROM reservations`,
    );
    expect(new Set(vsechny.map((r) => r.variable_symbol)).size).toBe(vsechny.length);
    expect(new Set(vsechny.map((r) => r.code)).size).toBe(vsechny.length);
    expect(vsechny.length).toBeGreaterThan(4);
  });

  it("host se založí jednou, i když rezervuje víckrát", async () => {
    const [{ n }] = await db.radky<{ n: number }>(
      db.sql`SELECT count(*)::int n FROM guests WHERE lower(email) = 'jana@example.com'`,
    );
    expect(n).toBe(1);
  });

  it("každá rezervace má úkol pro majitele", async () => {
    const [{ rez, ukoly }] = await db.radky<{ rez: number; ukoly: number }>(
      db.sql`SELECT (SELECT count(*)::int FROM reservations) rez,
                    (SELECT count(*)::int FROM tasks) ukoly`,
    );
    expect(ukoly).toBe(rez);
  });
});

describe("vypršení držení termínu", () => {
  it("uvolní termín, přepíše platbu a založí úkol", async () => {
    const { uvolniVyprseleDrzeni } = await import("@/lib/reservations/expirace");

    const v = await db.vytvorRezervaci({
      domek: "achat",
      prijezd: za(150),
      odjezd: za(153),
      dospeli: 2,
      doplnky: {},
      host: { ...host, email: "expirace@example.com" },
    });
    expect(v.ok, JSON.stringify(v)).toBe(true);
    if (!v.ok) return;
    expect(v.stav).toBe("hold");

    // Než držení vyprší, termín je blokovaný — druhá rezervace neprojde.
    const kolize = await db.vytvorRezervaci({
      domek: "achat", prijezd: za(151), odjezd: za(154), dospeli: 2, doplnky: {},
      host: { ...host, email: "kolize@example.com" },
    });
    expect(kolize.ok).toBe(false);

    // Posuneme držení do minulosti a pustíme cron.
    await db.radky(
      db.sql`UPDATE reservations SET hold_expires_at = now() - interval '1 hour' WHERE code = ${v.kod}`,
    );
    const uvolnene = await uvolniVyprseleDrzeni();
    expect(uvolnene).toContain(v.kod);

    const [r] = await db.radky<{ status: string; blokaci_aktivnich: number; platba: string; ukol: number }>(
      db.sql`SELECT r.status,
               (SELECT count(*)::int FROM reservation_units ru
                 WHERE ru.reservation_id = r.id AND ru.status IN ('hold','confirmed','checked_in')) blokaci_aktivnich,
               (SELECT p.status FROM payments p WHERE p.reservation_id = r.id LIMIT 1) platba,
               (SELECT count(*)::int FROM tasks t WHERE t.reservation_id = r.id AND t.kind = 'expired_hold') ukol
             FROM reservations r WHERE r.code = ${v.kod}`,
    );
    expect(r.status).toBe("expired");
    expect(r.blokaci_aktivnich).toBe(0);
    expect(r.platba).toBe("expired");
    expect(r.ukol).toBe(1);

    // A teď už termín někdo koupit může.
    const potom = await db.vytvorRezervaci({
      domek: "achat", prijezd: za(151), odjezd: za(154), dospeli: 2, doplnky: {},
      host: { ...host, email: "pozdeji@example.com" },
    });
    expect(potom.ok, JSON.stringify(potom)).toBe(true);
  });

  it("běh bez vypršelých držení nic nerozbije", async () => {
    const { uvolniVyprseleDrzeni } = await import("@/lib/reservations/expirace");
    expect(await uvolniVyprseleDrzeni()).toEqual([]);
  });
});

describe("zavřené termíny", () => {
  /**
   * Blok v kalendáři drží termín stejně jako rezervace, ale databázové
   * omezení ho nehlídá — `no_overlap` platí uvnitř `reservation_units`,
   * ne mezi tabulkami. Bez kontroly by majitel zavřel domek na údržbu
   * a web ho přesto prodal.
   */
  it("na zavřený termín se rezervovat nedá", async () => {
    const od = za(120);
    const doKdy = za(124);
    const klic = (d: Date) => d.toISOString().slice(0, 10);

    await db.radky(db.sql`
      INSERT INTO calendar_blocks (unit_id, date_from, date_to, kind, reason, created_by)
      SELECT id, ${klic(od)}::date, ${klic(doKdy)}::date, 'maintenance', 'Výměna bojleru', 'test'
        FROM units WHERE slug = 'achat'
    `);

    const v = await db.vytvorRezervaci({
      domek: "achat",
      prijezd: za(121),
      odjezd: za(123),
      dospeli: 2,
      doplnky: {},
      host,
    });

    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.duvod).toBe("obsazeno");

    // Vedle bloku se rezervovat dá — nesmí to zavřít víc, než je zavřené.
    const vedle = await db.vytvorRezervaci({
      domek: "achat",
      prijezd: za(126),
      odjezd: za(128),
      dospeli: 2,
      doplnky: {},
      host,
    });
    expect(vedle.ok, vedle.ok ? "" : vedle.zprava).toBe(true);

    // A druhý domek zavřený není.
    const druhy = await db.vytvorRezervaci({
      domek: "mech",
      prijezd: za(121),
      odjezd: za(123),
      dospeli: 2,
      doplnky: {},
      host,
    });
    expect(druhy.ok, druhy.ok ? "" : druhy.zprava).toBe(true);
  });
});
