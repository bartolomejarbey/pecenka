import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { dhash, porovnej, pripravFotku, vyrez, vzdalenostOtisku } from "@/lib/luna/obraz";

/**
 * Obrazová brána Luny.
 *
 * Testuje se přesně to, na čem stojí důvěryhodnost celého modulu: že jiné
 * světlo, jiná denní doba ani komprese nevyrobí „poškození", zatímco skutečná
 * změna na povrchu se najde.
 */

const KOREN = path.resolve(__dirname, "..");
let interier: Buffer;

/** Domalování skvrny — takhle vypadá skutečná změna oproti baseline. */
async function seSkvrnou(zdroj: Buffer, x: number, y: number, r: number): Promise<Buffer> {
  const m = await sharp(zdroj).metadata();
  const W = m.width!;
  const H = m.height!;
  const skvrna = Buffer.from(
    `<svg width="${W}" height="${H}">
       <ellipse cx="${x * W}" cy="${y * H}" rx="${r * W}" ry="${r * W * 0.7}"
                fill="#2b1a10" opacity="0.85"/>
     </svg>`,
  );
  return sharp(zdroj).composite([{ input: skvrna }]).jpeg({ quality: 88 }).toBuffer();
}

beforeAll(async () => {
  interier = await pripravFotku(
    readFileSync(path.join(KOREN, "public/foto/interier-obyvak.jpg")),
  ).then((f) => f.data);
}, 60_000);

describe("příprava fotky", () => {
  it("zmenší, převede na JPEG a smaže metadata", async () => {
    const f = await pripravFotku(readFileSync(path.join(KOREN, "public/foto/interier-kuchyne.jpg")));
    expect(Math.max(f.sirka, f.vyska)).toBeLessThanOrEqual(1092);
    expect(f.sha256).toHaveLength(64);
    const meta = await sharp(f.data).metadata();
    expect(meta.format).toBe("jpeg");
    // GPS ani nic jiného v souboru nezůstane — fotka z interiéru
    // pronajatého domku se souřadnicemi je zbytečné riziko.
    expect(meta.exif).toBeUndefined();
  });

  it("percepční otisk je stabilní vůči kompresi", async () => {
    const zdroj = readFileSync(path.join(KOREN, "public/foto/interier-obyvak.jpg"));
    const a = await dhash(await sharp(zdroj).jpeg({ quality: 92 }).toBuffer());
    const b = await dhash(await sharp(zdroj).jpeg({ quality: 45 }).toBuffer());
    expect(vzdalenostOtisku(a, b)).toBeLessThanOrEqual(4);
  });

  it("jiný záběr má výrazně jiný otisk", async () => {
    const a = await dhash(readFileSync(path.join(KOREN, "public/foto/interier-obyvak.jpg")));
    const b = await dhash(readFileSync(path.join(KOREN, "public/foto/interier-koupelna.jpg")));
    expect(vzdalenostOtisku(a, b)).toBeGreaterThan(14);
  });
});

describe("porovnání před a po", () => {
  it("tatáž fotka = žádný nález", async () => {
    const v = await porovnej(interier, interier);
    expect(v.podobnost).toBeGreaterThan(0.99);
    expect(v.zarovnani).toBe("good");
    expect(v.oblasti).toHaveLength(0);
  });

  it("jiné světlo samo o sobě nález nevyrobí", async () => {
    // O třetinu tmavší snímek — jako by host fotil večer místo ráno.
    const vecer = await sharp(interier).modulate({ brightness: 0.66 }).jpeg({ quality: 88 }).toBuffer();
    const v = await porovnej(interier, vecer);
    expect(v.rozdilJasu).toBeLessThan(-20); // světlo se opravdu liší
    expect(v.podobnost).toBeGreaterThan(0.9); // ale obsah je stejný
    expect(v.oblasti, "jiné světlo nesmí vypadat jako škoda").toHaveLength(0);
  });

  it("silnější komprese nález nevyrobí", async () => {
    const horsi = await sharp(interier).jpeg({ quality: 40 }).toBuffer();
    const v = await porovnej(interier, horsi);
    expect(v.oblasti).toHaveLength(0);
  });

  it("skvrnu na povrchu najde a označí ji na správném místě", async () => {
    const poskozeno = await seSkvrnou(interier, 0.3, 0.62, 0.09);
    const v = await porovnej(interier, poskozeno);

    expect(v.oblasti.length).toBeGreaterThanOrEqual(1);
    expect(v.zarovnani).not.toBe("poor");

    const o = v.oblasti[0];
    const stredX = o.x + o.w / 2;
    const stredY = o.y + o.h / 2;
    expect(Math.abs(stredX - 0.3), "vodorovná poloha nálezu").toBeLessThan(0.15);
    expect(Math.abs(stredY - 0.62), "svislá poloha nálezu").toBeLessThan(0.15);
  });

  it("skvrnu najde i při jiném světle", async () => {
    const poskozeno = await seSkvrnou(interier, 0.62, 0.35, 0.08);
    const vecer = await sharp(poskozeno).modulate({ brightness: 0.72 }).jpeg({ quality: 88 }).toBuffer();
    const v = await porovnej(interier, vecer);
    expect(v.oblasti.length).toBeGreaterThanOrEqual(1);
  });

  it("úplně jiná místnost se označí jako špatné zarovnání, ne jako škoda", async () => {
    const jina = await pripravFotku(
      readFileSync(path.join(KOREN, "public/foto/interier-koupelna.jpg")),
    ).then((f) => f.data);
    const v = await porovnej(interier, jina);
    // Zóna se špatným zarovnáním nikdy neeskaluje — vyžádá se doplňující snímek.
    expect(v.zarovnani).toBe("poor");
  });

  it("výřez nálezu je použitelný obrázek", async () => {
    const poskozeno = await seSkvrnou(interier, 0.4, 0.5, 0.1);
    const v = await porovnej(interier, poskozeno);
    const v0 = v.oblasti[0];
    expect(v0).toBeDefined();
    const orez = await vyrez(poskozeno, v0);
    const meta = await sharp(orez).metadata();
    expect(meta.width).toBeGreaterThan(60);
    expect(meta.height).toBeGreaterThan(60);
  });

  it("drobný šum se pod prahem plochy zahodí", async () => {
    const tecka = await seSkvrnou(interier, 0.5, 0.5, 0.004);
    const v = await porovnej(interier, tecka);
    expect(v.oblasti).toHaveLength(0);
  });

  /**
   * Propálená díra od cigarety je malá a drahá zároveň.
   *
   * Brána původně rozhodovala jen podle plochy, takže díra o velikosti dvou
   * bloků propadla mezi šum a model se na ni vůbec nezeptal. Rozhoduje proto
   * i hloubka propadu podobnosti: šum se drží těsně pod prahem, propálenina
   * spadne hluboko. Test hlídá obě strany — ať se práh neutáhne zpátky, ani
   * nerozvolní tak, že projde každý stín.
   */
  describe("malá, ale tvrdá změna", () => {
    /** Ostrý tmavý bod = propálenina, oštípnutý roh, prasklina. */
    async function bod(r: number, barva: string, kryti: number): Promise<number> {
      const m = await sharp(interier).metadata();
      const W = m.width!;
      const H = m.height!;
      const svg = Buffer.from(
        `<svg width="${W}" height="${H}">
           <ellipse cx="${0.4 * W}" cy="${0.55 * H}" rx="${r * W}" ry="${r * W}"
                    fill="${barva}" opacity="${kryti}"/>
         </svg>`,
      );
      const po = await sharp(interier).composite([{ input: svg }]).jpeg({ quality: 88 }).toBuffer();
      return (await porovnej(interier, po)).oblasti.length;
    }

    it("ostrý bod velikosti propáleniny se najde", async () => {
      expect(await bod(0.009, "#100804", 1)).toBeGreaterThanOrEqual(1);
    });

    it("stejně velký měkký stín se nenajde", async () => {
      expect(await bod(0.009, "#6b6f68", 0.22)).toBe(0);
    });

    it("ani větší měkký stín se nenajde", async () => {
      expect(await bod(0.02, "#6b6f68", 0.22)).toBe(0);
    });

    it("bod pod hranicí rozlišení se nenajde ani ostrý", async () => {
      expect(await bod(0.004, "#100804", 1)).toBe(0);
    });
  });
});
