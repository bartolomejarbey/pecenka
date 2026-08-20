import type { Config } from "drizzle-kit";

/**
 * Drizzle je tu jen jako dotazovací vrstva — schéma se NEGENERUJE z TypeScriptu.
 * Zdrojem pravdy je SQL v `db/migrations/`, protože obsahuje věci, které Drizzle
 * neumí popsat: `EXCLUDE USING gist … WHERE`, částečné unikátní indexy, CHECK.
 *
 * `npm run db:pull` si typy načte zpátky z živé databáze do `lib/db/schema.ts`.
 */
export default {
  dialect: "postgresql",
  driver: "pglite",
  dbCredentials: { url: process.env.PGLITE_DIR ?? ".pglite" },
  schema: "./lib/db/schema.ts",
  out: "./db/drizzle",
  casing: "snake_case",
} satisfies Config;
