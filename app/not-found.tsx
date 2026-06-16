import Link from "next/link";
import { Button } from "@/components/ui";

export const metadata = {
  title: "Stránka nenalezena",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="grain contours flex min-h-screen flex-col items-center justify-center bg-night px-6 text-center">
      <p className="kicker text-sage">Chyba 404</p>
      <h1 className="display-hero mt-6 max-w-2xl text-5xl text-linen md:text-7xl">
        Zabloudili jste <span className="accent-italic">hlouběji,</span> než vede cesta.
      </h1>
      <p className="mt-6 max-w-md text-lg leading-relaxed text-sage">
        Tahle stránka v Sedmém lese není. Ale nebojte — zpátky na mýtinu to není daleko.
      </p>
      <div className="mt-10">
        <Button href="/">Zpět na úvod</Button>
      </div>
      <Link href="/rezervace" className="mt-6 text-sm text-sage underline underline-offset-4 hover:text-ember">
        …nebo rovnou rezervovat pobyt
      </Link>
    </main>
  );
}
