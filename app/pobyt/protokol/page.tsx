import { redirect } from "next/navigation";
import { ktoJePrihlasen } from "@/lib/portal/pristup";
import { zajistiProtokol } from "@/lib/portal/protokol";
import Pruvodce from "./pruvodce";

export const dynamic = "force-dynamic";

export default async function ProtokolPage() {
  const pobyt = await ktoJePrihlasen();
  if (!pobyt) redirect("/pobyt/prihlaseni");

  const protokol = await zajistiProtokol(pobyt.rezervaceId);
  if (protokol.stav !== "draft") redirect("/pobyt");

  return <Pruvodce domek={pobyt.domek} zony={protokol.zony} />;
}
