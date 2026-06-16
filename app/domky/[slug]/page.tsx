import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HOUSES, PRICING } from "@/lib/content";
import { breadcrumbLd, houseLd, pageMeta } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import HouseHero from "@/components/house/HouseHero";
import HouseStory from "@/components/house/HouseStory";
import Signature from "@/components/house/Signature";
import Amenities from "@/components/house/Amenities";
import HouseGallery from "@/components/house/HouseGallery";
import Availability from "@/components/house/Availability";
import OtherHouse from "@/components/house/OtherHouse";
import CtaBanner from "@/components/CtaBanner";

export const dynamicParams = false;

export function generateStaticParams() {
  return HOUSES.map((house) => ({ slug: house.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const house = HOUSES.find((h) => h.slug === slug);
  if (!house) return {};
  return pageMeta({
    title: `Domek ${house.name}`,
    description: house.metaDescription,
    path: `/domky/${house.slug}`,
    ogImage: house.photo,
  });
}

export default async function HouseDetailPage({ params }: Props) {
  const { slug } = await params;
  const house = HOUSES.find((h) => h.slug === slug);
  if (!house) notFound();

  const other = HOUSES.find((h) => h.slug !== house.slug)!;

  return (
    <main>
      <JsonLd
        data={[
          houseLd({
            slug: house.slug,
            name: house.name,
            tagline: house.tagline,
            area: house.area,
            photo: house.photo,
            basePrice: PRICING.baseNight,
          }),
          breadcrumbLd([
            { name: "Domů", path: "/" },
            { name: "Domky", path: "/domky" },
            { name: house.name, path: `/domky/${house.slug}` },
          ]),
        ]}
      />
      <HouseHero house={house} />
      <HouseStory house={house} />
      <Signature house={house} />
      <Amenities house={house} />
      <HouseGallery house={house} />
      <Availability slug={house.slug} houseName={house.name} />
      <OtherHouse house={other} />
      <CtaBanner />
    </main>
  );
}
