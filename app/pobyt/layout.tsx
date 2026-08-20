import type { Metadata } from "next";

/** Portál hosta. Vlastní rozvržení — bez navigace webu i bez lišty cookies. */
export const metadata: Metadata = {
  title: { default: "Váš pobyt", template: "%s — Sedmý les" },
  robots: { index: false, follow: false },
};

export default function PobytLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh bg-night">{children}</div>;
}
