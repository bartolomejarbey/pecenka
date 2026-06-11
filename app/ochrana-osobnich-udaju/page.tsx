import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Ochrana osobních údajů",
  description:
    "Jak Sedmý les nakládá s vašimi osobními údaji — co o vás víme, proč, jak dlouho a jaká máte práva. Srozumitelně, bez paragrafového bludiště.",
};

export default function OchranaOsobnichUdajuPage() {
  const markdown = readFileSync(
    path.join(process.cwd(), "content/ochrana-osobnich-udaju.md"),
    "utf-8"
  );
  return (
    <LegalPage
      kicker="Dodatek II · Soukromí"
      title="Ochrana osobních údajů"
      effectiveFrom="11. 6. 2026"
      markdown={markdown}
    />
  );
}
