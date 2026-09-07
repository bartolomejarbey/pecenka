import type { Metadata } from "next";

/**
 * Portál hosta. Vlastní rozvržení — bez navigace webu i bez lišty cookies.
 *
 * `appleWebApp` je kvůli tomu, aby se po „Přidat na plochu" otevíral bez
 * lišty Safari, jako aplikace. Bez toho je to záložka s adresním řádkem.
 */
export const metadata: Metadata = {
  title: { default: "Váš pobyt", template: "%s — Sedmý les" },
  robots: { index: false, follow: false },
  manifest: "/pobyt/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Sedmý les",
    statusBarStyle: "black-translucent",
  },
};

export default function PobytLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh bg-night">{children}</div>;
}
