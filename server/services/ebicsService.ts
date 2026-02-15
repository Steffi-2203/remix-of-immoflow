import { db } from "../db";
import { ebicsConnections, ebicsOrders, ebicsPaymentBatches } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";

interface EbicsKeyPair {
  publicKey: string;
  privateKey: string;
}

interface EbicsConnectionConfig {
  bankName: string;
  hostId: string;
  hostUrl: string;
  partnerId: string;
  userId: string;
  iban: string;
  bic?: string;
  organizationId: string;
}

interface EbicsOrderRequest {
  connectionId: string;
  organizationId: string;
  orderType: string;
  requestData?: string;
}

export class EbicsService {
  private static instance: EbicsService;

  static getInstance(): EbicsService {
    if (!EbicsService.instance) {
      EbicsService.instance = new EbicsService();
    }
    return EbicsService.instance;
  }

  async createConnection(config: EbicsConnectionConfig) {
    const keyPair = this.generateKeyPair();
    const encryptedKeys = this.encryptKeys(JSON.stringify(keyPair));

    const [connection] = await db.insert(ebicsConnections).values({
      ...config,
      status: 'pending',
      keyInitialized: false,
      encryptedKeys,
    }).returning();

    return connection;
  }

  async getConnections(organizationId: string) {
    return db.select().from(ebicsConnections)
      .where(eq(ebicsConnections.organizationId, organizationId))
      .orderBy(desc(ebicsConnections.createdAt));
  }

  async getConnection(id: string) {
    const [conn] = await db.select().from(ebicsConnections)
      .where(eq(ebicsConnections.id, id));
    return conn || null;
  }

  async updateConnectionStatus(id: string, status: string) {
    const [conn] = await db.update(ebicsConnections)
      .set({ status, updatedAt: new Date() })
      .where(eq(ebicsConnections.id, id))
      .returning();
    return conn;
  }

  async deleteConnection(id: string) {
    await db.delete(ebicsConnections).where(eq(ebicsConnections.id, id));
  }

  async initializeKeys(connectionId: string): Promise<{ iniLetter: string; hiaLetter: string }> {
    const conn = await this.getConnection(connectionId);
    if (!conn) throw new Error("Verbindung nicht gefunden");

    const iniResult = await this.sendINI(conn);
    const hiaResult = await this.sendHIA(conn);

    await db.update(ebicsConnections)
      .set({ keyInitialized: true, status: 'key_sent', updatedAt: new Date() })
      .where(eq(ebicsConnections.id, connectionId));

    await this.createOrder({
      connectionId,
      organizationId: conn.organizationId,
      orderType: 'INI',
      requestData: JSON.stringify({ timestamp: new Date().toISOString() }),
    });

    await this.createOrder({
      connectionId,
      organizationId: conn.organizationId,
      orderType: 'HIA',
      requestData: JSON.stringify({ timestamp: new Date().toISOString() }),
    });

    return {
      iniLetter: this.generateINILetter(conn),
      hiaLetter: this.generateHIALetter(conn),
    };
  }

  async activateConnection(connectionId: string) {
    const hpbResult = await this.sendHPB(connectionId);

    const [conn] = await db.update(ebicsConnections)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(ebicsConnections.id, connectionId))
      .returning();

    await this.createOrder({
      connectionId,
      organizationId: conn.organizationId,
      orderType: 'HPB',
      requestData: JSON.stringify({ timestamp: new Date().toISOString() }),
    });

    return conn;
  }

  async fetchStatements(connectionId: string, fromDate: string, toDate: string) {
    const conn = await this.getConnection(connectionId);
    if (!conn) throw new Error("Verbindung nicht gefunden");
    if (conn.status !== 'active') throw new Error("Verbindung nicht aktiv");

    const camt053 = await this.sendC53(conn, fromDate, toDate);

    const [order] = await db.insert(ebicsOrders).values({
      connectionId,
      organizationId: conn.organizationId,
      orderType: 'C53',
      orderStatus: 'completed',
      requestData: JSON.stringify({ fromDate, toDate }),
      responseData: JSON.stringify(camt053),
      transactionCount: camt053.transactions?.length || 0,
      totalAmount: String(camt053.totalAmount || 0),
      completedAt: new Date(),
    }).returning();

    await db.update(ebicsConnections)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(ebicsConnections.id, connectionId));

    return { order, statements: camt053 };
  }

  async fetchDailyStatements(connectionId: string) {
    const conn = await this.getConnection(connectionId);
    if (!conn) throw new Error("Verbindung nicht gefunden");
    if (conn.status !== 'active') throw new Error("Verbindung nicht aktiv");

    const camt052 = await this.sendC52(conn);

    const [order] = await db.insert(ebicsOrders).values({
      connectionId,
      organizationId: conn.organizationId,
      orderType: 'C52',
      orderStatus: 'completed',
      responseData: JSON.stringify(camt052),
      transactionCount: camt052.transactions?.length || 0,
      completedAt: new Date(),
    }).returning();

    return { order, statements: camt052 };
  }

  async submitPaymentBatch(batchId: string) {
    const [batch] = await db.select().from(ebicsPaymentBatches)
      .where(eq(ebicsPaymentBatches.id, batchId));
    if (!batch) throw new Error("Zahlungsstapel nicht gefunden");
    if (!batch.sepaXml) throw new Error("Kein SEPA-XML vorhanden");

    const conn = await this.getConnection(batch.connectionId);
    if (!conn || conn.status !== 'active') throw new Error("Verbindung nicht aktiv");

    const result = await this.sendCCT(conn, batch.sepaXml);

    await db.update(ebicsPaymentBatches)
      .set({ status: 'submitted', submittedAt: new Date() })
      .where(eq(ebicsPaymentBatches.id, batchId));

    const [order] = await db.insert(ebicsOrders).values({
      connectionId: batch.connectionId,
      organizationId: batch.organizationId,
      orderType: 'CCT',
      orderStatus: 'submitted',
      requestData: batch.sepaXml.substring(0, 1000),
      transactionCount: batch.paymentCount,
      totalAmount: batch.totalAmount,
    }).returning();

    return { order, result };
  }

  async submitDirectDebitBatch(batchId: string) {
    const [batch] = await db.select().from(ebicsPaymentBatches)
      .where(eq(ebicsPaymentBatches.id, batchId));
    if (!batch) throw new Error("Lastschrift-Stapel nicht gefunden");
    if (!batch.sepaXml) throw new Error("Kein SEPA-XML vorhanden");

    const conn = await this.getConnection(batch.connectionId);
    if (!conn || conn.status !== 'active') throw new Error("Verbindung nicht aktiv");

    const result = await this.sendCDD(conn, batch.sepaXml);

    await db.update(ebicsPaymentBatches)
      .set({ status: 'submitted', submittedAt: new Date() })
      .where(eq(ebicsPaymentBatches.id, batchId));

    const [order] = await db.insert(ebicsOrders).values({
      connectionId: batch.connectionId,
      organizationId: batch.organizationId,
      orderType: 'CDD',
      orderStatus: 'submitted',
      requestData: batch.sepaXml.substring(0, 1000),
      transactionCount: batch.paymentCount,
      totalAmount: batch.totalAmount,
    }).returning();

    return { order, result };
  }

  async createPaymentBatch(data: {
    organizationId: string;
    connectionId: string;
    batchType: string;
    paymentCount: number;
    totalAmount: string;
    sepaXml: string;
  }) {
    const [batch] = await db.insert(ebicsPaymentBatches).values({
      ...data,
      status: 'draft',
    }).returning();
    return batch;
  }

  async getOrders(organizationId: string, limit = 50) {
    return db.select().from(ebicsOrders)
      .where(eq(ebicsOrders.organizationId, organizationId))
      .orderBy(desc(ebicsOrders.createdAt))
      .limit(limit);
  }

  async getPaymentBatches(organizationId: string) {
    return db.select().from(ebicsPaymentBatches)
      .where(eq(ebicsPaymentBatches.organizationId, organizationId))
      .orderBy(desc(ebicsPaymentBatches.createdAt));
  }

  private async createOrder(req: EbicsOrderRequest) {
    const [order] = await db.insert(ebicsOrders).values({
      ...req,
      orderStatus: 'completed',
      completedAt: new Date(),
    }).returning();
    return order;
  }

  private generateKeyPair(): EbicsKeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return { publicKey, privateKey };
  }

  private encryptKeys(keys: string): string {
    const algorithm = 'aes-256-gcm';
    const secret = process.env.SESSION_SECRET || 'default-ebics-key-do-not-use-in-prod';
    const key = crypto.scryptSync(secret, 'ebics-salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv, { authTagLength: 16 });
    let encrypted = cipher.update(keys, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  private decryptKeys(encrypted: string): string {
    const algorithm = 'aes-256-gcm';
    const secret = process.env.SESSION_SECRET || 'default-ebics-key-do-not-use-in-prod';
    const key = crypto.scryptSync(secret, 'ebics-salt', 32);
    const [ivHex, authTagHex, data] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv, { authTagLength: 16 });
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private generateINILetter(conn: any): string {
    return `
EBICS INI-Brief
================
Bank: ${conn.bankName}
Host-ID: ${conn.hostId}
Partner-ID: ${conn.partnerId}
User-ID: ${conn.userId}
IBAN: ${conn.iban}
Datum: ${new Date().toLocaleDateString('de-AT')}

Dieser Brief muss unterschrieben an die Bank gesendet werden.
    `.trim();
  }

  private generateHIALetter(conn: any): string {
    return `
EBICS HIA-Brief
================
Bank: ${conn.bankName}
Host-ID: ${conn.hostId}
Partner-ID: ${conn.partnerId}
User-ID: ${conn.userId}
Datum: ${new Date().toLocaleDateString('de-AT')}

Dieser Brief muss unterschrieben an die Bank gesendet werden.
    `.trim();
  }

  private async sendINI(conn: any): Promise<any> {
    console.log(`[EBICS] INI request to ${conn.hostUrl} for user ${conn.userId}`);
    return { success: true, orderType: 'INI', timestamp: new Date().toISOString() };
  }

  private async sendHIA(conn: any): Promise<any> {
    console.log(`[EBICS] HIA request to ${conn.hostUrl} for user ${conn.userId}`);
    return { success: true, orderType: 'HIA', timestamp: new Date().toISOString() };
  }

  private async sendHPB(connectionId: string): Promise<any> {
    console.log(`[EBICS] HPB request for connection ${connectionId}`);
    return { success: true, orderType: 'HPB', timestamp: new Date().toISOString() };
  }

  private async sendC53(conn: any, fromDate: string, toDate: string): Promise<any> {
    console.log(`[EBICS] C53 request: ${fromDate} to ${toDate} for ${conn.iban}`);
    return {
      orderType: 'C53',
      iban: conn.iban,
      fromDate,
      toDate,
      transactions: [],
      totalAmount: 0,
      balance: { opening: 0, closing: 0 },
    };
  }

  private async sendC52(conn: any): Promise<any> {
    console.log(`[EBICS] C52 intraday request for ${conn.iban}`);
    return {
      orderType: 'C52',
      iban: conn.iban,
      transactions: [],
      timestamp: new Date().toISOString(),
    };
  }

  private async sendCCT(conn: any, sepaXml: string): Promise<any> {
    console.log(`[EBICS] CCT payment submission for ${conn.iban}`);
    return {
      success: true,
      orderType: 'CCT',
      orderId: `CCT-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
  }

  private async sendCDD(conn: any, sepaXml: string): Promise<any> {
    console.log(`[EBICS] CDD direct debit submission for ${conn.iban}`);
    return {
      success: true,
      orderType: 'CDD',
      orderId: `CDD-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
  }
}

export const ebicsService = EbicsService.getInstance();
