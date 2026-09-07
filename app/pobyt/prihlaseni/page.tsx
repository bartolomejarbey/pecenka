import Image from "next/image";
import { redirect } from "next/navigation";
import LogoMark from "@/components/LogoMark";
import { ktoJePrihlasen } from "@/lib/portal/pristup";
import Formular from "./formular";

export const dynamic = "force-dynamic";

/**
 * Přihlášení do aplikace.
 *
 * Většina hostů sem nikdy nedojde — z e-mailu vede odkaz, který přihlásí
 * jedním klepnutím. Formulář je pro ty, kdo si e-mail přeposlali, mají starý
 * odkaz, nebo si aplikaci otevřeli z plochy na jiném telefonu.
 */
export default async function PrihlaseniPobyt({
  searchParams,
}: {
  searchParams: Promise<{ chyba?: string }>;
}) {
  if (await ktoJePrihlasen()) redirect("/pobyt");
  const { chyba } = await searchParams;

  return (
    <main className="relative flex min-h-svh flex-col justify-end overflow-hidden px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-16">
      <Image
        src="/foto/domek-vecer.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-night/30 via-night/70 to-night" />

      <div className="relative mx-auto w-full max-w-sm">
        <div className="flex items-center gap-2.5 text-linen">
          <LogoMark className="h-6 w-auto" />
          <span className="font-display text-[15px] uppercase tracking-[0.16em]">Sedmý les</span>
        </div>

        <h1 className="font-display mt-6 text-[34px] leading-[1.05] text-linen">Váš pobyt</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-sage">
          Číslo a kód máte v e-mailu s potvrzením. Nejrychlejší je klepnout tam
          na tlačítko <span className="text-linen">Otevřít pobyt</span> — přihlásí vás samo.
        </p>

        <Formular chybaZOdkazu={chyba ?? null} />
      </div>
    </main>
  );
}
