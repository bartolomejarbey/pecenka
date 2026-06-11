/**
 * SEDMÝ LES — jediný zdroj pravdy pro obsah webu.
 * Veškeré texty, ceny a údaje o domcích se berou odsud.
 *
 * POZN.: Recenze, telefon a některé údaje jsou ilustrační placeholdery
 * k nahrazení před spuštěním — viz README.md.
 */

export const SITE = {
  name: "Sedmý les",
  domain: "sedmyles.cz",
  url: "https://sedmyles.cz",
  email: "ahoj@sedmyles.cz",
  phone: "+420 777 000 777", // PLACEHOLDER — doplnit skutečné číslo
  region: "Kraj Vysočina", // PLACEHOLDER — upřesnit po dodání lokace
  claim: "Za sedmero horami. Hodinu od civilizace.",
  instagram: "https://instagram.com/sedmyles.cz",
};

/* ===== Domky ===== */

export type House = {
  slug: "zula" | "mech";
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
    slug: "zula",
    name: "Žula",
    tagline: "Domek nad zatopeným lomem",
    story:
      "Stojí na hraně skály, pár kroků od vody. Ráno se z hladiny lomu zvedá mlha a celé okno je najednou jedna velká obrazovka, na které neběží nic — a právě proto se od ní nedá odtrhnout.",
    photo: "/foto/tiny3.jpg",
    photoAlt: "Tiny house Žula na skále nad zatopeným lomem, ranní mlha nad hladinou",
    photoSecondary: "/foto/tiny1.jpg",
    capacity: "2 + 2 osoby",
    beds: "Manželská postel 180 cm + rozkládací pohovka",
    area: "26 m² + terasa 14 m²",
    signature: {
      title: "Finská sauna na hraně skály",
      desc: "Soukromá venkovní sauna s oknem na hladinu lomu. Vyhřejete ji na 90 °C, pak tři kroky a šup do vody. Celý rok, i v lednu.",
    },
    amenities: [
      "Panoramatické okno s výhledem na lom",
      "Finská sauna s výhledem (pro 2–3 osoby)",
      "Kamna na dřevo + podlahové topení",
      "Plně vybavená kuchyňka",
      "Koupelna s dešťovou sprchou a horkou vodou",
      "Krytá terasa s křesly",
      "Ohniště s grilovacím roštem",
      "Wi-Fi (a vypínač, kterým ji zhasnete)",
      "Kávovar na espresso a výběrová káva",
      "Povlečení, ručníky a župany v ceně",
    ],
    detail: [
      {
        title: "Pro koho je Žula",
        text: "Pro dva, kteří chtějí být hlavně spolu — a pro otužilce, fotografy mlhy a všechny, kdo věří, že nejlepší wellness je horká sauna a studený lom.",
      },
      {
        title: "Jak to u ní vypadá",
        text: "Černé dřevo, sklo a žula. Domek je posazený tak, abyste z postele viděli vodu a ze sauny západ slunce. Nejbližší soused: výr velký, asi 400 metrů vzdušnou čarou.",
      },
    ],
  },
  {
    slug: "mech",
    name: "Mech",
    tagline: "Domek na kraji louky",
    story:
      "Sedí na okraji lesa, kde končí stromy a začíná louka. Večer se terasa koupe v posledním slunci, v noci nad ní visí Mléčná dráha. Mech je domek pro ty, kdo si chtějí číst, koukat do ohně a nikam nespěchat.",
    photo: "/foto/tiny2.jpg",
    photoAlt: "Tiny house Mech na louce při západu slunce, dřevěná terasa s lehátky",
    photoSecondary: "/foto/tiny1.jpg",
    capacity: "2 + 2 osoby",
    beds: "Manželská postel 180 cm + spací patro pro 2",
    area: "24 m² + terasa 18 m²",
    signature: {
      title: "Koupací sud pod hvězdami",
      desc: "Dřevem vytápěný koupací sud na kraji terasy. Voda 38 °C, nad hlavou hvězdy, v ruce hrnek svařáku. Topíme my, vy jen lezete dovnitř.",
    },
    amenities: [
      "Prosklená stěna na jihozápad — západy slunce",
      "Koupací sud vytápěný dřevem (pro 2 osoby)",
      "Kamna na dřevo + podlahové topení",
      "Plně vybavená kuchyňka",
      "Koupelna s dešťovou sprchou a horkou vodou",
      "Velká terasa s lehátky a houpací sítí",
      "Ohniště s grilovacím roštem",
      "Wi-Fi (a vypínač, kterým ji zhasnete)",
      "Kávovar na espresso a výběrová káva",
      "Povlečení, ručníky a župany v ceně",
    ],
    detail: [
      {
        title: "Pro koho je Mech",
        text: "Pro páry i malou rodinu — spací patro nad kuchyní děti milují. A pro každého, kdo chce ráno snídat bosý v trávě.",
      },
      {
        title: "Jak to u něj vypadá",
        text: "Opálené dřevo, len a vlna. Z terasy vidíte jen louku, les a oblohu. Světelný smog tu neexistuje — v noci je tma jako v pohádce, a přesně proto je vidět tolik hvězd.",
      },
    ],
  },
];

/* ===== Ceník ===== */

export const PRICING = {
  currency: "Kč",
  baseNight: 3490, // ne–čt
  weekendNight: 4290, // noci z pátku a ze soboty
  highSeasonExtra: 500, // 15. 6. – 15. 9. a 20. 12. – 2. 1.
  minNights: 2,
  weekDiscount: 0.1, // 7+ nocí
  deposit: 3000, // vratná kauce
  checkIn: "15:00 – 20:00",
  checkOut: "do 11:00",
  notes: [
    "Minimální délka pobytu jsou 2 noci.",
    "Při pobytu na 7 a více nocí sleva 10 %.",
    "Vratná kauce 3 000 Kč se vrací do 3 dnů po odjezdu.",
    "V ceně: povlečení, ručníky, župany, káva, dřevo do kamen, závěrečný úklid.",
    "Domky jsou celoroční — v zimě topí podlahovka i kamna.",
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
    id: "sauna",
    name: "Sauna / koupací sud",
    desc: "Vytopíme před vaším příjezdem a každý den pobytu. Žula = sauna, Mech = sud.",
    price: 900,
    unit: "za pobyt",
  },
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
    desc: "Pořádná náruč bukového dřeva na celovečerní oheň. Dřevo do kamen je v ceně.",
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
    desc: "Křišťálová voda, žulové stěny a molo jen pro hosty. V létě na plavání, v zimě pro otužilce — rovnou ze sauny.",
  },
  {
    title: "Ticho",
    desc: "Žádná silnice, žádný soused, žádný hluk. Nejhlasitější věc tady je datel a praskání ohně.",
  },
  {
    title: "Tma a hvězdy",
    desc: "Nulový světelný smog. Za jasné noci je z terasy vidět Mléčná dráha pouhým okem.",
  },
  {
    title: "Les hned za dveřmi",
    desc: "Houby, borůvky, srnky za rozbřesku. Lesní stezka kolem lomu měří 4 km a nepotká vás na ní nikdo.",
  },
  {
    title: "Oheň",
    desc: "Každý domek má vlastní ohniště, gril i kamna. Dřevo, sirky a špekáčková vidlice jsou nachystané.",
  },
  {
    title: "Digitální detox",
    desc: "Wi-Fi má vypínač a my vás vyzýváme ho použít. Místo zpráv — kniha, hvězdy a druhý člověk.",
  },
];

/* ===== Recenze (ILUSTRAČNÍ — nahradit skutečnými) ===== */

export const REVIEWS = [
  {
    name: "Kateřina & Jakub",
    house: "Žula",
    text: "Ráno mlha nad lomem, večer sauna a hvězdy. Tři dny jsme neměli v ruce telefon a vůbec nám nechyběl. Nejlepší výročí, jaké jsme kdy měli.",
    stars: 5,
  },
  {
    name: "Martin H.",
    house: "Mech",
    text: "Jel jsem sám, dopsat diplomku. Místo toho jsem hlavně koukal do ohně a spal 10 hodin denně. Diplomku jsem dopsal doma, ale hlavu jsem si srovnal tady.",
    stars: 5,
  },
  {
    name: "Rodina Veselých",
    house: "Mech",
    text: "Děti spaly na patře a ráno je probudily srnky před oknem. Sud jsme topili každý večer. Už jsme zarezervovali Vánoce.",
    stars: 5,
  },
  {
    name: "Tereza N.",
    house: "Žula",
    text: "Otužuju se třetím rokem a kombinace devadesátistupňové sauny a lomu v prosinci je absolutní top. Čistota, design, detaily — všechno na jedničku.",
    stars: 5,
  },
];

/* ===== FAQ ===== */

export const FAQ_ITEMS = [
  {
    q: "Kde přesně Sedmý les je?",
    a: "Na Vysočině, na samotě u zatopeného žulového lomu. Přesné souřadnice posíláme s potvrzenou rezervací — soukromí našich hostů chráníme i takhle. Z Prahy to máte zhruba hodinu a půl, z Brna hodinu a čtvrt autem.",
  },
  {
    q: "Jak probíhá check-in?",
    a: "Bezkontaktně. Den před příjezdem vám pošleme souřadnice, video s cestou a kód od schránky s klíčem. Přijet můžete kdykoli mezi 15:00 a 20:00, po domluvě i později.",
  },
  {
    q: "Zvládneme to autem? A v zimě?",
    a: "Ano, až k domku vede zpevněná cesta a každý domek má vlastní parkování. V zimě cestu protahujeme; stačí běžné zimní pneumatiky.",
  },
  {
    q: "Můžeme vzít děti?",
    a: "Můžete. Mech má spací patro, které děti milují, a louku na lítání. Lom je hluboká voda bez mělčiny — menší děti u vody hlídejte, plotem oddělený není.",
  },
  {
    q: "Můžeme vzít psa?",
    a: "Jednoho psa na domek rádi přivítáme (350 Kč za pobyt). Pelíšek, misky a pamlsky budou čekat. Po loukách prosíme na vodítku — kvůli srnkám.",
  },
  {
    q: "Co sauna a koupací sud — jak to funguje?",
    a: "Žula má finskou saunu, Mech dřevem vytápěný koupací sud. Když si je objednáte k pobytu (900 Kč), vytopíme je před příjezdem a nachystáme dřevo na další dny. Instrukce jsou v domku, je to snadné.",
  },
  {
    q: "Dá se v lomu koupat?",
    a: "Dá, a je to zážitek. Voda je křišťálově čistá a i v létě svěží. Molo je jen pro hosty. Koupání je na vlastní odpovědnost — lom není hlídané koupaliště.",
  },
  {
    q: "Je v domku Wi-Fi a signál?",
    a: "Wi-Fi ano — a má vlastní vypínač, který doporučujeme použít. Mobilní signál je slabší, na zavolání to stačí, na pracovní porady ne. Považujte to za vlastnost, ne vadu.",
  },
  {
    q: "Co když bude pršet?",
    a: "Pak je to nejhezčí. Déšť na plechové střeše, kamna, kniha z naší knihovničky a výhled do mokrého lesa. V domku najdete deskovky, karty a dalekohled.",
  },
  {
    q: "Jak je to s jídlem?",
    a: "Kuchyňka je plně vybavená — vařit můžete cokoliv. Doporučujeme dovézt si zásoby (nejbližší obchod je 9 km). K tomu snídaňové koše, gril a ohniště. Káva a základní koření jsou v ceně.",
  },
  {
    q: "Jak funguje rezervace a platba?",
    a: "Vyberete termín v rezervačním formuláři, my do 24 hodin potvrdíme dostupnost a pošleme platební údaje. Záloha 50 % do 3 dnů, zbytek 14 dní před příjezdem. Pak už jen přijedete.",
  },
  {
    q: "Jaké jsou storno podmínky?",
    a: "Při zrušení 30 a více dní před příjezdem vracíme 100 % uhrazených plateb, 14–29 dní před příjezdem 50 %. Při pozdějším stornu nabídneme náhradní termín do roka. Když zrušíme my (kalamita apod.), vracíme vše do koruny.",
  },
];

/* ===== Lokalita ===== */

export const LOCATION = {
  region: "Vysočina",
  secretNote:
    "Přesnou polohu prozradíme až s potvrzenou rezervací. Sedmý les se nehledá — Sedmý les se najde.",
  distances: [
    { place: "Praha", time: "≈ 1 h 30 min autem" },
    { place: "Brno", time: "≈ 1 h 15 min autem" },
    { place: "Nejbližší obchod", time: "9 km" },
    { place: "Nejbližší hospoda", time: "6 km (a stojí za to)" },
    { place: "Vlaková zastávka", time: "7 km, vyzvedneme vás" },
  ],
  around: [
    {
      title: "Stezka kolem lomu",
      desc: "4 km lesní okruh po hraně lomu a zpět podél potoka. Ráno po ní chodí srnky, večer vy.",
    },
    {
      title: "Vyhlídka na sedmero hor",
      desc: "Půl hodiny pěšky na žulové skalisko, ze kterého je vidět sedm kopců za sebou. Odtud jméno.",
    },
    {
      title: "Hospoda U Dvou lip",
      desc: "6 km, vesnická klasika: točená dvanáctka, svíčková a pan hostinský, který ví všechno.",
    },
    {
      title: "Farma za kopcem",
      desc: "Vejce, sýry a mléko od sousedů. To, co vám ráno visí v snídaňovém koši, je odsud.",
    },
  ],
};

/* ===== Poukazy ===== */

export const VOUCHER = {
  title: "Darujte ticho",
  desc: "Dárkový poukaz na pobyt v Sedmém lese. Elegantní PDF do hodiny v e-mailu, nebo vytištěný na bavlněném papíře poštou. Platnost 12 měsíců, termín si obdarovaný vybere sám.",
  variants: [
    { name: "Dvě noci ve všední dny", price: 6980 },
    { name: "Prodloužený víkend (pá–ne)", price: 8580 },
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
