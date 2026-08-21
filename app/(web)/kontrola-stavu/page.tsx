import Image from "next/image";
import JsonLd from "@/components/JsonLd";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import data from "@/lib/ukazka/data.json";

/**
 * Ukázka kontroly stavu domku.
 *
 * Statická stránka: snímky i odpovědi modelu jsou z jednoho konkrétního běhu
 * a nemají se měnit. Kdo si ji otevře, má vidět přesně to, co viděl ten, kdo
 * na ni dostal odkaz — včetně případů, které systém přehlédl.
 */

export const metadata = pageMeta({
  title: "Kontrola stavu domku",
  description:
    "Host před odjezdem vyfotí tiny house a systém porovná snímky se stavem při předání. Dvacet tři případů od vlasové praskliny ve skle po propálenou díru v čalounění.",
  path: "/kontrola-stavu",
});

const VERDIKT: Record<string, { popis: string; trida: string }> = {
  trefa: { popis: "Nalezeno", trida: "bg-ok/15 text-ok" },
  planyPoplach: { popis: "Planý poplach", trida: "bg-vazne/15 text-vazne" },
  prehlednuto: { popis: "Nenalezeno", trida: "bg-stred/15 text-stred" },
  neporadek: { popis: "Nepořádek", trida: "bg-sage/15 text-sage" },
};

const ZAVAZNOST: Record<string, string> = {
  ok: "bg-ok/15 text-ok",
  nic: "bg-sage/15 text-sage",
  stred: "bg-stred/15 text-stred",
  vazne: "bg-vazne/20 text-vazne",
};

const SKUPINY = [
  {
    nazev: "Nezměněné snímky",
    popis: "Domek ve stavu, v jakém byl předán. Systém nesmí najít nic.",
  },
  {
    nazev: "Sotva viditelné poškození",
    popis:
      "Na hranici toho, čeho si všimne i člověk: vlasová prasklina, odřený lak, zatažené vlákno v čalounění.",
  },
  {
    nazev: "Zjevné poškození",
    popis: "Propálená díra, prasklé sklo, utržená dvířka, chybějící vybavení.",
  },
];

type Pripad = (typeof data.pripady)[number];

function Snimek({ src, alt, popisek }: { src: string; alt: string; popisek: string }) {
  return (
    <figure className="m-0">
      <Image
        src={src}
        alt={alt}
        width={1024}
        height={683}
        sizes="(max-width: 768px) 100vw, 460px"
        className="w-full rounded-xl border border-pine-edge bg-pine"
      />
      <figcaption className="kicker mt-2 text-sage">{popisek}</figcaption>
    </figure>
  );
}

function Pripad({ p, i }: { p: Pripad; i: number }) {
  const v = VERDIKT[p.stav] ?? VERDIKT.trefa;
  return (
    <Reveal i={i % 3} className="mt-7 rounded-[28px] border border-pine-edge bg-bark p-5 md:p-7">
      <header className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
        <div>
          <h3 className="font-display text-xl text-linen md:text-2xl">{p.nazev}</h3>
          <p className="mt-1 text-sm text-sage">{p.meta}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${v.trida}`}>
          {p.verdikt}
        </span>
      </header>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {p.pred && <Snimek src={p.pred} alt={`${p.nazev} — stav při předání`} popisek="při předání" />}
        {p.po && <Snimek src={p.po} alt={`${p.nazev} — snímek od hosta`} popisek="od hosta" />}
      </div>

      <p className="mt-5 rounded-xl bg-night px-4 py-3 text-sm tabular-nums text-sage">{p.brana}</p>

      {p.vyrezPred && p.vyrezPo && (
        <div className="mt-5">
          <p className="kicker text-sage">Podezřelé místo předané modelu</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Snimek src={p.vyrezPred} alt="Výřez referenčního snímku" popisek="při předání" />
            <Snimek src={p.vyrezPo} alt="Výřez snímku od hosta" popisek="od hosta" />
          </div>
        </div>
      )}

      {p.luna ? (
        <div className="mt-5 rounded-2xl border border-pine-edge bg-night p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-sage">
            <span
              className={`rounded-full px-3 py-1 font-semibold ${ZAVAZNOST[p.luna.ton] ?? ZAVAZNOST.nic}`}
            >
              {p.luna.popis}
            </span>
            <span className="tabular-nums">jistota {p.luna.jistota} %</span>
            {p.luna.cas && <span className="tabular-nums">{p.luna.cas}</span>}
          </div>

          <p className="mt-3 leading-relaxed text-linen">{p.luna.rekla}</p>

          <div className="mt-4 rounded-xl bg-pine px-4 py-3">
            <p className="kicker text-sage">Proč to nemusí být škoda</p>
            <p className="mt-1 text-sm leading-relaxed text-sage">{p.luna.alternativa}</p>
          </div>

          {p.luna.protiargument && (
            <div className="mt-3 rounded-xl bg-pine px-4 py-3">
              <p className="kicker text-sage">Protiargument z nezávislého běhu</p>
              <p className="mt-1 text-sm leading-relaxed text-sage">{p.luna.protiargument}</p>
            </div>
          )}

          {p.luna.odhad && <p className="mt-4 text-sm text-ember-soft">{p.luna.odhad}</p>}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-pine-edge bg-night p-4 md:p-5">
          <p className="font-semibold text-ok">Jazykový model se nevolal</p>
          <p className="mt-1 text-sm leading-relaxed text-sage">
            Obrazové porovnání nenašlo žádné podezřelé místo, zóna se uzavřela jako čistá.
            Ušetřený náklad i riziko nepřesnosti.
          </p>
        </div>
      )}
    </Reveal>
  );
}

export default function KontrolaStavuPage() {
  return (
    <main>
      <JsonLd
        data={breadcrumbLd([
          { name: "Domů", path: "/" },
          { name: "Kontrola stavu domku", path: "/kontrola-stavu" },
        ])}
      />

      <PageHero
        kicker="Jak to funguje"
        title="Pozná, co se"
        accent="v domku změnilo."
        lead="Host před odjezdem vyfotí tiny house. Systém porovná snímky se stavem při předání a upozorní na to, co se změnilo. Níž je dvacet tři případů — od vlasové praskliny ve skle po propálenou díru v čalounění — a u každého přesně to, co systém odpověděl, včetně toho, co přehlédl."
      />

      <section className="grain relative overflow-hidden bg-night pb-20 md:pb-28" aria-label="Výsledky">
        <div className="relative z-10 mx-auto max-w-5xl px-5 md:px-8">
          <Reveal className="grid gap-px overflow-hidden rounded-[28px] border border-pine-edge bg-pine-edge sm:grid-cols-2 lg:grid-cols-3">
            {data.cisla.map((c) => (
              <div key={c.popis} className="bg-bark px-5 py-4">
                <b className="font-display block text-3xl font-normal tabular-nums text-ember">
                  {c.hodnota.replace(/&nbsp;/g, " ")}
                </b>
                <span className="mt-1 block text-sm text-sage">{c.popis}</span>
              </div>
            ))}
          </Reveal>

          <Reveal
            i={1}
            className="mt-6 rounded-[24px] border border-ok/35 bg-ok/[0.07] px-5 py-4 leading-relaxed text-sage md:px-6 md:py-5"
          >
            <b className="text-linen">Nejdůležitější číslo je nula planých poplachů.</b> Na pěti
            párech, kde se domek nezměnil, systém ani jednou neoznačil poškození. Je to nastavené
            záměrně: raději škodu přehlédnout než neprávem obvinit hosta. U dvou domků zničí jedna
            nespravedlivá recenze víc, než ušetří všechny nalezené škody dohromady.
          </Reveal>

          <Reveal
            i={2}
            className="mt-4 rounded-[24px] border border-pine-edge bg-bark px-5 py-4 leading-relaxed text-sage md:px-6 md:py-5"
          >
            <b className="text-linen">Jak to funguje.</b> Nejdřív obrazové porovnání: srovná
            expozici, spočítá podobnost po blocích a najde souvislé oblasti rozdílu. Když nic
            nenajde, <b className="text-linen">jazykový model se vůbec nevolá</b> — ušetří se náklad
            i riziko nepřesnosti. Když něco najde, dostane model{" "}
            <b className="text-linen">párové výřezy</b> podezřelého místa: referenční i hostův.
            U každého nálezu musí povinně uvést,{" "}
            <b className="text-linen">proč to poškození být nemusí</b>, a u vážnějších případů běží
            ještě samostatné kolo hledající protiargument.{" "}
            <b className="text-linen">O penězích rozhoduje vždy provozovatel</b> — tenhle výstup je
            podklad, ne rozhodnutí.
          </Reveal>

          {SKUPINY.map((s) => {
            const vybrane = data.pripady.filter((p) => p.skupina === s.nazev);
            if (!vybrane.length) return null;
            return (
              <section key={s.nazev} className="pt-14 md:pt-20">
                <Reveal>
                  {/* Kicker je jen štítek. Skupina je kapitola stránky, takže
                      potřebuje skutečný nadpis — jinak jdou karty rovnou z h1
                      na h3 a čtečce v osnově chybí úroveň. */}
                  <h2 className="font-display text-2xl text-linen md:text-3xl">{s.nazev}</h2>
                  <p className="mt-3 max-w-2xl text-sage">{s.popis}</p>
                </Reveal>
                {vybrane.map((p, i) => (
                  <Pripad key={p.nazev + i} p={p} i={i} />
                ))}
              </section>
            );
          })}

          <Reveal className="mt-16 border-t border-pine-edge pt-8 text-sm leading-relaxed text-sage">
            <p className="max-w-3xl">
              <b className="text-linen">Poznámka k datům.</b> Poškození na těchto snímcích je
              vygenerované, ne vyfocené. Sada slouží k ověření chování systému napříč rozsahem od
              sotva viditelných vad po zjevné škody. Přesnost na reálných snímcích se doladí podle
              prvních skutečných případů.
            </p>
            <p className="mt-4 max-w-3xl">
              Přehlédnuté případy jsou v přehledu ponechané. Systém se má posuzovat podle toho, co
              nenajde, ne jen podle toho, co najde — a provozovatel obchází domek tak jako tak.
            </p>
            <p className="mt-4 max-w-3xl">
              Odhady cen oprav jsou orientační a nikde se nepoužívají automaticky. Nárok vzniká
              výhradně rozhodnutím provozovatele s vlastním odůvodněním.
            </p>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
