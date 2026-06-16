import CtaBanner from "@/components/CtaBanner";
import SeasonStrip from "@/components/SeasonStrip";
import Hero from "@/components/home/Hero";
import Story from "@/components/home/Story";
import Houses from "@/components/home/Houses";
import Experiences from "@/components/home/Experiences";
import Evening from "@/components/home/Evening";
import HowItWorks from "@/components/home/HowItWorks";
import Practical from "@/components/home/Practical";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  absoluteTitle: "Sedmý les — dva tiny housy u zatopeného lomu",
  title: "Domov",
  description:
    "Dva černé tiny housy na samotě u zatopeného břidlicového lomu nad Jílovým u Držkova, na okraji Českého ráje. Ticho, tma a hvězdy. Hodinu a půl z Prahy.",
  path: "/",
});

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Story />
      <Houses />
      <Experiences />
      <SeasonStrip />
      <Evening />
      <HowItWorks />
      <Practical />
      <CtaBanner />
    </main>
  );
}
