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
| 4 | Rezervační jádro: skutečné rezervace, VS, blokace termínů | ⏳ |
| 5 | Platby: QR (SPAYD), `PaymentProvider`, příprava ComGate | ⏳ |
| 6 | Admin: Dnes, kalendář, detail rezervace, ruční rezervace | ⏳ |
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
