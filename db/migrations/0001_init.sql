-- ============================================================================
--  Sedmý les — počáteční schéma (v0 + připravené tabulky pro v1 a v2)
--
--  Generováno z SYSTEM.md skriptem scripts/dev/build-migration.py.
--  NEUPRAVUJ ručně: uprav SYSTEM.md a vygeneruj znovu (npm run db:migration).
--
--  Konvence:
--    · peníze jsou bigint v haléřích
--    · pobytové termíny jsou date, intervaly půlotevřené [)
--    · nic se nemaže — rezervace se stornuje, doklad se opravuje dobropisem
--
--  Diakritiku ve vyhledávání srovnáváme v aplikaci (lib/db/text.ts), takže
--  rozšíření unaccent není potřeba — schéma tím jede i na PGlite v testech.
-- ============================================================================


-- ---------- rozšíření ----------
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------- výčtové typy ----------
CREATE TYPE reservation_status AS ENUM
  ('inquiry','hold','confirmed','checked_in','checked_out','closed','cancelled','expired','no_show');

CREATE TYPE payment_state AS ENUM
  ('unpaid','deposit_paid','paid','overpaid','refunded');

CREATE TYPE deposit_state AS ENUM
  ('not_required','held','settled','partially_forfeited','forfeited');

-- ---------- tabulky (seřazeno podle cizích klíčů) ----------
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

CREATE TABLE audit_log (              -- append-only, aplikační role nemá UPDATE ani DELETE
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  actor_type text NOT NULL CHECK (actor_type IN ('admin','guest','system','agent')),
  actor_id text, action text NOT NULL,
  entity_type text NOT NULL, entity_id text NOT NULL,
  diff jsonb, ip inet, user_agent text,
  prev_hash text, hash text
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

CREATE TABLE baseline_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_slug text NOT NULL, version int NOT NULL,
  valid_from timestamptz NOT NULL, valid_to timestamptz,
  note text, promoted_from_inspection_id uuid,
  UNIQUE (unit_slug, version)
);

CREATE TABLE cancel_policies (
  id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name   text NOT NULL,
  tiers  jsonb NOT NULL,   -- [{"days_before":30,"refund_bp":10000},{"days_before":14,"refund_bp":5000},{"days_before":0,"refund_bp":0}]
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE checklist_templates (      -- živý draft
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, unit_slug text,   -- NULL = společný
  draft_json jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by text
);

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

CREATE TABLE invoice_series (
  code         text NOT NULL,      -- ZAL | DZP | FAK | OPD | POU
  year         int NOT NULL,
  last_number  int NOT NULL DEFAULT 0,
  format_mask  text NOT NULL DEFAULT '{code}-{year}-{seq:04}',
  PRIMARY KEY (code, year)
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

CREATE TABLE baseline_shots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_set_id uuid NOT NULL REFERENCES baseline_sets(id),
  zone_key text NOT NULL,
  light_variant text NOT NULL CHECK (light_variant IN ('day','overcast','artificial')),
  storage_key text NOT NULL, dhash64 bigint NOT NULL,
  mean_luminance real NOT NULL, device_orientation jsonb,
  guide_outline_svg text
);

CREATE TABLE checklist_versions (       -- immutable publikace
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES checklist_templates(id),
  semver text NOT NULL, schema_json jsonb NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(), published_by text,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (template_id, semver)
);

CREATE TABLE ical_feeds (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id       uuid NOT NULL REFERENCES units(id),
  channel       text NOT NULL,     -- booking | airbnb
  url           text NOT NULL,
  last_sync_at  timestamptz, last_sync_status text, last_error text,
  events_count  int, active boolean NOT NULL DEFAULT true
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

-- Rozpad virtuální jednotky na fyzické. cely-les -> achat, mech.
CREATE TABLE unit_components (
  composite_unit_id uuid NOT NULL REFERENCES units(id),
  member_unit_id    uuid NOT NULL REFERENCES units(id),
  PRIMARY KEY (composite_unit_id, member_unit_id)
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

CREATE TABLE guest_login_tokens (   -- magic link
  id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  token_hash text NOT NULL,        -- sha256(randomBytes(32))
  expires_at timestamptz NOT NULL, -- +30 min
  used_at timestamptz, requested_ip inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

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

CREATE TABLE guest_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(),
  idle_expires_at timestamptz NOT NULL, absolute_expires_at timestamptz NOT NULL,
  revoked_at timestamptz
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

CREATE TABLE privacy_ack (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  doc_key text NOT NULL,           -- photo_protocol_notice | terms | privacy
  doc_version text NOT NULL,
  acknowledged_at timestamptz NOT NULL DEFAULT now(), ip inet
);

CREATE TABLE reservation_guests (
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  guest_id       uuid NOT NULL REFERENCES guests(id),
  role           text NOT NULL CHECK (role IN ('payer','companion')),
  PRIMARY KEY (reservation_id, guest_id)
);

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

CREATE TABLE zone_condition_timeline (
  id bigserial PRIMARY KEY,
  unit_slug text NOT NULL, zone_key text NOT NULL,
  inspection_id uuid NOT NULL REFERENCES inspections(id),
  occurred_on date NOT NULL,
  wear_score real NOT NULL, ssim_vs_baseline_v0 real, severity_max text
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

CREATE TABLE luna_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id uuid NOT NULL REFERENCES luna_findings(id),
  human_label text NOT NULL CHECK (human_label IN ('true_positive','false_positive','missed')),
  note text, created_at timestamptz NOT NULL DEFAULT now()
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
  invoice_id uuid
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

CREATE TABLE document_blobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid,
  kind        text NOT NULL CHECK (kind IN ('PDF','ISDOC','ATTACHMENT','YEAR_ARCHIVE_ZIP')),
  storage_key text NOT NULL,     -- 2026/FAK/FAK-2026-0042.pdf
  mime_type   text NOT NULL, byte_size bigint NOT NULL,
  sha256      text NOT NULL, prev_sha256 text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  retain_until date NOT NULL     -- issue_date + 10 let
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

CREATE TABLE invoice_relations (
  parent_invoice_id uuid NOT NULL REFERENCES invoices(id),
  child_invoice_id  uuid NOT NULL REFERENCES invoices(id),
  relation_type text NOT NULL CHECK (relation_type IN
                ('SETTLES_ADVANCE','CORRECTS','ISSUED_FROM_PROFORMA')),
  amount_cents  bigint,
  PRIMARY KEY (parent_invoice_id, child_invoice_id, relation_type)
);

CREATE TABLE invoice_vat_summary (
  invoice_id uuid NOT NULL REFERENCES invoices(id),
  vat_rate   int,
  base_cents bigint NOT NULL, vat_cents bigint NOT NULL, total_cents bigint NOT NULL,
  PRIMARY KEY (invoice_id, vat_rate)
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

-- ---------- indexy ----------
CREATE INDEX ON reservations USING gin (search_text gin_trgm_ops);
CREATE INDEX ON reservations (checkin);
CREATE INDEX ON reservations (status, hold_expires_at);
CREATE UNIQUE INDEX ON guests (lower(email)) WHERE email IS NOT NULL AND anonymized_at IS NULL;
CREATE INDEX ON payments (variable_symbol);
CREATE INDEX ON payments (status, due_at);

-- ---------- cizí klíče v cyklu (doplněné až po vytvoření všech tabulek) ----------
ALTER TABLE damage_decisions ADD CONSTRAINT damage_decisions_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id);
ALTER TABLE document_blobs ADD CONSTRAINT document_blobs_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id);
