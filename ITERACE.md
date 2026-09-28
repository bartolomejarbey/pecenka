# Sedmý les — plán iterací

Zadání: optimalizovat web (pryč smooth scroll, kurzor, Safari, mobil), zjednodušit ho,
nasadit čitelnější logo do navbaru, postavit administraci s bookingem a fakturací,
platby (QR + ComGate), hostovský portál s foto-protokolem a agentem **Luna 5.6**.

Architektonické zadání pro celý systém: **[SYSTEM.md](./SYSTEM.md)** (výstup brainstorm rady).

| # | Iterace | Stav |
|---|---|---|
| 1 | Výkon webu, nové logo, podklady systému | ✅ hotovo |
| 2 | Zjednodušení a přehlednost webu, mobil, dořešení Safari | ✅ hotovo |
| 3 | Databáze: schéma, migrace, konec fiktivní dostupnosti | ✅ hotovo |
| 4 | Rezervační jádro: skutečné rezervace, VS, blokace termínů | ✅ hotovo |
| 5 | Platby: QR (SPAYD), `PaymentProvider`, příprava ComGate | ✅ hotovo |
| 6 | Admin: Dnes, kalendář, detail rezervace, peníze | ✅ hotovo |
| 7 | Fakturace: zálohy, doklady, **dobropisy**, kauce | ⏳ |
| 8 | Hostovský portál: přístupy, foto-protokol, checklisty | ⏳ |
| 9 | Luna 5.6: párování fotek před/po, vyhodnocení škod | ⏳ |
| 10 | Doladění, notifikace, dokumentace | ⏳ |
| A1 | Audit 1 — funkční, výkonový, bezpečnostní | ⏳ |
| A2 | Audit 2 — obsahový, právní, přístupnostní | ⏳ |

---

## Iterace 1 — hotovo

### Výkon (hlavní příčiny sekání na Safari)

| Co | Před | Po |
|---|---|---|
| Smooth scroll | `lenis` přebíral scroll celého dokumentu | **smazáno**, i `scroll-behavior: smooth` |
| Animační knihovna | `motion/react` v 8 komponentách, ~250× `whileInView` | **smazáno**, animace jedou v CSS |
| Reveal při scrollu | observer + JS animace pro **každý** element (na /o-nas jich bylo 45) | jeden `IntersectionObserver` na dokument, zbytek CSS |
| Filmové zrno | `mix-blend-mode: overlay` na ~45 sekcích na stránku | jedna fixní vrstva na `body`, bez blend módu |
| Navigace | `backdrop-blur-xl` přepočítávaný při každém posunu | plná barva `bg-night/95` |
| Scroll listener | callback na každý posun | sentinel + `IntersectionObserver` |
| Paralaxa (Evening) | `useScroll` + `useTransform` na velké fotce | statická fotka |
| Ken Burns (Hero, HouseHero) | JS zoom 2,4–2,6 s přes celou obrazovku | pryč — fotka je hned ostrá, lepší LCP |
| Pulzující tečka v `Kicker` | nekonečná animace ~40× na stránku | statická |
| `text-rendering` | `optimizeLegibility` | pryč (zdržovalo první vykreslení textu) |

**Výsledek: JS 276,7 → 203,3 kB gzip (−26,5 %).** Ostrý build prochází, žádný vodorovný přetok
na 393 px ani na 1440 px.

### Kurzor
- `caret-color` v polích explicitně — na tmavém podkladu ember, ve světlých sekcích tmavý.
  (Dřív se dědil a v tmavých polích šel snadno přehlédnout.)
- `-webkit-tap-highlight-color: transparent` — pryč modrý blik při ťuknutí na mobilu.

### Logo
- Nové znaky navrhl **OpenAI gpt-image-2** (4 koncepty × 2 varianty, `scripts/gen-logo.py`,
  výsledky v `public/logo-koncepty/`). Web sám nekreslil nic.
- Vybráno: **sedm smrků nad vlnovkou hladiny** (`les-vlna-1`) — jediný koncept, který je
  čitelný i ve 28 px.
- Rastr obtažen do vektoru (`scripts/png-na-svg.py`) → `components/LogoMark.tsx`.
  **223 kB PNG → ~1,2 kB inline SVG**, ostré v každé velikosti, barvu bere z `currentColor`.

### Platby — podklady
- `public/platby/` — oficiální loga ComGate, Apple Pay, Google Pay, Visa, Mastercard
  + `README.md` s pravidly použití ochranných známek. Zatím se nikde nezobrazují.

### Nástroje
- `scripts/qa-shots.mjs` — vizuální QA přes CDP (screenshoty desktop + mobil, metriky,
  detekce vodorovného přetoku). Playwright se na tomhle stroji nespustí, tohle ano.

---

## Iterace 2 — hotovo

### Přehlednost
- **Svislé odsazení sekcí** `py-24 md:py-32` → `py-20 md:py-26` ve 13 souborech.
  Web se prochází svižněji, obsahu na obrazovku se vejde víc.
- **Vodoznak v patičce** `text-[21vw]` (na desktopu ~300 px) →
  `clamp(2.6rem, 9vw, 7rem)`. Byl to prázdný pás na konci každé stránky.
- **PageHero** už nečeká na JS: naběhnutí přes CSS `.rise-in` místo scroll revealu.
  Titulek podstránky je obvykle LCP element — teď se vykreslí dřív a bez závislosti
  na IntersectionObserveru.

### Mobil
- **Dny v kalendáři** 40 → 44 px i na mobilu (doporučený minimální dotykový cíl).
- **Lišta cookies** zabírala na mobilu čtvrtinu obrazovky — teď je jednořádková
  a tlačítko je vedle textu.
- **`svh` místo `vh`** v hero sekcích (Evening, HouseHero) a `min-h-svh` na 404
  a načítací obrazovce — na iOS Safari sekce neskáče při schování lišty prohlížeče.
- Ověřeno: **nikde žádný vodorovný přetok** (393 px ani 1440 px, všech 12 stránek).

### Ověření
- Reveal animace v reálném prohlížeči: před scrollem viditelné jen prvky nad ohybem
  (0–6 z 30–43), po projetí stránky všechny. Chová se, jak má.
- Výška stránek klesla, např. /kontakt 2 422 → 2 222 px, úvod 7 879 → 7 471 px.

### Vědomě neuděláno
- **`CtaBanner` zůstává na všech deseti stránkách.** Je to hlavní konverzní prvek;
  mazat ho je obchodní rozhodnutí, ne technické. Řekni, jestli ho chceš vyhodit
  z /kontakt (kde je vedle formuláře nadbytečný) a /faq.
- **Úvodní stránka má pořád devět sekcí.** Nabízí se sloučit „Šest věcí, které ve
  městě nekoupíte" (Experiences) s pásem ročních období (SeasonStrip) — obojí je
  výčet hezkých věcí. Je to zásah do obsahu, tak čekám na tvoje slovo.


---

## Iterace 3 — hotovo

### Databáze bez instalace
Bez `DATABASE_URL` běží projekt na **PGlite** — Postgres 18 přeložený do WASM,
data v `.pglite/`. Žádný docker, žádný účet, `npm run dev` prostě funguje.
Je to týž Postgres jako naostro, včetně `btree_gist`, takže ochrana proti
dvojímu prodeji se chová stejně. Na produkci se nastaví `DATABASE_URL` (Neon)
a nemění se nic jiného.

### Schéma
`db/migrations/0001_init.sql` — **52 tabulek, 3 výčtové typy, 69 cizích klíčů,
49 CHECK omezení**. Generuje se ze SYSTEM.md skriptem
`scripts/dev/build-migration.py`, který tabulky topologicky seřadí podle cizích
klíčů a cyklus `invoices ↔ document_blobs` rozetne do `ALTER TABLE` na konci.
Typy pro dotazy se načítají zpátky z databáze (`npm run db:pull`) — jeden zdroj
pravdy, žádné ruční přepisování.

**Ochrana proti dvojímu prodeji je v databázi, ne v aplikaci:**
```sql
CONSTRAINT no_overlap EXCLUDE USING gist (
  unit_id WITH =, daterange(checkin, checkout, '[)') WITH &&
) WHERE (status IN ('hold','confirmed','checked_in'))
```
Ověřeno: překryvná rezervace je zamítnuta, navazující (odjezd = příjezd) projde.

### Konec vymyšlené dostupnosti
`getBookedDays()` a `seededRandom()` jsou **smazané**. Kalendář teď čte
`reservation_units` + `calendar_blocks` + `rate_calendar`, ceny bere
z ceníkového kalendáře (730 dní dopředu, ceny v haléřích) a doplňky z tabulky
`addons`. Změna ceny už nevyžaduje nasazení nové verze webu.

Virtuální jednotka **„Celý les"** je v datech: prodává se jako celek 30 m²,
ale blokuje oba domky — a naopak, rezervace jednoho domku blokuje celek.

Pojistka `__tests__/dostupnost.test.ts` spadne, kdyby se generovaná obsazenost
jakkoli vrátila. Hned při zavedení chytila zapomenutý komentář a `MAX_MONTH_OFFSET = 7`
odvozený od staré vymyšlené dostupnosti.

**21 testů prochází** (cena, sleva jen na ubytování, doplňky za den vs. za pobyt,
minimální délka pobytu z ceníku, formátování haléřů, pojistky).

### Zbývá — a je to důležité
Průvodce **ukazuje** skutečnou obsazenost, ale odeslání pořád jen posílá e-mail;
rezervace se do databáze nezapisuje. Kalendář tím vypadá závazněji, než ve
skutečnosti je. **Tohle je první věc v iteraci 4**, včetně generátoru
variabilního symbolu a odchycení `23P01` („termín právě obsadil někdo jiný").


---

## Iterace 4 — hotovo

### Rezervace se konečně zapisuje
`/api/rezervace` už neposílá jen e-mail — zakládá rezervaci v jedné transakci:
rezervace → blokace termínu → zmrazený rozpad ceny → host → předpis zálohy → úkol
pro majitele. Buď vznikne všechno, nebo nic. Půlka rezervace v databázi je horší
než žádná: termín by byl blokovaný a nikdo by nevěděl proč.

**Dva režimy podle času do příjezdu:**

| Situace | Stav | Co se stane |
|---|---|---|
| Příjezd za > 48 h, jeden domek | `hold` | Termín se zablokuje hned a drží se 72 h na zálohu |
| Příjezd do 48 h, nebo celý les | `inquiry` | Termín se neblokuje, majitel potvrzuje ručně |

Blokovat termín pro poptávku, kterou za pár hodin nikdo nezaplatí, by znamenalo
odmítat hosty kvůli mrtvým rezervacím.

### Variabilní symbol
Deset číslic: `RRMM` (rok a měsíc **příjezdu**) + `NNNNN` (pořadí v roce)
+ kontrolní číslice mod 11. Majitel z bankovního výpisu pozná termín, aniž by
otevřel systém, a překlep při ručním zadání platby se odchytí (ověřeno testem:
přes 90 % jednociferných překlepů). Deset číslic je strop, který dovoluje SPAYD,
takže se VS vejde do QR platby. Pořadí bere atomický čítač v `invoice_series`,
takže dvě souběžné rezervace nedostanou stejné číslo.

### Cena se počítá na serveru
Klient posílá částku, kterou viděl, ale server si ji spočítá znovu z ceníkového
kalendáře a jen porovná. Při neshodě vrátí **409** a rezervaci nezaloží. Ceny
se pak zmrazí do `reservation_items` — po založení se už nepřepočítávají,
takže změna ceníku nepřepíše hosty, kteří už mají potvrzeno.

### Uvolňování termínů
`/api/cron/expirace-drzeni` (Vercel Cron á 15 min, chráněno `CRON_SECRET`).
Klíčové je, že se přepisuje **`reservation_units.status`**, ne jen stav rezervace —
teprve to vypustí databázové omezení. Ověřeno testem: termín blokuje → cron ho
uvolní → jde koupit znovu.

### Bezpečnostní záplaty
- **Escapování v e-mailech** (`lib/mail/html.ts`). Do šablon jdou jména a poznámky
  z webu; bez escapování stačilo do poznámky napsat `<img src=x onerror=…>`.
- **Ošetření hlaviček** — zalomení řádku v předmětu je cesta k cizímu `Bcc:`.
- **Zod validace** celého vstupu, s českými hláškami (Zodí „Invalid option:
  expected one of…" host nepochopí).
- **Kontrola Origin** — rezervaci zakládá jen náš web.

### Texty srovnány se skutečností
Web sliboval „Žádná platba předem — termín nejdřív do 24 hodin potvrdíme".
To už neplatí. Přepsáno na rezervační stránce, v „Jak to funguje", ve FAQ
a hlavně v **obchodních podmínkách**, kde teď stojí oba režimy včetně toho, že
rezervace bez zálohy do 72 hodin zaniká. *(Právník to má pořád zkontrolovat —
viz TODO v README.)*

**47 testů prochází**, z toho 15 integračních nad skutečným Postgresem: dvojí
prodej, navazující termíny, podvržená cena, DPH doplňků (víno 21 %, snídaně 12 %),
záporná položka slevy, celý cyklus vypršení držení.

### Zbývá
Platební údaje se posílají e-mailem textem — **QR platba a ComGate jsou iterace 5**.


---

## Iterace 5 — hotovo

### QR platba (standard SPAYD / QR Platba ČBA)
Vlastní generátor, **žádná externí služba** — externí generátor by dostal číslo
účtu a částku každé rezervace, a QR musí fungovat i v PDF a e-mailu.

```
SPD*1.0*ACC:CZ6508000000192000145399+GIBACZPX*AM:7450.00*CC:CZK
    *RN:SEDMY LES*DT:20260823*X-VS:2702000071*X-SS:1*MSG:SEDMY LES REZ 2702000071 ZALOHA
```

Povolená abeceda je jen `0-9 A-Z`, mezera a `$ % * + - . / :`, takže se srovnává
diakritika a strukturální znaky se kódují (`*` → `%2A`, jinak by rozbily pole).
Hotový řetězec se **ukládá do `payments.spayd`** — QR musí být reprodukovatelné
i za rok, kdyby se dohledávalo, co přesně měl host naskenované.

### Platební stránka
`/rezervace/{kod}/platba` — QR 250 × 250 px a **vedle něj vždy údaje textem**
(ne každá banka QR načte). Souhrn s cenou, zálohou, doplatkem a lhůtou držení.

Chráněná podpisem: kód rezervace `SL-26-0007` je krátký a jde uhodnout, takže
sám o sobě nestačí. Kontrola sedí v `proxy.ts`, ne až v komponentě — Next už
při vykreslování streamuje, takže `notFound()` v komponentě skončí jako
„měkká 404" (stav **200** s obsahem 404). Ověřeno: bez podpisu i se špatným
podpisem přijde poctivá **404**.

### Bezpečnostní hlavičky
`proxy.ts` přidává `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin` a `Permissions-Policy`.
Referrer je tu důležitý — bez něj by se kód rezervace v adrese posílal na cizí
weby v hlavičce `Referer`.

### E-mail hostovi
Potvrzení s QR jako **CID příloha**, ne `data:` URI — Gmail data URI v obrázcích
zahazuje a host by viděl prázdné místo místo platby. Vedle QR jsou údaje textem
a je i čistě textová verze zprávy.

### ComGate — připraveno, čeká na smlouvu
Celý adaptér je napsaný podle REST API v2.0 (vytvoření, stav, storno, refundace,
předautorizace). **Aktivace je odvozená od prostředí, ne od přepínače v kódu:**
bez `COMGATE_MERCHANT` a `COMGATE_SECRET` se metoda v rozhraní vůbec nenabídne.
Po podpisu smlouvy to jsou tři proměnné ve Vercelu — žádný zásah do kódu.

Šest testů zamyká tvar požadavku podle dokumentace (částka v haléřích, `label`
do 16 znaků, `refId` = VS, `enableApplePayGooglePay`, překlad stavů, neznámý
stav nikdy nehlásí „zaplaceno"). Až smlouva bude, rozdíl se pozná hned — ne až
na první ostré platbě.

Loga Visa, Mastercard, Apple Pay a Google Pay jsou na platební stránce jako
**acceptance marks** (ne tlačítka — ta musí vykreslit brána), zatím tlumená
s poznámkou „teprve zprovozňujeme".

### Dvě chyby, které se cestou našly
1. **Chybějící `PAYMENTS_SIGNING_KEY` shodil odpověď až *po* založení rezervace.**
   Host viděl chybu, termín byl přitom obsazený, a opakovaný pokus narazil na
   „obsazeno". Cokoli za commitem transakce teď rezervaci neshodí; bez klíče se
   odkaz prostě nevygeneruje a platební údaje jdou e-mailem.
2. **Kolize čísla rezervace.** Ukázková data zabrala kódy `SL-26-0007+`, ale
   nezvedla čítač. Kolize kódu nebo VS už není fatální — zvedne se čítač a zkusí
   znovu (pětkrát). Reálně nastane při ruční rezervaci v adminu, importu
   z Booking.com nebo obnově ze zálohy.

**63 testů prochází.**

### Zbývá
Nic zatím nepozná, že platba dorazila — to je párování bankovních plateb podle VS
(Fio API) a patří k administraci v iteraci 6.


---

## Iterace 6 — hotovo

### Administrace na `/admin`
Mobile-first, protože provozovatel ji bude otevírat hlavně na telefonu.
Spodní navigace pěti položek, na počítači boční panel.

| Routa | Co umí |
|---|---|
| `/admin` | **Dnes** — odjíždí, přijíždí, zůstává, vyžaduje pozornost. Jeden dotaz. Prázdný stav není prázdná stránka: „Nikdo nepřijíždí. Příští příjezd čt 26. 8. — Eva Dvořáková, Achát." |
| `/admin/kalendar` | Mobil svislý pás 21 dní s cenami, počítač vodorovná osa 60 dní. **Žádný FullCalendar** — dva domky jsou obyčejný CSS grid. |
| `/admin/rezervace` | Hledání přes `search_text` (bez diakritiky), filtry promítnuté do adresy, historie pod čarou. |
| `/admin/rezervace/[kod]` | Časová osa se sedmi uzly; **rozbalený je jen ten, na kterém rezervace stojí, a má jedno velké tlačítko**. Cena a doplňky se sazbami DPH, platby, historie přeložená do češtiny. |
| `/admin/penize` | Nezaplaceno celkem, fronta plateb se splatností, tlačítko „Dorazilo". |
| `/admin/nastaveni` | **Seznam nedodělků** — chybějící SMTP, podpisový klíč, bankovní účet, ostrá databáze. Jinak se to pozná až na první faktuře, kterou nejde vystavit. |

### Přihlášení
Heslo přes **scrypt** z `node:crypto` — argon2id by byl o kousek lepší, ale
znamená nativní závislost, která se láme při každé změně verze Node.

Token v cookie je náhodných 32 bajtů, v databázi leží jen jeho SHA-256 otisk:
z odcizené databáze se přihlásit nedá. Dvě lhůty — **absolutní 30 dní**
a **nečinnostní 12 hodin**; majitel se dívá z telefonu venku a kdyby ho ztratil,
okno nemá být nekonečné. Pět pokusů za deset minut z jedné IP. Heslo se ověřuje
i u neexistujícího účtu, aby se z doby odpovědi nedalo zjistit, které e-maily
v systému jsou.

Ověření sedí v `lib/auth/dal.ts`, které volá **každá** stránka i akce. Kontrola
schválně není jen v `proxy.ts` — proxy je vrstva navíc, ne ochrana: stačí jedna
chyba v `matcher` a stránka je venku. Ověřeno: všech pět rout bez přihlášení
přesměruje na `/admin/prihlaseni`.

Účet se zakládá `npm run admin:create -- e-mail "Jméno"`.

### Auditní deník
Každá změna se zapíše do `audit_log` a řádky jsou zřetězené otiskem
(`prev_hash` → `hash`), takže dodatečná úprava historie jde poznat. Není to
blockchain — je to ochrana proti „to tam nikdy nebylo" u agendy, kde se
strhávají peníze z kauce. V detailu rezervace se ukazuje česky, ne jako JSON diff.

### Přeskládané rozvržení
Do administrace prosakovala veřejná navigace, patička i lišta cookies — všechno
viselo na kořenovém `app/layout.tsx`. Veřejné stránky se přesunuly do skupiny
`app/(web)/`, kořen drží jen kostru dokumentu. Administrace je teď čistá.

### Stav plateb se nikdy nenastavuje ručně
`prepocitejPlatby()` ho odvodí z toho, co reálně dorazilo v `payments`.
Zaplacená záloha zároveň překlopí rezervaci z `hold` na `confirmed` — to je
jediné místo, kde se to děje.

**65 testů prochází.**

Pojistka proti vymyšlené dostupnosti se při přesunu stránek do `app/(web)/`
rozbila — hlídala pevný seznam souborů. Teď prochází **celý strom**, takže
platí i po přesunu a chytí i nový soubor, který by ten vzorec zavedl znovu.

### Zbývá
Ruční rezervace v administraci, úprava cen a doklady. Automatické párování
plateb podle variabilního symbolu (Fio API) — do té doby se platby označují
tlačítkem „Dorazilo".

## Iterace 10 a audity — hotovo

### Audit A1 — výkon a chování v prohlížeči

Měřeno přes Chrome DevTools Protocol na produkčním buildu: **CPU škrcené 6×,
cache vypnutá, 24 stránek ve dvou rozlišeních, každá třikrát**. Bez škrcení je
na vývojářském Macu všechno pod 200 ms a stížnost „seká se to" se nedá
reprodukovat vůbec.

**Trhání při scrollu.** Každý skrytý blok měl `will-change: opacity, transform`.
Vypadá to jako optimalizace — říkáme prohlížeči dopředu, co se bude animovat.
Jenže na /lokalita je takových bloků 28, na /o-nas 30, a každý dostal vlastní
kompozitorovou vrstvu, která při odhalení zase zanikla. To přeskládávání vrstev
stálo víc než animace samotná: 7 dlouhých úloh na stránku, nejdelší 540 ms.
Po odstranění nula. Přechod `opacity` a `transform` se kompozituje i bez toho.

**Skok patičky na /rezervace.** `loading.tsx` ukazoval logo doprostřed
obrazovky — výška jedné obrazovky, zatímco hotová stránka má 2 038 px. Jakmile
dorazila obsazenost z databáze, patička spadla o 561 px. Posun rozvržení 0,25,
dvaapůlnásobek limitu. Kostra teď drží rozvržení skutečné stránky: stejné
záhlaví, průvodce na stejném místě.

**Průvodce se vykresloval až na klientu.** Bral `?domek=` přes
`useSearchParams()`. Ten hook uvnitř `Suspense` znamená, že server pošle
fallback a skutečný obsah doskočí až po hydrataci. Parametr chodí propem ze
serveru — stránka je stejně `force-dynamic`, takže ho server zná. Hydratační
pojistka zůstala jen kolem kalendáře, jediného místa závislého na `new Date()`.

Výsledek: LCP 248–364 ms (mimo první studené načtení domovské stránky),
posun rozvržení nejvýš 0,016, dlouhé úlohy nejvýš jedna na stránku a jen při
hydrataci. Žádný vodorovný přetok, žádná chyba v konzoli.

### Audit A2 — přístupnost

**Osnova nadpisů.** Na /domky šla h1 → h3. Karty domků měly h3, ale žádná h2
nad nimi nebyla. Čtečka obrazovky projíždí osnovu jako obsah knihy — přeskočená
úroveň v ní vypadá jako chybějící kapitola. Karta bere úroveň propem. Jména
domků v porovnávací tabulce byla taky h3, přitom jsou to záhlaví sloupců.

**Dotykové cíle.** Odkazy v patičce a textové odkazy typu „Prohlédnout fotky"
měly výšku řádku, 20 px. Pod 24 px se na telefonu trefuje špatně a WCAG 2.5.8
to bere jako chybu. Vizuálně se nezměnilo nic.

Po opravách napříč 24 stránkami žádný nález — obrázky mají popisy, ovládací
prvky názvy, formulářová pole popisky.

### Brána Luny propouští i malé tvrdé změny

Propálená díra od cigarety je malá a drahá zároveň. Brána rozhodovala jen podle
plochy, takže díra o velikosti dvou bloků propadla mezi šum a model se na ni
vůbec nezeptal. Teď rozhoduje i hloubka propadu podobnosti: šum se drží těsně
pod prahem, propálenina spadne hluboko. Na 23 párech se brána otevřela 19×
místo 15× a kontrolní snímky zůstaly čisté.

Ukázková sada přegenerovaná na gpt-image-2. Na 18 párech se skutečně
vykresleným poškozením: 15 nalezeno, 2 označeny jako nepořádek, 1 přehlédnuta.
**Nula planých poplachů na 5 nezměněných párech.**

### Nástroje, které po auditu zůstaly

`scripts/qa-shots.mjs` umí měřit posun rozvržení i s viníkem, dlouhé úlohy
s časem vzniku, chyby konzole a přístupnost. Opakuje měření a hlásí medián —
jedno měření je při škrceném CPU šum. Kontroluje i to, že stránka vůbec dostala
styly: starý `next start` nad novým buildem servíruje HTML odkazující na CSS,
které už na disku není, a měření pak vypadá jako úspěšná optimalizace.

**93 testů prochází.**

## Kolo 11 — dotažení naostro

### Fakturační údaje jdou vyplnit
Nastavení dosud jen ukazovalo, co chybí — „doplnit IČO", „doplnit účet" — ale
nebylo to kde doplnit. Provozovatel viděl seznam, se kterým nemohl nic dělat.

IČO i číslo účtu se kontrolují na kontrolní číslici. IČO s překlepem doputuje
na faktuře k finančnímu úřadu, účet s překlepem pošle zálohu cizímu člověku.
Účet stačí zadat v běžném tvaru `1920001453/0800`, IBAN i BIC se dopočítají —
provozovatel svůj účet v IBAN tvaru nezná, ale QR platba ho vyžaduje.

Váhy modulo 11 se u tuzemského účtu přiřazují **zprava**, ne zleva. Otočené
projdou náhodou asi desetině čísel, takže by chyba prošla testem na jednom účtu.

### Host se po zaplacení dostane do portálu
`zalozPristup` **nevolalo nic**. Host zaplatil zálohu, rezervace se potvrdila
a do portálu se nikdy nedostal, protože žádný přístup nevznikl. Fungovala jen
jedna ukázková rezervace, které přístup založil seed — proto to dosavadní
zkoušení nechytilo.

Portál se teď otevře při zaplacení zálohy i při ručním potvrzení; ruční
potvrzení je pro hosta totéž, majitel jen dostal peníze jinudy.

### Sharp se na Vercelu nenačítal
**Příjem fotek naostro nefungoval.** `npm install` stahuje binárky jen pro
platformu, na které běží — vývoj je na macOS, Vercel na linux-x64, takže
v nasazení chyběla libvips. Lokálně to fungovalo bez jediné chyby.

Nestačilo binárky deklarovat. Sharp je nativní modul: musí ven z bundle
(`serverExternalPackages`) a jeho `.so` se musí přibalit ručně
(`outputFileTracingIncludes`), protože trasování souborů je samo nenajde.

### Vyhodnocení doběhne i v serverless prostředí
Analýza se pouštěla přes `void` po odeslání odpovědi. Serverless běh se po
odpovědi může zmrazit — protokol by zůstal viset ve stavu „analyzing". Teď
přes `waitUntil`, pojistkou je cron `/api/cron/vyhodnoceni`, který každých
patnáct minut dotáhne protokoly starší než deset minut.

Ověřeno proti produkci: vyhodnocení doběhne do `needs_review` za ~63 sekund.

### Průchod celým tokem
`npm run test:tok` projde přes skutečný běžící web: rezervace přes veřejné API,
pokus prodat tentýž termín podruhé, přihlášení majitele, potvrzení, přihlášení
hosta do portálu, nahrání dvanácti fotek, odeslání protokolu, kontrola
v administraci a úklid po sobě.

**Tenhle průchod našel obojí** — chybějící přístup do portálu i nefunkční sharp
v produkci. Každý kus zvlášť fungoval, chyba byla na spojích. Jednotkové testy
by ani jedno nenašly.

### Ukázka kontroly stavu je stránka na webu
`/kontrola-stavu` — podstránka s navigací a paletou Sedmého lesa, sestavená
z dat v repozitáři. Do hlavní navigace nepatří: host, který si vybírá pobyt,
nemá jako druhou stránku číst, jak se pozná, co v domku rozbil. Odkaz je
v administraci u fronty protokolů.

**104 testů prochází.**

## Kolo 12 — doklady a pošta

### Doklad se dá otevřít, vytisknout a přijde hostovi
Faktury existovaly jen jako řádky v databázi. Vystavit šly, ale předat hostovi
ne — v peněžní cestě to byla poslední díra.

`/doklad/[id]` je tisková stránka: světlý list, rozměry v milimetrech,
`@page A4`, řádky položek se nelámou přes stránky. **PDF negeneruje server,
vytiskne ho prohlížeč** — je to o jednu knihovnu a jeden vložený font méně
a výsledek je stejný. Odkaz nese podpis, který kontroluje proxy ještě před
vykreslením.

Doklad se posílá hned při vystavení, mimo hlavní cestu. U dobropisu se
neúčtuje, ale vrací — „k úhradě −10 470 Kč" by hosta mátlo, i když je to
matematicky totéž.

### Po akci se stránka nepřekreslila
Serverové akce volaly `revalidatePath`, čímž vyprázdnily mezipaměť, ale
otevřenou stránku nikdo nepřekreslil. **Majitel vystavil fakturu a neviděl ji,
potvrdil rezervaci a viděl dál původní stav, odklikl platbu a ta zůstala
v seznamu čekajících** — kde ji šlo odkliknout podruhé. Chybělo
`router.refresh()` po úspěšné akci.

### Domek se jmenoval „achat"
Slug z formuláře prosakoval na doklad i do předmětu e-mailu majiteli. Host
zná domek jako „Achát".

### Zachytávací SMTP
E-maily jsou poslední kus, který se dá ověřit jen tak, že se skutečně odešlou.
`npm run posta:zkouska` je přijme, uloží a vypíše. Ověřeno, že po celém
průchodu dorazí čtyři: majiteli o rezervaci, hostovi potvrzení se zálohou,
přístup do portálu a doklad.

### Poctivěji o omezení pokusů
Počítadlo pokusů z jedné IP žije v paměti procesu. V nasazení běží víc instancí
a každá si počítá zvlášť, takže skutečný strop je násobkem instancí. Proti
nepozornému opakování to stačí, proti odhodlanému robotovi ne — skutečnou
pojistkou proti dvojímu prodeji je databázové omezení, ne tohle.

## Kolo 13 — stav domku, referenční fotky a naprostá kontrola

Tři oblasti: rychlost a kvalita rozhraní napříč webem, administrace, ve které
jde udělat všechno, a porovnání stavu domku, které skutečně mluví s hostem.

### Host se po odeslání protokolu dozví, co s tím

Dosud odeslal dvanáct fotek a dostal „děkujeme". Vyhodnocení skončilo
v administraci a host se o něm dozvěděl nejdřív e-mailem — často až doma,
tedy ve chvíli, kdy už nemohl srovnat peřinu ani zavolat, když je něco
rozbité. Přitom právě těch pár minut, kdy ještě stojí v domku, je jediná
chvíle, kdy se drobnost dá vyřešit bez jediné koruny.

Vyhodnocení běží na pozadí, takže se průvodce ptá na výsledek každé tři
vteřiny a nejvýš dvě minuty. Pak poděkuje a pustí hosta domů — že nám spadl
model, není jeho starost.

Vzkaz má čtyři tóny a **žádný z nich nekřičí**:

- **poděkování**, když je všechno v pořádku,
- **prosba** o srovnání peřiny nebo umytí nádobí — nejvýš tři, nic povinného,
- **prosba o telefonát** na infolinku, když to vypadá na poškození,
- **prosba o jednu fotku navíc**, když se snímek nepovedlo porovnat.

Pravidla, podle kterých se vzkaz skládá, jsou **v kódu, ne v promptu**
(`lib/luna/vzkaz.ts`, 33 testů). Host se nikdy nedozví, že něco rozbil: když
je podezření, dostane prosbu o telefonát a nic víc. Slova „škoda", „poškození",
„kauce" a částky ve vzkazu být nemůžou — hlídá to test, ne dobrá vůle.
Prosbu od modelu navíc čistí `ocistiProsbu`: u čehokoli nad „nepořádek" ji
zahodí celou, i kdyby ji model vyplnil.

Nepořádek se od škody odděluje dvakrát. Prompt to říká a `run.ts` to vynucuje:
nález označený `is_guest_mess_not_damage` se sesype na „nepořádek", i kdyby
model tvrdil opak. Dřív se to pole zapisovalo do databáze a při rozhodování
ignorovalo — nález „poškození, ale je to nepořádek hosta" tedy založil případ
škody.

### Deset dvojic „před a po" a co u nich systém řekne

`/admin/test-ai` — deset dvojic vygenerovaných obrazovým modelem. Snímek „po"
vznikl **úpravou toho referenčního**, ne novou generací: dvě samostatně
vygenerované fotky se liší v každém pixelu, obrazová brána by hlásila „snímky
na sebe nesedí" a stránka by dokládala pravý opak toho, co má.

Sada je schválně nevyvážená ve prospěch pastí — šest z deseti je nepořádek,
přesunutý nábytek nebo jiné světlo. U každé dvojice je vidět i **to, co by
host uviděl na displeji**; to je jediné, co jde posoudit bez znalosti vnitřků.

**10/10 vyhodnoceno správně, nula planých poplachů, 2,06 Kč za zónu.**
Stránka je v administraci a s `noindex`: čísla naměřená na deseti
vygenerovaných dvojicích nejsou důkaz o přesnosti, jsou to kontrolní body,
které mají odhalit, že se po zásahu do promptu něco pokazilo.

Průchod se skutečným modelem (`scripts/dev/protokol-naostro.mts`) na šesti
zónách naráz: propálená sedačka i prasklé sklo nalezeny s jistotou 99 %,
nádobí a neustlaná postel jako prosba, večerní světlo bez nálezu. Šedesát tři
sekund, jedenáct volání, 22 Kč.

### Referenční fotky jdou nahrát z administrace

Celá Luna porovnává odjezdové fotky proti sadě, kterou uměl založit jen
vývojářský skript. Po výměně gauče nebo přemalování stěny byl systém slepý
a majitel s tím nemohl nic dělat.

`/admin/reference` — dvanáct zón na domek, u každé návod, který uvidí i host,
a tlačítko. Varianta světla se odvodí z jasu, takže se majitel nemusí
rozhodovat. Po nahrání se nová reference porovná s předchozí a při nízké
shodě se ozve varování: buď se v domku opravdu něco změnilo, nebo se koupelna
nahrála do WC — a to otráví každou další inspekci té jednotky.

**Sada se nikdy nepřepisuje, když už podle ní někdo hodnotil.** Vznikne nová
verze, snímky ostatních zón se přenesou a stará se uzavře. Bez toho by
rezervace z minulého měsíce ztratila snímek, na kterém stojí nárok.

Zóna bez reference se nově nepočítá jako nález, ale jako dluh na naší straně —
úkol pro majitele má jiný text i jinou naléhavost. Kdyby ne, po třech
protokolech s šesti prázdnými zónami by je přestal číst.

### Fotky jde nahrát i bez Supabase

`npm run dev` běží bez jediné proměnné, ale příjem fotek spadl na chybějícím
klíči k úložišti — celý foto-protokol šlo zkoušet jen proti produkci.
Přibyla disková varianta se **stejným chováním** včetně podepsaných odkazů
s krátkou platností (`/api/uloziste/…`). Na Vercelu, kde je souborový systém
jen pro čtení, se nezapne a administrace to řekne nahlas.

### Co se v příjmu fotek opravilo

- **Průchod cestou.** `zona` a `id` z formuláře se lepily do cesty v úložišti
  bez kontroly. `zona="../../object/protokol/baseline/achat/v1"` a upsert
  přepíše referenční snímek fotkou už poškozeného domku. Zóna se teď ověřuje
  proti checklistu a **název souboru volí server**.
- **Přepsání důkazu.** Routa nekoukala na stav inspekce, takže po odeslání
  šlo přepsat fotku, na které stojí případ škody. Cookie hosta žije 14 dní.
- **Přefocení nefungovalo.** Klientský identifikátor nesl `Date.now()`, takže
  každý pokus zakládal nový řádek — a `run.ts` bral **nejstarší**. Host
  přefotil rozmazaný snímek a systém dál hodnotil ten původní.
- **Fotka se posoudí hned.** Odesílací brána počítala řádky, ne použitelné
  snímky: dvanáct fotek prstu nebo tmy prošlo stejně jako dvanáct poctivých.
  Tmavou, rozmazanou nebo záběr, který už máme u jiné zóny, vrátíme, dokud
  host stojí v místnosti. Fotka v šeru se hlásí jako tmavá, ne jako rozmazaná —
  jinak by ji marně zkoušel držet pevněji.
- **Zmenšení v prohlížeči.** Osmimegová fotka se na kraji signálu nahrává
  minuty, když vůbec. Server ji stejně zmenší na 1092 px. Vedlejší přínos:
  prohlížeč dekóduje i HEIC z iPhonu a ven jde obyčejný JPEG.
- **Nepovedený upload nezahodí soubor.** Blob zůstane v paměti a stačí ťuknout
  na „Zkusit znovu".

### Přesnost vyhodnocení

- **Rozpočet volání přiděluje cena opravy, ne pořadí v checklistu.** Poškozená
  zóna spotřebuje tři volání; podlaha za 4 000 Kč byla první a prosklená stěna
  za 25 000 Kč devátá. U rozmláceného domku ta drahá zóna nedostala nic.
- **Prohozený běh se u `missing` vynechává.** Otázka „co je na prvním a není
  na druhém" je při prohození logicky opačná, takže chybějící vybavení vyšlo
  vždycky jako „nestabilní" — nejlépe doložitelný typ škody si tím systém sám
  znehodnocoval.
- **Potlačený nález se potlačí i v datech.** Při špatném zarovnání se
  závažnost maskovala jen v návratové hodnotě, ale administrace čte
  `luna_findings` — majitel tedy viděl „výrazné poškození" u zóny, kterou
  pipeline záměrně neuznala.
- **Opakované vyhodnocení už nevyrábí duplicity.** Cron i ruční spuštění jen
  vkládaly; dva případy na tutéž zónu znamenaly dvě faktury za jedno prasklé
  sklo. Drží to unikátní index, ne domluva.
- **Padající protokol se zkusí třikrát a pak jde k člověku.** Dřív se pouštěl
  každých patnáct minut donekonečna a pokaždé stál až osmnáct volání modelu.
- **Volání modelu má časový strop a jedno zopakování.** Jedno zaseknuté
  spojení zabilo serverless běh uprostřed a protokol zůstal viset.

### Naprostá kontrola v administraci

- **Stav systému** — databáze, úložiště fotek, klíč k modelu, referenční sady,
  SMTP, podpisy, ochrana portálu, crony, fronta protokolů, fotky po lhůtě.
  U každého řádku, co to znamená v provozu. `stavUloziste()` měla v komentáři
  „podklad pro přehled v administraci" a nikde se nevolala.
- **Naplánované úlohy jdou spustit tlačítkem.** Dosud jen zavoláním adresy
  s tajemstvím, tedy z terminálu.
- **Infolinka** je v nastavení firmy, ne v kódu — majitel ji může přesměrovat
  na správce bez nasazení.
- **Rozcestník `/admin/vic`.** Spodní lišta měla sedm položek; při 360 px má
  buňka pětačtyřicet pixelů a popisky se lámou. Pět je strop, zbytek žije na
  plnohodnotné stránce.

### Fotky se po devadesáti dnech opravdu mažou

`delete_after` se poctivě zapisovalo od začátku a **nikdo ho nikdy nečetl**,
přestože portál hostovi mazání slibuje. U osobních údajů to není nepořádek,
ale porušený závazek. Nový cron `/api/cron/retence` obsah smaže a nechá řádek
se `deleted_at` — musí jít doložit, že fotka existovala a kdy zmizela.
`legal_hold` má přednost.

### Právní texty dohnaly realitu

Zásady ochrany údajů o fotkách vůbec nemluvily a tvrdily, že se údaje mimo EU
nepředávají — přitom snímky interiéru chodí k poskytovateli modelu v USA.
Doplněno: co se zpracovává, na jakém titulu, jak dlouho, kdo se k tomu dostane,
předání na standardní smluvní doložky a samostatný oddíl o automatickém
vyhodnocení a čl. 22 GDPR.

Obchodní podmínky slibovaly vratnou kauci 3 000 Kč vracenou do tří dnů —
systém ale jede v režimu smluvní kauce a nevybírá nic. Text teď popisuje, jak
to opravdu funguje, a přidává článek o fotoprotokolu: co se s fotkami děje,
že rozhoduje člověk a že nepořádek se neúčtuje.

### Rychlost

- **Fonty.** `weight: ["300","400","500","600"]` u variabilního Fraunces
  vyrobil čtyři pevné řezy, takže `font-weight: 480` v hero se zaokrouhlilo —
  návrh dělal něco jiného, než měl. Kurzíva má vlastní řez bez předběžného
  načítání: 86 kB, které blokovaly hero fotku, kvůli dekorativnímu detailu.
- **Podepsané odkazy v dávce.** Dvanáct zón × reference a fotka = dvacet čtyři
  HTTP volání na Supabase, než se odešle první bajt stránky — hostovi na
  mobilu v lese.
- **Přihlášení stálo dva dotazy na každý požadavek** a volá se ze čtyřiceti
  míst. Teď jeden `UPDATE … RETURNING` v CTE, obalený `cache()`.
- **Proxy běžela skoro na všechno** včetně `/`, `/sitemap.xml` a všech `/api`,
  přestože podpis ověřuje u dvou adres. Bezpečnostní hlavičky se přesunuly do
  `next.config.ts`, kde je nasazuje statická konfigurace, matcher se zúžil.
  Přibyla **CSP**, která chyběla úplně.
- **Waterfally** na „Dnes", v nastavení a v portálu do `Promise.all`.
- **Pošta z rezervace přes `waitUntil`**, ne `void` — serverless běh se po
  odpovědi může zmrazit a host by nedostal potvrzení s platebními údaji.
- **Půl megabajtu mrtvých aktiv** pryč, ikony a OG obrázek přegenerované
  (245 kB → 61 kB, 228 kB → 117 kB).
- **Ukázkové obrázky mají skutečné rozměry.** Natvrdo zapsané `1024×683` je
  deformovalo a rezervovalo špatnou výšku.

### Mobil a přístupnost

- Pole ve formulářích mají 16 px — Safari na iOS cokoli menšího zoomuje.
- Spodní lišta administrace i lišta průvodce respektují bezpečnou zónu
  (`viewportFit: "cover"` + `env(safe-area-inset-bottom)`). V celém repozitáři
  do teď nebyl jediný výskyt.
- Administrace i portál mají `loading.tsx` a `error.tsx`. Do teď byl v celém
  projektu jeden a chybová stránka žádná — výpadek databáze skončil výchozí
  stránkou Next bez cesty zpět.
- „Předchozí" a „Další" v průvodci měly dvacetipixelový cíl. Telefon na
  obrazovce „Dnes" osmnáctipixelový — a je to hlavní akce hlavní obrazovky.
- Chybějící povinné zóny jsou klikatelné, ne jen vypsané. Dřív se host dozvěděl
  „ještě tři zóny" a neměl kam kliknout.
- Placeholdery měly kontrast 2,33 : 1, obsazený den v kalendáři 2,54 : 1 —
  a je to konverzní stránka.
- Mobilní menu drží fokus. Hlásilo se jako `aria-modal`, ale Tab pokračoval do
  stránky pod překryvem.
- Průvodce po přechodu kroku roluje nahoru a přesouvá fokus na nadpis;
  automatický přechod už nepřepíše krok, na který host mezitím přešel sám.
- Náhledy z prohlížeče se uklízejí — dvanáct osmimegových obrázků v paměti
  Safari znamená zavřenou kartu v půlce protokolu.

### Nástroje

`scripts/dev/ai-sada-obrazky.mts` generuje dvojice, `ai-sada-vyhodnot.mts` je
prožene celým řetězem a uloží podklad pro stránku. Do mezipaměti jde jen to,
co stálo peníze — pravidla se přepočítají pokaždé, jinak by stránka ukazovala
systém, jaký býval.

Skripty na screenshoty hledaly Chromium natvrdo v `mac-x64`; na Applu s ARM
padaly na ENOENT, takže se QA prostě přestalo pouštět.

**171 testů prochází**, z toho 33 nad vzkazem hostovi a 16 nad celým
protokolem — od nahrání reference přes příjem fotek a vyhodnocení až po
smazání po lhůtě.

## Kolo 13b — dobrání zbytku edge cases

Po prvním kole zůstal otevřený seznam. Tohle je jeho zbytek — a jeden nález,
který vypadl až při zkoušce naostro.

### Tutéž škodu šlo vyfakturovat dvakrát
`vyuctujSkodu` si `uz_vyuctovano` **spočítalo a nikde nepoužilo**. Tlačítko
skryl jen zastaralý serverový render, takže dvojklik nebo dvě otevřené záložky
znamenaly dvě faktury hostovi za jednu prasklou tabuli.

### Překlep o řád projde až na fakturu
„70000" místo „7000" nic nezastavilo. Nad 30 000 Kč se teď částka musí objevit
i v odůvodnění, které majitel píše vlastními slovy. Kontrola je ve vlastním
modulu bez databáze a bez přihlášení (`lib/luna/kontrola.ts`, 7 testů) — je to
jediné místo, kde se z podezření stává nárok na peníze.

### Zpětná vazba k modelu se konečně zapisuje
`luna_feedback` existovala od začátku a nikdo do ní nikdy nezapsal. „Bez nároku"
u nálezu `damage_major` je učebnicový falešný poplach — a bez záznamu se nedá
poznat, jestli se systém po změně promptu zlepšil, nebo zhoršil. Zapisuje se
při rozhodnutí i při uzavření protokolu bez nároku.

### Relace hosta se ověřovala jen při přihlášení
Cookie žije čtrnáct dní a stačilo, že sedí podpis. Vypršelý přístup, zamčený
účet ani **zrušená rezervace** hosta z portálu nevyhodily — storno tedy
neznamenalo nic a host se dál díval na adresu domku. Kontroluje se teď při
každém požadavku a storno navíc zavírá inspekci, zamítá čekající případy
škody a ruší přístup do portálu.

### Přihlášení do portálu nemělo strop na adresu
Počítadlo hlídalo jeden variabilní symbol, ale nic nebránilo zkoušet tisíc
symbolů po jednom pokusu. A protože se scrypt počítá i pro neexistující VS
(aby odpověď trvala stejně dlouho), stačilo pár set souběžných požadavků.

### Protokol šlo vyplnit tři měsíce před příjezdem
Host mohl otevřít a odeslat protokol den po zaplacení zálohy. Vznikla inspekce,
spustil se model a mohly vzniknout případy škody k pobytu, který se ještě
nekonal. Protokol se otevírá den před příjezdem a kontrola je i v routě —
je to veřejné API.

### Fotka vyfocená dopředu
`exif_taken_at` se poctivě ukládalo a nikdo ho nečetl. Host mohl vyfotit
v pondělí a ve středu protrhnout matraci. Snímek starší než 24 hodin teď
nepropadne sám, ale jde k člověku — neobviňujeme, jen to nemůže projít mlčky.

### Přístupový kód nebyl to, co o něm tvrdil komentář
`portalovyKod` stál na FNV-1a s 32bitovým stavem a deterministické rotaci.
Slib „bez klíče se to spočítat nedá" neplatil: krátké tajemství šlo offline
uhodnout. Teď HMAC-SHA256, stejná délka i abeceda. Bez `PORTAL_SECRET` se
naostro vyrobí náhodné tajemství — přihlášení nefunguje, ale nikdo se dovnitř
nedostane.

### „Celý les" měl rozbitý protokol
Prodejná jednotka „Celý les" je složená z Acháta a Mechu. Vznikla jedna
inspekce se `unit_slug = 'cely-les'`, ke které žádná referenční sada
neexistuje — všech dvanáct zón tedy šlo k ručnímu posouzení a host fotil
dvanáct zón pro **dva** domky; ten druhý zůstal nezdokumentovaný.

Protokol se teď zakládá **na fyzický domek**: dvě inspekce, dvacet čtyři zón
ve dvou blocích, každý proti své referenci. Host o tom neví — odesílá jeden
protokol a dostane jeden vzkaz. Když je u jednoho domku důvod zavolat, platí
to pro celý pobyt; pravidlo „jedna žádost naráz" nezná hranice domku.

### Sezónnost venkovních zón
Referenční snímek terasy je z léta, hostův z prosince. Rozdíl mezi zeleným
a zasněženým lesem za oknem zabírá velkou plochu a brána se kvůli němu otevře.
Prompt (verze `luna-5.6-cs-3`) teď sezónu jmenuje mezi distraktory a u
venkovních zón výslovně říká, že se poškození hledá na konstrukci, ne v tom,
co je za ní.

### Prázdný protokol se tvářil jako „vše v pořádku"
Vypadlo to při zkoušce naostro: vyhodnocení nad inspekcí bez jediné fotky
skončilo jako `auto_clear` se shrnutím „všechny zóny odpovídají stavu při
předání". Odesílací brána sice povinné zóny vyžaduje, ale vyhodnocení se pouští
ze tří míst. Doklad, který nedokládá nic, je horší než žádný — teď to jde
k člověku.

### Drobnosti
- Kešované tokeny se u OpenAI počítaly dvakrát; jsou uvnitř `prompt_tokens`,
  ne vedle nich. Cena vyhodnocení se tím nadhodnocovala.
- Export neasynchronní hodnoty z modulu `"use server"` se v překladu změní na
  odkaz na serverovou akci. `ULOHY.map` na klientu spadlo na „map is not
  a function" — typová kontrola to nechytí a build taky ne. Seznam úloh i
  kontrola rozhodnutí proto bydlí ve vlastních modulech.
- Skripty na screenshoty hledaly Chromium natvrdo v `mac-x64`.

**186 testů prochází.** Zkouška naostro na šesti zónách: dvě poškození nalezena
s jistotou 99 % → telefonát hostovi, tři zóny nepořádku → vlídná prosba,
večerní světlo → nic. 66 sekund, 15,51 Kč, dva případy ke schválení majitelem.

## Kolo 14 — dva světy přestavěné

Systém uvnitř fungoval, ale obě obrazovky, které někdo doopravdy otevře, byly
databázový výpis převlečený do karet. Stejný rámeček, stejná velikost, stejná
váha pro všechno — a pořadí podle toho, jak to leží ve schématu.

### Portál hosta: obrazovka odpovídá na otázku, kterou má host právě teď

První věcí na displeji bylo **číslo rezervace a variabilní symbol**. Člověk,
který stojí v deset večer u závory na kraji lesa, nepotřebuje účetní číslo.
Potřebuje vědět, kudy a jak se dostane dovnitř. Za tři dny ráno potřebuje něco
úplně jiného.

Portál se proto neptá „co o téhle rezervaci víme", ale **kde v pobytu ten
člověk je** (`lib/portal/prehled.ts`). Podle toho se mění, co je nahoře:

| Fáze | Nahoře a velké |
| --- | --- |
| před příjezdem | kde to je + navigovat |
| den příjezdu | kód od schránky, wifi |
| během pobytu | wifi, topení, telefon |
| odjezd | foto-protokol |
| po pobytu | vzkaz |

- **Kód od schránky se vytáhne z volného textu** a ukáže se velký a na ťuknutí
  se zkopíruje. Majitel píše pokyny vlastními slovy; číslo z nich jde vytáhnout
  a je to jediná věc, kterou host opisuje — často jednou rukou a se svítilnou
  ve druhé. Totéž wifi heslo.
- **Vstupní pokyny se odemykají den před příjezdem.** Kód poslaný tři měsíce
  dopředu se ztratí v e-mailu a host se stejně zeptá telefonem.
- Číslo rezervace a variabilní symbol jsou **dole**, kam patří.
- Karta znamená „tohle je důležité". Když je kartou všechno, neznamená to nic —
  zbytek jsou tiché řádky bez rámečku.
- Telefon se ukazuje po trojicích. Do databáze chodí v E.164 a shluk devíti
  číslic se očima nezkontroluje.

### Administrace „Dnes": den jako časová osa, ne čtyři tabulky

Byly to čtyři stejné karty — Odjíždí, Přijíždí, Zůstává, Vyžaduje pozornost —
a v klidný den tři z nich hlásily „nikdo". Osmdesát procent obrazovky
nezobrazovalo nic a jediný užitečný údaj (příští příjezd) byl šedý text uvnitř
prázdného stavu.

- Nahoře **jedna věta**: „Dnes jeden odjezd." Slovy, ne číslicemi — je to věta,
  ne tabulka. Když odjezd a příjezd padnou na týž domek, věta to řekne rovnou:
  „Mezi tím se musí stihnout úklid."
- Pak **časová osa** s časem jako kotvou a jednou hlavní akcí na řádku.
  Tou akcí je skoro vždycky zavolat, tak je přes celou šířku a palcem
  dosažitelná — i s číslem, protože majitel ho stejně chce vidět.
- **Pruh sedmi dní.** V klidný den byla obrazovka prázdná a majitel stejně
  přepnul do kalendáře, aby zjistil, kdy se něco stane.
- **Peníze jedním číslem**, ne tabulkou. Podrobnosti jsou o ťuknutí dál.
- Urgentní úkoly jsou nahoře. Když nic nehoří, není tam nic.

### Co se přitom našlo
- `process.exit(0)` hned po zápisu utne PGlite v půlce flushe. Napoprvé to
  vypadá, že se změna neuložila, **napodruhé se zápis do téhož adresáře
  zasekne** — a hledá se to dlouho, protože chyba nevznikne tam, kde se
  projeví. Přibylo `zavriDb()`.
- Migrace 0002 zakládala řádky `stay_info` v době, kdy ještě žádné jednotky
  neexistovaly, takže žádné nevznikly. Administrace to naštěstí zapisuje
  přes `INSERT … ON CONFLICT`, takže se to nikdy neprojevilo.

## Kolo 14b — dokončení pobytu jako věc, kterou jde najít

Host se zeptal, kde je dokončení pobytu. Odpověď zněla: nikde. Portál o odjezdu
po celý pobyt **mlčel** a poslední ráno na hosta vyskočilo tlačítko „Začít
fotit" — bez kontextu, bez toho, aby věděl, kolik toho po něm chceme a co bude
následovat. To není dokončení pobytu, to je přepadení.

### Odjezd má vlastní adresu a vlastní jméno

`/pobyt/odjezd` — **Dokončení pobytu**. Tři očíslované kroky pod sebou, ať je
na první pohled vidět, z čeho se to skládá:

1. **Vyfotit domek** — jediná část, která něco blokuje. Se stavem „hotovo 3 z 9".
2. **Klíč zpátky do schránky**
3. **Okna, topení, odpadky**

Dva a tři jsou **připomínky, ne podmínky**. Klíč se vrací až ve dveřích a nutit
hosta odškrtnout „vráceno", když ho ještě drží v ruce, znamená jediné: odškrtne
si to a zapomene. Odeslání drží jen fotky.

Slovo „protokol" se v portálu neobjeví. Je to naše slovo, ne hostovo.

### Průvodce už nic neodesílá

Odesílal uprostřed focení, takže se host o zbytku odjezdu vůbec nedozvěděl.
Teď jen fotí a vrací se na „Dokončení pobytu", kde je to pohromadě. Tlačítko
zpátky se navíc objeví, **jakmile jsou všechna povinná místa hotová** — host
nemusí prolistovat až na dvanáctou obrazovku.

### Co bude na konci, host vidí od začátku

Karta „Až budete odjíždět" je v přehledu po celý pobyt: tři body, čas odjezdu
a odkaz. Kdo o tom ví od prvního večera, nechá si na to ráno deset minut.
V den odjezdu se z téže karty stane hlavní věc na obrazovce.

### Adresy, na které lidi sáhnou sami
`/host`, `/hoste`, `/klient`, `/muj-pobyt`, `/moje-rezervace` a `/host/:cesta*`
míří na portál, `/prihlaseni` do administrace. Kanonická adresa zůstává
`/pobyt` — tak se portál jmenuje i v e-mailu s přístupem. Přesměrování je
dočasné (307), protože trvalé si prohlížeče pamatují napořád.

## Kolo 15 — aplikace pro hosta, ne stránka

Majitel: „Nevypadá to vůbec jako aplikace pro klienty." Měl pravdu. Byla to
webová stránka — logo nahoře, „Odhlásit", dlouhé rolování, dole nic — a host
ji otevírá na telefonu v autě, u závory, v posteli. Čeká aplikaci.

### Čtyři záložky, čtyři otázky
`components/pobyt/Aplikace.tsx` — pevná lišta dole, palcem dosažitelná,
s bezpečnou zónou iPhonu:

| Záložka | Otázka |
| --- | --- |
| **Pobyt** | Co je teď? |
| **Domek** | Jak funguje domek? Kód, wifi, topení, adresa. |
| **Odjezd** | Jak odjet? Tři kroky, jedno tlačítko. |
| **Pomoc** | Komu zavolat a co dělat, když něco nejde. |

Pátá by už byla menu. Přihlášení a focení domku jsou mimo obal: přihlášení
nemá kam přepínat, focení je celoobrazovkový tok, ze kterého se nemá odbíhat.

### Pobyt začíná fotkou a jménem
Za pobyt se platí patnáct tisíc a host dostal černou stránku s textem „Dobrý
den". Ani jedna fotka, ani jméno. Teď: fotka domku přes půl obrazovky, oslovení
**pátým pádem podle denní doby** („Dobrý večer, Evo") a jedna věta o tom, kde
v pobytu člověk je. Pod tím jediná věc, která je teď důležitá, a tlačítko
zavolat. Obrazovka se nemá rolovat.

Vokativ je v `lib/format.ts` s testy na běžná jména včetně pohyblivého e
(Pavel → Pavle, Zdeněk → Zdeňku). Co nesedí, zůstane v prvním pádu — pořád
lepší než zkomolenina.

### Vstup jedním klepnutím
Host dostal e-mail s variabilním symbolem a kódem a musel je opsat do
formuláře — na telefonu, mezi dvěma aplikacemi. Tlačítko v e-mailu teď vede na
`/pobyt/vstup?vs=…&kod=…`, které přihlásí a přesměruje. Odkaz nese totéž, co
e-mail o pár řádků níž, takže nic nového neprozrazuje; omezení pokusů
a zamykání platí stejně. Formulář zůstává pro přeposlaný e-mail a starý odkaz.

### Přidat na plochu = aplikace
Vlastní manifest `/pobyt/manifest.webmanifest` se `start_url: /pobyt`. S tím
webovým by ikona na ploše otevírala úvodní stránku s rezervačním formulářem.
`appleWebApp` v metadatech schová lištu Safari.

### Pomoc
Telefon velký a hned nahoře. Pod ním šest situací, které se stávají, s jednou
větou co udělat — a schválně obecně: konkrétní věci o domku píše majitel
v nastavení a host je má v záložce Domek. Podmínky a soukromí úplně dole,
protože tam patří.

**207 testů prochází.**

## Kolo 16 — audit veřejného webu: prodává?

Web vypadá dobře — hero, typografie, kapitoly. Audit se proto neptal „je to
hezké", ale „prodává to". Odpověď: hezky, ale s dírami tam, kde se rozhoduje.

### Termín hned v hero
Každý web, který prodává noci, má datum nahoře. Tenhle měl jen tlačítko
„Rezervovat pobyt", za kterým teprve začínal čtyřkrokový průvodce — a první
krok byl výběr domku, ne termínu. Host, který přijde s otázkou „je volno
o víkendu 20. září?", ji chce položit hned.

Obyčejný formulář s GET: bez JavaScriptu odešle a průvodce si termín přečte
z adresy. Nativní `<input type="date">` na telefonu otevře systémový kalendář.

### Průvodce umí začít termínem
`/rezervace?prijezd=…&odjezd=…` — karty domků rovnou říkají **„Volno · 2 noci
· 6 980 Kč"** nebo „V tomhle termínu obsazeno". Host, který přišel
s termínem, se neptá „který domek se mi líbí", ale „který je volný".
S domkem i termínem (`&domek=achat`) skočí průvodce rovnou na hosty.
Termín z adresy se ověřuje: minulost, odjezd před příjezdem nebo nesmysl
znamenají „bez termínu", ne chybu.

### Tlačítko Rezervovat na telefonu
Na mobilu byla jediná cesta k rezervaci hamburger nebo konec stránky. Hlavní
akce webu byla schovaná přesně na zařízení, ze kterého přijde většina
návštěv. Teď je vedle hamburgeru.

### Lišta s cenou na detailu domku
Detail je sedm obrazovek a tlačítko bylo až u kalendáře v šesté. Lišta
„od 2 890 Kč / noc · Rezervovat Achát" se objeví po odrolování hero a zmizí
u patičky. Věc, kterou má každý web prodávající noci.

### Kalkulačka na ceníku
Ceník říkal „2 890 ve všední den, 3 490 o víkendu, +400 v sezóně, −10 % nad
týden" a nechal hosta to složit v hlavě. Kalkulačka počítá **toutéž funkcí
jako průvodce a server** z téhož ceníku, ukáže cenu i dostupnost obou domků
a pustí dál s vyplněným termínem.

### Fotky na celou obrazovku
Galerie byla mřížka statických obrázků — na telefonu dva sloupce po 180
pixelech a žádný způsob, jak si fotku prohlédnout. Host, který se rozhoduje
podle interiéru, přibližoval prsty a přiblížil celou stránku. Lightbox bez
knihovny: nativní `<dialog>` a vodorovný pás se snapem, listování prstem
zadarmo. Detail domku má místo dvou fotek pět (kuchyň, koupelna, postel)
a všechny jdou zvětšit.

### Kratší mobilní úvod
Úvodní stránka měla na telefonu 28 obrazovek. Šest karet „co tu najdete" a
čtyři roční období jsou teď vodorovný pás se snapem — zvyk z každé aplikace,
a pořád je vidět, že je karet víc. 11 223 → 9 423 px.

### Lišta cookies pryč
Web používá jen technicky nezbytné cookies a ty souhlas nevyžadují (§ 89
ZEK, GDPR). Lišta oznamovala „používáme jen nezbytné cookies", zabírala na
telefonu třetinu rezervační stránky, nechávala klepnout „Rozumím" kvůli ničemu
— a zakrývala novou rezervační lištu. Informace zůstává na /cookies.

### Kauce sladěná s podmínkami
Ceník, souhrn rezervace i PRICING.notes slibovaly „vratnou kauci vracíme do
tří dnů" — podmínky už týden říkají, že se kauce nevybírá. Text říká totéž
všude.

Měřeno: LCP 32–420 ms, CLS 0 (kontakt 0,028), nula dlouhých úloh, nula chyb
v konzoli na všech 13 stránkách v obou rozlišeních. **207 testů prochází.**

## Kolo 17 — zkouška klientské zóny

Otázka zněla: je to přehledné, důstojné a funkční i pro člověka, který se
nechce nic učit — nebo je to jen hezky vypadající generovaná omáčka?
Projití všech pěti fází × čtyř záložek na 393 px našlo pět věcí.

### Heslo k wifi se lámalo na tři řádky
Nejhorší nález. Dvousloupcová mřížka má na telefonu sto šedesát pixelů na
kartu a „lomasvetlusky" se do ní nevešlo — vypadalo to rozbitě a hůř se to
opisovalo. „KÓD OD SCHRÁNKY" zároveň naráželo do slova „kopírovat".

Prvek `Zkopiruj` má teď popis nahoře, hodnotu pod ním a **ikonu místo slova**;
dlouhá hodnota dostane menší písmo, ne zalomení. Hesla jsou pod sebou, ne
vedle sebe.

### „Vítejte v Achátu" druhý den pobytu
Fáze `behem` začíná den po příjezdu, takže hosta vítala aplikace i tehdy,
když už tam jednu noc spal. Teď „Jste v Achátu" a poslední den „Užijte si
to tu".

### Telefon na každé obrazovce
Tlačítko „Zavolat nám · klidně i kvůli maličkosti" bylo pod vším a na čtvrté
obrazovce už to byla omáčka — navíc duplikovalo záložku Pomoc. Zůstává jen
v den příjezdu (host bloudí) a v den odjezdu (host něco našel), a nese
i číslo.

### Host bez kódu byl na přihlášení zaseknutý
Jediná cesta ven byla malý odkaz uvnitř věty. Teď dvě tlačítka — zavolat
a napsat.

### „Jak dovnitř" vs „Jak se dostanete dovnitř"
Táž věc se v Pobytu a v Domku jmenovala jinak.

### Co obstálo
Chybová obrazovka: při výpadku databáze host viděl větu a telefon, ne
traceback. Prázdná data: bez adresy a kódu se neukáže prázdný blok, ale věta
„Pokyny doplníme před příjezdem. Kdyby tu nic nebylo, zavolejte."
Žádný dotykový cíl pod 44 px, žádné vodorovné přetečení.

### Testy, které to hlídají dál
`__tests__/portal-texty.test.ts` — osmnáct frází, které do portálu nepatří
(„nezapomeňte", „vezměte na vědomí", „neváhejte", „uživatel", „klient"),
zákaz vykřičníků a kontrola, že každý tón vzkazu má dokončenou větu.
Test si vynutil vlastní upřesnění: u tónu s prosbami smí věta končit
dvojtečkou, protože uvozuje seznam.

`__tests__/prehled.test.ts` — osm testů na fáze pobytu včetně toho, že se
pokryje celá osa a že přechod letního času nerozhodí počet dní.

`scripts/dev/qa-portal.mjs` umí projít portál v zadané fázi a hlásí malé
dotykové cíle i vodorovné přetečení. Nepočítá prvky schované pro odečítače
ani odkazy uvnitř odstavce — ty nejsou samostatná akce.

### Dvě věci mimo portál
`scripts/dev/ukazkova-data.mjs` postaví celou ukázku jedním příkazem
a **odmítne běžet, když běží server**: PGlite drží data v jednom adresáři
a dva procesy nad ním si je navzájem poškodí. Přišlo se na to tak, že se to
stalo — chyba se projeví až později hláškou „Aborted()".

`scripts/dev/snimek.mjs` fotí jednu stránku; čeká, až zmizí kostra
z `loading.tsx`, jinak zachytí prázdno.

**227 testů prochází.**

## Kolo 18 — Lom už není tajemství

Zadání: web přestane lokalitu tajit. Všude uvede celý lom — jméno, obec, GPS —
přidá mapu aktivit v okolí pro léto i zimu s automatickým přepínáním a design
se posune k tomu, jak lom doopravdy vypadá.

### Poloha je veřejná
Lom Jílové u Držkova, jižní okraj obce, GPS 50.6692N, 15.2903E (vstup k vodě
podle potápěčského atlasu, N 50°40,152′ E 15°17,415′). Fakta z místních
průvodců: hladina 60 × 35 m, hloubka kolem 6 m, břidlice, parkování 50 m
od vody, v létě stánek, místní jméno České Chorvatsko. Všechno sedí v jednom
objektu `LOCATION` v `lib/content.ts` — jméno, okres, kraj, obě podoby GPS,
odkazy do Map, vzdálenosti, cesta ve čtyřech krocích a šest karet okolí.

Zmizelo: „Mapa, která mlčí", „tady někde", „souřadnice posíláme s rezervací"
(lokalita, kontakt, patička, FAQ, O nás, úvod, platba, jak to funguje).
Host dál dostává den před příjezdem video s cestou a kód od schránky —
adresa domku zůstává v portálu, na webu je poloha lomu. Poznámka
v administraci u „Přesná adresa" to říká.

JSON-LD má skutečné souřadnice, `hasMap`, TouristAttraction se jmenuje jako
lom. Metadata, manifest a klíčová slova mluví o lomu Jílové u Držkova.

### Mapa okolí — /okoli
`lib/okoli.ts`: 36 míst s GPS, kategorií, sezónou (léto / zima / celoročně),
dobou jízdy a popisem; celoroční místa mají zvláštní zimní popis (lom pro
otužilce, Mumlava v ledu, Bedřichov na běžkách). Sjezdovky od Zásady (10 min)
po Rokytnici, běžky, ferrata Vodní brána, půjčovna lodí na Malé Skále, skalní
města, hrady, rozhledny, jeskyně, sklo, pivovar, bobové dráhy.

Přepínač léto/zima: výchozí polohu určí datum v pražském čase
(`lib/sezona.ts`, zima = prosinec až březen), stránka se přegenerovává každou
hodinu a v prohlížeči se datum zkontroluje ještě jednou. Kdo přepne ručně,
tomu kalendář už nemluví do toho. Filtry podle kategorie a „s dětmi", seznam
řazený podle doby jízdy, vzdušná vzdálenost spočítaná ze souřadnic.

Mapa je Leaflet s dlaždicemi OpenStreetMap, načítá se až v prohlížeči
(`components/okoli/LeafletMapa.tsx`); značky jsou CSS, ne obrázky. Kolečko
zoomuje až po klepnutí do mapy. CSP dostala `tile.openstreetmap.org` do
`img-src`. Bez JS zůstává seznam míst obyčejné HTML. Na /lokalita je táž
mapa s jedinou značkou a otevřenou bublinou.

Odkazy do Map jdou přes vyhledání názvu (mapy.com, kam mapy.cz přesměrovává),
ne přes souřadnice — trefí správný vchod, i když je značka o kus vedle.

### Design podle lomu
Paleta z fotky: tmavá hladina místo lesní noci (`night #0a1416`, celý tmavý
žebříček do modrozelena), světlé sekce jako obloha (`mist #e3eaec`, třída
`.obloha` s mraky), nové tóny `azure` (obloha, zima), `birch` (břízy, léto),
`shale` (břidlice) a `cloud`. Ember zůstává jediným teplým akcentem.
`ember-deep` ztmavl na #8d5019, aby na chladnější světlé ploše držel AA.
Motiv `.strata` — přerušované vodorovné linky jako vrstvy břidlice.
`FotoHero` — hlavička s fotkou přes celou šířku pro lokalitu a okolí.
Skutečná fotka lomu (`public/foto/lom-jilove.jpg`) nahradila generované
koupání v galerii a v O nás; pás ročních období na úvodu označuje to, které
právě běží.

### Testy
`__tests__/okoli.test.ts` hlídá data: jedinečná id, souřadnice do 50 km od
lomu, kategorie ze seznamu, délky popisů, doba jízdy vs. vzdálenost, filtry.
`__tests__/sezona.test.ts` hlídá hranice sezón včetně pražského času.
**267 testů prochází**, build i typová kontrola čisté.
