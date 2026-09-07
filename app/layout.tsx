import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/content";

/*
 * Fraunces je variabilní font.
 *
 * Výčet vah `["300","400","500","600"]` z něj udělal čtyři pevné řezy, takže
 * `font-weight: 480` v `.display-hero` a `380` v `.accent-italic` se
 * zaokrouhlily — návrh dělal něco jiného, než měl. Bez `weight` se osa
 * 300–700 zapne celá a je to zároveň o dva soubory míň.
 *
 * Kurzíva je zvlášť a **bez předběžného načítání**: je to 86 kB, které
 * blokují stahování hero fotky, a používá ji jen dekorativní `.accent-italic`.
 */
const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
  display: "swap",
});

const frauncesKurziva = Fraunces({
  subsets: ["latin", "latin-ext"],
  style: ["italic"],
  variable: "--font-fraunces-kurziva",
  display: "swap",
  preload: false,
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
  // Bez tohohle nemá `env(safe-area-inset-*)` co vracet a spodní lišta
  // administrace leží na iPhonu pod domovským indikátorem.
  viewportFit: "cover",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={`${fraunces.variable} ${frauncesKurziva.variable} ${hanken.variable}`}>
      <head>
        <script
          // Zapne skrývání [data-reveal] ještě před prvním vykreslením, aby obsah
          // neproblikl. Pojistka: když se JS nenačte do 2,5 s, skrývání vypneme,
          // takže web zůstane čitelný i bez JS.
          dangerouslySetInnerHTML={{
            __html:
              "try{var r=document.documentElement;if(!matchMedia('(prefers-reduced-motion: reduce)').matches){r.setAttribute('data-reveal-armed','');setTimeout(function(){r.hasAttribute('data-reveal-live')||r.removeAttribute('data-reveal-armed')},2500)}}catch(e){}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
