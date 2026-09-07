import { NextResponse } from "next/server";
import { adresa, prekrocilLimit } from "@/lib/limit";
import { prijmiFotku } from "@/lib/portal/foto";
import { ktoJePrihlasen } from "@/lib/portal/pristup";

/**
 * Příjem fotky z odjezdového protokolu.
 *
 * Routa je schválně tenká — pravidla příjmu bydlí v `lib/portal/foto.ts`,
 * kde jdou projet testem bez cookies a bez HTTP. Tady zbývá jen přihlášení,
 * strop pokusů a velikost těla.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BAJTU = 25 * 1024 * 1024;
/** Sto fotek na dvanáct zón je s přefocováním velkorysé. Nad to už je to útok. */
const LIMIT = { pocet: 100, oknoMs: 60 * 60 * 1000 };

export async function POST(req: Request) {
  const pobyt = await ktoJePrihlasen();
  if (!pobyt) return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 });

  if (
    prekrocilLimit(`foto:${pobyt.rezervaceId}`, LIMIT) ||
    prekrocilLimit(`foto-ip:${adresa(req)}`, LIMIT)
  ) {
    return NextResponse.json(
      { error: "Fotek přišlo hodně najednou. Zkuste to prosím za chvíli." },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Fotku se nepodařilo přenést. Zkuste to prosím znovu." },
      { status: 400 },
    );
  }

  const soubor = form.get("fotka");
  if (!(soubor instanceof File)) return NextResponse.json({ error: "Chybí fotka." }, { status: 400 });
  if (soubor.size > MAX_BAJTU) {
    return NextResponse.json({ error: "Fotka je moc velká. Zkuste ji vyfotit znovu." }, { status: 413 });
  }

  const v = await prijmiFotku({
    rezervaceId: pobyt.rezervaceId,
    kodRezervace: pobyt.kod,
    odjezd: pobyt.odjezd,
    domekSlug: String(form.get("dum") ?? "") || undefined,
    zona: String(form.get("zona") ?? ""),
    klientId: String(form.get("id") ?? ""),
    data: Buffer.from(await soubor.arrayBuffer()),
  });

  if (!v.ok) {
    return NextResponse.json({ error: v.chyba, kvalita: v.kvalita }, { status: v.stav });
  }
  return NextResponse.json({ ok: true, zona: v.zona, nahled: v.nahled });
}
