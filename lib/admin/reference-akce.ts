"use server";

import { revalidatePath } from "next/cache";
import { zapisDoDeniku } from "@/lib/auth/audit";
import { vyzadujMajitele } from "@/lib/auth/dal";
import { nahrajReferenci, smazReferenci } from "./reference";

/** Serverové akce k referenčním snímkům. Vlastní soubor kvůli „use server". */

export type StavReference = { ok?: string; chyba?: string; varovani?: string };

/** Strop je velkorysý — reference se fotí zrcadlovkou stejně jako mobilem. */
const MAX_BAJTU = 30 * 1024 * 1024;

export async function nahrajReferenciAkce(
  _stav: StavReference,
  form: FormData,
): Promise<StavReference> {
  const kdo = await vyzadujMajitele();

  const slug = String(form.get("domek") ?? "");
  const zona = String(form.get("zona") ?? "");
  const soubor = form.get("fotka");

  if (!(soubor instanceof File) || soubor.size === 0) {
    return { chyba: "Vyber prosím fotku." };
  }
  if (soubor.size > MAX_BAJTU) return { chyba: "Fotka je moc velká (nad 30 MB)." };

  const v = await nahrajReferenci(
    slug,
    zona,
    Buffer.from(await soubor.arrayBuffer()),
    kdo.jmeno || kdo.email,
  );
  if (!v.ok) return { chyba: v.chyba };

  await zapisDoDeniku({
    akce: "reference.nahrana",
    typEntity: "baseline_shot",
    idEntity: `${slug}/${zona}`,
    kdo: kdo.id,
    zmena: { domek: slug, zona, novaVerze: v.novaVerze, podobnost: v.podobnostSPredchozi },
  });

  revalidatePath("/admin/reference", "layout");
  // Nízká podobnost s předchozí referencí není chyba, ale majitel se na to
  // má podívat — nahraná koupelna do WC otráví každou další inspekci.
  return v.podobnostSPredchozi !== null && v.podobnostSPredchozi < 60
    ? { ok: v.zprava, varovani: "Zkontroluj prosím, že jsi vybral správnou zónu." }
    : { ok: v.zprava };
}

export async function smazReferenciAkce(
  _stav: StavReference,
  form: FormData,
): Promise<StavReference> {
  const kdo = await vyzadujMajitele();
  const id = String(form.get("snimek") ?? "");

  const v = await smazReferenci(id);
  if (!v.ok) return { chyba: v.chyba ?? "Nepovedlo se." };

  await zapisDoDeniku({
    akce: "reference.smazana", typEntity: "baseline_shot", idEntity: id, kdo: kdo.id,
  });
  revalidatePath("/admin/reference", "layout");
  return { ok: "Smazáno." };
}
