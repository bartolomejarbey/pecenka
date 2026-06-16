/**
 * SEO helpery — jednotná tvorba per-page metadata (canonical, OpenGraph,
 * Twitter) a JSON-LD útržky. metadataBase je nastaven v app/layout.tsx,
 * takže cesty mohou být relativní a Next je dořeší.
 */

import type { Metadata } from "next";
import { SITE } from "./content";

type PageMetaInput = {
  /** Bez sufixu — šablona v layoutu doplní „— Sedmý les". Pro úvod použij absoluteTitle. */
  title: string;
  description: string;
  /** Cesta včetně úvodního lomítka, např. "/domky". */
  path: string;
  /** OG/Twitter náhled; výchozí /og.jpg. */
  ogImage?: string;
  /** Plný titulek bez sufixu (jen pro úvodní stránku). */
  absoluteTitle?: string;
};

export function pageMeta({
  title,
  description,
  path,
  ogImage = "/og.jpg",
  absoluteTitle,
}: PageMetaInput): Metadata {
  const url = path === "/" ? SITE.url : `${SITE.url}${path}`;
  const ogTitle = absoluteTitle ?? `${title} — ${SITE.name}`;
  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "cs_CZ",
      url,
      siteName: SITE.name,
      title: ogTitle,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: ogTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [ogImage],
    },
  };
}

/* ===== JSON-LD útržky ===== */

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE.url}${it.path === "/" ? "" : it.path}`,
    })),
  };
}

/** Strukturovaná data jednoho domku (Accommodation + nabídka). */
export function houseLd(house: {
  slug: string;
  name: string;
  tagline: string;
  area: string;
  photo: string;
  basePrice: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Accommodation",
    "@id": `${SITE.url}/domky/${house.slug}#accommodation`,
    name: `${house.name} — ${SITE.name}`,
    description: house.tagline,
    url: `${SITE.url}/domky/${house.slug}`,
    image: `${SITE.url}${house.photo}`,
    occupancy: { "@type": "QuantitativeValue", maxValue: 2, unitText: "osoby" },
    numberOfRooms: 1,
    petsAllowed: true,
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Velkoformátové prosklení" },
      { "@type": "LocationFeatureSpecification", name: "Spací patro" },
      { "@type": "LocationFeatureSpecification", name: "Klimatizace a tepelné čerpadlo" },
      { "@type": "LocationFeatureSpecification", name: "Kuchyňská linka" },
      { "@type": "LocationFeatureSpecification", name: "Koupelna se sprchou a WC" },
    ],
    offers: {
      "@type": "Offer",
      price: house.basePrice,
      priceCurrency: "CZK",
      availability: "https://schema.org/InStock",
      url: `${SITE.url}/rezervace?domek=${house.slug}`,
    },
  };
}
