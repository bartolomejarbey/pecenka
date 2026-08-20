/**
 * Zavaděč pro vývojové skripty.
 *
 * Řeší dvě věci, které v obyčejném Node nefungují, ale v Next.js ano:
 *  · `server-only` — stráž proti tomu, aby se serverový kód dostal do
 *    prohlížeče. Ve skriptu jsme na serveru, takže ji nahradíme prázdnem.
 *  · importy bez přípony (`./prompt`) a s aliasem (`@/lib/…`).
 *
 * Použití:  node --import ./scripts/dev/bez-server-only.mjs <skript>
 */
import { register } from "node:module";

const hak = `
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PRIPONY = ["", ".ts", ".tsx", ".mts", ".js", "/index.ts", "/index.tsx"];

function najdi(zaklad) {
  for (const p of PRIPONY) {
    const cesta = zaklad + p;
    try { if (fs.statSync(cesta).isFile()) return pathToFileURL(cesta).href; } catch {}
  }
  return null;
}

export async function resolve(specifier, context, next) {
  if (specifier === "server-only" || specifier === "client-only") {
    return { url: "data:text/javascript,export{}", shortCircuit: true };
  }
  // Next.js runtime mimo Next neexistuje. Skripty ho nepotřebují — sáhnou
  // rovnou do databáze — ale moduly ho mají v importech.
  if (specifier === "next/headers") {
    return {
      url: "data:text/javascript," + encodeURIComponent(
        "export const cookies = async () => ({ get: () => undefined, set: () => {}, delete: () => {} });" +
        "export const headers = async () => new Map();"),
      shortCircuit: true,
    };
  }
  if (specifier === "next/cache") {
    return {
      url: "data:text/javascript," + encodeURIComponent("export const revalidatePath = () => {};"),
      shortCircuit: true,
    };
  }
  if (specifier === "next/navigation") {
    return {
      url: "data:text/javascript," + encodeURIComponent(
        "export const redirect = (u) => { throw new Error('redirect ' + u); };" +
        "export const notFound = () => { throw new Error('notFound'); };"),
      shortCircuit: true,
    };
  }
  // Do node_modules nesaháme — knihovny mají vlastní pravidla (JSON importy,
  // podmíněné exporty) a naše doplňování přípon by je rozbilo.
  const zNodeModules = context.parentURL?.includes("/node_modules/");
  if (!zNodeModules && !specifier.endsWith(".json")) {
    if (specifier.startsWith("@/")) {
      const url = najdi(path.resolve(process.cwd(), specifier.slice(2)));
      if (url) return { url, shortCircuit: true };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const url = najdi(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier));
      if (url) return { url, shortCircuit: true };
    }
  }
  return next(specifier, context);
}
`;

register("data:text/javascript," + encodeURIComponent(hak), import.meta.url);
