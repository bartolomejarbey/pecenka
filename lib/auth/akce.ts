"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { zapisDoDeniku } from "./audit";
import { overHeslo } from "./heslo";
import { odhlas, zalozRelaci } from "./session";

/** Pokusy o přihlášení podle IP — pět za deset minut. */
const POKUSY = new Map<string, number[]>();
const LIMIT = 5;
const OKNO_MS = 10 * 60 * 1000;

function prekrocilLimit(ip: string): boolean {
  const ted = Date.now();
  const seznam = (POKUSY.get(ip) ?? []).filter((t) => ted - t < OKNO_MS);
  seznam.push(ted);
  POKUSY.set(ip, seznam);
  return seznam.length > LIMIT;
}

export type StavPrihlaseni = { chyba?: string };

export async function prihlas(
  _predchozi: StavPrihlaseni,
  formular: FormData,
): Promise<StavPrihlaseni> {
  const email = String(formular.get("email") ?? "").trim().toLowerCase();
  const heslo = String(formular.get("heslo") ?? "");

  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "neznama";
  if (prekrocilLimit(ip)) {
    return { chyba: "Příliš mnoho pokusů. Zkuste to za deset minut." };
  }
  if (!email || !heslo) return { chyba: "Vyplňte e-mail i heslo." };

  const [uzivatel] = await radky<{ id: string; password_hash: string | null }>(
    sql`SELECT id, password_hash FROM admin_users WHERE email = ${email} AND is_active`,
  );

  // Heslo ověřujeme i u neexistujícího účtu, aby se z doby odpovědi nedalo
  // poznat, které e-maily v systému jsou.
  const sedi = await overHeslo(heslo, uzivatel?.password_hash ?? "scrypt$32768$8$1$AAAA$AAAA");

  if (!uzivatel || !sedi) {
    await zapisDoDeniku({
      akce: "prihlaseni.neuspech",
      typEntity: "admin_user",
      idEntity: email,
      kdoTyp: "system",
    });
    return { chyba: "E-mail nebo heslo nesedí." };
  }

  await zalozRelaci(uzivatel.id);
  await zapisDoDeniku({
    akce: "prihlaseni.uspech",
    typEntity: "admin_user",
    idEntity: uzivatel.id,
    kdo: uzivatel.id,
  });
  redirect("/admin");
}

export async function odhlasSe(): Promise<void> {
  await odhlas();
  redirect("/admin/prihlaseni");
}
