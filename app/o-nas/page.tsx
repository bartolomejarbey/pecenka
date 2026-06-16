import Image from "next/image";
import PageHero from "@/components/PageHero";
import CtaBanner from "@/components/CtaBanner";
import Reveal from "@/components/Reveal";
import Counter from "@/components/Counter";
import JsonLd from "@/components/JsonLd";
import { Kicker } from "@/components/ui";
import { PLANNED } from "@/lib/content";
import { breadcrumbLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "O nás",
  description:
    "Příběh Sedmého lesa — dva tiny housy u zatopeného lomu na okraji Českého ráje. Proč jsme to postavili a co teprve přibude.",
  path: "/o-nas",
});

const VALUES = [
  {
    value: 15,
    suffix: " m²",
    label: "stačí na velký zážitek",
  },
  {
    value: 2,
    suffix: " domky",
    label: "Achát a Mech, každý pro dva",
  },
  {
    value: "0",
    suffix: " kamen",
    label: "topí tiché tepelné čerpadlo",
  },
  {
    value: "∞",
    suffix: "",
    label: "hvězd nad tmavou oblohou",
  },
];

export default function ONasPage() {
  return (
    <main>
      <JsonLd
        data={breadcrumbLd([
          { name: "Domů", path: "/" },
          { name: "O nás", path: "/o-nas" },
        ])}
      />
      <PageHero
        kicker="O nás"
        title="Proč Sedmý"
        accent="les."
        lead="Začalo to jednoduchou myšlenkou: postavit u vody dva malé domky, do kterých se vejde jen to nejdůležitější — ticho, výhled a dva lidé. Bez wellness centra, bez recepce, bez zbytečností. Jen les, lom a vy."
      />

      {/* ===== Kapitola I · Proč tiny housy (tmavá) ===== */}
      <section className="grain relative overflow-hidden bg-night pb-24 md:pb-32">
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 md:grid-cols-2 md:gap-16 md:px-8">
          <div>
            <Reveal>
              <Kicker>Kapitola I · Malá stopa</Kicker>
            </Reveal>
            <Reveal i={1}>
              <h2 className="font-display mt-6 max-w-xl text-4xl text-linen md:text-5xl">
                Malý domek, <span className="accent-italic">velký zážitek.</span>
              </h2>
            </Reveal>
            <Reveal i={2}>
              <p className="mt-7 max-w-md text-[16px] leading-relaxed text-sage">
                Patnáct metrů čtverečních zní málo. Ale když má domek strop tři a půl metru a
                celou stěnu ze skla, je uvnitř víc prostoru, než čekáte — a venku celý les. Stavěli
                jsme schválně malé: méně místa k zaplnění věcmi, víc důvodů být venku a u sebe.
              </p>
            </Reveal>
            <Reveal i={3}>
              <p className="mt-5 max-w-md text-[16px] leading-relaxed text-sage">
                Černé kubusy se mezi stromy skoro ztratí. Lehce stojí na zemi, nechávají po sobě
                malou stopu a kolem nich zůstává les lesem. To je celá filozofie Sedmého lesa —
                přidat co nejmíň, abyste si odnesli co nejvíc.
              </p>
            </Reveal>
          </div>
          <Reveal>
            <figure className="group">
              <div className="photo-frame relative aspect-[4/5] overflow-hidden rounded-[34px] border border-linen/8">
                <Image
                  src="/foto/hero-lom-domky.jpg"
                  alt="Dva černé kubické tiny housy nad tmavou hladinou zatopeného břidlicového lomu"
                  fill
                  sizes="(max-width: 768px) 100vw, 596px"
                  className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-night/60 to-transparent" />
              </div>
              <figcaption className="font-display mt-4 text-lg italic text-sage md:mt-5">
                „Dva domky a celá hladina lomu jen pro vás.“
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* ===== Statistický pás ===== */}
      <section className="grain relative overflow-hidden bg-bark py-20 md:py-24">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 md:gap-x-10">
            {VALUES.map((stat, i) => (
              <Reveal key={stat.label} i={i}>
                <p className="font-display text-4xl text-ember md:text-5xl">
                  <Counter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-2 text-[13.5px] leading-snug text-sage">{stat.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Kapitola II · Místo a lom (světlá) ===== */}
      <section className="grain relative overflow-hidden bg-mist py-24 text-night md:py-32">
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 md:grid-cols-2 md:gap-16 md:px-8">
          <Reveal className="md:order-2">
            <figure className="group">
              <div className="photo-frame relative aspect-[4/3] overflow-hidden rounded-[34px] border border-night/10">
                <Image
                  src="/foto/koupani-lom.jpg"
                  alt="Koupání v křišťálově čisté vodě zatopeného břidlicového lomu pod skalní stěnou"
                  fill
                  sizes="(max-width: 768px) 100vw, 596px"
                  className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                />
              </div>
              <figcaption className="font-display mt-4 text-lg italic text-night/55 md:mt-5">
                „Místní mu neřeknou jinak než České Chorvatsko.“
              </figcaption>
            </figure>
          </Reveal>
          <div className="md:order-1">
            <Reveal>
              <Kicker tone="light">Kapitola II · Místo</Kicker>
            </Reveal>
            <Reveal i={1}>
              <h2 className="font-display mt-6 max-w-xl text-4xl md:text-5xl">
                Lom, který se{" "}
                <span className="font-display italic text-ember-deep">napustil vodou.</span>
              </h2>
            </Reveal>
            <Reveal i={2}>
              <p className="mt-7 max-w-md text-[16px] leading-relaxed text-night/60">
                Domky stojí na samotě u zatopeného břidlicového lomu nad Jílovým u Držkova, na
                okraji Českého ráje v Libereckém kraji. Kdysi se tu lámala břidlice — dnes je z
                jámy jezírko s tak čistou vodou, že mu místní neřeknou jinak než České Chorvatsko.
              </p>
            </Reveal>
            <Reveal i={3}>
              <p className="mt-5 max-w-md text-[16px] leading-relaxed text-night/60">
                Skalní města, vyhlídky a hrady Českého ráje začínají hned za kopcem, sklářský
                Železný Brod je pět kilometrů odsud. Přesnou polohu ale prozradíme až s potvrzenou
                rezervací — soukromí hostů i kouzlo místa chráníme i takhle.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== Kapitola III · Ticho, tma, detox (tmavá) ===== */}
      <section className="grain contours relative overflow-hidden bg-night py-24 md:py-32">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <Kicker>Kapitola III · Filozofie</Kicker>
          </Reveal>
          <Reveal i={1}>
            <h2 className="font-display mt-6 max-w-2xl text-4xl text-linen md:text-6xl">
              Ticho, tma a <span className="accent-italic">vypnutý telefon.</span>
            </h2>
          </Reveal>
          <Reveal i={2}>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-sage">
              Sedmý les není místo, kde se má pořád něco dít. Je to místo, kde se konečně nemusí
              dít nic.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-10 md:mt-20 md:grid-cols-3 md:gap-8">
            <Reveal i={0}>
              <div className="border-t border-linen/10 pt-7">
                <span className="font-display text-3xl italic text-ember">01</span>
                <h3 className="font-display mt-5 text-xl text-linen md:text-2xl">Ticho</h3>
                <p className="mt-4 text-[15.5px] leading-relaxed text-sage">
                  Žádná hlavní silnice, žádný ruch. Jen vítr v korunách, déšť na plechové střeše a
                  občas voda lomu, když do ní někdo skočí.
                </p>
              </div>
            </Reveal>
            <Reveal i={1}>
              <div className="border-t border-linen/10 pt-7">
                <span className="font-display text-3xl italic text-ember">02</span>
                <h3 className="font-display mt-5 text-xl text-linen md:text-2xl">Tma</h3>
                <p className="mt-4 text-[15.5px] leading-relaxed text-sage">
                  Skoro nulový světelný smog. Za jasné noci je z terasy vidět Mléčná dráha pouhým
                  okem — a žaluzii zatáhnete, až budete chtít spát.
                </p>
              </div>
            </Reveal>
            <Reveal i={2}>
              <div className="border-t border-linen/10 pt-7">
                <span className="font-display text-3xl italic text-ember">03</span>
                <h3 className="font-display mt-5 text-xl text-linen md:text-2xl">
                  Digitální detox
                </h3>
                <p className="mt-4 text-[15.5px] leading-relaxed text-sage">
                  Wi-Fi tu je, ale má vlastní vypínač — a my ho doporučujeme použít. Signál je
                  slabší: na zavolání to stačí, na pracovní porady ne. Berte to jako vlastnost.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== Kapitola IV · Co teprve přibude (PLANNED, světlá) ===== */}
      <section className="grain relative overflow-hidden bg-mist py-24 text-night md:py-32">
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 md:grid-cols-2 md:gap-16 md:px-8">
          <div>
            <Reveal>
              <Kicker tone="light">Kapitola IV · Připravujeme</Kicker>
            </Reveal>
            <Reveal i={1}>
              <h2 className="font-display mt-6 max-w-xl text-4xl md:text-5xl">
                Co teprve <span className="font-display italic text-ember-deep">přibude.</span>
              </h2>
            </Reveal>
            <Reveal i={2}>
              <p className="mt-7 max-w-md text-[16px] leading-relaxed text-night/60">
                {PLANNED.desc}
              </p>
            </Reveal>
            <div className="mt-10 space-y-6">
              {PLANNED.items.map((item, i) => (
                <Reveal key={item.title} i={i} as="div">
                  <div className="border-t border-night/10 pt-5">
                    <h3 className="font-display text-xl text-night">{item.title}</h3>
                    <p className="mt-2 max-w-md text-[15px] leading-relaxed text-night/60">
                      {item.desc}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal>
            <div className="photo-frame relative aspect-[4/5] overflow-hidden rounded-[34px] border border-night/10">
              <Image
                src="/foto/sauna-sud.jpg"
                alt="Vizualizace plánované sauny a dřevěného koupacího sudu na břehu lomu za soumraku"
                fill
                sizes="(max-width: 768px) 100vw, 596px"
                className="object-cover"
              />
              <div className="absolute left-5 top-5 rounded-full border border-linen/30 bg-night/55 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-linen backdrop-blur-sm">
                Příští sezónu
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
