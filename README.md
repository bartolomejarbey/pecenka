# sedmyles.cz

Web pro pronájem dvou tiny housů u zatopeného lomu. Next.js 16 + Tailwind v4 +
motion + lenis. Kreativní zadání viz [ZADANI.md](./ZADANI.md).

## Spuštění

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # produkční build
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
