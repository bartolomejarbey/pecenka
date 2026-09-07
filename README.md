# sedmyles.cz

Web pro pronájem dvou tiny housů u zatopeného lomu. Next.js 16 + Tailwind v4,
bez animačních knihoven. Kreativní zadání viz [ZADANI.md](./ZADANI.md),
architektura rezervačního a fakturačního systému viz [SYSTEM.md](./SYSTEM.md),
postup prací viz [ITERACE.md](./ITERACE.md).

## Spuštění

```bash
npm install
npm run db:reset   # založí lokální databázi a naplní ji ceníkem
npm run dev        # http://localhost:3000
npm run build      # produkční build
npm test           # testy (cena, pojistka proti vymyšlené dostupnosti)
```

**Databáze nepotřebuje žádnou instalaci.** Bez `DATABASE_URL` běží projekt na
PGlite — Postgres 18 přeložený do WASM, data v `.pglite/`. Je to týž Postgres
jako naostro, včetně `btree_gist`, takže i ochrana proti dvojímu prodeji se
chová stejně. Na produkci se nastaví `DATABASE_URL` (Neon) a nic jiného se nemění.

```bash
npm run db:migration   # SYSTEM.md → db/migrations/0001_init.sql
npm run db:migrate     # nasadí migrace
npm run db:seed        # ceník, doplňky, jednotky, číselné řady
npm run db:pull        # z databáze zpět do lib/db/schema.ts (typy)
node scripts/dev/seed-ukazka.mjs   # pár rezervací na hraní
```

## Kde co je

- `lib/content.ts` — **veškerý obsah webu** (texty, ceny, domky, FAQ, recenze). Editovat tady.
- `lib/booking/` — cenotvorba a dostupnost.
- `lib/luna/` — porovnání stavu domku (obrazová brána, prompty, vzkaz hostovi).
- `lib/portal/` — portál hosta: přístup, protokol, příjem fotek.
- `components/` — sdílené komponenty (Nav, Footer, Reveal, ui…).
- `app/` — stránky (App Router): veřejný web, `/admin`, `/pobyt`.
- `public/foto/` — fotky domků a lomu.
- `public/test-ai/` — zkušební dvojice „před a po" pro `/admin/test-ai`.

## Kde je co v provozu

| Adresa | Kdo | K čemu |
| --- | --- | --- |
| `/` | host | web, rezervace |
| `/pobyt` | host po zaplacení | adresa, klíče, wifi, **foto-protokol před odjezdem** |
| `/admin` | majitel | dnešek, kalendář, rezervace, peníze, doklady, protokoly |
| `/admin/reference` | majitel | referenční fotky domku po zónách |
| `/admin/test-ai` | majitel | deset zkušebních dvojic a co u nich systém řekne hostovi |
| `/admin/nastaveni` | majitel | údaje firmy, infolinka, **stav systému**, ruční spuštění úloh |

## Porovnání stavu domku

Host před odjezdem vyfotí zóny domku. Obrazová brána porovná snímky
s referencí a jen podezřelá místa pošle modelu; ten popíše, co se změnilo,
a povinně i důvod, proč to poškození být nemusí. **O penězích rozhoduje vždy
člověk** — databáze vynucuje ručně psané odůvodnění.

Host dostane vzkaz hned, dokud stojí v domku: poděkování, prosbu o srovnání
drobnosti, prosbu o telefonát na infolinku, nebo prosbu o jednu fotku navíc.
Nikdy se nedozví, že něco rozbil — o tom se mluví po telefonu.

```bash
node scripts/dev/ai-sada-obrazky.mts            # vygeneruje 10 dvojic před/po
node --import ./scripts/dev/bez-server-only.mjs \
     scripts/dev/ai-sada-vyhodnot.mts           # prožene je celým řetězem
node --import ./scripts/dev/bez-server-only.mjs \
     scripts/dev/protokol-naostro.mts           # celý tok se skutečným modelem
```

Bez Supabase se fotky ukládají na disk do `.uloziste/` a odkazy se podepisují
stejně jako naostro — celý protokol jde zkoušet lokálně.

## Před spuštěním naostro — TODO

1. **Telefon** v `lib/content.ts` (`SITE.phone`) je placeholder.
2. **Recenze** (`REVIEWS`) jsou ilustrační — nahradit skutečnými (vymyšlené recenze = klamavá reklama).
3. **Právní stránky** — doplnit IČO, jméno podnikatele a adresu; nechat zkontrolovat právníkem.
4. **SMTP** pro formuláře — vytvořit `.env.local`:
   ```
   SMTP_HOST=smtp.forpsi.com
   SMTP_PORT=465
   SMTP_USER=ahoj@sedmyles.cz
   SMTP_PASS=...
   CONTACT_TO=ahoj@sedmyles.cz
   ```
   Bez SMTP se poptávky jen logují do konzole (web funguje dál).
5. **Lokalita** — až bude přesná poloha, doplnit do `lib/content.ts` (`SITE.region`, `LOCATION`).
6. **Referenční fotky** — nafotit oba domky po zónách v `/admin/reference`.
   Dokud tam nic není, nemá systém odjezdové fotky s čím porovnat.
7. **Infolinka** v `/admin/nastaveni` je zatím zástupné číslo.
8. **Úložiště fotek** — na produkci nastavit `NEXT_PUBLIC_SUPABASE_URL`
   a `SUPABASE_SERVICE_ROLE_KEY`. Bez nich host neodešle protokol; stav vidíš
   v `/admin/nastaveni → Stav systému`.
9. **Více fotek** — interiéry, sauna, sud, lom; podklady viz GRAPHIC-BRIEFS.md.
