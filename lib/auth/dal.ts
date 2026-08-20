import "server-only";

import { redirect } from "next/navigation";
import { ktoJePrihlasen, type Prihlaseny } from "./session";

/**
 * Jediná brána do administrace.
 *
 * Každá stránka i akce v `/admin` volá `vyzadujPrihlaseni()`. Kontrola se
 * schválně nedělá jen v `proxy.ts` — proxy je vrstva navíc, ne ochrana:
 * stačí jedna chyba v `matcher` a stránka je venku. Ověřovat se musí tam,
 * kde se čtou data.
 */
export async function vyzadujPrihlaseni(): Promise<Prihlaseny> {
  const kdo = await ktoJePrihlasen();
  if (!kdo) redirect("/admin/prihlaseni");
  return kdo;
}

/** Pro role, které smějí měnit peníze a doklady. */
export async function vyzadujMajitele(): Promise<Prihlaseny> {
  const kdo = await vyzadujPrihlaseni();
  if (kdo.role === "cleaner") redirect("/admin");
  return kdo;
}
