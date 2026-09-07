import { redirect } from "next/navigation";
import { ktoJePrihlasen } from "@/lib/portal/pristup";
import { zajistiProtokol } from "@/lib/portal/protokol";
import { nactiStavProtokolu } from "@/lib/portal/vysledek";
import Pruvodce from "./pruvodce";

export const dynamic = "force-dynamic";

/**
 * Foto-protokol.
 *
 * Otevřený je ve dvou případech: dokud host neodeslal, a pak ještě jednou,
 * když jsme ho poprosili o doplňující snímek. V druhém případě se ukážou
 * **jen ty zóny, o které jde** — vracet hosta ke všem dvanácti by znamenalo,
 * že to nechá být.
 */
export default async function ProtokolPage() {
  const pobyt = await ktoJePrihlasen();
  if (!pobyt) redirect("/pobyt/prihlaseni");

  const protokol = await zajistiProtokol(pobyt.rezervaceId);
  // Před příjezdem není co fotit. Host se sem dostane, jen když si adresu
  // uložil do záložek — přehled ho pošle zpátky s vysvětlením.
  const stav = await nactiStavProtokolu(pobyt.rezervaceId);
  if (stav.stav === "prilis_brzy") redirect("/pobyt");

  if (protokol.stav === "needs_photo" && protokol.znovuOtevrene.length) {
    const zony = protokol.zony
      .filter((z) => protokol.znovuOtevrene.includes(z.klic))
      // Zóna se otevírá k přefocení, takže se tváří jako nevyfocená —
      // jinak by host viděl „Uloženo" a neměl důvod cokoli dělat.
      .map((z) => ({ ...z, povinna: true, hotovo: false, fotkaUrl: null }));
    if (zony.length) {
      return (
        <Pruvodce domek={pobyt.domek} zony={zony} viceDomku={protokol.viceDomku} doplneni />
      );
    }
  }

  if (protokol.stav !== "draft") redirect("/pobyt");

  return (
    <Pruvodce domek={pobyt.domek} zony={protokol.zony} viceDomku={protokol.viceDomku} />
  );
}
