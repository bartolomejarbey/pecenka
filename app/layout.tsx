import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  themeColor: "#0c110f",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Sedmý les — dva tiny housy u zatopeného lomu",
    template: "%s — Sedmý les",
  },
  description:
    "Dva černé tiny housy na samotě u zatopeného břidlicového lomu nad Jílovým u Držkova, na okraji Českého ráje. Ticho, les a nebe plné hvězd. Saunu a koupací sud teprve připravujeme. Za sedmero horami, hodinu a půl od Prahy.",
  applicationName: "Sedmý les",
  authors: [{ name: "Sedmý les" }],
  alternates: { canonical: "/" },
  keywords: [
    "tiny house pronájem",
    "tiny house Český ráj",
    "ubytování Jílové u Držkova",
    "tiny house Liberecký kraj",
    "ubytování u lomu",
    "glamping",
    "chata na samotě",
    "víkendový pobyt v přírodě",
    "romantický pobyt",
  ],
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    url: SITE.url,
    siteName: "Sedmý les",
    title: "Sedmý les — dva tiny housy u zatopeného lomu",
    description:
      "Ticho, les a nebe plné hvězd. Dva černé tiny housy na samotě u zatopeného břidlicového lomu na okraji Českého ráje.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Sedmý les — tiny housy u zatopeného lomu" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sedmý les — dva tiny housy u zatopeného lomu",
    description:
      "Ticho, les a nebe plné hvězd. Dva černé tiny housy na samotě u zatopeného lomu na okraji Českého ráje.",
    images: ["/og.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      url: SITE.url,
      name: "Sedmý les",
      inLanguage: "cs-CZ",
      publisher: { "@id": `${SITE.url}/#business` },
    },
    {
      "@type": "LodgingBusiness",
      "@id": `${SITE.url}/#business`,
      name: "Sedmý les",
      url: SITE.url,
      email: SITE.email,
      telephone: SITE.phone,
      image: `${SITE.url}/og.jpg`,
      sameAs: [SITE.instagram],
      description:
        "Pronájem dvou designových tiny housů na samotě u zatopeného břidlicového lomu nad Jílovým u Držkova, na okraji Českého ráje. Celoroční provoz, velkoformátové prosklení, koupání v lomu.",
      priceRange: "2 890 Kč – 3 890 Kč / noc",
      currenciesAccepted: "CZK",
      numberOfRooms: 2,
      petsAllowed: true,
      checkinTime: "15:00",
      checkoutTime: "11:00",
      areaServed: ["Český ráj", "Liberecký kraj", "Praha"],
      makesOffer: {
        "@type": "AggregateOffer",
        priceCurrency: "CZK",
        lowPrice: 2890,
        highPrice: 3890,
        offerCount: 2,
      },
      address: {
        "@type": "PostalAddress",
        addressLocality: "Jílové u Držkova",
        addressRegion: "Liberecký kraj",
        addressCountry: "CZ",
      },
      geo: { "@type": "GeoCoordinates", latitude: 50.671, longitude: 15.295 },
      amenityFeature: [
        { "@type": "LocationFeatureSpecification", name: "Velkoformátové prosklení" },
        { "@type": "LocationFeatureSpecification", name: "Klimatizace a tepelné čerpadlo" },
        { "@type": "LocationFeatureSpecification", name: "Spací patro" },
        { "@type": "LocationFeatureSpecification", name: "Koupání v lomu" },
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
    {
      "@type": "TouristAttraction",
      name: "Zatopený břidlicový lom u Jílového u Držkova",
      description:
        "Bývalý břidlicový lom s křišťálově čistou vodou na okraji Českého ráje — koupání, skoky ze skály a otužování. Místní mu říkají České Chorvatsko.",
      geo: { "@type": "GeoCoordinates", latitude: 50.671, longitude: 15.295 },
      isAccessibleForFree: true,
      touristType: ["koupání", "otužování", "příroda"],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={`${fraunces.variable} ${hanken.variable}`}>
      <body>
        <a
          href="#obsah"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ember focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-night"
        >
          Přeskočit na obsah
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SmoothScroll>
          <Nav />
          <div id="obsah" tabIndex={-1} className="outline-none">
            {children}
          </div>
          <Footer />
          <CookieBanner />
        </SmoothScroll>
      </body>
    </html>
  );
}
