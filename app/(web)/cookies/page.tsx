import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Zásady cookies",
  description:
    "Jaké cookies používá web sedmyles.cz, k čemu slouží a jak udělit nebo odvolat souhlas. Marketingové cookies nepoužíváme.",
};

export default function CookiesPage() {
  const markdown = readFileSync(path.join(process.cwd(), "content/cookies.md"), "utf-8");
  return (
    <LegalPage
      kicker="Dodatek III · Cookies"
      title="Zásady cookies"
      effectiveFrom="11. 6. 2026"
      markdown={markdown}
    />
  );
}
