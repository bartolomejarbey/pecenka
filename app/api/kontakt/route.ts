import { NextResponse } from "next/server";
import { createTransport } from "nodemailer";

/** Kontaktní formulář — stejný princip jako /api/rezervace. */

const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

export async function POST(req: Request) {
  let data: { name?: string; email?: string; message?: string; web?: string };
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 });
  }

  if (data.web) return NextResponse.json({ ok: true });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Příliš mnoho pokusů. Zkuste to prosím za chvíli." },
      { status: 429 },
    );
  }

  if (!data.name || !data.email || !data.message) {
    return NextResponse.json({ error: "Vyplňte prosím všechna pole." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) {
    return NextResponse.json({ error: "Zadejte prosím platný e-mail." }, { status: 400 });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CONTACT_TO } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log("[kontakt] SMTP není nastaveno — zpráva:", JSON.stringify(data, null, 2));
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
      subject: `🌲 Zpráva z webu: ${data.name}`,
      text: `Od: ${data.name} <${data.email}>\n\n${String(data.message).slice(0, 5000)}`,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[kontakt] odeslání selhalo:", err);
    return NextResponse.json(
      { error: "Odeslání se nepovedlo. Napište nám prosím na ahoj@sedmyles.cz." },
      { status: 500 },
    );
  }
}
