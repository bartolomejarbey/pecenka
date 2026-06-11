# SEDMÝ LES — kreativní zadání (brief)

> „Za sedmero horami a sedmero lesy…" — v tom sedmém to je.

## Klient & produkt

**sedmyles.cz** — pronájem dvou designových tiny housů na samotě u zatopeného
žulového lomu (sever středních Čech, přesná lokace se doplní). Celoroční provoz.
Cílovka: páry 25–45 z Prahy a okolí (do hodiny autem), co chtějí na 2–4 noci
vypnout; sekundárně malé rodiny a sólo útěky.

## Pozicování

Ne „glamping", ne „chatky". **Tichý luxus v divočině.** Konkurence prodává
ubytování; Sedmý les prodává *ticho, tmu a vodu v lomu*. Cena odpovídá
(3 490–4 990 Kč/noc) a web musí vypadat jako důvod, proč to stojí za to.

## Brand

- **Jméno:** Sedmý les — z pohádkové formule „za sedmero horami a sedmero lesy".
- **Claim:** *Za sedmero horami. Hodinu od civilizace.*
- **Logo:** sedm svislých tahů (les jako čárový kód) — šest tlumených, sedmý žhne ember barvou.
- **Tón hlasu:** klidný, vřelý, trochu pohádkový, nikdy kýčovitý. Krátké věty. Vykání.
- **Domky mají jména:** **Žula** (nad lomem, finská sauna) a **Mech** (na kraji louky, koupací sud).

## Vizuální směr — „Scandinavian noir"

Editorial pohádkové knihy: stránky členěné jako **kapitoly** (Kapitola I · Ticho…).

| Token | Hodnota | Význam |
| --- | --- | --- |
| night | `#0c110f` | les po setmění — základní pozadí |
| pine | `#1c2620` | karty, zvednuté plochy |
| sage | `#9db3a2` | tlumený text |
| mist | `#ebe7db` | světlé sekce — mlha nad lomem |
| ember | `#d9914e` | akcent — světlo z okna za soumraku |
| linen | `#f3efe5` | text na tmavé |

- **Typografie:** Fraunces (display, serif s charakterem, kurzívní akcenty) + Hanken Grotesk (text).
- **Atmosféra:** filmové zrno, topografické vrstevnice lomu, světlušky v hero, měkká vinětace fotek.
- **Motion:** lenis smooth scroll, fade-up reveals, pomalé Ken Burns zoomy fotek.

## Rozsah webu

1. **Úvod** — celostránkové hero (mlha nad lomem), příběh ve třech kapitolách, domky, zážitky, recenze, FAQ teaser, CTA.
2. **Domky** (přehled + detail Žula / detail Mech) — galerie, vybavení, signature zážitek, kalendář dostupnosti, CTA.
3. **Rezervace** — čtyřkrokový flow: domek → termín (kalendář s dostupností) → hosté a doplňky → kontakt + souhrn ceny. Poptávkový model (potvrzení do 24 h), e-mail přes API.
4. **Lokalita** — „kde to je" (tajemství do rezervace), vzdálenosti, co je okolo.
5. **Galerie** — fotky s editorial layoutem.
6. **Ceník** — noci, sezóny, doplňky, storno, kauce.
7. **Časté dotazy** — 12 otázek, akordeon.
8. **Kontakt** — formulář + údaje.
9. **Dárkový poukaz** — 3 varianty, poptávkový formulář.
10. **Právní** — obchodní podmínky, GDPR, cookies. + 404, sitemap, robots, OG, JSON-LD (LodgingBusiness + FAQ).

## Ceník (výchozí, k doladění)

- Ne–čt **3 490 Kč/noc**, pá+so **4 290 Kč/noc**, vysoká sezóna (15. 6.–15. 9., 20. 12.–2. 1.) **+500 Kč**.
- Min. 2 noci, 7+ nocí −10 %, vratná kauce 3 000 Kč.
- Doplňky: sauna/sud 900 Kč/pobyt, snídaňový koš 490 Kč/den, víno 390 Kč, dřevo 250 Kč, pes 350 Kč, pozdní odjezd 600 Kč.

## Technika

Next.js 16 (App Router, Turbopack), Tailwind v4, motion, lenis, nodemailer.
Bez CMS — obsah v `lib/content.ts`. Dostupnost zatím ilustrační v `lib/booking.ts`
(připraveno na napojení skutečného kalendáře).
