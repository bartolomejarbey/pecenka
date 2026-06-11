import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HOUSES } from "@/lib/content";
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
  return {
    title: `Domek ${house.name}`,
    description: `${house.tagline}. ${house.story}`,
  };
}

export default async function HouseDetailPage({ params }: Props) {
  const { slug } = await params;
  const house = HOUSES.find((h) => h.slug === slug);
  if (!house) notFound();

  const other = HOUSES.find((h) => h.slug !== house.slug)!;

  return (
    <main>
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
