import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pripravDb } from "./pomocnici/db";

/**
 * Odjezdový foto-protokol od začátku do konce.
 *
 * Jednotkové testy chytí matematiku, ale ne spoje — a právě na spojích se
 * tenhle tok už jednou rozpadl (přístup do portálu, který nikdo nezakládal,
 * a nativní modul, který se v nasazení nenačetl). Tady jde skutečná
 * rezervace, skutečné fotky na disk, skutečná obrazová brána a skutečné
 * složení vzkazu pro hosta.
 *
 * Model se **nevolá** — v testu není klíč. Kontroluje se tedy všechno kolem:
 * co se smí nahrát, co se odmítne, co se uloží a co host uvidí.
 */

const KOREN = path.resolve(__dirname, "..");
const FOTKY = path.join(KOREN, "public/test-ai");

let uklid: () => void;
let uloziste: string;
let m: Awaited<ReturnType<typeof nactiModuly>>;

async function nactiModuly() {
  const [vytvor, foto, protokol, run, admin, reference, klient, drizzle] = await Promise.all([
    import("@/lib/reservations/vytvor"),
    import("@/lib/portal/foto"),
    import("@/lib/portal/protokol"),
    import("@/lib/luna/run"),
    import("@/lib/admin/reference"),
    import("@/lib/portal/vysledek"),
    import("@/lib/db/client"),
    import("drizzle-orm"),
  ]);
  return {
    ...vytvor, ...foto, ...protokol, ...run, ...admin, ...reference, ...klient,
    sql: drizzle.sql,
  };
}

const za = (dni: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + dni);
  return d;
};

/** Zóny, pro které máme vygenerované dvojice. Zbytek protokolu je bez reference. */
const DVOJICE = [
  { zona: "seating", id: "p01" },
  { zona: "floor", id: "p02" },
  { zona: "kitchen", id: "p04" },
  { zona: "loft", id: "p05" },
  { zona: "bathroom", id: "p06" },
  { zona: "window", id: "p09" },
] as const;

/**
 * Zóny, ke kterým referenci nemáme.
 *
 * Přesně tak to bude vypadat i naostro, dokud majitel nedofotí celý domek —
 * a systém se u nich musí chovat jako u dluhu na naší straně, ne jako
 * u nálezu.
 */
const BEZ_REFERENCE = [
  { zona: "fridge", id: "p03" },
  { zona: "wc", id: "p07" },
  { zona: "mattress", id: "p08" },
] as const;

const snimek = (id: string, ktery: "pred" | "po") =>
  readFileSync(path.join(FOTKY, `${id}-${ktery}.jpg`));

let rezervaceId = "";
let kod = "";
let odjezd = "";

beforeAll(async () => {
  const db = await pripravDb();
  uklid = db.uklid;

  // Disková varianta úložiště — bez Supabase, ale se stejným chováním
  // včetně podepsaných odkazů.
  uloziste = mkdtempSync(path.join(os.tmpdir(), "sedmyles-uloziste-"));
  process.env.PROTOKOL_DIR = uloziste;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;

  m = await nactiModuly();

  // Příjezd dnes: protokol se otevírá den před příjezdem a testuje se tok
  // hosta, který v domku právě je.
  const r = await m.vytvorRezervaci({
    domek: "achat",
    prijezd: za(0),
    odjezd: za(3),
    dospeli: 2,
    doplnky: {},
    host: { jmeno: "Jana Nováková", email: "jana@example.com" },
  });
  if (!r.ok) throw new Error(`rezervace: ${r.zprava}`);
  const [radek] = await m.radky<{ id: string }>(
    m.sql`SELECT id::text AS id FROM reservations WHERE code = ${r.kod}`,
  );
  rezervaceId = radek.id;
  kod = r.kod;
  odjezd = za(3).toISOString().slice(0, 10);
}, 120_000);

afterAll(() => {
  uklid?.();
  if (uloziste) rmSync(uloziste, { recursive: true, force: true });
});

async function nahrajZonu(zona: string, data: Buffer, klientId = zona) {
  return m.prijmiFotku({ rezervaceId, kodRezervace: kod, odjezd, zona, klientId, data });
}

describe("referenční fotky domku", () => {
  it("založí sadu a přijme snímek", async () => {
    const v = await m.nahrajReferenci("achat", "seating", snimek("p01", "pred"), "test");
    expect(v.ok, "ok" in v ? "" : (v as { chyba: string }).chyba).toBe(true);

    const stav = await m.nactiDomek("achat");
    expect(stav?.verze).toBe(1);
    expect(stav?.zony.find((z) => z.klic === "seating")?.snimky).toHaveLength(1);
  });

  it("neexistující zónu odmítne", async () => {
    const v = await m.nahrajReferenci("achat", "../baseline", snimek("p01", "pred"), "test");
    expect(v.ok).toBe(false);
  });

  it("tmavou referenci odmítne — porovnává se proti ní každý odjezd", async () => {
    const tma = await sharp(snimek("p01", "pred")).modulate({ brightness: 0.05 }).jpeg().toBuffer();
    const v = await m.nahrajReferenci("achat", "fridge", tma, "test");
    expect(v.ok).toBe(false);
  });

  it("doplní zbylé zóny, které máme", async () => {
    for (const d of DVOJICE) {
      if (d.zona === "seating") continue;
      const v = await m.nahrajReferenci("achat", d.zona, snimek(d.id, "pred"), "test");
      expect(v.ok, `${d.zona}: ${"chyba" in v ? v.chyba : ""}`).toBe(true);
    }
    const stav = await m.nactiDomek("achat");
    expect(stav?.hotovoZon).toBe(DVOJICE.length);
    // Sada se nepoužila k hodnocení, takže se nemusela verzovat.
    expect(stav?.verze).toBe(1);
  }, 60_000);
});

describe("host nahrává fotky", () => {
  it("protokol se založí a pinuje se na aktivní sadu", async () => {
    const p = await m.zajistiProtokol(rezervaceId);
    expect(p.stav).toBe("draft");
    expect(p.inspekce).toHaveLength(1);
    expect(p.viceDomku).toBe(false);
    expect(p.zony.length).toBeGreaterThanOrEqual(12);
    // Reference se hostovi ukazuje, aby věděl, odkud fotit.
    expect(p.zony.find((z) => z.klic === "seating")?.referenceUrl).toBeTruthy();
  });

  it("odmítne zónu, která v checklistu není", async () => {
    const v = await nahrajZonu("../../baseline/achat/v1", snimek("p01", "po"));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.stav).toBe(400);
  });

  it("odmítne tmavou fotku a poradí, co s tím", async () => {
    const tma = await sharp(snimek("p01", "po")).modulate({ brightness: 0.05 }).jpeg().toBuffer();
    const v = await nahrajZonu("seating", tma);
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.stav).toBe(422);
      expect(v.chyba).toContain("tmavá");
    }
  });

  it("přijme pořádnou fotku a vrátí podepsaný náhled", async () => {
    const v = await nahrajZonu("seating", snimek("p01", "po"));
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.nahled).toContain("/api/uloziste/");
  });

  it("pozná, že host fotí pořád totéž", async () => {
    const v = await nahrajZonu("floor", snimek("p01", "po"));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.chyba).toContain("tentýž záběr");
  });

  it("přefocení téže zóny nahradí původní snímek, nepřidá druhý", async () => {
    const jina = await sharp(snimek("p01", "po")).modulate({ brightness: 1.1 }).jpeg().toBuffer();
    expect((await nahrajZonu("seating", jina)).ok).toBe(true);

    const [{ n }] = await m.radky<{ n: number }>(m.sql`
      SELECT count(*)::int AS n FROM inspection_photos p
        JOIN inspections i ON i.id = p.inspection_id
       WHERE i.reservation_id = ${rezervaceId}::uuid AND p.zone_key = 'seating'
    `);
    expect(n).toBe(1);
  });
});

describe("odeslání a vzkaz hostovi", () => {
  it("dokud host nefotil, portál nabízí focení", async () => {
    const s = await m.nactiStavProtokolu(rezervaceId);
    expect(s.stav).toBe("rozpracovano");
  });

  it("vyhodnocení bez modelu doběhne a nikoho neobviní", async () => {
    for (const d of [...DVOJICE, ...BEZ_REFERENCE]) {
      if (d.zona === "seating") continue;
      const v = await nahrajZonu(d.zona, snimek(d.id, "po"));
      expect(v.ok, `${d.zona}: ${"chyba" in v ? v.chyba : ""}`).toBe(true);
    }

    const [i] = await m.radky<{ id: string }>(m.sql`
      SELECT id::text AS id FROM inspections
       WHERE reservation_id = ${rezervaceId}::uuid AND type = 'checkout'
    `);
    await m.radky(m.sql`
      UPDATE inspections SET status = 'submitted', submitted_at = now() WHERE id = ${i.id}::uuid
    `);

    const v = await m.vyhodnotInspekci(i.id);

    // Bez klíče k modelu jde všechno podezřelé k člověku — a hostovi se
    // neřekne nic, co by znělo jako nález.
    expect(["needs_review", "auto_clear"]).toContain(v.stav);
    expect(v.vzkaz.ton).not.toBe("telefon");
    expect(v.zony.every((z) => z.zavaznost === "none")).toBe(true);

    // Zóny bez reference se nesmí tvářit jako nález.
    const bezReference = v.zony.filter((z) => z.chybiReference);
    expect(bezReference.length).toBeGreaterThan(0);
    expect(bezReference.every((z) => z.zavaznost === "none")).toBe(true);
  }, 180_000);

  it("po odeslání se fotky nedají přepsat", async () => {
    const v = await nahrajZonu("seating", snimek("p07", "po"));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.stav).toBe(409);
  });

  it("host v portálu vidí vzkaz, ne surový nález", async () => {
    const s = await m.nactiStavProtokolu(rezervaceId);
    expect(s.stav).toBe("hotovo");
    if (s.stav === "hotovo") {
      expect(s.vzkaz.nadpis.length).toBeGreaterThan(3);
      const text = `${s.vzkaz.text} ${s.vzkaz.patka}`.toLowerCase();
      for (const slovo of ["škod", "poškoz", "kauc", "zaplatíte"]) {
        expect(text, `„${slovo}" ve vzkazu`).not.toContain(slovo);
      }
    }
  });

  it("opakované vyhodnocení nevyrobí druhý případ škody ani druhou dvojici", async () => {
    const [i] = await m.radky<{ id: string }>(m.sql`
      SELECT id::text AS id FROM inspections
       WHERE reservation_id = ${rezervaceId}::uuid AND type = 'checkout'
    `);
    await m.vyhodnotInspekci(i.id);

    const [{ pary, pripady }] = await m.radky<{ pary: number; pripady: number }>(m.sql`
      SELECT (SELECT count(*)::int FROM photo_pairs WHERE inspection_id = ${i.id}::uuid) AS pary,
             (SELECT count(*)::int FROM damage_cases WHERE inspection_id = ${i.id}::uuid) AS pripady
    `);
    expect(pary).toBe(DVOJICE.length);
    expect(pripady).toBe(0);
  }, 180_000);
});

describe("Celý les — jedna rezervace, dva domky", () => {
  let celyLes = "";

  beforeAll(async () => {
    const r = await m.vytvorRezervaci({
      domek: "cely-les",
      prijezd: za(20),
      odjezd: za(23),
      dospeli: 4,
      doplnky: {},
      host: { jmeno: "Rodina Dvořákova", email: "dvorak@example.com" },
    });
    if (!r.ok) throw new Error(`rezervace: ${r.zprava}`);
    const [radek] = await m.radky<{ id: string }>(
      m.sql`SELECT id::text AS id FROM reservations WHERE code = ${r.kod}`,
    );
    celyLes = radek.id;
    // Termín je schválně daleko, ať nekoliduje s první rezervací; protokol
    // ale testujeme z pohledu hosta, který už dorazil.
    await m.radky(m.sql`
      UPDATE reservations SET checkin = current_date WHERE id = ${celyLes}::uuid
    `);
  }, 60_000);

  it("založí protokol pro oba fyzické domky, ne pro virtuální jednotku", async () => {
    const p = await m.zajistiProtokol(celyLes);
    expect(p.inspekce.map((i) => i.domekSlug).sort()).toEqual(["achat", "mech"]);
    expect(p.viceDomku).toBe(true);
    // Dvanáct zón na domek. Dřív jich bylo dvanáct na celou rezervaci —
    // host tedy vyfotil jeden domek a druhý zůstal nezdokumentovaný.
    expect(p.zony).toHaveLength(24);
    expect(new Set(p.zony.map((z) => z.domekSlug))).toEqual(new Set(["achat", "mech"]));
  });

  it("žádná inspekce nemíří na virtuální jednotku", async () => {
    await m.zajistiProtokol(celyLes);
    const [{ n }] = await m.radky<{ n: number }>(m.sql`
      SELECT count(*)::int AS n FROM inspections
       WHERE reservation_id = ${celyLes}::uuid AND unit_slug = 'cely-les'
    `);
    expect(n).toBe(0);
  });

  it("Achát si vezme svou referenční sadu, Mech žádnou nemá", async () => {
    const p = await m.zajistiProtokol(celyLes);
    const achat = p.zony.find((z) => z.domekSlug === "achat" && z.klic === "seating");
    const mech = p.zony.find((z) => z.domekSlug === "mech" && z.klic === "seating");
    expect(achat?.referenceUrl).toBeTruthy();
    expect(mech?.referenceUrl).toBeNull();
  });

  it("fotka jde do inspekce toho domku, kterému patří", async () => {
    const v = await m.prijmiFotku({
      rezervaceId: celyLes,
      kodRezervace: "SL-TEST-LES",
      odjezd: za(23).toISOString().slice(0, 10),
      domekSlug: "mech",
      zona: "seating",
      klientId: "seating",
      data: snimek("p01", "po"),
    });
    expect(v.ok, "chyba" in v ? v.chyba : "").toBe(true);

    const [{ slug }] = await m.radky<{ slug: string }>(m.sql`
      SELECT i.unit_slug AS slug FROM inspection_photos p
        JOIN inspections i ON i.id = p.inspection_id
       WHERE i.reservation_id = ${celyLes}::uuid
    `);
    expect(slug).toBe("mech");
  });

  it("odeslat nejde, dokud chybí zóny v druhém domku", async () => {
    const [{ n }] = await m.radky<{ n: number }>(m.sql`
      SELECT count(*)::int AS n
        FROM inspections i
        JOIN checklist_zones cz ON cz.checklist_version_id = i.checklist_version_id
       WHERE i.reservation_id = ${celyLes}::uuid AND cz.required
         AND NOT EXISTS (
           SELECT 1 FROM inspection_photos p
            WHERE p.inspection_id = i.id AND p.zone_key = cz.zone_key AND p.deleted_at IS NULL)
    `);
    // Deset povinných zón na domek, jedna vyfocená → devatenáct chybí.
    expect(n).toBeGreaterThan(12);
  });
});

describe("protokol se otevírá až na místě", () => {
  it("rezervace daleko v budoucnu protokol nenabízí", async () => {
    const r = await m.vytvorRezervaci({
      domek: "mech",
      prijezd: za(120),
      odjezd: za(123),
      dospeli: 2,
      doplnky: {},
      host: { jmeno: "Brzký Pták", email: "brzy@example.com" },
    });
    if (!r.ok) throw new Error(r.zprava);
    const [radek] = await m.radky<{ id: string }>(
      m.sql`SELECT id::text AS id FROM reservations WHERE code = ${r.kod}`,
    );
    await m.zajistiProtokol(radek.id);

    const stav = await m.nactiStavProtokolu(radek.id);
    expect(stav.stav).toBe("prilis_brzy");

    // A neplatí to jen v rozhraní — routa je veřejné API.
    const v = await m.prijmiFotku({
      rezervaceId: radek.id,
      kodRezervace: r.kod,
      odjezd: za(123).toISOString().slice(0, 10),
      domekSlug: "mech",
      zona: "seating",
      klientId: "seating",
      data: snimek("p03", "po"),
    });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.stav).toBe(409);
  }, 60_000);
});

describe("mazání po lhůtě", () => {
  it("fotka po lhůtě se smaže a zůstane po ní jen záznam", async () => {
    const { GET } = await import("@/app/api/cron/retence/route");
    const [{ n: predtim }] = await m.radky<{ n: number }>(m.sql`
      SELECT count(*)::int AS n FROM inspection_photos WHERE deleted_at IS NULL
    `);
    expect(predtim).toBeGreaterThan(0);

    await m.radky(m.sql`UPDATE inspection_photos SET delete_after = current_date - 1`);
    const odpoved = await GET(new Request("https://localhost/api/cron/retence"));
    const data = (await odpoved.json()) as { smazano: number };
    expect(data.smazano).toBe(predtim);

    const [{ n: zbylo }] = await m.radky<{ n: number }>(m.sql`
      SELECT count(*)::int AS n FROM inspection_photos WHERE deleted_at IS NULL
    `);
    expect(zbylo).toBe(0);
    // Řádky zůstávají — musí jít doložit, že fotka existovala a kdy zmizela.
    const [{ n: radku }] = await m.radky<{ n: number }>(m.sql`
      SELECT count(*)::int AS n FROM inspection_photos
    `);
    expect(radku).toBe(predtim);
  }, 60_000);
});
