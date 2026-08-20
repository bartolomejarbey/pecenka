#!/usr/bin/env node
/**
 * Založení nebo změna hesla administrátorského účtu.
 *
 *   npm run admin:create -- ahoj@sedmyles.cz "Bartoloměj Rota"
 *
 * Heslo se zadává interaktivně, ať nezůstane v historii shellu.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { slabeHeslo, zahashuj } from "../lib/auth/heslo.ts";

const [email, jmeno = "Majitel", role = "owner"] = process.argv.slice(2);
if (!email) {
  console.error('Použití: npm run admin:create -- <e-mail> ["Jméno"] [owner|accountant|cleaner]');
  process.exit(1);
}

/**
 * Heslo bereme z klávesnice, aby nezůstalo v historii shellu. Když skript
 * běží v rouře (CI, skript), přečteme první řádek ze standardního vstupu.
 */
async function nactiHeslo(): Promise<string> {
  if (!stdin.isTTY) {
    const kusy: Buffer[] = [];
    for await (const k of stdin) kusy.push(k as Buffer);
    const prvni = Buffer.concat(kusy).toString("utf8").split("\n")[0].trim();
    if (!prvni) {
      console.error("Ze standardního vstupu nepřišlo heslo.");
      process.exit(1);
    }
    return prvni;
  }
  const rl = createInterface({ input: stdin, output: stdout });
  const heslo = await rl.question("Heslo (min. 12 znaků, malé i velké písmeno, číslice): ");
  const znovu = await rl.question("Heslo znovu: ");
  rl.close();
  if (heslo !== znovu) {
    console.error("Hesla se neshodují.");
    process.exit(1);
  }
  return heslo;
}

const heslo = await nactiHeslo();
const slabe = slabeHeslo(heslo);
if (slabe) {
  console.error(slabe);
  process.exit(1);
}

const hash = await zahashuj(heslo);

const url = process.env.DATABASE_URL;
let dotaz: (t: string, p?: unknown[]) => Promise<{ rows?: unknown[] } | unknown[]>;
let zavri: () => Promise<unknown> | void;

if (url) {
  const postgres = (await import("postgres")).default;
  const sql = postgres(url, { max: 1 });
  dotaz = (t, p = []) => sql.unsafe(t, p as never[]) as never;
  zavri = () => sql.end();
} else {
  const { PGlite } = await import("@electric-sql/pglite");
  const { btree_gist } = await import("@electric-sql/pglite/contrib/btree_gist");
  const { pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm");
  const client = await PGlite.create({
    dataDir: process.env.PGLITE_DIR ?? ".pglite",
    extensions: { btree_gist, pg_trgm },
  });
  dotaz = async (t, p = []) => (await client.query(t, p as never[])).rows;
  zavri = () => client.close();
}

await dotaz(
  `INSERT INTO admin_users (email, name, role, password_hash)
   VALUES ($1, $2, $3, $4)
   ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role,
     password_hash = EXCLUDED.password_hash, is_active = true`,
  [email.toLowerCase(), jmeno, role, hash],
);
console.log(`Účet ${email} (${role}) je připraven. Přihlas se na /admin/prihlaseni.`);
await zavri();
