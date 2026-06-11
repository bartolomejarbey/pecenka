import type { Metadata } from "next";
import { Marquee } from "@/components/ui";
import CtaBanner from "@/components/CtaBanner";
import Hero from "@/components/home/Hero";
import Story from "@/components/home/Story";
import Houses from "@/components/home/Houses";
import Experiences from "@/components/home/Experiences";
import Evening from "@/components/home/Evening";
import HowItWorks from "@/components/home/HowItWorks";
import Reviews from "@/components/home/Reviews";
import Practical from "@/components/home/Practical";

export const metadata: Metadata = {
  title: { absolute: "Sedmý les — dva tiny housy u zatopeného lomu" },
  description:
    "Dva černé tiny housy na samotě u zatopeného žulového lomu. Ticho, tma a hvězdy, sauna i koupací sud. Celoroční provoz, 90 minut z Prahy i Brna.",
};

const MARQUEE_ITEMS = ["ticho", "mlha nad lomem", "žula", "hvězdy", "oheň", "les", "voda"];

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Story />
      <Marquee items={MARQUEE_ITEMS} tone="ember" />
      <Houses />
      <Experiences />
      <Evening />
      <HowItWorks />
      <Reviews />
      <Practical />
      <CtaBanner />
    </main>
  );
}
