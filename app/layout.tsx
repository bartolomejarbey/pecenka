import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import { SITE, FAQ_ITEMS } from "@/lib/content";

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Sedmý les — dva tiny housy u zatopeného lomu",
    template: "%s — Sedmý les",
  },
  description:
    "Dva černé tiny housy na samotě u zatopeného lomu. Ticho, les, sauna, koupací sud a nebe plné hvězd. Za sedmero horami, hodinu od civilizace.",
  keywords: [
    "tiny house pronájem",
    "tiny house Vysočina",
    "ubytování u lomu",
    "glamping",
    "chata na samotě",
    "víkendový pobyt v přírodě",
    "sauna v lese",
    "romantický pobyt",
  ],
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    url: SITE.url,
    siteName: "Sedmý les",
    title: "Sedmý les — dva tiny housy u zatopeného lomu",
    description:
      "Ticho, les a nebe plné hvězd. Dva černé tiny housy na samotě u zatopeného lomu.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Sedmý les — tiny house u lomu" }],
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "LodgingBusiness",
      name: "Sedmý les",
      url: SITE.url,
      email: SITE.email,
      telephone: SITE.phone,
      description:
        "Pronájem dvou designových tiny housů na samotě u zatopeného lomu. Celoroční provoz, sauna, koupací sud.",
      priceRange: "3 490 Kč – 4 790 Kč / noc",
      address: {
        "@type": "PostalAddress",
        addressRegion: "Kraj Vysočina",
        addressCountry: "CZ",
      },
      amenityFeature: [
        { "@type": "LocationFeatureSpecification", name: "Finská sauna" },
        { "@type": "LocationFeatureSpecification", name: "Koupací sud" },
        { "@type": "LocationFeatureSpecification", name: "Kamna na dřevo" },
        { "@type": "LocationFeatureSpecification", name: "Soukromá terasa" },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.slice(0, 8).map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={`${fraunces.variable} ${hanken.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SmoothScroll>
          <Nav />
          {children}
          <Footer />
          <CookieBanner />
        </SmoothScroll>
      </body>
    </html>
  );
}
