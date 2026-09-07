import "server-only";

import { cache } from "react";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { sql } from "drizzle-orm";
import { radky } from "@/lib/db/client";
import { portalovyKod } from "@/lib/reservations/vs";
import { overHeslo, zahashuj } from "@/lib/auth/heslo";
import { ukazkaPovolena } from "./ukazka";
import { prekrocilLimit } from "@/lib/limit";

/**
 * Přístup hosta do portálu.
 *
 * Majitel chtěl „hesla jako VS". Samotný variabilní symbol ale stojí na
 * e-mailu, na výpisu z účtu i na faktuře — jako tajemství neobstojí a jde
 * uhodnout (deset číslic s kontrolní číslicí). Kompromis, který zůstal
 * jednoduchý na diktování do telefonu:
 *
 *   · **jméno** = variabilní symbol (host ho má na všem)
 *   · **kód** = osm znaků odvozených z VS tajným klíčem
 *
 * Kód se z VS bez znalosti klíče spočítat nedá, takže enumerací se nikam
 * nedostaneš. Po pěti chybách se přístup na hodinu zamkne.
 */

const COOKIE = "sedmyles_pobyt";
const MAX_POKUSU = 5;
const ZAMEK_MINUT = 60;

export type Pobyt = {
  rezervaceId: string;
  kod: string;
  vs: string;
  /** Křestní jméno plátce — portál hosta oslovuje, ne „Dobrý den". */
  jmeno: string | null;
  domek: string;
  /** Slug fyzického domku — informace k pobytu se liší dům od domu. */
  domekSlug: string;
  prijezd: string;
  odjezd: string;
  stav: string;
};

/**
 * Tajemství, ze kterého se odvozuje přístupový kód i podpis relace.
 *
 * Ve vývoji stačí pevná hodnota, ať `npm run dev` funguje bez nastavování.
 * **Naostro bez klíče se raději vyrobí náhodný** — jinak by si přístupový kód
 * k cizímu pobytu spočítal kdokoli, kdo zná variabilní symbol, a stejně tak
 * by šlo podepsat cookie relace. Selhává to zavřeně: přihlášení nepůjde,
 * ale nikdo se nedostane dovnitř.
 *
 * Že je něco špatně, hlásí přehled stavu systému v administraci.
 */
const VYVOJOVE_TAJEMSTVI = "sedmyles-vyvojove-tajemstvi-nikdy-naostro";
let nahradni: string | null = null;
let uzVarovano = false;

function tajemstviPortalu(): string {
  const k = process.env.PORTAL_SECRET ?? process.env.PAYMENTS_SIGNING_KEY;
  if (k) return k;
  if (process.env.NODE_ENV !== "production") return VYVOJOVE_TAJEMSTVI;

  if (!nahradni) nahradni = randomBytes(32).toString("hex");
  if (!uzVarovano) {
    uzVarovano = true;
    console.error(
      "[portál] PORTAL_SECRET není nastaven — přístupy hostů do portálu " +
        "nebudou fungovat. Nastav proměnnou v prostředí.",
    );
  }
  return nahradni;
}

/** Je přístup do portálu nastavený natrvalo? Bez toho se kódy nemají posílat. */
export const pristupNastaven = () =>
  Boolean(process.env.PORTAL_SECRET ?? process.env.PAYMENTS_SIGNING_KEY) ||
  process.env.NODE_ENV !== "production";

/** Kód, který host dostane e-mailem. Bez matoucích znaků. */
export function vygenerujKod(vs: string): string {
  return portalovyKod(vs, tajemstviPortalu(), 8);
}

/** Založí přístup po zaplacení zálohy. */
export async function zalozPristup(rezervaceId: string): Promise<string> {
  const [r] = await radky<{ variable_symbol: string; checkout: string }>(
    sql`SELECT variable_symbol, checkout::text AS checkout FROM reservations WHERE id = ${rezervaceId}::uuid`,
  );
  if (!r) throw new Error("Rezervace nenalezena.");

  const kod = vygenerujKod(r.variable_symbol);
  const hash = await zahashuj(kod);
  const konec = new Date(r.checkout);
  konec.setDate(konec.getDate() + 14); // portál zůstane otevřený dva týdny po odjezdu

  await radky(sql`
    INSERT INTO guest_portal_access (reservation_id, variable_symbol, access_code_hash,
                                     opens_at, expires_at)
    VALUES (${rezervaceId}::uuid, ${r.variable_symbol}, ${hash}, now(), ${konec.toISOString()}::timestamptz)
    ON CONFLICT (reservation_id) DO UPDATE
      SET access_code_hash = EXCLUDED.access_code_hash, expires_at = EXCLUDED.expires_at,
          failed_attempts = 0, locked_until = NULL
  `);
  return kod;
}

export type VysledekPrihlaseni =
  | { ok: true; pobyt: Pobyt }
  | { ok: false; chyba: string };

export async function prihlasHosta(vs: string, kod: string): Promise<VysledekPrihlaseni> {
  const cistyVs = vs.replace(/\D/g, "");
  const cistyKod = kod.trim().toUpperCase();
  if (!cistyVs || !cistyKod) return { ok: false, chyba: "Vyplňte prosím obojí." };

  /*
   * Strop pokusů z jedné adresy.
   *
   * Počítadlo na řádku přístupu hlídá **jeden** variabilní symbol, ale nic
   * nebránilo zkoušet tisíc symbolů po jednom pokusu. A protože se i pro
   * neexistující VS počítá scrypt (aby odpověď trvala stejně dlouho), stačilo
   * pár set souběžných požadavků a funkce si lehla.
   */
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "neznama";
  if (prekrocilLimit(`portal-login:${ip}`, { pocet: 20, oknoMs: 15 * 60 * 1000 })) {
    return { ok: false, chyba: "Příliš mnoho pokusů. Zkuste to prosím za chvíli." };
  }

  const [pristup] = await radky<{
    id: string;
    reservation_id: string;
    access_code_hash: string;
    opens_at: string;
    expires_at: string;
    failed_attempts: number;
    locked_until: string | null;
  }>(sql`
    SELECT id::text AS id, reservation_id::text AS reservation_id, access_code_hash,
           opens_at::text AS opens_at, expires_at::text AS expires_at,
           failed_attempts, locked_until::text AS locked_until
      FROM guest_portal_access WHERE variable_symbol = ${cistyVs}
  `);

  // Stejná hláška pro neexistující i špatný přístup — jinak by šlo zjišťovat,
  // které variabilní symboly existují.
  const nesedi = { ok: false as const, chyba: "Číslo nebo kód nesedí." };

  if (!pristup) {
    await overHeslo(cistyKod, "scrypt$32768$8$1$AAAA$AAAA"); // ať to trvá stejně dlouho
    return nesedi;
  }
  if (pristup.locked_until && new Date(pristup.locked_until) > new Date()) {
    return { ok: false, chyba: "Přístup je dočasně zamčený. Zkuste to prosím za hodinu." };
  }
  if (new Date(pristup.expires_at) < new Date()) {
    return { ok: false, chyba: "Přístup k tomuhle pobytu už vypršel. Napište nám na ahoj@sedmyles.cz." };
  }

  if (!(await overHeslo(cistyKod, pristup.access_code_hash))) {
    const pokusu = pristup.failed_attempts + 1;
    await radky(sql`
      UPDATE guest_portal_access
         SET failed_attempts = ${pokusu},
             locked_until = ${pokusu >= MAX_POKUSU
               ? new Date(Date.now() + ZAMEK_MINUT * 60_000).toISOString()
               : null}::timestamptz
       WHERE id = ${pristup.id}::uuid
    `);
    return nesedi;
  }

  await radky(sql`
    UPDATE guest_portal_access SET failed_attempts = 0, locked_until = NULL
     WHERE id = ${pristup.id}::uuid
  `);

  const relace = `${pristup.reservation_id}.${otisk(pristup.reservation_id)}`;
  (await cookies()).set(COOKIE, relace, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 14 * 86400,
  });

  const pobyt = await nactiPobyt(pristup.reservation_id);
  return pobyt ? { ok: true, pobyt } : nesedi;
}

function otisk(id: string): string {
  return createHash("sha256").update(tajemstviPortalu() + id).digest("hex").slice(0, 32);
}

/**
 * Kdo je přihlášený v portálu.
 *
 * Kontroluje se **při každém požadavku**, ne jen při přihlášení. Cookie žije
 * čtrnáct dní a dřív stačilo, že sedí podpis: vypršelý přístup, zamčený účet
 * ani zrušená rezervace hosta z portálu nevyhodily. Storno tedy neznamenalo
 * nic — host se dál díval na adresu domku a mohl odeslat protokol.
 */
export const ktoJePrihlasen = cache(async function ktoJePrihlasen(): Promise<Pobyt | null> {
  const hodnota = (await cookies()).get(COOKIE)?.value;
  if (!hodnota) return null;
  const [id, podpis] = hodnota.split(".");
  if (!id || !podpis) return null;
  const ocekavany = Buffer.from(otisk(id));
  const podany = Buffer.from(podpis);
  if (ocekavany.length !== podany.length || !timingSafeEqual(ocekavany, podany)) return null;

  const [platny] = await radky<{ ok: boolean }>(sql`
    SELECT (p.expires_at > now()
            AND (p.locked_until IS NULL OR p.locked_until < now())) AS ok
      FROM guest_portal_access p WHERE p.reservation_id = ${id}::uuid
  `);
  if (!platny?.ok) return null;

  const pobyt = await nactiPobyt(id);
  // Zrušený nebo propadlý pobyt portál zavírá. Host s ním nemá co dělat
  // a hlavně by na něj neměl nahrávat fotky.
  if (!pobyt || pobyt.stav === "cancelled" || pobyt.stav === "expired") return null;
  return pobyt;
});

/**
 * Ukázkové přihlášení bez kódu.
 *
 * Majitel potřebuje portál ukazovat — na schůzce, na telefonu, sobě samému —
 * a opisovat variabilní symbol s osmiznakovým kódem u toho nikdo nechce.
 * Přihlásí do rezervace, kterou dostane, a nastaví tutéž relaci jako běžné
 * přihlášení; portál pak neví, že jde o ukázku, takže se chová **přesně
 * tak jako hostům**. Ukázka, která se chová jinak než provoz, nic neukazuje.
 *
 * **Na ostrých datech nefunguje** — je to obejití přihlášení. Podmínku drží
 * `ukazkaPovolena()`; volající si ji hlídá taky, tohle je jen pojistka.
 */
export async function prihlasUkazkove(rezervaceId: string): Promise<Pobyt | null> {
  if (!ukazkaPovolena()) return null;

  const pobyt = await nactiPobyt(rezervaceId);
  if (!pobyt) return null;

  (await cookies()).set(COOKIE, `${rezervaceId}.${otisk(rezervaceId)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Ukázka je na chvíli, ne na čtrnáct dní.
    maxAge: 8 * 3600,
  });
  return pobyt;
}

export async function odhlasHosta(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

async function nactiPobyt(rezervaceId: string): Promise<Pobyt | null> {
  const [r] = await radky<{
    id: string; code: string; variable_symbol: string; unit_name: string; unit_slug: string;
    checkin: string; checkout: string; status: string; jmeno: string | null;
  }>(sql`
    SELECT r.id::text AS id, r.code, r.variable_symbol, u.name AS unit_name, u.slug AS unit_slug,
           r.checkin::text AS checkin, r.checkout::text AS checkout, r.status::text AS status,
           (SELECT g.first_name FROM reservation_guests rg JOIN guests g ON g.id = rg.guest_id
             WHERE rg.reservation_id = r.id AND rg.role = 'payer' LIMIT 1) AS jmeno
      FROM reservations r JOIN units u ON u.id = r.unit_id
     WHERE r.id = ${rezervaceId}::uuid
  `);
  if (!r) return null;
  return {
    rezervaceId: r.id, kod: r.code, vs: r.variable_symbol, jmeno: r.jmeno?.trim() || null,
    domek: r.unit_name, domekSlug: r.unit_slug,
    prijezd: r.checkin, odjezd: r.checkout, stav: r.status,
  };
}

/** Náhodný kód pro případ, kdy je potřeba přístup vygenerovat znovu. */
export const nahodnyKod = () => {
  const ABECEDA = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from({ length: 8 }, () => ABECEDA[randomInt(ABECEDA.length)]).join("");
};
