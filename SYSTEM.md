# Sedmý les — rezervační, fakturační a inspekční systém

**Architektonický dokument v1.0 · srpen 2026**
Zadavatel: provozovatel dvou tiny housů Achát a Mech, Jílové u Držkova.
Repozitář: `sedmyles.cz` (Next.js 16 App Router, React 19, Tailwind v4, TypeScript).
Dokument je závazné zadání pro implementaci. Kde se stanoviska expertů rozcházela, je zde vybrána jedna varianta a zdůvodněna; jiné varianty se nestaví.

---

## 1. Shrnutí

**Co systém je.** Sedmý les dostane jednoúčelový provozní systém pro dvě ubytovací jednotky, který nahrazuje dnešní stav „poptávka končí jako e-mail v inboxu a dostupnost je vygenerovaná náhodným generátorem“. Systém má čtyři vrstvy: (1) **rezervační jádro** s databázově vynucenou ochranou proti dvojímu prodeji, skutečným kalendářem, cenami editovatelnými bez deploye a stavovým automatem s automatickým hlídáním splatností; (2) **platební vrstvu**, která dnes umí QR platbu podle standardu SPAYD a je připravená na ComGate tak, že se po podpisu smlouvy doplní tři proměnné do prostředí a nic se nepřepisuje; (3) **fakturační modul** s oddělenými číselnými řadami, neměnnými vydanými doklady a opravnými daňovými doklady (dobropisy) jako jedinou cestou k opravě; (4) **hostovský portál** s foto-protokolem, jehož výstup vyhodnocuje agent **Luna 5.6** a předkládá provozovateli jako návrh k lidskému schválení. Nad tím je **admin**, který je mobile-first a jehož domovská obrazovka odpovídá na jedinou otázku, kterou provozovatel má devadesát procent času: „co se dnes děje“.

**Co systém záměrně není.** Není to hotelový PMS. Nestaví se: housekeeping modul se směnami a úkoly, POS a pokladna, night audit, revenue management se scrapingem konkurence, CRM a marketingové kampaně, vestavěný chat s hostem, věrnostní program, vícejazyčný admin, konfigurovatelná pole rezervace, dashboard s grafy KPI, drag&drop editor e-mailových šablon, správa více objektů, channel manager, vlastní účetnictví s přiznáním k DPH ani nativní mobilní aplikace. Provozovatel je jeden člověk, který sám uklízí, sám přebírá hosty a sám fakturuje — každý modul navíc je něco, co se rozbije při upgradu Next.js a nikdo si toho nevšimne, protože to nikdo nepoužívá. **Pravidlo pro každý budoucí požadavek: dokud to provozovatel zvládne rychleji telefonem než v systému, nepatří to do systému.**

**Co je na tomhle provozu specifické a co z toho plyne.** Dva domky znamenají, že jedna dvojrezervace za rok stojí víc než celý systém — proto je ochrana proti overbookingu na úrovni databáze (`EXCLUDE USING gist`), ne v aplikačním kódu. Jeden provozovatel znamená, že systém, který nejde ovládat jednou rukou na 390px displeji, se do měsíce přestane používat a databáze začne lhát — což je horší než žádný systém, protože web pak ukazuje falešnou dostupnost. A fotoprotokol vyhodnocovaný modelem znamená, že se poprvé potkává AI s penězi hosta — proto **Luna 5.6 nikdy sama nerozhodne o koruně**; je to databázový constraint, ne konvence v kódu.

---

## 2. Rozsah v0 / v1 / v2

Hranice jsou ostré. Co je ve v1, se ve v0 nezačíná psát ani „připravovat“, s jedinou výjimkou: **datový model se zavádí celý od v0**, protože dodělávat DPH, virtuální jednotku nebo kauci do schématu, které je nemá, je bolestivá migrace historických dokladů.

| Oblast | v0 — „Ostrý kalendář a peníze“ | v1 — „Doklady, portál, Luna“ | v2 — „Rozšíření“ |
|---|---|---|---|
| Databáze | Neon Postgres + Drizzle, celé schéma, `btree_gist` EXCLUDE, seed 24 měsíců cen | migrace jen aditivní | — |
| Dostupnost | skutečná z DB, **`getBookedDays` smazána** (ne zakomentována), build-guard test | — | — |
| Ceny | `rate_calendar` + admin obrazovka Ceny, zmrazení do `reservation_items` | slevová pravidla (last-minute) | cenové návrhy podle obsazenosti |
| Rezervace | wizard → skutečná rezervace, hold 72 h, ruční rezervace v adminu | portálový sběr údajů hostů | prodej spojené jednotky „Celý les“ na webu |
| Jednotky | `achat`, `mech`, `cely-les` v datech, prodej jen jednotlivých domků | — | prodej celku, cena celku v `rate_calendar` |
| Platby | QR/SPAYD, Fio párování, ruční potvrzení, `PaymentProvider` + mock | ComGate adaptér napsaný, za flagem vypnutý | ComGate ostrý, Apple/Google Pay, preauth kauce, rekonciliace výplat |
| Kauce | **nevybírá se v penězích** (`CONTRACTUAL_ONLY`), text OP upraven | vypořádání škody podle Luny, doklad o náhradě škody | volitelný `CARD_PREAUTH` |
| Doklady | žádné — jen potvrzení rezervace a potvrzení o přijaté platbě (PDF, ne daňový doklad) | Fakturoid: ZAL / FAK / OPD, storno → dobropis, archiv PDF+ISDOC v Blobu | DZP po přechodu na plátce DPH, roční uzávěrkový ZIP, Pohoda/Money XML |
| Admin | Dnes, Kalendář, Rezervace (seznam + detail), Peníze, Nastavení, auth passkey+TOTP | Doklady, Kniha hostů, Poplatek obci, Inspekce, Checklisty, Luna dashboard | Statistiky, Hlášení eTurista, Vouchery, tým a role |
| Portál | — | `/pobyt/*`: přihlášení, údaje hostů, foto-protokol při odjezdu | EN verze, samoobslužný export dat hosta |
| Luna 5.6 | — | CV pre-filtr, párový prompt, dvojí běh, fronta ke schválení, checklist editor | inventární počítání, timeline opotřebení, triage přes levnější model |
| Kanály | iCal **export** (feed pro Google kalendář majitele) | — | iCal **import** z Booking/Airbnb + denní kontrola překryvů |
| Zákonné | poplatek obci počítaný per osoba/noc | kniha hostů, čtvrtletní report obci, retenční cron | eTurista/UBYPORT dávky |
| Notifikace | e-mail majiteli, denní souhrn v 7:00 | Web Push (PWA), e-maily hostovi s doklady | SMS hostovi (3× za pobyt) |

**Odhad:** v0 ≈ 4–6 týdnů, v1 ≈ 5–7 týdnů, v2 podle poptávky.

---

## 3. Datový model

PostgreSQL 16 (Neon, region `eu-central-1`), přístup přes Drizzle ORM. Konvence, které platí bez výjimky:

- **Peníze jsou `bigint` v haléřích.** Nikdy `numeric`, nikdy `float`. ComGate i SPAYD pracují v haléřích.
- **Pobytové termíny jsou `date`, ne `timestamptz`.** Pobyt je ode dne do dne; `timestamptz` vyrábí celou třídu chyb kolem letního času a půlnoci.
- **Intervaly jsou půlotevřené `[)`.** Den odjezdu je den příjezdu dalšího hosta.
- **Nic se nemaže.** Rezervace se stornuje, doklad se opravuje dobropisem, host se anonymizuje. Jediné hard delete je retenční cron nad fotkami a tokeny.
- `id uuid primary key default gen_random_uuid()` všude, kde není uvedeno jinak.

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
```

### 3.1 Konfigurace a jednotky

```sql
-- Jediný řádek. Řídí, zda se generuje faktura nebo daňový doklad,
-- jaká je sazba poplatku obci a jaké jsou provozní lhůty.
CREATE TABLE company_settings (
  id                 smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  legal_name         text NOT NULL,
  ico                text NOT NULL,
  dic                text,
  address            jsonb NOT NULL,
  bank_iban          text NOT NULL,          -- CZ65 0800 0000 1920 0014 5399
  bank_bic           text NOT NULL,          -- GIBACZPX
  bank_display       text NOT NULL,          -- 192000145399/0800
  vat_payer          boolean NOT NULL DEFAULT false,
  vat_payer_from     date,
  vat_period         char(1) CHECK (vat_period IN ('M','Q')),
  city_tax_cents     bigint NOT NULL DEFAULT 0,   -- 0 = obec poplatek nezavedla
  city_tax_ozv_ref   text,                        -- číslo a datum vyhlášky
  city_tax_valid_from date,
  invoice_due_days   int NOT NULL DEFAULT 14,
  deposit_share_bp   int NOT NULL DEFAULT 5000,   -- 50,00 % zálohy
  deposit_due_days   int NOT NULL DEFAULT 3,
  balance_due_days_before int NOT NULL DEFAULT 14,
  security_deposit_cents  bigint NOT NULL DEFAULT 300000,
  security_deposit_mode   text NOT NULL DEFAULT 'CONTRACTUAL_ONLY'
                          CHECK (security_deposit_mode IN ('CONTRACTUAL_ONLY','COLLECTED','CARD_PREAUTH')),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE units (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,        -- achat | mech | cely-les
  name          text NOT NULL,
  capacity      int NOT NULL,
  area_m2       int,
  is_virtual    boolean NOT NULL DEFAULT false,
  sort_order    int NOT NULL DEFAULT 0,
  ical_token    text UNIQUE NOT NULL,        -- 32 znaků, pro veřejný feed
  active        boolean NOT NULL DEFAULT true
);

-- Rozpad virtuální jednotky na fyzické. cely-les -> achat, mech.
CREATE TABLE unit_components (
  composite_unit_id uuid NOT NULL REFERENCES units(id),
  member_unit_id    uuid NOT NULL REFERENCES units(id),
  PRIMARY KEY (composite_unit_id, member_unit_id)
);

-- Cena a restrikce na den × jednotku. Nahrazuje PRICING v lib/content.ts.
CREATE TABLE rate_calendar (
  unit_id            uuid NOT NULL REFERENCES units(id),
  date               date NOT NULL,
  price_cents        bigint NOT NULL,
  min_nights         int NOT NULL DEFAULT 2,
  closed             boolean NOT NULL DEFAULT false,
  closed_to_arrival  boolean NOT NULL DEFAULT false,
  closed_to_departure boolean NOT NULL DEFAULT false,
  source             text NOT NULL DEFAULT 'generated', -- generated | manual
  note               text,
  PRIMARY KEY (unit_id, date)
);

-- Délkové a akční slevy jako pravidla, ne jako zapečená cena.
CREATE TABLE discount_rules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,       -- WEEK7, LASTMINUTE
  label       text NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('length','lastminute','manual')),
  min_nights  int,
  days_before int,
  percent_bp  int NOT NULL,               -- 1000 = 10 %
  applies_to  text NOT NULL DEFAULT 'accommodation',
  valid_from  date, valid_to date,
  active      boolean NOT NULL DEFAULT true
);

CREATE TABLE addons (
  id             text PRIMARY KEY,        -- snidane | vino | drevo | pes | pozdni | sauna
  name           text NOT NULL,
  description    text,
  price_cents    bigint NOT NULL,
  unit           text NOT NULL CHECK (unit IN ('per_stay','per_day','per_piece')),
  price_item_code text NOT NULL REFERENCES price_items(code),
  max_qty        int NOT NULL DEFAULT 1,
  available_from date, available_to date,  -- sezónní dostupnost (sud v zimě ne)
  active         boolean NOT NULL DEFAULT true,
  sort_order     int NOT NULL DEFAULT 0
);

-- Číselník fakturovatelných položek: jediné místo, kde je uloženo,
-- že noc je 12 % a víno 21 %. Verzovaný podle platnosti.
CREATE TABLE price_items (
  code        text PRIMARY KEY,   -- NIGHT | ADDON_BREAKFAST | ADDON_WINE | ADDON_FIREWOOD
                                  -- ADDON_DOG | ADDON_LATE_CHECKOUT | CITY_TAX | DAMAGE | DISCOUNT
  name        text NOT NULL,
  cz_cpa      text,               -- 55.20 ubytování, 96.04 sauna
  vat_rate    int,                -- 12 | 21 | NULL (mimo daň)
  line_kind   text NOT NULL CHECK (line_kind IN
              ('TAXABLE','PASS_THROUGH','SECURITY_DEPOSIT','DISCOUNT','ADVANCE_DEDUCTION','ROUNDING')),
  valid_from  date NOT NULL,
  valid_to    date
);
```

### 3.2 Rezervace, hosté, blokace

```sql
CREATE TYPE reservation_status AS ENUM
  ('inquiry','hold','confirmed','checked_in','checked_out','closed','cancelled','expired','no_show');
CREATE TYPE payment_state AS ENUM
  ('unpaid','deposit_paid','paid','overpaid','refunded');
CREATE TYPE deposit_state AS ENUM
  ('not_required','held','settled','partially_forfeited','forfeited');

CREATE TABLE reservations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text UNIQUE NOT NULL,        -- SL-26-0143, veřejný kód pro hosta
  variable_symbol  text UNIQUE NOT NULL,        -- 10 číslic, viz §5.3
  unit_id          uuid NOT NULL REFERENCES units(id),   -- může být virtuální
  checkin          date NOT NULL,
  checkout         date NOT NULL CHECK (checkout > checkin),
  status           reservation_status NOT NULL DEFAULT 'inquiry',
  payment_state    payment_state NOT NULL DEFAULT 'unpaid',   -- denormalizace, přepočítává se
  deposit_state    deposit_state NOT NULL DEFAULT 'not_required',
  source           text NOT NULL DEFAULT 'web'  -- web | phone | admin | booking | airbnb
                   CHECK (source IN ('web','phone','admin','booking','airbnb')),
  adults           int NOT NULL DEFAULT 2,
  children_u18     int NOT NULL DEFAULT 0,
  total_cents          bigint NOT NULL DEFAULT 0,
  accommodation_cents  bigint NOT NULL DEFAULT 0,
  addons_cents         bigint NOT NULL DEFAULT 0,
  discount_cents       bigint NOT NULL DEFAULT 0,
  city_tax_cents       bigint NOT NULL DEFAULT 0,
  deposit_required_cents bigint NOT NULL DEFAULT 0,   -- záloha 50 %
  paid_cents           bigint NOT NULL DEFAULT 0,
  cancel_policy_id  uuid REFERENCES cancel_policies(id),
  cancel_policy_snapshot jsonb,               -- zmrazená pravidla
  city_tax_rate_snapshot_cents bigint,        -- zmrazená sazba OZV
  hold_expires_at  timestamptz,
  einvoice_consent_at timestamptz,
  einvoice_consent_ip inet,
  note_internal    text,
  note_guest       text,
  checklist_version_id uuid REFERENCES checklist_versions(id),
  search_text      text,                      -- pg_trgm index, unaccent
  created_by       text,                      -- admin_user.id nebo 'web'
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  cancelled_at     timestamptz,
  cancel_reason    text,
  anonymized_at    timestamptz
);
CREATE INDEX ON reservations USING gin (search_text gin_trgm_ops);
CREATE INDEX ON reservations (checkin);
CREATE INDEX ON reservations (status, hold_expires_at);

-- ZDE sedí ochrana proti overbookingu. Rezervace na cely-les zapíše DVA řádky.
CREATE TABLE reservation_units (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  unit_id        uuid NOT NULL REFERENCES units(id),
  checkin        date NOT NULL,
  checkout       date NOT NULL,
  status         reservation_status NOT NULL,   -- redundantně, kvůli partial constraintu
  CONSTRAINT no_overlap EXCLUDE USING gist (
    unit_id WITH =,
    daterange(checkin, checkout, '[)') WITH &&
  ) WHERE (status IN ('hold','confirmed','checked_in'))
);

-- Neprodejné bloky: údržba, vlastní pobyt, sníh, importované OTA holdy.
CREATE TABLE calendar_blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id     uuid NOT NULL REFERENCES units(id),
  date_from   date NOT NULL,
  date_to     date NOT NULL,      -- exkluzivní
  kind        text NOT NULL CHECK (kind IN ('maintenance','owner','closed','ota_hold')),
  reason      text,
  source_feed_id uuid REFERENCES ical_feeds(id),
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_overlap_blocks EXCLUDE USING gist (
    unit_id WITH =, daterange(date_from, date_to, '[)') WITH &&)
);
```

> **Pozor:** blok a rezervace jsou dvě tabulky, takže jeden EXCLUDE constraint je nepokryje. Kontrola překryvu bloku vůči rezervaci se dělá v téže transakci dotazem `SELECT ... FOR UPDATE` nad `reservation_units` a naopak. Alternativa (jedna tabulka `occupancy` pro obojí) byla zamítnuta, protože by blokace zamořily statistiky, knihu hostů i fakturaci.

```sql
-- Rozpad ceny ke dni potvrzení. Po potvrzení se NEPŘEPOČÍTÁVÁ.
CREATE TABLE reservation_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  kind           text NOT NULL CHECK (kind IN ('night','addon','discount','city_tax','damage')),
  price_item_code text REFERENCES price_items(code),
  label          text NOT NULL,
  date           date,                 -- u nocí konkrétní noc
  unit_slug      text,                 -- středisko: achat | mech
  qty            numeric(10,2) NOT NULL DEFAULT 1,
  unit_price_cents bigint NOT NULL,
  total_cents    bigint NOT NULL,
  vat_rate       int,
  manual_reason  text,                 -- povinné, když admin přepsal cenu
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE guests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name    text, last_name text,
  email         text, phone_e164 text,
  address       jsonb,
  country_code  char(2),
  is_company    boolean NOT NULL DEFAULT false,
  billing_name  text, billing_ico text, billing_dic text,
  marketing_consent_at timestamptz,
  note          text,
  last_stay_at  date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  anonymized_at timestamptz
);
CREATE UNIQUE INDEX ON guests (lower(email)) WHERE email IS NOT NULL AND anonymized_at IS NULL;

CREATE TABLE reservation_guests (
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  guest_id       uuid NOT NULL REFERENCES guests(id),
  role           text NOT NULL CHECK (role IN ('payer','companion')),
  PRIMARY KEY (reservation_id, guest_id)
);

-- Evidenční kniha (§ 3g z. 565/1990) + domovní kniha (§ 101 z. 326/1999).
-- Oddělená kvůli šestileté retenci a šifrovaným polím.
CREATE TABLE guest_registrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  uuid NOT NULL REFERENCES reservations(id),
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  birth_date      date NOT NULL,
  address         jsonb NOT NULL,          -- trvalý pobyt / bydliště v zahraničí
  citizenship     char(2) NOT NULL,
  doc_type        text NOT NULL,           -- OP | CESTOVNI_PAS | POVOLENI_K_POBYTU
  doc_number_enc  bytea NOT NULL,          -- AES-256-GCM, klíč DATA_ENC_KEY mimo DB
  visa_number_enc bytea,
  purpose_of_stay text,
  stay_from       date NOT NULL,
  stay_to         date NOT NULL,
  nights          int NOT NULL,
  city_tax_cents  bigint NOT NULL DEFAULT 0,
  exemption_reason text CHECK (exemption_reason IN
                   ('UNDER_18','HOSPITALIZED','DISABILITY','SEASONAL_WORK')),
  is_foreigner    boolean GENERATED ALWAYS AS (citizenship <> 'CZ') STORED,
  reported_at     timestamptz,
  report_batch_id uuid REFERENCES report_batches(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  retain_until    date NOT NULL            -- stay_to + 6 let
);

CREATE TABLE report_batches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target       text NOT NULL CHECK (target IN ('ETURISTA','UBYPORT','CITY_TAX')),
  period_from  date NOT NULL, period_to date NOT NULL,
  status       text NOT NULL DEFAULT 'generated'
               CHECK (status IN ('generated','submitted','confirmed','error')),
  blob_key     text, rows_count int,
  due_at       timestamptz,
  submitted_at timestamptz, confirmed_at timestamptz, error_message text
);

CREATE TABLE cancel_policies (
  id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name   text NOT NULL,
  tiers  jsonb NOT NULL,   -- [{"days_before":30,"refund_bp":10000},{"days_before":14,"refund_bp":5000},{"days_before":0,"refund_bp":0}]
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE ical_feeds (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id       uuid NOT NULL REFERENCES units(id),
  channel       text NOT NULL,     -- booking | airbnb
  url           text NOT NULL,
  last_sync_at  timestamptz, last_sync_status text, last_error text,
  events_count  int, active boolean NOT NULL DEFAULT true
);
```

### 3.3 Platby

```sql
CREATE TABLE payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  uuid NOT NULL REFERENCES reservations(id),
  kind            text NOT NULL CHECK (kind IN ('deposit','balance','security_deposit','damage','refund')),
  direction       text NOT NULL CHECK (direction IN ('IN','OUT')),
  provider        text NOT NULL CHECK (provider IN ('qr_transfer','comgate','cash','voucher','mock')),
  amount_cents    bigint NOT NULL CHECK (amount_cents > 0),
  currency        char(3) NOT NULL DEFAULT 'CZK',
  status          text NOT NULL DEFAULT 'created' CHECK (status IN
                  ('created','pending','paid','partially_paid','overpaid','cancelled','expired',
                   'refunded_partial','refunded_full')),
  variable_symbol text NOT NULL,
  specific_symbol text,             -- 1=záloha 2=doplatek 3=kauce
  spayd           text,             -- uložený řetězec, aby bylo QR reprodukovatelné
  provider_tx_id  text,             -- ComGate transId AB12-CD34-EF56
  provider_status text,
  provider_fee_cents bigint,
  redirect_url    text,
  due_at          timestamptz,
  paid_at         timestamptz,
  expires_at      timestamptz,
  bank_transaction_id bigint REFERENCES bank_transactions(id),
  matched_by      text CHECK (matched_by IN ('AUTO','MANUAL')),
  idempotency_key text UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON payments (variable_symbol);
CREATE INDEX ON payments (status, due_at);

CREATE TABLE payment_events (
  id              bigserial PRIMARY KEY,
  payment_id      uuid REFERENCES payments(id),
  source          text NOT NULL CHECK (source IN ('webhook','status_poll','bank_import','manual','cron')),
  provider        text, provider_event_id text,
  signature_ok    boolean, source_ip inet, actor text,
  status_before   text, status_after text,
  raw             jsonb NOT NULL,
  received_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);

CREATE TABLE bank_transactions (
  id            bigserial PRIMARY KEY,
  source        text NOT NULL CHECK (source IN ('FIO_API','GPC','CAMT053','MANUAL')),
  external_id   text NOT NULL,
  booked_on     date NOT NULL,
  amount_cents  bigint NOT NULL, currency char(3) NOT NULL,
  variable_symbol text, specific_symbol text, constant_symbol text,
  counter_account text, counter_account_name text, message text,
  raw           jsonb,
  match_status  text NOT NULL DEFAULT 'UNMATCHED'
                CHECK (match_status IN ('UNMATCHED','MATCHED','REVIEW','IGNORED')),
  imported_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, external_id)
);

CREATE TABLE refunds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      uuid NOT NULL REFERENCES payments(id),
  invoice_id      uuid REFERENCES invoices(id),   -- dobropis, vyplní se AŽ po úspěchu
  amount_cents    bigint NOT NULL CHECK (amount_cents > 0),
  reason          text NOT NULL CHECK (reason IN
                  ('storno_100','storno_50','storno_0','deposit_return','deposit_partial',
                   'overpayment','goodwill','other')),
  reason_note     text,
  provider_refund_id text,
  status          text NOT NULL DEFAULT 'proposed'
                  CHECK (status IN ('proposed','sent','settled','failed')),
  failure_code    text,
  payout_account  text NOT NULL,     -- protiúčet plátce z výpisu
  requested_by    text NOT NULL, requested_at timestamptz NOT NULL DEFAULT now(),
  settled_at      timestamptz,
  idempotency_key text UNIQUE
);

CREATE TABLE deposits (   -- vratná kauce 3 000 Kč, ZCELA mimo daňové doklady
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL UNIQUE REFERENCES reservations(id),
  mode           text NOT NULL CHECK (mode IN ('CONTRACTUAL_ONLY','COLLECTED','CARD_PREAUTH')),
  amount_cents   bigint NOT NULL DEFAULT 300000,
  payment_id     uuid REFERENCES payments(id),
  comgate_trans_id text,
  state          text NOT NULL DEFAULT 'not_required' CHECK (state IN
                 ('not_required','pending','held','released','partially_forfeited','forfeited')),
  held_at        timestamptz, released_at timestamptz,
  forfeited_cents bigint NOT NULL DEFAULT 0,
  damage_decision_id uuid REFERENCES damage_decisions(id),
  refund_payment_id  uuid REFERENCES payments(id)
);

-- Fronta všeho, co automat nedokázal uzavřít. Zobrazuje se na obrazovce Dnes.
CREATE TABLE tasks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind           text NOT NULL,   -- unmatched_payment | underpayment | overpayment | return_deposit
                                  -- failed_refund | expired_hold | ical_stale | luna_review
                                  -- guestbook_missing | foreigner_report_due | manual_transfer
  severity       text NOT NULL DEFAULT 'warn' CHECK (severity IN ('info','warn','urgent')),
  reservation_id uuid REFERENCES reservations(id),
  payment_id     uuid REFERENCES payments(id),
  bank_transaction_id bigint REFERENCES bank_transactions(id),
  inspection_id  uuid REFERENCES inspections(id),
  title          text NOT NULL, detail text,
  due_at         timestamptz,
  resolved_at    timestamptz, resolved_by text, resolution_note text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
```

### 3.4 Doklady

```sql
CREATE TABLE invoice_series (
  code         text NOT NULL,      -- ZAL | DZP | FAK | OPD | POU
  year         int NOT NULL,
  last_number  int NOT NULL DEFAULT 0,
  format_mask  text NOT NULL DEFAULT '{code}-{year}-{seq:04}',
  PRIMARY KEY (code, year)
);

CREATE TABLE invoices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type       text NOT NULL CHECK (doc_type IN
                 ('PROFORMA','ADVANCE_TAX','FINAL','CORRECTIVE','NON_TAX')),
  number         text UNIQUE,            -- NULL dokud je DRAFT
  series_code    text, year int,
  status         text NOT NULL DEFAULT 'DRAFT' CHECK (status IN
                 ('DRAFT','ISSUED','PAID','PARTIALLY_PAID','CANCELLED','CORRECTED')),
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  engine         text NOT NULL DEFAULT 'fakturoid' CHECK (engine IN ('fakturoid','local')),
  fakturoid_id   bigint,
  variable_symbol text NOT NULL,
  issue_date     date, tax_point_date date, due_date date,
  vat_applicable boolean NOT NULL DEFAULT false,
  customer       jsonb NOT NULL,          -- snapshot odběratele
  total_without_vat_cents bigint NOT NULL DEFAULT 0,
  total_vat_cents         bigint NOT NULL DEFAULT 0,
  total_with_vat_cents    bigint NOT NULL DEFAULT 0,
  rounding_cents          bigint NOT NULL DEFAULT 0,
  already_taxed_advances_cents bigint NOT NULL DEFAULT 0,  -- § 37a
  amount_to_pay_cents     bigint NOT NULL DEFAULT 0,
  correction_reason       text,
  delivery_attempted_at   timestamptz,     -- § 42 odst. 3
  sent_at        timestamptz,
  pdf_blob_id    uuid REFERENCES document_blobs(id),
  isdoc_blob_id  uuid REFERENCES document_blobs(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE invoice_lines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid NOT NULL REFERENCES invoices(id),
  seq         int NOT NULL,
  line_kind   text NOT NULL,        -- viz price_items.line_kind
  price_item_code text REFERENCES price_items(code),
  description text NOT NULL,
  cz_cpa      text,
  quantity    numeric(10,2) NOT NULL,
  unit        text NOT NULL,        -- noc | ks | osoba/noc | pobyt
  unit_price_with_vat_cents bigint NOT NULL,
  vat_rate    int,
  base_cents  bigint NOT NULL, vat_cents bigint NOT NULL, total_cents bigint NOT NULL,
  unit_slug   text,                 -- středisko achat | mech
  service_from date, service_to date,
  CONSTRAINT vat_only_on_taxable CHECK (line_kind = 'TAXABLE' OR vat_rate IS NULL)
);

CREATE TABLE invoice_vat_summary (
  invoice_id uuid NOT NULL REFERENCES invoices(id),
  vat_rate   int,
  base_cents bigint NOT NULL, vat_cents bigint NOT NULL, total_cents bigint NOT NULL,
  PRIMARY KEY (invoice_id, vat_rate)
);

CREATE TABLE invoice_relations (
  parent_invoice_id uuid NOT NULL REFERENCES invoices(id),
  child_invoice_id  uuid NOT NULL REFERENCES invoices(id),
  relation_type text NOT NULL CHECK (relation_type IN
                ('SETTLES_ADVANCE','CORRECTS','ISSUED_FROM_PROFORMA')),
  amount_cents  bigint,
  PRIMARY KEY (parent_invoice_id, child_invoice_id, relation_type)
);

CREATE TABLE document_blobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid REFERENCES invoices(id),
  kind        text NOT NULL CHECK (kind IN ('PDF','ISDOC','ATTACHMENT','YEAR_ARCHIVE_ZIP')),
  storage_key text NOT NULL,     -- 2026/FAK/FAK-2026-0042.pdf
  mime_type   text NOT NULL, byte_size bigint NOT NULL,
  sha256      text NOT NULL, prev_sha256 text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  retain_until date NOT NULL     -- issue_date + 10 let
);

CREATE TABLE vouchers (              -- v2
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code      text UNIQUE NOT NULL,
  kind      text NOT NULL CHECK (kind IN ('amount','stay')),
  value_cents bigint NOT NULL, remaining_cents bigint NOT NULL,
  buyer_guest_id uuid REFERENCES guests(id),
  invoice_id uuid REFERENCES invoices(id),
  issued_at timestamptz NOT NULL DEFAULT now(), valid_until date NOT NULL,
  redeemed_reservation_id uuid REFERENCES reservations(id),
  status    text NOT NULL DEFAULT 'active'
);
```

### 3.5 Portál, checklisty, Luna 5.6

```sql
CREATE TABLE guest_portal_access (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL UNIQUE REFERENCES reservations(id),
  variable_symbol text NOT NULL,        -- „uživatelské jméno“
  access_code_hash text NOT NULL,       -- argon2id z 8znakového kódu (viz §8.2)
  opens_at       timestamptz NOT NULL,  -- po zaplacení zálohy
  expires_at     timestamptz NOT NULL,  -- checkout + 14 dní
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until   timestamptz
);

CREATE TABLE guest_login_tokens (   -- magic link
  id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  token_hash text NOT NULL,        -- sha256(randomBytes(32))
  expires_at timestamptz NOT NULL, -- +30 min
  used_at timestamptz, requested_ip inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE guest_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(),
  idle_expires_at timestamptz NOT NULL, absolute_expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE TABLE checklist_templates (      -- živý draft
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, unit_slug text,   -- NULL = společný
  draft_json jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by text
);

CREATE TABLE checklist_versions (       -- immutable publikace
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES checklist_templates(id),
  semver text NOT NULL, schema_json jsonb NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(), published_by text,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (template_id, semver)
);

CREATE TABLE checklist_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_version_id uuid NOT NULL REFERENCES checklist_versions(id),
  zone_key text NOT NULL,               -- floor | kitchen | fridge | bathroom | wc | loft
                                        -- mattress | window | seating | ceiling | terrace | grill
  label text NOT NULL, order_index int NOT NULL,
  required boolean NOT NULL DEFAULT true, shots_count int NOT NULL DEFAULT 1,
  guide_text text NOT NULL,             -- „Vyfoť celou podlahu od dveří“
  llm_questions jsonb NOT NULL DEFAULT '[]',
  escalation_threshold numeric(3,2) NOT NULL DEFAULT 0.80,
  repair_cost_hint_cents bigint,
  UNIQUE (checklist_version_id, zone_key)
);

CREATE TABLE baseline_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_slug text NOT NULL, version int NOT NULL,
  valid_from timestamptz NOT NULL, valid_to timestamptz,
  note text, promoted_from_inspection_id uuid,
  UNIQUE (unit_slug, version)
);

CREATE TABLE baseline_shots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_set_id uuid NOT NULL REFERENCES baseline_sets(id),
  zone_key text NOT NULL,
  light_variant text NOT NULL CHECK (light_variant IN ('day','overcast','artificial')),
  storage_key text NOT NULL, dhash64 bigint NOT NULL,
  mean_luminance real NOT NULL, device_orientation jsonb,
  guide_outline_svg text
);

CREATE TABLE inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  unit_slug text NOT NULL,
  type text NOT NULL CHECK (type IN ('checkin','checkout')),
  checklist_version_id uuid NOT NULL REFERENCES checklist_versions(id),
  baseline_set_id uuid REFERENCES baseline_sets(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN
         ('draft','submitted','analyzing','auto_clear','needs_review','closed')),
  submitted_at timestamptz, analyzed_at timestamptz, closed_at timestamptz,
  summary_cs text,
  cost_cents bigint NOT NULL DEFAULT 0
);

CREATE TABLE inspection_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id),
  zone_key text NOT NULL,
  client_uuid text NOT NULL,           -- idempotence offline uploadu
  storage_key text NOT NULL, sha256 text NOT NULL,
  width int, height int, bytes bigint,
  exif_taken_at timestamptz, exif_stripped boolean NOT NULL DEFAULT true,
  dhash64 bigint, contains_person boolean NOT NULL DEFAULT false,
  legal_hold boolean NOT NULL DEFAULT false,
  delete_after date NOT NULL,          -- checkout + 90 dní
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inspection_id, client_uuid)
);

CREATE TABLE photo_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id),
  zone_key text NOT NULL,
  before_shot_id uuid REFERENCES baseline_shots(id),
  after_photo_id uuid NOT NULL REFERENCES inspection_photos(id),
  homography jsonb, inlier_count int, reproj_error_px real,
  align_status text NOT NULL CHECK (align_status IN ('good','fair','poor')),
  ssim_global real, diff_regions jsonb, diff_map_key text
);

CREATE TABLE luna_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id),
  zone_key text NOT NULL, run_index int NOT NULL,
  mode text NOT NULL CHECK (mode IN ('primary','swapped','devils_advocate','aggregate')),
  dry_run boolean NOT NULL DEFAULT false,
  model text NOT NULL, prompt_version text NOT NULL,
  input_tokens int, cache_read_tokens int, output_tokens int,
  cost_cents bigint, latency_ms int,
  raw_response jsonb, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE luna_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  luna_run_id uuid NOT NULL REFERENCES luna_runs(id),
  zone_key text NOT NULL,
  severity text NOT NULL CHECK (severity IN
           ('none','dirt','wear','damage_minor','damage_major','missing')),
  confidence numeric(3,2) NOT NULL,
  evidence_bbox jsonb,
  what_changed text NOT NULL,
  alternative_explanation text NOT NULL,
  counter_argument text,
  is_lighting_or_angle_artifact boolean NOT NULL DEFAULT false,
  is_guest_mess_not_damage boolean NOT NULL DEFAULT false,
  estimated_cost_min_cents bigint, estimated_cost_max_cents bigint,
  needs_reshoot boolean NOT NULL DEFAULT false,
  stability text CHECK (stability IN ('stable','unstable'))
);

-- Agregovaný NÁVRH. Nikdy nesahá na peníze.
CREATE TABLE damage_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  inspection_id uuid NOT NULL REFERENCES inspections(id),
  zone_key text NOT NULL,
  proposed_amount_cents bigint NOT NULL,
  finding_ids uuid[] NOT NULL,
  state text NOT NULL DEFAULT 'pending'
        CHECK (state IN ('pending','decided','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Lidské ROZHODNUTÍ. Bez řádku zde nelze strhnout ani korunu (čl. 22 GDPR).
CREATE TABLE damage_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  damage_case_id uuid NOT NULL REFERENCES damage_cases(id),
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  decided_by uuid NOT NULL REFERENCES admin_users(id),   -- NOT NULL je celý smysl tabulky
  decided_at timestamptz NOT NULL DEFAULT now(),
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  reason_cs text NOT NULL CHECK (length(btrim(reason_cs)) >= 20),  -- ručně psané odůvodnění
  is_service_not_damage boolean NOT NULL DEFAULT false,  -- mimořádný úklid = plnění s DPH
  guest_notified_at timestamptz,
  objection_received_at timestamptz, objection_outcome text,
  invoice_id uuid REFERENCES invoices(id)
);

CREATE TABLE luna_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id uuid NOT NULL REFERENCES luna_findings(id),
  human_label text NOT NULL CHECK (human_label IN ('true_positive','false_positive','missed')),
  note text, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE zone_condition_timeline (
  id bigserial PRIMARY KEY,
  unit_slug text NOT NULL, zone_key text NOT NULL,
  inspection_id uuid NOT NULL REFERENCES inspections(id),
  occurred_on date NOT NULL,
  wear_score real NOT NULL, ssim_vs_baseline_v0 real, severity_max text
);
```

### 3.6 Admin, audit

```sql
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','accountant','cleaner')),
  password_hash text,                -- argon2id, nullable (passkey-only účet)
  totp_secret_enc bytea,
  recovery_codes_hash text[],
  push_subscription jsonb, notification_prefs jsonb,
  is_active boolean NOT NULL DEFAULT true, last_login_at timestamptz
);

CREATE TABLE admin_credentials (      -- WebAuthn / passkey
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES admin_users(id),
  credential_id text UNIQUE NOT NULL, public_key bytea NOT NULL,
  sign_count bigint NOT NULL DEFAULT 0, transports text[], aaguid text,
  label text, created_at timestamptz NOT NULL DEFAULT now(), last_used_at timestamptz
);

CREATE TABLE admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES admin_users(id),
  token_hash text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(),
  idle_expires_at timestamptz NOT NULL, absolute_expires_at timestamptz NOT NULL,
  ip inet, user_agent_hash text, revoked_at timestamptz
);

CREATE TABLE audit_log (              -- append-only, aplikační role nemá UPDATE ani DELETE
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  actor_type text NOT NULL CHECK (actor_type IN ('admin','guest','system','agent')),
  actor_id text, action text NOT NULL,
  entity_type text NOT NULL, entity_id text NOT NULL,
  diff jsonb, ip inet, user_agent text,
  prev_hash text, hash text
);

CREATE TABLE privacy_ack (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  doc_key text NOT NULL,           -- photo_protocol_notice | terms | privacy
  doc_version text NOT NULL,
  acknowledged_at timestamptz NOT NULL DEFAULT now(), ip inet
);
```

---

## 4. Stavový automat rezervace

Rezervace nese **tři nezávislé osy**: `status` (průběh pobytu), `payment_state` (peníze) a `deposit_state` (kauce). Jediný sloučený enum byl zamítnut, protože by musel obsahovat kombinace typu `potvrzeno_zaloha_zaplacena_kauce_neprijata` a při každé nové situaci by vyžadoval migraci. Časová osa v detailu rezervace je jejich sloučenou **prezentací**, nikdy zdrojem pravdy.

### 4.1 Osa `status`

```
                 ┌──────────────────────────────────────────┐
  web (>48 h)    │                                          │
  ──────────► hold ──platba zálohy──► confirmed ──D0──► checked_in
                 │                        │                  │
      72 h       │                        │                  │ D+1 11:00
      bez platby │                        │                  ▼
                 ▼                        │             checked_out
              expired                     │                  │
                                          │                  │ vypořádáno
  web (<48 h)                             │                  ▼
  ──────────► inquiry ──ruční potvrzení──►┤               closed
                                          │
  telefon/admin ──────────────────────────┘
                                          │
                                          ├── storno hostem/majitelem ──► cancelled
                                          └── host nedorazil ───────────► no_show
```

**Přesná pravidla přechodů:**

| Z | Do | Spouštěč | Vedlejší efekty |
|---|---|---|---|
| — | `hold` | wizard, příjezd > 48 h, termín volný | INSERT `reservation_units` (chytá 23P01), `hold_expires_at = now() + 72 h`, zmrazení cen do `reservation_items`, vygenerování VS, vytvoření `payments(deposit)`, e-mail s QR |
| — | `inquiry` | wizard, příjezd ≤ 48 h, nebo poptávka na `cely-les` | žádná blokace termínu, e-mail majiteli, úkol v `tasks` |
| — | `confirmed` | ruční rezervace v adminu | `source='phone'`, **nikdy neposílá automatický platební e-mail**, blokace termínu ihned |
| `hold` | `confirmed` | připsání zálohy (auto-match nebo ruční) | vygenerování `guest_portal_access`, e-mail s přístupem, `payment_state='deposit_paid'` |
| `hold` | `expired` | cron `expire-holds` po 72 h | UPDATE `reservation_units.status` → uvolní EXCLUDE, e-mail hostovi „termín jsme uvolnili“, storno ZAL |
| `inquiry` | `hold`/`confirmed` | majitel potvrdí | jako výše |
| `confirmed` | `checked_in` | tlačítko v adminu, nebo automaticky v den příjezdu ve 20:00 | zpřístupní se odjezdový foto-protokol v portálu |
| `checked_in` | `checked_out` | tlačítko, nebo automaticky v den odjezdu v 11:00 | spustí analýzu Luny, pokud je protokol odeslán |
| `checked_out` | `closed` | kauce/škoda vypořádána a doklad vystaven | uzavře `inspections`, nastaví `delete_after` fotek |
| kterýkoli aktivní | `cancelled` | storno | výpočet vratky dle `cancel_policy_snapshot`, `refunds(proposed)`, uvolnění termínu, po úspěšné vratce dobropis |
| `confirmed` | `no_show` | ruční, D+1 | termín se neuvolňuje zpětně, záloha propadá jako náhrada škody |

**Automatické lhůty (cron):** záloha 50 % splatná do 3 dnů od potvrzení (soulad s `content/obchodni-podminky.md`), doplatek 50 % splatný 14 dnů před příjezdem, u rezervací kratších než 14 dnů rovnou 100 %. Připomínky: T−1 před splatností, T+1 po splatnosti, poté úkol majiteli.

### 4.2 Osa `payment_state`

Přepočítává se funkcí `recalcPaymentState(reservation_id)` po každé změně v `payments`; nikdy se needituje ručně.
`unpaid` → `deposit_paid` (paid ≥ deposit_required) → `paid` (paid ≥ total) → `overpaid` (paid > total) → `refunded`.

### 4.3 Osa `deposit_state`

Ve v1 je `security_deposit_mode = 'CONTRACTUAL_ONLY'`, takže osa má hodnoty `not_required` → (po škodě) `partially_forfeited` / `forfeited`. Po zapnutí `COLLECTED` nebo `CARD_PREAUTH` přibývá `pending` → `held` → `released`.

---

## 5. Fakturační modul

### 5.1 Rozhodnutí: engine

**Doklady generuje Fakturoid (API v3), lokální databáze je zrcadlo a zdroj výpočtu.** Fakturoid umí zálohové faktury, daňové doklady k přijaté platbě, opravné daňové doklady jedním voláním, ISDOC export, číselné řady, archivaci a přístup pro účetní; vlastní implementace ISDOC 6.0.2, správného zaokrouhlování DPH a desetileté archivace je tři až čtyři týdny práce a trvalé riziko za 300–500 Kč měsíčně úspory. Lokální model (`invoices`, `invoice_lines`, `invoice_vat_summary`) je přitom kompletní a engine-agnostický (`invoices.engine`), takže odpojení od Fakturoidu znamená dopsat renderer, ne migrovat data.

### 5.2 Číselné řady a typy dokladů

| Řada | Typ | Kdy vzniká | Daňový? |
|---|---|---|---|
| `ZAL-2026-0001` | zálohový list / proforma | při přechodu do `hold` (výzva k platbě s QR) | ne — nezaplacená se jen `CANCELLED`, žádný dobropis |
| `DZP-2026-0001` | daňový doklad k přijaté platbě (§ 28/1/b) | **jen v režimu plátce**, do 15 dnů od připsání, DUZP = den připsání | ano |
| `FAK-2026-0001` | konečná / vyúčtovací faktura (§ 37a) | v den odjezdu, DUZP = check-out | ano (u neplátce „Faktura“) |
| `OPD-2026-0001` | opravný daňový doklad — dobropis i vrubopis (§ 45) | storno, reklamace, oprava chyby | ano |
| `POU-2026-0001` | dárkový poukaz (v2) | vydání poukazu | jednoúčelový poukaz § 15 |

Číslo se přiděluje **až při vystavení** (`DRAFT` → `ISSUED`), v jedné transakci přes `SELECT ... FROM invoice_series WHERE code=$1 AND year=$2 FOR UPDATE`. Nikdy Postgres `SEQUENCE` — dělá díry při rollbacku. Doklad ve stavu `ISSUED` je v aplikaci read-only: neexistuje endpoint, který by měnil částky, a UI u něj nemá tlačítko „Upravit“ ani „Smazat“, jen „Vystavit opravný doklad“.

### 5.3 Variabilní symbol

**VS = 10 číslic: `RRMM` (rok a měsíc příjezdu) + `NNNNN` (pořadí v roce) + `C` (kontrolní číslice mod 11).** Příklad `2608000424`. Vlastnosti: majitel z něj pozná termín bez otevření systému, kontrolní číslice odchytí překlepy při ruční platbě, vejde se do limitu SPAYD (`X-VS` max 10). Tentýž VS nese proforma, DZP, konečná faktura i platba; opravný doklad nese VS původního dokladu. VS se **nikdy nerecykluje** ani po stornu. Rozlišení plateb uvnitř rezervace řeší specifický symbol: `1` = záloha, `2` = doplatek, `3` = kauce.

### 5.4 DPH

Start je **neplátce DPH** — obrat dvou domků při 2 890–3 890 Kč/noc a realistické obsazenosti je 1,0–1,4 mil. Kč, bezpečně pod limitem 2 000 000 Kč, a klientela jsou koncoví spotřebitelé, kterým je DPH cenová nevýhoda. Modul se ale staví plátcovsky od prvního dne (`company_settings.vat_payer`).

- **Neplátce:** doklad se jmenuje „Faktura“, nikde nesmí být slovo „daňový doklad“, sazba DPH ani „0 % DPH“; povinná věta „Nejsem plátce DPH.“ a náležitosti obchodní listiny dle § 435 OZ.
- **Plátce:** noc v domku CZ-CPA 55.20 → **12 %**; pozdní odjezd → 12 % (prodloužení ubytovací služby); pes → 12 % (vedlejší plnění); sauna/koupací sud CZ-CPA 96.04 → 12 %; snídaňový koš → 12 %; **lahev vína → 21 %** (alkohol vždy základní sazba, i v balíčku); extra dřevo na ohniště → **21 %**. Ceny v `price_items` jsou koncové včetně DPH, základ = cena / (1 + sazba), daň se počítá zdola ze základu (§ 37 písm. a). Sleva 10 % u 7+ nocí se váže **výhradně k položkám ubytování**, nikdy k doplňkům.
- Widget **„Obrat k limitu“** v adminu: klouzavý součet za kalendářní rok proti 2 000 000 Kč a proti okamžitému prahu 2 536 500 Kč, alert na 80 % a 95 %.

### 5.5 Dobropisy (opravné daňové doklady)

Čtyři scénáře, jeden nástroj: storno se zaplacenou zálohou, reklamace/sleva po pobytu, přeplatek, chyba v dokladu. Povinné náležitosti dle § 45 odst. 1: evidenční číslo původního dokladu, důvod opravy, rozdíl základu daně a rozdíl daně (záporné částky), identifikace obou stran. Oprava k záloze se dělá k **DZP**, ne k proformě (proforma není doklad). U snížení základu daně se pro zařazení do zdaňovacího období používá `delivery_attempted_at` — timestamp pokusu o doručení e-mailem (§ 42 odst. 3).

**Železné pravidlo: dobropis se vystavuje AŽ PO úspěšné refundaci** (`ComGate code:0`, nebo odškrtnutý ruční převod). Refundace legitimně selhává (nedostatek prostředků mimo sezónu, chyby 1401/1402, uplynulá lhůta akvirera) a vystavený dobropis bez odeslaných peněz je vadný účetní doklad. Opačné pořadí je vždy opravitelné.

### 5.6 Storno

Sazebník (`cancel_policies`, zmrazený na rezervaci): 30+ dní 100 %, 14–29 dní 50 %, méně než 14 dní 0 % — přesně jako `content/obchodni-podminky.md`. Vždy s možností ručního přepsání s povinným důvodem.

Workflow: (1) OPD na celou částku původně zdaněné zálohy; (2) nedaňový doklad „Vyúčtování stornovacího poplatku“ **bez DPH** — propadlá záloha je paušalizovaná náhrada škody, ne úplata za službu (SDEU C-277/05 Société thermale); (3) rozdíl vrátit **na účet, ze kterého platba přišla**, nikdy na jiný. Pokud host místo vrácení dostane voucher na jiný termín, je to protiplnění: DZP se **neopravuje**, voucher se řeší jako jednoúčelový poukaz dle § 15. V UI to musí být dvě různá tlačítka („Stornovat s vrácením“ vs. „Převést na voucher“), ne jedno.

### 5.7 Kauce

**Kauce 3 000 Kč se ve v1 nevybírá v penězích.** Vybrat a vrátit 3 000 Kč znamená u ~150 pobytů ročně 300 bankovních operací navíc, 300 příležitostí zapomenout a stálý zdroj e-mailů „kde mám kauci“; fotoprotokol Luna 5.6 dává důkaz, který kauci nahrazuje. Web a obchodní podmínky se přeformulují na: **„Kauci neúčtujeme. Případnou škodu doúčtujeme do 7 dnů podle fotoprotokolu.“** — to je změna v `content/obchodni-podminky.md`, která je součástí v1 a bez které vzniká rozpor mezi webem a systémem.

Kauce nikdy nesmí být na daňovém dokladu — je to jistota dle § 2012 OZ, ne úplata za plnění; proto má vlastní tabulku `deposits` a `CHECK` v `invoice_lines` zakazuje `SECURITY_DEPOSIT` řádku nenulovou sazbu.

Vypořádání škody má **dvě různá tlačítka**, protože mají různý daňový režim:
- **Náhrada škody** — není plnění, doklad `NON_TAX` „Vyúčtování škody“ bez DPH, s odkazem na `damage_decision.id` a časová razítka fotek.
- **Služba** (mimořádný úklid, ztracený klíč) — plnění JE, fakturuje se s DPH jako `FINAL` doklad.

### 5.8 Poplatek z pobytu obci

Počítá se **per osoba × noc z `guest_registrations`**, nikdy paušálem z rezervace. Sazba `company_settings.city_tax_cents` (max 50 Kč/os./noc) se **zmrazí do `reservations.city_tax_rate_snapshot_cents`** při potvrzení — vyhlášky se mění k 1. lednu a historické pobyty se nesmí přepočítat. Osvobození: osoby mladší 18 let, hospitalizované, nevidomí a osoby závislé na pomoci jiné osoby, sezónní pracovníci obce — evidují se s důvodem. Na dokladu samostatný řádek `line_kind='PASS_THROUGH'` mimo základ daně (§ 36 odst. 13 ZDPH).

**Před spuštěním je nutné ověřit na obecním úřadu Jílové u Držkova, zda má platnou OZV o poplatku z pobytu, jakou sazbu a jaké lhůty.** Do doby ověření je `city_tax_cents = 0` a poplatek se nikde neúčtuje. Dnes není v ceníku ani v obchodních podmínkách — doúčtování na místě by rozčílilo hosty a rozešlo se s tvrzením „uvedené ceny jsou konečné“.

### 5.9 Archivace

PDF a ISDOC obou dokladů se ukládají do `document_blobs` se SHA-256 a hash řetězem (`prev_sha256`) — to je legálně dostačující kontrolní mechanismus vytvářející spolehlivou vazbu podle § 34 ZDPH, bez potřeby kvalifikované pečeti. Retence 10 let (§ 35 odst. 2 ZDPH). Nightly export celého roku do jednoho ZIP mimo hlavní infrastrukturu. **EET se neřeší vůbec** — byla zrušena zákonem 458/2022 Sb. k 1. 1. 2024.

---

## 6. Platební vrstva

### 6.1 Abstrakce

```ts
// lib/payments/types.ts
export interface PaymentProvider {
  id: 'qr' | 'comgate' | 'mock';
  capabilities: {
    instantConfirmation: boolean; refund: boolean; partialRefund: boolean;
    preauth: boolean; applePay: boolean; googlePay: boolean; cancel: boolean;
  };
  createPayment(i: CreatePaymentInput): Promise<{
    providerTxId?: string; redirectUrl?: string; qrPayload?: string; expiresAt: Date }>;
  getStatus(providerTxId: string): Promise<PaymentStatus>;
  refund(providerTxId: string, amountCents: number, refId: string): Promise<RefundResult>;
  cancel?(providerTxId: string): Promise<void>;
  capturePreauth?(providerTxId: string, amountCents: number): Promise<void>;
  releasePreauth?(providerTxId: string): Promise<void>;
  parseWebhook?(req: Request): Promise<WebhookEvent>;
}
```

Soubory: `lib/payments/providers/{qr,comgate,mock}.ts`, registr `lib/payments/index.ts` → `getProvider(id)`. **Aktivace ComGate je odvozená od env, ne od přepínače v kódu:**
`export const COMGATE_ENABLED = Boolean(process.env.COMGATE_MERCHANT && process.env.COMGATE_SECRET)`. Bez klíčů se metoda v UI vůbec nevykreslí a `/api/platba/comgate/*` vrací 503. Po podpisu smlouvy jsou to tři proměnné ve Vercelu a jedno volání `POST /v2.0/config.json` — bez code review a bez deploye.

### 6.2 QR větev (SPAYD)

Generátor je vlastní čistá funkce `lib/payments/spayd.ts`, ~40 řádků, **žádná externí služba** — externí generátor posílá číslo účtu a částku třetí straně a QR musí fungovat i v PDF a e-mailu.

```
SPD*1.0*ACC:{IBAN}+{BIC}*AM:{částka.toFixed(2)}*CC:CZK*RN:SEDMY LES
     *DT:{YYYYMMDD splatnosti}*X-VS:{vs}*X-SS:{1|2|3}*MSG:{max 60 znaků}
```

Reálný příklad zálohy: `SPD*1.0*ACC:CZ6508000000192000145399+GIBACZPX*AM:4335.00*CC:CZK*RN:SEDMY LES*DT:20260824*X-VS:2608000424*X-SS:1*MSG:SEDMY LES REZ 2608000424 ZALOHA`

Tvrdá pravidla: povolená abeceda je pouze `0-9 A-Z`, mezera a `$ % * + - . / :` — všechno ostatní percent-encodovat (hvězdička jako `%2A`). Sanitizace: `String.normalize('NFD').replace(/\p{Diacritic}/gu,'').toUpperCase()`. `MSG` max 60 znaků, `RN` max 35, `X-VS` max 10 číslic. Účet **povinně v IBAN**, ne v tuzemském tvaru. CRC32 klíč vynechat. Unit test kontroluje, že výsledek matchuje `/^[0-9A-Z $%*+\-.\/:]+$/` a délky.

Vykreslení: `qrcode` v1.5.4 v Node runtime, `errorCorrectionLevel:'M'`, `margin:4`. Pro web SVG, pro e-mail a PDF PNG buffer 512 px vložený jako **CID příloha** (data: URI Gmail zahazuje). Zobrazená velikost minimálně 250 × 250 px. **Vedle QR se vždy vypisuje číslo účtu, částka a VS textem.** Vygenerovaný SPAYD řetězec se ukládá do `payments.spayd`, aby bylo QR reprodukovatelné bit po bitu.

Endpoint QR obrázku není indexovaný podle VS, ale podle podepsaného tokenu: `/api/platba/qr?p={paymentId}&s={HMAC-SHA256(paymentId, PAYMENTS_SIGNING_KEY)}`, ověřovaný timing-safe — jinak lze enumerací VS zjistit částky a termíny cizích rezervací.

### 6.3 Párování plateb

Tři vrstvy, implementují se **všechny tři**, protože ruční potvrzení musí být plnohodnotná cesta, ne nouzový hack:

1. **Fio API** — read-only token, `GET https://fioapi.fio.cz/v1/rest/periods/{token}/{od}/{do}/transactions.json`, cron každých 15 minut, překryv 7 dní. **Nikdy `/last/`** — posouvá zarážku a při chybě zpracování se transakce nenávratně ztratí. Rate limit 1 dotaz / 30 s. Idempotence přes `UNIQUE(source, external_id)`.
2. **Import výpisu** v adminu — GPC/ABO nebo camt.053 (`lib/banking/gpc.ts`, `lib/banking/camt.ts`).
3. **Ruční „Označit jako zaplaceno“** s povinným datem a částkou, vždy logované do `payment_events` se `source='manual'` a jménem uživatele.

Párovací algoritmus v tomto pořadí: (1) shoda VS **i** částky v CZK → auto-match; (2) VS sedí, částka nižší → `partially_paid` + úkol, částka vyšší → `overpaid` + úkol, rozdíl do 100 Kč lze odepsat jedním klikem; (3) VS chybí → fuzzy návrh podle jména plátce a částky, **nikdy auto**, jen fronta „nespárované“. Vždy se ukládá protiúčet plátce — bez něj nelze splnit slib „vracíme na účet, ze kterého platba přišla“.

### 6.4 ComGate větev (REST API v2.0)

Base `https://payments.comgate.cz/v2.0`, `Authorization: Basic base64(merchant:secret)`.

- **Vytvoření:** `POST /payment.json` — `{ price: 433500, curr:'CZK', label:'SEDMY LES', refId:'2608000424', method:'ALL', email, phone, fullName, lang:'cs', country:'CZ', category:'OTHER', test: COMGATE_TEST, expirationTime:'3d', enableApplePayGooglePay:true, threeDSPreference:'AUTO', url_paid, url_cancelled, url_pending }`. **`label` má tvrdý limit 16 znaků** — patří tam jen `SEDMY LES`, identifikace jde přes `refId`. Odpověď 201 → `transId`, `redirect` → HTTP 303.
- **Stav:** `GET /payment/transId/{transId}.json` → `PENDING | PAID | CANCELLED | AUTHORIZED`.
- **Storno:** `DELETE /payment/transId/{transId}.json`.
- **Refundace:** `POST /refund.json { transId, amount, refId }` — částečná i opakovaná.
- **Preauth (v2):** `PUT /preauth/transId/{id}.json { amount }` = stržení, `DELETE` = uvolnění.
- **Metody pro UI:** `GET /method.json?curr=CZK&country=CZ`, cachovat 24 h do `payment_methods_cache`.

**Stav platby se NIKDY nebere z návratového URL ani z obsahu webhooku.** Návratové routy `/api/platba/navrat/{zaplaceno,zruseno,ceka}` dělají jen 303 redirect na `/rezervace/{code}/stav` a nemění nic. Webhook `/api/platba/comgate/notifikace`: (1) timing-safe porovnání `secret`, (2) IP allowlist nastavený přes `POST /config.json`, (3) **bez ohledu na obsah** zavolat `GET /payment/transId/...` a zapsat stav podle odpovědi, (4) vrátit 200 (ComGate opakuje až 1000×). Zpracování musí být idempotentní — `UNIQUE(provider, provider_event_id)`. Doplňkově cron `/api/cron/platby-sync` každých 10 minut dotáhne `PENDING` starší 5 minut.

Karty se nikdy nedotknou naší domény (žádný iframe s formulářem) → projekt zůstává na **PCI DSS SAQ A**. Apple Pay a Google Pay se zobrazují jako *acceptance marks*, ne jako tlačítka.

### 6.5 Poplatek brány

`payments.provider_fee_cents` je náklad provozovatele a **nikdy se nepřenáší na fakturu hosta** — přirážka za kartu je spotřebiteli zakázaná (§ 254 ZPS).

---

## 7. Admin rozhraní

Mobile-first, ne desktop-first. Testuje se reálně na telefonu venku na slunci, ne v prohlížeči zúženém na 400 px. Spodní navigace pěti položek: **Dnes / Kalendář / Rezervace / Peníze / Víc**. Na každé obrazovce FAB „+“ = nová rezervace.

| Routa | Obsah |
|---|---|
| `/admin` | **Dnes.** Čtyři karty a nic víc. (1) *Odjíždí dnes*: jméno, telefon tap-to-call, stav foto-protokolu, tlačítko Check-out. (2) *Přijíždí dnes*: jméno, telefon, počet hostů, doplňky k přípravě, stav platby jako tečka, checkbox „uklizeno“. (3) *Zůstává*: kdo je v kterém domku. (4) *Vyžaduje pozornost*: obsah `tasks` — nezaplacené po splatnosti, holdy expirující do 24 h, chybějící údaje do knihy hostů, nálezy Luny ke schválení, chyba iCal. **Back-to-back turnover** (odjezd 11:00 → příjezd 15:00 v témže domku) červeně. Prázdný stav není prázdná stránka: „Dnes nic. Příští příjezd čtvrtek 15:00 — Nováková, Mech.“ Jeden SELECT. |
| `/admin/kalendar` | Mobil: svislý 14denní pás, řádek = den (44 px), dva sloupce Achát \| Mech, spojité pruhy zaoblené v den příjezdu a odjezdu, půlené buňky u navazujících pobytů. Desktop ≥1024 px: horizontální timeline 90 dní, dva sticky řádky + třetí pruh „Celý les“, `grid-column: span N`, **žádný FullCalendar**. Barvy: `confirmed` plná, `hold` žlutá šrafa, `ota_hold` šedá, blok šrafovaný. Tažení přes prázdné dny → „Blokovat / Nová rezervace“. Nad kalendářem přepínač „Volno pro 2/3/7 nocí“ a pole rychlé dostupnosti od–do. |
| `/admin/rezervace` | Jedno vyhledávací pole (jméno, e-mail, telefon v E.164, kód, VS, číslo faktury — `pg_trgm` nad `search_text` s `unaccent`). Chipy kumulativní a promítnuté do URL: Nezaplacené · Nepotvrzené · Tento měsíc · Achát · Mech · Zrušené. Řazení: nejbližší příjezd nahoře, minulost pod oddělovačem „Historie“. Na desktopu checkboxy a přesně tři hromadné akce: Poslat upomínku, Označit zaplacené, Export CSV. |
| `/admin/rezervace/nova` | Intercepting route = bottom sheet. Čtyři povinná pole: jednotka (dva velké chipy), datum od + stepper počtu nocí (default 2), jméno (autocomplete z `guests` na 3 znaky), telefon. E-mail **není povinný**. Cena předvyplněná ze serverového `calcPrice`, editovatelná s povinným polem „důvod“. Dvě tlačítka: „Uložit“ a „Uložit a poslat potvrzení“. Cíl: 20 sekund, měřeno stopkami. |
| `/admin/rezervace/[kod]` | Jedna stránka, žádné taby. Nahoře jméno, jednotka, termín, tap-to-call/SMS, tři stavové odznaky. Pod tím **vertikální časová osa** se sedmi uzly (poptávka → potvrzeno → záloha → doplatek → check-in → check-out → vypořádáno); hotové uzly nesou datum, čas a aktéra, první nehotový je rozbalený a má **jedno** velké primární tlačítko. Pod osou tři sbalené sekce: Cena a doplňky, Doklady, Historie (audit log přeložený do češtiny, ne JSON diff). Interní poznámka žlutá, vždy nahoře, inline editace. |
| `/admin/penize` | Nezaplaceno celkem + počet, fronta nespárovaných bankovních pohybů s návrhy, tlačítko „Poslat QR znovu“, „Označit zaplaceno“, seznam vratek ke schválení. |
| `/admin/ceny` | Výběr období + jednotka + dny v týdnu → nastavit cenu / min. nocí / zavřeno. Generátor „vygeneruj 24 měsíců z pravidel“ s možností přepsat jednotlivý den. |
| `/admin/doklady` | Seznam dokladů s filtrem podle řady a stavu. Vystavení dvěma kliky z detailu rezervace. U `ISSUED` dokladu neexistuje „Upravit“, jen „Vystavit opravný doklad“. Odesílání s **15minutovým odkladem** a tlačítkem „Zrušit odeslání“, aby se čerstvá chyba dala vzít zpět bez dokladu. |
| `/admin/inspekce` | Fronta seřazená podle rizika: nové → ke schválení → uzavřené. Řádek: domek, host, nejhorší zóna, skóre. |
| `/admin/inspekce/[id]` | Zóny pod sebou, u každé dvojice fotek PŘED/PO ve swipe slideru, věta Luny česky, **protiargument vedle obvinění**, míra jistoty, tři tlačítka: OK / Drobnost / Škoda. Při „Škoda“ povinné ruční odůvodnění (min. 20 znaků) a výběr „náhrada škody“ vs. „služba s DPH“. |
| `/admin/checklisty`, `/admin/checklisty/[id]` | Drag&drop editor zón: název, ikona, instrukce pro hosta, povinnost, počet snímků, referenční foto, otázky pro Lunu, práh eskalace, odhad ceny opravy. Náhled „Jak to uvidí host“ v mobilním rámečku. Publikace vytvoří novou `checklist_version`. Testovací běh nad historickými fotkami (`dry_run`). |
| `/admin/kniha-hostu` | Filtrovatelný přehled `guest_registrations`, export CSV/PDF, každý export logován. |
| `/admin/poplatek` | Čtvrtletní hlášení pro obec: jmenný seznam, noci, osvobození, součet. PDF + CSV, archivace odevzdaných hlášení. |
| `/admin/luna` | Cena za měsíc, počet eskalací, precision na `damage` z `luna_feedback`, podíl `poor align` (indikátor, že navádění nefunguje). |
| `/admin/nastaveni` | Firma a bankovní účet, DPH přepínač + widget obratu k limitu, sazba poplatku obci a číslo OZV, lhůty a procenta plateb, iCal tokeny, notifikace, tým. |
| `/admin/log` | Filtrovaný `audit_log` pro dohledání incidentu. Existuje, ale není v navigaci. |

**Co v adminu není:** mazání (jen storno a dobropis), vícekrokové wizardy, hromadné storno, hromadná změna cen, grafy KPI.

---

## 8. Hostovský portál

### 8.1 Mapa rout

| Routa | Obsah |
|---|---|
| `/pobyt` | Přihlášení: pole „variabilní symbol“ + „přístupový kód“, pod tím „Poslat mi odkaz e-mailem“. |
| `/pobyt/vstup?t=…` | Ověření magic linku, jednorázově. |
| `/pobyt/prehled` | Termín, domek, co je v ceně, adresa + GPS + kód od schránky s klíči (zobrazí se od T−1), stav plateb s QR, doklady ke stažení. |
| `/pobyt/hoste` | Formulář „Kdo přijede“ pro všechny osoby → `guest_registrations`. Připomínka T−3, pokud není vyplněno. Doklad se eviduje **jen jako typ a číslo, nikdy jako fotka**. |
| `/pobyt/odjezd` | Foto-protokol. Dostupný od `checked_in`. |
| `/pobyt/skoda/[id]` | Případ škody: fotky vedle sebe, částka, důvod, 48 h na vyjádření, možnost nahrát vlastní fotky, tlačítko „Souhlasím“. |

### 8.2 Přihlášení

Zadání majitele znělo „heslo odvozené od variabilního symbolu“. Doslovné provedení je neúnosné: VS je vytištěný na faktuře, v QR kódu, v bankovním výpisu obou stran a v e-mailu přes cizí SMTP — je to identifikátor, ne tajemství, a nedá se rotovat. **Řešení, které zadání splňuje a přitom není děravé:**

- **Uživatelské jméno = VS.**
- **Přístupový kód = prvních 8 znaků Base32 z `HMAC-SHA256(VS, PORTAL_SECRET)`** — deterministický (majitel ho umí kdykoli znovu vygenerovat, „je odvozený od VS“), ale z VS neodvoditelný. V DB jen `argon2id` hash.
- **Primární cesta je magic link** — jednorázový token `crypto.randomBytes(32)`, v DB jen SHA-256 hash, platnost 30 minut, `UPDATE ... WHERE used_at IS NULL RETURNING` pro atomické spotřebování.
- Rate limit **5 pokusů / 15 min na VS i na IP** (Upstash Redis, ne `Map` v paměti procesu), po 10 selháních zámek rezervace a e-mail majiteli.
- Přístup platí od zaplacení zálohy do **checkout + 14 dní**. Odpověď na žádost o odkaz je vždy stejná („Pokud u nás máte rezervaci, poslali jsme e-mail“) — žádná enumerace.
- Session hosta je **opaque token v DB** (revokovatelný), cookie `__Host-sl_guest`, httpOnly, secure, sameSite lax. **Session portálu nikdy nesdílí namespace s adminem.**

### 8.3 Foto-protokol

**Host nefotí při příjezdu.** Referenční stav (`baseline_sets`) fotí majitel po úklidu ze značených pozic, 12 zón ve třech světelných variantách. Dvojí focení by zdvojnásobilo tření v nejcitlivějším okamžiku a nedokončený protokol je horší než žádný. Příjezdové focení je volitelné, 3 snímky, jako ochrana hosta.

**12 povinných záběrů, medián pod 3 minuty, tvrdý strop 14:** (1) přízemí z rohu u dveří, (2) kuchyňská linka čelně, (3) vnitřek lednice + varná deska, (4) koupelna celkově, (5) WC detail, (6) spací patro ze žebříku, (7) **matrace bez povlečení** (největší nákladová položka), (8) velké okno + žaluzie, (9) sedací nábytek, (10) strop + svítidla, (11) terasa z rohu, (12) gril a venkovní nábytek. Volitelné: sauna/sud a tlačítko **„Chci sám nahlásit škodu“** (přiznaná škoda se účtuje s −30 % z odhadu; toto pravidlo patří do obchodních podmínek předem).

**Navádění na shodný úhel:** `getUserMedia({video:{facingMode:'environment'}})`, nad videem baseline snímek s `opacity: 0.35` a přepínačem `mix-blend-mode: difference`. Každý 3. frame se downscaluje na 32×32 grayscale v `OffscreenCanvas`, počítá se dHash a Hammingova vzdálenost k baseline → prstenec kolem spouště zelený (<14), žlutý (<22), červený (≥22). **Spoušť je aktivní vždy** — hosta nikdy neblokovat. Doplňkově `DeviceOrientationEvent` (na iOS nutné `requestPermission()` z user gesture), bublina pro pitch/roll ±8°.

**Offline-first, protože v lese není signál:** fotka se hned komprimuje (`canvas.toBlob`, JPEG q=0.82, max 1920 px) do IndexedDB (`idb`, store `pending_photos`), upload přes `workbox-background-sync` (`maxRetentionTime: 48 h`) na `POST /api/portal/photos`, idempotentně podle `client_uuid`. UI ukazuje „uloženo v telefonu, odešle se automaticky“ a protokol jde uzavřít i offline. Fallback pro iOS bez Background Sync: retry ve foreground + e-mail „dokončit nahrání“ 2 h po checkoutu. **Odjezd nikdy nečeká na upload.**

**Motivace:** dokončený protokol = vypořádání do 24 hodin místo standardních 7 dnů. To je jediná pobídka, která funguje.

**Nepřeskočitelný panel před prvním focením:** co se fotí (interiér a vybavení, ne osoby), kdo to vyhodnocuje (automatizovaný nástroj Luna 5.6 postavený na jazykovém modelu třetí strany), že finální rozhodnutí dělá vždy člověk, jak dlouho se fotky uchovávají, jak podat námitku. Potvrzení do `privacy_ack` s verzí textu.

---

## 9. Luna 5.6

### 9.1 Pipeline

```
odeslaný protokol
   └─► sharp: rotate dle EXIF, resize na 1092 px delší hrana, strip metadat (GPS!)
        └─► výběr baseline snímku podle nejbližší luminance L* v LAB a hodiny pořízení
             └─► @techstark/opencv-js (WASM v Node):
                  ORB nfeatures=1000 + BFMatcher(HAMMING, crossCheck)
                  + findHomography(RANSAC, reprojThreshold=3.0) + warpPerspective
                  → align_status: good (inliers ≥ 25 a medián reproj. chyby < 6 px) | fair | poor
                  └─► normalizace světla: LAB, CLAHE na L (clip 2.0, tile 8×8), gray-world WB na a/b
                       └─► diff: SSIM (gauss 11×11) na 512 px + ΔE2000 mapa
                            → region, kde lokální SSIM < 0.72 na souvislé ploše ≥ 0.4 % snímku
                            → 0–4 bounding boxy na zónu
                                 ├─ 0 boxů  → zóna se uzavře jako 'clean', LLM se NEVOLÁ
                                 └─ ≥1 box  → volání Luny
```

CV pre-filtr je **povinná brána**. Sníží náklad o ~70 % a hlavně omezí halucinace: model, který vidí celý čistý interiér a je ptán „je něco poškozené“, si občas něco najde; model, který vidí konkrétní podezřelý výřez, odpovídá stabilně.

### 9.2 Model a prompt

`claude-opus-5`, `thinking: {type:'adaptive'}`, `output_config: {effort:'high', format: <strict JSON schema>}`, přes `@anthropic-ai/sdk`. Přehodnocovací běhy přes **Message Batches API** (−50 %; analýza není latency-kritická, verdikt do 2 h stačí). Systémový prompt (~1500 tokenů, stabilní) s `cache_control: {type:'ephemeral'}`.

Jedna zpráva na zónu = `[baseline image, after image, diff-crop image(s), text s názvem zóny a otázkami z checklist verze]`. Systémový prompt **explicitně vyjmenovává distraktory**, které se klasifikují jako `none` nebo `dirt`, nikdy jako `damage`: jiná denní doba, otevřené/zavřené žaluzie, mokrý povrch po sprše, přesunutý nábytek, drobky, neustlaná postel, odraz blesku, nový stín, jiná pozice polštářů.

**Structured output (strict):**
```jsonc
{
  "zone_key": "kitchen",
  "severity": "none|dirt|wear|damage_minor|damage_major|missing",
  "confidence": 0.0,
  "evidence_bbox": [x, y, w, h],
  "what_changed": "…",
  "alternative_explanation": "…",        // POVINNÉ
  "is_lighting_or_angle_artifact": false,
  "is_guest_mess_not_damage": false,
  "contains_person": false,
  "estimated_cost_czk": { "min": 0, "max": 0 },
  "needs_reshoot": false
}
```
Finální agregační běh (1× na inspekci) dostane všechny nálezy a napíše shrnutí pro majitele česky.

### 9.3 Anti-false-positive vrstva

Falešné obvinění hosta zničí u dvoudomkového provozu víc, než ušetří kauce. Proto **precision před recall, cíl precision na `damage` ≥ 0,9** — raději škodu přehlédnout než vymyslet.

1. **A/B swap:** každý nález `severity ≥ damage_minor` se přehodnocuje druhým během s prohozeným pořadím snímků a opačně formulovanou otázkou. Když se druhý běh netrefí (IoU bboxů < 0,3 nebo severity klesne o 2 stupně), nález se degraduje na `stability='unstable'` a jde jen k lidskému posouzení.
2. **Devil's advocate:** třetí běh s promptem „najdi věrohodný důvod, proč to NENÍ poškození“ → `counter_argument`, který majitel vidí **vedle** obvinění.
3. **Tvrdý strop 8 volání modelu na inspekci** v kódu, aby retry smyčka nevyrobila účet.

### 9.4 Prahy eskalace

| Stav | Podmínka | Akce |
|---|---|---|
| `auto_clear` | všechny zóny `severity ≤ dirt` a min. `confidence ≥ 0,75` | vypořádání do 24 h, hostovi e-mail „vše v pořádku, děkujeme“ |
| `auto_clear` + timeline | `wear` | zápis do `zone_condition_timeline`, žádný nárok |
| `needs_review` | `damage_minor` a `confidence ≥ 0,60` | fronta „ke schválení“ v adminu |
| urgentní | `damage_major` nebo `missing` | okamžitá Web Push notifikace + e-mail |
| nikdy neeskaluje | `align_status='poor'` nebo `needs_reshoot` | jedna (a jediná) žádost hostovi o doplňující foto |
| hostovi se nezobrazí | `confidence < 0,80` | nález existuje jen v adminu |

### 9.5 Lidské schválení

**Luna 5.6 nikdy nekomunikuje s hostem, nikdy nemění stav kauce a nikdy nerozhodne o penězích.** Zápis do `deposits` nebo vystavení dokladu o škodě vyžaduje řádek v `damage_decisions` s `decided_by NOT NULL` a ručně psaným `reason_cs` o délce alespoň 20 znaků — je to databázový constraint, ne konvence. UI nemá tlačítko „Souhlasím s AI“; majitel musí odůvodnění napsat sám, protože dozorový orgán u čl. 22 GDPR zkoumá, zda byl lidský zásah reálný.

Po rozhodnutí jde hostovi do portálu případ s fotkami vedle sebe, částkou, důvodem a **48hodinovou lhůtou na vyjádření** s možností nahrát vlastní fotky. Souhlas = jeden klik. E-mail obsahuje větu: „Proti tomuto posouzení můžete do 14 dnů podat námitku na ahoj@sedmyles.cz; posoudí ji provozovatel osobně.“

### 9.6 Verzování a kalibrace

`checklist_versions` je immutable a rezervace se na ni **pinuje při vytvoření**; bez toho se po první úpravě checklistu rozpadne obhajitelnost starých případů. `baseline_sets` se verzují; po odjezdu s verdiktem `clean` nabídne admin jedno tlačítko „povýšit na novou baseline“. Každý odjezd se porovnává **dvakrát**: proti aktuální baseline (škoda z tohoto pobytu) a proti baseline v0 (kumulativní opotřebení) — to je přesně rozdíl, kvůli kterému se s hosty vede spor. `scripts/luna-eval.ts` s 50 ručně anotovanými páry běží povinně před publikací nové `prompt_version`.

### 9.7 Náklady

Foto 1092×819 ≈ 1 190 vstupních tokenů. Jedna zóna ≈ 3 500 vstupních (systémový prompt v cache) a ~1 200 výstupních tokenů → Opus 5 ≈ 1,10 Kč. Díky CV pre-filtru jde do modelu typicky 3–5 zón z 12 → ~5 Kč + agregace ~1 Kč ≈ **6 Kč na odjezd**, v batch režimu **~3 Kč**. Při 300 odjezdech ročně 900–1 800 Kč/rok. Do `luna_runs` se loguje model, `prompt_version`, tokeny včetně `cache_read`, cena a latence; měsíční alert při překročení stropu v Kč.

---

## 10. Bezpečnost a GDPR

**Autentizace.** Admin: **WebAuthn/passkey primárně** (`@simplewebauthn/server`, `userVerification: required`) — vázaná na origin, takže phishing na jediného provozovatele nefunguje; záloha heslo `argon2id` (`@node-rs/argon2`, m=19456 KiB, t=2, p=1) + TOTP (`otplib`) + 10 offline recovery kódů. **Žádný `/register` endpoint** — účty zakládá `scripts/create-admin.ts` proti whitelistu `ADMIN_EMAILS`. Session: opaque token `crypto.randomBytes(32)`, v DB jen SHA-256 hash, cookie `__Host-sl_admin`, idle 8 h / absolutní 24 h s rotací.

**Autorizace patří do datové vrstvy, ne do middleware.** `lib/auth/dal.ts` exportuje `getGuestSession()` a `requireAdmin(role?)` zabalené v React `cache()` a volá se na začátku **každé** chráněné stránky i route handleru. Middleware dělá jen optimistický redirect podle přítomnosti cookie — spoléhat na něj jako na autorizační vrstvu je architektonická chyba (nepokrývá všechny cesty, historicky obejitelné, CVE-2025-29927).

**Rate limiting.** Současný `const hits = new Map()` v `app/api/rezervace/route.ts` je na serverless dekorace — každá instance má vlastní stav a cold start ho vynuluje. Nahradit `@upstash/ratelimit` nad Upstash Redis (`eu-central-1`), `lib/ratelimit.ts`, klíčováno **IP + cíl** (mobilní CGNAT sdílí IP). Limity: portál login 5/h na VS a 20/h na IP; admin login 5/15 min se zámkem; upload fotky 60/h na rezervaci; veřejné formuláře 5/10 min na IP. Nad tím rate-limit pravidlo ve Vercel WAF na `/api/*` jako druhá, aplikací neobejitelná vrstva.

**Okamžité opravy stávajícího kódu.** V `app/api/rezervace/route.ts` se `data.name`, `data.house` a `data.note` vkládají přímo do HTML e-mailu — útočník tam vloží text „Platbu prosím pošlete na účet…“ a majitel dostane phishing, který vypadá jako vlastní systém. Escapovat helperem `esc()`, validovat vstupy Zodem (`lib/schemas/*`), u všech mutujících handlerů ověřovat hlavičku `Origin`. Přidat hlavičky: CSP s nonce (bez `unsafe-inline`), HSTS s preload, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` s kamerou povolenou jen na `/pobyt`.

**Fotky.** Cloudflare R2 s jurisdikcí EU, blokovaný veřejný přístup, CORS jen pro `sedmyles.cz`. Upload přes presigned PUT (TTL 5 min, vynucený Content-Type, ≤ 15 MB, max 40 fotek na rezervaci), po uploadu server ověří **magic bytes** (`file-type`, ne deklarovaný MIME), přes `sharp` odstraní EXIF včetně GPS, přepočítá na max 2400 px a spočítá SHA-256 jako důkaz integrity. Čtení výhradně přes `/api/portal/photos/[id]`, které po ověření session vydá 302 na signed GET URL s TTL 10 minut. **Žádné trvalé URL nikde, ani v e-mailu.**

**Retence** (vynucená cronem, ne dobrou vůlí): fotky **90 dní** po odjezdu; při otevřeném `damage_case` nebo námitce `legal_hold=true` a posun na rozhodnutí + 3 roky, ale **jen u snímků, které škodu dokládají**, ne u celé sady. `guest_registrations` 6 let. Daňové doklady 10 let. `audit_log` 5 let. `guest_login_tokens` 24 h. E-mailová komunikace 3 roky. Cron `/api/cron/retention` denně v 03:00, chráněný `Authorization: Bearer ${CRON_SECRET}`, reportuje do `audit_log` **i při nulovém výsledku** — tichý cron je podezřelý cron.

**Právní základy.** Rezervace, komunikace, fakturace → čl. 6/1/b. **Fotodokumentace → čl. 6/1/f (oprávněný zájem)**, ne souhlas: souhlas je odvolatelný a nesmí být podmínkou plnění, takže by ho host mohl odvolat den před odjezdem a připravit provozovatele o důkaz. K tomu jednostránkový balanční test v `docs/lia.md` a v zásadách právo vznést námitku dle čl. 21. Účetnictví, DPH, kniha hostů, hlášení cizinců → čl. 6/1/c. Newsletter → souhlas, oddělený nezaškrtnutý checkbox.

**Dokumentace.** `docs/dpia.md` (lehká DPIA — potkávají se zde scoring, rozhodování s finančním dopadem a inovativní použití technologie, tedy tři kritéria WP248) a záznamy o činnostech zpracování dle čl. 30 (výjimka pro malé subjekty se neuplatní, zpracování není příležitostné). Oboje verzované v gitu.

**Zpracovatelské smlouvy** podepsané **před prvním ostrým nahráním fotky**: Vercel, Neon (`eu-central-1`), Cloudflare R2 (EU), Resend, Fakturoid, Anthropic (Commercial Terms + DPA + SCC + **zero data retention addendum**). Do promptu se posílají **jen fotky a ID rezervace** — žádné jméno, e-mail ani VS; model k posouzení podlahy nepotřebuje vědět, čí je to domek. Seznam zpracovatelů se zveřejní v `app/ochrana-osobnich-udaju`.

**Fotky osob.** V UI instrukce „Nefoťte prosím sebe ani jiné osoby“; `contains_person: true` z Luny → snímek se okamžitě označí, majiteli se nezobrazí a maže se do 24 h.

**Zálohy a bus factor.** Neon point-in-time restore + denní `pg_dump` šifrovaný do odděleného úložiště + týdenní CSV export rezervací e-mailem majiteli + iCal feed obou domků v jeho Google kalendáři jako offline záchranná kopie čitelná bez systému. Povinný druhý admin účet nebo passkey na druhém zařízení už při zavádění.

---

## 11. Technologická rozhodnutí

| Oblast | Rozhodnutí | Proč (jedna věta) | Záloha |
|---|---|---|---|
| Databáze | **Neon Postgres** (Vercel Marketplace, `eu-central-1`) | `btree_gist` EXCLUDE constraint je jediná spolehlivá ochrana proti overbookingu a Neon má point-in-time restore. | Supabase Postgres |
| ORM | **Drizzle** | Umí deklarovat raw constraints a generovat migrace bez runtime overheadu; Prisma by EXCLUDE musela obcházet raw migrací. | Kysely |
| Peníze | **`bigint` v haléřích** | ComGate i SPAYD pracují v haléřích a float vyrobí rozdíl 0,01 Kč při párování. | — |
| Storage fotek i dokladů | **Cloudflare R2, jurisdikce EU**, private, signed URL | Fotky interiéru a doklady musí zůstat v EU a nikdy nesmí mít trvalé URL. | Vercel Blob `access:'private'` |
| Auth admin | **WebAuthn passkey + argon2id/TOTP, vlastní session v DB** | Jeden uživatel nepotřebuje SaaS identity provider za 25 USD měsíčně a passkey odolá phishingu. | Auth.js v5 credentials + TOTP |
| Auth host | **Magic link + VS/přístupový kód (HMAC)**, opaque session | VS je veřejný identifikátor, ne tajemství, a musí jít revokovat. | jen magic link |
| Fakturace | **Fakturoid API v3** | Číselné řady, ISDOC, dobropisy a archivace za 400 Kč měsíčně místo čtyř týdnů práce a trvalého rizika. | vlastní PDF `@react-pdf/renderer` + ISDOC 6.0.2 přes `fast-xml-parser` |
| PDF (potvrzení, voucher, protokol) | **`@react-pdf/renderer`** s registrovaným fontem s plnou diakritikou | Čistý Node, funguje na Vercelu, žádný Chromium; Helvetica nemá ř/ě/ů. | `pdf-lib` |
| QR | **`qrcode` v1.5.4 server-side**, vlastní SPAYD generátor | Externí generátor posílá číslo účtu třetí straně a v PDF nefunguje. | `uqr` (edge, jen SVG) |
| Banka | **Fio read-only token API**, `/periods/` | Jediné české bankovní API zdarma, bez PSD2 re-autentizace a bez schvalování. | import camt.053 / GPC + ruční potvrzení |
| Brána | **ComGate REST v2.0** za `PaymentProvider`, `mock` do zasmluvnění | Redirect flow drží projekt na PCI SAQ A a preauth pokryje budoucí kauci. | GoPay adaptér za týmž rozhraním |
| E-mail | **Resend** (transakční, DKIM, CID přílohy) | Doklady a QR musí spolehlivě dorazit; sdílený SMTP Forpsi má horší doručitelnost. | stávající `nodemailer` + Forpsi SMTP |
| Push | **Web Push (VAPID) v PWA** | iOS 16.4+ zvládne push v nainstalované PWA, takže nativní aplikace není potřeba. | denní souhrn e-mailem v 7:00 |
| SMS (v2) | **SMSbrána.cz** | ~1,50 Kč/ks, tři zprávy za pobyt = ~500 Kč/rok. | žádné SMS |
| Rate limit | **Upstash Redis + `@upstash/ratelimit`** | Paměťová `Map` na serverless nefunguje napříč instancemi. | Postgres tabulka s TTL |
| Cron | **Vercel Cron** (vyžaduje plán Pro) | Je v témže projektu a chráněný `CRON_SECRET`. | cron-job.org volající tytéž endpointy |
| CV | **`@techstark/opencv-js` (WASM) + `sharp`** | ORB homografie a SSIM v Node bez nativní kompilace. | `jimp` + vlastní SSIM (pomalejší) |
| Model | **`claude-opus-5`, batch režim** | Rozlišení nepořádku od poškození je přesně to, kde slabší model dělá drahé chyby. | Claude přes AWS Bedrock `eu-central-1` (data residency) |
| Testy | **Playwright** (repo už má `.playwright-mcp`) + Vitest na SPAYD, ceny, VS, číselné řady | Kritické cesty jsou platba a doklad, ne UI detaily. | — |

---

## 12. Roadmapa implementace

Pořadí je závazné. Každý krok končí nasazeným a otestovaným stavem; nic se nepředbíhá.

### v0 — Ostrý kalendář a peníze

1. **Infrastruktura:** Neon `eu-central-1`, Drizzle, `btree_gist`/`pg_trgm`/`unaccent`, Upstash Redis, R2 bucket s EU jurisdikcí a blokovaným veřejným přístupem (startovací skript, který **fail-fast** ohlásí veřejný bucket), `.env.example` doplněný o `DATABASE_URL`, `BANK_IBAN`, `BANK_BIC`, `BANK_DISPLAY`, `PORTAL_SECRET`, `PAYMENTS_SIGNING_KEY`, `CRON_SECRET`, `DATA_ENC_KEY`, `ADMIN_EMAILS`, `FIO_TOKEN`, `RESEND_KEY`, `COMGATE_*`, `ANTHROPIC_API_KEY`.
2. **Schéma celé** podle §3 v jedné migraci, včetně tabulek pro v1 a v2 (sloupce navíc nic nestojí, migrace historických dokladů ano). Seed: `units` (achat, mech, cely-les + `unit_components`), `price_items`, `addons` z `lib/content.ts`, `cancel_policies`, `company_settings`.
3. **Bezpečnostní záplaty stávajícího kódu:** `esc()` v e-mailech, Zod schémata, kontrola `Origin`, security hlavičky, rate limit přesunutý do Redisu.
4. **`scripts/seed-rates.ts`** — vygeneruje 24 měsíců `rate_calendar` z dnešních pravidel (2 890 / 3 490 / +400, min. 2 noci) pro obě jednotky a pro `cely-les` (2× cena − 10 %).
5. **Serverový výpočet ceny:** `lib/pricing/server.ts` čte `rate_calendar` + `discount_rules`, `calcPrice` v `lib/booking.ts` se stane tenkou obálkou pro UI. Klientská částka se při vytvoření rezervace jen porovná a při neshodě vrací 409.
6. **Smazat `getBookedDays` a `seededRandom`** ve stejném commitu jako napojení dostupnosti na DB; upravit `components/booking/BookingWizard.tsx` a `components/house/Availability.tsx`; přidat test, který **selže**, když se v buildu objeví generovaná dostupnost.
7. **Generátor VS** (`lib/reservations/vs.ts`, mod 11) + `code` (SL-RR-NNNN) + `search_text`.
8. **Vytvoření rezervace v transakci:** `reservations` + `reservation_units` (odchyt SQLSTATE 23P01 → „termín právě obsadil někdo jiný“) + zmrazení `reservation_items` + `payments(deposit)`. Pravidlo: příjezd ≤ 48 h nebo `cely-les` → `inquiry` bez blokace.
9. **SPAYD + QR** (`lib/payments/spayd.ts`, `lib/payments/qr.ts`) s unit testy na abecedu a délky; podepsaný endpoint `/api/platba/qr`.
10. **`PaymentProvider`** + `qr` a `mock` implementace + `/dev/platebni-brana` se třemi tlačítky, která posílá vlastní validní webhook.
11. **E-maily** (Resend, `lib/mail.ts`): potvrzení rezervace s QR jako CID přílohou, upomínka, uvolnění termínu, notifikace majiteli.
12. **Admin auth:** passkey + argon2id/TOTP, `lib/auth/dal.ts`, `scripts/create-admin.ts`, `audit_log` s hash řetězem.
13. **Admin `/admin` (Dnes)** — čtyři karty, jeden SELECT, `tasks` fronta. Otestovat na reálném telefonu venku.
14. **Admin kalendář** — mobilní 14denní pás a desktopová timeline na CSS gridu.
15. **Ruční rezervace** (bottom sheet, 4 pole, přepis ceny s povinným důvodem) a **detail rezervace** s časovou osou.
16. **Blokace termínů** (`calendar_blocks`) tažením v kalendáři.
17. **Fio párování** (`/api/cron/fio-pull`, `/periods/`, překryv 7 dní) + import GPC/camt.053 + ruční „Označit zaplaceno“ + fronta nespárovaných.
18. **Crony:** `expire-holds` (á 15 min), `splatnosti` (denně 9:00), `denni-souhrn` (7:00), `platby-sync` (á 10 min). Všechny za `CRON_SECRET`.
19. **iCal export** `/api/ical/[unitSlug]/[token].ics` — `VALUE=DATE`, `DTEND` exkluzivní, stabilní UID, `SUMMARY: Rezervováno` bez osobních údajů, `Cache-Control: no-cache`.
20. **Admin Ceny** a **Nastavení**. Ověřit OZV obce Jílové u Držkova a zapsat sazbu poplatku.
21. **Zálohy:** `pg_dump` cron, týdenní CSV majiteli, druhý admin přístup.

### v1 — Doklady, portál, Luna

22. **Fakturoid integrace:** OAuth client credentials, mapování `invoice_lines` → Fakturoid, řady ZAL / FAK / OPD, `invoice_series` lokálně jako pojistka, `document_blobs` s SHA-256 a hash řetězem.
23. **Storno flow:** výpočet vratky z `cancel_policy_snapshot`, `refunds(proposed)` → potvrzení → vratka → **až pak** dobropis; nedaňový doklad na stornovací poplatek.
24. **Přepracovat `content/obchodni-podminky.md`** — kauce se neúčtuje, škoda se doúčtuje do 7 dnů podle fotoprotokolu, amnestie −30 % za vlastní nahlášení, informace o AI vyhodnocení. Bez tohoto kroku je rozpor mezi webem a systémem.
25. **Hostovský portál:** přihlášení (magic link + VS/kód), `/pobyt/prehled`, doklady, QR na doplatek.
26. **Kniha hostů:** `/pobyt/hoste` → `guest_registrations`, šifrované číslo dokladu, připomínka T−3, admin export, čtvrtletní report poplatku obci.
27. **PWA a offline:** service worker, IndexedDB fronta, `workbox-background-sync`, Web Push (VAPID) pro čtyři typy událostí, žádné push mezi 21:00 a 7:00.
28. **Checklist editor** v adminu + `checklist_versions` + pin na rezervaci + náhled „jak to uvidí host“.
29. **Baseline:** admin nafotí 12 zón × 3 světelné varianty pro oba domky, `dhash64` a `mean_luminance` se počítají při uploadu.
30. **Foto-protokol v portálu:** ghost overlay, dHash navádění, offline upload, nepřeskočitelný GDPR panel s `privacy_ack`.
31. **CV pipeline** (`lib/luna/align.ts`, `diff.ts`) + `photo_pairs`; ověřit na baseline vs. baseline (musí vycházet `clean`).
32. **Luna 5.6** (`lib/luna/prompt.ts`, `schema.ts`, `run.ts`): párový prompt, structured output, prompt caching, A/B swap, devil's advocate, agregace, strop 8 volání, `luna_runs` s náklady.
33. **Fronta inspekcí a `damage_decisions`** s DB constraintem na `decided_by` a délku odůvodnění; případ škody v portálu s 48h lhůtou; doklad o náhradě škody vs. služba s DPH jako **dvě různá tlačítka**.
34. **Retenční cron** + `legal_hold` + report do `audit_log`; `docs/dpia.md`, `docs/lia.md`, aktualizace `app/ochrana-osobnich-udaju` se seznamem zpracovatelů.
35. **`scripts/luna-eval.ts`** s 50 anotovanými páry, povinný běh před publikací nové `prompt_version`.

### v2 — Rozšíření (podle poptávky, ne podle plánu)

36. ComGate adaptér ostrý: `POST /config.json`, webhook s trojitou obranou, návratové routy, rekonciliace výplat, Apple/Google Pay marks, onboarding checklist na platební stránce (IČO, sídlo, kontakt, cena včetně všech poplatků, odkaz na OP a storno, „Platby zajišťuje Comgate Payments, a.s.“).
37. Preautorizace karty jako volitelný režim kauce — předtím si od ComGate písemně vyžádat povolení preauth, reálnou platnost blokace ve dnech a přiřazené MCC 7011.
38. iCal import z Booking/Airbnb (`node-ical`, á 15 min, `ota_hold`) + alert při `last_sync_at` starším než 2 h + denní kontrola překryvů.
39. Prodej spojené jednotky „Celý les“ na webu (model už existuje), export do iCal **obou** domků.
40. Vouchery, eTurista/UBYPORT dávky, statistiky (obsazenost, ADR, RevPAR, podíl kanálů), anglická verze rezervačního flow a portálu, role úklid/účetní.

---

### Otevřené body k rozhodnutí majitele před startem v1

1. **OZV obce Jílové u Držkova** — má obec zavedený poplatek z pobytu, jakou sazbu a jaké lhůty? Do ověření `city_tax_cents = 0`.
2. **Banka** — Fio je jediná s použitelným read-only API zdarma; pokud provozovatel Fio nemá, párování bude probíhat importem výpisu a ručně.
3. **Kauce** — potvrdit přechod na „neúčtujeme, škodu doúčtujeme“, protože to mění text webu a obchodních podmínek.
4. **Fakturoid** — založit účet a předat přístup účetní.
5. **Vercel plán Pro** — nutný kvůli cronům.
