import PageHero from "@/components/PageHero";
import CtaBanner from "@/components/CtaBanner";
import Reveal from "@/components/Reveal";
import GalerieMrizka, { type FotkaGalerie } from "@/components/GalerieMrizka";
import JsonLd from "@/components/JsonLd";
import { ArrowIcon } from "@/components/ui";
import { pageMeta, breadcrumbLd } from "@/lib/seo";
import { SITE } from "@/lib/content";

export const metadata = pageMeta({
  title: "Galerie",
  description:
    "Lom Jílové u Držkova, černé domky ve zlatém večeru, interiéry a první sníh. Fotky ze Sedmého lesa.",
  path: "/galerie",
  ogImage: "/foto/lom-dron.jpg",
});

const PHOTOS: FotkaGalerie[] = [
  {
    src: "/foto/lom-dron.jpg",
    alt: "Lom Jílové u Držkova z dronu: tmavá hladina ve tvaru kapky mezi břidlicovými stěnami a lesem",
    caption: "„Lom shora: 60 × 35 metrů vody, kolem břidlice a les.“",
    aspect: "aspect-[16/9]",
    span: "md:col-span-2",
    sizes: "(max-width: 768px) 100vw, 1216px",
  },
  {
    src: "/foto/domek-vecer.jpg",
    alt: "Jeden černý kubický domek za soumraku, teplé světlo z velkého okna",
    caption: "„Soumrak a okno, které topí.“",
    aspect: "aspect-[4/5]",
    sizes: "(max-width: 768px) 100vw, 596px",
  },
  {
    src: "/foto/interier-obyvak.jpg",
    alt: "Interiér domku — petrolejová zeleň, březová překližka a ocelové schůdky na spací patro",
    caption: "„Petrolejová zeleň a překližka.“",
    aspect: "aspect-[4/3]",
    offset: "md:mt-16",
    sizes: "(max-width: 768px) 100vw, 596px",
  },
  {
    src: "/foto/lom-jilove.jpg",
    alt: "Lom Jílové u Držkova: tmavá hladina zrcadlí oblohu s mraky, kolem břízy a smrky, vpravo břidlicová stěna",
    caption: "„Lom Jílové u Držkova — České Chorvatsko.“",
    aspect: "aspect-[4/3]",
    sizes: "(max-width: 768px) 100vw, 596px",
  },
  {
    src: "/foto/lom-breh.jpg",
    alt: "Břeh lomu Jílové u Držkova pod zataženou oblohou, břidlicová stěna a smrky nad hladinou",
    caption: "„Břeh po dešti. Voda jako zrcadlo.“",
    aspect: "aspect-[4/3]",
    sizes: "(max-width: 768px) 100vw, 596px",
  },
  {
    src: "/foto/interier-kuchyne.jpg",
    alt: "Detail plně vybavené kuchyňské linky v tiny housu",
    caption: "„Malá kuchyně, velká snídaně.“",
    aspect: "aspect-[4/5]",
    offset: "md:mt-16",
    sizes: "(max-width: 768px) 100vw, 596px",
  },
  {
    src: "/foto/zima-snih.jpg",
    alt: "Černé kubické domky ve sněhu u lomu, teplá záře z oken",
    caption: "„První sníh a teplo za sklem.“",
    aspect: "aspect-[16/9]",
    span: "md:col-span-2",
    sizes: "(max-width: 768px) 100vw, 1216px",
  },
  {
    src: "/foto/ohniste-vecer.jpg",
    alt: "Ohniště na dřevěné terase za večera",
    caption: "„Večer, oheň a nic víc.“",
    aspect: "aspect-[4/3]",
    sizes: "(max-width: 768px) 100vw, 596px",
  },
  {
    src: "/foto/lom-leto-obec.jpg",
    alt: "Lom Jílové u Držkova v létě, za ním střechy obce a hřebeny Jizerských hor",
    caption: "„Lom, obec a hory za ní.“",
    aspect: "aspect-[4/3]",
    offset: "md:mt-16",
    sizes: "(max-width: 768px) 100vw, 596px",
  },
  {
    src: "/foto/hero-lom-domky.jpg",
    alt: "Vizualizace dvou černých kubických domků na terase nad lomem za zlaté hodiny",
    caption: "„Vizualizace: domky nad lomem, zlatá hodina.“",
    aspect: "aspect-[16/9]",
    span: "md:col-span-2",
    sizes: "(max-width: 768px) 100vw, 1216px",
  },
];

export default function GaleriePage() {
  return (
    <main>
      <JsonLd
        data={breadcrumbLd([
          { name: "Domů", path: "/" },
          { name: "Galerie", path: "/galerie" },
        ])}
      />
      <PageHero
        kicker="Galerie"
        title="Místo, které se"
        accent="nedá vyfotit."
        lead="Ale zkoušíme to. Lom z dronu i od břehu, světlo z okna, první sníh — tady je pár momentů ze Sedmého lesa. Snímky domků jsou zatím vizualizace; skutečné přibudou po dostavbě."
      />

      {/* ===== Editorial galerie ===== */}
      <section className="grain relative overflow-hidden bg-night pb-24 md:pb-32">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <GalerieMrizka fotky={PHOTOS} />

          {/* Instagram ===== */}
          <Reveal className="mt-16 md:mt-24">
            <div className="flex flex-col items-start justify-between gap-7 rounded-[28px] border border-linen/8 bg-pine p-8 transition-colors duration-300 hover:border-ember/30 md:flex-row md:items-center md:p-12">
              <div>
                <h2 className="font-display text-2xl text-linen md:text-3xl">
                  Další fotky přibývají <span className="accent-italic">každou sezónu.</span>
                </h2>
                <p className="mt-3 max-w-md leading-relaxed text-sage">
                  Čerstvé najdete na Instagramu — mlhy, sníh i první borůvky.
                </p>
              </div>
              <a
                href={SITE.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-linen/25 px-7 py-3.5 text-[15px] font-semibold text-linen transition-all duration-300 hover:border-ember hover:text-ember"
              >
                Sledovat @sedmyles.cz <ArrowIcon />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
