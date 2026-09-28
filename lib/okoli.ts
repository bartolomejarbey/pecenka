/**
 * Okolí lomu — místa, která hostům doporučujeme, i s polohou pro mapu.
 *
 * Jeden seznam pro léto i zimu. Každé místo má sezónu: `leto`, `zima`, nebo
 * `celorocne` (ukáže se v obou polohách přepínače, případně s jiným popisem
 * pro zimu). Souřadnice jsou pro značku na mapě; odkaz do Map vede přes
 * vyhledání názvu, takže trefí správný vchod, i když je značka o kus vedle.
 *
 * Doba jízdy autem je odhad od lomu po běžných silnicích, zaokrouhlený —
 * proto všude „≈". Vzdušná vzdálenost se počítá ze souřadnic.
 *
 * Fakta (délky, výšky, otevírací doby) jsou z oficiálních stránek a Wikipedie
 * k září 2026. Co se mění každou sezónu, píšeme s výzvou „ověřte si".
 */

import { LOCATION } from "./content";
import { FOTO_MIST, type FotoMista } from "./okoli-foto";

export type Kategorie = "voda" | "hory" | "skaly" | "vylety" | "vyhledy" | "pod-strechou";
export type Sezonnost = "leto" | "zima" | "celorocne";
/** Filtr na stránce: kategorie, „s dětmi", nebo nic. */
export type Filtr = Kategorie | "deti" | null;

export const KATEGORIE: { id: Kategorie; nazev: string }[] = [
  { id: "voda", nazev: "Voda" },
  { id: "hory", nazev: "Lyže a hory" },
  { id: "skaly", nazev: "Skály a ferraty" },
  { id: "vylety", nazev: "Hrady a stezky" },
  { id: "vyhledy", nazev: "Rozhledny" },
  { id: "pod-strechou", nazev: "Když prší" },
];

export const SEZONNOST_POPIS: Record<Sezonnost, string> = {
  leto: "léto",
  zima: "zima",
  celorocne: "celoročně",
};

export type Misto = {
  id: string;
  nazev: string;
  /** Obec nebo oblast — druhý řádek karty. */
  misto: string;
  kategorie: Kategorie;
  sezona: Sezonnost;
  lat: number;
  lng: number;
  /** Přibližná doba jízdy autem od lomu v minutách. */
  autem: number;
  popis: string;
  /** Jiný popis pro zimní polohu přepínače (jen u celoročních míst). */
  popisZima?: string;
  /** Praktická poznámka — otevírací doba, parkování, na co si dát pozor. */
  tip?: string;
  web?: string;
  /** Vhodné s dětmi. */
  deti?: boolean;
  /** Dotaz pro vyhledání v Mapách, když samotný název nestačí. */
  hledat?: string;
  /** Lom sám — na mapě má vlastní značku. */
  doma?: boolean;
  /** Tři vybraná místa pro sezónu na začátku seznamu. */
  top?: ("leto" | "zima")[];
};

export const MISTA: Misto[] = [
  {
    id: "lom",
    nazev: LOCATION.name,
    misto: "pár kroků od domků",
    kategorie: "voda",
    sezona: "celorocne",
    lat: LOCATION.lat,
    lng: LOCATION.lng,
    autem: 0,
    popis:
      "Bývalý břidlicový lom na jižním okraji obce, dnes jezírko 60 × 35 metrů a zhruba šest metrů hluboké. Voda je průzračná, na dně žijí raci a místní mu neřeknou jinak než České Chorvatsko. Travnatá pláž, vstup do vody po břidlici, v létě stánek s občerstvením.",
    popisZima:
      "V zimě patří lom otužilcům. Voda má pár stupňů, břeh je tichý a po ránu nad hladinou stojí pára. Tři kroky z terasy, minuta ve vodě, pak hrnek čaje.",
    tip: "Koupání je na vlastní odpovědnost — lom není hlídané koupaliště a je hluboký hned od břehu.",
    doma: true,
  },
  {
    id: "zluta-plovarna",
    top: ["leto"],
    nazev: "Žlutá plovárna",
    misto: "Malá Skála",
    kategorie: "voda",
    sezona: "leto",
    lat: 50.6437,
    lng: 15.193,
    autem: 18,
    popis:
      "Největší půjčovna lodí na Jizeře — kánoe, rafty, kajaky i paddleboardy, lodě se vracejí v Líšném nebo v Dolánkách. Nejoblíbenější úsek Malá Skála – Dolánky má 9,5 km a trvá dvě až tři hodiny, zvládnou ho i úplní začátečníci. K tomu koloběžky, lanové centrum a plovárna nad jezem.",
    tip: "V sezóně rezervujte lodě dopředu, o víkendech bývá plno.",
    web: "https://www.zlutaplovarna.cz",
    deti: true,
    hledat: "Žlutá plovárna Malá Skála",
  },
  {
    id: "jablonecka-prehrada",
    nazev: "Jablonecká přehrada",
    misto: "Jablonec nad Nisou",
    kategorie: "voda",
    sezona: "leto",
    lat: 50.7336,
    lng: 15.1731,
    autem: 28,
    popis:
      "Největší městská nádrž ve střední Evropě, čtyřicet hektarů vody uprostřed Jablonce. Písčité pláže, okruh kolem hrází na procházku či brusle a večer zmrzlina na hrázi.",
    deti: true,
  },
  {
    id: "mumlava",
    nazev: "Mumlavský vodopád",
    misto: "Harrachov",
    kategorie: "vylety",
    sezona: "celorocne",
    lat: 50.7703,
    lng: 15.4539,
    autem: 40,
    popis:
      "Jeden z nejmohutnějších vodopádů v Česku, deset metrů široký a stejně vysoký. Pohodlná procházka dva kilometry z Harrachova podél řeky, kolem obřích hrnců vymletých do žuly — místní jim říkají čertova oka.",
    popisZima:
      "V zimě vodopád zamrzá do ledových varhan a cesta podél Mumlavy je jednou z nejhezčích zimních procházek v Krkonoších. Nesmeky se hodí.",
    deti: true,
  },
  {
    id: "ferrata-vodni-brana",
    top: ["leto"],
    nazev: "Via ferrata Vodní brána",
    misto: "Semily",
    kategorie: "skaly",
    sezona: "celorocne",
    lat: 50.6139,
    lng: 15.312,
    autem: 18,
    popis:
      "Zajištěné lezecké cesty nad údolím Jizery, jak je znáte z Alp. Tři trasy různé obtížnosti, dohromady 450 metrů; nejdelší fialová má 220 metrů a 75 metrů převýšení. Přístup je volný a zdarma, nutná je helma, úvazek a ferratový set.",
    popisZima:
      "Ferrata je otevřená celoročně, ale v mrazu a na mokru patří jen zkušeným. Nejdramatičtější kus údolí Jizery si zatím vychutnejte zespodu — po Riegrově stezce.",
    tip: "Parkoviště v ulici U Tunelu (50 Kč na 12 hodin), pěšky od nádraží v Semilech 40 minut.",
    web: "https://www.vodni-brana.cz",
    hledat: "Via ferrata Vodní brána Semily",
  },
  {
    id: "riegrova-stezka",
    nazev: "Riegrova stezka",
    misto: "Semily – Spálov",
    kategorie: "vylety",
    sezona: "celorocne",
    lat: 50.6239,
    lng: 15.3106,
    autem: 18,
    popis:
      "Pět kilometrů podél Jizery sevřené skalami, po červené značce od roku 1909. Lávka 77 metrů dlouhá zavěšená pět a půl metru nad řekou, tunel, stará vodní elektrárna a Böhmova vyhlídka. Zpátky to jde vlakem.",
    popisZima:
      "V zimě bývá stezka namrzlá, ale s nesmeky je to nejtišší procházka v okolí — jen řeka a rampouchy na skalách.",
    deti: true,
    hledat: "Riegrova stezka Semily",
  },
  {
    id: "suche-skaly",
    nazev: "Suché skály",
    misto: "Malá Skála",
    kategorie: "skaly",
    sezona: "celorocne",
    lat: 50.6367,
    lng: 15.2122,
    autem: 20,
    popis:
      "Kilometr dlouhý pískovcový hřeben nad Jizerou, kterému se říká Kantorovy varhany. Národní přírodní památka a lezecký ráj: tvrdý křemitý pískovec, na kterém se dá lézt i za mokra. Nejhezčí pohled je po červené z Malé Skály na vrch Sokol.",
  },
  {
    id: "hruboskalsko",
    nazev: "Hruboskalské skalní město",
    misto: "Hrubá Skála",
    kategorie: "skaly",
    sezona: "celorocne",
    lat: 50.545,
    lng: 15.1942,
    autem: 32,
    popis:
      "Nejznámější skalní město Českého ráje: stovky pískovcových věží, Mariánská vyhlídka a Zlatá stezka z Hrubé Skály na Valdštejn. Zámek na skále slouží jako hotel, nádvoří a věž jsou přístupné.",
    deti: true,
  },
  {
    id: "kozakov",
    top: ["leto"],
    nazev: "Kozákov",
    misto: "Semily",
    kategorie: "vyhledy",
    sezona: "celorocne",
    lat: 50.5939,
    lng: 15.2633,
    autem: 22,
    popis:
      "Vyhaslá sopka a nejvyšší vrch Českého ráje (744 m) s rozhlednou: čtyřicet metrů výšky, ochoz ve čtyřiadvaceti, výhled od Ještědu po Sněžku. Ve Votrubcově lomu si acháty a ametysty můžete zkusit najít sami. Riegrova chata na vrcholu vaří.",
    popisZima:
      "V zimě bývá z rozhledny nejčistší vzduch a nejdelší výhled v roce — zasněžené Krkonoše jsou na dosah ruky.",
    deti: true,
    hledat: "Rozhledna Kozákov",
  },
  {
    id: "stepanka",
    nazev: "Rozhledna Štěpánka",
    misto: "Kořenov – Příchovice",
    kategorie: "vyhledy",
    sezona: "celorocne",
    lat: 50.7466,
    lng: 15.3659,
    autem: 25,
    popis:
      "Novogotická kamenná věž z roku 1892 na vrchu Hvězda (958 m), 81 schodů a výhled na Jizerské hory i Krkonoše najednou. Nejhezčí rozhledna v okolí — i s legendou o věštbě, kvůli které ji stavěli půl století.",
  },
  {
    id: "cerna-studnice",
    nazev: "Černá Studnice",
    misto: "Smržovka",
    kategorie: "vyhledy",
    sezona: "celorocne",
    lat: 50.7119,
    lng: 15.2339,
    autem: 15,
    popis:
      "Žulová rozhledna z roku 1905 na hřebeni nad Zásadou, 91 schodů a celý Jablonec pod nohama. Chata na vrcholu vaří od otevření rozhledny — a v zimě je to nejbližší místo, kam dojet za sněhem.",
    hledat: "Rozhledna Černá Studnice",
  },
  {
    id: "tanvaldsky-spicak",
    nazev: "Rozhledna Tanvaldský Špičák",
    misto: "Tanvald",
    kategorie: "vyhledy",
    sezona: "celorocne",
    lat: 50.7475,
    lng: 15.2889,
    autem: 22,
    popis:
      "Kamenná rozhledna z roku 1909 na vrcholu Špičáku (812 m). V létě nahoru pěšky z Tanvaldu, v zimě sedačkovou lanovkou ze skiareálu na severní straně.",
  },
  {
    id: "frydstejn",
    nazev: "Hrad Frýdštejn",
    misto: "Frýdštejn",
    kategorie: "vylety",
    sezona: "leto",
    lat: 50.6486,
    lng: 15.1678,
    autem: 25,
    popis:
      "Zřícenina ze 14. století s kulatou věží vytesanou do skály, kde se natáčela pohádka O princezně Jasněnce a létajícím ševci. Z věže je vidět Ještěd, Suché skály i Kozákov.",
    tip: "Otevřeno duben až říjen.",
    deti: true,
  },
  {
    id: "pantheon",
    nazev: "Vranov – Pantheon",
    misto: "Malá Skála",
    kategorie: "vylety",
    sezona: "celorocne",
    lat: 50.648,
    lng: 15.1905,
    autem: 18,
    popis:
      "Skalní hrad z 15. století, v roce 1802 přestavěný na romantický památník s kaplí a vyhlídkami do údolí Jizery. Půlkilometrový hřeben, ze kterého je Maloskalsko jako na dlani.",
    hledat: "Pantheon Vranov Malá Skála",
  },
  {
    id: "navarov",
    nazev: "Hrad Návarov",
    misto: "Zlatá Olešnice",
    kategorie: "vylety",
    sezona: "leto",
    lat: 50.6822,
    lng: 15.3222,
    autem: 15,
    popis:
      "Zřícenina nad soutokem Kamenice a Zlatníku, sedm kilometrů od Železného Brodu. Po zelené z Návarova dolů do údolí a dál po Palackého stezce podél Kamenice — jedno z nejtišších údolí v kraji.",
    tip: "Otevřeno od dubna do října.",
  },
  {
    id: "trosky",
    nazev: "Hrad Trosky",
    misto: "Rovensko pod Troskami",
    kategorie: "vylety",
    sezona: "leto",
    lat: 50.5163,
    lng: 15.2308,
    autem: 35,
    popis:
      "Symbol Českého ráje: dvě věže na sopečných sucích, Baba a Panna, a mezi nimi hradní nádvoří. Z Panny je za jasného dne vidět až k Praze.",
    tip: "Otevřeno duben až říjen.",
    deti: true,
  },
  {
    id: "sychrov",
    nazev: "Zámek Sychrov",
    misto: "Sychrov",
    kategorie: "vylety",
    sezona: "celorocne",
    lat: 50.6264,
    lng: 15.0894,
    autem: 30,
    popis:
      "Novogotické sídlo rodu Rohanů s třiadvacetihektarovým anglickým parkem. Interiéry po celý rok, park zdarma — a před Vánoci zámek plný stromků a adventu.",
    deti: true,
  },
  {
    id: "dlaskuv-statek",
    nazev: "Dlaskův statek",
    misto: "Dolánky u Turnova",
    kategorie: "vylety",
    sezona: "leto",
    lat: 50.603,
    lng: 15.1721,
    autem: 25,
    popis:
      "Jedna z nejzachovalejších roubených usedlostí Pojizeří, muzeum lidové architektury z 18. století. Stojí na konci vodácké trasy z Malé Skály a na cyklostezce Greenway Jizera.",
    deti: true,
  },
  {
    id: "greenway-jizera",
    nazev: "Greenway Jizera",
    misto: "Malá Skála – Dolánky – Turnov",
    kategorie: "vylety",
    sezona: "leto",
    lat: 50.633,
    lng: 15.184,
    autem: 18,
    popis:
      "Rovná cyklostezka podél řeky, bez aut a bez kopců — z Malé Skály přes Líšný do Dolánek a Turnova. Kola i koloběžky půjčí na Žluté plovárně.",
    deti: true,
    hledat: "Greenway Jizera Malá Skála",
  },
  {
    id: "bozkov",
    nazev: "Bozkovské dolomitové jeskyně",
    misto: "Bozkov",
    kategorie: "pod-strechou",
    sezona: "celorocne",
    lat: 50.6468,
    lng: 15.3382,
    autem: 15,
    popis:
      "Jediné dolomitové jeskyně v Čechách a největší podzemní jezero u nás. Čtyři sta metrů prohlídkové trasy, tři sta schodů a stálých 7,6 °C — v létě bunda, v zimě příjemně.",
    tip: "Otevřeno celoročně kromě pondělí; v sezóně si vstupenku rezervujte.",
    web: "https://www.caves.cz/jeskyne/bozkovske-dolomitove-jeskyne",
    deti: true,
  },
  {
    id: "zelezny-brod",
    nazev: "Sklářský Železný Brod",
    misto: "Železný Brod",
    kategorie: "pod-strechou",
    sezona: "celorocne",
    lat: 50.6428,
    lng: 15.2542,
    autem: 8,
    popis:
      "Pět kilometrů od lomu leží město skla. Sklářská škola tu učí od roku 1920, městské muzeum má sklářskou expozici a na Trávníkách stojí roubené domy, jako by je někdo zapomněl v devatenáctém století.",
    hledat: "Městské muzeum Železný Brod",
  },
  {
    id: "muzeum-skla-jablonec",
    nazev: "Muzeum skla a bižuterie",
    misto: "Jablonec nad Nisou",
    kategorie: "pod-strechou",
    sezona: "celorocne",
    lat: 50.7226,
    lng: 15.1722,
    autem: 28,
    popis:
      "Sedm století českého skla a nekonečný příběh bižuterie. V přístavbě ve tvaru krystalu je Svět zázraků — největší veřejná sbírka skleněných vánočních ozdob na světě.",
    web: "https://www.msb-jablonec.cz",
    deti: true,
    hledat: "Muzeum skla a bižuterie Jablonec nad Nisou",
  },
  {
    id: "pivovar-rohozec",
    nazev: "Pivovar Rohozec",
    misto: "Malý Rohozec, Turnov",
    kategorie: "pod-strechou",
    sezona: "celorocne",
    lat: 50.6055,
    lng: 15.164,
    autem: 22,
    popis:
      "Rodinný pivovar od roku 1850, kde se vaří postaru — Skalák a dalších dvanáct piv. Sobotní exkurze s ochutnávkou, pivovarská restaurace ve stínu zámečku.",
    web: "https://www.pivorohozec.cz",
  },
  {
    id: "jizerka",
    nazev: "Jizerka a Bukovec",
    misto: "Kořenov",
    kategorie: "hory",
    sezona: "celorocne",
    lat: 50.8156,
    lng: 15.3508,
    autem: 45,
    popis:
      "Nejvýše položená osada Jizerských hor (862 m) pod čedičovým Bukovcem, rašeliniště a Jizerská oblast tmavé oblohy — bez veřejného osvětlení, s tisícovkou hvězd pouhým okem.",
    popisZima:
      "V zimě je Jizerka výchozím bodem na běžky po náhorní plošině: upravené stopy na Smědavu a Knajpu, ticho a sníh, který jinde není.",
  },
  {
    id: "bedrichov",
    top: ["zima"],
    nazev: "Bedřichov – Jizerská magistrála",
    misto: "Bedřichov",
    kategorie: "hory",
    sezona: "celorocne",
    lat: 50.7911,
    lng: 15.1426,
    autem: 35,
    popis:
      "Start Jizerské padesátky a devadesáti kilometrů upravovaných běžeckých stop. V létě po stejných cestách na kole, s výletem na Novou Louku nebo Kristiánov.",
    popisZima:
      "Nejznámější běžkařské centrum v Česku: od stadionu v Bedřichově vedou stopy na Novou Louku, Kristiánov, Knajpu a Smědavu. Sjezdovky na Malinovém vrchu byly v sezóně 2025/26 mimo provoz — ověřte si aktuální stav.",
    hledat: "Bedřichov stadion Jizerská magistrála",
  },
  {
    id: "ski-spicak",
    top: ["zima"],
    nazev: "Skiareál Tanvaldský Špičák",
    misto: "Albrechtice v Jizerských horách",
    kategorie: "hory",
    sezona: "zima",
    lat: 50.757,
    lng: 15.283,
    autem: 22,
    popis:
      "Největší lyžařské středisko Jizerských hor: dvě čtyřsedačkové lanovky, sjezdovky všech obtížností na severním svahu Špičáku, dětský park a večerní lyžování od pěti do osmi.",
    web: "https://www.skijizerky.cz",
    deti: true,
  },
  {
    id: "ski-rejdice",
    nazev: "Skiareál Kořenov – Rejdice",
    misto: "Příchovice",
    kategorie: "hory",
    sezona: "zima",
    lat: 50.7342,
    lng: 15.3618,
    autem: 25,
    popis:
      "Rodinný areál na pomezí Jizerek a Krkonoš: sedačková lanovka, dva vleky, 950 metrů sjezdovek mezi modrou a červenou, večerní lyžování od šesti do osmi. Za rohem tři upravované běžkařské okruhy.",
    web: "https://www.rejdice.cz",
    deti: true,
  },
  {
    id: "ski-harrachov",
    nazev: "Skiareál Harrachov",
    misto: "Harrachov",
    kategorie: "hory",
    sezona: "zima",
    lat: 50.7611,
    lng: 15.43,
    autem: 38,
    popis:
      "Čertova hora nad Harrachovem: dvě lanovky, tři vleky, přes sedm kilometrů sjezdovek a večerní lyžování. Pod svahem skokanské můstky Čerťák, o kus dál Mumlavský vodopád v ledu.",
    web: "https://www.skiareal.com",
  },
  {
    id: "ski-rokytnice",
    nazev: "Skiareál Rokytnice nad Jizerou",
    misto: "Rokytnice nad Jizerou",
    kategorie: "hory",
    sezona: "zima",
    lat: 50.7376,
    lng: 15.4791,
    autem: 42,
    popis:
      "Horní Domky a Lysá hora — jedno z největších středisek Krkonoš, sjezdovky od zelené po černou a nejdelší tratě v okolí. Pro běžkaře Velký okruh 14,4 km.",
  },
  {
    id: "ski-severak",
    nazev: "Skiareál Severák",
    misto: "Janov nad Nisou – Hrabětice",
    kategorie: "hory",
    sezona: "zima",
    lat: 50.7807,
    lng: 15.1886,
    autem: 32,
    popis:
      "Nejlepší svahy pro první oblouky: řada dětských vleků, mírné sjezdovky, lyžařská škola a večerní lyžování až do devíti. Osm kilometrů od Jablonce, parkování zdarma.",
    web: "https://www.skijizerky.cz",
    deti: true,
  },
  {
    id: "ski-zasada",
    top: ["zima"],
    nazev: "Ski centrum Zásada",
    misto: "Zásada",
    kategorie: "hory",
    sezona: "zima",
    lat: 50.7003,
    lng: 15.247,
    autem: 8,
    popis:
      "Nejbližší sjezdovka, deset minut od lomu. Rodinný areál pod Černou Studnicí: hlavní svah 500 metrů se 110 metry převýšení, dětská sjezdovka s provazovým vlekem, zasněžování, večerní lyžování od úterý do soboty, škola, půjčovna i pizzerie.",
    deti: true,
    hledat: "Ski centrum Zásada",
  },
  {
    id: "ski-plavy",
    nazev: "Ski areál Plavy",
    misto: "Plavy",
    kategorie: "hory",
    sezona: "zima",
    lat: 50.7052,
    lng: 15.3145,
    autem: 10,
    popis:
      "Malý areál nad Plavy, mezi Železným Brodem a Tanvaldem: čtyři sjezdovky, dva vleky, umělý sníh a klid pro začátečníky. Ideální na první den na lyžích.",
    deti: true,
    hledat: "Ski areál Plavy",
  },
  {
    id: "ski-zlata-olesnice",
    nazev: "Ski areál Zlatá Olešnice",
    misto: "Zlatá Olešnice",
    kategorie: "hory",
    sezona: "zima",
    lat: 50.7225,
    lng: 15.345,
    autem: 15,
    popis:
      "Tři sjezdovky a dva vleky na hranici Jizerských hor a Krkonoš (510–655 m), denně upravované. Bez front, bez davů.",
    hledat: "Ski areál Zlatá Olešnice",
  },
  {
    id: "bezky-drzkov",
    nazev: "Běžecké stopy Držkov – Zásada – Plavy",
    misto: "Držkov",
    kategorie: "hory",
    sezona: "zima",
    lat: 50.7017,
    lng: 15.29,
    autem: 5,
    popis:
      "Když napadne, upravují se stopy hned za kopcem — v okolí Zásady, Držkova a Plavů. Z domku na běžky bez auta, pokud se sníh v pěti stech metrech udrží.",
    tip: "Sníh tu drží méně spolehlivě než v horách; při oblevě jeďte na Jizerku nebo do Bedřichova.",
    hledat: "Držkov",
  },
  {
    id: "bobovka-harrachov",
    nazev: "Bobová dráha Harrachov",
    misto: "Harrachov",
    kategorie: "hory",
    sezona: "celorocne",
    lat: 50.769,
    lng: 15.436,
    autem: 38,
    popis:
      "Kilometr dlouhá dráha na svahu nad městem — brzdíte si sami, takže jede každý svým tempem. V provozu v létě i v zimě podle počasí.",
    tip: "Provoz mimo hlavní sezónu si ověřte předem.",
    deti: true,
    hledat: "Bobová dráha Harrachov",
  },
  {
    id: "bobovka-rokytnice",
    nazev: "Bobová dráha Rokytnice",
    misto: "Rokytnice nad Jizerou",
    kategorie: "hory",
    sezona: "celorocne",
    lat: 50.735,
    lng: 15.465,
    autem: 42,
    popis:
      "Nová dráha z léta 2026, 1 675 metrů — jedna z nejdelších v Krkonoších, v areálu Horní Domky pod Lysou horou.",
    deti: true,
    hledat: "Bobová dráha Rokytnice nad Jizerou",
  },
];

/* ===== Pomocné výpočty ===== */

/** Vzdušná vzdálenost dvou bodů v kilometrech (haversine). */
export function vzdalenostKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Vzdušná vzdálenost od lomu, zaokrouhlená na celé kilometry. */
export function odLomuKm(m: { lat: number; lng: number }): number {
  return Math.round(vzdalenostKm(LOCATION, m));
}

/** Odkaz do Map (mapy.com, dřív mapy.cz) — vyhledá název, ne souřadnice. */
export function odkazMapy(m: Misto): string {
  return `https://mapy.com/turisticka?q=${encodeURIComponent(m.hledat ?? m.nazev)}`;
}

/** Místa pro danou polohu přepínače a filtr, seřazená podle doby jízdy. */
export function filtrujMista(mista: Misto[], sezona: "leto" | "zima", filtr: Filtr): Misto[] {
  return mista
    .filter((m) => m.sezona === "celorocne" || m.sezona === sezona)
    .filter((m) => (filtr === null ? true : filtr === "deti" ? m.deti === true : m.kategorie === filtr))
    .sort((a, b) => a.autem - b.autem);
}

/** Tři vybraná místa pro sezónu (mají `top`), v pořadí podle doby jízdy. */
export function vybraneProSezonu(mista: Misto[], sezona: "leto" | "zima"): Misto[] {
  return mista
    .filter((m) => m.top?.includes(sezona))
    .sort((a, b) => a.autem - b.autem)
    .slice(0, 3);
}

/** Vlastní fotka lomu — bez licence; ostatní místa mají fotku z Commons. */
const FOTO_LOMU: FotoMista = {
  src: "/foto/lom-jilove.jpg",
  alt: "Lom Jílové u Držkova: tmavá hladina zrcadlí oblohu s mraky, kolem břízy a smrky, vpravo břidlicová stěna",
  autor: "Sedmý les",
  licence: "vlastní",
  zdroj: "/lokalita",
};

/** Fotka místa, pokud nějakou máme. */
export function fotoMista(id: string): FotoMista | null {
  if (id === "lom") return FOTO_LOMU;
  return FOTO_MIST[id] ?? null;
}

/** Popis místa pro danou polohu přepínače. */
export function popisProSezonu(m: Misto, sezona: "leto" | "zima"): string {
  return sezona === "zima" && m.popisZima ? m.popisZima : m.popis;
}
