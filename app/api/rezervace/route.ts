import { NextResponse } from "next/server";
import { createTransport } from "nodemailer";

/**
 * Příjem rezervačních poptávek. Pošle e-mail provozovateli (SMTP z env),
 * bez nastaveného SMTP poptávku jen zaloguje a vrátí úspěch — web tak
 * funguje i před ostrým napojením pošty.
 *
 * Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CONTACT_TO
 */

/** České skloňování „noc" pro e-mail provozovateli (1 noc / 2–4 noci / 5+ nocí). */
function nightsLabel(n: number): string {
  if (n === 1) return "1 noc";
  if (n >= 2 && n <= 4) return `${n} noci`;
  return `${n} nocí`;
}

const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const list = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

type Payload = {
  house: string;
  from: string;
  to: string;
  nights: number;
  guests: number;
  addons: { name: string; qty: number; total: number }[];
  total: number;
  name: string;
  email: string;
  phone?: string;
  note?: string;
  web?: string; // honeypot
};

export async function POST(req: Request) {
  let data: Payload;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 });
  }

  // Honeypot — boti pole vyplní, lidé ho nevidí.
  if (data.web) return NextResponse.json({ ok: true });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Příliš mnoho pokusů. Zkuste to prosím za chvíli." },
      { status: 429 },
    );
  }

  if (!data.name || !data.email || !data.house || !data.from || !data.to) {
    return NextResponse.json({ error: "Vyplňte prosím všechna povinná pole." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) {
    return NextResponse.json({ error: "Zadejte prosím platný e-mail." }, { status: 400 });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CONTACT_TO } = process.env;

  const addonLines = (data.addons ?? [])
    .map((a) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${a.name} ×${a.qty}</td><td style="padding:4px 0">${a.total.toLocaleString("cs-CZ")} Kč</td></tr>`)
    .join("");

  const html = `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a18">
    <div style="background:#0c110f;color:#f3efe5;padding:28px 32px;border-radius:16px 16px 0 0">
      <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#d9914e">Sedmý les</p>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:500">Nová poptávka rezervace</h1>
    </div>
    <div style="border:1px solid #e5e1d5;border-top:none;padding:28px 32px;border-radius:0 0 16px 16px">
      <table style="font-size:15px;line-height:1.6">
        <tr><td style="padding:4px 12px 4px 0;color:#666">Domek</td><td style="padding:4px 0"><strong>${data.house}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Termín</td><td style="padding:4px 0"><strong>${data.from} → ${data.to}</strong> (${nightsLabel(data.nights)})</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Hosté</td><td style="padding:4px 0">${data.guests}</td></tr>
        ${addonLines}
        <tr><td style="padding:12px 12px 4px 0;color:#666">Cena celkem</td><td style="padding:12px 0 4px"><strong style="color:#b06f33;font-size:17px">${Number(data.total).toLocaleString("cs-CZ")} Kč</strong></td></tr>
        <tr><td colspan="2" style="padding:16px 0 4px;border-top:1px solid #eee"></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Jméno</td><td style="padding:4px 0">${data.name}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">E-mail</td><td style="padding:4px 0"><a href="mailto:${data.email}">${data.email}</a></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Telefon</td><td style="padding:4px 0">${data.phone || "—"}</td></tr>
      </table>
      ${data.note ? `<p style="margin-top:16px;padding:14px 16px;background:#f6f4ec;border-radius:10px;font-size:14px;line-height:1.6">${String(data.note).slice(0, 2000)}</p>` : ""}
    </div>
  </div>`;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log("[rezervace] SMTP není nastaveno — poptávka:", JSON.stringify(data, null, 2));
    return NextResponse.json({ ok: true });
  }

  try {
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
      subject: `🌲 Poptávka: ${data.house} · ${data.from} → ${data.to} · ${data.name}`,
      html,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[rezervace] odeslání selhalo:", err);
    return NextResponse.json(
      { error: "Odeslání se nepovedlo. Napište nám prosím na ahoj@sedmyles.cz." },
      { status: 500 },
    );
  }
}
