<!-- Ověřeno nezávisle: pět daňových rešerší + tři oponentury, každá s vyhledáváním
     v platném znění předpisů. Tenhle dokument má PŘEDNOST před SYSTEM.md kapitolou 5
     všude, kde se rozcházejí. Než se pojede naostro, musí to vidět účetní. -->

# Závazná pravidla pro implementaci fakturačního modulu — sedmyles.cz

Platnost: stav práva k srpnu 2026. Dokument má přednost před `SYSTEM.md` kap. 5 všude, kde se rozcházejí. Změny právních citací v `SYSTEM.md` jsou uvedeny v sekci „Kritické opravy".

Legenda jistoty u sporných bodů: **[OVĚŘENO]** = ověřeno proti platnému textu předpisu · **[VÝKLAD]** = plyne z judikatury nebo metodiky, ne z textu zákona · **[NEJISTÉ]** = výklad se rozchází, implementuj bezpečnou variantu a dej na seznam pro účetní.

---

## 1. Shrnutí pro programátora — pět vět

1. **Provozovatel dnes není plátce DPH**, takže na žádném dokladu nesmí být sazba, částka daně ani slovo „daňový" — a to je jediný stav, který se v produkci nejbližší dva roky reálně vyskytne; celý sazbový aparát je příprava, ne dnešek.
2. **Celá DPH vrstva je tříhodnotový režim** (`NEPLATCE` / `IDENTIFIKOVANA_OSOBA` / `PLATCE`), ne boolean, a režim i sazba se **zapisují na doklad jako snapshot** — po přepnutí se historické doklady nikdy nepřepočítávají a nepřekreslují.
3. **Peníze jsou celá čísla v haléřích**, daň se počítá jedinou funkcí shora (`dan = uplata − round(uplata / 1.12)`, § 37 písm. b), nikdy floatem a nikdy dvojím zaokrouhlením.
4. **Vydaný doklad je immutable**: číslo se přiděluje až při vystavení v jedné transakci, oprava je vždy nový doklad, `DELETE` nad `invoices` neexistuje ani jako endpoint, ani jako oprávnění DB role.
5. **Tři druhy peněz nejsou tržba a nesmí se sečíst do základu daně ani do hlídače obratu**: poplatek z pobytu (průběžná položka), kauce (jistota) a stornopoplatek/náhrada škody (mimo předmět daně) — každý má vlastní typ řádku a vlastní šablonu dokladu.

---

## 2. Sazby DPH a rozúčtování

Platí **jen v režimu `PLATCE`**. V režimech `NEPLATCE` a `IDENTIFIKOVANA_OSOBA` je `vat_rate` na všech řádcích povinně `NULL` (identifikovaná osoba fakturuje svá tuzemská plnění bez daně; § 42/§ 45 se na její výstupy nepoužijí).

Sazby k 1. 1. 2026: základní **21 %**, snížená **12 %** (§ 47 odst. 1 ZDPH). Třetí sazba neexistuje; **sazba 0 % v ČR neexistuje** a nesmí se nikde objevit. Sazby se k 1. 1. 2026 nemění [OVĚŘENO].

| `price_items.code` | Položka | Sazba | CZ-CPA / KN | `line_kind` | Zdůvodnění a jistota |
|---|---|---|---|---|---|
| `NIGHT` | Noc v domku (Achát/Mech) | **12 %** | CZ-CPA 55.20 (podmnožina kódu 55) | `TAXABLE` | Příloha č. 2 ZDPH, kód 55 „Ubytovací služby" [OVĚŘENO] |
| `ADDON_LATE_CHECKOUT_SERVICE` | Pozdní odjezd sjednaný předem jako placené prodloužení | **12 %** | 55.20 | `TAXABLE` | Není vedlejší plnění, je to **totéž hlavní plnění** — prodloužení ubytovací služby [VÝKLAD] |
| `LATE_CHECKOUT_PENALTY` | Sankce za neuvolnění domku | **mimo předmět** | — | `NON_TAX` | Není úplata za plnění (§ 2 ZDPH); doklad bez daně, ne faktura, ale výzva k úhradě [VÝKLAD] |
| `ADDON_DOG` | Poplatek za psa | **12 %** | 55.20 | `TAXABLE` | Příplatek k téže ubytovací službě, ne samostatné plnění. GFŘ to výslovně neřeší [VÝKLAD, otázka č. 3] |
| `ADDON_SAUNA` | Sauna jako placený doplněk | **12 %** | CZ-CPA 96.04 | `TAXABLE` | Příloha č. 2, slovní popis „služby tureckých lázní, saun, parních lázní a solných jeskyní" [OVĚŘENO] |
| `ADDON_HOTTUB` | Koupací sud jako placený doplněk | **21 %** (dočasně) | 96.04 **sporné** | `TAXABLE` | Kód i **slovní popis** musí být splněny současně; koupací sud v popisu není. Default `VAT_RATE_TBD = 21` [NEJISTÉ, otázka č. 2] |
| `ADDON_BREAKFAST` | Snídaňový koš jako placený doplněk | **rozpad**: potraviny 12 %, nápoje 21 % | KN 01–05, 07–23, 25 mimo nápojů | `TAXABLE` (více řádků) | GFŘ: samostatně dokoupená snídaně = rozdělení základu daně. Bez rozpadu → celý koš 21 % (§ 36 odst. 9) [OVĚŘENO] |
| `ADDON_WINE` | Lahev vína jako placený doplněk | **21 %** | — (mimo přílohu č. 2 i č. 3) | `TAXABLE` | Alkohol není „vybraný nápoj" (ten je definován jako **nealkoholický**) [OVĚŘENO] |
| `ADDON_FIREWOOD` | Dřevo na ohniště jako placený doplněk | **21 %** | KN 4401 | `TAXABLE` | Palivové dřevo přeřazeno do základní sazby k 1. 1. 2024 [OVĚŘENO] |
| `ADDON_CLEANING_ORDERED` | Mimořádný úklid **objednaný hostem, vyúčtovaný samostatně** | **21 %** | CZ-CPA 81 — v příloze č. 2 **není** | `TAXABLE` | Úklidové služby ve snížené sazbě nejsou [OVĚŘENO] |
| `DAMAGE_CLEANING` | Úklid jako náprava porušení ubytovacího řádu | **mimo předmět** | — | `NON_TAX` | Náhrada škody, ne služba; jen v pořizovací ceně, bez marže [VÝKLAD] |
| `CITY_TAX` | Poplatek z pobytu | **mimo základ daně** | — | `PASS_THROUGH` | § 36 **odst. 14** ZDPH (nikoli odst. 13 — ten je o vratných obalech) [OVĚŘENO] |
| `SECURITY_DEPOSIT` | Vratná kauce | **na dokladu vůbec nesmí být** | — | zakázáno v `invoice_lines` | Jistota, ne úplata (§ 4 odst. 1 písm. a) ZDPH) |
| `CANCELLATION_FEE` | Stornopoplatek / propadlá záloha | **mimo předmět** | — | `NON_TAX` | Paušalizovaná náhrada škody [VÝKLAD, viz kap. 6] |
| `DISCOUNT` | Sleva 7+ nocí | sazba **shodná s položkou, ke které patří** | 55.20 | `DISCOUNT` | Sleva se váže výhradně k ubytování, nikdy k doplňkům — jinak se rozbije rekapitulace po sazbách |
| `ROUNDING` | Zaokrouhlení | **bez sazby** | — | `ROUNDING` | Do základu daně se nezahrnuje (§ 36 odst. 5) [OVĚŘENO, ale viz níže] |

### 2.1 Pravidla, která z tabulky plynou a musí být v kódu

- **Doktrína vedlejšího plnění není v zákoně.** Plyne z judikatury SDEU (C-349/96 CPP, C-41/04 Levob, C-572/07) a GFŘ ji přejímá. **Rozsudek sporu:** oponentura má pravdu — `§ 36 odst. 3 písm. b)` je o vedlejších **výdajích** (balné, přeprava, pojištění) zahrnovaných do základu daně, **není** to opora pro sdílení sazby. V komentářích kódu i v dokumentaci citovat § 36 odst. 9 + judikaturu SDEU, nikdy § 36 odst. 3 písm. b).
- **Nikdy neexistuje pravidlo „doplněk k ubytování = 12 %".** Sazba je atributem položky v `price_items`, verzovaná `valid_from` / `valid_to`, nikdy odvozená z kontextu.
- **Položka zahrnutá v ceně pobytu se negeneruje vůbec.** Dřevo, snídaně nebo sud „zdarma v ceně" nesmí být nulový řádek — nulový řádek s uvedenou sazbou kazí rekapitulaci. Nedostane se na doklad.
- **Uvítací víno „v ceně" není daňová optimalizace.** [Rozsudek sporu: oponentura má pravdu proti ověření.] Analogie se snídaní neobstojí — GFŘ ji formuluje výslovně jen pro snídani a alkohol je vyloučen dvakrát (příloha č. 2 u kódu 56 i příloha č. 3). Víno buď účtovat samostatně za 21 %, nebo počítat s tím, že správce daně bude vyžadovat rozdělení základu daně podle obvyklé ceny lahve. **Do produktu: žádné „víno v ceně".**
- **Balíčky (ubytování + doplňky za jednu cenu) jsou zakázané, dokud modul neumí rozpad.** § 36 odst. 9: u celkové ceny s různými sazbami je plátce **povinen** rozdělit základ daně; „pokud takovéto rozdělení není možné, byla by u celého zdanitelného plnění uplatněna základní sazba 21 %". Pokud balíček někdy vznikne, ukládá se k němu pevný poměr rozpadu podle běžných samostatných cen a doklad se generuje z komponent.
- **Výpočet daně u koncových cen: § 37 písm. b), ne písm. a).** `SYSTEM.md:883` cituje písm. a) — to je výpočet zdola ze základu, který u koncových cen neznáme. Jediná povolená funkce:
  ```ts
  // per řádek, vše v haléřích, integer aritmetika
  const dan    = uplata - Math.round(uplata / (1 + rate));  // rate = 0.12 | 0.21
  const zaklad = uplata - dan;
  ```
  Zakázáno: `zaklad = round(uplata/1.12)` a pak `dan = round(zaklad*0.12)` — u některých částek se liší o haléř a doklad nesedí na součet. Rekapitulace po sazbách vzniká **součtem řádkových základů a daní**, nikdy novým výpočtem ze součtu.
- **Zaokrouhlování: u bezhotovostních plateb nezaokrouhlovat vůbec.** Fakturuje se na haléře. § 36 odst. 5 sice zaokrouhlovací rozdíl ze základu daně vylučuje bez podmínky hotovosti [OVĚŘENO proti platnému textu], ale některé komentáře k novele č. 461/2024 Sb. podmínku hotovosti znovu uvádějí. Nezaokrouhlováním spor odpadá. Zaokrouhlení zapnout jen pro hotovostní inkaso na místě, řádkem `ROUNDING` bez sazby.
- **Sleva se nesmí stát samostatným řádkem bez sazby.** Buď se rozpustí do jednotkových cen položek ubytování, nebo je to `DISCOUNT` řádek nesoucí **tutéž sazbu** jako položky, kterých se týká.

---

## 3. Režim neplátce DPH

Tohle je produkční režim. Musí být otestovaný jako první, ne jako varianta.

### 3.1 Co na dokladu být MUSÍ

Náležitosti obchodní listiny podle **§ 435 odst. 1 zák. č. 89/2012 Sb.** — a nic víc z tohoto ustanovení neplyne:

- jméno podnikatele (u s.r.o. obchodní firma),
- sídlo,
- **údaj o zápisu**: OSVČ „Zapsán v živnostenském rejstříku vedeném [příslušný živnostenský úřad]."; s.r.o. „Zapsána v obchodním rejstříku vedeném Krajským soudem v Ústí nad Labem, oddíl C, vložka …",
- IČO.

Tyto čtyři údaje validovat jako `NOT NULL` + non-empty; bez nich se doklad nevystaví. **§ 435 platí i na web** („informace zpřístupňované veřejnosti prostřednictvím dálkového přístupu") — patičku webu opravit stejně.

Číslo dokladu, datum vystavení, splatnost, popis plnění a jednotkovou cenu vyžaduje **daňová evidence (§ 7b odst. 1 ZDP)** a důkazní břemeno (§ 92 daňového řádu), ne § 435.

**Doklad na žádost spotřebitele** (§ 16 odst. 1 zák. č. 634/1992 Sb.) musí modul umět vygenerovat kdykoliv, včetně platby v hotovosti na místě. Minimální set: datum poskytnutí služby, popis služby, cena, jméno a IČO prodávajícího. DIČ ani DPH tam nepatří.

### 3.2 Co na dokladu být NESMÍ

- **Žádné pole `vat_rate` ani `vat_amount`** — ani s hodnotou `0`, ani prázdné. Šablona nesmí mít sloupec „DPH" vůbec.
- **Žádné „0 % DPH", „sazba 0 %", „osvobozeno"** — sazba 0 % v ČR neexistuje, je to klamavý údaj na obchodní listině (§ 435 odst. 2 NOZ).
- **Žádné vyčíslení daně.** Kdo na dokladu uvede daň, je povinen ji přiznat a zaplatit, i když plátcem není — **§ 108 odst. 4 písm. g) ZDPH**. Tohle je jediný zákaz z této skupiny, který má přímý finanční následek.
- **Žádné DIČ** (neplátce ho zpravidla nemá; má-li ho jako identifikovaná osoba, na výstupní doklad pro spotřebitele nepatří).
- **Žádné označení „Daňový doklad", „Opravný daňový doklad", „Daňový doklad k přijaté platbě".** [Rozsudek sporu: ověření tvrdí, že je to zakázáno; oponentura správně namítá, že výslovný zákaz neexistuje. Rozhodnutí: **zakázat v kódu**, protože doklad neplátce nikdy nesplní § 29 odst. 1 písm. b), k), l) ZDPH, daňovým dokladem podle § 26 odst. 1 tedy není a takové označení je nepravdivý údaj. Zákaz nic nestojí, opačná varianta stojí spor.]

### 3.3 Co je doporučení, ne validace

**Věta „Nejsem plátce DPH."** není zákonná povinnost [Rozsudek sporu: oponentura má pravdu, `SYSTEM.md:882` ji označuje za povinnou]. Je to legitimní další údaj podle § 435 odst. 2 NOZ a chrání odběratele-plátce před pokusem o odpočet. Implementace: `company_settings.footer_note` s defaultem, editovatelné, **nikdy blokující validace**.

**Název „Faktura"** rovněž není povinný. `company_settings.doc_title` s defaultem „Faktura".

**§ 11 zák. č. 563/1991 Sb. o účetnictví se na tohoto provozovatele nevztahuje** [Rozsudek sporu: blok „dph-sazby" ho uvádí jako platný rámec, blok „doklady-rady" ho správně odmítá — platí druhý]. Fyzická osoba podnikatel je účetní jednotkou až při obratu nad 25 000 000 Kč za předchozí kalendářní rok (§ 1 odst. 2 písm. e) ZoÚ) nebo zápisem do OR. Rámec je § 435 NOZ + § 7b ZDP + § 16 ZOS. Nepsat do dokumentace ani do komentářů „náležitosti účetního dokladu dle § 11 ZoÚ".

### 3.4 Třetí režim: identifikovaná osoba (§ 6h ZDPH) — priorita

`company_settings.vat_payer boolean` je **nedostatečný datový model** a musí být nahrazen:

```sql
vat_mode text NOT NULL DEFAULT 'NEPLATCE'
  CHECK (vat_mode IN ('NEPLATCE','IDENTIFIKOVANA_OSOBA','PLATCE')),
vat_mode_from date
```

Podle § 6h se osoba povinná k dani se sídlem v tuzemsku, která není plátcem, stává **identifikovanou osobou ode dne přijetí služby** s místem plnění v tuzemsku od osoby neusazené v tuzemsku. **Tenhle projekt takové služby přijímá téměř jistě už dnes**: Vercel, Neon, Cloudflare R2, Resend, Anthropic, případně Google Ads / Meta / Booking.com / Airbnb. Každá jedna z těchto faktur registraci spouští.

Důsledky pro modul: **výstupní doklady zůstávají beze změny bez DPH** (stejná šablona jako neplátce), ale přibývá evidence přijatých přeshraničních služeb a povinnost odvést českou daň 21 % z přijaté služby bez nároku na odpočet. Fakturační modul tuhle evidenci nemusí umět, ale **nesmí předstírat, že režim neexistuje** — enum musí být tříhodnotový od první migrace, protože dodatečná změna mění vzhled historických dokladů.

### 3.5 Přepnutí režimu

Režim i sazba se ukládají **na doklad** (`invoices.vat_mode`, `invoice_lines.vat_rate`) jako snapshot. Přepnutí `company_settings.vat_mode` **nikdy** nepřepočítá ani nepřekreslí historický doklad. PDF se generuje jednou a ukládá; nikdy se nerenderuje on-the-fly z aktuální šablony.

### 3.6 Hlídač obratu

**Rozsudek sporu:** oba oponenti mají pravdu proti bloku „storno-kauce" i proti `SYSTEM.md:884`. Klouzavé dvanáctiměsíční okno se od 1. 1. 2025 **nepoužívá**.

- Období: **1. 1. – 31. 12. kalendářního roku** (§ 6 odst. 1 ZDPH, Informace GFŘ č. j. 11977/25).
- Práh 1: **2 000 000 Kč** → plátcem od 1. ledna následujícího roku; volba dřívějšího plátcovství v přihlášce (§ 6 odst. 2 písm. a).
- Práh 2: **2 536 500 Kč** → plátcem dnem následujícím po překročení, bez volby (§ 6 odst. 2 písm. b). Od toho dne musí faktury nést DPH.
- Přihláška v obou případech do **10 pracovních dnů** (potřebuje kalendář státních svátků, ne `+14 days`).
- Do obratu **nevstupují**: poplatek z pobytu, kauce, stornopoplatky, náhrady škody. Obratem je souhrn úplat za **uskutečněná plnění** (§ 4a odst. 1).
- Alerty na 80 % a 95 % obou prahů zůstávají.

---

## 4. Typy dokladů a číselné řady

| Řada | `doc_type` | Kdy vzniká | Režim | Daňový? |
|---|---|---|---|---|
| `ZAL-2026-NNNN` | `PROFORMA` | při přechodu do `hold`, výzva k úhradě zálohy s QR | všechny | **ne**, nikdy. Povinný text „Nejde o daňový doklad." Nezaúčtovává se. Nezaplacená se jen `CANCELLED`, bez dobropisu |
| `DZP-2026-NNNN` | `ADVANCE_TAX` | **jen `PLATCE` A odběratel je osoba povinná k dani nebo PO nepovinná k dani** | `PLATCE` | ano |
| `FAK-2026-NNNN` | `FINAL` | **nejdříve v den odjezdu** | všechny | v režimu `PLATCE` ano; jinak „Faktura" |
| `OPD-2026-NNNN` | `CORRECTIVE` | oprava — viz kap. 5 | `PLATCE` = „Opravný daňový doklad"; jinak „Opravný doklad (storno)" | podle režimu |
| `NDD-2026-NNNN` | `NON_TAX` | stornopoplatek, náhrada škody, sankce za pozdní odjezd | všechny | **ne**, nikdy. Bez sazby, bez daně, mimo předmět |
| `POU-2026-NNNN` | `VOUCHER` | vydání poukazu (v2) | všechny | viz kap. 6 |

### 4.1 Pravidla řad

- **U B2C hosta se DZP negeneruje.** § 28 odst. 1 písm. a) ukládá vystavit daňový doklad jen při plnění osobě povinné k dani nebo právnické osobě nepovinné k dani; písm. d) váže povinnost u přijaté úplaty výhradně na plnění podle písm. a) nebo b). Spotřebitel není ani jedním [OVĚŘENO]. `SYSTEM.md:867` cituje „§ 28/1/b" — to je prodej na dálku, správně je **písm. d)**.
  Datový model proto potřebuje na rezervaci `customer_kind ∈ ('CONSUMER','TAXABLE_PERSON','LEGAL_ENTITY_NON_TAXABLE')`, plněný volitelným polem IČO/DIČ ve wizardu. Podle něj se rozhoduje, jestli DZP vůbec vzniká.
- **Lhůta pro vystavení daňového dokladu je 15 dnů podle § 28 odst. 8**, ne odst. 5 (`SYSTEM.md:888` a komentáře v kódu opravit — odst. 5 upravuje nucený prodej obchodního majetku). Lhůta běží **ode dne, kdy vznikla povinnost přiznat daň**, tj. od data připsání platby, ne od data rezervace ani pobytu. § 28 odst. 11 navíc vyžaduje vynaložit rozumné úsilí, aby se doklad dostal do dispozice příjemce — **generování nestačí, musí se odeslat** a čas odeslání se loguje jako důkaz.
- **Konečná faktura se nikdy nevystaví předem.** § 21 odst. 3: u služby je DUZP den poskytnutí **nebo den vystavení daňového dokladu, podle toho, co nastane dříve**. Vystavením předem si plátce přitáhne DUZP dopředu a rozbije zařazení do zdaňovacího období. Hard validace: `FINAL.tax_point_date >= reservations.checkout`.
- **Číslo se přiděluje až při `DRAFT → ISSUED`**, atomicky přes `SELECT ... FROM invoice_series WHERE code=$1 AND year=$2 FOR UPDATE`. Nikdy `SEQUENCE` (díry po rollbacku), nikdy `SELECT MAX+1` (duplicita při paralelních rezervacích).
- **Nepřerušenost řady není zákonná povinnost** [OVĚŘENO — § 29 odst. 1 písm. e) žádá jen „evidenční číslo"], ale mezera je typický spouštěč otázky správce daně. Proto: koncept číslo nedostane, storno se řeší stornodokladem, řádek se nemaže.
- **Jedinečnost evidenčního čísla platí napříč všemi řadami**, ne jen v rámci řady: `invoices.number text UNIQUE` (globálně) — v `SYSTEM.md` už je správně, nezměkčovat na `UNIQUE (series_code, year, number)`.
- **Variabilní symbol** je platební, ne daňový údaj. Přenesení VS z původního dokladu na opravný je v pořádku.

### 4.2 Zálohy u neplátce

**Neplátci nevzniká při přijetí zálohy povinnost cokoliv vystavit** [OVĚŘENO a contrario z § 28; § 435 NOZ řeší obsah, ne povinnost; § 16 ZOS váže povinnost na žádost spotřebitele a na doklad o poskytnutí služby]. Doporučený model:

1. **`ZAL`** — výzva k úhradě zálohy, nedaňový dokument, bez jakékoliv zmínky o DPH.
2. Po skončení pobytu jedna **`FAK`** na celou cenu se zúčtováním zálohy a nulovým doplatkem.
3. Na vyžádání doklad podle § 16 odst. 1 ZOS.

**Kritické pro daň z příjmů:** daňová evidence stojí na hotovostním principu (§ 7b odst. 1 písm. a) ZDP). Záloha zaplacená v prosinci 2026 za pobyt v únoru 2027 se daní **za rok 2026**. Proto `payments.paid_at` (datum připsání, u brány datum platby, **ne** datum payoutu) musí být samostatné, nepřepisovatelné pole oddělené od `issue_date` i od data pobytu, a roční report pro přiznání se agreguje **podle `paid_at`**.

### 4.3 Elektronická podoba

§ 26 odst. 3 ZDPH vyžaduje souhlas příjemce s elektronickým daňovým dokladem, formu ale nestanoví a GFŘ akceptuje konkludentní souhlas. U B2C se ustanovení prakticky neuplatní, protože doklad pro spotřebitele daňovým dokladem není. Implementace: **žádný blokující checkbox**; v rezervačním formuláři věta „Doklad vám zašleme elektronicky na tento e-mail.", uložit timestamp + IP + znění textu do audit logu. Pro odběratele s vyplněným IČO explicitní checkbox. Vždy nabídnout listinnou variantu.

### 4.4 EET

Neřeší se — zákon č. 112/2016 Sb. byl zrušen zák. č. 458/2022 Sb. s účinností **1. 1. 2023**, ne 2024 (`SYSTEM.md:916` opravit). Žádné FIK/BKP/PKP. **Nezanikla ale povinnost vydat doklad na žádost spotřebitele** podle § 16 odst. 1 ZOS — viz 3.1.

### 4.5 Archivace

- Retence **10 let od konce roku vystavení** pro všechny doklady. § 35 odst. 2 ZDPH na neplátce nedopadá (§ 35 odst. 1 míří na osobu povinnou k dani ve vztahu k daňovým dokladům), pro tohoto provozovatele platí § 7b odst. 5 ZDP ve vazbě na lhůtu pro stanovení daně (3 roky, § 148 odst. 1 DŘ, s prodloužením a stropem 10 let podle § 148 odst. 5). **Jednotná desetiletka je bezpečná a jednodušší než podmíněná logika** — ponechat.
- PDF/A do object storage s versioningem, **nikdy negenerovat historický doklad on-the-fly** — po refaktoru šablony by se vykreslil jinak.
- Úložiště v EU. Pokud by se doklady uchovávaly mimo tuzemsko v režimu plátce, § 35 odst. 4 vyžaduje předchozí oznámení správci daně; doložit nepřetržitý dálkový přístup (§ 35 odst. 3).
- Zákonná archivace je právní titul podle čl. 6 odst. 1 písm. c) GDPR a **má přednost před mazacím jobem**.

---

## 5. Opravné doklady

### 5.1 Tři různé právní režimy, ne jeden nástroj

`SYSTEM.md:888` slučuje čtyři scénáře do jednoho nástroje. To je chyba, která systematicky zařadí opravy do špatného zdaňovacího období. Potřebný diskriminátor:

```sql
correction_type text CHECK (correction_type IN (
  'ZAKLAD_DANE_42',   -- storno, sleva, reklamace, změna/vrácení zálohy
  'VYSE_DANE_43',     -- přiznána VYŠŠÍ daň, než stanoví zákon → právo, dodatečné přiznání
  'VYSE_DANE_141DR',  -- přiznána NIŽŠÍ daň → povinnost podat dodatečné přiznání
  'IDENTIFIKACNI'     -- překlep ve jméně/adrese → nová verze dokladu, žádná daňová oprava
))
```

- **§ 42** (základ daně) = samostatné zdanitelné plnění vykázané v **běžném** přiznání.
- **§ 43** (nadhodnocená daň) = **dodatečné** přiznání za původní období; oprava lze provést nejdříve ke dni, kdy příjemce **obdržel** opravný doklad — ale jen je-li příjemcem plátce nebo identifikovaná osoba; u spotřebitele se podle § 43 odst. 2 písm. b) provede oprava v evidenci [Rozsudek sporu: oponentura zpřesnila ověření, přijímám].
- **Podhodnocená daň** (12 % tam, kde patřilo 21 % — víno, dřevo, samostatný úklid) pod § 43 **nespadá vůbec**: je to povinné dodatečné přiznání podle § 141 daňového řádu, OPD je jen možnost (§ 45 odst. 5 „lze vystavit").
- **Oprava identifikačního údaje** se § 45 vůbec netýká: nová verze dokladu se stejným číslem + audit log. Doklad, který dosud nebyl odeslán protistraně, lze legitimně zrušit a vystavit znovu.

### 5.2 Náležitosti opravného daňového dokladu — úplný výčet

`SYSTEM.md:888` uvádí čtyři; § 45 odst. 1 jich má jedenáct, a). až k) [OVĚŘENO oběma oponenturami]:

a) označení dodavatele · b) jeho DIČ · c) označení odběratele · d) jeho DIČ · e) **evidenční číslo původního dokladu** · f) **evidenční číslo opravného dokladu** · g) **důvod opravy** · h) rozdíl základu daně · i) rozdíl daně · j) **rozdíl celkové částky** · k) **den podle § 42 odst. 3**.

Nejčastěji chybí **j) a k)**. Do `invoices` proto:

```sql
correction_event_date date,   -- § 42 odst. 3, náležitost § 45 odst. 1 písm. k)
total_diff_cents      bigint, -- § 45 odst. 1 písm. j)
correction_reason     text    -- § 45 odst. 1 písm. g), NOT NULL pro CORRECTIVE
```

Na doklad se tisknou **rozdílové (záporné) částky**, ne nové absolutní. Opravený základ daně u úplného storna je nula, ale na dokladu je záporný rozdíl [Rozsudek sporu: věta bloku „storno-kauce" „nikdy neopravovat jen rozdíl" je zavádějící a odporuje vlastnímu nálezu téže analýzy — platí rozdílové částky].

Výjimky: § 45 odst. 2 (původní byl zjednodušený doklad a příjemce není dostatečně známý → nemusí obsahovat c), d), h), i)) a § 45 odst. 4 (hromadný OPD k více plněním).

### 5.3 Dvě různá časová razítka, ne jedno

`SYSTEM.md:490` má `delivery_attempted_at timestamptz, -- § 42 odst. 3`. **Komentář je věcně chybný a název pole zavádějící.** Rozdělit:

```sql
correction_event_date date,          -- § 42 odst. 3: den rozhodné skutečnosti (den storna)
effort_made_at        timestamptz,   -- § 42 odst. 5 a 6: okamžik ODESLÁNÍ dokladu
delivery_message_id   text,          -- důkaz úsilí: Resend/SMTP message-id
delivery_bounced_at   timestamptz
```

- **§ 42 odst. 5**: OPD vystavit a vynaložit rozumné úsilí k jeho dodání do **15 dnů** ode dne podle odst. 3.
- **§ 42 odst. 6 věta druhá**: u **snížení** základu daně se oprava uvede v přiznání za období, ve kterém bylo úsilí vynaloženo — tedy podle `effort_made_at`, ne podle pokusu o doručení.
- **Doručení není podmínkou** od 1. 4. 2019; prokazuje se úsilí, ne převzetí. Nedoručitelný e-mail opravu nezastaví.
- **Rozsudek sporu:** citace SDEU C-588/10 Kraft Foods Polska v odůvodnění **vypustit** — rozsudek říká v podstatě opak (v zásadě nebrání podmínce potvrzení příjemce). Argumentace stojí výhradně na § 42 odst. 5 a 6.
- **Rozsudek sporu:** hrozba pokutou 500 000 Kč patří k **§ 247a odst. 1** daňového řádu, ne odst. 2 (ten je fixní pokuta 1 000 Kč za neodstranění vady podání) [OVĚŘENO]. Do UI ale žádnou hrozbu pokutou nepsat — reálný následek je jiný a přísnější: **plátce nemůže snížení daně uplatnit, dokud neodeslal**.

### 5.4 Default pro tenhle provoz: oprava jen v evidenci

**Rozsudek sporu mezi bloky „dobropisy" a „storno-kauce": platí „storno-kauce".** U B2C hosta plátce nemá povinnost vystavit daňový doklad, a proto se podle **§ 42 odst. 4 písm. b) bodu 1** provede oprava **pouze v evidenci pro účely DPH**: nevystavuje se OPD, neuplatní se náležitosti § 45 odst. 1, neběží 15denní lhůta a neuplatní se věta druhá § 42 odst. 6.

Pozor na detail: pokud plátce neměl povinnost OPD vystavit, považuje se oprava za uskutečněnou **posledním dnem zdaňovacího období, ve kterém byla zapsána do evidence** [NEJISTÉ ohledně přesného písmene odstavce 3 — ověřit v ASPI, otázka č. 7]. Praktický důsledek pro kód: **zápis do evidence provést ve stejném zdaňovacím období, ve kterém nastala rozhodná skutečnost.**

Implementace: `effort_made_at`, validace § 45 odst. 1 a 15denní hlídač jsou **zapnuté jen ve větvi B2B** (`customer_kind <> 'CONSUMER'`).

### 5.5 Pořadí vůči refundaci

`SYSTEM.md:890` má „železné pravidlo: dobropis až po úspěšné refundaci". **Jako globální invariant je to chyba** a v kombinaci s `refunds.invoice_id` vyplňovaným až po úspěchu (`SYSTEM.md:408`) vede k tomu, že se **při 100% stornu bez vratky opravný doklad nikdy nevystaví** — přitom scénář kap. 5.5 vratku vůbec nemá.

Správná větev podle důvodu:

| Situace | Rozhodný den | Pořadí |
|---|---|---|
| Vrácení zálohy (částečné i úplné) | den vrácení peněz [VÝKLAD, otázka č. 6] | refundace → oprava. Zde pravidlo `SYSTEM.md` obstojí |
| 100% stornopoplatek, žádná vratka | den zrušení rezervace | oprava se provede **bez refundace**, nečekat na nic |
| Sleva/reklamace po pobytu | den uznání reklamace | oprava první, peníze potom |
| Oprava chyby v dokladu | den zjištění | oprava nezávisle na penězích |

V kódu: `refunds.invoice_id` se plní podle větve, ne vždy až po `status='settled'`. Zákaz globálního invariantu typu `OPD ⇒ refund.status='settled'`.

### 5.6 Lhůty pro opravu

Validace vystavení opravy musí lhůtu kontrolovat a po jejím marném uplynutí **UI nesmí nabízet tlačítko**:

- **Oprava k přijaté záloze, kde se plnění neuskutečnilo: 3 roky** od konce zdaňovacího období, ve kterém byla úplata přijata (§ 42 odst. 8, druhá část). **Pro tenhle provoz je to ta rozhodující lhůta** — drtivá většina oprav jsou storna záloh.
- Oprava k uskutečněnému pobytu: konec **7. kalendářního roku** po roce vzniku povinnosti přiznat daň (§ 42 odst. 8, první část; novela č. 461/2024 Sb.). Zapnout jen tam, kde je doložené DUZP pobytu od 1. 1. 2025.
- Oprava výše daně dle § 43: **3 roky** (§ 43 odst. 4).

Bezpečný default: **3 roky**, sedmiletá větev jen s doloženým DUZP.

### 5.7 Neplátce a identifikovaná osoba

§ 42 a § 45 dopadají **jen na plátce**. Identifikovaná osoba je v § 42 zmíněna pouze v souvislosti s pořízením zboží z JČS a dovozem; její tuzemská plnění jsou bez DPH, takže u výstupů žádná oprava základu daně nevzniká [Rozsudek sporu: oponentura zpřesnila blok „dobropisy", přijímám]. **Nikdy nepsat podmínku `if (vat_payer || identified)`.**

V režimu `NEPLATCE` a `IDENTIFIKOVANA_OSOBA`: nadpis „Opravný doklad (storno)", žádné DPH řádky, žádný odkaz na § 45, žádné pole „den dle § 42 odst. 3". Jedna sdílená šablona s podmínkami, ne dvě řady.

### 5.8 Vazba opravného dokladu

- V režimu `PLATCE` a u B2B míří vazba na **DZP** (řada `DZP`), ne na proformu — proforma není doklad a nezakládá daňovou povinnost (`SYSTEM.md` to má správně).
- V současném režimu (DZP se nevystavuje) se opravný doklad váže na **FAK**, případně na potvrzení o přijaté platbě. Vazební sloupec musí připustit obojí a validace nesmí DZP vyžadovat, dokud `vat_mode <> 'PLATCE'`.

---

## 6. Storno, propadlá záloha, voucher

### 6.1 Výchozí kvalifikace stornopoplatku

Propadlá záloha jako **paušalizovaná náhrada škody mimo předmět daně** (§ 2 odst. 1 ZDPH), opřená o SDEU C-277/05 Société thermale a NSS 3 Afs 76/2014-35, který jeho test přejal.

**Rozsudek sporu mezi ověřením a oponenturou:** blok „storno-kauce" tvrdí, že C-622/23 rhtb: projekt (28. 11. 2024) závěr C-277/05 „mění"; oponentura namítá, že C-622/23 vzešel ze smlouvy o dílo s nárokem na cenu sníženou o úsporu, nikoli z propadlé zálohy, a že C-250/14 Air France-KLM Société thermale výslovně **odlišil**. **Platí oponentura.** C-277/05 nebyl překonán a zůstává vedoucím rozhodnutím. Ale riziko překvalifikace **roste s výší a automatičností poplatku**, a to je věc produktu, ne kódu.

Dopady, které musí být v kódu i ve VOP:

- Stornopoplatek je **`NON_TAX` doklad**, nikdy `FINAL`. Nevykazuje se v přiznání na žádném řádku (ani ř. 50 osvobozená plnění), nevstupuje do kontrolního hlášení ani do obratu podle § 4a.
- Z hlediska daně z příjmů je to **normální zdanitelný příjem podle § 7 ZDP** — dvě různé sumy nad stejnou tabulkou, obě musí jít vyexportovat.
- Textace na dokladu musí test naplnit: *„Paušalizovaná náhrada škody podle čl. X.Y VOP a § 2330 odst. 2 občanského zákoníku. Nejde o úplatu za plnění, částka nepodléhá DPH."* Samotné „storno poplatek" je při kontrole slabé.
- **Sestupná škála s poměrným snížením při náhradním obsazení termínu** je zároveň jediná konstrukce, která obstojí podle **§ 2330 odst. 2 OZ** (ubytovatel má právo na náhradu škody, jen prokáže-li, že jí nemohl zabránit) a současně nejlépe naplňuje test ze Société thermale. Současný sazebník `SYSTEM.md:894` (30+ dní 100 %, 14–29 dní 50 %, <14 dní 0 %) je **obrácený** oproti obvyklé praxi a při doslovném čtení znamená nejvyšší poplatek u nejvzdálenějšího storna — to je ekonomicky nesmyslné a jako nepřiměřená sankce napadnutelné podle § 1813 a § 1814 odst. 1 písm. l) OZ. **Před implementací ověřit u zadavatele, zda není v dokumentu překlep, a sladit s `content/obchodni-podminky.md`.**
- Storno podmínky musí být **symetrické** — při zrušení ze strany ubytovatele kompenzace hosta (§ 1814 odst. 1 písm. c) OZ).
- Odstoupení do 14 dnů se u ubytování k určitému termínu neuplatní (§ 1837 písm. j) OZ) — to je pro provozovatele příznivé a patří do VOP.

### 6.2 No-show

`SYSTEM.md:841`: „záloha propadá jako náhrada škody". **Nejrizikovější položka celého modulu** — domek byl blokovaný a připravený, což je přesně skutkový stav z C-250/14.

**Rozhodnutí (bezpečná varianta):** v režimu `NEPLATCE` je otázka bezpředmětná — daň se na doklad uvést nesmí (§ 108 odst. 4 písm. g), takže no-show je `NON_TAX` doklad a hotovo. Doporučení „účtovat no-show rovnou jako ubytovací službu s 12 %" **nepřijímat**: u neplátce je zakázané a i u plátce si vyčíslením daně sám vyrobíte důkaz, že šlo o cenu za plnění, čímž podkopete nárok podle § 2330 odst. 2 OZ. Datový model ale musí `NO_SHOW` odlišit od `STORNO` samostatnou hodnotou, aby šel režim po přechodu na plátcovství přepnout konfigurací (otázka č. 4).

### 6.3 Voucher

Tři různé akce, ne dvě. `SYSTEM.md:896` požaduje dvě tlačítka — musí být tři:

| Akce | Doklady | Daňový režim |
|---|---|---|
| **Změna termínu téže rezervace** | žádný doklad | Není poukaz vůbec, jen změna smlouvy. Záloha běží dál |
| **Voucher na jiný pobyt** | doklad se neopravuje | **Jednoúčelový poukaz** — § 15 odst. 2 je definice, režim je v **§ 15a** (`SYSTEM.md:896` cituje § 15, opravit) |
| **Storno s vrácením** | opravný doklad + `NON_TAX` na poplatek | viz 6.1 a kap. 5 |

Podmínky, bez kterých se „DZP se neopravuje" rozpadne:

- Poukaz je jednoúčelový, jen jsou-li v okamžiku vydání známy **sazba i místo plnění** (§ 15 odst. 2). U voucheru směnitelného **výhradně za ubytování v Achátu/Mechu** je obojí známo: místo plnění dle § 10 (služba vztahující se k nemovité věci), sazba 12 %.
- **`vouchers.kind` musí být omezen na `'stay'`.** Hodnota `'amount'` v `SYSTEM.md:542` (kredit na cokoliv) je **víceúčelový poukaz** podle § 15 odst. 3 — u něj se převod nepovažuje za plnění (§ 15b odst. 1), zdanitelné plnění nastává až čerpáním (§ 15b odst. 2), a původní doklad k záloze se opravit **musí**. Jedna hodnota enumu tedy obrací celou logiku. V v1 hodnotu `'amount'` do enumu vůbec nedávat.
- Text voucheru: „Poukaz na ubytovací službu v objektu Sedmý les, Jílové u Držkova." Žádné „kredit v hodnotě X Kč".
- **Voucher se vydává přesně na zaplacenou částku.** Bonus navíc („dáme vám 3 500 místo 3 000") je změna výše úplaty a spustí opravu podle § 42 odst. 1 písm. c).
- **Propadlý nevyčerpaný voucher negeneruje žádný doklad** — jen se uzavře stav. Daň zůstává odvedená (GFŘ: nečerpání poukazu nemá vliv na daňovou povinnost emitenta).
- Spotřebitelské riziko: krátká nebo neprodloužitelná platnost je napadnutelná podle § 1813 / § 1814 odst. 1 písm. l) OZ. **Default platnost 18–24 měsíců s možností jednoho prodloužení**; `valid_until` nesmí být kratší než 12 měsíců bez ručního odůvodnění.

### 6.4 Oprava při propadlé záloze — paragrafové odkazy

Staré `§ 42 odst. 1 písm. e)` po novele č. 461/2024 Sb. **neexistuje**; odstavec 1 má tři písmena a použije se **písm. c)** („změna výše přijaté úplaty"). Sazba a kurz se použijí **ke dni přijetí úplaty** (§ 42 odst. 7 písm. b) — past při změně sazby mezi zálohou a pobytem, proto se ke každé záloze ukládá sazba platná v okamžiku přijetí.

**Nejslabší místo celé analýzy, řekněme to nahlas:** u **nevrácené** propadlé zálohy k faktickému vrácení úplaty nedochází, a Souhrnná informace GFŘ mluví u záloh o opravě „z titulu vrácení přijaté úplaty". Výklad, že i propadnutí je „změna výše přijaté úplaty" podle písm. c), je běžný, ale autoritativní potvrzení k němu nemám (otázka č. 5).

### 6.5 Refundace

- Kartová platba se vrací **výhradně refundační operací přes bránu proti původní transakci**, nikdy převodem na účet, ani na výslovnou žádost hosta.
- Platba převodem se vrací na účet odesílatele z výpisu.
- **Zdůvodnění v dokumentaci je pravidla karetních asociací** (Visa Core Rules „same instrument", Mastercard Rules) a prevence podvodu — **nikoli AML**. Provozovatel dvou domků není povinnou osobou podle § 2 zák. č. 253/2008 Sb.; povinnou osobou by se stal až u obchodu v hotovosti od 10 000 EUR. Argumentovat AML je nesprávné a poškozuje důvěryhodnost zbytku dokumentace.
- Modul u každé platby drží `payment_method` a `provider_tx_id` a **odmítne refundaci jinou cestou**, než jakou platba přišla.

---

## 7. Kauce a náhrada škody

### 7.1 Kauce

Rozhodnutí `SYSTEM.md:900` — kauce se ve v1 nevybírá v penězích, jen smluvně (`CONTRACTUAL_ONLY`) — je z provozního hlediska správné a nechává se. Datový model `deposits` s režimy `CONTRACTUAL_ONLY / COLLECTED / CARD_PREAUTH` zůstává.

- **Právní kvalifikace: § 1746 odst. 2 OZ (nepojmenované ujednání), NIKOLIV § 2012 OZ.** `SYSTEM.md:902` cituje § 2012, který upravuje jistotu **zřízením zástavního práva, resp. způsobilým ručitelem** — peněžní kauce u ubytování pod něj nespadá [OVĚŘENO oběma oponenturami]. Nepoužitelný je i § 2254 OZ (jistota u nájmu bytu) — smlouva o ubytování je jiný smluvní typ (§ 2326 a násl. OZ). **Chybná citace ve VOP je při sporu s ČOI přitěžující**, protože vypadá jako záměrné budování falešné autority.
- Kauce **není úplata** (§ 4 odst. 1 písm. a) — chybí přímá souvislost s plněním), nevstupuje do základu daně (§ 36 odst. 1 a 2), do obratu (§ 4a) a v daňové evidenci to není příjem, ale přijatý závazek.
- **Preautorizace karty je nejlepší technické řešení** — blokace bez stržení se nikdy nestane příjmem.

### 7.2 Zúčtování kauce — kritický okamžik

Rozhodnutí o DPH padá při **čerpání**, ne při přijetí. Proto číselník důvodů čerpání musí být uzavřený a každá jeho položka nese příznak `je_plneni boolean`:

| Důvod čerpání | Je plnění? | Doklad |
|---|---|---|
| Náhrada škody na vybavení | **ne** | `NON_TAX` |
| Náprava porušení ubytovacího řádu (kouření, ozonizace, odvoz odpadu) | **ne** | `NON_TAX` |
| Nezaplacený doplatek / spotřeba | **ano** | `FINAL` s DPH |
| Mimořádný úklid **objednaný hostem** | **ano** | `FINAL` s DPH |

`SYSTEM.md:906` a `:727` mají „mimořádný úklid = plnění s DPH" natvrdo. **To neplatí plošně** — rozhoduje, kdo si ho vyžádal a co se jím napravuje. Číselník proto rozdělit na `UKLID_OBJEDNANY` (plnění) a `NAPRAVA_PORUSENI_RADU` (náhrada škody). Jedna položka pro obojí je vadná bez ohledu na přiřazenou sazbu.

Pozor i na **sazbu** u objednaného úklidu vyúčtovaného samostatně po odjezdu: úklidové služby CZ-CPA 81 v příloze č. 2 nejsou → **21 %**. Snížených 12 % lze dosáhnout jen tehdy, je-li úklid fakturován spolu s pobytem jako součást ubytovací služby.

### 7.3 Náhrada škody

Není zdanitelné plnění — ubytovatel opravou vlastní věci hostovi žádnou službu neposkytuje, chybí identifikovatelný spotřebitel plnění a přímá souvislost. Hranice se posune, **jakmile hostovi za ty peníze něco předáte** (rozbitou věc si odveze) — pak je to dodání zboží za úplatu.

Doložení je celý spor. Modul musí u každého čerpání **povinně vyžadovat**:

- fotodokumentaci PŘED/PO s časovými razítky,
- předávací protokol podepsaný hostem, nebo záznam o odmítnutí,
- doklad o skutečném nákladu (faktura za opravu, nákup náhrady).

**Kalkulovat v pořizovací ceně bez marže.** Jakákoli přirážka nebo paušál typu „poškození = 2 000 Kč" vypadá jako sjednaná cena za plnění a je nejsnadnějším terčem překvalifikace. Sazebník paušálních pokut za poškození do VOP nedávat.

Vazba na `damage_decisions` s `decided_by NOT NULL` a ručním odůvodněním min. 20 znaků (`SYSTEM.md:1128`) zůstává — je to zároveň důkaz pro daňovou kvalifikaci a pro čl. 22 GDPR.

---

## 8. Poplatek z pobytu a evidenční povinnosti

### 8.1 Výpočet

**`SYSTEM.md:910` „per osoba × noc" je nesprávný vzorec.** § 3c: *„Základem poplatku z pobytu je počet započatých dnů pobytu, s výjimkou dne počátku pobytu."* U běžného pobytu to číselně vychází stejně, ale hraniční případy se liší.

```
zaklad = max(0, pocet_zapocatych_dnu(prijezd .. odjezd) - 1)
```

- Pobyt začínající a končící týž den → **základ 0**.
- Pobyt trvající **více než 60 po sobě jdoucích kalendářních dnů** u téhož poskytovatele → **mimo předmět poplatku celý** (§ 3a odst. 1), ne jen část nad 60 dnů.
- Sazba: **nejvýše 50 Kč** (§ 3d). Nikdy nehardcodovat 50 — je to strop, ne sazba. Konfigurace `sazba_kc`, `platnost_od`, `platnost_do`, validace rozsahu 0–50 Kč.

### 8.2 Tři stavy hosta, ne dva

`SYSTEM.md:309` má `exemption_reason CHECK (... 'UNDER_18','HOSPITALIZED','DISABILITY','SEASONAL_WORK')`. To je **neúplné a strukturálně chybné**. Potřeba:

```sql
city_tax_status text NOT NULL CHECK (city_tax_status IN
  ('POPLATNIK',        -- poplatek se počítá
   'OSVOBOZEN',        -- § 3b, do evidenční knihy se zapisuje DŮVOD
   'NENI_POPLATNIK',   -- § 3: osoba přihlášená v obci — není osvobození!
   'MIMO_PREDMET'))    -- § 3a odst. 2 (omezení osobní svobody), pobyt > 60 dnů
```

- **Poplatníkem je osoba, která v obci není přihlášená** (§ 3). Host s trvalým pobytem v Jílovém u Držkova není poplatník **vůbec** — není to osvobození a nesmí se mu zapsat důvod osvobození. Tenhle třetí stav v `SYSTEM.md` chybí úplně.
- Enum osvobození musí kopírovat **§ 3b odst. 1 písm. a) až f)** (u písm. f) včetně bodů 1–4: ústavní/ochranná výchova, preventivně výchovná péče, zařízení pro děti vyžadující okamžitou pomoc, sociální služby) a **§ 3b odst. 2** (příslušník bezpečnostního sboru, voják v činné službě, státní zaměstnanec) [OVĚŘENO — struktura v bloku „poplatek-kniha" byla popsána chybně, § 3b odst. 3 je pouhá definice sezónní práce a žádné osvobození neobsahuje].
- Prakticky relevantní jsou zde hlavně **osoby mladší 18 let** a **ZTP/P + průvodce**. Ale enum se drží ve verzované konfiguraci s `platnost_od`/`platnost_do`, ne jako konstanta — § 3b byl naposledy měněn s účinností **1. 1. 2025** (zák. č. 363/2021 Sb. s odloženou účinností), takže tvrzení „od 2021 se nic nezměnilo" neplatí.
- Poplatek se počítá **per osoba z `guest_registrations`**, nikdy paušálem z rezervace — to `SYSTEM.md` má správně a zůstává.

### 8.3 Poplatek na dokladu

- Samostatný řádek `line_kind='PASS_THROUGH'`, **mimo základ daně a mimo rekapitulaci DPH**, právní opora **§ 36 odst. 14 ZDPH** (`SYSTEM.md:910` cituje odst. 13 — ten upravuje **vratné obaly**) [OVĚŘENO].
- **Podmínka, bez které vyloučení neobstojí:** výchozím pravidlem je § 36 odst. 3 písm. a) — jiné daně a poplatky do základu daně **patří**. Výjimka platí jen tehdy, je-li částka skutečně vybírána jménem a na účet jiné osoby a **oddělena od ceny plnění**. Pokud web a ceník inzerují jednu koncovou cenu „včetně všech poplatků", poplatek do základu daně vstupuje.
  **Důsledek pro produkt:** ceník, VOP i rezervační wizard musí uvádět cenu ubytování **bez poplatku** a k ní větu *„K ceně se účtuje místní poplatek z pobytu ve výši X Kč za osobu a započatý den kromě dne příjezdu."* To je v přímém rozporu s dnešním tvrzením „uvedené ceny jsou konečné" na webu — rozpor je nutné vyřešit dřív, než se poplatek zapne.
- V účetnictví / daňové evidenci **nesmí projít jako příjem** — nafoukl by obrat pro limit DPH i základ pro paušální výdaje.
- Snapshot sazby do `reservations.city_tax_rate_snapshot_cents` při potvrzení zůstává správný.

### 8.4 OZV obce Jílové u Držkova

Bez obecně závazné vyhlášky se poplatek nevybírá vůbec — zákon sám poplatkovou povinnost nezakládá (§ 14 odst. 1).

**Stav ověření:** jedna z oponentur uvádí konkrétní údaje — OZV č. 1/2021, sazba **20 Kč**, ohlašovací povinnost plátce do 15 dnů, odvod **pololetně** do 15 dnů od skončení pololetí, žádná osvobození nad rámec zákona, kontakt Jílové u Držkova 87, 468 22, IČ 00525529, info@jiloveudrzkova.cz. **Tyto údaje se mi nepodařilo nezávisle potvrdit z primárního zdroje** (portál sbírky ani web obce mi text vyhlášky nevydaly). Kód obce 563617, uvedený v ověření, také nepovažuji za potvrzený.

**Rozhodnutí:** `city_tax_cents` zůstává **0** a poplatek se neúčtuje, dokud v repozitáři neleží PDF vyhlášky s číslem, datem a sazbou (`company_settings.city_tax_ozv_ref`). Modul se ale **staví na hodnoty 20 Kč / pololetní odvod**, protože ty jsou nejpravděpodobnější — perioda hlášení musí být konfigurovatelná, ne „čtvrtletní" natvrdo, jak uvádí `SYSTEM.md:38` a `:1012`.

Kromě odvodu má plátce **ohlašovací povinnost vůči správci poplatku** podle § 14a (jméno, kontaktní údaje, čísla podnikatelských účtů, údaje rozhodné pro stanovení poplatku), změny do 15 dnů.

**Sankce za nevybraný nebo neodvedený poplatek není úrok z prodlení ani penále** — ty se podle § 11c odst. 6 neuplatní. Uplatní se **zvýšení poplatku až na dvojnásobek** dlužné částky (§ 11c odst. 1). Pokud modul počítá úrok z prodlení, počítá špatnou veličinu. Institut „předepsání k přímé úhradě" ze zákona zmizel k 1. 1. 2021; dnes je plátce přímo poplatkovým subjektem (§ 11b odst. 1 písm. b).

### 8.5 Dvě různé knihy

Nelze je sloučit do jedné tabulky bez rozlišení.

| | Evidenční kniha | Domovní kniha |
|---|---|---|
| Předpis | **§ 3g** zák. č. 565/1990 Sb. | **§ 101** zák. č. 326/1999 Sb. |
| Koho se týká | **všichni** hosté | **jen cizinci** |
| Rozsah | den počátku a konce pobytu, jméno a příjmení, adresa místa přihlášení, datum narození, číslo a druh průkazu totožnosti, **výše vybraného poplatku NEBO důvod osvobození** | údaje z přihlašovacího tiskopisu (§ 97): + státní občanství, číslo cestovního dokladu a víza, účel pobytu, adresa v zahraničí + doba ubytování |
| Členění | **za každé zařízení nebo místo** — Achát a Mech pravděpodobně dvě knihy (otázka č. 10) | za ubytovatele |
| Retence | **6 let od posledního zápisu** | **6 let od posledního zápisu** |
| Vlastnosti zápisů | správné, úplné, průkazné, přehledné, srozumitelné, **trvalé**, časově uspořádané → **append-only s auditní stopou** | v aktuálním čase, přehledně a srozumitelně |

`SYSTEM.md:38` a `:1228` mluví jen o „knize hostů" — to je nedostatečné.

**Chybné citace k opravě:** ohlašovací povinnost vůči policii je v **§ 102**, ne § 101. § 100 nemá odstavce — je to jediná věta s písmeny a) až f); správně `§ 100 písm. c)` (oznámit ubytování cizince), `písm. f)` (vést domovní knihu a předložit ji ke kontrole), `písm. e)` (na požádání vydat potvrzení o ubytování). Odkaz „§ 100 odst. 1" neexistuje.

### 8.6 Hlášení cizinců

- **Lhůta: 3 pracovní dny** po ubytování (§ 102 odst. 1). Lhůta 24 hodin, která koluje v článcích o eTuristovi, je obsahem **nepřijatého návrhu** a v roce 2026 neplatí. Notifikaci nastavit na 3 pracovní dny.
- Kanál: **UBYPORT**. Podnikající ubytovatel oznamuje dálkovým přístupem, **je-li takový přístup zřízen a funkční** — podmínka míří na stranu policie, ne na technické vybavení ubytovatele. Volba mezi UBYPORTem a papírem tedy **není na provozovateli**; listinný tiskopis je fallback při nefunkčnosti.
- Sankce: přestupek podle § 156 odst. 2 (fyzická osoba jako ubytovatel), resp. § 157 odst. 4 (podnikající FO/PO), pokuta **do 50 000 Kč**.
- **`SYSTEM.md:38` a `:1225` počítají s „eTurista/UBYPORT dávky" ve v2 — eTurista se neimplementuje.** K srpnu 2026 systém není v ostrém ani povinném provozu a nemá zákonnou oporu; sněmovní tisk 761 (9. období) spadl s koncem volebního období, nová verze novely zák. č. 159/1999 Sb. nebyla předložena, MMR avizuje spuštění nejdříve 2027 bez data. Registrační čísla, povinná registrace objektů a pokuta 100 000 Kč jsou obsahem **návrhu**. `report_batches.target` může hodnotu `'ETURISTA'` v enumu mít, ale **nesmí vzniknout žádná integrace ani povinné pole „registrační číslo"**.

### 8.7 Číslo dokladu totožnosti

- Právní základ **čl. 6 odst. 1 písm. c) GDPR** (právní povinnost), nikdy souhlas — ten by byl zdánlivý a odvolatelný. Do záznamů o činnostech zpracování zapsat účel „vedení evidenční knihy dle § 3g zák. č. 565/1990 Sb.".
- **Ukládat lze jen číslo, nikdy kopii, sken ani fotografii dokladu.** Pořizovat kopii OP bez souhlasu držitele zakazuje § 39 písm. c) zák. č. 269/2021 Sb., přestupek dle § 65 odst. 1 písm. d). Do uploadu fotky dokladu neinvestovat; pokud by ho web nabízel, je to potenciální přestupek.
- **§ 39 písm. d) téhož zákona** zakazuje **zpracovávat údaje uvedené v OP bez souhlasu držitele**, s jedinou výjimkou nahlédnutí při ověření totožnosti, které předpis vyžaduje nebo umožňuje. Zápis do evidenční knihy tedy obstojí **výhradně** jako plnění povinnosti podle § 3g. **Jakékoli další využití téhož čísla — párování rezervací, CRM, rozpoznání opakovaného hosta, marketing — je zakázané.** Šifrovaný sloupec `doc_number_enc` proto **nesmí mít vyhledávací index** a nesmí se objevit v žádném exportu mimo evidenční knihu.
- **Český host nemá zákonnou povinnost průkaz předložit** (na rozdíl od cizince, § 103 písm. b) zák. č. 326/1999 Sb.). Modul, který check-in tvrdě blokuje bez čísla OP, k tomu nemá oporu — povinnost musí být zakotvená v ubytovacím řádu / VOP jako **smluvní** povinnost.
- Nevedení evidenční knihy není administrativní drobnost: poplatek se spravuje podle daňového řádu a hrozí pokuta až **500 000 Kč podle § 247a odst. 1** DŘ. Kniha patří do MVP, včetně exportu do PDF/CSV pro kontrolu.

---

## 9. Co NESMÍ systém udělat

Nejdůležitější kapitola. Každý bod je buď DB constraint, trigger, nebo blokující validace — **ne konvence v code review**.

### 9.1 Struktura, na které constrainty stojí

```sql
-- Režim DPH je snapshot na dokladu a denormalizovaně i na řádku,
-- aby šla sazbová matice vynutit CHECKem bez triggeru.
ALTER TABLE invoices
  ADD COLUMN vat_mode text NOT NULL DEFAULT 'NEPLATCE'
    CHECK (vat_mode IN ('NEPLATCE','IDENTIFIKOVANA_OSOBA','PLATCE')),
  ADD COLUMN customer_kind text NOT NULL DEFAULT 'CONSUMER'
    CHECK (customer_kind IN ('CONSUMER','TAXABLE_PERSON','LEGAL_ENTITY_NON_TAXABLE')),
  ADD CONSTRAINT invoices_id_mode_uk UNIQUE (id, vat_mode);

ALTER TABLE invoice_lines
  ADD COLUMN vat_mode text NOT NULL,
  ADD CONSTRAINT lines_mode_fk FOREIGN KEY (invoice_id, vat_mode)
      REFERENCES invoices(id, vat_mode);
```

### 9.2 Zákazy kolem DPH

```sql
-- Z1. Neplátce a identifikovaná osoba nikdy nemají na dokladu daň. (§ 108/4/g)
ALTER TABLE invoices ADD CONSTRAINT z1_no_vat_unless_payer CHECK (
  vat_mode = 'PLATCE' OR (total_vat_cents = 0 AND vat_applicable = false));

-- Z2. Sazba existuje jen u plátce, jen na TAXABLE řádku a jen 12 nebo 21.
--     Sazba 0 % neexistuje. NULL != 0.
ALTER TABLE invoice_lines ADD CONSTRAINT z2_vat_rate_matrix CHECK (
  CASE
    WHEN vat_mode <> 'PLATCE'   THEN vat_rate IS NULL
    WHEN line_kind = 'TAXABLE'  THEN vat_rate IN (12, 21)
    ELSE vat_rate IS NULL
  END);

-- Z3. Poplatek z pobytu nikdy nenese sazbu ani daň. (§ 36 odst. 14)
ALTER TABLE invoice_lines ADD CONSTRAINT z3_pass_through_no_vat CHECK (
  line_kind <> 'PASS_THROUGH' OR (vat_rate IS NULL AND vat_cents = 0));

-- Z4. Kauce se na doklad nedostane VŮBEC — ne "s nulovou sazbou".
ALTER TABLE invoice_lines ADD CONSTRAINT z4_no_deposit_lines CHECK (
  line_kind <> 'SECURITY_DEPOSIT');

-- Z5. NON_TAX doklad (storno, škoda, sankce) nesmí obsahovat zdanitelný řádek.
ALTER TABLE invoices ADD CONSTRAINT z5_nontax_zero_vat CHECK (
  doc_type <> 'NON_TAX' OR total_vat_cents = 0);
-- + trigger: NOT EXISTS (SELECT 1 FROM invoice_lines
--            WHERE invoice_id = NEW.id AND line_kind = 'TAXABLE')

-- Z6. Rekapitulace DPH nesmí obsahovat řádek se sazbou 0.
ALTER TABLE invoice_vat_summary ADD CONSTRAINT z6_no_zero_rate CHECK (
  vat_rate IN (12, 21));

-- Z7. DZP jen v režimu plátce a jen pro osobu povinnou k dani / PO nepovinnou k dani.
ALTER TABLE invoices ADD CONSTRAINT z7_dzp_scope CHECK (
  doc_type <> 'ADVANCE_TAX'
  OR (vat_mode = 'PLATCE' AND customer_kind <> 'CONSUMER'));
```

Navíc **na úrovni šablony**: v režimu jiném než `PLATCE` renderer nesmí mít sloupec „DPH", řetězec „daňový doklad", „sazba", „0 %" ani pole DIČ. Vynutit **snapshot testem PDF** (golden file), ne code review.

### 9.3 Zákazy kolem neměnnosti dokladů

```sql
-- Z8. Číslo dostane doklad výhradně při vystavení.
ALTER TABLE invoices ADD CONSTRAINT z8_number_iff_issued CHECK (
  (status = 'DRAFT') = (number IS NULL));

-- Z9. Vydaný doklad je immutable: trigger BEFORE UPDATE zamítne změnu
--     čehokoliv kromě whitelistu (status, sent_at, effort_made_at,
--     pdf_blob_id, isdoc_blob_id, delivery_message_id), je-li OLD.status <> 'DRAFT'.
-- Z10. DELETE nad invoices, invoice_lines, invoice_vat_summary, document_blobs
--      neexistuje: trigger BEFORE DELETE RAISE EXCEPTION
--      + REVOKE DELETE ON ... FROM app_role.
```

- **Nikdy `UPDATE` částek na vystaveném dokladu.** Storno se řeší stornodokladem, oprava opravným dokladem, překlep novou verzí se stejným číslem a audit logem.
- **Nikdy `SEQUENCE` ani `SELECT MAX(number)+1`** pro číslo dokladu.
- **Nikdy negenerovat historický doklad on-the-fly** z aktuální šablony — vždy uložené PDF z `document_blobs`.
- **Nikdy nepřepočítat historický doklad po změně `company_settings`.**

### 9.4 Zákazy kolem oprav

```sql
-- Z11. Opravný doklad bez povinných náležitostí nesmí být vystaven.
ALTER TABLE invoices ADD CONSTRAINT z11_corrective_required CHECK (
  doc_type <> 'CORRECTIVE' OR status = 'DRAFT' OR (
    correction_reason IS NOT NULL AND length(btrim(correction_reason)) >= 10
    AND correction_type IS NOT NULL
    AND (vat_mode <> 'PLATCE' OR (correction_event_date IS NOT NULL
                                  AND total_diff_cents IS NOT NULL))));

-- Z12. Opravný doklad musí mít vazbu na původní doklad.
--      Trigger: EXISTS (SELECT 1 FROM invoice_relations
--                       WHERE child_invoice_id = NEW.id AND relation_type = 'CORRECTS')

-- Z13. Opravný doklad nese ROZDÍLY, ne nové absolutní částky.
ALTER TABLE invoices ADD CONSTRAINT z13_corrective_is_diff CHECK (
  doc_type <> 'CORRECTIVE' OR total_with_vat_cents <> 0);
```

- **Zákaz globálního invariantu „OPD jen když `refunds.status='settled'`."** Blokuje 100% storno bez vratky. Vazba je per-důvod (kap. 5.5).
- **Zákaz jednoho `correction_type` pro všechny čtyři scénáře.** Bez diskriminátoru export pro účetní systematicky zařadí opravy chyb do špatného období.
- **Zákaz použití `effort_made_at` jako DUZP opravy.** DUZP je `correction_event_date`; `effort_made_at` řídí jen zdaňovací období u snížení u B2B.
- **Zákaz nabídnout „Vystavit opravný doklad" po uplynutí lhůty** — 3 roky od konce zdaňovacího období přijetí zálohy (default), 7 let jen s doloženým DUZP pobytu od 1. 1. 2025.
- **Zákaz blokovat účetní zpracování na „doručeno".** Ukládá se odeslání a bounce, ne potvrzení příjmu.

### 9.5 Zákazy kolem výpočtu

- **Zákaz `float`/`number` pro peníze** kdekoliv mezi vstupem a PDF. Jen `bigint` haléře. Lint pravidlo + typ `Haler = number & {__brand}`.
- **Zákaz dvojího zaokrouhlení** (`round(round(x)*y)`). Jediná exportovaná funkce `splitVat(uplataHaler, rate)`, property test: `zaklad + dan === uplata` pro všech 0–500 000 haléřů obou sazeb.
- **Zákaz zaokrouhlování celkové částky u bezhotovostní platby.**
- **Zákaz počítat rekapitulaci po sazbách jiným způsobem než součtem řádků.**
- **Zákaz vystavit doklad, kde `total_with_vat_cents <> Σ(lines.total_cents) + rounding_cents`** — trigger.
- **Zákaz vystavit `FINAL` s `tax_point_date < reservations.checkout`** (§ 21 odst. 3).

### 9.6 Zákazy kolem obratu, poplatku a evidence

```sql
-- Z14. Sazba poplatku nikdy nad zákonný strop 50 Kč.
ALTER TABLE company_settings ADD CONSTRAINT z14_city_tax_cap CHECK (
  city_tax_cents BETWEEN 0 AND 5000);

-- Z15. Poplatek jen tomu, kdo je poplatník; osvobozený musí mít důvod.
ALTER TABLE guest_registrations
  ADD CONSTRAINT z15_tax_status_consistency CHECK (
    (city_tax_status = 'POPLATNIK'  OR city_tax_cents = 0) AND
    (city_tax_status <> 'OSVOBOZEN' OR exemption_reason IS NOT NULL));

-- Z16. Poplatek se nepočítá u pobytu delšího než 60 dnů (§ 3a odst. 1).
--      Trigger na guest_registrations: (stay_to - stay_from) > 60 → city_tax_cents = 0.
```

- **Zákaz sečíst do hlídače obratu**: `PASS_THROUGH`, `SECURITY_DEPOSIT`, `NON_TAX` doklady (storno, škoda, sankce). Obrat = jen úplaty za uskutečněná plnění (§ 4a odst. 1).
- **Zákaz klouzavého dvanáctiměsíčního okna** v hlídači obratu. Období je pevně 1. 1. – 31. 12.
- **Zákaz účtovat poplatek, dokud `city_tax_ozv_ref IS NULL`.**
- **Zákaz inzerovat cenu „včetně všech poplatků" a zároveň účtovat poplatek jako `PASS_THROUGH`** — vzájemně se vylučují.
- **Zákaz sloučit evidenční a domovní knihu do jedné tabulky bez rozlišení.**
- **Zákaz uložit sken/fotografii dokladu totožnosti.** Žádný sloupec, žádný `attachments.kind = 'ID_SCAN'`, žádný upload endpoint.
- **Zákaz indexovat, vyhledávat a exportovat `doc_number_enc` mimo evidenční knihu** (§ 39 písm. d) zák. č. 269/2021 Sb.).
- **Zákaz mazacího jobu nad `document_blobs`, `invoices`, `guest_registrations` před uplynutím retence** (10 let, resp. 6 let od posledního zápisu). Retenční cron má whitelist tabulek, ne blacklist.
- **Zákaz povinného pole „registrační číslo objektu" a jakékoli integrace eTurista.**

### 9.7 Zákazy kolem plateb a voucherů

- **Zákaz refundace jiným kanálem, než jakým platba přišla.**
- **Zákaz přenést `payments.provider_fee_cents` na fakturu hosta** — přirážka za kartu je spotřebiteli zakázaná (`SYSTEM.md:990` má správně, jen to potvrzujeme jako constraint).
- **Zákaz hodnoty `vouchers.kind = 'amount'` ve v1** — víceúčelový poukaz obrací celou daňovou logiku.
- **Zákaz `vouchers.value_cents <> zaplacená částka`** — jakýkoliv bonus je změna výše úplaty.
- **Zákaz `valid_until < issued_at + 12 měsíců`** bez ručního odůvodnění.
- **Zákaz jednoho tlačítka pro „změna termínu / voucher / storno"** — tři různé daňové režimy, tři akce v UI.
- **Zákaz jedné položky pro „mimořádný úklid"** — musí být `UKLID_OBJEDNANY` a `NAPRAVA_PORUSENI_RADU`.
- **Zákaz paušální částky za poškození** bez doložení skutečného nákladu.

---

## 10. Otevřené otázky pro účetní

1. **Je provozovatel už dnes identifikovanou osobou podle § 6h ZDPH?** Projekt přijímá služby od Vercelu, Neonu, Cloudflare, Resendu a Anthropicu — každá jedna faktura registraci spouští ode dne přijetí služby. Pokud ano, registrace měla být podána a je třeba doplnit evidenci přijatých přeshraničních služeb a odvod 21 % bez nároku na odpočet. **Nejnaléhavější otázka celého seznamu, protože se týká minulosti, ne budoucnosti.**
2. **Koupací sud jako samostatně placený doplněk — 12 % (CZ-CPA 96.04) nebo 21 %?** Slovní popis přílohy č. 2 uvádí jen turecké lázně, sauny, parní lázně a solné jeskyně; kód a popis musí být splněny současně. Do rozhodnutí `VAT_RATE_TBD = 21`. Při významném objemu tržeb zvážit závazné posouzení podle § 47a–47b ZDPH (správní poplatek 10 000 Kč).
3. **Poplatek za psa — příplatek k téže ubytovací službě (12 %), nebo samostatná služba (21 %)?** GFŘ to nikde výslovně neřeší; opora je jen obecný test vedlejšího plnění z judikatury SDEU.
4. **Kvalifikace no-show.** Domek byl blokovaný a připravený — je propadlá záloha náhradou škody (C-277/05), nebo úplatou za plnění (C-250/14, C-622/23)? Prosím o písemné stanovisko, případně dotaz na místně příslušný FÚ nebo příspěvek na KV KDP.
5. **Nevrácená propadlá záloha a § 42 odst. 1 písm. c) po novele č. 461/2024 Sb.** Souhrnná informace GFŘ mluví u záloh o opravě „z titulu vrácení přijaté úplaty"; u zadržené zálohy k vrácení nedochází. Obstojí výklad, že jde o „změnu výše přijaté úplaty"? **Toto je nejslabší místo celé právní analýzy.**
6. **Co je „den, kdy nastaly skutečnosti rozhodné pro opravu" u vrácení zálohy** (§ 42 odst. 3 písm. a) — den storna/odstoupení, nebo den odeslání peněz? Na tom stojí pořadí dobropis vs. refundace i 15denní lhůta.
7. **DUZP opravy provedené jen v evidenci** (B2C, § 42 odst. 4 písm. b) bod 1) — den rozhodné skutečnosti, nebo poslední den zdaňovacího období, ve kterém byla oprava zapsána? Zdroje se rozcházejí; prosím o potvrzení proti platnému textu § 42 odst. 3.
8. **Mimořádný úklid vyúčtovaný samostatně po odjezdu — 12 % nebo 21 %?** Úklidové služby CZ-CPA 81 v příloze č. 2 nejsou. Rozdíl 9 procentních bodů na opakující se položce.
9. **OZV obce Jílové u Držkova o poplatku z pobytu** — číslo, datum, sazba, lhůta ohlášení, perioda a splatnost odvodu, osvobození nad rámec § 3b. Prosím o **kopii vyhlášky do spisu**; do té doby `city_tax_cents = 0`. (Indicie: OZV č. 1/2021, sazba 20 Kč, odvod pololetně do 15 dnů po skončení pololetí — **nepotvrzeno z primárního zdroje**.)
10. **Jsou Achát a Mech jedno „zařízení nebo místo" ve smyslu § 3g, nebo dvě?** Rozhoduje o tom, zda se vede jedna evidenční kniha, nebo dvě.
11. **Daňový režim provozovatele:** daňová evidence se skutečnými výdaji, paušální výdaje 60 % (strop 1 200 000 Kč), nebo paušální režim (limit příjmů 2 000 000 Kč)? Zásadně mění, co má modul evidovat a reportovat. Zároveň: OSVČ nebo s.r.o.? U s.r.o. je povinné účetnictví od vzniku.
12. **Strategie při budoucím překročení 2 000 000 Kč:** § 6 odst. 1 (plátcem až od 1. 1. dalšího roku), nebo § 6 odst. 2 písm. a) (dobrovolně dřív kvůli odpočtu z investic do domků)? U koncových spotřebitelů je odklad zpravidla výhodnější — po registraci klesne marže o 12 %.
13. **Textace storno podmínek a kauce ve VOP** — nechat zkontrolovat advokátem se zaměřením na spotřebitelské právo (§ 1813, § 1814 odst. 1 písm. c) a l), § 2330 odst. 2 OZ). Riziko je zde **ČOI, ne finanční úřad**, a v `SYSTEM.md` se s ním nepočítá. Zvlášť: současný sazebník 30+ dní = 100 % vypadá jako překlep.
14. **Ověřit v ASPI tři paragrafové odkazy**, které se mi z veřejných zdrojů nepodařilo uzavřít: písmeno u převodu jednoúčelového poukazu v § 21 odst. 4 (i) vs. j)), doslovné znění § 36 odst. 5 věty o zaokrouhlení k 1. 1. 2026, a přesná struktura § 42 odst. 3.
15. **Vzor opravného dokladu z Fakturoidu** — fyzicky zkontrolovat, že tiskne i písm. j) (rozdíl celkové částky) a písm. k) (den dle § 42 odst. 3), a jestli se den podle § 42 odst. 3 do API vůbec předává, nebo si ho Fakturoid dosazuje sám.
