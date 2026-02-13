import { pgTable, text, uuid, timestamp, integer, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { demoStatusEnum, whiteLabelInquiryStatusEnum, whiteLabelLicenseStatusEnum } from "./enums";
import { organizations, profiles } from "./organizations";

// ── Demo Invites ─────────────────────────────────────────────────────────
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

// ── White Label Inquiries ────────────────────────────────────────────────
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

// ── White Label Licenses ─────────────────────────────────────────────────
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

// ── Schemas & Types ──────────────────────────────────────────────────────
export const insertDemoInviteSchema = createInsertSchema(demoInvites).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWhiteLabelInquirySchema = createInsertSchema(whiteLabelInquiries).omit({ id: true, createdAt: true, updatedAt: true, ipAddress: true, userAgent: true, notes: true, status: true });
export const insertWhiteLabelLicenseSchema = createInsertSchema(whiteLabelLicenses).omit({ id: true, createdAt: true, updatedAt: true });

export type DemoInvite = typeof demoInvites.$inferSelect;
export type InsertDemoInvite = z.infer<typeof insertDemoInviteSchema>;
export type WhiteLabelInquiry = typeof whiteLabelInquiries.$inferSelect;
export type InsertWhiteLabelInquiry = z.infer<typeof insertWhiteLabelInquirySchema>;
export type WhiteLabelLicense = typeof whiteLabelLicenses.$inferSelect;
export type InsertWhiteLabelLicense = z.infer<typeof insertWhiteLabelLicenseSchema>;
