import { NextResponse } from "next/server";
import { createTransport } from "nodemailer";
import { z } from "zod";
import { formatCzDate, formatHalere } from "@/lib/booking";
import { esc, hlavicka } from "@/lib/mail/html";
import { odkazNaPlatbu } from "@/lib/payments/odkaz";
import { podpisyNastaveny } from "@/lib/payments/podpis";
import { pripravPlatbu } from "@/lib/payments/priprav";
import { posliPotvrzeniHostovi } from "@/lib/mail/rezervace";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { vytvorRezervaci, type Duvod } from "@/lib/reservations/vytvor";

/**
 * Příjem rezervací z webu.
 *
 * Rezervaci **zakládá do databáze** — dřív jen odesílala e-mail, takže dva lidé
 * mohli „zarezervovat" tentýž termín a nikdo se to nedozvěděl. Termín teď
 * zablokuje databázové omezení, ne dobrá vůle.
 *
 * E-mail majiteli je až druhý krok: když selže pošta, rezervace platí dál
 * a majitel ji uvidí v administraci.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Vstup = z.object({
  domek: z.enum(["achat", "mech", "cely-les"]),
  prijezd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neplatné datum příjezdu."),
  odjezd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neplatné datum odjezdu."),
  hoste: z.number().int().min(1).max(4),
  doplnky: z.record(z.string().max(40), z.number().int().min(0).max(10)).default({}),
  celkem: z.number().int().nonnegative().optional(),
  jmeno: z.string().trim().min(2, "Vyplňte prosím jméno.").max(120),
  email: z.string().trim().email("Zadejte prosím platný e-mail.").max(160),
  telefon: z.string().trim().max(40).optional(),
  poznamka: z.string().trim().max(2000).optional(),
  web: z.string().optional(), // honeypot
});

/** Kolik pokusů z jedné IP za deset minut. */
const LIMIT = 5;
const OKNO_MS = 10 * 60 * 1000;
const pokusy = new Map<string, number[]>();

function prekrocilLimit(ip: string): boolean {
  const ted = Date.now();
  const seznam = (pokusy.get(ip) ?? []).filter((t) => ted - t < OKNO_MS);
  seznam.push(ted);
  pokusy.set(ip, seznam);
  return seznam.length > LIMIT;
}

/**
 * České hlášky k chybám validace.
 *
 * Zod mluví anglicky a jeho výchozí texty („Invalid option: expected one of…")
 * host nepochopí. Překládáme podle pole, ne podle textu chyby — ten se
 * s novou verzí knihovny může změnit.
 */
const HLASKY: Record<string, string> = {
  domek: "Vyberte prosím jeden z domků.",
  prijezd: "Zadejte prosím platné datum příjezdu.",
  odjezd: "Zadejte prosím platné datum odjezdu.",
  hoste: "Počet hostů musí být 1 až 4.",
  doplnky: "Zkontrolujte prosím vybrané doplňky.",
  celkem: "Zkontrolujte prosím souhrn ceny.",
  jmeno: "Vyplňte prosím jméno.",
  email: "Zadejte prosím platný e-mail.",
  telefon: "Zkontrolujte prosím telefonní číslo.",
  poznamka: "Poznámka je příliš dlouhá.",
};

function cesky(problem: { path: PropertyKey[]; message: string } | undefined): string {
  const pole = String(problem?.path?.[0] ?? "");
  return HLASKY[pole] ?? "Zkontrolujte prosím vyplněné údaje.";
}

/** Chyby, u kterých má smysl vrátit 409 — stav se změnil, ne vstup je špatný. */
const KONFLIKT: Duvod[] = ["obsazeno", "cena_se_zmenila"];

export async function POST(req: Request) {
  // Rezervace se zakládá jen z našeho webu — cizí origin nemá důvod sem psát.
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && !origin.endsWith(host)) {
    return NextResponse.json({ error: "Neplatný požadavek." }, { status: 403 });
  }

  let telo: unknown;
  try {
    telo = await req.json();
  } catch {
    return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 });
  }

  const rozbor = Vstup.safeParse(telo);
  if (!rozbor.success) {
    return NextResponse.json({ error: cesky(rozbor.error.issues[0]) }, { status: 400 });
  }
  const data = rozbor.data;

  // Honeypot — boti pole vyplní, lidé ho nevidí.
  if (data.web) return NextResponse.json({ ok: true });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (prekrocilLimit(ip)) {
    return NextResponse.json(
      { error: "Příliš mnoho pokusů. Zkuste to prosím za chvíli." },
      { status: 429 },
    );
  }

  const vysledek = await vytvorRezervaci({
    domek: data.domek,
    prijezd: new Date(data.prijezd + "T12:00:00"),
    odjezd: new Date(data.odjezd + "T12:00:00"),
    dospeli: data.hoste,
    doplnky: data.doplnky,
    host: {
      jmeno: data.jmeno,
      email: data.email,
      telefon: data.telefon,
      poznamka: data.poznamka,
    },
    ocekavanaCastkaHalere: data.celkem,
    zdroj: "web",
  });

  if (!vysledek.ok) {
    return NextResponse.json(
      { error: vysledek.zprava, duvod: vysledek.duvod },
      { status: KONFLIKT.includes(vysledek.duvod) ? 409 : 400 },
    );
  }

  const odkaz = vysledek.stav === "hold" ? bezpecnyOdkaz(vysledek.kod) : null;

  // Pošta je až po založení a mimo hlavní cestu: když spadne, rezervace platí
  // dál a majitel ji vidí v administraci.
  void posliMajiteli(data, vysledek).catch((e) =>
    console.error("[rezervace] e-mail majiteli selhal:", e),
  );
  void posliHostovi(data, vysledek, odkaz).catch((e) =>
    console.error("[rezervace] e-mail hostovi selhal:", e),
  );

  return NextResponse.json({
    ok: true,
    kod: vysledek.kod,
    vs: vysledek.vs,
    stav: vysledek.stav,
    celkem: vysledek.celkemHalere,
    zaloha: vysledek.zalohaHalere,
    drziDo: vysledek.drziDo?.toISOString() ?? null,
    // Odkaz nese podpis — kód rezervace sám o sobě je uhodnutelný.
    odkazPlatba: odkaz,
  });
}

function bezpecnyOdkaz(kod: string): string | null {
  // Bez podpisového klíče by odkaz vedl na 404 — to je horší než žádný odkaz.
  // Host v tom případě dostane platební údaje e-mailem.
  if (!podpisyNastaveny()) return null;
  try {
    return odkazNaPlatbu(kod);
  } catch (e) {
    console.error("[rezervace] odkaz na platbu se nepodařilo sestavit:", e);
    return null;
  }
}

/** Potvrzení hostovi s QR platbou. */
async function posliHostovi(data: Data, v: Uspech, odkaz: string | null) {
  const [r] = await radky<{ id: string; platba_id: string | null; unit_name: string }>(
    sql`SELECT r.id::text AS id, u.name AS unit_name,
               (SELECT p.id::text FROM payments p
                 WHERE p.reservation_id = r.id AND p.kind = 'deposit'
                 ORDER BY p.created_at DESC LIMIT 1) AS platba_id
        FROM reservations r JOIN units u ON u.id = r.unit_id WHERE r.code = ${v.kod}`,
  );
  const platba = r?.platba_id ? await pripravPlatbu(r.platba_id) : null;

  await posliPotvrzeniHostovi({
    komu: data.email,
    jmeno: data.jmeno,
    kodRezervace: v.kod,
    domek: r?.unit_name ?? data.domek,
    prijezd: new Date(data.prijezd + "T12:00:00"),
    odjezd: new Date(data.odjezd + "T12:00:00"),
    celkemHalere: v.celkemHalere,
    stav: v.stav,
    drziDo: v.drziDo,
    platba,
    odkazPlatba: odkaz,
  });
}

type Data = z.infer<typeof Vstup>;
type Uspech = Extract<Awaited<ReturnType<typeof vytvorRezervaci>>, { ok: true }>;

async function posliMajiteli(data: Data, v: Uspech) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CONTACT_TO } = process.env;

  const doplnky = Object.entries(data.doplnky)
    .filter(([, q]) => q > 0)
    .map(([id, q]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${esc(id)}</td><td style="padding:4px 0">×${q}</td></tr>`)
    .join("");

  const stavPopis =
    v.stav === "hold"
      ? `Termín je zablokovaný do ${v.drziDo ? formatCzDate(v.drziDo) : "—"}, čeká se na zálohu.`
      : "Termín NENÍ zablokovaný — potvrďte prosím ručně v administraci.";

  const html = `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a18">
    <div style="background:#0c110f;color:#f3efe5;padding:28px 32px;border-radius:16px 16px 0 0">
      <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#d9914e">Sedmý les</p>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:500">
        ${v.stav === "hold" ? "Nová rezervace" : "Nová poptávka"} ${esc(v.kod)}
      </h1>
    </div>
    <div style="border:1px solid #e5e1d5;border-top:none;padding:28px 32px;border-radius:0 0 16px 16px">
      <p style="margin:0 0 18px;padding:12px 14px;background:${v.stav === "hold" ? "#f2f7f2" : "#fdf4e8"};border-radius:10px;font-size:14px">
        ${esc(stavPopis)}
      </p>
      <table style="font-size:15px;line-height:1.6">
        <tr><td style="padding:4px 12px 4px 0;color:#666">Domek</td><td style="padding:4px 0"><strong>${esc(data.domek)}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Termín</td><td style="padding:4px 0"><strong>${esc(data.prijezd)} → ${esc(data.odjezd)}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Hosté</td><td style="padding:4px 0">${data.hoste}</td></tr>
        ${doplnky}
        <tr><td style="padding:12px 12px 4px 0;color:#666">Cena celkem</td><td style="padding:12px 0 4px"><strong style="color:#b06f33;font-size:17px">${esc(formatHalere(v.celkemHalere))}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Záloha</td><td style="padding:4px 0">${esc(formatHalere(v.zalohaHalere))}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Variabilní symbol</td><td style="padding:4px 0"><code>${esc(v.vs)}</code></td></tr>
        <tr><td colspan="2" style="padding:16px 0 4px;border-top:1px solid #eee"></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Jméno</td><td style="padding:4px 0">${esc(data.jmeno, 120)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">E-mail</td><td style="padding:4px 0">${esc(data.email, 160)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Telefon</td><td style="padding:4px 0">${esc(data.telefon, 40) || "—"}</td></tr>
      </table>
      ${data.poznamka ? `<p style="margin-top:16px;padding:14px 16px;background:#f6f4ec;border-radius:10px;font-size:14px;line-height:1.6">${esc(data.poznamka)}</p>` : ""}
    </div>
  </div>`;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log(`[rezervace] ${v.kod} (${v.stav}) založena; SMTP není nastaveno, e-mail se neposílá.`);
    return;
  }

  const transporter = createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 465),
    secure: Number(SMTP_PORT ?? 465) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  await transporter.sendMail({
    from: `"sedmyles.cz — web" <${SMTP_USER}>`,
    to: CONTACT_TO ?? "ahoj@sedmyles.cz",
    replyTo: data.email,
    subject: hlavicka(
      `🌲 ${v.stav === "hold" ? "Rezervace" : "Poptávka"} ${v.kod}: ${data.domek} · ${data.prijezd} → ${data.odjezd}`,
    ),
    html,
  });
}
