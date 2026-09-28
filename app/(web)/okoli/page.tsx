import FotoHero from "@/components/FotoHero";
import CtaBanner from "@/components/CtaBanner";
import JsonLd from "@/components/JsonLd";
import Reveal from "@/components/Reveal";
import MapaOkoli from "@/components/okoli/MapaOkoli";
import { Button, Kicker } from "@/components/ui";
import { LOCATION } from "@/lib/content";
import { MISTA } from "@/lib/okoli";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { SEZONA_POPIS, sezonaKDatu } from "@/lib/sezona";

/** Výchozí sezónu určuje datum — stránka se přegenerovává každou hodinu. */
export const revalidate = 3600;

export const metadata = pageMeta({
  title: "Okolí a aktivity",
  description:
    "Mapa okolí lomu Jílové u Držkova: koupání, lodě na Jizeře, ferrata, skalní města, hrady, rozhledny a jeskyně — a v zimě sjezdovky s běžkami. Přepíná se podle ročního období.",
  path: "/okoli",
  ogImage: "/foto/lom-jilove-og.jpg",
});

const seznamLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Co dělat v okolí lomu Jílové u Držkova",
  itemListElement: MISTA.filter((m) => !m.doma).map((m, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "TouristAttraction",
      name: m.nazev,
      description: m.popis,
      geo: { "@type": "GeoCoordinates", latitude: m.lat, longitude: m.lng },
      ...(m.web ? { url: m.web } : {}),
    },
  })),
};

const PLANY = [
  {
    nazev: "Léto",
    body: [
      "Ráno lom, ještě než přijde slunce — voda je nejklidnější.",
      "Lodě z Malé Skály do Dolánek, dvě až tři hodiny na Jizeře.",
      "Ferrata Vodní brána nebo Riegrova stezka pod ní.",
      "Večer Kozákov: rozhledna, západ slunce a acháty v kapse.",
    ],
  },
  {
    nazev: "Zima",
    body: [
      "Sjezdovka v Zásadě deset minut od lomu, večer pod světly.",
      "Tanvaldský Špičák, Rejdice nebo Harrachov do čtyřiceti minut.",
      "Běžky v Bedřichově a na Jizerce, kde sníh drží nejdéle.",
      "Otužení v lomu a pak hrnek čaje za oknem tři krát tři metry.",
    ],
  },
  {
    nazev: "Za každého počasí",
    body: [
      "Bozkovské jeskyně: 7,6 °C celý rok a největší podzemní jezero v Čechách.",
      "Sklo v Železném Brodě a Muzeum skla a bižuterie v Jablonci.",
      "Pivovar Rohozec, sobotní exkurze a oběd v pivovaru.",
      "Když prší opravdu, je nejhezčí zůstat u okna.",
    ],
  },
];

export default function OkoliPage() {
  const sezona = sezonaKDatu();

  return (
    <main>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "Domů", path: "/" },
            { name: "Okolí a aktivity", path: "/okoli" },
          ]),
          seznamLd,
        ]}
      />
      <FotoHero
        kicker="Okolí a aktivity"
        title="Co dělat kolem"
        accent="lomu."
        lead="Léto a zima mají každé svou mapu: koupání, lodě, ferrata a skalní města, nebo sjezdovky do půl hodiny a běžky za kopcem. Mapa se přepne sama podle kalendáře — a vy ji přepnete, kdy chcete."
        src="/foto/lom-leto-obec.jpg"
        alt="Lom Jílové u Držkova v létě: hladina mezi břízami, za ní střechy obce a hřebeny Jizerských hor"
      >
        <div className="flex flex-wrap gap-2.5 text-[13.5px] text-linen/85">
          <span className="rounded-full border border-linen/20 bg-night/55 px-4 py-2">
            {MISTA.length - 1} míst do 45 minut autem
          </span>
          <span className="rounded-full border border-linen/20 bg-night/55 px-4 py-2">
            Podle kalendáře {SEZONA_POPIS[sezona].nazev.toLowerCase()}
          </span>
          <span className="rounded-full border border-linen/20 bg-night/55 px-4 py-2">
            Střed mapy: {LOCATION.name}
          </span>
        </div>
      </FotoHero>

      <MapaOkoli mista={MISTA} vychoziSezona={sezona} />

      {/* ===== Kapitola IV · Tři plány ===== */}
      <section className="grain contours relative overflow-hidden bg-night py-20 md:py-26">
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <Kicker>Kapitola IV · Tři plány</Kicker>
          </Reveal>
          <Reveal i={1}>
            <h2 className="font-display mt-6 max-w-2xl text-4xl text-linen md:text-6xl">
              Kdybyste chtěli <span className="accent-italic">poradit.</span>
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-10 md:mt-16 md:grid-cols-3 md:gap-8">
            {PLANY.map((p, i) => (
              <Reveal key={p.nazev} i={i}>
                <div className="border-t border-linen/10 pt-7">
                  <span className="font-display text-3xl italic text-ember">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display mt-5 text-xl text-linen md:text-2xl">{p.nazev}</h3>
                  <ul className="mt-4 space-y-2.5 text-[15.5px] leading-relaxed text-sage">
                    {p.body.map((b) => (
                      <li key={b} className="flex gap-3">
                        <span className="mt-[11px] inline-block h-1 w-1 shrink-0 rounded-full bg-ember/70" aria-hidden="true" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal i={3} className="mt-12 flex flex-wrap gap-4">
            <Button href="/lokalita" variant="outline">
              Jak k nám a kde přesně
            </Button>
            <Button href="/rezervace">Rezervovat termín</Button>
          </Reveal>
        </div>
      </section>

      <CtaBanner
        title="Okolí počká."
        accent="Lom ne."
        text="Vyberte si domek a termín. Mapu okolí si pak otevřete rovnou z portálu hosta — přepnutou na roční období, ve kterém přijedete."
      />
    </main>
  );
}
