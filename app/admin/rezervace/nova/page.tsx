import type { Metadata } from "next";
import { vyzadujPrihlaseni } from "@/lib/auth/dal";
import Shell from "@/components/admin/Shell";
import { Karta } from "@/components/admin/prvky";
import NovaRezervace from "./formular";

export const metadata: Metadata = { title: "Nová rezervace", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function NovaRezervacePage() {
  const kdo = await vyzadujPrihlaseni();

  return (
    <Shell kdo={kdo} aktivni="/admin/rezervace" nadpis="Nová rezervace">
      <Karta nadpis="Rezervace mimo web">
        <div className="px-5 py-5">
          <NovaRezervace />
        </div>
      </Karta>
    </Shell>
  );
}
