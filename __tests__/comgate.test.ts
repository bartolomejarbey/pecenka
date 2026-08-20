import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ComGate ještě není zasmluvněný, takže se proti němu nedá volat naostro.
 * Tenhle test zamyká tvar požadavku podle dokumentace REST API v2.0 —
 * až smlouva bude, pozná se rozdíl hned, a ne až na první ostré platbě.
 */

const PUVODNI = { ...process.env };

async function nactiMetodu() {
  vi.resetModules();
  const { comgateMetoda } = await import("@/lib/payments/providers/comgate");
  return comgateMetoda();
}

const VSTUP = {
  platbaId: "p1",
  castkaHalere: 433500,
  variabilniSymbol: "2608000424",
  specifickySymbol: "1",
  ucel: "ZALOHA" as const,
  splatnost: new Date(2026, 7, 24),
  kodRezervace: "SL-26-0424",
  host: { jmeno: "Jana Lesní", email: "jana@example.com", telefon: "+420777123456" },
};

beforeEach(() => {
  process.env.COMGATE_MERCHANT = "123456";
  process.env.COMGATE_SECRET = "tajemstvi";
  process.env.COMGATE_TEST = "true";
  process.env.APP_URL = "https://sedmyles.cz";
});

afterEach(() => {
  process.env = { ...PUVODNI };
  vi.unstubAllGlobals();
});

describe("ComGate", () => {
  it("bez klíčů se metoda vůbec nenabídne", async () => {
    delete process.env.COMGATE_MERCHANT;
    delete process.env.COMGATE_SECRET;
    expect((await nactiMetodu()).dostupna()).toBe(false);
  });

  it("s klíči je dostupná a umí kartu, Apple Pay i Google Pay", async () => {
    const m = await nactiMetodu();
    expect(m.dostupna()).toBe(true);
    expect(m.schopnosti.applePay).toBe(true);
    expect(m.schopnosti.googlePay).toBe(true);
    expect(m.schopnosti.okamzitePotvrzeni).toBe(true);
    expect(m.schopnosti.preautorizace).toBe(true);
  });

  it("založení platby posílá tvar podle API v2.0", async () => {
    const volani: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      volani.push({ url, init });
      return new Response(JSON.stringify({ transId: "AB12-CD34-EF56", redirect: "https://pay/x" }), {
        status: 201,
      });
    });

    const m = await nactiMetodu();
    const v = await m.zalozPlatbu(VSTUP);

    expect(v.transakceId).toBe("AB12-CD34-EF56");
    expect(v.presmerovani).toBe("https://pay/x");

    const { url, init } = volani[0];
    expect(url).toBe("https://payments.comgate.cz/v2.0/payment.json");
    expect(init.method).toBe("POST");

    const hlavicky = init.headers as Record<string, string>;
    expect(hlavicky.Authorization).toBe(
      "Basic " + Buffer.from("123456:tajemstvi").toString("base64"),
    );

    const telo = JSON.parse(init.body as string);
    expect(telo.price).toBe(433500); // haléře, ne koruny
    expect(telo.curr).toBe("CZK");
    expect(telo.refId).toBe("2608000424");
    expect(telo.test).toBe(true);
    expect(telo.enableApplePayGooglePay).toBe(true);
    expect(telo.lang).toBe("cs");
    expect(telo.country).toBe("CZ");
    // tvrdý limit ComGate — delší label API odmítne
    expect(telo.label.length).toBeLessThanOrEqual(16);
    expect(telo.url_paid).toContain("https://sedmyles.cz/api/platba/navrat/zaplaceno");
  });

  it("stavy překládá na naše", async () => {
    for (const [comgate, nas] of [
      ["PAID", "paid"],
      ["PENDING", "pending"],
      ["CANCELLED", "cancelled"],
      ["AUTHORIZED", "pending"], // předautorizace: blokované, ne stržené
      ["NECO_NOVEHO", "pending"], // neznámý stav nikdy nehlásíme jako zaplaceno
    ] as const) {
      vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ state: comgate })));
      expect(await (await nactiMetodu()).zjistiStav("AB12")).toBe(nas);
    }
  });

  it("neúspěch API se nepřechází mlčky", async () => {
    vi.stubGlobal("fetch", async () => new Response("chyba", { status: 400 }));
    await expect((await nactiMetodu()).zalozPlatbu(VSTUP)).rejects.toThrow(/odmítl/);
  });

  it("vrácení peněz posílá částku v haléřích a referenci", async () => {
    let telo: Record<string, unknown> = {};
    vi.stubGlobal("fetch", async (_u: string, init: RequestInit) => {
      telo = JSON.parse(init.body as string);
      return new Response("{}", { status: 200 });
    });
    const v = await (await nactiMetodu()).vratPenize!("AB12", 100000, "OPD-2026-0001");
    expect(v.ok).toBe(true);
    expect(telo).toMatchObject({ transId: "AB12", amount: 100000, refId: "OPD-2026-0001" });
  });
});
