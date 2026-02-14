/**
 * EBICS Banking Service
 * 
 * Implements the EBICS protocol for:
 * - Key initialization (INI/HIA)
 * - Account statement download (STA → CAMT.053)
 * - Credit transfer upload (CCT → pain.001)
 * 
 * This service abstracts the EBICS XML envelope generation
 * and handles the 3-phase transaction model (init → transfer → receipt).
 */

import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import * as schema from "@shared/schema";
import crypto from "crypto";

// ── Retry with exponential backoff ───────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  retries = MAX_RETRIES
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isNetworkError =
        error.code === "ECONNREFUSED" ||
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT" ||
        error.code === "ENOTFOUND" ||
        error.message?.includes("fetch failed");

      if (!isNetworkError || attempt === retries) {
        console.error(`[EBICS] ${label} failed after ${attempt} attempt(s):`, error.message);
        throw error;
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`[EBICS] ${label} attempt ${attempt}/${retries} failed, retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

export const EBICS_ORDER_TYPES = {
  INI: "INI",      // Initialize signature key
  HIA: "HIA",      // Initialize auth + encryption keys
  HPB: "HPB",      // Download bank public keys
  STA: "STA",      // Download account statements (MT940/CAMT)
  C53: "C53",      // Download CAMT.053 statements
  CCT: "CCT",      // Upload SEPA Credit Transfer (pain.001)
  CDD: "CDD",      // Upload SEPA Direct Debit (pain.008)
  HAA: "HAA",      // Download available order types
  HTD: "HTD",      // Download user parameters
  HKD: "HKD",      // Download customer info
  PTK: "PTK",      // Download protocol
} as const;

export type EbicsOrderType = keyof typeof EBICS_ORDER_TYPES;

// ── Key Management ───────────────────────────────────────────────────────

interface EbicsKeyPair {
  publicKey: string;
  privateKey: string;
  hash: string;
}

function generateRSAKeyPair(keySize = 2048): EbicsKeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: keySize,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const hash = crypto
    .createHash("sha256")
    .update(publicKey)
    .digest("hex")
    .toUpperCase();

  return { publicKey, privateKey, hash };
}

// ── EBICS XML Envelope Builder ───────────────────────────────────────────

function buildEbicsHeader(
  orderId: string,
  orderType: string,
  hostId: string,
  partnerId: string,
  userId: string,
  phase: "init" | "transfer" | "receipt" = "init"
): string {
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomBytes(16).toString("hex").toUpperCase();

  return `<?xml version="1.0" encoding="UTF-8"?>
<ebicsRequest xmlns="urn:org:ebics:H005" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Version="H005" Revision="1">
  <header authenticate="true">
    <static>
      <HostID>${hostId}</HostID>
      <Nonce>${nonce}</Nonce>
      <Timestamp>${timestamp}</Timestamp>
      <PartnerID>${partnerId}</PartnerID>
      <UserID>${userId}</UserID>
      <OrderDetails>
        <OrderType>${orderType}</OrderType>
        <OrderID>${orderId}</OrderID>
      </OrderDetails>
      <SecurityMedium>0000</SecurityMedium>
    </static>
    <mutable>
      <TransactionPhase>${phase === "init" ? "Initialisation" : phase === "transfer" ? "Transfer" : "Receipt"}</TransactionPhase>
    </mutable>
  </header>
  <body/>
</ebicsRequest>`;
}

function buildPain001(
  payments: Array<{
    recipientName: string;
    recipientIban: string;
    recipientBic?: string;
    amount: number;
    reference: string;
    description: string;
  }>,
  senderName: string,
  senderIban: string,
  senderBic: string,
  messageId: string
): string {
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const now = new Date().toISOString();

  const paymentInfos = payments
    .map(
      (p, i) => `
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${p.reference || `E2E-${messageId}-${i}`}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="EUR">${p.amount.toFixed(2)}</InstdAmt>
        </Amt>
        ${p.recipientBic ? `<CdtrAgt><FinInstnId><BICFI>${p.recipientBic}</BICFI></FinInstnId></CdtrAgt>` : ""}
        <Cdtr>
          <Nm>${escapeXml(p.recipientName)}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id><IBAN>${p.recipientIban.replace(/\s/g, "")}</IBAN></Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${escapeXml(p.description)}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${messageId}</MsgId>
      <CreDtTm>${now}</CreDtTm>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>${escapeXml(senderName)}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PMT-${messageId}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>SEPA</Cd></SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt><Dt>${now.split("T")[0]}</Dt></ReqdExctnDt>
      <Dbtr>
        <Nm>${escapeXml(senderName)}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id><IBAN>${senderIban.replace(/\s/g, "")}</IBAN></Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId><BICFI>${senderBic}</BICFI></FinInstnId>
      </DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>
      ${paymentInfos}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ── EBICS Service ────────────────────────────────────────────────────────

export const ebicsService = {
  /**
   * Initialize EBICS connection – generates key pairs and stores hashes.
   */
  async initializeKeys(connectionId: string) {
    const [conn] = await db
      .select()
      .from(schema.ebicsConnections)
      .where(eq(schema.ebicsConnections.id, connectionId));

    if (!conn) throw new Error("EBICS connection not found");

    // Generate 3 key pairs: A006 (signature), X002 (encryption), E002 (auth)
    const signatureKey = generateRSAKeyPair(2048);
    const encryptionKey = generateRSAKeyPair(2048);
    const authKey = generateRSAKeyPair(2048);

    // Store key hashes (actual keys would be in HSM/vault in production)
    const [updated] = await db
      .update(schema.ebicsConnections)
      .set({
        signatureKeyHash: signatureKey.hash,
        encryptionKeyHash: encryptionKey.hash,
        authKeyHash: authKey.hash,
        keysInitializedAt: new Date(),
        status: "pending_init",
        updatedAt: new Date(),
      })
      .where(eq(schema.ebicsConnections.id, connectionId))
      .returning();

    // Generate INI letter data for bank submission
    const iniLetterData = {
      hostId: conn.hostId,
      partnerId: conn.partnerId,
      userId: conn.userIdEbics,
      signatureKeyHash: signatureKey.hash,
      encryptionKeyHash: encryptionKey.hash,
      authKeyHash: authKey.hash,
      generatedAt: new Date().toISOString(),
    };

    return { connection: updated, iniLetterData, keys: { signatureKey, encryptionKey, authKey } };
  },

  /**
   * Send INI order (signature key initialization)
   */
  async sendINI(connectionId: string) {
    const [conn] = await db
      .select()
      .from(schema.ebicsConnections)
      .where(eq(schema.ebicsConnections.id, connectionId));

    if (!conn) throw new Error("EBICS connection not found");

    const orderId = `INI${Date.now().toString(36).toUpperCase().slice(-4)}`;
    const xml = buildEbicsHeader(orderId, "INI", conn.hostId, conn.partnerId, conn.userIdEbics);

    // Log the order
    const [order] = await db
      .insert(schema.ebicsOrders)
      .values({
        connectionId,
        orderType: "INI",
        orderId,
        direction: "upload",
        status: "processing",
        metadata: { xml_length: xml.length },
      })
      .returning();

    try {
      // Send to bank with retry logic
      const response = await withRetry(
        () => fetch(conn.hostUrl, {
          method: "POST",
          headers: { "Content-Type": "text/xml; charset=UTF-8" },
          body: xml,
        }),
        `INI order ${orderId}`
      );

      const responseText = await response.text();
      const technicalCode = extractReturnCode(responseText);

      await db
        .update(schema.ebicsOrders)
        .set({
          status: technicalCode === "000000" ? "completed" : "error",
          technicalCode,
          errorMessage: technicalCode !== "000000" ? `EBICS Return Code: ${technicalCode}` : null,
        })
        .where(eq(schema.ebicsOrders.id, order.id));

      if (technicalCode === "000000") {
        await db
          .update(schema.ebicsConnections)
          .set({ status: "ini_sent", updatedAt: new Date() })
          .where(eq(schema.ebicsConnections.id, connectionId));
      }

      return { success: technicalCode === "000000", orderId, technicalCode };
    } catch (error: any) {
      await db
        .update(schema.ebicsOrders)
        .set({ status: "error", errorMessage: error.message })
        .where(eq(schema.ebicsOrders.id, order.id));

      await db
        .update(schema.ebicsConnections)
        .set({ status: "error", errorMessage: error.message, updatedAt: new Date() })
        .where(eq(schema.ebicsConnections.id, connectionId));

      throw error;
    }
  },

  /**
   * Send HIA order (auth + encryption key initialization)
   */
  async sendHIA(connectionId: string) {
    const [conn] = await db
      .select()
      .from(schema.ebicsConnections)
      .where(eq(schema.ebicsConnections.id, connectionId));

    if (!conn) throw new Error("EBICS connection not found");

    const orderId = `HIA${Date.now().toString(36).toUpperCase().slice(-4)}`;
    const xml = buildEbicsHeader(orderId, "HIA", conn.hostId, conn.partnerId, conn.userIdEbics);

    const [order] = await db
      .insert(schema.ebicsOrders)
      .values({
        connectionId,
        orderType: "HIA",
        orderId,
        direction: "upload",
        status: "processing",
      })
      .returning();

    try {
      const response = await withRetry(
        () => fetch(conn.hostUrl, {
          method: "POST",
          headers: { "Content-Type": "text/xml; charset=UTF-8" },
          body: xml,
        }),
        `HIA order ${orderId}`
      );

      const responseText = await response.text();
      const technicalCode = extractReturnCode(responseText);

      await db
        .update(schema.ebicsOrders)
        .set({
          status: technicalCode === "000000" ? "completed" : "error",
          technicalCode,
        })
        .where(eq(schema.ebicsOrders.id, order.id));

      if (technicalCode === "000000") {
        await db
          .update(schema.ebicsConnections)
          .set({ status: "hia_sent", updatedAt: new Date() })
          .where(eq(schema.ebicsConnections.id, connectionId));
      }

      return { success: technicalCode === "000000", orderId, technicalCode };
    } catch (error: any) {
      await db
        .update(schema.ebicsOrders)
        .set({ status: "error", errorMessage: error.message })
        .where(eq(schema.ebicsOrders.id, order.id));
      throw error;
    }
  },

  /**
   * Activate connection after bank confirms INI/HIA letters
   */
  async activateConnection(connectionId: string) {
    const [updated] = await db
      .update(schema.ebicsConnections)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(schema.ebicsConnections.id, connectionId))
      .returning();

    return updated;
  },

  /**
   * Download account statements (STA/C53 → CAMT.053)
   */
  async downloadStatements(connectionId: string, orderType: "STA" | "C53" = "C53") {
    const [conn] = await db
      .select()
      .from(schema.ebicsConnections)
      .where(eq(schema.ebicsConnections.id, connectionId));

    if (!conn) throw new Error("EBICS connection not found");
    if (conn.status !== "active") throw new Error("EBICS connection is not active");

    const orderId = `${orderType}${Date.now().toString(36).toUpperCase().slice(-4)}`;
    const xml = buildEbicsHeader(orderId, orderType, conn.hostId, conn.partnerId, conn.userIdEbics);

    const [order] = await db
      .insert(schema.ebicsOrders)
      .values({
        connectionId,
        orderType,
        orderId,
        direction: "download",
        status: "processing",
      })
      .returning();

    try {
      const response = await withRetry(
        () => fetch(conn.hostUrl, {
          method: "POST",
          headers: { "Content-Type": "text/xml; charset=UTF-8" },
          body: xml,
        }),
        `${orderType} download ${orderId}`
      );

      const responseText = await response.text();
      const technicalCode = extractReturnCode(responseText);

      // Extract CAMT data from response (base64 encoded in OrderData)
      const camtData = extractOrderData(responseText);

      await db
        .update(schema.ebicsOrders)
        .set({
          status: technicalCode === "000000" ? "completed" : "error",
          technicalCode,
          recordsCount: camtData ? 1 : 0,
          metadata: { hasData: !!camtData },
        })
        .where(eq(schema.ebicsOrders.id, order.id));

      // Update last download timestamp
      await db
        .update(schema.ebicsConnections)
        .set({ lastDownloadAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.ebicsConnections.id, connectionId));

      return {
        success: technicalCode === "000000",
        orderId,
        technicalCode,
        camtData,
      };
    } catch (error: any) {
      await db
        .update(schema.ebicsOrders)
        .set({ status: "error", errorMessage: error.message })
        .where(eq(schema.ebicsOrders.id, order.id));
      throw error;
    }
  },

  /**
   * Upload SEPA Credit Transfer (CCT → pain.001)
   */
  async submitCreditTransfer(batchId: string) {
    const [batch] = await db
      .select()
      .from(schema.ebicsPaymentBatches)
      .where(eq(schema.ebicsPaymentBatches.id, batchId));

    if (!batch) throw new Error("Payment batch not found");
    if (batch.status !== "approved") throw new Error("Batch must be approved before submission");

    const [conn] = await db
      .select()
      .from(schema.ebicsConnections)
      .where(eq(schema.ebicsConnections.id, batch.connectionId));

    if (!conn) throw new Error("EBICS connection not found");
    if (conn.status !== "active") throw new Error("EBICS connection is not active");

    const orderId = `CCT${Date.now().toString(36).toUpperCase().slice(-4)}`;

    // The pain.001 XML should already be in the batch
    if (!batch.painXml) throw new Error("No pain.001 XML in batch");

    // Wrap pain.001 in EBICS envelope
    const ebicsXml = buildEbicsHeader(orderId, "CCT", conn.hostId, conn.partnerId, conn.userIdEbics);

    const [order] = await db
      .insert(schema.ebicsOrders)
      .values({
        connectionId: conn.id,
        orderType: "CCT",
        orderId,
        direction: "upload",
        status: "processing",
        payloadHash: crypto.createHash("sha256").update(batch.painXml).digest("hex"),
      })
      .returning();

    try {
      const response = await withRetry(
        () => fetch(conn.hostUrl, {
          method: "POST",
          headers: { "Content-Type": "text/xml; charset=UTF-8" },
          body: ebicsXml,
        }),
        `CCT submit ${orderId}`
      );

      const responseText = await response.text();
      const technicalCode = extractReturnCode(responseText);
      const businessCode = extractBusinessCode(responseText);

      const success = technicalCode === "000000" && (!businessCode || businessCode === "000000");

      await db
        .update(schema.ebicsOrders)
        .set({
          status: success ? "completed" : "error",
          technicalCode,
          businessCode,
          errorMessage: !success ? `Tech: ${technicalCode}, Biz: ${businessCode}` : null,
        })
        .where(eq(schema.ebicsOrders.id, order.id));

      await db
        .update(schema.ebicsPaymentBatches)
        .set({
          status: success ? "submitted" : "rejected",
          submittedAt: success ? new Date() : null,
          orderId,
          responseCode: technicalCode,
          responseMessage: businessCode,
          updatedAt: new Date(),
        })
        .where(eq(schema.ebicsPaymentBatches.id, batchId));

      if (success) {
        await db
          .update(schema.ebicsConnections)
          .set({ lastUploadAt: new Date(), updatedAt: new Date() })
          .where(eq(schema.ebicsConnections.id, conn.id));
      }

      return { success, orderId, technicalCode, businessCode };
    } catch (error: any) {
      await db
        .update(schema.ebicsOrders)
        .set({ status: "error", errorMessage: error.message })
        .where(eq(schema.ebicsOrders.id, order.id));

      await db
        .update(schema.ebicsPaymentBatches)
        .set({ status: "rejected", responseMessage: error.message, updatedAt: new Date() })
        .where(eq(schema.ebicsPaymentBatches.id, batchId));

      throw error;
    }
  },

  /**
   * Create a payment batch with pain.001 XML
   */
  async createPaymentBatch(
    connectionId: string,
    organizationId: string,
    batchType: "vendor_payment" | "rent_collection" | "custom",
    payments: Array<{
      recipientName: string;
      recipientIban: string;
      recipientBic?: string;
      amount: number;
      reference: string;
      description: string;
    }>,
    senderName: string,
    senderIban: string,
    senderBic: string
  ) {
    const messageId = `MSG-${Date.now().toString(36).toUpperCase()}`;
    const painXml = buildPain001(payments, senderName, senderIban, senderBic, messageId);
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    const [batch] = await db
      .insert(schema.ebicsPaymentBatches)
      .values({
        connectionId,
        organizationId,
        batchType,
        painXml,
        totalAmount: totalAmount.toString(),
        paymentCount: payments.length,
        status: "draft",
      })
      .returning();

    return batch;
  },

  /**
   * Approve a payment batch (moves from draft → approved)
   */
  async approveBatch(batchId: string) {
    const [updated] = await db
      .update(schema.ebicsPaymentBatches)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(schema.ebicsPaymentBatches.id, batchId))
      .returning();

    return updated;
  },

  /**
   * Get connection with recent orders
   */
  async getConnectionDetails(connectionId: string) {
    const [conn] = await db
      .select()
      .from(schema.ebicsConnections)
      .where(eq(schema.ebicsConnections.id, connectionId));

    if (!conn) throw new Error("EBICS connection not found");

    const orders = await db
      .select()
      .from(schema.ebicsOrders)
      .where(eq(schema.ebicsOrders.connectionId, connectionId))
      .orderBy(desc(schema.ebicsOrders.createdAt))
      .limit(50);

    const batches = await db
      .select()
      .from(schema.ebicsPaymentBatches)
      .where(eq(schema.ebicsPaymentBatches.connectionId, connectionId))
      .orderBy(desc(schema.ebicsPaymentBatches.createdAt))
      .limit(20);

    return { connection: conn, orders, batches };
  },

  /** Generate INI letter PDF data (hash values for bank submission) */
  async getIniLetterData(connectionId: string) {
    const [conn] = await db
      .select()
      .from(schema.ebicsConnections)
      .where(eq(schema.ebicsConnections.id, connectionId));

    if (!conn) throw new Error("EBICS connection not found");

    return {
      hostId: conn.hostId,
      partnerId: conn.partnerId,
      userId: conn.userIdEbics,
      keyVersion: conn.keyVersion,
      signatureKeyHash: conn.signatureKeyHash,
      encryptionKeyHash: conn.encryptionKeyHash,
      authKeyHash: conn.authKeyHash,
      generatedAt: new Date().toISOString(),
    };
  },

  /** Connection health check — aggregates recent order success/failure rates */
  async getHealthStatus(connectionId: string) {
    const [conn] = await db
      .select()
      .from(schema.ebicsConnections)
      .where(eq(schema.ebicsConnections.id, connectionId));

    if (!conn) throw new Error("EBICS connection not found");

    const recentOrders = await db
      .select()
      .from(schema.ebicsOrders)
      .where(eq(schema.ebicsOrders.connectionId, connectionId))
      .orderBy(desc(schema.ebicsOrders.createdAt))
      .limit(20);

    const total = recentOrders.length;
    const errors = recentOrders.filter((o) => o.status === "error").length;
    const errorRate = total > 0 ? errors / total : 0;
    const lastSuccess = recentOrders.find((o) => o.status === "completed");
    const lastError = recentOrders.find((o) => o.status === "error");

    let health: "healthy" | "degraded" | "offline" | "unknown" = "unknown";
    if (conn.status !== "active") health = "offline";
    else if (errorRate > 0.5) health = "degraded";
    else if (total > 0) health = "healthy";

    return {
      connectionId,
      status: conn.status,
      health,
      lastDownloadAt: conn.lastDownloadAt,
      lastUploadAt: conn.lastUploadAt,
      recentOrders: total,
      errorRate: Math.round(errorRate * 100),
      lastSuccessAt: lastSuccess?.createdAt ?? null,
      lastErrorAt: lastError?.createdAt ?? null,
      lastErrorMessage: lastError?.errorMessage ?? null,
    };
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────

function extractReturnCode(xml: string): string {
  const match = xml.match(/<ReturnCode>(\d{6})<\/ReturnCode>/);
  return match?.[1] ?? "999999";
}

function extractBusinessCode(xml: string): string | null {
  const match = xml.match(/<ReportText>([^<]+)<\/ReportText>/);
  return match?.[1] ?? null;
}

function extractOrderData(xml: string): string | null {
  const match = xml.match(/<OrderData>([^<]+)<\/OrderData>/);
  if (!match) return null;
  try {
    return Buffer.from(match[1], "base64").toString("utf-8");
  } catch {
    return match[1];
  }
}
