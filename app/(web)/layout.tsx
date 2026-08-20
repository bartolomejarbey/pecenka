import RevealObserver from "@/components/RevealObserver";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import { SITE, FAQ_ITEMS } from "@/lib/content";

/**
 * Rozvržení veřejného webu — navigace, patička, lišta cookies a JSON-LD.
 *
 * Administrace je vedle v `app/admin` a schválně nic z tohohle nedědí:
 * provozovatel nepotřebuje uprostřed práce koukat na tlačítko „Rezervovat"
 * ani na lištu cookies.
 */

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

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
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
      <RevealObserver />
      <Nav />
      <div id="obsah" tabIndex={-1} className="outline-none">
        {children}
      </div>
      <Footer />
      <CookieBanner />
    </>
  );
}
