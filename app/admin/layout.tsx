import type { Metadata } from "next";

/**
 * Rozvržení administrace.
 *
 * Schválně prázdné — obal s navigací si každá stránka staví přes
 * `components/admin/Shell`, protože potřebuje vědět, která položka svítí
 * a co patří do hlavičky. Hlavní účel tohohle souboru je oddělit administraci
 * od veřejného webu, aby do ní neprosakovala navigace ani lišta cookies.
 */
export const metadata: Metadata = {
  title: { default: "Administrace", template: "%s — Sedmý les" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
