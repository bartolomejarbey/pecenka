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
    "Dva černé tiny housy na samotě u zatopeného břidlicového lomu nad Jílovým u Držkova, na okraji Českého ráje. Ticho, tma a hvězdy; saunu a koupací sud připravujeme. Celoroční provoz, do 90 minut z Prahy.",
};

const MARQUEE_ITEMS = ["ticho", "mlha nad lomem", "břidlice", "hvězdy", "oheň", "les", "voda"];

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
