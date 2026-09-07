"use server";

import { revalidatePath } from "next/cache";
import { zapisDoDeniku } from "@/lib/auth/audit";
import { vyzadujMajitele } from "@/lib/auth/dal";
import { ULOHY, type Uloha, type VysledekUlohy } from "./ulohy";

/**
 * Ruční spuštění naplánované úlohy.
 *
 * Úlohy běží samy, ale když majitel vidí visící protokol nebo fotky po
 * lhůtě, nemá důvod čekat čtvrt hodiny na plán. Dosud šly vyvolat jen
 * zavoláním adresy s tajemstvím — což znamená otevřít terminál.
 *
 * Volá se přímo funkce routy, ne HTTP: na Vercelu by požadavek sám na sebe
 * znamenal další invokaci a hlavně potřeboval znát vlastní veřejnou adresu.
 */

export async function spustUlohu(_stav: VysledekUlohy, form: FormData): Promise<VysledekUlohy> {
  const kdo = await vyzadujMajitele();
  const klic = String(form.get("uloha") ?? "") as Uloha;
  if (!ULOHY.some((u) => u.klic === klic)) return { chyba: "Neznámá úloha." };

  try {
    const modul = await nactiUlohu(klic);
    // Tajemství se přiloží samo — přihlášený majitel ho nemá kde vzít
    // a psát ho do formuláře by znamenalo mít ho v prohlížeči.
    const url = new URL(`https://localhost/api/cron/${klic}`);
    const hlavicky = new Headers();
    if (process.env.CRON_SECRET) hlavicky.set("authorization", `Bearer ${process.env.CRON_SECRET}`);

    const odpoved = await modul.GET(new Request(url, { headers: hlavicky }));
    const data = (await odpoved.json()) as Record<string, unknown>;

    await zapisDoDeniku({
      akce: "cron.rucne", typEntity: "cron", idEntity: klic, kdo: kdo.id, zmena: data,
    });
    revalidatePath("/admin", "layout");

    if (!odpoved.ok) return { chyba: String(data.error ?? "Úloha skončila chybou.") };
    return { ok: popisVysledku(klic, data) };
  } catch (e) {
    console.error(`[admin] ruční spuštění úlohy ${klic} selhalo:`, e);
    return { chyba: "Úloha spadla. Podrobnosti jsou v logu." };
  }
}

/** Statické importy — dynamická cesta by se do balíčku funkce nedostala. */
async function nactiUlohu(klic: Uloha): Promise<{ GET: (r: Request) => Promise<Response> }> {
  switch (klic) {
    case "vyhodnoceni":
      return import("@/app/api/cron/vyhodnoceni/route");
    case "retence":
      return import("@/app/api/cron/retence/route");
    case "expirace-drzeni":
      return import("@/app/api/cron/expirace-drzeni/route");
    case "doplatky":
      return import("@/app/api/cron/doplatky/route");
    case "souhrn":
      return import("@/app/api/cron/souhrn/route");
  }
}

function popisVysledku(klic: Uloha, data: Record<string, unknown>): string {
  const c = (k: string) => Number(data[k] ?? 0);
  switch (klic) {
    case "vyhodnoceni":
      return c("nalezeno") === 0
        ? "Nic neviselo, všechno je vyhodnocené."
        : `Dotaženo ${c("hotovo")} z ${c("nalezeno")} protokolů.`;
    case "retence":
      return c("nalezeno") === 0
        ? "Žádné fotky po lhůtě, nic k mazání."
        : `Smazáno ${c("smazano")} z ${c("nalezeno")} fotek po lhůtě.`;
    default:
      return "Hotovo.";
  }
}
