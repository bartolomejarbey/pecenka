import type { Metadata } from "next";
import Image from "next/image";
import { vyzadujPrihlaseni } from "@/lib/auth/dal";
import Shell from "@/components/admin/Shell";
import { Odznak } from "@/components/admin/prvky";
import VzkazHostovi from "@/components/pobyt/VzkazHostovi";
import type { Vzkaz } from "@/lib/luna/vzkaz";
import sada from "@/lib/ukazka/test-ai.json";
import rozmery from "@/lib/ukazka/rozmery.json";

export const metadata: Metadata = {
  title: "Testování systému AI",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Testování systému AI.
 *
 * Deset dvojic „před a po", každá prohnaná **tímtéž kódem, který běží
 * hostům** — obrazovou branou, Lunou i pravidly, podle kterých se skládá
 * vzkaz. U každé dvojice je vidět i to, co by host doopravdy uviděl na
 * displeji; to je jediné, co se dá posoudit bez znalosti vnitřků.
 *
 * Sada je schválně **nevyvážená ve prospěch pastí**: šest z deseti dvojic
 * je nepořádek, přesunutý nábytek nebo jiné světlo. Systém, který je nahlásí
 * jako škodu, je k ničemu, i kdyby všechna poškození našel.
 *
 * Stránka je v administraci, ne na webu, a schválně. Čísla naměřená na deseti
 * vygenerovaných dvojicích nejsou důkaz o přesnosti — jsou to kontrolní
 * body, které mají odhalit, že se něco pokazilo.
 */

type Pripad = (typeof sada.pripady)[number];

const SKUPINY = [
  {
    klic: "bez_nalezu",
    nadpis: "Pasti — nic se nestalo",
    popis:
      "Jiné světlo, přesunuté křeslo, tentýž snímek podruhé. Systém tu nesmí najít nic. " +
      "Falešné obvinění je dražší než přehlédnutá škoda.",
  },
  {
    klic: "uklid",
    nadpis: "Nepořádek, ne škoda",
    popis:
      "Nádobí ve dřezu, neustlaná postel, mokrá koupelna. Host má dostat vlídnou prosbu — " +
      "a nic se za to neúčtuje.",
  },
  {
    klic: "skoda",
    nadpis: "Skutečné poškození",
    popis:
      "Propálenina, prasklé sklo, chybějící vybavení. Tady má systém požádat hosta " +
      "o telefonát, dokud je ještě na místě.",
  },
] as const;

const VERDIKT = {
  trefa: { popis: "Vyšlo správně", ton: "zaplaceno" },
  minula: { popis: "Přehlédnuto", ton: "zaloha" },
  planyPoplach: { popis: "Planý poplach", ton: "nezaplaceno" },
} as const;

const ZAVAZNOSTI: Record<string, string> = {
  none: "beze změny",
  dirt: "nepořádek",
  wear: "opotřebení",
  damage_minor: "drobné poškození",
  damage_major: "výrazné poškození",
  missing: "něco chybí",
};

const ZAROVNANI: Record<string, string> = {
  good: "sedí na sebe",
  fair: "sedí částečně",
  poor: "nesedí — jiný úhel",
};

export default async function AdminTestAi() {
  const kdo = await vyzadujPrihlaseni();

  const spravne = sada.pripady.filter((p) => p.vysledek === "trefa").length;

  return (
    <Shell
      kdo={kdo}
      aktivni="/admin/vic"
      nadpis="Testování systému AI"
      akce={
        <span className="text-[13px] text-sage">
          {new Date(sada.vytvoreno).toLocaleDateString("cs-CZ")}
        </span>
      }
    >
      <p className="max-w-2xl text-[15px] leading-relaxed text-sage">
        Deset dvojic fotek téhož domku. Snímek „po" vznikl{" "}
        <span className="text-linen">úpravou toho referenčního</span>, takže se liší
        přesně tím, co jsme zadali, a ničím jiným. Každá dvojice pak prošla stejnou
        cestou jako fotka od skutečného hosta.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-linen/10 bg-linen/10 sm:grid-cols-4">
        <Cislo hodnota={`${spravne}/${sada.celkem}`} popis="vyhodnoceno správně" />
        <Cislo
          hodnota={`${sada.poskozeniNalezeno}/${sada.poskozeniCelkem}`}
          popis="poškození nalezeno"
        />
        <Cislo hodnota={String(sada.planePoplachy)} popis="planých poplachů" zvyraznit={sada.planePoplachy > 0} />
        <Cislo
          hodnota={`${(sada.nakladHalere / 100 / sada.celkem).toFixed(2)} Kč`}
          popis="za jednu zónu"
        />
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 text-[13px] text-sage/80">
        <div className="flex gap-1.5">
          <dt>Model:</dt>
          <dd className="text-linen">{sada.model}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Verze promptu:</dt>
          <dd className="text-linen">{sada.verzePromptu}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Obrazová brána otevřena:</dt>
          <dd className="text-linen">
            {sada.branaOtevrena}× z {sada.celkem}
          </dd>
        </div>
      </dl>

      <p className="mt-5 rounded-2xl border border-linen/10 bg-linen/[0.03] px-5 py-4 text-[13.5px] leading-relaxed text-sage">
        <strong className="font-semibold text-linen">Čemu tahle čísla nejsou důkazem.</strong>{" "}
        Snímky jsou vygenerované obrazovým modelem, ne pořízené v domku, a je jich
        deset. Sada slouží k tomu, aby bylo poznat, když se po zásahu do promptu
        nebo prahů něco pokazí — ne k tvrzení o přesnosti systému. Skutečná
        kontrola jsou fotky od skutečných hostů a rozhodnutí, která u nich udělá
        člověk.
      </p>

      {SKUPINY.map((s) => {
        const pripady = sada.pripady.filter((p) => p.ocekavano === s.klic);
        if (!pripady.length) return null;
        return (
          <section key={s.klic} className="mt-10">
            <h2 className="font-display text-2xl text-linen">{s.nadpis}</h2>
            <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-sage">{s.popis}</p>
            <div className="mt-5 space-y-5">
              {pripady.map((p) => (
                <PripadKarta key={p.id} p={p} />
              ))}
            </div>
          </section>
        );
      })}
    </Shell>
  );
}

function Cislo({
  hodnota,
  popis,
  zvyraznit,
}: {
  hodnota: string;
  popis: string;
  zvyraznit?: boolean;
}) {
  return (
    <div className="bg-bark px-4 py-4">
      <p
        className={`font-display text-2xl tabular-nums ${zvyraznit ? "text-red-300" : "text-ember"}`}
      >
        {hodnota}
      </p>
      <p className="mt-1 text-[12.5px] leading-snug text-sage">{popis}</p>
    </div>
  );
}

function PripadKarta({ p }: { p: Pripad }) {
  const v = VERDIKT[p.vysledek as keyof typeof VERDIKT];

  return (
    <article className="overflow-hidden rounded-2xl border border-linen/10 bg-bark">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-linen/8 px-5 py-3.5">
        <h3 className="text-[15.5px] font-medium text-linen">
          {p.nazev}
          <span className="ml-2.5 text-[13px] font-normal text-sage/80">{p.zona}</span>
        </h3>
        <Odznak ton={v.ton}>{v.popis}</Odznak>
      </header>

      <div className="px-5 py-5">
        <p className="text-[14.5px] leading-relaxed text-sage">{p.proc}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Snimek src={p.pred} popis="Reference — stav při předání" />
          <Snimek src={p.po} popis="Od hosta před odjezdem" />
        </div>

        {p.vyrezPred && p.vyrezPo && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Snimek src={p.vyrezPred} popis="Výřez, který dostal model — reference" maly />
            <Snimek src={p.vyrezPo} popis="Týž výřez od hosta" maly />
          </div>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <h4 className="text-[12px] uppercase tracking-[0.14em] text-sage/70">
              Co viděl systém
            </h4>
            <dl className="mt-3 space-y-2 text-[14px] leading-relaxed">
              <Radek
                nazev="Obrazová brána"
                hodnota={`podobnost ${p.brana.podobnost} % · ${ZAROVNANI[p.brana.zarovnani] ?? p.brana.zarovnani} · rozdíl jasu ${p.brana.rozdilJasu} · ${p.brana.mist} podezřelých míst`}
              />
              {p.luna ? (
                <>
                  <Radek
                    nazev="Závěr"
                    hodnota={`${ZAVAZNOSTI[p.luna.zavaznost] ?? p.luna.zavaznost}, jistota ${Math.round(p.luna.jistota * 100)} %`}
                  />
                  <Radek nazev="Popis" hodnota={p.luna.coSeZmenilo} />
                  <Radek nazev="Proč to nemusí být škoda" hodnota={p.luna.alternativa} />
                  {p.luna.protiargument && (
                    <Radek nazev="Protiargument" hodnota={p.luna.protiargument} />
                  )}
                  {p.luna.odhad.max > 0 && (
                    <Radek
                      nazev="Odhad opravy"
                      hodnota={`${p.luna.odhad.min.toLocaleString("cs-CZ")}–${p.luna.odhad.max.toLocaleString("cs-CZ")} Kč (jen podklad, nikomu se neúčtuje)`}
                    />
                  )}
                </>
              ) : (
                <Radek
                  nazev="Model"
                  hodnota="Nevolal se — obrazová brána nenašla nic podezřelého. Tohle je nejlevnější správná odpověď."
                />
              )}
            </dl>
          </div>

          <div>
            <h4 className="text-[12px] uppercase tracking-[0.14em] text-sage/70">
              Co uvidí host na displeji
            </h4>
            <div className="mt-3">
              <VzkazHostovi vzkaz={p.vzkaz as Vzkaz} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Radek({ nazev, hodnota }: { nazev: string; hodnota: string }) {
  return (
    <div>
      <dt className="text-[12.5px] text-sage/80">{nazev}</dt>
      <dd className="text-linen">{hodnota}</dd>
    </div>
  );
}

function Snimek({ src, popis, maly }: { src: string; popis: string; maly?: boolean }) {
  // Výřezy mají každý jiný poměr stran — pevné rozměry by rezervovaly
  // špatnou výšku a stránka by se po načtení posunula.
  const r = (rozmery as Record<string, { w: number; v: number }>)[src] ?? { w: 1536, v: 1024 };
  return (
    <figure>
      <Image
        src={src}
        alt={popis}
        width={r.w}
        height={r.v}
        sizes="(min-width: 640px) 45vw, 90vw"
        className={`w-full rounded-xl border border-linen/10 ${maly ? "object-contain" : ""}`}
      />
      <figcaption className="mt-1.5 text-[12.5px] text-sage/80">{popis}</figcaption>
    </figure>
  );
}
