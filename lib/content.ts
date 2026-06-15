/**
 * SEDMÝ LES — jediný zdroj pravdy pro obsah webu.
 * Veškeré texty, ceny a údaje o domcích se berou odsud.
 *
 * REALITA: dva černé kubické tiny housy (každý 15 m² = 10 m² přízemí + 5 m²
 * spací patro, výška 3,5 m), které lze pronajmout zvlášť nebo architektonicky
 * spojit v jeden celek 30 m². Stojí na samotě u zatopeného břidlicového lomu
 * v Jílovém u Držkova (Liberecký kraj, okraj Českého ráje).
 *
 * POZN.: Sauna a koupací sud se teprve PŘIPRAVUJÍ — všude o nich píšeme
 * v budoucím čase. Recenze, telefon a IČO jsou ilustrační placeholdery
 * k nahrazení před spuštěním — viz README.md.
 */

export const SITE = {
  name: "Sedmý les",
  domain: "sedmyles.cz",
  url: "https://sedmyles.cz",
  email: "ahoj@sedmyles.cz",
  phone: "+420 777 000 777", // PLACEHOLDER — doplnit skutečné číslo
  region: "Liberecký kraj", // Jílové u Držkova, okraj Českého ráje
  village: "Jílové u Držkova",
  claim: "Za sedmero horami. Na dohled Českého ráje.",
  instagram: "https://instagram.com/sedmyles.cz",
};

/* ===== Domky ===== */

export type House = {
  slug: "achat" | "mech";
  name: string;
  tagline: string;
  story: string;
  photo: string;
  photoAlt: string;
  photoSecondary: string;
  capacity: string;
  beds: string;
  area: string;
  signature: { title: string; desc: string };
  amenities: string[];
  detail: { title: string; text: string }[];
};

export const HOUSES: House[] = [
  {
    slug: "achat",
    name: "Achát",
    tagline: "Domek s oknem do lesa",
    story:
      "Celou jednu stěnu tvoří sklo tři krát tři metry. Sedíte uvnitř, venku se hýbe les a vám stačí jen koukat. Černý kubus se schová mezi stromy, ale to okno dovnitř pustí celý kraj — ráno mlhu nad lomem, večer poslední světlo mezi smrky.",
    photo: "/foto/domek-vecer.jpg",
    photoAlt: "Černý kubický tiny house Achát za soumraku, teplé světlo z velkého okna",
    photoSecondary: "/foto/interier-obyvak.jpg",
    capacity: "2 osoby",
    beds: "Dvojlůžko na spacím patře",
    area: "15 m² (10 m² obývací + 5 m² patro)",
    signature: {
      title: "Okno tři krát tři metry",
      desc: "Velkoformátové trojsklo přes celou stěnu s elektricky ovládanou venkovní žaluzií. Ve dne galerie lesa, večer ho zatáhnete a svět zůstane venku.",
    },
    amenities: [
      "Prosklená stěna 3 × 3 m (trojsklo) s el. venkovní žaluzií",
      "Spací patro pod 3,5m stropem",
      "Plně vybavená kuchyňská linka",
      "Koupelna se sprchou a WC",
      "Klimatizace a tepelné čerpadlo (teplo i chlazení)",
      "Kompletní zateplení, celoroční provoz",
      "Vinylová podlaha, březová překližka, LED lišty",
      "Wi-Fi (a vypínač, kterým ji zhasnete)",
      "Espresso kávovar a výběrová káva",
      "Povlečení, ručníky a útulné deky v ceně",
    ],
    detail: [
      {
        title: "Pro koho je Achát",
        text: "Pro dva, kteří chtějí hlavně klid a výhled. Pro fotografy mlhy, čtenáře a všechny, kdo dokážou půl dne prokoukat do lesa a nenudit se.",
      },
      {
        title: "Jak vypadá uvnitř",
        text: "Petrolejová zeleň, bílá a březová překližka. Černé ocelové schůdky vedou na spací patro, ze kterého je to oknem pořád ven do korun stromů. Malý, ale vzdušný — strop má tři a půl metru.",
      },
    ],
  },
  {
    slug: "mech",
    name: "Mech",
    tagline: "Domek se žaluziovou stěnou",
    story:
      "Mech je o kousek víc schovaný. Jednu stěnu kryje dřevěná žaluziová clona — přes den jí prosvítá slunce do pruhů, večer za ní zmizíte světu z očí. Stejně černý kubus, stejné ticho, jen o trochu víc soukromí.",
    photo: "/foto/domek-den.jpg",
    photoAlt: "Černý kubický tiny house Mech s dřevěnou žaluziovou stěnou na kraji lesa",
    photoSecondary: "/foto/interier-patro.jpg",
    capacity: "2 osoby",
    beds: "Dvojlůžko na spacím patře",
    area: "15 m² (10 m² obývací + 5 m² patro)",
    signature: {
      title: "Stínicí žaluziová stěna",
      desc: "Velká venkovní žaluzie přes celou stěnu. Naladíte si přesně tolik světla a soukromí, kolik chcete — od plného slunce po úplné zašití.",
    },
    amenities: [
      "Prosklená stěna 3 × 2 m (trojsklo) s el. venkovní žaluzií",
      "Dřevěná žaluziová clona přes celou stěnu",
      "Spací patro pod 3,5m stropem",
      "Plně vybavená kuchyňská linka",
      "Koupelna se sprchou a WC",
      "Klimatizace a tepelné čerpadlo (teplo i chlazení)",
      "Kompletní zateplení, celoroční provoz",
      "Vinylová podlaha, březová překližka, LED lišty",
      "Wi-Fi (a vypínač, kterým ji zhasnete)",
      "Povlečení, ručníky a útulné deky v ceně",
    ],
    detail: [
      {
        title: "Pro koho je Mech",
        text: "Pro ty, kdo chtějí být víc zalezlí. Žaluziová stěna dělá z terasy soukromý kout, do kterého není vidět — i když je půl metru od vody.",
      },
      {
        title: "Jak vypadá uvnitř",
        text: "Skoro stejný jako Achát — petrolejová zeleň, překližka, spací patro, ocelové schůdky. Okno je o kus menší, zato má navíc tu žaluziovou clonu, která mění celou náladu domku.",
      },
    ],
  },
];

/** Oba domky se dají architektonicky spojit v jeden obytný celek. */
export const JOIN = {
  title: "Dva domky, nebo jeden velký",
  desc: "Achát a Mech stojí kousek od sebe a dají se propojit v jeden obytný celek o 30 m². Pronajměte si jeden domek pro dva, nebo oba najednou — pro rodinu nebo dvě dvojice, co chtějí být spolu, ale každý se svým koutem. O spojení obou domků nám napište, doladíme to podle vás.",
};

/** Vybavení, které se teprve chystá — píšeme o něm v budoucím čase. */
export const PLANNED = {
  title: "Co teprve přibude",
  desc: "Sedmý les se pořád rodí. Na břeh lomu chystáme finskou saunu a dřevem vytápěný koupací sud — abyste se mohli prohřát a pak skočit rovnou do křišťálové vody. Otevřeme je během příští sezóny; ozveme se, jakmile budou hotové.",
  items: [
    {
      title: "Finská sauna nad lomem",
      desc: "Venkovní sauna s výhledem na hladinu. Vyhřát na 90 °C, pak tři kroky a šup do lomu — celý rok.",
    },
    {
      title: "Koupací sud pod hvězdami",
      desc: "Dřevem vytápěný sud na kraji terasy. Voda 38 °C, nad hlavou hvězdy, v ruce hrnek svařáku.",
    },
  ],
};

/* ===== Ceník ===== */

export const PRICING = {
  currency: "Kč",
  baseNight: 2890, // ne–čt, za jeden domek
  weekendNight: 3490, // noci z pátku a ze soboty
  highSeasonExtra: 400, // 15. 6. – 15. 9. a 20. 12. – 2. 1.
  minNights: 2,
  weekDiscount: 0.1, // 7+ nocí
  deposit: 3000, // vratná kauce
  checkIn: "15:00 – 20:00",
  checkOut: "do 11:00",
  notes: [
    "Cena je za jeden domek a noc, ať jste dva nebo přijedete sami.",
    "Chcete oba domky (až 4 lidi) nebo je spojit v jeden? Napište nám.",
    "Minimální délka pobytu jsou 2 noci. Při pobytu na 7 a více nocí sleva 10 %.",
    "Vratná kauce 3 000 Kč se vrací do 3 dnů po odjezdu.",
    "V ceně: povlečení, ručníky, káva, dřevo do ohniště a závěrečný úklid.",
    "Domky jsou celoroční — topí tepelné čerpadlo, v létě chladí klimatizace.",
  ],
};

export type Addon = {
  id: string;
  name: string;
  desc: string;
  price: number;
  unit: string;
};

export const ADDONS: Addon[] = [
  {
    id: "snidane",
    name: "Snídaňový koš",
    desc: "Kváskový chléb, máslo, vejce od sousedů, sýr, džem, ovoce a mléko. Ráno visí na klice.",
    price: 490,
    unit: "za den",
  },
  {
    id: "vino",
    name: "Lahev moravského vína",
    desc: "Ryzlink nebo Pinot noir z malého vinařství, vychlazené v lednici.",
    price: 390,
    unit: "za lahev",
  },
  {
    id: "drevo",
    name: "Extra dřevo na ohniště",
    desc: "Pořádná náruč bukového dřeva na celovečerní oheň. První dřevo dostanete v ceně.",
    price: 250,
    unit: "za balík",
  },
  {
    id: "pes",
    name: "Pes",
    desc: "Pelíšek, misky a pamlsky nachystané. Maximálně jeden pes na domek.",
    price: 350,
    unit: "za pobyt",
  },
  {
    id: "pozdni",
    name: "Pozdní odjezd do 17:00",
    desc: "Když se vám nebude chtít. Podle obsazenosti — potvrdíme den předem.",
    price: 600,
    unit: "jednorázově",
  },
];

/* ===== Zážitky / co tu je ===== */

export const EXPERIENCES = [
  {
    title: "Zatopený lom",
    desc: "Bývalý břidlicový lom přímo u domků, dnes jezírko s tak čistou vodou, že mu místní říkají České Chorvatsko. V létě na plavání a skoky ze skály, v zimě pro otužilce.",
  },
  {
    title: "Ticho a tmavá obloha",
    desc: "Žádná hlavní silnice, žádný ruch. V noci skoro nulový světelný smog — za jasna je z terasy vidět Mléčná dráha pouhým okem.",
  },
  {
    title: "Český ráj za rohem",
    desc: "Skalní města, vyhlídky a hrady. Frýdštejn, Suché skály i Maloskalsko máte do dvaceti minut autem.",
  },
  {
    title: "Kozákov a acháty",
    desc: "Vyhaslá sopka a nejvyšší vrch Českého ráje s rozhlednou. Po loukách kolem se dodnes hledají acháty, ametysty a křišťály.",
  },
  {
    title: "Sklářský Železný Brod",
    desc: "Pět kilometrů odsud leží skleněné městečko — hutě, ateliéry a muzeum skla. Ideální cíl, když přijde déšť.",
  },
  {
    title: "Brzy: sauna a sud",
    desc: "Na břeh lomu chystáme finskou saunu a koupací sud. Otevřeme je příští sezónu — prohřát se a skočit do studené vody bude pak otázkou tří kroků.",
  },
];

/* ===== FAQ ===== */

export const FAQ_ITEMS = [
  {
    q: "Kde přesně Sedmý les je?",
    a: "Na samotě u zatopeného lomu nad Jílovým u Držkova, na okraji Českého ráje v Libereckém kraji. Přesné souřadnice posíláme s potvrzenou rezervací — soukromí hostů chráníme i takhle. Z Prahy to máte zhruba hodinu a půl, z Liberce a Jablonce přibližně půl hodiny.",
  },
  {
    q: "Jak je to s domky — kolik jich je a pro kolik lidí?",
    a: "Jsou dva: Achát a Mech. Každý je pro dva a má spací patro. Můžete si vzít jeden domek pro dvojici, nebo oba najednou — pak je vás až čtyři. Oba domky se dají i architektonicky spojit v jeden celek o 30 m²; o spojení nám napište.",
  },
  {
    q: "Jak velký takový domek je?",
    a: "Patnáct metrů čtverečních: deset dole jako obývák s kuchyní a koupelnou, pět nahoře jako spací patro. Strop má tři a půl metru, takže je uvnitř vzdušno. Jednu stěnu tvoří velké trojsklo s venkovní žaluzií.",
  },
  {
    q: "Je tam sauna nebo koupací sud?",
    a: "Zatím ne — ale chystáme je. Na břeh lomu přibude finská sauna a dřevem vytápěný koupací sud, otevřeme je během příští sezóny. Do té doby je tu na prohřátí i ochlazení samotný lom.",
  },
  {
    q: "Jak probíhá check-in?",
    a: "Bezkontaktně. Den před příjezdem vám pošleme souřadnice, video s cestou a kód od schránky s klíčem. Přijet můžete kdykoli mezi 15:00 a 20:00, po domluvě i později.",
  },
  {
    q: "Zvládneme to autem? A v zimě?",
    a: "Ano, až k domkům vede zpevněná cesta a je u nich parkování. V zimě cestu udržujeme; stačí běžné zimní pneumatiky.",
  },
  {
    q: "Můžeme vzít děti?",
    a: "Můžete. Spací patro děti milují a kolem je spousta prostoru. Lom je ale hlubší voda bez mělčiny — menší děti u vody hlídejte, plotem oddělený není.",
  },
  {
    q: "Můžeme vzít psa?",
    a: "Jednoho psa na domek rádi přivítáme (350 Kč za pobyt). Pelíšek, misky a pamlsky budou čekat. Po okolí prosíme na vodítku — kvůli srnkám.",
  },
  {
    q: "Dá se v lomu koupat?",
    a: "Dá, a je to zážitek. Bývalý břidlicový lom má křišťálově čistou vodu — místní mu neřeknou jinak než České Chorvatsko. Koupání je na vlastní odpovědnost, lom není hlídané koupaliště.",
  },
  {
    q: "Je v domku Wi-Fi a signál?",
    a: "Wi-Fi ano — a má vlastní vypínač, který doporučujeme použít. Mobilní signál je slabší, na zavolání to stačí, na pracovní porady ne. Považujte to za vlastnost, ne vadu.",
  },
  {
    q: "Co se dá v okolí dělat?",
    a: "Spousta. Český ráj se skalními městy, hrady Frýdštejn a Návarov, Suché skály, Maloskalsko, vyhlídková sopka Kozákov s acháty, Bozkovské dolomitové jeskyně a sklářský Železný Brod kousek odsud. A když prší, je nejhezčí zůstat u okna.",
  },
  {
    q: "Jak funguje rezervace a platba?",
    a: "Vyberete termín v rezervačním formuláři, my do 24 hodin potvrdíme dostupnost a pošleme platební údaje. Záloha 50 % do 3 dnů, doplatek 14 dní před příjezdem. Pak už jen přijedete.",
  },
  {
    q: "Jaké jsou storno podmínky?",
    a: "Při zrušení 30 a více dní před příjezdem vracíme 100 % uhrazených plateb, 14–29 dní 50 %. Při pozdějším stornu nabídneme náhradní termín do roka. Když zrušíme my (kalamita apod.), vracíme vše do koruny.",
  },
];

/* ===== Lokalita ===== */

export const LOCATION = {
  region: "Liberecký kraj",
  secretNote:
    "Přesnou polohu prozradíme až s potvrzenou rezervací. Sedmý les se nehledá — Sedmý les se najde.",
  distances: [
    { place: "Praha", time: "≈ 1 h 30 min autem" },
    { place: "Liberec", time: "≈ 30 min autem" },
    { place: "Jablonec nad Nisou", time: "≈ 25 min autem" },
    { place: "Železný Brod", time: "≈ 10 min (5 km)" },
    { place: "Vlak: Železný Brod", time: "5 km, vyzvedneme vás" },
  ],
  around: [
    {
      title: "Zatopený lom",
      desc: "Pár kroků od domků. Bývalý břidlicový lom s křišťálovou vodou — koupání, skoky ze skály, v zimě otužování.",
    },
    {
      title: "Český ráj",
      desc: "Nejstarší chráněná krajina u nás a geopark UNESCO. Skalní města, vyhlídky a hrady začínají hned za kopcem.",
    },
    {
      title: "Frýdštejn a Suché skály",
      desc: "Zřícenina hradu s kulatou věží a dramatický skalní hřeben nad Jizerou. Maloskalsko do dvaceti minut.",
    },
    {
      title: "Kozákov",
      desc: "Vyhaslá sopka, nejvyšší vrch Českého ráje s rozhlednou. Acháty a ametysty se tu hledají dodnes.",
    },
    {
      title: "Železný Brod",
      desc: "Skleněné městečko pět kilometrů odsud — sklářské ateliéry, hutě a muzeum skla.",
    },
    {
      title: "Bozkovské jeskyně",
      desc: "Největší jeskynní systém severních Čech s podzemním jezírkem, kousek po silnici.",
    },
  ],
};

/* ===== Poukazy ===== */

export const VOUCHER = {
  title: "Darujte ticho",
  desc: "Dárkový poukaz na pobyt v Sedmém lese. Elegantní PDF do hodiny v e-mailu, nebo vytištěný na bavlněném papíře poštou. Platnost 12 měsíců, termín si obdarovaný vybere sám.",
  variants: [
    { name: "Dvě noci ve všední dny", price: 5780 },
    { name: "Prodloužený víkend (pá–ne)", price: 6980 },
    { name: "Otevřený poukaz na částku", price: 0 },
  ],
};

/* ===== Navigace ===== */

export const NAV_LINKS = [
  { href: "/domky", label: "Domky" },
  { href: "/lokalita", label: "Lokalita" },
  { href: "/galerie", label: "Galerie" },
  { href: "/cenik", label: "Ceník" },
  { href: "/faq", label: "Časté dotazy" },
  { href: "/kontakt", label: "Kontakt" },
];

export const LEGAL_LINKS = [
  { href: "/obchodni-podminky", label: "Obchodní podmínky" },
  { href: "/ochrana-osobnich-udaju", label: "Ochrana osobních údajů" },
  { href: "/cookies", label: "Cookies" },
];
