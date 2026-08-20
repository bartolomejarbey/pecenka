"use server";

import { redirect } from "next/navigation";
import { odhlasHosta, prihlasHosta } from "./pristup";

export type StavPrihlaseni = { chyba?: string };

export async function prihlas(
  _predchozi: StavPrihlaseni,
  formular: FormData,
): Promise<StavPrihlaseni> {
  const v = await prihlasHosta(
    String(formular.get("vs") ?? ""),
    String(formular.get("kod") ?? ""),
  );
  if (!v.ok) return { chyba: v.chyba };
  redirect("/pobyt");
}

export async function odhlas(): Promise<void> {
  await odhlasHosta();
  redirect("/pobyt/prihlaseni");
}
