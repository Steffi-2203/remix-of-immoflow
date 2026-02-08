import { pgTable, text, serial, integer, boolean, timestamp, numeric, date, uuid, pgEnum, jsonb, varchar, inet, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export * from "./models/auth";

export const userSessions = pgTable("user_sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6, withTimezone: false }).notNull(),
});

export const appRoleEnum = pgEnum('app_role', ['admin', 'property_manager', 'finance', 'viewer', 'tester']);
export const expenseCategoryEnum = pgEnum('expense_category', ['betriebskosten_umlagefaehig', 'instandhaltung']);
export const expenseTypeEnum = pgEnum('expense_type', [
  'versicherung', 'grundsteuer', 'muellabfuhr', 'wasser_abwasser', 'heizung',
  'strom_allgemein', 'hausbetreuung', 'lift', 'gartenpflege', 'schneeraeumung',
  'verwaltung', 'ruecklage', 'reparatur', 'sanierung', 'sonstiges'
]);
export const invoiceStatusEnum = pgEnum('invoice_status', ['offen', 'bezahlt', 'teilbezahlt', 'ueberfaellig']);
export const paymentTypeEnum = pgEnum('payment_type', ['sepa', 'ueberweisung', 'bar', 'sonstiges']);
export const settlementStatusEnum = pgEnum('settlement_status', ['entwurf', 'berechnet', 'versendet', 'abgeschlossen']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['trial', 'active', 'cancelled', 'expired']);
export const subscriptionTierEnum = pgEnum('subscription_tier', ['starter', 'professional', 'enterprise']);
export const userSubscriptionTierEnum = pgEnum('user_subscription_tier', ['trial', 'inactive', 'starter', 'pro', 'enterprise']);
export const tenantStatusEnum = pgEnum('tenant_status', ['aktiv', 'leerstand', 'beendet']);
export const unitTypeEnum = pgEnum('unit_type', ['wohnung', 'geschaeft', 'garage', 'stellplatz', 'lager', 'sonstiges']);
export const leaseStatusEnum = pgEnum('lease_status', ['aktiv', 'beendet', 'gekuendigt']);
export const mrgBkKategorieEnum = pgEnum('mrg_bk_kategorie', [
  'wasserversorgung', 'abwasserentsorgung', 'muellabfuhr', 'kanalraeumung',
  'hausreinigung', 'hausbetreuung', 'rauchfangkehrer', 'schaedlingsbekaempfung',
  'lichtkosten', 'beleuchtung', 'feuerversicherung', 'haftpflichtversicherung',
  'leitungswasserschaden', 'sturmschaden', 'glasversicherung',
  'grundsteuer', 'verwaltung', 'sonstige'
]);

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  subscriptionTier: subscriptionTierEnum("subscription_tier").default('starter'),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").default('trial'),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  iban: text("iban"),
  bic: text("bic"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  phone: text("phone"),
  email: text("email"),
  // White-Label Branding
  brandName: text("brand_name"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  supportEmail: text("support_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Payment status for user subscriptions
export const paymentStatusEnum = pgEnum('payment_status', ['active', 'past_due', 'canceled', 'unpaid']);

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  fullName: text("full_name"),
  organizationId: uuid("organization_id").references(() => organizations.id),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  subscriptionTier: userSubscriptionTierEnum("subscription_tier").default('trial'),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  subscriptionEndsAt: timestamp("subscription_ends_at", { withTimezone: true }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  // Payment status tracking
  paymentStatus: paymentStatusEnum("payment_status").default('active'),
  paymentFailedAt: timestamp("payment_failed_at", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => profiles.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => profiles.id).notNull(),
  role: appRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'accepted', 'expired', 'cancelled']);

export const organizationInvites = pgTable("organization_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  email: text("email").notNull(),
  role: appRoleEnum("role").notNull(),
  token: text("token").notNull().unique(),
  status: inviteStatusEnum("status").default('pending'),
  invitedBy: uuid("invited_by").references(() => profiles.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertOrganizationInviteSchema = createInsertSchema(organizationInvites).omit({ id: true, createdAt: true });
export type OrganizationInvite = typeof organizationInvites.$inferSelect;
export type InsertOrganizationInvite = typeof organizationInvites.$inferInsert;

export const properties = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  postalCode: text("postal_code").notNull(),
  totalUnits: integer("total_units").default(0),
  totalArea: numeric("total_area", { precision: 10, scale: 2 }),
  constructionYear: integer("construction_year"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const propertyManagers = pgTable("property_managers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => profiles.id).notNull(),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const units = pgTable("units", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  topNummer: text("top_nummer").notNull(),
  type: unitTypeEnum("type").default('wohnung'),
  status: tenantStatusEnum("status").default('leerstand'),
  flaeche: numeric("flaeche", { precision: 10, scale: 2 }),
  zimmer: integer("zimmer"),
  nutzwert: numeric("nutzwert", { precision: 10, scale: 4 }),
  stockwerk: integer("stockwerk"),
  vsPersonen: integer("vs_personen").default(0),
  leerstandBk: numeric("leerstand_bk", { precision: 10, scale: 2 }).default('0'),
  leerstandHk: numeric("leerstand_hk", { precision: 10, scale: 2 }).default('0'),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("units_property_top_unique").on(table.propertyId, table.topNummer),
]);

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  unitId: uuid("unit_id").references(() => units.id).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  mobilePhone: text("mobile_phone"),
  status: tenantStatusEnum("status").default('aktiv'),
  mietbeginn: date("mietbeginn"),
  mietende: date("mietende"),
  grundmiete: numeric("grundmiete", { precision: 10, scale: 2 }).default('0'),
  betriebskostenVorschuss: numeric("betriebskosten_vorschuss", { precision: 10, scale: 2 }).default('0'),
  heizkostenVorschuss: numeric("heizungskosten_vorschuss", { precision: 10, scale: 2 }).default('0'),
  wasserkostenVorschuss: numeric("wasserkosten_vorschuss", { precision: 10, scale: 2 }).default('0'),
  warmwasserkostenVorschuss: numeric("warmwasserkosten_vorschuss", { precision: 10, scale: 2 }).default('0'),
  sonstigeKosten: jsonb("sonstige_kosten").$type<Record<string, { betrag: number; ust: number; schluessel?: string }>>(),
  kaution: numeric("kaution", { precision: 10, scale: 2 }),
  kautionBezahlt: boolean("kaution_bezahlt").default(false),
  iban: text("iban"),
  bic: text("bic"),
  sepaMandat: boolean("sepa_mandat").default(false),
  sepaMandatDatum: date("sepa_mandat_datum"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ====== LEASES (Mietverträge) ======
export const leases = pgTable("leases", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  unitId: uuid("unit_id").references(() => units.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  grundmiete: numeric("grundmiete", { precision: 10, scale: 2 }).notNull(),
  betriebskostenVorschuss: numeric("betriebskosten_vorschuss", { precision: 10, scale: 2 }).default('0'),
  heizkostenVorschuss: numeric("heizungskosten_vorschuss", { precision: 10, scale: 2 }).default('0'),
  wasserkostenVorschuss: numeric("wasserkosten_vorschuss", { precision: 10, scale: 2 }).default('0'),
  kaution: numeric("kaution", { precision: 10, scale: 2 }),
  kautionBezahlt: boolean("kaution_bezahlt").default(false),
  status: leaseStatusEnum("status").default('aktiv'),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex("leases_tenant_unit_start_unique").on(table.tenantId, table.unitId, table.startDate),
]);

export const insertLeaseSchema = createInsertSchema(leases).omit({ id: true, createdAt: true, updatedAt: true });
export type Lease = typeof leases.$inferSelect;
export type InsertLease = typeof leases.$inferInsert;

export const rentHistory = pgTable("rent_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  validFrom: date("valid_from").notNull(),
  validUntil: date("valid_until"),
  grundmiete: numeric("grundmiete", { precision: 10, scale: 2 }).notNull(),
  betriebskostenVorschuss: numeric("betriebskosten_vorschuss", { precision: 10, scale: 2 }).notNull(),
  heizkostenVorschuss: numeric("heizungskosten_vorschuss", { precision: 10, scale: 2 }).notNull(),
  wasserkostenVorschuss: numeric("wasserkosten_vorschuss", { precision: 10, scale: 2 }).default('0'),
  changeReason: text("change_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type RentHistory = typeof rentHistory.$inferSelect;
export type InsertRentHistory = typeof rentHistory.$inferInsert;

export const monthlyInvoices = pgTable("monthly_invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  unitId: uuid("unit_id").references(() => units.id).notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  grundmiete: numeric("grundmiete", { precision: 10, scale: 2 }).default('0'),
  betriebskosten: numeric("betriebskosten", { precision: 10, scale: 2 }).default('0'),
  heizungskosten: numeric("heizungskosten", { precision: 10, scale: 2 }).default('0'),
  wasserkosten: numeric("wasserkosten", { precision: 10, scale: 2 }).default('0'),
  ustSatzMiete: integer("ust_satz_miete").default(10),
  ustSatzBk: integer("ust_satz_bk").default(10),
  ustSatzHeizung: integer("ust_satz_heizung").default(20),
  ustSatzWasser: integer("ust_satz_wasser").default(10),
  ust: numeric("ust", { precision: 10, scale: 2 }).default('0'),
  gesamtbetrag: numeric("gesamtbetrag", { precision: 10, scale: 2 }).default('0'),
  status: invoiceStatusEnum("status").default('offen'),
  faelligAm: date("faellig_am"),
  pdfUrl: text("pdf_url"),
  isVacancy: boolean("is_vacancy").default(false),
  vortragMiete: numeric("vortrag_miete", { precision: 10, scale: 2 }).default('0'),
  vortragBk: numeric("vortrag_bk", { precision: 10, scale: 2 }).default('0'),
  vortragHk: numeric("vortrag_hk", { precision: 10, scale: 2 }).default('0'),
  vortragSonstige: numeric("vortrag_sonstige", { precision: 10, scale: 2 }).default('0'),
  runId: uuid("run_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_invoices_unit_status_year_month").on(table.unitId, table.status, table.year, table.month),
  index("idx_invoices_run_id").on(table.runId),
]);

export const invoiceLines = pgTable("invoice_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").notNull().references(() => monthlyInvoices.id),
  unitId: uuid("unit_id").references(() => units.id),
  lineType: varchar("line_type", { length: 50 }).notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  taxRate: integer("tax_rate").default(0),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_invoice_lines_invoice").on(table.invoiceId),
  index("idx_invoice_lines_unit").on(table.unitId),
  uniqueIndex("idx_invoice_lines_unique").on(table.invoiceId, table.unitId, table.lineType, table.description),
]);

export const insertInvoiceLineSchema = createInsertSchema(invoiceLines).omit({ id: true, createdAt: true });
export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type InsertInvoiceLine = typeof invoiceLines.$inferInsert;

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  invoiceId: uuid("invoice_id").references(() => monthlyInvoices.id),
  betrag: numeric("betrag", { precision: 10, scale: 2 }).notNull(),
  buchungsDatum: date("buchungs_datum").notNull(),
  paymentType: paymentTypeEnum("payment_type").default('ueberweisung'),
  verwendungszweck: text("verwendungszweck"),
  transactionId: uuid("transaction_id"),
  notizen: text("notizen"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ====== PAYMENT ALLOCATIONS (Zahlungszuordnungen) ======
export const paymentAllocations = pgTable("payment_allocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentId: uuid("payment_id").references(() => payments.id).notNull(),
  invoiceId: uuid("invoice_id").references(() => monthlyInvoices.id).notNull(),
  appliedAmount: numeric("applied_amount", { precision: 10, scale: 2 }).notNull(),
  allocationType: text("allocation_type").default('miete'),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertPaymentAllocationSchema = createInsertSchema(paymentAllocations).omit({ id: true, createdAt: true });
export type PaymentAllocation = typeof paymentAllocations.$inferSelect;
export type InsertPaymentAllocation = typeof paymentAllocations.$inferInsert;

export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  propertyId: uuid("property_id").references(() => properties.id),
  accountName: text("account_name").notNull(),
  iban: text("iban"),
  bic: text("bic"),
  bankName: text("bank_name"),
  openingBalance: numeric("opening_balance", { precision: 10, scale: 2 }).default('0'),
  openingBalanceDate: date("opening_balance_date"),
  currentBalance: numeric("current_balance", { precision: 10, scale: 2 }).default('0'),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  transactionDate: date("transaction_date").notNull(),
  bookingText: text("booking_text"),
  partnerName: text("partner_name"),
  partnerIban: text("partner_iban"),
  reference: text("reference"),
  categoryId: uuid("category_id"),
  isMatched: boolean("is_matched").default(false),
  matchedTenantId: uuid("matched_tenant_id").references(() => tenants.id),
  matchedUnitId: uuid("matched_unit_id").references(() => units.id),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  category: expenseCategoryEnum("category").notNull(),
  expenseType: expenseTypeEnum("expense_type").default('sonstiges'),
  bezeichnung: text("bezeichnung").notNull(),
  betrag: numeric("betrag", { precision: 10, scale: 2 }).default('0'),
  datum: date("datum").notNull(),
  belegNummer: text("beleg_nummer"),
  belegUrl: text("beleg_url"),
  notizen: text("notes"),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  mrgKategorie: mrgBkKategorieEnum("mrg_kategorie"),
  mrgParagraph: text("mrg_paragraph"),
  istUmlagefaehig: boolean("ist_umlagefaehig").default(true),
  distributionKeyId: uuid("distribution_key_id").references(() => distributionKeys.id),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const expenseAllocations = pgTable("expense_allocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  expenseId: uuid("expense_id").notNull().references(() => expenses.id),
  unitId: uuid("unit_id").notNull().references(() => units.id),
  allocatedNet: numeric("allocated_net", { precision: 12, scale: 2 }).notNull(),
  allocationBasis: varchar("allocation_basis", { length: 50 }).notNull(),
  allocationDetail: text("allocation_detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertExpenseAllocationSchema = createInsertSchema(expenseAllocations).omit({ id: true, createdAt: true });
export type ExpenseAllocation = typeof expenseAllocations.$inferSelect;
export type InsertExpenseAllocation = typeof expenseAllocations.$inferInsert;

export const settlements = pgTable("settlements", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  year: integer("year").notNull(),
  status: settlementStatusEnum("status").default('entwurf'),
  gesamtausgaben: numeric("gesamtausgaben", { precision: 10, scale: 2 }).default('0'),
  gesamtvorschuss: numeric("gesamtvorschuss", { precision: 10, scale: 2 }).default('0'),
  differenz: numeric("differenz", { precision: 10, scale: 2 }).default('0'),
  berechnungsDatum: timestamp("berechnungs_datum", { withTimezone: true }),
  versandDatum: timestamp("versand_datum", { withTimezone: true }),
  pdfUrl: text("pdf_url"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const settlementDetails = pgTable("settlement_details", {
  id: uuid("id").defaultRandom().primaryKey(),
  settlementId: uuid("settlement_id").references(() => settlements.id).notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  unitId: uuid("unit_id").references(() => units.id).notNull(),
  anteil: numeric("anteil", { precision: 10, scale: 4 }).default('0'),
  ausgabenAnteil: numeric("ausgaben_anteil", { precision: 10, scale: 2 }).default('0'),
  vorschuss: numeric("vorschuss", { precision: 10, scale: 2 }).default('0'),
  differenz: numeric("differenz", { precision: 10, scale: 2 }).default('0'),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const distributionKeys = pgTable("distribution_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  propertyId: uuid("property_id").references(() => properties.id),
  keyCode: text("key_code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  formula: text("formula").default('flaeche'),
  unit: text("unit").default('m²'),
  inputType: text("input_type").default('flaeche'),
  includedUnitTypes: text("included_unit_types").array(),
  isSystem: boolean("is_system").default(false),
  isActive: boolean("is_active").default(true),
  mrgKonform: boolean("mrg_konform").default(true),
  mrgParagraph: text("mrg_paragraph"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const unitDistributionValues = pgTable("unit_distribution_values", {
  id: uuid("id").defaultRandom().primaryKey(),
  unitId: uuid("unit_id").references(() => units.id).notNull(),
  keyId: uuid("key_id").references(() => distributionKeys.id).notNull(),
  value: numeric("value", { precision: 10, scale: 4 }).default('0'),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const maintenanceContracts = pgTable("maintenance_contracts", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  contractType: text("contract_type").default('wartung'),
  contractorName: text("contractor_name"),
  contractorContact: text("contractor_contact"),
  contractorEmail: text("contractor_email"),
  contractFee: numeric("contract_fee", { precision: 10, scale: 2 }),
  intervalMonths: integer("interval_months").default(12),
  nextDueDate: date("next_due_date").notNull(),
  lastMaintenanceDate: date("last_maintenance_date"),
  reminderDays: integer("reminder_days").default(14),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  documentUrl: text("document_url"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const maintenanceTasks = pgTable("maintenance_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  unitId: uuid("unit_id").references(() => units.id),
  contractId: uuid("contract_id").references(() => maintenanceContracts.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").default('reparatur'),
  priority: text("priority").default('normal'),
  status: text("status").default('open'),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  contractorName: text("contractor_name"),
  contractorContact: text("contractor_contact"),
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
  actualCost: numeric("actual_cost", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const contractors = pgTable("contractors", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  companyName: text("company_name").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  mobile: text("mobile"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  iban: text("iban"),
  bic: text("bic"),
  specializations: text("specializations").array(),
  rating: integer("rating"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const accountCategories = pgTable("account_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  parentId: uuid("parent_id"),
  isSystem: boolean("is_system").default(false),
  defaultDistributionKeyId: uuid("default_distribution_key_id").references(() => distributionKeys.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const learnedMatches = pgTable("learned_matches", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  pattern: text("pattern").notNull(),
  unitId: uuid("unit_id").references(() => units.id),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  matchCount: integer("match_count").default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const sepaCollections = pgTable("sepa_collections", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).default('0'),
  tenantCount: integer("tenant_count").default(0),
  status: text("status").default('draft'),
  xmlContent: text("xml_content"),
  fileName: text("file_name"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  recipientType: text("recipient_type").default('internal'),
  recipientEmail: text("recipient_email"),
  messageType: text("message_type"),
  subject: text("subject"),
  messageBody: text("message_body"),
  status: text("status").default('draft'),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => profiles.id),
  runId: uuid("run_id"),
  tableName: text("table_name").notNull(),
  recordId: text("record_id"),
  action: text("action").notNull(),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const invoiceRuns = pgTable("invoice_runs", {
  id: serial("id").primaryKey(),
  runId: uuid("run_id").notNull().unique(),
  period: text("period").notNull(),
  initiatedBy: uuid("initiated_by").references(() => profiles.id),
  status: text("status").notNull().default("started"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPropertySchema = createInsertSchema(properties).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUnitSchema = createInsertSchema(units).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true }).partial({
  type: true,
  status: true,
  flaeche: true,
  zimmer: true,
  nutzwert: true,
  stockwerk: true,
  notes: true,
});
export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMonthlyInvoiceSchema = createInsertSchema(monthlyInvoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export const insertSettlementSchema = createInsertSchema(settlements).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMaintenanceContractSchema = createInsertSchema(maintenanceContracts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMaintenanceTaskSchema = createInsertSchema(maintenanceTasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContractorSchema = createInsertSchema(contractors).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRentHistorySchema = createInsertSchema(rentHistory).omit({ id: true, createdAt: true });

// ====== EIGENTÜMER (OWNERS) ======
export const owners = pgTable("owners", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  companyName: text("company_name"),
  email: text("email"),
  phone: text("phone"),
  mobilePhone: text("mobile_phone"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country").default('Österreich'),
  iban: text("iban"),
  bic: text("bic"),
  bankName: text("bank_name"),
  taxNumber: text("tax_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Zuordnung Eigentümer zu Liegenschaften (many-to-many mit Anteil)
export const propertyOwners = pgTable("property_owners", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  ownerId: uuid("owner_id").references(() => owners.id).notNull(),
  ownershipShare: numeric("ownership_share", { precision: 5, scale: 2 }).default('100.00'),
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ====== ZÄHLERSTÄNDE (METER READINGS) ======
export const meterTypeEnum = pgEnum('meter_type', ['strom', 'gas', 'wasser', 'heizung', 'warmwasser', 'sonstiges']);

export const meters = pgTable("meters", {
  id: uuid("id").defaultRandom().primaryKey(),
  unitId: uuid("unit_id").references(() => units.id).notNull(),
  propertyId: uuid("property_id").references(() => properties.id),
  meterNumber: text("meter_number").notNull(),
  meterType: meterTypeEnum("meter_type").notNull(),
  location: text("location"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const meterReadings = pgTable("meter_readings", {
  id: uuid("id").defaultRandom().primaryKey(),
  meterId: uuid("meter_id").references(() => meters.id).notNull(),
  readingDate: date("reading_date").notNull(),
  readingValue: numeric("reading_value", { precision: 12, scale: 3 }).notNull(),
  isEstimated: boolean("is_estimated").default(false),
  readBy: text("read_by"),
  imageUrl: text("image_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_meter_readings_date").on(table.meterId, table.readingDate),
]);

// ====== SCHLÜSSELVERWALTUNG (KEY MANAGEMENT) ======
export const keyTypeEnum = pgEnum('key_type', ['hauptschluessel', 'wohnungsschluessel', 'kellerschluessel', 'garagenschluessel', 'briefkastenschluessel', 'sonstiges']);
export const keyStatusEnum = pgEnum('key_status', ['vorhanden', 'ausgegeben', 'verloren', 'gesperrt']);

export const keyInventory = pgTable("key_inventory", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  unitId: uuid("unit_id").references(() => units.id),
  keyType: keyTypeEnum("key_type").notNull(),
  keyNumber: text("key_number"),
  description: text("description"),
  totalCount: integer("total_count").default(1),
  availableCount: integer("available_count").default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const keyHandovers = pgTable("key_handovers", {
  id: uuid("id").defaultRandom().primaryKey(),
  keyInventoryId: uuid("key_inventory_id").references(() => keyInventory.id).notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  recipientName: text("recipient_name"),
  handoverDate: date("handover_date").notNull(),
  returnDate: date("return_date"),
  quantity: integer("quantity").default(1),
  status: keyStatusEnum("status").default('ausgegeben'),
  handoverProtocol: text("handover_protocol"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ====== VPI INDEXANPASSUNGEN ======
export const vpiAdjustments = pgTable("vpi_adjustments", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  adjustmentDate: date("adjustment_date").notNull(),
  previousRent: numeric("previous_rent", { precision: 10, scale: 2 }).notNull(),
  newRent: numeric("new_rent", { precision: 10, scale: 2 }).notNull(),
  vpiOld: numeric("vpi_old", { precision: 8, scale: 2 }),
  vpiNew: numeric("vpi_new", { precision: 8, scale: 2 }),
  percentageChange: numeric("percentage_change", { precision: 5, scale: 2 }),
  notificationSent: boolean("notification_sent").default(false),
  notificationDate: date("notification_date"),
  effectiveDate: date("effective_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertOwnerSchema = createInsertSchema(owners).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPropertyOwnerSchema = createInsertSchema(propertyOwners).omit({ id: true, createdAt: true });
export const insertMeterSchema = createInsertSchema(meters).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMeterReadingSchema = createInsertSchema(meterReadings).omit({ id: true, createdAt: true });
export const insertKeyInventorySchema = createInsertSchema(keyInventory).omit({ id: true, createdAt: true, updatedAt: true });
export const insertKeyHandoverSchema = createInsertSchema(keyHandovers).omit({ id: true, createdAt: true });
export const insertVpiAdjustmentSchema = createInsertSchema(vpiAdjustments).omit({ id: true, createdAt: true });

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type InsertMonthlyInvoice = z.infer<typeof insertMonthlyInvoiceSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertSettlement = z.infer<typeof insertSettlementSchema>;
export type InsertMaintenanceContract = z.infer<typeof insertMaintenanceContractSchema>;
export type InsertMaintenanceTask = z.infer<typeof insertMaintenanceTaskSchema>;
export type InsertContractor = z.infer<typeof insertContractorSchema>;

export type Organization = typeof organizations.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type Tenant = typeof tenants.$inferSelect;
export type MonthlyInvoice = typeof monthlyInvoices.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Settlement = typeof settlements.$inferSelect;
export type MaintenanceContract = typeof maintenanceContracts.$inferSelect;
export type MaintenanceTask = typeof maintenanceTasks.$inferSelect;
export type Contractor = typeof contractors.$inferSelect;
export type DistributionKey = typeof distributionKeys.$inferSelect;
export const insertDistributionKeySchema = createInsertSchema(distributionKeys).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDistributionKey = z.infer<typeof insertDistributionKeySchema>;
export type UnitDistributionValue = typeof unitDistributionValues.$inferSelect;
export const insertUnitDistributionValueSchema = createInsertSchema(unitDistributionValues).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUnitDistributionValue = z.infer<typeof insertUnitDistributionValueSchema>;
export type AccountCategory = typeof accountCategories.$inferSelect;
export type LearnedMatch = typeof learnedMatches.$inferSelect;
export type SepaCollection = typeof sepaCollections.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InvoiceRun = typeof invoiceRuns.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;

export type Owner = typeof owners.$inferSelect;
export type PropertyOwner = typeof propertyOwners.$inferSelect;
export type PropertyManager = typeof propertyManagers.$inferSelect;
export type Meter = typeof meters.$inferSelect;
export type MeterReading = typeof meterReadings.$inferSelect;
export type KeyInventory = typeof keyInventory.$inferSelect;
export type KeyHandover = typeof keyHandovers.$inferSelect;
export type VpiAdjustment = typeof vpiAdjustments.$inferSelect;

export type InsertOwner = z.infer<typeof insertOwnerSchema>;
export type InsertPropertyOwner = z.infer<typeof insertPropertyOwnerSchema>;
export type InsertMeter = z.infer<typeof insertMeterSchema>;
export type InsertMeterReading = z.infer<typeof insertMeterReadingSchema>;
export type InsertKeyInventory = z.infer<typeof insertKeyInventorySchema>;
export type InsertKeyHandover = z.infer<typeof insertKeyHandoverSchema>;
export type InsertVpiAdjustment = z.infer<typeof insertVpiAdjustmentSchema>;

// Budget status enum
export const budgetStatusEnum = pgEnum('budget_status', ['entwurf', 'eingereicht', 'genehmigt', 'abgelehnt']);

// Property Budgets table
export const propertyBudgets = pgTable("property_budgets", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  year: integer("year").notNull(),
  position1Name: text("position_1_name"),
  position1Amount: numeric("position_1_amount", { precision: 12, scale: 2 }).default("0"),
  position2Name: text("position_2_name"),
  position2Amount: numeric("position_2_amount", { precision: 12, scale: 2 }).default("0"),
  position3Name: text("position_3_name"),
  position3Amount: numeric("position_3_amount", { precision: 12, scale: 2 }).default("0"),
  position4Name: text("position_4_name"),
  position4Amount: numeric("position_4_amount", { precision: 12, scale: 2 }).default("0"),
  position5Name: text("position_5_name"),
  position5Amount: numeric("position_5_amount", { precision: 12, scale: 2 }).default("0"),
  status: budgetStatusEnum("status").default('entwurf'),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertPropertyBudgetSchema = createInsertSchema(propertyBudgets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPropertyBudget = z.infer<typeof insertPropertyBudgetSchema>;
export type PropertyBudget = typeof propertyBudgets.$inferSelect;

// Document category enum
export const documentCategoryEnum = pgEnum('document_category', [
  'vertrag', 'rechnung', 'bescheid', 'protokoll', 'korrespondenz', 
  'abrechnung', 'mahnung', 'kaution', 'uebergabe', 'sonstiges'
]);

// Property Documents table
export const propertyDocuments = pgTable("property_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  category: documentCategoryEnum("category").default('sonstiges'),
  fileUrl: text("file_url"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Tenant Documents table  
export const tenantDocuments = pgTable("tenant_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  category: documentCategoryEnum("category").default('sonstiges'),
  fileUrl: text("file_url"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertPropertyDocumentSchema = createInsertSchema(propertyDocuments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPropertyDocument = z.infer<typeof insertPropertyDocumentSchema>;
export type PropertyDocument = typeof propertyDocuments.$inferSelect;

export const insertTenantDocumentSchema = createInsertSchema(tenantDocuments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTenantDocument = z.infer<typeof insertTenantDocumentSchema>;
export type TenantDocument = typeof tenantDocuments.$inferSelect;

// Demo status enum
export const demoStatusEnum = pgEnum('demo_status', ['pending', 'activated', 'expired', 'converted']);

// Demo Invites table for prospect testing
export const demoInvites = pgTable("demo_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  status: demoStatusEnum("status").default('pending'),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  demoEndsAt: timestamp("demo_ends_at", { withTimezone: true }),
  userId: uuid("user_id").references(() => profiles.id),
  organizationId: uuid("organization_id").references(() => organizations.id),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertDemoInviteSchema = createInsertSchema(demoInvites).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDemoInvite = z.infer<typeof insertDemoInviteSchema>;
export type DemoInvite = typeof demoInvites.$inferSelect;

// White Label Inquiry status enum
export const whiteLabelInquiryStatusEnum = pgEnum('white_label_inquiry_status', ['neu', 'kontaktiert', 'demo_vereinbart', 'verhandlung', 'abgeschlossen', 'abgelehnt']);

// White Label Inquiries table for prospective White Label customers
export const whiteLabelInquiries = pgTable("white_label_inquiries", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyName: text("company_name").notNull(),
  contactPerson: text("contact_person").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  propertyCount: integer("property_count"),
  unitCount: integer("unit_count"),
  message: text("message"),
  status: whiteLabelInquiryStatusEnum("status").default('neu'),
  notes: text("notes"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertWhiteLabelInquirySchema = createInsertSchema(whiteLabelInquiries).omit({ id: true, createdAt: true, updatedAt: true, ipAddress: true, userAgent: true, notes: true, status: true });
export type InsertWhiteLabelInquiry = z.infer<typeof insertWhiteLabelInquirySchema>;
export type WhiteLabelInquiry = typeof whiteLabelInquiries.$inferSelect;

// White Label Licenses table for active White Label customers
export const whiteLabelLicenseStatusEnum = pgEnum('white_label_license_status', ['aktiv', 'gekuendigt', 'pausiert', 'abgelaufen']);

export const whiteLabelLicenses = pgTable("white_label_licenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  licenseName: text("license_name").notNull(),
  monthlyPrice: numeric("monthly_price", { precision: 10, scale: 2 }),
  setupFee: numeric("setup_fee", { precision: 10, scale: 2 }),
  contractStart: date("contract_start").notNull(),
  contractEnd: date("contract_end"),
  status: whiteLabelLicenseStatusEnum("status").default('aktiv'),
  customDomain: text("custom_domain"),
  maxUsers: integer("max_users"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertWhiteLabelLicenseSchema = createInsertSchema(whiteLabelLicenses).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWhiteLabelLicense = z.infer<typeof insertWhiteLabelLicenseSchema>;
export type WhiteLabelLicense = typeof whiteLabelLicenses.$inferSelect;
