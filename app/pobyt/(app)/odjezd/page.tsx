import { redirect } from "next/navigation";
import { ktoJePrihlasen } from "@/lib/portal/pristup";
import { zajistiProtokol } from "@/lib/portal/protokol";
import { nactiStavProtokolu } from "@/lib/portal/vysledek";
import { nactiInfoDomku } from "@/lib/admin/pobyt";
import Dokonceni from "./dokonceni";

export const dynamic = "force-dynamic";

/**
 * Dokončení pobytu.
 *
 * Vlastní adresa, vlastní název a jeden krok navíc oproti tomu, co tu bylo:
 * host nejdřív vidí, **z čeho se odjezd skládá**, a teprve pak jde fotit.
 * Bez toho měl na displeji jediné tlačítko „Začít fotit" a netušil, jestli
 * je to všechno, nebo první z deseti obrazovek.
 *
 * Slovo „protokol" se tady neobjeví. Je to naše slovo, ne hostovo.
 */
export default async function OdjezdPage() {
  const pobyt = await ktoJePrihlasen();
  if (!pobyt) redirect("/pobyt/prihlaseni");

  const stav = await nactiStavProtokolu(pobyt.rezervaceId);
  if (stav.stav === "prilis_brzy") redirect("/pobyt");

  const [protokol, info] = await Promise.all([
    zajistiProtokol(pobyt.rezervaceId),
    nactiInfoDomku(pobyt.domekSlug),
  ]);

  const povinne = protokol.zony.filter((z) => z.povinna);
  const hotovo = povinne.filter((z) => z.hotovo).length;

  return (
    <main className="mx-auto max-w-lg px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <h1 className="font-display text-[34px] leading-[1.05] text-linen">Dokončení pobytu</h1>
      <p className="mt-2.5 text-[15.5px] leading-relaxed text-sage">
        {pobyt.domek} · odjezd{" "}
        {new Date(pobyt.odjezd).toLocaleDateString("cs-CZ", {
          weekday: "long",
          day: "numeric",
          month: "numeric",
        })}{" "}
        do {info?.odjezdDo ?? "10:00"}
      </p>

      <Dokonceni
        hotovoZon={hotovo}
        povinnychZon={povinne.length}
        chybiZon={protokol.povinnychZbyva}
        odeslano={protokol.stav !== "draft" && protokol.stav !== "needs_photo"}
        pocatecni={stav}
      />
    </main>
  );
}
