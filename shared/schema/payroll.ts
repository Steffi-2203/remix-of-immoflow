import { pgTable, text, uuid, timestamp, integer, numeric, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations } from "./organizations";
import { properties } from "./properties";

// ── Enums ────────────────────────────────────────────────────────────────
export const employeeStatusEnum = pgEnum('employee_status', ['aktiv', 'karenz', 'ausgeschieden']);
export const employmentTypeEnum = pgEnum('employment_type', ['geringfuegig', 'teilzeit', 'vollzeit']);
export const payrollStatusEnum = pgEnum('payroll_status', ['entwurf', 'freigegeben', 'ausbezahlt']);
export const eldaMeldungsartEnum = pgEnum('elda_meldungsart', ['anmeldung', 'abmeldung', 'aenderung', 'beitragsgrundlage']);
export const eldaStatusEnum = pgEnum('elda_status', ['erstellt', 'uebermittelt', 'bestaetigt', 'fehler']);

// ── Property Employees (Hausbetreuer) ────────────────────────────────────
export const propertyEmployees = pgTable("property_employees", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  propertyId: uuid("property_id").references(() => properties.id),
  vorname: text("vorname").notNull(),
  nachname: text("nachname").notNull(),
  svnr: text("svnr"),
  geburtsdatum: date("geburtsdatum"),
  adresse: text("adresse"),
  plz: text("plz"),
  ort: text("ort"),
  eintrittsdatum: date("eintrittsdatum").notNull(),
  austrittsdatum: date("austrittsdatum"),
  beschaeftigungsart: employmentTypeEnum("beschaeftigungsart").notNull().default('geringfuegig'),
  wochenstunden: numeric("wochenstunden", { precision: 5, scale: 2 }).default('0'),
  bruttolohnMonatlich: numeric("bruttolohn_monatlich", { precision: 10, scale: 2 }).notNull().default('0'),
  kollektivvertragStufe: text("kollektivvertrag_stufe"),
  status: employeeStatusEnum("status").notNull().default('aktiv'),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Payroll Entries (Monatliche Lohnabrechnungen) ────────────────────────
export const payrollEntries = pgTable("payroll_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id").notNull().references(() => propertyEmployees.id),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  bruttolohn: numeric("bruttolohn", { precision: 10, scale: 2 }).notNull().default('0'),
  svDn: numeric("sv_dn", { precision: 10, scale: 2 }).notNull().default('0'),
  svDg: numeric("sv_dg", { precision: 10, scale: 2 }).notNull().default('0'),
  lohnsteuer: numeric("lohnsteuer", { precision: 10, scale: 2 }).notNull().default('0'),
  dbBeitrag: numeric("db_beitrag", { precision: 10, scale: 2 }).notNull().default('0'),
  dzBeitrag: numeric("dz_beitrag", { precision: 10, scale: 2 }).notNull().default('0'),
  kommunalsteuer: numeric("kommunalsteuer", { precision: 10, scale: 2 }).notNull().default('0'),
  mvkBeitrag: numeric("mvk_beitrag", { precision: 10, scale: 2 }).notNull().default('0'),
  nettolohn: numeric("nettolohn", { precision: 10, scale: 2 }).notNull().default('0'),
  gesamtkostenDg: numeric("gesamtkosten_dg", { precision: 10, scale: 2 }).notNull().default('0'),
  auszahlungsdatum: date("auszahlungsdatum"),
  status: payrollStatusEnum("status").notNull().default('entwurf'),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── ELDA Submissions ─────────────────────────────────────────────────────
export const eldaSubmissions = pgTable("elda_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  employeeId: uuid("employee_id").notNull().references(() => propertyEmployees.id),
  meldungsart: eldaMeldungsartEnum("meldungsart").notNull(),
  zeitraum: text("zeitraum"),
  xmlContent: text("xml_content"),
  status: eldaStatusEnum("status").notNull().default('erstellt'),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Zod Schemas ──────────────────────────────────────────────────────────
export const insertPropertyEmployeeSchema = createInsertSchema(propertyEmployees).omit({
  id: true, createdAt: true, updatedAt: true,
});

export const insertPayrollEntrySchema = createInsertSchema(payrollEntries).omit({
  id: true, createdAt: true,
});

export const insertEldaSubmissionSchema = createInsertSchema(eldaSubmissions).omit({
  id: true, createdAt: true,
});

// ── TypeScript Types ─────────────────────────────────────────────────────
export type PropertyEmployee = typeof propertyEmployees.$inferSelect;
export type InsertPropertyEmployee = z.infer<typeof insertPropertyEmployeeSchema>;
export type PayrollEntry = typeof payrollEntries.$inferSelect;
export type InsertPayrollEntry = z.infer<typeof insertPayrollEntrySchema>;
export type EldaSubmission = typeof eldaSubmissions.$inferSelect;
export type InsertEldaSubmission = z.infer<typeof insertEldaSubmissionSchema>;
