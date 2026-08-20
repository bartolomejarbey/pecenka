/** Vygeneruje hostovi přístup do portálu. Použití: node … <kód rezervace> */
const { radky } = await import("../../lib/db/client.ts");
const { sql } = await import("drizzle-orm");
const { zalozPristup } = await import("../../lib/portal/pristup.ts");

const kod = process.argv[2];
if (!kod) { console.error("Použití: pristup-hosta.mts <SL-26-0001>"); process.exit(1); }

const [r] = await radky<{ id: string; variable_symbol: string; code: string }>(
  sql`SELECT id::text AS id, variable_symbol, code FROM reservations WHERE code = ${kod}`,
);
if (!r) { console.error("Rezervace nenalezena."); process.exit(1); }

const pristup = await zalozPristup(r.id);
console.log(`\n  Rezervace         ${r.code}`);
console.log(`  Variabilní symbol ${r.variable_symbol}   ← přihlašovací jméno`);
console.log(`  Přístupový kód    ${pristup}   ← heslo\n`);
process.exit(0);
