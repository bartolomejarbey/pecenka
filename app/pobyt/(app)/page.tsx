import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import LogoMark from "@/components/LogoMark";
import VzkazHostovi from "@/components/pobyt/VzkazHostovi";
import { Zkopiruj } from "@/components/pobyt/prvky";
import { HOUSES, SITE } from "@/lib/content";
import { formatTelefon, telOdkaz, vokativ } from "@/lib/format";
import { odhlas } from "@/lib/portal/akce";
import { ktoJePrihlasen } from "@/lib/portal/pristup";
import { nactiPrehled, type Prehled } from "@/lib/portal/prehled";
import { nactiStavProtokolu, type StavProtokolu } from "@/lib/portal/vysledek";

export const dynamic = "force-dynamic";

/**
 * Záložka Pobyt — „co je teď".
 *
 * Nahoře fotka domku a oslovení jménem. Za pobyt se platí patnáct tisíc
 * a dosud host dostal černou stránku s textem „Dobrý den"; ani jedna fotka,
 * ani jméno. Fotka tu není ozdoba — připomíná, kam člověk jede, a dělá
 * z účetního záznamu pobyt.
 *
 * Pod tím jen to, co je **právě teď** důležité. Podrobnosti o domku jsou
 * ve vlastní záložce, odjezd taky. Tahle obrazovka se nemá rolovat.
 */
export default async function PobytPrehled() {
  const pobyt = await ktoJePrihlasen();
  if (!pobyt) redirect("/pobyt/prihlaseni");

  const [prehled, protokol] = await Promise.all([
    nactiPrehled(pobyt),
    nactiStavProtokolu(pobyt.rezervaceId),
  ]);
  const { info } = prehled;
  const dum = HOUSES.find((h) => h.slug === pobyt.domekSlug);
  const telefon = info?.telefon || SITE.phone;

  return (
    <main>
      {/* ===== Hlavička s fotkou ===== */}
      <section className="relative h-[46svh] min-h-[300px] max-h-[440px] overflow-hidden">
        {dum && (
          <Image
            src={dum.photo}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-night/40 via-night/10 to-night" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
          <span className="flex items-center gap-2 text-linen drop-shadow">
            <LogoMark className="h-5 w-auto" />
            <span className="font-display text-[13px] uppercase tracking-[0.16em]">Sedmý les</span>
          </span>
          <form action={odhlas}>
            <button className="rounded-full bg-night/50 px-3.5 py-2 text-[12.5px] text-linen/85 backdrop-blur hover:text-linen">
              Odhlásit
            </button>
          </form>
        </div>

        <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
          <p className="text-[13px] uppercase tracking-[0.16em] text-ember">{pozdrav(pobyt.jmeno)}</p>
          <h1 className="font-display mt-1.5 text-[36px] leading-[1.02] text-linen">
            {nadpisFaze(prehled, pobyt.domek)}
          </h1>
          <p className="mt-2 text-[15px] text-sage">{podnadpis(prehled, pobyt)}</p>
        </div>
      </section>

      {/* ===== Teď ===== */}
      <div className="mx-auto max-w-lg space-y-4 px-5 pt-5">
        {prehled.faze === "pred" && (
          <>
            <Karta nadpis="Kudy k nám" akce={info?.mapa ? { href: info.mapa, popis: "Navigovat", externi: true } : undefined}>
              {info?.adresa ? (
                <p className="text-[16px] leading-snug text-linen">{info.adresa}</p>
              ) : (
                <p className="text-[15px] leading-relaxed text-sage">
                  Přesnou adresu doplníme před příjezdem — ozveme se e-mailem.
                </p>
              )}
              <p className="mt-2 text-[13.5px] leading-relaxed text-sage">
                Poslední kilometr je lesní cesta a signál tam padá. Mapu si otevřete
                ještě v civilizaci.
              </p>
            </Karta>
            <Radka>
              Kód od schránky a wifi se vám ukážou den před příjezdem — v záložce{" "}
              <Link href="/pobyt/domek" className="text-ember underline underline-offset-2">Domek</Link>.
            </Radka>
          </>
        )}

        {prehled.faze === "prijezd" && (
          <>
            <Karta nadpis="Jak se dostanete dovnitř" zvyraznit>
              {vytahniKod(info?.klice ?? "") ? (
                <Zkopiruj hodnota={vytahniKod(info?.klice ?? "")!} popis="Kód od schránky" velky />
              ) : null}
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-linen">
                {info?.klice || "Pokyny doplníme před příjezdem. Kdyby tu nic nebylo, zavolejte — otevřeme na dálku."}
              </p>
            </Karta>
            {info?.mapa && (
              <a
                href={info.mapa}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[56px] items-center justify-center gap-2.5 rounded-full bg-ember px-6 text-[16px] font-semibold text-night hover:bg-ember-soft"
              >
                Navigovat k domku
              </a>
            )}
          </>
        )}

        {prehled.faze === "behem" && (
          <>
            {/*
              * Pod sebe, ne vedle sebe.
              *
              * Dvousloupcová mřížka má na 393 px sto šedesát pixelů na kartu
              * a heslo „lomasvetlusky" se v ní lámalo na tři řádky. Údaj,
              * který se opisuje, musí být na jeden pohled celý.
              */}
            <div className="space-y-3">
              {info?.wifiHeslo && (
                <Zkopiruj hodnota={info.wifiHeslo} popis="Heslo k Wi-Fi" />
              )}
              {vytahniKod(info?.klice ?? "") && (
                <Zkopiruj hodnota={vytahniKod(info?.klice ?? "")!} popis="Kód od schránky" />
              )}
            </div>
            <Karta nadpis="Až budete odjíždět" akce={{ href: "/pobyt/odjezd", popis: "Podívat se" }}>
              <ol className="space-y-1 text-[15px] leading-relaxed text-linen">
                <li>1. Vyfotíte pár míst v domku — tři minuty.</li>
                <li>2. Klíč vrátíte do schránky.</li>
                <li>3. Zavřete okna a vynesete koš.</li>
              </ol>
              <p className="mt-2 text-[13.5px] text-sage">Odjezd do {info?.odjezdDo ?? "10:00"}.</p>
            </Karta>
          </>
        )}

        {(prehled.faze === "odjezd" || prehled.faze === "po") && (
          <Odjezd stav={protokol} odjezdDo={info?.odjezdDo ?? "10:00"} />
        )}

        {/*
          * Telefon jen tam, kde se opravdu volá.
          *
          * Byl na každé obrazovce pod sebou se vším ostatním; na čtvrté už
          * to byla omáčka a duplikoval záložku Pomoc. Zůstává v den příjezdu
          * (host bloudí) a v den odjezdu (host něco našel).
          */}
        {(prehled.faze === "prijezd" || prehled.faze === "odjezd") && (
          <a
            href={telOdkaz(telefon)}
            className="flex min-h-[52px] items-center justify-center gap-2.5 rounded-full border border-linen/15 text-[15px] text-linen hover:border-ember/40"
          >
            Zavolat nám · {formatTelefon(telefon)}
          </a>
        )}
      </div>
    </main>
  );
}

/* ===== Texty ===== */

function pozdrav(jmeno: string | null): string {
  const hodina = Number(
    new Intl.DateTimeFormat("cs-CZ", { hour: "numeric", hour12: false, timeZone: "Europe/Prague" })
      .format(new Date())
      .replace(/\D/g, ""),
  );
  const cast = hodina < 5 ? "Dobrou noc" : hodina < 10 ? "Dobré ráno" : hodina < 18 ? "Dobrý den" : "Dobrý večer";
  return jmeno ? `${cast}, ${vokativ(jmeno)}` : cast;
}

function nadpisFaze(p: Prehled, domek: string): string {
  switch (p.faze) {
    case "pred":
      return p.dniDoPrijezdu === 2 ? "Pozítří jedete do lesa" : `Do lesa za ${p.dniDoPrijezdu} dní`;
    case "prijezd":
      return p.dniDoPrijezdu === 0 ? "Dnes se vidíme" : "Zítra vyrážíte";
    case "behem":
      // „Vítejte" druhý den zní jako automat, který neví, že tu host už spal.
      return p.dniDoOdjezdu >= 3 ? `Jste v ${vLokalu(domek)}` : "Užijte si to tu";
    case "odjezd":
      return p.dniDoOdjezdu === 0 ? "Dnes odjíždíte" : "Zítra odjíždíte";
    case "po":
      return "Děkujeme, že jste tu byli";
  }
}

function podnadpis(p: Prehled, pobyt: { domek: string; prijezd: string; odjezd: string }): string {
  const den = (iso: string) =>
    new Date(iso).toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "numeric" });
  switch (p.faze) {
    case "pred":
    case "po":
      return `${pobyt.domek} · ${den(pobyt.prijezd)} – ${den(pobyt.odjezd)}`;
    case "prijezd":
      return `${pobyt.domek} · ${nociSlovem(p.noci)}`;
    case "behem":
      return `Odjezd ${den(pobyt.odjezd)}${p.dniDoOdjezdu > 1 ? ` · ještě ${nociSlovem(p.dniDoOdjezdu)}` : ""}`;
    case "odjezd":
      return `${pobyt.domek} · ${den(pobyt.odjezd)}`;
  }
}

function nociSlovem(n: number): string {
  const slova = ["nula", "jedna", "dvě", "tři", "čtyři", "pět", "šest", "sedm"];
  return `${slova[n] ?? String(n)} ${n === 1 ? "noc" : n < 5 ? "noci" : "nocí"}`;
}

function vLokalu(nazev: string): string {
  return /[aáeéiíoóuúyý]$/i.test(nazev) ? nazev : `${nazev}u`;
}

function vytahniKod(text: string): string | null {
  const m = text.match(/\b(\d{4,8})\b/);
  return m ? m[1] : null;
}

/* ===== Prvky ===== */

function Karta({
  nadpis,
  children,
  akce,
  zvyraznit,
}: {
  nadpis: string;
  children: React.ReactNode;
  akce?: { href: string; popis: string; externi?: boolean };
  zvyraznit?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border px-5 py-5 ${
        zvyraznit ? "border-ember/35 bg-ember/[0.07]" : "border-linen/10 bg-bark"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[12px] uppercase tracking-[0.14em] text-sage/80">{nadpis}</h2>
        {akce &&
          (akce.externi ? (
            <a href={akce.href} target="_blank" rel="noopener noreferrer" className="text-[13.5px] text-ember">
              {akce.popis} →
            </a>
          ) : (
            <Link href={akce.href} className="text-[13.5px] text-ember">
              {akce.popis} →
            </Link>
          ))}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Radka({ children }: { children: React.ReactNode }) {
  return <p className="px-1 text-[14px] leading-relaxed text-sage">{children}</p>;
}

function Odjezd({ stav, odjezdDo }: { stav: StavProtokolu; odjezdDo: string }) {
  if (stav.stav === "hotovo" || stav.stav === "bez_vyhodnoceni") {
    return <VzkazHostovi vzkaz={stav.vzkaz} />;
  }
  if (stav.stav === "ceka") {
    return (
      <Karta nadpis="Pobyt máte dokončený">
        <p className="text-[15px] leading-relaxed text-sage">
          Fotky procházíme. Za chvíli tu bude vidět, jestli od vás ještě něco potřebujeme.
        </p>
        <p className="mt-3 inline-flex items-center gap-2.5 text-[13.5px] text-sage/80">
          <span className="h-2 w-2 animate-pulse rounded-full bg-ember" aria-hidden="true" />
          Prohlížím fotky…
        </p>
      </Karta>
    );
  }
  if (stav.stav === "prilis_brzy" || stav.stav === "nezalozen") return null;

  const rozpracovano = stav.stav === "rozpracovano" && stav.hotovo > 0;
  return (
    <section className="rounded-2xl border border-ember/35 bg-ember/[0.07] px-5 py-5">
      <h2 className="font-display text-xl text-linen">Dokončení pobytu</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-sage">
        Tři věci, než zavřete dveře: vyfotit domek, vrátit klíč, zavřít okna. Pár minut.
      </p>
      {rozpracovano && (
        <p className="mt-2 text-[13.5px] text-ember">
          Rozpracováno: {stav.hotovo} z {stav.povinnych} povinných míst.
        </p>
      )}
      <Link
        href="/pobyt/odjezd"
        className="mt-4 flex min-h-[56px] w-full items-center justify-center rounded-full bg-ember px-6 text-[16px] font-semibold text-night hover:bg-ember-soft"
      >
        {rozpracovano ? "Pokračovat v dokončení" : "Dokončit pobyt"}
      </Link>
      <p className="mt-2.5 text-[13px] text-sage">Odjezd do {odjezdDo}.</p>
    </section>
  );
}
