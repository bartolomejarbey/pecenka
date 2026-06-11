# sedmyles.cz — grafická zadání pro fotografa / image model

Tento dokument obsahuje přesná zadání pro budoucí fotografie webu sedmyles.cz. Každé zadání má:

- **český popis** — k čemu to je a kde na webu se to objeví,
- **ready-to-paste ENGLISH prompt** — vlož přímo do image modelu (GPT Image / Midjourney apod.), nebo použij jako brief pro fotografa,
- **rozměry / formát** a **cílový soubor** (kam to v projektu patří, viz složka `public/foto/`),
- **negative prompt / čemu se vyhnout**.

**Značková paleta:** night `#0c110f` · bark `#131a16` · pine `#1c2620` · moss `#4a5e51` · sage `#9db3a2` · mist `#ebe7db` · linen `#f3efe5` · **ember `#d9914e`** (jediný teplý akcent — světlo z okna za soumraku).
**Typografie webu:** Fraunces (display serif) · Hanken Grotesk (text).
**Vizuální svět:** Scandinavian noir — černé opálené dřevo (shou sugi ban), žulový lom se zatopenou hladinou, mlha, les na severu středních Čech, filmové zrno, ticho. **Jediný zdroj teplého světla v záběru je vždy ember/amber** (okno, kamna, oheň, lucerna) — všechno ostatní je chladné, tlumené, zeleno-šedé.

**Společný styl pro VŠECHNY snímky (vlož na konec každého promptu):**

> Photo-real editorial photography, not a render. Muted desaturated palette: deep charcoal blacks, cold pine greens and grey granite, with a single warm amber light source (#d9914e) as the only warm accent in frame. Fine analog film grain, soft natural contrast, gentle vignette. Calm Scandinavian-noir mood, quiet fairy-tale stillness. No oversaturation, no HDR look, no stock-photo vibe, no people's faces.

**Společný negative prompt (základ, doplň specifika u assetu):**

> `people faces, smiling models, posed people, oversaturated colors, HDR look, blown highlights, blue/purple/teal color cast, neon, stock-photo vibe, watermark, text, logos, clutter, plastic CGI render look, fisheye distortion, harsh flash, midday flat light, cheerful bright tourist-brochure mood`

> Stávající fotky `tiny1.jpg`, `tiny2.jpg`, `tiny3.jpg` (1448×1086) definují referenční look — nové snímky musí sednout do stejné série. Dokud grafika nedorazí, web používá tyto tři fotky; nové soubory stačí nahrát do `public/foto/` na uvedené cesty a doplnit do galerie.

---

## Přehled assetů

| # | Asset | Soubor | Rozměry |
|---|-------|--------|---------|
| 1 | interier-postel | `public/foto/interier-postel.jpg` | 1448×1086 px (4:3), JPG, sRGB |
| 2 | interier-kuchynka | `public/foto/interier-kuchynka.jpg` | 1448×1086 px (4:3), JPG, sRGB |
| 3 | sauna-exterier | `public/foto/sauna-exterier.jpg` | 1448×1086 px (4:3), JPG, sRGB |
| 4 | koupaci-sud | `public/foto/koupaci-sud.jpg` | 1448×1086 px (4:3), JPG, sRGB |
| 5 | lom-leto | `public/foto/lom-leto.jpg` | 1448×1086 px (4:3), JPG, sRGB |
| 6 | lom-zima | `public/foto/lom-zima.jpg` | 1448×1086 px (4:3), JPG, sRGB |
| 7 | mlha-rano | `public/foto/mlha-rano.jpg` | 1448×1086 px (4:3), JPG, sRGB |
| 8 | zima-snih | `public/foto/zima-snih.jpg` | 1448×1086 px (4:3), JPG, sRGB |
| 9 | snidanovy-kos | `public/foto/snidanovy-kos.jpg` | 1448×1086 px (4:3), JPG, sRGB |
| 10 | ohniste-vecer | `public/foto/ohniste-vecer.jpg` | 1448×1086 px (4:3), JPG, sRGB |

Všechny soubory: **1448×1086 px, poměr 4:3 na šířku, JPG (sRGB, kvalita ~85 %), bez průhlednosti** — shodné s existující sérií. Generuj větší (např. 2896×2172) a zmenšuj pro ostrost. Žádný text ani logo v obraze.

---

### 1. interier-postel — ložnice s panoramatickým oknem na lom

**K čemu a kam (CZ):** Hlavní interiérový záběr pro detail domku Žula („z postele vidíte vodu") a galerii. Postel s povlečením z přírodního lnu, za panoramatickým oknem hladina zatopeného lomu s ranní mlhou. Snímek prodává klíčový moment značky: probudit se a koukat na vodu, aniž vstanete.

**ENGLISH — ready-to-paste generation prompt:**

> Editorial interior photograph inside a minimalist black-timber tiny house at dawn. A low double bed with rumpled natural linen bedding in warm off-white (#f3efe5) and a wool throw in muted sage, facing a huge panoramic floor-to-ceiling window that fills the frame's far wall. Beyond the glass: a flooded granite quarry lake with morning mist rising off dark still water, grey granite walls and pine forest fading into haze. Interior surfaces are dark charred wood and matte black joinery; one small bedside lamp glows soft warm amber (#d9914e) — the only warm light, everything else cool grey-green dawn light. A book and a ceramic cup on the windowsill. Shot from the foot of the bed on an 85mm-equivalent lens at f/2.0, shallow depth of field, the linen texture crisp in foreground, the misty lake softly readable through the glass. Photo-real editorial photography, not a render. Muted desaturated palette: deep charcoal blacks, cold pine greens and grey granite, with a single warm amber light source (#d9914e) as the only warm accent in frame. Fine analog film grain, soft natural contrast, gentle vignette. Calm Scandinavian-noir mood, quiet fairy-tale stillness. No oversaturation, no HDR look, no stock-photo vibe, no people's faces.

**Negative prompt / avoid:** společný negative + `bright white scandi-blog interior, fairy lights, candles everywhere, cluttered styling props, visible TV or electronics, curtains blocking the view, sunny blue sky outside, hotel-room look, wide-angle distortion of the bed`

**Cílový soubor:** `public/foto/interier-postel.jpg` · 1448×1086 px, JPG

---

### 2. interier-kuchynka — kuchyňský kout

**K čemu a kam (CZ):** Druhý interiérový záběr pro detaily domků a galerii — plně vybavená kuchyňka z tmavého dřeva, espresso kávovar, keramika, okno do lesa. Komunikuje „malé, ale promyšlené" a podporuje FAQ odpověď o vaření.

**ENGLISH — ready-to-paste generation prompt:**

> Editorial interior detail photograph of a compact kitchenette in a black-timber tiny house. Dark charred-wood cabinetry with matte black fittings, an open oak shelf with handmade ceramic mugs and plates in muted earth tones, a small manual espresso maker mid-brew with faint steam, a cutting board with rustic sourdough bread and a linen towel. A small window over the counter looks into a dim pine forest, cool green light filtering in; one warm amber pendant bulb (#d9914e) hangs low over the counter as the single warm light source, casting a soft pool of light on the wood. Shot on an 85mm-equivalent lens at f/2.2, shallow depth of field focused on the coffee maker and ceramics, background falling into soft darkness. Quiet, tactile, lived-in but immaculate. Photo-real editorial photography, not a render. Muted desaturated palette: deep charcoal blacks, cold pine greens and grey granite, with a single warm amber light source (#d9914e) as the only warm accent in frame. Fine analog film grain, soft natural contrast, gentle vignette. Calm Scandinavian-noir mood, quiet fairy-tale stillness. No oversaturation, no HDR look, no stock-photo vibe, no people's faces.

**Negative prompt / avoid:** společný negative + `white IKEA kitchen, stainless-steel appliance wall, visible brand logos on appliances, fruit-bowl stock styling, fluorescent lighting, cramped fisheye view, microwave, modern gloss surfaces`

**Cílový soubor:** `public/foto/interier-kuchynka.jpg` · 1448×1086 px, JPG

---

### 3. sauna-exterier — černá sauna na hraně skály

**K čemu a kam (CZ):** Signature zážitek domku Žula — finská sauna s oknem na hladinu lomu. Použije se na detailu Žuly a v zážitcích. Černý saunový domek na žulové hraně, z komínku stoupá pára/kouř, okno žhne ember světlem. Bez lidí.

**ENGLISH — ready-to-paste generation prompt:**

> Editorial exterior photograph of a small black charred-timber sauna cabin perched on the granite edge above a flooded quarry lake at blue-hour dusk. The sauna's single square window glows deep warm amber (#d9914e) — the only warm light in a cold blue-grey-green scene. A thin ribbon of steam and woodsmoke rises from a matte black chimney into still air. Below, dark mirror-calm water reflects the glowing window; rough granite blocks and low pines frame the composition, faint mist hugging the waterline. No people anywhere. Wide landscape framing on a 35mm-equivalent lens, sauna positioned on the right third, the dark lake and reflection occupying the left, deep atmospheric perspective. Long-exposure stillness on the water surface. Photo-real editorial photography, not a render. Muted desaturated palette: deep charcoal blacks, cold pine greens and grey granite, with a single warm amber light source (#d9914e) as the only warm accent in frame. Fine analog film grain, soft natural contrast, gentle vignette. Calm Scandinavian-noir mood, quiet fairy-tale stillness. No oversaturation, no HDR look, no stock-photo vibe, no people's faces.

**Negative prompt / avoid:** společný negative + `people in towels, hot-tub party mood, daylight sunny scene, multiple lit windows, string lights, sauna interior benches, orange sky sunset kitsch, visible roads or buildings in background`

**Cílový soubor:** `public/foto/sauna-exterier.jpg` · 1448×1086 px, JPG

---

### 4. koupaci-sud — kouřící koupací sud za soumraku

**K čemu a kam (CZ):** Signature zážitek domku Mech — dřevem vytápěný koupací sud na kraji terasy, voda 38 °C, nad hlavou hvězdy. Detail Mechu + zážitky + ceník doplňků. Pára nad hladinou, lucerna, žádní lidé.

**ENGLISH — ready-to-paste generation prompt:**

> Editorial photograph of a round wooden hot tub (wood-fired soaking barrel) steaming on the edge of a dark timber deck at dusk, beside a black tiny house at the edge of a meadow. Thick soft steam curls off the hot water into cold evening air; a small black stove pipe attached to the tub releases a faint wisp of smoke. One storm lantern with a warm amber flame (#d9914e) sits on the deck boards next to two folded linen towels and a pair of wooden cups — the only warm light. Behind, the meadow falls into blue-green dusk and a dark pine treeline; the first stars are barely visible in a deep indigo-charcoal sky. No people. Shot on an 85mm-equivalent lens at f/2.0, shallow depth of field focused on the steaming rim of the tub and the lantern, treeline melting into soft darkness. Photo-real editorial photography, not a render. Muted desaturated palette: deep charcoal blacks, cold pine greens and grey granite, with a single warm amber light source (#d9914e) as the only warm accent in frame. Fine analog film grain, soft natural contrast, gentle vignette. Calm Scandinavian-noir mood, quiet fairy-tale stillness. No oversaturation, no HDR look, no stock-photo vibe, no people's faces.

**Negative prompt / avoid:** společný negative + `people bathing, wine glasses clinking, rose petals, jacuzzi jets, white plastic spa, bright party lighting, oversized milky-way composite sky, candles floating in water`

**Cílový soubor:** `public/foto/koupaci-sud.jpg` · 1448×1086 px, JPG

---

### 5. lom-leto — molo a křišťálová voda v létě

**K čemu a kam (CZ):** Letní tvář lomu pro sekci zážitků („Zatopený lom — molo jen pro hosty") a galerii. Dřevěné molo, průzračná voda nad žulovým dnem, chladné ráno i v létě. Bez lidí, max. odložený ručník.

**ENGLISH — ready-to-paste generation prompt:**

> Editorial landscape photograph of a small weathered wooden swimming dock jutting into a flooded granite quarry lake on an early summer morning. The water is crystal clear with a deep emerald-grey tone, granite boulders visible through the surface near the shore, darkening to fathomless green-black toward the centre. Sheer grey granite quarry walls rise on the far side, topped with pine forest; thin morning haze softens the far edge. On the dock: a folded linen towel and simple wooden ladder into the water — no people. Low soft morning light from the side, cool and quiet, slight steam ghosting off the water surface. Wide landscape framing on a 35mm-equivalent lens, dock leading from lower-left into the frame, calm symmetry, generous negative space of water and stone. Photo-real editorial photography, not a render. Muted desaturated palette: deep charcoal blacks, cold pine greens and grey granite, with a single warm amber light source (#d9914e) as the only warm accent in frame — here just a whisper of warm sunrise tone on the dock's wooden boards. Fine analog film grain, soft natural contrast, gentle vignette. Calm Scandinavian-noir mood, quiet fairy-tale stillness. No oversaturation, no HDR look, no stock-photo vibe, no people's faces.

**Negative prompt / avoid:** společný negative + `turquoise tropical water, swimmers, inflatables, beach umbrellas, bright blue summer sky, crowds, boats, lifeguard equipment, caribbean color grade, sun flare kitsch`

**Cílový soubor:** `public/foto/lom-leto.jpg` · 1448×1086 px, JPG

---

### 6. lom-zima — otužilecká nálada, hrana ledu

**K čemu a kam (CZ):** Zimní tvář lomu — otužování rovnou ze sauny (recenze Terezy N., zážitky, sezónní obsah). Hrana ledu, černá voda, jíní na žule. Bez lidí, případně jediná vzdálená postava zády, nikdy tvář.

**ENGLISH — ready-to-paste generation prompt:**

> Editorial winter photograph of a flooded granite quarry lake half-frozen at first light. A sharp edge of thin grey ice meets open black water in the middle of the frame; delicate frost crystals trace the granite blocks at the shore, a dusting of dry snow on stone and pine branches. Steam rises gently off the open water — colder air than water, an ice-swimmer's morning. A simple wooden ladder descends from a snow-dusted dock into the black water; a folded dark wool robe and a lantern with a small warm amber flame (#d9914e) wait on the dock as the only warm note in an otherwise cold monochrome scene. No people, or at most one distant swimmer's head far across the water, unrecognisable. Wide landscape framing, 35mm-equivalent lens, restrained and stark, heavy quiet. Photo-real editorial photography, not a render. Muted desaturated palette: deep charcoal blacks, cold pine greens and grey granite, with a single warm amber light source (#d9914e) as the only warm accent in frame. Fine analog film grain, soft natural contrast, gentle vignette. Calm Scandinavian-noir mood, quiet fairy-tale stillness. No oversaturation, no HDR look, no stock-photo vibe, no people's faces.

**Negative prompt / avoid:** společný negative + `close-up of a person, red swimming caps, group of ice swimmers, sunny ski-resort mood, deep blue ice tint, snowstorm, footprints everywhere, christmas props`

**Cílový soubor:** `public/foto/lom-zima.jpg` · 1448×1086 px, JPG

---

### 7. mlha-rano — mlha nad lomem z výšky za rozbřesku

**K čemu a kam (CZ):** Atmosférický „establishing shot" — dronový/vyvýšený pohled na lom utopený v ranní mlze, špičky smrků, někde dole žhne jediné okno domku. Kandidát na hero pozadí, OG obrázek a úvod lokality. Tohle je nálada celé značky.

**ENGLISH — ready-to-paste generation prompt:**

> Atmospheric elevated drone-like photograph of a flooded granite quarry hidden in dense Bohemian-Moravian Highlands forest at sunrise, shot from slightly above the treetops. A thick sea of low morning mist fills the quarry basin and drifts between dark spruce crowns, only the tallest tree tips and a few pale granite ledges piercing through. The water below is barely visible — a hint of dark mirror through the fog. In the lower third, one tiny warm amber window glow (#d9914e) of a black timber cabin burns through the mist, the single warm point in an ocean of cold grey-green. The rising sun is a pale diffused disc low on the horizon, light cool and silvery, not golden. Layers of receding forested hills fade into haze — "beyond seven mountains and seven forests". Wide landscape composition, deep aerial perspective, monumental quiet. Photo-real editorial photography, not a render. Muted desaturated palette: deep charcoal blacks, cold pine greens and grey granite, with a single warm amber light source (#d9914e) as the only warm accent in frame. Fine analog film grain, soft natural contrast, gentle vignette. Calm Scandinavian-noir mood, quiet fairy-tale stillness. No oversaturation, no HDR look, no stock-photo vibe, no people's faces.

**Negative prompt / avoid:** společný negative + `golden-orange sunrise sky, lens flare, top-down map view, roads or power lines, villages, multiple buildings, dramatic storm clouds, fantasy matte-painting look, oversharpened drone HDR`

**Cílový soubor:** `public/foto/mlha-rano.jpg` · 1448×1086 px, JPG

---

### 8. zima-snih — domek pod sněhem s teplým oknem

**K čemu a kam (CZ):** Zimní hero — černý domek v čerstvém sněhu, okno žhne, kouř z komína. Použití: sezónní kampaně (Vánoce, zimní pobyty), galerie, ceník vysoké sezóny. Důkaz, že „domky jsou celoroční".

**ENGLISH — ready-to-paste generation prompt:**

> Editorial photograph of a black charred-timber tiny house in deep fresh snow at winter dusk, surrounded by snow-laden spruce forest. Untouched powder snow rounds every surface — the flat roof carries a thick white slab, the deck rail wears a soft ridge of snow. The large window glows intense warm amber (#d9914e) from inside, throwing a soft rectangle of warm light onto the blue-grey snow; a steady thread of woodsmoke rises from the black chimney into windless dusk air. Sky is a deep slate blue-grey, last light fading; gentle sparse snowflakes drifting. A single pair of footprints leads to the door — no people in frame. Shot on a 50mm-equivalent lens from a low angle across the snowfield, the cabin on the right third, dark forest closing the background. Hushed, safe, fairy-tale warmth inside the cold. Photo-real editorial photography, not a render. Muted desaturated palette: deep charcoal blacks, cold pine greens and grey granite, with a single warm amber light source (#d9914e) as the only warm accent in frame. Fine analog film grain, soft natural contrast, gentle vignette. Calm Scandinavian-noir mood, quiet fairy-tale stillness. No oversaturation, no HDR look, no stock-photo vibe, no people's faces.

**Negative prompt / avoid:** společný negative + `christmas decorations, string lights, santa kitsch, bright daylight ski scene, blizzard whiteout, icicles overload, blue-hour color cast pushed to navy, multiple cabins, snowman`

**Cílový soubor:** `public/foto/zima-snih.jpg` · 1448×1086 px, JPG

---

### 9. snidanovy-kos — snídaňový koš na terase

**K čemu a kam (CZ):** Produktová fotka doplňku „Snídaňový koš" (490 Kč/den) — ceník, rezervační krok s doplňky, FAQ o jídle. Proutěný koš s kváskovým chlebem, vejci od sousedů, sýrem a džemem na prkně terasy, ráno, mlha v pozadí.

**ENGLISH — ready-to-paste generation prompt:**

> Editorial still-life photograph of a rustic breakfast basket standing on the dark timber deck boards of a black tiny house in early morning. A woven willow basket lined with a linen cloth holds a round sourdough loaf with a deep scored crust, a paper-wrapped wedge of farm cheese, a small jar of dark jam, half a dozen brown free-range eggs in a pulp tray, a glass bottle of milk and a bundle of fresh chives. Beside the basket: two stoneware mugs with steaming coffee and a folded wool blanket on a low bench. Background falls away to an out-of-focus misty meadow and treeline in cool green-grey morning haze. The low sun catches the steam and the bread crust with a restrained warm amber tone (#d9914e) — the only warmth in the cool scene. Shot on an 85mm-equivalent lens at f/2.5, shallow depth of field, crisp tactile textures of crust, willow and linen. Photo-real editorial photography, not a render. Muted desaturated palette: deep charcoal blacks, cold pine greens and grey granite, with a single warm amber light source (#d9914e) as the only warm accent in frame. Fine analog film grain, soft natural contrast, gentle vignette. Calm Scandinavian-noir mood, quiet fairy-tale stillness. No oversaturation, no HDR look, no stock-photo vibe, no people's faces.

**Negative prompt / avoid:** společný negative + `hands reaching into frame, croissants and orange juice hotel-buffet look, plastic packaging, branded products, overflowing cornucopia styling, top-down flat-lay, bright white tablecloth, food-blog brightness`

**Cílový soubor:** `public/foto/snidanovy-kos.jpg` · 1448×1086 px, JPG

---

### 10. ohniste-vecer — ohniště, jiskry a dvě křesla

**K čemu a kam (CZ):** Večerní nálada pro sekci zážitků („Oheň") a závěrečné CTA bannery. Kamenné ohniště s živým ohněm a letícími jiskrami, dvě prázdná křesla s dekami, domek s ember oknem v pozadí. Příslib večera, který si host teprve prožije — proto prázdná křesla, žádní lidé.

**ENGLISH — ready-to-paste generation prompt:**

> Editorial night photograph of a stone fire pit burning on packed gravel in front of a black timber tiny house, deep in dark forest. A low granite-ring fire pit holds a lively wood fire; fine orange-amber sparks (#d9914e) rise in a gentle column into the black air, slightly motion-blurred. Two empty wooden lounge chairs with folded wool blankets face the fire, a small log side table with two enamel mugs between them, a neat stack of split firewood nearby. In the soft-focus background the cabin's window glows the same warm amber, echoing the fire; beyond it, the forest dissolves into true black with the faintest hint of stars. All light in the scene comes from the fire and the window — warm amber against deep charcoal and dark pine green. Shot on a 50mm-equivalent lens at f/2.0, focus on the flames and the nearest chair armrest, intimate low angle at sitting height. The promise of an evening not yet begun. Photo-real editorial photography, not a render. Muted desaturated palette: deep charcoal blacks, cold pine greens and grey granite, with a single warm amber light source (#d9914e) as the only warm accent in frame. Fine analog film grain, soft natural contrast, gentle vignette. Calm Scandinavian-noir mood, quiet fairy-tale stillness. No oversaturation, no HDR look, no stock-photo vibe, no people's faces.

**Negative prompt / avoid:** společný negative + `people around the fire, marshmallows on sticks, bonfire party, gas fire bowl, tiki torches, light-painted long-exposure trails, milky-way composite sky, smoke obscuring the scene, daylight`

**Cílový soubor:** `public/foto/ohniste-vecer.jpg` · 1448×1086 px, JPG

---

## Jak nasadit hotové fotky

1. Ulož soubory do `public/foto/` na cesty uvedené výše (1448×1086 px, JPG, sRGB).
2. Doplň fotky do galerie a detailů domků — všude se vkládají přes `next/image` v rámečku `div.photo-frame` se zaoblením `rounded-[28px]`; alt texty piš česky a popisně (vzor v `lib/content.ts` → `photoAlt`).
3. Zkontroluj, že snímek ladí se stávající sérií `tiny1–3.jpg` (stejné zrno, stejně tlumené barvy, jediný teplý zdroj světla). Pokud vybočuje, dolaď grade směrem k referenci, ne naopak.
