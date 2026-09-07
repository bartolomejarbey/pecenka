import { NextResponse } from "next/server";
import { prihlasHosta } from "@/lib/portal/pristup";

/**
 * Vstup jedním klepnutím z e-mailu.
 *
 * Host dostal e-mail s variabilním symbolem a kódem a dosud je musel opsat
 * do formuláře — na telefonu, mezi dvěma aplikacemi, s kódem, který si musel
 * pamatovat. Odkaz nese totéž, co e-mail, takže nic nového neprozrazuje; jen
 * ušetří to opisování. Formulář zůstává pro případ, že by odkaz nefungoval
 * (přeposlaný e-mail, staré tlačítko).
 *
 * Omezení pokusů a zamykání řeší `prihlasHosta` — tady se jen předá,
 * co přišlo.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const vs = url.searchParams.get("vs") ?? "";
  const kod = url.searchParams.get("kod") ?? "";

  const v = await prihlasHosta(vs, kod);
  const cil = new URL(v.ok ? "/pobyt" : "/pobyt/prihlaseni", url.origin);
  if (!v.ok) cil.searchParams.set("chyba", v.chyba);
  // 303: prohlížeč má cíl načíst jako GET a nemá si odkaz s kódem pamatovat
  // jako trvalé přesměrování.
  return NextResponse.redirect(cil, 303);
}
