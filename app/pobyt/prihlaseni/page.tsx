import { redirect } from "next/navigation";
import LogoMark from "@/components/LogoMark";
import { ktoJePrihlasen } from "@/lib/portal/pristup";
import Formular from "./formular";

export const dynamic = "force-dynamic";

export default async function PrihlaseniPobyt() {
  if (await ktoJePrihlasen()) redirect("/pobyt");

  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 text-linen">
          <LogoMark className="h-6 w-auto" />
          <span className="font-display text-[15px] uppercase tracking-[0.16em]">Sedmý les</span>
        </div>

        <h1 className="font-display mt-8 text-3xl text-linen">Váš pobyt</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-sage">
          Přihlaste se číslem, které máte na potvrzení rezervace, a přístupovým
          kódem z e-mailu.
        </p>

        <Formular />
      </div>
    </main>
  );
}
