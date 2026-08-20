import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ktoJePrihlasen } from "@/lib/auth/session";
import PrihlasovaciFormular from "./formular";

export const metadata: Metadata = {
  title: "Přihlášení",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PrihlaseniPage() {
  if (await ktoJePrihlasen()) redirect("/admin");

  return (
    <main className="flex min-h-svh items-center justify-center bg-night px-5 py-16">
      <div className="w-full max-w-sm">
        <p className="kicker text-sage">Sedmý les</p>
        <h1 className="font-display mt-3 text-3xl text-linen">Administrace</h1>
        <PrihlasovaciFormular />
      </div>
    </main>
  );
}
