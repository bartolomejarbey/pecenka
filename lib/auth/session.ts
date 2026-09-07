import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";

/**
 * Přihlášení do administrace.
 *
 * Token v cookie je náhodných 32 bajtů; v databázi leží jen jeho SHA-256 otisk,
 * takže z odcizené databáze se přihlásit nedá. Dvě lhůty: **absolutní** (30 dní,
 * po ní se musí přihlásit znovu za všech okolností) a **nečinnostní** (12 hodin).
 * Majitel se do systému dívá z telefonu venku — kdyby ho ztratil, ať okno není
 * nekonečné.
 */

const COOKIE = "sedmyles_admin";
const NECINNOST_H = 12;
const ABSOLUTNI_D = 30;

export type Prihlaseny = {
  id: string;
  email: string;
  jmeno: string;
  role: "owner" | "accountant" | "cleaner";
};

const otisk = (token: string) => createHash("sha256").update(token).digest("hex");

export async function zalozRelaci(uzivatelId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const h = await headers();
  const ted = Date.now();

  await radky(sql`
    INSERT INTO admin_sessions (admin_user_id, token_hash, idle_expires_at, absolute_expires_at, ip, user_agent_hash)
    VALUES (${uzivatelId}::uuid, ${otisk(token)},
            ${new Date(ted + NECINNOST_H * 3600_000).toISOString()}::timestamptz,
            ${new Date(ted + ABSOLUTNI_D * 86400_000).toISOString()}::timestamptz,
            ${h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null}::inet,
            ${createHash("sha256").update(h.get("user-agent") ?? "").digest("hex").slice(0, 32)})
  `);
  await radky(sql`UPDATE admin_users SET last_login_at = now() WHERE id = ${uzivatelId}::uuid`);

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ABSOLUTNI_D * 86400,
  });
}

/**
 * Kdo je přihlášený. `null`, když nikdo — volající rozhodne, co s tím.
 *
 * Volá se ze čtyřiceti míst: z každé stránky administrace, z každé serverové
 * akce, z každé routy. Bez `cache()` se to při jednom vykreslení stránky
 * provede několikrát a pokaždé to znamenalo **dva** dotazy do databáze —
 * čtení a zápis lhůty. Teď je to jeden dotaz na požadavek.
 *
 * Čtení a posunutí lhůty se spojilo do jednoho příkazu: `UPDATE … RETURNING`
 * uvnitř CTE. Ušetří to round-trip, který se platí před vším ostatním.
 */
export const ktoJePrihlasen = cache(async function ktoJePrihlasen(): Promise<Prihlaseny | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const [radek] = await radky<{
    id: string;
    email: string;
    name: string;
    role: Prihlaseny["role"];
  }>(sql`
    WITH relace AS (
      UPDATE admin_sessions
         SET last_seen_at = now(),
             idle_expires_at = LEAST(now() + interval '${sql.raw(String(NECINNOST_H))} hours',
                                     absolute_expires_at)
       WHERE token_hash = ${otisk(token)}
         AND revoked_at IS NULL
         AND idle_expires_at > now()
         AND absolute_expires_at > now()
      RETURNING admin_user_id
    )
    SELECT u.id, u.email, u.name, u.role
      FROM relace r JOIN admin_users u ON u.id = r.admin_user_id
     WHERE u.is_active
  `);
  if (!radek) return null;

  return { id: radek.id, email: radek.email, jmeno: radek.name, role: radek.role };
});

export async function odhlas(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await radky(sql`UPDATE admin_sessions SET revoked_at = now() WHERE token_hash = ${otisk(token)}`);
  }
  jar.delete(COOKIE);
}
