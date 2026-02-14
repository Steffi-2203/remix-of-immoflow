import { pgTable, text, uuid, timestamp, jsonb, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const ebicsConnections = pgTable("ebics_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id"),
  bankAccountId: uuid("bank_account_id"),
  hostId: text("host_id").notNull(),
  hostUrl: text("host_url").notNull(),
  partnerId: text("partner_id").notNull(),
  userIdEbics: text("user_id_ebics").notNull(),
  systemId: text("system_id"),
  bankName: text("bank_name"),
  status: text("status").notNull().default("pending_init"),
  keyVersion: text("key_version").notNull().default("A006"),
  authKeyHash: text("auth_key_hash"),
  encryptionKeyHash: text("encryption_key_hash"),
  signatureKeyHash: text("signature_key_hash"),
  keysInitializedAt: timestamp("keys_initialized_at", { withTimezone: true }),
  lastDownloadAt: timestamp("last_download_at", { withTimezone: true }),
  lastUploadAt: timestamp("last_upload_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ebicsOrders = pgTable("ebics_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  connectionId: uuid("connection_id").notNull(),
  orderType: text("order_type").notNull(),
  orderId: text("order_id"),
  direction: text("direction").notNull(),
  status: text("status").notNull().default("pending"),
  businessCode: text("business_code"),
  technicalCode: text("technical_code"),
  payloadHash: text("payload_hash"),
  recordsCount: integer("records_count").default(0),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ebicsPaymentBatches = pgTable("ebics_payment_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  connectionId: uuid("connection_id").notNull(),
  organizationId: uuid("organization_id"),
  batchType: text("batch_type").notNull(),
  painXml: text("pain_xml"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentCount: integer("payment_count").notNull().default(0),
  status: text("status").notNull().default("draft"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  responseCode: text("response_code"),
  responseMessage: text("response_message"),
  orderId: text("order_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEbicsConnectionSchema = createInsertSchema(ebicsConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEbicsPaymentBatchSchema = createInsertSchema(ebicsPaymentBatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type EbicsConnection = typeof ebicsConnections.$inferSelect;
export type EbicsOrder = typeof ebicsOrders.$inferSelect;
export type EbicsPaymentBatch = typeof ebicsPaymentBatches.$inferSelect;
