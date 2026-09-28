import Image from "next/image";
import FotoHero from "@/components/FotoHero";
import CtaBanner from "@/components/CtaBanner";
import Reveal from "@/components/Reveal";
import JsonLd from "@/components/JsonLd";
import DistanceBars from "@/components/lokalita/DistanceBars";
import MapaLomu from "@/components/lokalita/MapaLomu";
import KopirujGps from "@/components/lokalita/KopirujGps";
import { Button, Kicker } from "@/components/ui";
import { pageMeta, breadcrumbLd } from "@/lib/seo";
import { LOCATION } from "@/lib/content";

export const metadata = pageMeta({
  title: "Lokalita",
  description:
    "Sedmý les stojí u zatopeného břidlicového lomu na jižním okraji Jílového u Držkova v Libereckém kraji, GPS 50.6692N, 15.2903E. Mapa, cesta autem i vlakem, vzdálenosti a co je okolo.",
  path: "/lokalita",
  ogImage: "/foto/lom-jilove-og.jpg",
});

const mistoLd = {
  "@context": "https://schema.org",
  "@type": "Place",
  name: LOCATION.name,
  alternateName: LOCATION.nickname,
  description: LOCATION.intro,
  geo: { "@type": "GeoCoordinates", latitude: LOCATION.lat, longitude: LOCATION.lng },
  address: {
    "@type": "PostalAddress",
    addressLocality: LOCATION.village,
    addressRegion: LOCATION.region,
    addressCountry: "CZ",
  },
  hasMap: LOCATION.mapyUrl,
};

export default function LokalitaPage() {
  return (
    <main>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "Domů", path: "/" },
            { name: "Lokalita", path: "/lokalita" },
          ]),
          mistoLd,
        ]}
      />
      <FotoHero
        kicker={`Lokalita · ${LOCATION.region}`}
        title="Lom Jílové"
        accent="u Držkova."
        lead={LOCATION.intro}
        src="/foto/lom-jilove.jpg"
        alt="Lom Jílové u Držkova: tmavá hladina zrcadlí modrou oblohu s mraky, kolem břízy a smrky, vpravo břidlicová stěna"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-display rounded-full border border-linen/20 bg-night/55 px-4 py-2 text-[15px] text-linen">
            GPS {LOCATION.gps}
          </span>
          <span className="rounded-full border border-linen/20 bg-night/55 px-4 py-2 text-[14px] text-linen/85">
            {LOCATION.gpsDecimal}
          </span>
          <KopirujGps hodnota={LOCATION.gpsDecimal} />
        </div>
      </FotoHero>

      {/* ===== Kapitola I · Mapa ===== */}
      <section className="grain relative overflow-hidden bg-night pb-24 pt-16 md:pb-32 md:pt-20">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <Kicker>Kapitola I · Mapa</Kicker>
          </Reveal>
          <Reveal i={1}>
            <h2 className="font-display mt-6 max-w-2xl text-4xl text-linen md:text-6xl">
              Mapa, která <span className="accent-italic">už nemlčí.</span>
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-6 md:mt-16 lg:grid-cols-12 lg:gap-8">
            <Reveal i={2} className="lg:col-span-7">
              <MapaLomu />
            </Reveal>
            <Reveal i={3} className="lg:col-span-5">
              <div className="flex h-full flex-col rounded-[28px] border border-linen/8 bg-pine p-8 md:p-10">
                <Kicker>Kde přesně</Kicker>
                <p className="font-display mt-6 text-3xl text-linen">{LOCATION.name}</p>
                <p className="font-display mt-1 text-lg italic text-sage">„{LOCATION.nickname}“</p>
                <dl className="mt-7 space-y-3 border-t border-linen/10 pt-6 text-[15px]">
                  <div className="flex justify-between gap-6">
                    <dt className="text-sage">Obec</dt>
                    <dd className="text-right text-linen">{LOCATION.village}</dd>
                  </div>
                  <div className="flex justify-between gap-6">
                    <dt className="text-sage">Okres a kraj</dt>
                    <dd className="text-right text-linen">
                      {LOCATION.district}, {LOCATION.region}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-6">
                    <dt className="text-sage">Krajina</dt>
                    <dd className="text-right text-linen">{LOCATION.landscape}</dd>
                  </div>
                  <div className="flex justify-between gap-6">
                    <dt className="text-sage">GPS</dt>
                    <dd className="font-display text-right text-linen">
                      {LOCATION.gps}
                      <br />
                      <span className="text-[14px] text-sage">{LOCATION.gpsDecimal}</span>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-6">
                    <dt className="text-sage">Nadmořská výška</dt>
                    <dd className="text-right text-linen">≈ {LOCATION.elevation} m n. m.</dd>
                  </div>
                </dl>
                <div className="mt-auto flex flex-wrap gap-3 pt-8">
                  <a
                    href={LOCATION.mapyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-ember px-5 text-[14.5px] font-semibold text-night transition-colors hover:bg-ember-soft"
                  >
                    Otevřít v Mapách
                  </a>
                  <a
                    href={LOCATION.navigateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-linen/25 px-5 text-[14.5px] font-semibold text-linen transition-colors hover:border-ember hover:text-ember"
                  >
                    Navigovat (Google)
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== Kapitola II · Lom (obloha) ===== */}
      <section className="obloha strata relative overflow-hidden py-24 text-night md:py-32">
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 md:grid-cols-2 md:gap-16 md:px-8">
          <Reveal className="md:order-2">
            <figure className="group">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[34px] border border-night/10">
                <Image
                  src="/foto/lom-jilove.jpg"
                  alt="Břidlicová stěna lomu Jílové u Držkova nad tmavou hladinou, na ní odraz mraků"
                  fill
                  sizes="(max-width: 768px) 100vw, 596px"
                  className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                />
              </div>
              <figcaption className="font-display mt-4 text-lg italic text-night/55 md:mt-5">
                „Voda tak čistá, že mu místní říkají České Chorvatsko.“
              </figcaption>
            </figure>
          </Reveal>
          <div className="md:order-1">
            <Reveal>
              <Kicker tone="light">Kapitola II · Lom</Kicker>
            </Reveal>
            <Reveal i={1}>
              <h2 className="font-display mt-6 max-w-xl text-4xl md:text-5xl">
                Břidlice, voda{" "}
                <span className="font-display italic text-ember-deep">a nebe v ní.</span>
              </h2>
            </Reveal>
            <Reveal i={2}>
              <p className="mt-7 max-w-md text-[16px] leading-relaxed text-night/65">
                Kdysi se tu lámala břidlice na střechy. Když těžba skončila, jáma se napustila
                vodou a vznikla hladina, ve které se zrcadlí mraky a břízy. Dno je břidlicové,
                voda průzračná a plná raků — na jaře studená, v srpnu na celé odpoledne.
              </p>
            </Reveal>
            <Reveal i={3}>
              <dl className="mt-9 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-night/10 pt-7 sm:grid-cols-3">
                {LOCATION.facts.map((f) => (
                  <div key={f.label}>
                    <dt className="text-[12px] font-semibold uppercase tracking-[0.16em] text-night/50">
                      {f.label}
                    </dt>
                    <dd className="font-display mt-1.5 text-2xl text-night">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
            <Reveal i={4}>
              <p className="mt-8 max-w-md text-[14px] leading-relaxed text-shale-deep">
                Koupání je na vlastní odpovědnost. Lom není hlídané koupaliště, hloubka začíná
                hned u břehu — děti mějte u vody pod dohledem.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== Kapitola III · Vzdálenosti ===== */}
      <section className="grain relative overflow-hidden bg-bark py-20 md:py-26">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <Kicker>Kapitola III · Vzdálenosti</Kicker>
          </Reveal>
          <Reveal i={1}>
            <h2 className="font-display mt-6 max-w-2xl text-4xl text-linen md:text-6xl">
              Daleko od všeho. <span className="accent-italic">Blízko autem.</span>
            </h2>
          </Reveal>

          <DistanceBars />
        </div>
      </section>

      {/* ===== Kapitola IV · Cesta ===== */}
      <section className="grain contours relative overflow-hidden bg-night py-20 md:py-26">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <Kicker>Kapitola IV · Cesta</Kicker>
          </Reveal>
          <Reveal i={1}>
            <h2 className="font-display mt-6 max-w-2xl text-4xl text-linen md:text-6xl">
              Jak <span className="accent-italic">k nám.</span>
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-10 md:mt-16 md:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-4">
            {LOCATION.route.map((s, i) => (
              <Reveal key={s.title} i={i}>
                <div className="border-t border-linen/10 pt-7">
                  <span className="font-display text-3xl italic text-ember">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display mt-5 text-xl text-linen md:text-2xl">{s.title}</h3>
                  <p className="mt-4 text-[15.5px] leading-relaxed text-sage">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Kapitola V · Okolí (obloha) ===== */}
      <section className="obloha relative overflow-hidden py-24 text-night md:py-32">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <Kicker tone="light">Kapitola V · Okolí</Kicker>
          </Reveal>
          <Reveal i={1}>
            <h2 className="font-display mt-6 max-w-2xl text-4xl md:text-6xl">
              Co najdete, když{" "}
              <span className="font-display italic text-ember-deep">vyjdete ven.</span>
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-5 md:mt-16 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {LOCATION.around.map((a, i) => (
              <Reveal key={a.title} i={i}>
                <div className="h-full rounded-[28px] border border-night/10 bg-cloud p-8 transition-colors duration-300 hover:border-ember-deep/40 md:p-10">
                  <h3 className="font-display text-2xl">{a.title}</h3>
                  <p className="mt-4 leading-relaxed text-night/60">{a.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12">
            <Button href="/okoli" variant="outline-dark">
              Celá mapa okolí — léto i zima
            </Button>
          </Reveal>
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
