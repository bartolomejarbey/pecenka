// !!! GENEROVANÝ SOUBOR — needituj ho ručně !!!
//
// Vzniká příkazem `npm run db:pull`, který si typy načte z živé databáze.
// Zdrojem pravdy je SQL v db/migrations/ (generované ze SYSTEM.md), protože
// obsahuje omezení, která Drizzle neumí popsat — hlavně EXCLUDE USING gist
// nad reservation_units, což je jediná spolehlivá ochrana proti dvojímu prodeji.
//
// Chceš změnit schéma? Uprav SYSTEM.md → npm run db:migration → nová migrace
// → npm run db:migrate → npm run db:pull.

import { relations } from "drizzle-orm/relations";
import { priceItems, addons, adminUsers, adminCredentials, adminSessions, baselineSets, baselineShots, checklistTemplates, checklistVersions, units, icalFeeds, reservations, guestSessions, calendarBlocks, checklistZones, cancelPolicies, guestRegistrations, reportBatches, guestLoginTokens, guestPortalAccess, inspections, payments, bankTransactions, privacyAck, inspectionPhotos, reservationItems, reservationUnits, damageCases, lunaRuns, paymentEvents, tasks, zoneConditionTimeline, deposits, damageDecisions, lunaFindings, photoPairs, lunaFeedback, invoices, documentBlobs, invoiceLines, refunds, guests, vouchers, unitComponents, reservationGuests, invoiceRelations, invoiceVatSummary, rateCalendar } from "./schema";

export const addonsRelations = relations(addons, ({one}) => ({
	priceItem: one(priceItems, {
		fields: [addons.priceItemCode],
		references: [priceItems.code]
	}),
}));

export const priceItemsRelations = relations(priceItems, ({many}) => ({
	addons: many(addons),
	reservationItems: many(reservationItems),
	invoiceLines: many(invoiceLines),
}));

export const adminCredentialsRelations = relations(adminCredentials, ({one}) => ({
	adminUser: one(adminUsers, {
		fields: [adminCredentials.adminUserId],
		references: [adminUsers.id]
	}),
}));

export const adminUsersRelations = relations(adminUsers, ({many}) => ({
	adminCredentials: many(adminCredentials),
	adminSessions: many(adminSessions),
	damageDecisions: many(damageDecisions),
}));

export const adminSessionsRelations = relations(adminSessions, ({one}) => ({
	adminUser: one(adminUsers, {
		fields: [adminSessions.adminUserId],
		references: [adminUsers.id]
	}),
}));

export const baselineShotsRelations = relations(baselineShots, ({one, many}) => ({
	baselineSet: one(baselineSets, {
		fields: [baselineShots.baselineSetId],
		references: [baselineSets.id]
	}),
	photoPairs: many(photoPairs),
}));

export const baselineSetsRelations = relations(baselineSets, ({many}) => ({
	baselineShots: many(baselineShots),
	inspections: many(inspections),
}));

export const checklistVersionsRelations = relations(checklistVersions, ({one, many}) => ({
	checklistTemplate: one(checklistTemplates, {
		fields: [checklistVersions.templateId],
		references: [checklistTemplates.id]
	}),
	checklistZones: many(checklistZones),
	reservations: many(reservations),
	inspections: many(inspections),
}));

export const checklistTemplatesRelations = relations(checklistTemplates, ({many}) => ({
	checklistVersions: many(checklistVersions),
}));

export const icalFeedsRelations = relations(icalFeeds, ({one, many}) => ({
	unit: one(units, {
		fields: [icalFeeds.unitId],
		references: [units.id]
	}),
	calendarBlocks: many(calendarBlocks),
}));

export const unitsRelations = relations(units, ({many}) => ({
	icalFeeds: many(icalFeeds),
	calendarBlocks: many(calendarBlocks),
	reservations: many(reservations),
	reservationUnits: many(reservationUnits),
	unitComponents_compositeUnitId: many(unitComponents, {
		relationName: "unitComponents_compositeUnitId_units_id"
	}),
	unitComponents_memberUnitId: many(unitComponents, {
		relationName: "unitComponents_memberUnitId_units_id"
	}),
	rateCalendars: many(rateCalendar),
}));

export const guestSessionsRelations = relations(guestSessions, ({one}) => ({
	reservation: one(reservations, {
		fields: [guestSessions.reservationId],
		references: [reservations.id]
	}),
}));

export const reservationsRelations = relations(reservations, ({one, many}) => ({
	guestSessions: many(guestSessions),
	unit: one(units, {
		fields: [reservations.unitId],
		references: [units.id]
	}),
	cancelPolicy: one(cancelPolicies, {
		fields: [reservations.cancelPolicyId],
		references: [cancelPolicies.id]
	}),
	checklistVersion: one(checklistVersions, {
		fields: [reservations.checklistVersionId],
		references: [checklistVersions.id]
	}),
	guestRegistrations: many(guestRegistrations),
	guestLoginTokens: many(guestLoginTokens),
	guestPortalAccesses: many(guestPortalAccess),
	inspections: many(inspections),
	payments: many(payments),
	privacyAcks: many(privacyAck),
	reservationItems: many(reservationItems),
	reservationUnits: many(reservationUnits),
	damageCases: many(damageCases),
	tasks: many(tasks),
	deposits: many(deposits),
	damageDecisions: many(damageDecisions),
	invoices: many(invoices),
	vouchers: many(vouchers),
	reservationGuests: many(reservationGuests),
}));

export const calendarBlocksRelations = relations(calendarBlocks, ({one}) => ({
	unit: one(units, {
		fields: [calendarBlocks.unitId],
		references: [units.id]
	}),
	icalFeed: one(icalFeeds, {
		fields: [calendarBlocks.sourceFeedId],
		references: [icalFeeds.id]
	}),
}));

export const checklistZonesRelations = relations(checklistZones, ({one}) => ({
	checklistVersion: one(checklistVersions, {
		fields: [checklistZones.checklistVersionId],
		references: [checklistVersions.id]
	}),
}));

export const cancelPoliciesRelations = relations(cancelPolicies, ({many}) => ({
	reservations: many(reservations),
}));

export const guestRegistrationsRelations = relations(guestRegistrations, ({one}) => ({
	reservation: one(reservations, {
		fields: [guestRegistrations.reservationId],
		references: [reservations.id]
	}),
	reportBatch: one(reportBatches, {
		fields: [guestRegistrations.reportBatchId],
		references: [reportBatches.id]
	}),
}));

export const reportBatchesRelations = relations(reportBatches, ({many}) => ({
	guestRegistrations: many(guestRegistrations),
}));

export const guestLoginTokensRelations = relations(guestLoginTokens, ({one}) => ({
	reservation: one(reservations, {
		fields: [guestLoginTokens.reservationId],
		references: [reservations.id]
	}),
}));

export const guestPortalAccessRelations = relations(guestPortalAccess, ({one}) => ({
	reservation: one(reservations, {
		fields: [guestPortalAccess.reservationId],
		references: [reservations.id]
	}),
}));

export const inspectionsRelations = relations(inspections, ({one, many}) => ({
	reservation: one(reservations, {
		fields: [inspections.reservationId],
		references: [reservations.id]
	}),
	checklistVersion: one(checklistVersions, {
		fields: [inspections.checklistVersionId],
		references: [checklistVersions.id]
	}),
	baselineSet: one(baselineSets, {
		fields: [inspections.baselineSetId],
		references: [baselineSets.id]
	}),
	inspectionPhotos: many(inspectionPhotos),
	damageCases: many(damageCases),
	lunaRuns: many(lunaRuns),
	tasks: many(tasks),
	zoneConditionTimelines: many(zoneConditionTimeline),
	photoPairs: many(photoPairs),
}));

export const paymentsRelations = relations(payments, ({one, many}) => ({
	reservation: one(reservations, {
		fields: [payments.reservationId],
		references: [reservations.id]
	}),
	bankTransaction: one(bankTransactions, {
		fields: [payments.bankTransactionId],
		references: [bankTransactions.id]
	}),
	paymentEvents: many(paymentEvents),
	tasks: many(tasks),
	deposits_paymentId: many(deposits, {
		relationName: "deposits_paymentId_payments_id"
	}),
	deposits_refundPaymentId: many(deposits, {
		relationName: "deposits_refundPaymentId_payments_id"
	}),
	refunds: many(refunds),
}));

export const bankTransactionsRelations = relations(bankTransactions, ({many}) => ({
	payments: many(payments),
	tasks: many(tasks),
}));

export const privacyAckRelations = relations(privacyAck, ({one}) => ({
	reservation: one(reservations, {
		fields: [privacyAck.reservationId],
		references: [reservations.id]
	}),
}));

export const inspectionPhotosRelations = relations(inspectionPhotos, ({one, many}) => ({
	inspection: one(inspections, {
		fields: [inspectionPhotos.inspectionId],
		references: [inspections.id]
	}),
	photoPairs: many(photoPairs),
}));

export const reservationItemsRelations = relations(reservationItems, ({one}) => ({
	reservation: one(reservations, {
		fields: [reservationItems.reservationId],
		references: [reservations.id]
	}),
	priceItem: one(priceItems, {
		fields: [reservationItems.priceItemCode],
		references: [priceItems.code]
	}),
}));

export const reservationUnitsRelations = relations(reservationUnits, ({one}) => ({
	reservation: one(reservations, {
		fields: [reservationUnits.reservationId],
		references: [reservations.id]
	}),
	unit: one(units, {
		fields: [reservationUnits.unitId],
		references: [units.id]
	}),
}));

export const damageCasesRelations = relations(damageCases, ({one, many}) => ({
	reservation: one(reservations, {
		fields: [damageCases.reservationId],
		references: [reservations.id]
	}),
	inspection: one(inspections, {
		fields: [damageCases.inspectionId],
		references: [inspections.id]
	}),
	damageDecisions: many(damageDecisions),
}));

export const lunaRunsRelations = relations(lunaRuns, ({one, many}) => ({
	inspection: one(inspections, {
		fields: [lunaRuns.inspectionId],
		references: [inspections.id]
	}),
	lunaFindings: many(lunaFindings),
}));

export const paymentEventsRelations = relations(paymentEvents, ({one}) => ({
	payment: one(payments, {
		fields: [paymentEvents.paymentId],
		references: [payments.id]
	}),
}));

export const tasksRelations = relations(tasks, ({one}) => ({
	reservation: one(reservations, {
		fields: [tasks.reservationId],
		references: [reservations.id]
	}),
	payment: one(payments, {
		fields: [tasks.paymentId],
		references: [payments.id]
	}),
	bankTransaction: one(bankTransactions, {
		fields: [tasks.bankTransactionId],
		references: [bankTransactions.id]
	}),
	inspection: one(inspections, {
		fields: [tasks.inspectionId],
		references: [inspections.id]
	}),
}));

export const zoneConditionTimelineRelations = relations(zoneConditionTimeline, ({one}) => ({
	inspection: one(inspections, {
		fields: [zoneConditionTimeline.inspectionId],
		references: [inspections.id]
	}),
}));

export const depositsRelations = relations(deposits, ({one}) => ({
	reservation: one(reservations, {
		fields: [deposits.reservationId],
		references: [reservations.id]
	}),
	payment_paymentId: one(payments, {
		fields: [deposits.paymentId],
		references: [payments.id],
		relationName: "deposits_paymentId_payments_id"
	}),
	damageDecision: one(damageDecisions, {
		fields: [deposits.damageDecisionId],
		references: [damageDecisions.id]
	}),
	payment_refundPaymentId: one(payments, {
		fields: [deposits.refundPaymentId],
		references: [payments.id],
		relationName: "deposits_refundPaymentId_payments_id"
	}),
}));

export const damageDecisionsRelations = relations(damageDecisions, ({one, many}) => ({
	deposits: many(deposits),
	damageCase: one(damageCases, {
		fields: [damageDecisions.damageCaseId],
		references: [damageCases.id]
	}),
	reservation: one(reservations, {
		fields: [damageDecisions.reservationId],
		references: [reservations.id]
	}),
	adminUser: one(adminUsers, {
		fields: [damageDecisions.decidedBy],
		references: [adminUsers.id]
	}),
	invoice: one(invoices, {
		fields: [damageDecisions.invoiceId],
		references: [invoices.id]
	}),
}));

export const lunaFindingsRelations = relations(lunaFindings, ({one, many}) => ({
	lunaRun: one(lunaRuns, {
		fields: [lunaFindings.lunaRunId],
		references: [lunaRuns.id]
	}),
	lunaFeedbacks: many(lunaFeedback),
}));

export const photoPairsRelations = relations(photoPairs, ({one}) => ({
	inspection: one(inspections, {
		fields: [photoPairs.inspectionId],
		references: [inspections.id]
	}),
	baselineShot: one(baselineShots, {
		fields: [photoPairs.beforeShotId],
		references: [baselineShots.id]
	}),
	inspectionPhoto: one(inspectionPhotos, {
		fields: [photoPairs.afterPhotoId],
		references: [inspectionPhotos.id]
	}),
}));

export const lunaFeedbackRelations = relations(lunaFeedback, ({one}) => ({
	lunaFinding: one(lunaFindings, {
		fields: [lunaFeedback.findingId],
		references: [lunaFindings.id]
	}),
}));

export const invoicesRelations = relations(invoices, ({one, many}) => ({
	damageDecisions: many(damageDecisions),
	reservation: one(reservations, {
		fields: [invoices.reservationId],
		references: [reservations.id]
	}),
	documentBlob_pdfBlobId: one(documentBlobs, {
		fields: [invoices.pdfBlobId],
		references: [documentBlobs.id],
		relationName: "invoices_pdfBlobId_documentBlobs_id"
	}),
	documentBlob_isdocBlobId: one(documentBlobs, {
		fields: [invoices.isdocBlobId],
		references: [documentBlobs.id],
		relationName: "invoices_isdocBlobId_documentBlobs_id"
	}),
	documentBlobs: many(documentBlobs, {
		relationName: "documentBlobs_invoiceId_invoices_id"
	}),
	invoiceLines: many(invoiceLines),
	refunds: many(refunds),
	vouchers: many(vouchers),
	invoiceRelations_parentInvoiceId: many(invoiceRelations, {
		relationName: "invoiceRelations_parentInvoiceId_invoices_id"
	}),
	invoiceRelations_childInvoiceId: many(invoiceRelations, {
		relationName: "invoiceRelations_childInvoiceId_invoices_id"
	}),
	invoiceVatSummaries: many(invoiceVatSummary),
}));

export const documentBlobsRelations = relations(documentBlobs, ({one, many}) => ({
	invoices_pdfBlobId: many(invoices, {
		relationName: "invoices_pdfBlobId_documentBlobs_id"
	}),
	invoices_isdocBlobId: many(invoices, {
		relationName: "invoices_isdocBlobId_documentBlobs_id"
	}),
	invoice: one(invoices, {
		fields: [documentBlobs.invoiceId],
		references: [invoices.id],
		relationName: "documentBlobs_invoiceId_invoices_id"
	}),
}));

export const invoiceLinesRelations = relations(invoiceLines, ({one}) => ({
	invoice: one(invoices, {
		fields: [invoiceLines.invoiceId],
		references: [invoices.id]
	}),
	priceItem: one(priceItems, {
		fields: [invoiceLines.priceItemCode],
		references: [priceItems.code]
	}),
}));

export const refundsRelations = relations(refunds, ({one}) => ({
	payment: one(payments, {
		fields: [refunds.paymentId],
		references: [payments.id]
	}),
	invoice: one(invoices, {
		fields: [refunds.invoiceId],
		references: [invoices.id]
	}),
}));

export const vouchersRelations = relations(vouchers, ({one}) => ({
	guest: one(guests, {
		fields: [vouchers.buyerGuestId],
		references: [guests.id]
	}),
	invoice: one(invoices, {
		fields: [vouchers.invoiceId],
		references: [invoices.id]
	}),
	reservation: one(reservations, {
		fields: [vouchers.redeemedReservationId],
		references: [reservations.id]
	}),
}));

export const guestsRelations = relations(guests, ({many}) => ({
	vouchers: many(vouchers),
	reservationGuests: many(reservationGuests),
}));

export const unitComponentsRelations = relations(unitComponents, ({one}) => ({
	unit_compositeUnitId: one(units, {
		fields: [unitComponents.compositeUnitId],
		references: [units.id],
		relationName: "unitComponents_compositeUnitId_units_id"
	}),
	unit_memberUnitId: one(units, {
		fields: [unitComponents.memberUnitId],
		references: [units.id],
		relationName: "unitComponents_memberUnitId_units_id"
	}),
}));

export const reservationGuestsRelations = relations(reservationGuests, ({one}) => ({
	reservation: one(reservations, {
		fields: [reservationGuests.reservationId],
		references: [reservations.id]
	}),
	guest: one(guests, {
		fields: [reservationGuests.guestId],
		references: [guests.id]
	}),
}));

export const invoiceRelationsRelations = relations(invoiceRelations, ({one}) => ({
	invoice_parentInvoiceId: one(invoices, {
		fields: [invoiceRelations.parentInvoiceId],
		references: [invoices.id],
		relationName: "invoiceRelations_parentInvoiceId_invoices_id"
	}),
	invoice_childInvoiceId: one(invoices, {
		fields: [invoiceRelations.childInvoiceId],
		references: [invoices.id],
		relationName: "invoiceRelations_childInvoiceId_invoices_id"
	}),
}));

export const invoiceVatSummaryRelations = relations(invoiceVatSummary, ({one}) => ({
	invoice: one(invoices, {
		fields: [invoiceVatSummary.invoiceId],
		references: [invoices.id]
	}),
}));

export const rateCalendarRelations = relations(rateCalendar, ({one}) => ({
	unit: one(units, {
		fields: [rateCalendar.unitId],
		references: [units.id]
	}),
}));