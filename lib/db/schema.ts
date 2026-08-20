// !!! GENEROVANÝ SOUBOR — needituj ho ručně !!!
//
// Vzniká příkazem `npm run db:pull`, který si typy načte z živé databáze.
// Zdrojem pravdy je SQL v db/migrations/ (generované ze SYSTEM.md), protože
// obsahuje omezení, která Drizzle neumí popsat — hlavně EXCLUDE USING gist
// nad reservation_units, což je jediná spolehlivá ochrana proti dvojímu prodeji.
//
// Chceš změnit schéma? Uprav SYSTEM.md → npm run db:migration → nová migrace
// → npm run db:migrate → npm run db:pull.

import { pgTable, text, timestamp, unique, uuid, integer, check, bigserial, jsonb, inet, boolean, date, bigint, char, smallint, uniqueIndex, foreignKey, real, numeric, index, type AnyPgColumn, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { customType } from "drizzle-orm/pg-core"

/** Binární sloupec (bytea) — drizzle ho nemá vestavěný. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
	dataType: () => "bytea",
})

export const depositState = pgEnum("deposit_state", ['not_required', 'held', 'settled', 'partially_forfeited', 'forfeited'])
export const paymentState = pgEnum("payment_state", ['unpaid', 'deposit_paid', 'paid', 'overpaid', 'refunded'])
export const reservationStatus = pgEnum("reservation_status", ['inquiry', 'hold', 'confirmed', 'checked_in', 'checked_out', 'closed', 'cancelled', 'expired', 'no_show'])


export const migrace = pgTable("_migrace", {
	jmeno: text().primaryKey().notNull(),
	otisk: text().notNull(),
	spustenoV: timestamp("spusteno_v", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const baselineSets = pgTable("baseline_sets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	unitSlug: text("unit_slug").notNull(),
	version: integer().notNull(),
	validFrom: timestamp("valid_from", { withTimezone: true, mode: 'string' }).notNull(),
	validTo: timestamp("valid_to", { withTimezone: true, mode: 'string' }),
	note: text(),
	promotedFromInspectionId: uuid("promoted_from_inspection_id"),
}, (table) => [
	unique("baseline_sets_unit_slug_version_key").on(table.unitSlug, table.version),
]);

export const auditLog = pgTable("audit_log", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	actorType: text("actor_type").notNull(),
	actorId: text("actor_id"),
	action: text().notNull(),
	entityType: text("entity_type").notNull(),
	entityId: text("entity_id").notNull(),
	diff: jsonb(),
	ip: inet(),
	userAgent: text("user_agent"),
	prevHash: text("prev_hash"),
	hash: text(),
}, (table) => [
	check("audit_log_actor_type_check", sql`actor_type = ANY (ARRAY['admin'::text, 'guest'::text, 'system'::text, 'agent'::text])`),
]);

export const cancelPolicies = pgTable("cancel_policies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	tiers: jsonb().notNull(),
	active: boolean().default(true).notNull(),
});

export const checklistTemplates = pgTable("checklist_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	unitSlug: text("unit_slug"),
	draftJson: jsonb("draft_json").notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedBy: text("updated_by"),
});

export const bankTransactions = pgTable("bank_transactions", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	source: text().notNull(),
	externalId: text("external_id").notNull(),
	bookedOn: date("booked_on").notNull(),
	amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
	currency: char({ length: 3 }).notNull(),
	variableSymbol: text("variable_symbol"),
	specificSymbol: text("specific_symbol"),
	constantSymbol: text("constant_symbol"),
	counterAccount: text("counter_account"),
	counterAccountName: text("counter_account_name"),
	message: text(),
	raw: jsonb(),
	matchStatus: text("match_status").default('UNMATCHED').notNull(),
	importedAt: timestamp("imported_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("bank_transactions_source_external_id_key").on(table.externalId, table.source),
	check("bank_transactions_source_check", sql`source = ANY (ARRAY['FIO_API'::text, 'GPC'::text, 'CAMT053'::text, 'MANUAL'::text])`),
	check("bank_transactions_match_status_check", sql`match_status = ANY (ARRAY['UNMATCHED'::text, 'MATCHED'::text, 'REVIEW'::text, 'IGNORED'::text])`),
]);

export const adminUsers = pgTable("admin_users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	name: text().notNull(),
	role: text().default('owner').notNull(),
	passwordHash: text("password_hash"),
	totpSecretEnc: bytea("totp_secret_enc"),
	recoveryCodesHash: text("recovery_codes_hash").array(),
	pushSubscription: jsonb("push_subscription"),
	notificationPrefs: jsonb("notification_prefs"),
	isActive: boolean("is_active").default(true).notNull(),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	unique("admin_users_email_key").on(table.email),
	check("admin_users_role_check", sql`role = ANY (ARRAY['owner'::text, 'accountant'::text, 'cleaner'::text])`),
]);

export const companySettings = pgTable("company_settings", {
	id: smallint().default(1).primaryKey().notNull(),
	legalName: text("legal_name").notNull(),
	ico: text().notNull(),
	dic: text(),
	address: jsonb().notNull(),
	bankIban: text("bank_iban").notNull(),
	bankBic: text("bank_bic").notNull(),
	bankDisplay: text("bank_display").notNull(),
	vatPayer: boolean("vat_payer").default(false).notNull(),
	vatPayerFrom: date("vat_payer_from"),
	vatPeriod: char("vat_period", { length: 1 }),
	cityTaxCents: bigint("city_tax_cents", { mode: "number" }).default(0).notNull(),
	cityTaxOzvRef: text("city_tax_ozv_ref"),
	cityTaxValidFrom: date("city_tax_valid_from"),
	invoiceDueDays: integer("invoice_due_days").default(14).notNull(),
	depositShareBp: integer("deposit_share_bp").default(5000).notNull(),
	depositDueDays: integer("deposit_due_days").default(3).notNull(),
	balanceDueDaysBefore: integer("balance_due_days_before").default(14).notNull(),
	securityDepositCents: bigint("security_deposit_cents", { mode: "number" }).default(300000).notNull(),
	securityDepositMode: text("security_deposit_mode").default('CONTRACTUAL_ONLY').notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	check("company_settings_id_check", sql`id = 1`),
	check("company_settings_vat_period_check", sql`vat_period = ANY (ARRAY['M'::bpchar, 'Q'::bpchar])`),
	check("company_settings_security_deposit_mode_check", sql`security_deposit_mode = ANY (ARRAY['CONTRACTUAL_ONLY'::text, 'COLLECTED'::text, 'CARD_PREAUTH'::text])`),
]);

export const discountRules = pgTable("discount_rules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	label: text().notNull(),
	kind: text().notNull(),
	minNights: integer("min_nights"),
	daysBefore: integer("days_before"),
	percentBp: integer("percent_bp").notNull(),
	appliesTo: text("applies_to").default('accommodation').notNull(),
	validFrom: date("valid_from"),
	validTo: date("valid_to"),
	active: boolean().default(true).notNull(),
}, (table) => [
	unique("discount_rules_code_key").on(table.code),
	check("discount_rules_kind_check", sql`kind = ANY (ARRAY['length'::text, 'lastminute'::text, 'manual'::text])`),
]);

export const priceItems = pgTable("price_items", {
	code: text().primaryKey().notNull(),
	name: text().notNull(),
	czCpa: text("cz_cpa"),
	vatRate: integer("vat_rate"),
	lineKind: text("line_kind").notNull(),
	validFrom: date("valid_from").notNull(),
	validTo: date("valid_to"),
}, (table) => [
	check("price_items_line_kind_check", sql`line_kind = ANY (ARRAY['TAXABLE'::text, 'PASS_THROUGH'::text, 'SECURITY_DEPOSIT'::text, 'DISCOUNT'::text, 'ADVANCE_DEDUCTION'::text, 'ROUNDING'::text])`),
]);

export const guests = pgTable("guests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	email: text(),
	phoneE164: text("phone_e164"),
	address: jsonb(),
	countryCode: char("country_code", { length: 2 }),
	isCompany: boolean("is_company").default(false).notNull(),
	billingName: text("billing_name"),
	billingIco: text("billing_ico"),
	billingDic: text("billing_dic"),
	marketingConsentAt: timestamp("marketing_consent_at", { withTimezone: true, mode: 'string' }),
	note: text(),
	lastStayAt: date("last_stay_at"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	anonymizedAt: timestamp("anonymized_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	uniqueIndex("guests_lower_idx").using("btree", sql`lower(email)`).where(sql`((email IS NOT NULL) AND (anonymized_at IS NULL))`),
]);

export const reportBatches = pgTable("report_batches", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	target: text().notNull(),
	periodFrom: date("period_from").notNull(),
	periodTo: date("period_to").notNull(),
	status: text().default('generated').notNull(),
	blobKey: text("blob_key"),
	rowsCount: integer("rows_count"),
	dueAt: timestamp("due_at", { withTimezone: true, mode: 'string' }),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }),
	confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: 'string' }),
	errorMessage: text("error_message"),
}, (table) => [
	check("report_batches_target_check", sql`target = ANY (ARRAY['ETURISTA'::text, 'UBYPORT'::text, 'CITY_TAX'::text])`),
	check("report_batches_status_check", sql`status = ANY (ARRAY['generated'::text, 'submitted'::text, 'confirmed'::text, 'error'::text])`),
]);

export const units = pgTable("units", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	capacity: integer().notNull(),
	areaM2: integer("area_m2"),
	isVirtual: boolean("is_virtual").default(false).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	icalToken: text("ical_token").notNull(),
	active: boolean().default(true).notNull(),
}, (table) => [
	unique("units_slug_key").on(table.slug),
	unique("units_ical_token_key").on(table.icalToken),
]);

export const addons = pgTable("addons", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	priceCents: bigint("price_cents", { mode: "number" }).notNull(),
	unit: text().notNull(),
	priceItemCode: text("price_item_code").notNull(),
	maxQty: integer("max_qty").default(1).notNull(),
	availableFrom: date("available_from"),
	availableTo: date("available_to"),
	active: boolean().default(true).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.priceItemCode],
			foreignColumns: [priceItems.code],
			name: "addons_price_item_code_fkey"
		}),
	check("addons_unit_check", sql`unit = ANY (ARRAY['per_stay'::text, 'per_day'::text, 'per_piece'::text])`),
]);

export const adminCredentials = pgTable("admin_credentials", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	adminUserId: uuid("admin_user_id").notNull(),
	credentialId: text("credential_id").notNull(),
	publicKey: bytea("public_key").notNull(),
	signCount: bigint("sign_count", { mode: "number" }).default(0).notNull(),
	transports: text().array(),
	aaguid: text(),
	label: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.adminUserId],
			foreignColumns: [adminUsers.id],
			name: "admin_credentials_admin_user_id_fkey"
		}),
	unique("admin_credentials_credential_id_key").on(table.credentialId),
]);

export const adminSessions = pgTable("admin_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	adminUserId: uuid("admin_user_id").notNull(),
	tokenHash: text("token_hash").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	idleExpiresAt: timestamp("idle_expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	absoluteExpiresAt: timestamp("absolute_expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	ip: inet(),
	userAgentHash: text("user_agent_hash"),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.adminUserId],
			foreignColumns: [adminUsers.id],
			name: "admin_sessions_admin_user_id_fkey"
		}),
	unique("admin_sessions_token_hash_key").on(table.tokenHash),
]);

export const baselineShots = pgTable("baseline_shots", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	baselineSetId: uuid("baseline_set_id").notNull(),
	zoneKey: text("zone_key").notNull(),
	lightVariant: text("light_variant").notNull(),
	storageKey: text("storage_key").notNull(),
	dhash64: bigint({ mode: "number" }).notNull(),
	meanLuminance: real("mean_luminance").notNull(),
	deviceOrientation: jsonb("device_orientation"),
	guideOutlineSvg: text("guide_outline_svg"),
}, (table) => [
	foreignKey({
			columns: [table.baselineSetId],
			foreignColumns: [baselineSets.id],
			name: "baseline_shots_baseline_set_id_fkey"
		}),
	check("baseline_shots_light_variant_check", sql`light_variant = ANY (ARRAY['day'::text, 'overcast'::text, 'artificial'::text])`),
]);

export const checklistVersions = pgTable("checklist_versions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	templateId: uuid("template_id").notNull(),
	semver: text().notNull(),
	schemaJson: jsonb("schema_json").notNull(),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	publishedBy: text("published_by"),
	isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [checklistTemplates.id],
			name: "checklist_versions_template_id_fkey"
		}),
	unique("checklist_versions_template_id_semver_key").on(table.semver, table.templateId),
]);

export const icalFeeds = pgTable("ical_feeds", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	unitId: uuid("unit_id").notNull(),
	channel: text().notNull(),
	url: text().notNull(),
	lastSyncAt: timestamp("last_sync_at", { withTimezone: true, mode: 'string' }),
	lastSyncStatus: text("last_sync_status"),
	lastError: text("last_error"),
	eventsCount: integer("events_count"),
	active: boolean().default(true).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.unitId],
			foreignColumns: [units.id],
			name: "ical_feeds_unit_id_fkey"
		}),
]);

export const guestSessions = pgTable("guest_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	reservationId: uuid("reservation_id").notNull(),
	tokenHash: text("token_hash").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	idleExpiresAt: timestamp("idle_expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	absoluteExpiresAt: timestamp("absolute_expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.reservationId],
			foreignColumns: [reservations.id],
			name: "guest_sessions_reservation_id_fkey"
		}),
	unique("guest_sessions_token_hash_key").on(table.tokenHash),
]);

export const calendarBlocks = pgTable("calendar_blocks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	unitId: uuid("unit_id").notNull(),
	dateFrom: date("date_from").notNull(),
	dateTo: date("date_to").notNull(),
	kind: text().notNull(),
	reason: text(),
	sourceFeedId: uuid("source_feed_id"),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.unitId],
			foreignColumns: [units.id],
			name: "calendar_blocks_unit_id_fkey"
		}),
	foreignKey({
			columns: [table.sourceFeedId],
			foreignColumns: [icalFeeds.id],
			name: "calendar_blocks_source_feed_id_fkey"
		}),
	check("calendar_blocks_kind_check", sql`kind = ANY (ARRAY['maintenance'::text, 'owner'::text, 'closed'::text, 'ota_hold'::text])`),
]);

export const checklistZones = pgTable("checklist_zones", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	checklistVersionId: uuid("checklist_version_id").notNull(),
	zoneKey: text("zone_key").notNull(),
	label: text().notNull(),
	orderIndex: integer("order_index").notNull(),
	required: boolean().default(true).notNull(),
	shotsCount: integer("shots_count").default(1).notNull(),
	guideText: text("guide_text").notNull(),
	llmQuestions: jsonb("llm_questions").default([]).notNull(),
	escalationThreshold: numeric("escalation_threshold", { precision: 3, scale:  2 }).default('0.80').notNull(),
	repairCostHintCents: bigint("repair_cost_hint_cents", { mode: "number" }),
}, (table) => [
	foreignKey({
			columns: [table.checklistVersionId],
			foreignColumns: [checklistVersions.id],
			name: "checklist_zones_checklist_version_id_fkey"
		}),
	unique("checklist_zones_checklist_version_id_zone_key_key").on(table.checklistVersionId, table.zoneKey),
]);

export const reservations = pgTable("reservations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	variableSymbol: text("variable_symbol").notNull(),
	unitId: uuid("unit_id").notNull(),
	checkin: date().notNull(),
	checkout: date().notNull(),
	status: reservationStatus().default('inquiry').notNull(),
	paymentState: paymentState("payment_state").default('unpaid').notNull(),
	depositState: depositState("deposit_state").default('not_required').notNull(),
	source: text().default('web').notNull(),
	adults: integer().default(2).notNull(),
	childrenU18: integer("children_u18").default(0).notNull(),
	totalCents: bigint("total_cents", { mode: "number" }).default(0).notNull(),
	accommodationCents: bigint("accommodation_cents", { mode: "number" }).default(0).notNull(),
	addonsCents: bigint("addons_cents", { mode: "number" }).default(0).notNull(),
	discountCents: bigint("discount_cents", { mode: "number" }).default(0).notNull(),
	cityTaxCents: bigint("city_tax_cents", { mode: "number" }).default(0).notNull(),
	depositRequiredCents: bigint("deposit_required_cents", { mode: "number" }).default(0).notNull(),
	paidCents: bigint("paid_cents", { mode: "number" }).default(0).notNull(),
	cancelPolicyId: uuid("cancel_policy_id"),
	cancelPolicySnapshot: jsonb("cancel_policy_snapshot"),
	cityTaxRateSnapshotCents: bigint("city_tax_rate_snapshot_cents", { mode: "number" }),
	holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true, mode: 'string' }),
	einvoiceConsentAt: timestamp("einvoice_consent_at", { withTimezone: true, mode: 'string' }),
	einvoiceConsentIp: inet("einvoice_consent_ip"),
	noteInternal: text("note_internal"),
	noteGuest: text("note_guest"),
	checklistVersionId: uuid("checklist_version_id"),
	searchText: text("search_text"),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'string' }),
	cancelReason: text("cancel_reason"),
	anonymizedAt: timestamp("anonymized_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("reservations_checkin_idx").using("btree", table.checkin.asc().nullsLast().op("date_ops")),
	index("reservations_search_text_idx").using("gin", table.searchText.asc().nullsLast().op("gin_trgm_ops")),
	index("reservations_status_hold_expires_at_idx").using("btree", table.status.asc().nullsLast().op("timestamptz_ops"), table.holdExpiresAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.unitId],
			foreignColumns: [units.id],
			name: "reservations_unit_id_fkey"
		}),
	foreignKey({
			columns: [table.cancelPolicyId],
			foreignColumns: [cancelPolicies.id],
			name: "reservations_cancel_policy_id_fkey"
		}),
	foreignKey({
			columns: [table.checklistVersionId],
			foreignColumns: [checklistVersions.id],
			name: "reservations_checklist_version_id_fkey"
		}),
	unique("reservations_code_key").on(table.code),
	unique("reservations_variable_symbol_key").on(table.variableSymbol),
	check("reservations_check", sql`checkout > checkin`),
	check("reservations_source_check", sql`source = ANY (ARRAY['web'::text, 'phone'::text, 'admin'::text, 'booking'::text, 'airbnb'::text])`),
]);

export const guestRegistrations = pgTable("guest_registrations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	reservationId: uuid("reservation_id").notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	birthDate: date("birth_date").notNull(),
	address: jsonb().notNull(),
	citizenship: char({ length: 2 }).notNull(),
	docType: text("doc_type").notNull(),
	docNumberEnc: bytea("doc_number_enc").notNull(),
	visaNumberEnc: bytea("visa_number_enc"),
	purposeOfStay: text("purpose_of_stay"),
	stayFrom: date("stay_from").notNull(),
	stayTo: date("stay_to").notNull(),
	nights: integer().notNull(),
	cityTaxCents: bigint("city_tax_cents", { mode: "number" }).default(0).notNull(),
	exemptionReason: text("exemption_reason"),
	isForeigner: boolean("is_foreigner").generatedAlwaysAs(sql`(citizenship <> 'CZ'::bpchar)`),
	reportedAt: timestamp("reported_at", { withTimezone: true, mode: 'string' }),
	reportBatchId: uuid("report_batch_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	retainUntil: date("retain_until").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.reservationId],
			foreignColumns: [reservations.id],
			name: "guest_registrations_reservation_id_fkey"
		}),
	foreignKey({
			columns: [table.reportBatchId],
			foreignColumns: [reportBatches.id],
			name: "guest_registrations_report_batch_id_fkey"
		}),
	check("guest_registrations_exemption_reason_check", sql`exemption_reason = ANY (ARRAY['UNDER_18'::text, 'HOSPITALIZED'::text, 'DISABILITY'::text, 'SEASONAL_WORK'::text])`),
]);

export const guestLoginTokens = pgTable("guest_login_tokens", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	reservationId: uuid("reservation_id").notNull(),
	tokenHash: text("token_hash").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	usedAt: timestamp("used_at", { withTimezone: true, mode: 'string' }),
	requestedIp: inet("requested_ip"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.reservationId],
			foreignColumns: [reservations.id],
			name: "guest_login_tokens_reservation_id_fkey"
		}),
]);

export const guestPortalAccess = pgTable("guest_portal_access", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	reservationId: uuid("reservation_id").notNull(),
	variableSymbol: text("variable_symbol").notNull(),
	accessCodeHash: text("access_code_hash").notNull(),
	opensAt: timestamp("opens_at", { withTimezone: true, mode: 'string' }).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	failedAttempts: integer("failed_attempts").default(0).notNull(),
	lockedUntil: timestamp("locked_until", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.reservationId],
			foreignColumns: [reservations.id],
			name: "guest_portal_access_reservation_id_fkey"
		}),
	unique("guest_portal_access_reservation_id_key").on(table.reservationId),
]);

export const inspections = pgTable("inspections", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	reservationId: uuid("reservation_id").notNull(),
	unitSlug: text("unit_slug").notNull(),
	type: text().notNull(),
	checklistVersionId: uuid("checklist_version_id").notNull(),
	baselineSetId: uuid("baseline_set_id"),
	status: text().default('draft').notNull(),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }),
	analyzedAt: timestamp("analyzed_at", { withTimezone: true, mode: 'string' }),
	closedAt: timestamp("closed_at", { withTimezone: true, mode: 'string' }),
	summaryCs: text("summary_cs"),
	costCents: bigint("cost_cents", { mode: "number" }).default(0).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.reservationId],
			foreignColumns: [reservations.id],
			name: "inspections_reservation_id_fkey"
		}),
	foreignKey({
			columns: [table.checklistVersionId],
			foreignColumns: [checklistVersions.id],
			name: "inspections_checklist_version_id_fkey"
		}),
	foreignKey({
			columns: [table.baselineSetId],
			foreignColumns: [baselineSets.id],
			name: "inspections_baseline_set_id_fkey"
		}),
	check("inspections_type_check", sql`type = ANY (ARRAY['checkin'::text, 'checkout'::text])`),
	check("inspections_status_check", sql`status = ANY (ARRAY['draft'::text, 'submitted'::text, 'analyzing'::text, 'auto_clear'::text, 'needs_review'::text, 'closed'::text])`),
]);

export const payments = pgTable("payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	reservationId: uuid("reservation_id").notNull(),
	kind: text().notNull(),
	direction: text().notNull(),
	provider: text().notNull(),
	amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
	currency: char({ length: 3 }).default('CZK').notNull(),
	status: text().default('created').notNull(),
	variableSymbol: text("variable_symbol").notNull(),
	specificSymbol: text("specific_symbol"),
	spayd: text(),
	providerTxId: text("provider_tx_id"),
	providerStatus: text("provider_status"),
	providerFeeCents: bigint("provider_fee_cents", { mode: "number" }),
	redirectUrl: text("redirect_url"),
	dueAt: timestamp("due_at", { withTimezone: true, mode: 'string' }),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	bankTransactionId: bigint("bank_transaction_id", { mode: "number" }),
	matchedBy: text("matched_by"),
	idempotencyKey: text("idempotency_key"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("payments_status_due_at_idx").using("btree", table.status.asc().nullsLast().op("text_ops"), table.dueAt.asc().nullsLast().op("timestamptz_ops")),
	index("payments_variable_symbol_idx").using("btree", table.variableSymbol.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.reservationId],
			foreignColumns: [reservations.id],
			name: "payments_reservation_id_fkey"
		}),
	foreignKey({
			columns: [table.bankTransactionId],
			foreignColumns: [bankTransactions.id],
			name: "payments_bank_transaction_id_fkey"
		}),
	unique("payments_idempotency_key_key").on(table.idempotencyKey),
	check("payments_kind_check", sql`kind = ANY (ARRAY['deposit'::text, 'balance'::text, 'security_deposit'::text, 'damage'::text, 'refund'::text])`),
	check("payments_direction_check", sql`direction = ANY (ARRAY['IN'::text, 'OUT'::text])`),
	check("payments_provider_check", sql`provider = ANY (ARRAY['qr_transfer'::text, 'comgate'::text, 'cash'::text, 'voucher'::text, 'mock'::text])`),
	check("payments_amount_cents_check", sql`amount_cents > 0`),
	check("payments_status_check", sql`status = ANY (ARRAY['created'::text, 'pending'::text, 'paid'::text, 'partially_paid'::text, 'overpaid'::text, 'cancelled'::text, 'expired'::text, 'refunded_partial'::text, 'refunded_full'::text])`),
	check("payments_matched_by_check", sql`matched_by = ANY (ARRAY['AUTO'::text, 'MANUAL'::text])`),
]);

export const privacyAck = pgTable("privacy_ack", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	reservationId: uuid("reservation_id").notNull(),
	docKey: text("doc_key").notNull(),
	docVersion: text("doc_version").notNull(),
	acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	ip: inet(),
}, (table) => [
	foreignKey({
			columns: [table.reservationId],
			foreignColumns: [reservations.id],
			name: "privacy_ack_reservation_id_fkey"
		}),
]);

export const inspectionPhotos = pgTable("inspection_photos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	inspectionId: uuid("inspection_id").notNull(),
	zoneKey: text("zone_key").notNull(),
	clientUuid: text("client_uuid").notNull(),
	storageKey: text("storage_key").notNull(),
	sha256: text().notNull(),
	width: integer(),
	height: integer(),
	bytes: bigint({ mode: "number" }),
	exifTakenAt: timestamp("exif_taken_at", { withTimezone: true, mode: 'string' }),
	exifStripped: boolean("exif_stripped").default(true).notNull(),
	dhash64: bigint({ mode: "number" }),
	containsPerson: boolean("contains_person").default(false).notNull(),
	legalHold: boolean("legal_hold").default(false).notNull(),
	deleteAfter: date("delete_after").notNull(),
	uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.inspectionId],
			foreignColumns: [inspections.id],
			name: "inspection_photos_inspection_id_fkey"
		}),
	unique("inspection_photos_inspection_id_client_uuid_key").on(table.clientUuid, table.inspectionId),
]);

export const reservationItems = pgTable("reservation_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	reservationId: uuid("reservation_id").notNull(),
	kind: text().notNull(),
	priceItemCode: text("price_item_code"),
	label: text().notNull(),
	date: date(),
	unitSlug: text("unit_slug"),
	qty: numeric({ precision: 10, scale:  2 }).default('1').notNull(),
	unitPriceCents: bigint("unit_price_cents", { mode: "number" }).notNull(),
	totalCents: bigint("total_cents", { mode: "number" }).notNull(),
	vatRate: integer("vat_rate"),
	manualReason: text("manual_reason"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.reservationId],
			foreignColumns: [reservations.id],
			name: "reservation_items_reservation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.priceItemCode],
			foreignColumns: [priceItems.code],
			name: "reservation_items_price_item_code_fkey"
		}),
	check("reservation_items_kind_check", sql`kind = ANY (ARRAY['night'::text, 'addon'::text, 'discount'::text, 'city_tax'::text, 'damage'::text])`),
]);

export const reservationUnits = pgTable("reservation_units", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	reservationId: uuid("reservation_id").notNull(),
	unitId: uuid("unit_id").notNull(),
	checkin: date().notNull(),
	checkout: date().notNull(),
	status: reservationStatus().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.reservationId],
			foreignColumns: [reservations.id],
			name: "reservation_units_reservation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.unitId],
			foreignColumns: [units.id],
			name: "reservation_units_unit_id_fkey"
		}),
]);

export const damageCases = pgTable("damage_cases", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	reservationId: uuid("reservation_id").notNull(),
	inspectionId: uuid("inspection_id").notNull(),
	zoneKey: text("zone_key").notNull(),
	proposedAmountCents: bigint("proposed_amount_cents", { mode: "number" }).notNull(),
	findingIds: uuid("finding_ids").array().notNull(),
	state: text().default('pending').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.reservationId],
			foreignColumns: [reservations.id],
			name: "damage_cases_reservation_id_fkey"
		}),
	foreignKey({
			columns: [table.inspectionId],
			foreignColumns: [inspections.id],
			name: "damage_cases_inspection_id_fkey"
		}),
	check("damage_cases_state_check", sql`state = ANY (ARRAY['pending'::text, 'decided'::text, 'dismissed'::text])`),
]);

export const lunaRuns = pgTable("luna_runs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	inspectionId: uuid("inspection_id").notNull(),
	zoneKey: text("zone_key").notNull(),
	runIndex: integer("run_index").notNull(),
	mode: text().notNull(),
	dryRun: boolean("dry_run").default(false).notNull(),
	model: text().notNull(),
	promptVersion: text("prompt_version").notNull(),
	inputTokens: integer("input_tokens"),
	cacheReadTokens: integer("cache_read_tokens"),
	outputTokens: integer("output_tokens"),
	costCents: bigint("cost_cents", { mode: "number" }),
	latencyMs: integer("latency_ms"),
	rawResponse: jsonb("raw_response"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.inspectionId],
			foreignColumns: [inspections.id],
			name: "luna_runs_inspection_id_fkey"
		}),
	check("luna_runs_mode_check", sql`mode = ANY (ARRAY['primary'::text, 'swapped'::text, 'devils_advocate'::text, 'aggregate'::text])`),
]);

export const paymentEvents = pgTable("payment_events", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	paymentId: uuid("payment_id"),
	source: text().notNull(),
	provider: text(),
	providerEventId: text("provider_event_id"),
	signatureOk: boolean("signature_ok"),
	sourceIp: inet("source_ip"),
	actor: text(),
	statusBefore: text("status_before"),
	statusAfter: text("status_after"),
	raw: jsonb().notNull(),
	receivedAt: timestamp("received_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.paymentId],
			foreignColumns: [payments.id],
			name: "payment_events_payment_id_fkey"
		}),
	unique("payment_events_provider_provider_event_id_key").on(table.provider, table.providerEventId),
	check("payment_events_source_check", sql`source = ANY (ARRAY['webhook'::text, 'status_poll'::text, 'bank_import'::text, 'manual'::text, 'cron'::text])`),
]);

export const tasks = pgTable("tasks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	kind: text().notNull(),
	severity: text().default('warn').notNull(),
	reservationId: uuid("reservation_id"),
	paymentId: uuid("payment_id"),
	bankTransactionId: bigint("bank_transaction_id", { mode: "number" }),
	inspectionId: uuid("inspection_id"),
	title: text().notNull(),
	detail: text(),
	dueAt: timestamp("due_at", { withTimezone: true, mode: 'string' }),
	resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }),
	resolvedBy: text("resolved_by"),
	resolutionNote: text("resolution_note"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.reservationId],
			foreignColumns: [reservations.id],
			name: "tasks_reservation_id_fkey"
		}),
	foreignKey({
			columns: [table.paymentId],
			foreignColumns: [payments.id],
			name: "tasks_payment_id_fkey"
		}),
	foreignKey({
			columns: [table.bankTransactionId],
			foreignColumns: [bankTransactions.id],
			name: "tasks_bank_transaction_id_fkey"
		}),
	foreignKey({
			columns: [table.inspectionId],
			foreignColumns: [inspections.id],
			name: "tasks_inspection_id_fkey"
		}),
	check("tasks_severity_check", sql`severity = ANY (ARRAY['info'::text, 'warn'::text, 'urgent'::text])`),
]);

export const zoneConditionTimeline = pgTable("zone_condition_timeline", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	unitSlug: text("unit_slug").notNull(),
	zoneKey: text("zone_key").notNull(),
	inspectionId: uuid("inspection_id").notNull(),
	occurredOn: date("occurred_on").notNull(),
	wearScore: real("wear_score").notNull(),
	ssimVsBaselineV0: real("ssim_vs_baseline_v0"),
	severityMax: text("severity_max"),
}, (table) => [
	foreignKey({
			columns: [table.inspectionId],
			foreignColumns: [inspections.id],
			name: "zone_condition_timeline_inspection_id_fkey"
		}),
]);

export const deposits = pgTable("deposits", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	reservationId: uuid("reservation_id").notNull(),
	mode: text().notNull(),
	amountCents: bigint("amount_cents", { mode: "number" }).default(300000).notNull(),
	paymentId: uuid("payment_id"),
	comgateTransId: text("comgate_trans_id"),
	state: text().default('not_required').notNull(),
	heldAt: timestamp("held_at", { withTimezone: true, mode: 'string' }),
	releasedAt: timestamp("released_at", { withTimezone: true, mode: 'string' }),
	forfeitedCents: bigint("forfeited_cents", { mode: "number" }).default(0).notNull(),
	damageDecisionId: uuid("damage_decision_id"),
	refundPaymentId: uuid("refund_payment_id"),
}, (table) => [
	foreignKey({
			columns: [table.reservationId],
			foreignColumns: [reservations.id],
			name: "deposits_reservation_id_fkey"
		}),
	foreignKey({
			columns: [table.paymentId],
			foreignColumns: [payments.id],
			name: "deposits_payment_id_fkey"
		}),
	foreignKey({
			columns: [table.damageDecisionId],
			foreignColumns: [damageDecisions.id],
			name: "deposits_damage_decision_id_fkey"
		}),
	foreignKey({
			columns: [table.refundPaymentId],
			foreignColumns: [payments.id],
			name: "deposits_refund_payment_id_fkey"
		}),
	unique("deposits_reservation_id_key").on(table.reservationId),
	check("deposits_mode_check", sql`mode = ANY (ARRAY['CONTRACTUAL_ONLY'::text, 'COLLECTED'::text, 'CARD_PREAUTH'::text])`),
	check("deposits_state_check", sql`state = ANY (ARRAY['not_required'::text, 'pending'::text, 'held'::text, 'released'::text, 'partially_forfeited'::text, 'forfeited'::text])`),
]);

export const lunaFindings = pgTable("luna_findings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	lunaRunId: uuid("luna_run_id").notNull(),
	zoneKey: text("zone_key").notNull(),
	severity: text().notNull(),
	confidence: numeric({ precision: 3, scale:  2 }).notNull(),
	evidenceBbox: jsonb("evidence_bbox"),
	whatChanged: text("what_changed").notNull(),
	alternativeExplanation: text("alternative_explanation").notNull(),
	counterArgument: text("counter_argument"),
	isLightingOrAngleArtifact: boolean("is_lighting_or_angle_artifact").default(false).notNull(),
	isGuestMessNotDamage: boolean("is_guest_mess_not_damage").default(false).notNull(),
	estimatedCostMinCents: bigint("estimated_cost_min_cents", { mode: "number" }),
	estimatedCostMaxCents: bigint("estimated_cost_max_cents", { mode: "number" }),
	needsReshoot: boolean("needs_reshoot").default(false).notNull(),
	stability: text(),
}, (table) => [
	foreignKey({
			columns: [table.lunaRunId],
			foreignColumns: [lunaRuns.id],
			name: "luna_findings_luna_run_id_fkey"
		}),
	check("luna_findings_severity_check", sql`severity = ANY (ARRAY['none'::text, 'dirt'::text, 'wear'::text, 'damage_minor'::text, 'damage_major'::text, 'missing'::text])`),
	check("luna_findings_stability_check", sql`stability = ANY (ARRAY['stable'::text, 'unstable'::text])`),
]);

export const photoPairs = pgTable("photo_pairs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	inspectionId: uuid("inspection_id").notNull(),
	zoneKey: text("zone_key").notNull(),
	beforeShotId: uuid("before_shot_id"),
	afterPhotoId: uuid("after_photo_id").notNull(),
	homography: jsonb(),
	inlierCount: integer("inlier_count"),
	reprojErrorPx: real("reproj_error_px"),
	alignStatus: text("align_status").notNull(),
	ssimGlobal: real("ssim_global"),
	diffRegions: jsonb("diff_regions"),
	diffMapKey: text("diff_map_key"),
}, (table) => [
	foreignKey({
			columns: [table.inspectionId],
			foreignColumns: [inspections.id],
			name: "photo_pairs_inspection_id_fkey"
		}),
	foreignKey({
			columns: [table.beforeShotId],
			foreignColumns: [baselineShots.id],
			name: "photo_pairs_before_shot_id_fkey"
		}),
	foreignKey({
			columns: [table.afterPhotoId],
			foreignColumns: [inspectionPhotos.id],
			name: "photo_pairs_after_photo_id_fkey"
		}),
	check("photo_pairs_align_status_check", sql`align_status = ANY (ARRAY['good'::text, 'fair'::text, 'poor'::text])`),
]);

export const lunaFeedback = pgTable("luna_feedback", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	findingId: uuid("finding_id").notNull(),
	humanLabel: text("human_label").notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.findingId],
			foreignColumns: [lunaFindings.id],
			name: "luna_feedback_finding_id_fkey"
		}),
	check("luna_feedback_human_label_check", sql`human_label = ANY (ARRAY['true_positive'::text, 'false_positive'::text, 'missed'::text])`),
]);

export const damageDecisions = pgTable("damage_decisions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	damageCaseId: uuid("damage_case_id").notNull(),
	reservationId: uuid("reservation_id").notNull(),
	decidedBy: uuid("decided_by").notNull(),
	decidedAt: timestamp("decided_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
	reasonCs: text("reason_cs").notNull(),
	isServiceNotDamage: boolean("is_service_not_damage").default(false).notNull(),
	guestNotifiedAt: timestamp("guest_notified_at", { withTimezone: true, mode: 'string' }),
	objectionReceivedAt: timestamp("objection_received_at", { withTimezone: true, mode: 'string' }),
	objectionOutcome: text("objection_outcome"),
	invoiceId: uuid("invoice_id"),
}, (table) => [
	foreignKey({
			columns: [table.damageCaseId],
			foreignColumns: [damageCases.id],
			name: "damage_decisions_damage_case_id_fkey"
		}),
	foreignKey({
			columns: [table.reservationId],
			foreignColumns: [reservations.id],
			name: "damage_decisions_reservation_id_fkey"
		}),
	foreignKey({
			columns: [table.decidedBy],
			foreignColumns: [adminUsers.id],
			name: "damage_decisions_decided_by_fkey"
		}),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "damage_decisions_invoice_id_fkey"
		}),
	check("damage_decisions_amount_cents_check", sql`amount_cents >= 0`),
	check("damage_decisions_reason_cs_check", sql`length(btrim(reason_cs)) >= 20`),
]);

// Cizí klíče invoices → document_blobs (pdf_blob_id, isdoc_blob_id) tady
// schválně nejsou: s protisměrným document_blobs → invoices by vznikla kruhová
// typová závislost. V databázi oba klíče existují (viz db/migrations/0001_init.sql).
export const invoices = pgTable("invoices", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	docType: text("doc_type").notNull(),
	number: text(),
	seriesCode: text("series_code"),
	year: integer(),
	status: text().default('DRAFT').notNull(),
	reservationId: uuid("reservation_id").notNull(),
	engine: text().default('fakturoid').notNull(),
	fakturoidId: bigint("fakturoid_id", { mode: "number" }),
	variableSymbol: text("variable_symbol").notNull(),
	issueDate: date("issue_date"),
	taxPointDate: date("tax_point_date"),
	dueDate: date("due_date"),
	vatApplicable: boolean("vat_applicable").default(false).notNull(),
	customer: jsonb().notNull(),
	totalWithoutVatCents: bigint("total_without_vat_cents", { mode: "number" }).default(0).notNull(),
	totalVatCents: bigint("total_vat_cents", { mode: "number" }).default(0).notNull(),
	totalWithVatCents: bigint("total_with_vat_cents", { mode: "number" }).default(0).notNull(),
	roundingCents: bigint("rounding_cents", { mode: "number" }).default(0).notNull(),
	alreadyTaxedAdvancesCents: bigint("already_taxed_advances_cents", { mode: "number" }).default(0).notNull(),
	amountToPayCents: bigint("amount_to_pay_cents", { mode: "number" }).default(0).notNull(),
	correctionReason: text("correction_reason"),
	deliveryAttemptedAt: timestamp("delivery_attempted_at", { withTimezone: true, mode: 'string' }),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	pdfBlobId: uuid("pdf_blob_id"),
	isdocBlobId: uuid("isdoc_blob_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.reservationId],
			foreignColumns: [reservations.id],
			name: "invoices_reservation_id_fkey"
		}),
	unique("invoices_number_key").on(table.number),
	check("invoices_doc_type_check", sql`doc_type = ANY (ARRAY['PROFORMA'::text, 'ADVANCE_TAX'::text, 'FINAL'::text, 'CORRECTIVE'::text, 'NON_TAX'::text])`),
	check("invoices_status_check", sql`status = ANY (ARRAY['DRAFT'::text, 'ISSUED'::text, 'PAID'::text, 'PARTIALLY_PAID'::text, 'CANCELLED'::text, 'CORRECTED'::text])`),
	check("invoices_engine_check", sql`engine = ANY (ARRAY['fakturoid'::text, 'local'::text])`),
]);

export const documentBlobs = pgTable("document_blobs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	invoiceId: uuid("invoice_id"),
	kind: text().notNull(),
	storageKey: text("storage_key").notNull(),
	mimeType: text("mime_type").notNull(),
	byteSize: bigint("byte_size", { mode: "number" }).notNull(),
	sha256: text().notNull(),
	prevSha256: text("prev_sha256"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	retainUntil: date("retain_until").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "document_blobs_invoice_id_fkey"
		}),
	check("document_blobs_kind_check", sql`kind = ANY (ARRAY['PDF'::text, 'ISDOC'::text, 'ATTACHMENT'::text, 'YEAR_ARCHIVE_ZIP'::text])`),
]);

export const invoiceLines = pgTable("invoice_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	invoiceId: uuid("invoice_id").notNull(),
	seq: integer().notNull(),
	lineKind: text("line_kind").notNull(),
	priceItemCode: text("price_item_code"),
	description: text().notNull(),
	czCpa: text("cz_cpa"),
	quantity: numeric({ precision: 10, scale:  2 }).notNull(),
	unit: text().notNull(),
	unitPriceWithVatCents: bigint("unit_price_with_vat_cents", { mode: "number" }).notNull(),
	vatRate: integer("vat_rate"),
	baseCents: bigint("base_cents", { mode: "number" }).notNull(),
	vatCents: bigint("vat_cents", { mode: "number" }).notNull(),
	totalCents: bigint("total_cents", { mode: "number" }).notNull(),
	unitSlug: text("unit_slug"),
	serviceFrom: date("service_from"),
	serviceTo: date("service_to"),
}, (table) => [
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "invoice_lines_invoice_id_fkey"
		}),
	foreignKey({
			columns: [table.priceItemCode],
			foreignColumns: [priceItems.code],
			name: "invoice_lines_price_item_code_fkey"
		}),
	check("vat_only_on_taxable", sql`(line_kind = 'TAXABLE'::text) OR (vat_rate IS NULL)`),
]);

export const refunds = pgTable("refunds", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	paymentId: uuid("payment_id").notNull(),
	invoiceId: uuid("invoice_id"),
	amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
	reason: text().notNull(),
	reasonNote: text("reason_note"),
	providerRefundId: text("provider_refund_id"),
	status: text().default('proposed').notNull(),
	failureCode: text("failure_code"),
	payoutAccount: text("payout_account").notNull(),
	requestedBy: text("requested_by").notNull(),
	requestedAt: timestamp("requested_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	settledAt: timestamp("settled_at", { withTimezone: true, mode: 'string' }),
	idempotencyKey: text("idempotency_key"),
}, (table) => [
	foreignKey({
			columns: [table.paymentId],
			foreignColumns: [payments.id],
			name: "refunds_payment_id_fkey"
		}),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "refunds_invoice_id_fkey"
		}),
	unique("refunds_idempotency_key_key").on(table.idempotencyKey),
	check("refunds_amount_cents_check", sql`amount_cents > 0`),
	check("refunds_reason_check", sql`reason = ANY (ARRAY['storno_100'::text, 'storno_50'::text, 'storno_0'::text, 'deposit_return'::text, 'deposit_partial'::text, 'overpayment'::text, 'goodwill'::text, 'other'::text])`),
	check("refunds_status_check", sql`status = ANY (ARRAY['proposed'::text, 'sent'::text, 'settled'::text, 'failed'::text])`),
]);

export const vouchers = pgTable("vouchers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	kind: text().notNull(),
	valueCents: bigint("value_cents", { mode: "number" }).notNull(),
	remainingCents: bigint("remaining_cents", { mode: "number" }).notNull(),
	buyerGuestId: uuid("buyer_guest_id"),
	invoiceId: uuid("invoice_id"),
	issuedAt: timestamp("issued_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	validUntil: date("valid_until").notNull(),
	redeemedReservationId: uuid("redeemed_reservation_id"),
	status: text().default('active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.buyerGuestId],
			foreignColumns: [guests.id],
			name: "vouchers_buyer_guest_id_fkey"
		}),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "vouchers_invoice_id_fkey"
		}),
	foreignKey({
			columns: [table.redeemedReservationId],
			foreignColumns: [reservations.id],
			name: "vouchers_redeemed_reservation_id_fkey"
		}),
	unique("vouchers_code_key").on(table.code),
	check("vouchers_kind_check", sql`kind = ANY (ARRAY['amount'::text, 'stay'::text])`),
]);

export const unitComponents = pgTable("unit_components", {
	compositeUnitId: uuid("composite_unit_id").notNull(),
	memberUnitId: uuid("member_unit_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.compositeUnitId],
			foreignColumns: [units.id],
			name: "unit_components_composite_unit_id_fkey"
		}),
	foreignKey({
			columns: [table.memberUnitId],
			foreignColumns: [units.id],
			name: "unit_components_member_unit_id_fkey"
		}),
	primaryKey({ columns: [table.compositeUnitId, table.memberUnitId], name: "unit_components_pkey"}),
]);

export const reservationGuests = pgTable("reservation_guests", {
	reservationId: uuid("reservation_id").notNull(),
	guestId: uuid("guest_id").notNull(),
	role: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.reservationId],
			foreignColumns: [reservations.id],
			name: "reservation_guests_reservation_id_fkey"
		}),
	foreignKey({
			columns: [table.guestId],
			foreignColumns: [guests.id],
			name: "reservation_guests_guest_id_fkey"
		}),
	primaryKey({ columns: [table.guestId, table.reservationId], name: "reservation_guests_pkey"}),
	check("reservation_guests_role_check", sql`role = ANY (ARRAY['payer'::text, 'companion'::text])`),
]);

export const invoiceSeries = pgTable("invoice_series", {
	code: text().notNull(),
	year: integer().notNull(),
	lastNumber: integer("last_number").default(0).notNull(),
	formatMask: text("format_mask").default('{code}-{year}-{seq:04}').notNull(),
}, (table) => [
	primaryKey({ columns: [table.code, table.year], name: "invoice_series_pkey"}),
]);

export const invoiceRelations = pgTable("invoice_relations", {
	parentInvoiceId: uuid("parent_invoice_id").notNull(),
	childInvoiceId: uuid("child_invoice_id").notNull(),
	relationType: text("relation_type").notNull(),
	amountCents: bigint("amount_cents", { mode: "number" }),
}, (table) => [
	foreignKey({
			columns: [table.parentInvoiceId],
			foreignColumns: [invoices.id],
			name: "invoice_relations_parent_invoice_id_fkey"
		}),
	foreignKey({
			columns: [table.childInvoiceId],
			foreignColumns: [invoices.id],
			name: "invoice_relations_child_invoice_id_fkey"
		}),
	primaryKey({ columns: [table.childInvoiceId, table.parentInvoiceId, table.relationType], name: "invoice_relations_pkey"}),
	check("invoice_relations_relation_type_check", sql`relation_type = ANY (ARRAY['SETTLES_ADVANCE'::text, 'CORRECTS'::text, 'ISSUED_FROM_PROFORMA'::text])`),
]);

export const invoiceVatSummary = pgTable("invoice_vat_summary", {
	invoiceId: uuid("invoice_id").notNull(),
	vatRate: integer("vat_rate").notNull(),
	baseCents: bigint("base_cents", { mode: "number" }).notNull(),
	vatCents: bigint("vat_cents", { mode: "number" }).notNull(),
	totalCents: bigint("total_cents", { mode: "number" }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "invoice_vat_summary_invoice_id_fkey"
		}),
	primaryKey({ columns: [table.invoiceId, table.vatRate], name: "invoice_vat_summary_pkey"}),
]);

export const rateCalendar = pgTable("rate_calendar", {
	unitId: uuid("unit_id").notNull(),
	date: date().notNull(),
	priceCents: bigint("price_cents", { mode: "number" }).notNull(),
	minNights: integer("min_nights").default(2).notNull(),
	closed: boolean().default(false).notNull(),
	closedToArrival: boolean("closed_to_arrival").default(false).notNull(),
	closedToDeparture: boolean("closed_to_departure").default(false).notNull(),
	source: text().default('generated').notNull(),
	note: text(),
}, (table) => [
	foreignKey({
			columns: [table.unitId],
			foreignColumns: [units.id],
			name: "rate_calendar_unit_id_fkey"
		}),
	primaryKey({ columns: [table.date, table.unitId], name: "rate_calendar_pkey"}),
]);
