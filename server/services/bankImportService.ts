/**
 * CAMT.053 Bank Import Service
 * Parses ISO 20022 bank statements and auto-matches payments to tenants
 */

import { db } from "../db";
import { tenants, transactions, bankAccounts, learnedMatches } from "@shared/schema";
import { eq, and, ilike, sql } from "drizzle-orm";
import { parseCamtXml, type CamtEntry, type CamtStatement } from "./camtParser";
import Fuse from "fuse.js";

interface MatchResult {
  entry: CamtEntry;
  tenantId: string | null;
  tenantName: string | null;
  unitId: string | null;
  confidence: number; // 0-1
  matchMethod: 'iban' | 'reference' | 'learned' | 'fuzzy' | 'none';
}

interface ImportResult {
  statement: {
    accountIban: string;
    openingBalance: number;
    closingBalance: number;
    entryCount: number;
  };
  matched: MatchResult[];
  unmatched: CamtEntry[];
  created: number;
  skipped: number;
}

export class BankImportService {
  /**
   * Import a CAMT.053/054 XML file and auto-match entries to tenants
   */
  async importCamtFile(
    xmlContent: string,
    organizationId: string,
    bankAccountId?: string
  ): Promise<ImportResult> {
    const statement = parseCamtXml(xmlContent);

    // Find or validate bank account
    let targetBankAccountId = bankAccountId;
    if (!targetBankAccountId && statement.accountIban) {
      const accounts = await db.select().from(bankAccounts)
        .where(and(
          eq(bankAccounts.organizationId, organizationId),
          eq(bankAccounts.iban, statement.accountIban.replace(/\s/g, ''))
        )).limit(1);
      targetBankAccountId = accounts[0]?.id;
    }

    // Load all tenants for matching
    const orgTenants = await this.getOrganizationTenants(organizationId);
    
    // Load learned matches
    const learned = await db.select().from(learnedMatches)
      .where(eq(learnedMatches.organizationId, organizationId));

    // Only process credits (incoming payments)
    const creditEntries = statement.entries.filter(e => e.creditDebit === 'CRDT');

    const matched: MatchResult[] = [];
    const unmatched: CamtEntry[] = [];
    let created = 0;
    let skipped = 0;

    for (const entry of creditEntries) {
      const match = this.matchEntry(entry, orgTenants, learned);
      
      if (match.tenantId && match.confidence >= 0.7) {
        matched.push(match);
        
        // Create transaction if bank account is linked
        if (targetBankAccountId) {
          const exists = await this.isDuplicateTransaction(
            targetBankAccountId,
            entry.bookingDate,
            entry.amount,
            entry.reference
          );
          
          if (!exists) {
            await db.insert(transactions).values({
              bankAccountId: targetBankAccountId,
              transactionDate: entry.bookingDate,
              amount: String(entry.amount),
              description: entry.remittanceInfo || entry.counterpartyName,
              counterpartyName: entry.counterpartyName,
              counterpartyIban: entry.counterpartyIban,
              reference: entry.reference || entry.endToEndId,
              tenantId: match.tenantId,
              unitId: match.unitId,
              status: 'matched',
              matchConfidence: String(Math.round(match.confidence * 100)),
              matchMethod: match.matchMethod,
            });
            created++;
          } else {
            skipped++;
          }
        }
      } else {
        unmatched.push(entry);
      }
    }

    return {
      statement: {
        accountIban: statement.accountIban,
        openingBalance: statement.openingBalance,
        closingBalance: statement.closingBalance,
        entryCount: statement.entries.length,
      },
      matched,
      unmatched,
      created,
      skipped,
    };
  }

  /**
   * Multi-strategy matching: IBAN → Learned → Reference → Fuzzy
   */
  private matchEntry(
    entry: CamtEntry,
    tenants: Array<{ id: string; firstName: string; lastName: string; iban: string | null; unitId: string }>,
    learnedPatterns: Array<{ pattern: string; tenantId: string | null; unitId: string | null }>
  ): MatchResult {
    // Strategy 1: IBAN match (highest confidence)
    if (entry.counterpartyIban) {
      const normalizedIban = entry.counterpartyIban.replace(/\s/g, '');
      const tenant = tenants.find(t => t.iban?.replace(/\s/g, '') === normalizedIban);
      if (tenant) {
        return {
          entry,
          tenantId: tenant.id,
          tenantName: `${tenant.firstName} ${tenant.lastName}`,
          unitId: tenant.unitId,
          confidence: 1.0,
          matchMethod: 'iban',
        };
      }
    }

    // Strategy 2: Learned patterns
    const searchText = `${entry.counterpartyName} ${entry.remittanceInfo}`.toLowerCase();
    for (const lm of learnedPatterns) {
      if (searchText.includes(lm.pattern.toLowerCase())) {
        const tenant = tenants.find(t => t.id === lm.tenantId);
        if (tenant) {
          return {
            entry,
            tenantId: tenant.id,
            tenantName: `${tenant.firstName} ${tenant.lastName}`,
            unitId: tenant.unitId,
            confidence: 0.9,
            matchMethod: 'learned',
          };
        }
      }
    }

    // Strategy 3: Reference/name matching (tenant name in remittance info)
    const fuse = new Fuse(tenants, {
      keys: [
        { name: 'fullName', getFn: (t) => `${t.firstName} ${t.lastName}` },
        { name: 'reverseName', getFn: (t) => `${t.lastName} ${t.firstName}` },
      ],
      threshold: 0.3,
      includeScore: true,
    });

    const fuseResults = fuse.search(searchText);
    if (fuseResults.length > 0 && fuseResults[0].score !== undefined) {
      const best = fuseResults[0];
      const confidence = 1 - (best.score || 0.5);
      if (confidence >= 0.7) {
        return {
          entry,
          tenantId: best.item.id,
          tenantName: `${best.item.firstName} ${best.item.lastName}`,
          unitId: best.item.unitId,
          confidence,
          matchMethod: 'fuzzy',
        };
      }
    }

    return {
      entry,
      tenantId: null,
      tenantName: null,
      unitId: null,
      confidence: 0,
      matchMethod: 'none',
    };
  }

  /**
   * Learn a new match pattern for future auto-matching
   */
  async learnMatch(
    organizationId: string,
    pattern: string,
    tenantId: string,
    unitId: string
  ): Promise<void> {
    await db.insert(learnedMatches).values({
      organizationId,
      pattern: pattern.toLowerCase(),
      tenantId,
      unitId,
    }).onConflictDoUpdate({
      target: [learnedMatches.pattern, learnedMatches.organizationId],
      set: { tenantId, unitId, matchCount: sql`${learnedMatches.matchCount} + 1` },
    });
  }

  private async getOrganizationTenants(organizationId: string) {
    // Batch query: get all tenants for the org in one shot
    const result = await db.execute(sql`
      SELECT t.id, t.first_name as "firstName", t.last_name as "lastName", 
             t.iban, t.unit_id as "unitId"
      FROM tenants t
      JOIN units u ON u.id = t.unit_id
      JOIN properties p ON p.id = u.property_id
      WHERE p.organization_id = ${organizationId}
        AND t.status = 'aktiv'
        AND t.deleted_at IS NULL
    `);
    return result.rows as Array<{ id: string; firstName: string; lastName: string; iban: string | null; unitId: string }>;
  }

  private async isDuplicateTransaction(
    bankAccountId: string,
    bookingDate: string,
    amount: number,
    reference: string
  ): Promise<boolean> {
    const existing = await db.select({ id: transactions.id })
      .from(transactions)
      .where(and(
        eq(transactions.bankAccountId, bankAccountId),
        eq(transactions.transactionDate, bookingDate),
        eq(transactions.amount, String(amount)),
        reference ? eq(transactions.reference, reference) : sql`TRUE`
      )).limit(1);
    return existing.length > 0;
  }
}

export const bankImportService = new BankImportService();
