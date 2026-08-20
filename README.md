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
- `lib/booking.ts` — cenotvorba a dostupnost (zatím ilustrační obsazenost).
- `components/` — sdílené komponenty (Nav, Footer, Reveal, ui…).
- `app/` — stránky (App Router).
- `public/foto/` — fotky (tiny1–3.jpg z dodaných PNG).

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
6. **Dostupnost** — napojit skutečný kalendář obsazenosti (`lib/booking.ts → getBookedDays`).
7. **Více fotek** — interiéry, sauna, sud, lom; podklady pro generování viz GRAPHIC-BRIEFS.md.
