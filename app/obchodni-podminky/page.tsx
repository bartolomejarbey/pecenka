import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Obchodní podmínky",
  description:
    "Obchodní podmínky ubytování Sedmý les — rezervace, platby, storno podmínky, kauce a pravidla pobytu v domcích Achát a Mech.",
};

export default function ObchodniPodminkyPage() {
  const markdown = readFileSync(
    path.join(process.cwd(), "content/obchodni-podminky.md"),
    "utf-8"
  );
  return (
    <LegalPage
      kicker="Dodatek I · Pravidla"
      title="Obchodní podmínky"
      effectiveFrom="11. 6. 2026"
      markdown={markdown}
    />
  );
}
