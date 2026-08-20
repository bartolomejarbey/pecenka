import "server-only";

import { createHash, randomBytes } from "node:crypto";
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

/** Kdo je přihlášený. `null`, když nikdo — volající rozhodne, co s tím. */
export async function ktoJePrihlasen(): Promise<Prihlaseny | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const [radek] = await radky<{
    session_id: string;
    id: string;
    email: string;
    name: string;
    role: Prihlaseny["role"];
  }>(sql`
    SELECT s.id AS session_id, u.id, u.email, u.name, u.role
    FROM admin_sessions s JOIN admin_users u ON u.id = s.admin_user_id
    WHERE s.token_hash = ${otisk(token)}
      AND s.revoked_at IS NULL
      AND s.idle_expires_at > now()
      AND s.absolute_expires_at > now()
      AND u.is_active
  `);
  if (!radek) return null;

  // Posunutí nečinnostní lhůty. Zapisuje se při každém požadavku — u jednoho
  // uživatele je to zanedbatelné a je to jednodušší než tabulka s heartbeatem.
  await radky(sql`
    UPDATE admin_sessions
    SET last_seen_at = now(),
        idle_expires_at = LEAST(now() + interval '${sql.raw(String(NECINNOST_H))} hours', absolute_expires_at)
    WHERE id = ${radek.session_id}::uuid
  `);

  return { id: radek.id, email: radek.email, jmeno: radek.name, role: radek.role };
}

export async function odhlas(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await radky(sql`UPDATE admin_sessions SET revoked_at = now() WHERE token_hash = ${otisk(token)}`);
  }
  jar.delete(COOKIE);
}
