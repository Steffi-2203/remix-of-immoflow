import { pgTable, text, serial, integer, boolean, timestamp, numeric, date, uuid, pgEnum, jsonb, varchar, inet } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export * from "./models/auth";

export const appRoleEnum = pgEnum('app_role', ['admin', 'property_manager', 'finance', 'viewer']);
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
export const tenantStatusEnum = pgEnum('tenant_status', ['aktiv', 'leerstand', 'beendet']);
export const unitTypeEnum = pgEnum('unit_type', ['wohnung', 'geschaeft', 'garage', 'stellplatz', 'lager', 'sonstiges']);
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  organizationId: uuid("organization_id").references(() => organizations.id),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => profiles.id).notNull(),
  role: appRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

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
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

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
  kaution: numeric("kaution", { precision: 10, scale: 2 }),
  kautionBezahlt: boolean("kaution_bezahlt").default(false),
  iban: text("iban"),
  bic: text("bic"),
  sepaMandat: boolean("sepa_mandat").default(false),
  sepaMandatDatum: date("sepa_mandat_datum"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const monthlyInvoices = pgTable("monthly_invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  unitId: uuid("unit_id").references(() => units.id).notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  grundmiete: numeric("grundmiete", { precision: 10, scale: 2 }).default('0'),
  betriebskosten: numeric("betriebskosten", { precision: 10, scale: 2 }).default('0'),
  heizungskosten: numeric("heizungskosten", { precision: 10, scale: 2 }).default('0'),
  ustSatzMiete: integer("ust_satz_miete").default(10),
  ustSatzBk: integer("ust_satz_bk").default(10),
  ustSatzHeizung: integer("ust_satz_heizung").default(20),
  ust: numeric("ust", { precision: 10, scale: 2 }).default('0'),
  gesamtbetrag: numeric("gesamtbetrag", { precision: 10, scale: 2 }).default('0'),
  status: invoiceStatusEnum("status").default('offen'),
  faelligAm: date("faellig_am"),
  pdfUrl: text("pdf_url"),
  vortragMiete: numeric("vortrag_miete", { precision: 10, scale: 2 }).default('0'),
  vortragBk: numeric("vortrag_bk", { precision: 10, scale: 2 }).default('0'),
  vortragHk: numeric("vortrag_hk", { precision: 10, scale: 2 }).default('0'),
  vortragSonstige: numeric("vortrag_sonstige", { precision: 10, scale: 2 }).default('0'),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

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
  transactionId: uuid("transaction_id").references(() => transactions.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

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
  keyCode: text("key_code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  unit: text("unit").default('m²'),
  inputType: text("input_type").default('flaeche'),
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
  tableName: text("table_name").notNull(),
  recordId: text("record_id"),
  action: text("action").notNull(),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPropertySchema = createInsertSchema(properties).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUnitSchema = createInsertSchema(units).omit({ id: true, createdAt: true, updatedAt: true });
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
export type AccountCategory = typeof accountCategories.$inferSelect;
export type LearnedMatch = typeof learnedMatches.$inferSelect;
export type SepaCollection = typeof sepaCollections.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;
