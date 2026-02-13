import { pgTable, text, uuid, timestamp, integer, numeric, date, boolean, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { expenseCategoryEnum, expenseTypeEnum, mrgBkKategorieEnum, settlementStatusEnum, budgetStatusEnum } from "./enums";
import { organizations, profiles } from "./organizations";
import { properties, units } from "./properties";
import { tenants } from "./tenants";

// ── Distribution Keys (Verteilungsschlüssel) ─────────────────────────────
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

// ── Unit Distribution Values ─────────────────────────────────────────────
export const unitDistributionValues = pgTable("unit_distribution_values", {
  id: uuid("id").defaultRandom().primaryKey(),
  unitId: uuid("unit_id").references(() => units.id).notNull(),
  keyId: uuid("key_id").references(() => distributionKeys.id).notNull(),
  value: numeric("value", { precision: 10, scale: 4 }).default('0'),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Bank Accounts ────────────────────────────────────────────────────────
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

// ── Transactions ─────────────────────────────────────────────────────────
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
  matchConfidence: varchar("match_confidence", { length: 10 }),
  matchMethod: varchar("match_method", { length: 20 }),
  endToEndId: text("end_to_end_id"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Expenses (Ausgaben) ──────────────────────────────────────────────────
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

// ── Expense Allocations ──────────────────────────────────────────────────

export const expenseAllocations = pgTable("expense_allocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  expenseId: uuid("expense_id").notNull().references(() => expenses.id),
  unitId: uuid("unit_id").notNull().references(() => units.id),
  allocatedNet: numeric("allocated_net", { precision: 12, scale: 2 }).notNull(),
  allocationBasis: varchar("allocation_basis", { length: 50 }).notNull(),
  allocationDetail: text("allocation_detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Account Categories ───────────────────────────────────────────────────
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

// ── Learned Matches (Bank ↔ Tenant) ──────────────────────────────────────
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

// ── Settlements (BK-Abrechnungen) ────────────────────────────────────────
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

// ── Settlement Details ───────────────────────────────────────────────────
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

// ── Property Budgets ─────────────────────────────────────────────────────
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

// ── Schemas & Types ──────────────────────────────────────────────────────
export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExpenseAllocationSchema = createInsertSchema(expenseAllocations).omit({ id: true, createdAt: true });
export const insertSettlementSchema = createInsertSchema(settlements).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDistributionKeySchema = createInsertSchema(distributionKeys).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUnitDistributionValueSchema = createInsertSchema(unitDistributionValues).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPropertyBudgetSchema = createInsertSchema(propertyBudgets).omit({ id: true, createdAt: true, updatedAt: true });

export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type ExpenseAllocation = typeof expenseAllocations.$inferSelect;
export type InsertExpenseAllocation = typeof expenseAllocations.$inferInsert;
export type Settlement = typeof settlements.$inferSelect;
export type InsertSettlement = z.infer<typeof insertSettlementSchema>;
export type DistributionKey = typeof distributionKeys.$inferSelect;
export type InsertDistributionKey = z.infer<typeof insertDistributionKeySchema>;
export type UnitDistributionValue = typeof unitDistributionValues.$inferSelect;
export type InsertUnitDistributionValue = z.infer<typeof insertUnitDistributionValueSchema>;
export type AccountCategory = typeof accountCategories.$inferSelect;
export type LearnedMatch = typeof learnedMatches.$inferSelect;
export type PropertyBudget = typeof propertyBudgets.$inferSelect;
export type InsertPropertyBudget = z.infer<typeof insertPropertyBudgetSchema>;
