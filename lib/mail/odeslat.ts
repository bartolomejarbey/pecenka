import "server-only";

import { createTransport, type Transporter } from "nodemailer";

/**
 * Odesílání e-mailů.
 *
 * Bez nastaveného SMTP se zpráva jen zaloguje a odeslání se tváří jako úspěch —
 * web tak funguje i před ostrým napojením pošty a nikomu nespadne rezervace
 * kvůli tomu, že se ještě neřešil e-mail.
 */

export type Priloha = {
  filename: string;
  content: Buffer;
  contentType: string;
  /** Content-ID pro vložení do HTML jako `cid:…`. */
  cid?: string;
};

export type Zprava = {
  komu: string;
  predmet: string;
  html: string;
  text?: string;
  odpovedetNa?: string;
  prilohy?: Priloha[];
};

let prepravce: Transporter | null = null;

function transport(): Transporter | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  if (!prepravce) {
    const port = Number(SMTP_PORT ?? 465);
    prepravce = createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return prepravce;
}

export async function posli(z: Zprava): Promise<boolean> {
  const t = transport();
  if (!t) {
    console.log(`[mail] SMTP není nastaveno — neodesláno: „${z.predmet}" pro ${z.komu}`);
    return false;
  }
  await t.sendMail({
    from: `"Sedmý les" <${process.env.SMTP_USER}>`,
    to: z.komu,
    replyTo: z.odpovedetNa ?? process.env.CONTACT_TO ?? process.env.SMTP_USER,
    subject: z.predmet,
    html: z.html,
    text: z.text,
    attachments: z.prilohy?.map((p) => ({
      filename: p.filename,
      content: p.content,
      contentType: p.contentType,
      cid: p.cid,
    })),
  });
  return true;
}
