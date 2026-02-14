import { Router, Request, Response } from "express";
import { db } from "../db";
import { chartOfAccounts, journalEntries, journalEntryLines, bookingNumberSequences, properties } from "@shared/schema";
import { eq, and, sql, desc, between, gte, lte, asc, or, isNull } from "drizzle-orm";
import { isAuthenticated } from "./helpers";
import { exportSaldenliste, exportBilanz, exportGuV } from "../services/xlsxExportService";
import {
  validateTrialBalance,
  getAccountBalances,
  validateSettlementTotals,
  getReconciliationRate,
  runDailyChecks,
} from "../services/trialBalanceService";
import {
  splitPaymentByPriority,
  allocatePaymentToInvoice,
  getUnallocatedPayments,
  autoMatchPayments,
} from "../services/paymentSplittingService";

const router = Router();

function getOrgId(req: any): string | null {
  return req.session?.organizationId || null;
}

async function validatePropertyOwnership(propertyId: string, orgId: string): Promise<boolean> {
  const result = await db.select({ id: properties.id }).from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.organizationId, orgId)))
    .limit(1);
  return result.length > 0;
}

function getNextBookingNumber(year: number, current: number): string {
  const next = current + 1;
  return `BU-${year}-${String(next).padStart(6, '0')}`;
}

// ====== CHART OF ACCOUNTS ======

router.get("/api/chart-of-accounts", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const accounts = await db.select().from(chartOfAccounts)
      .where(or(
        eq(chartOfAccounts.isSystem, true),
        orgId ? eq(chartOfAccounts.organizationId, orgId) : isNull(chartOfAccounts.organizationId)
      ))
      .orderBy(asc(chartOfAccounts.accountNumber));
    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/chart-of-accounts", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const [account] = await db.insert(chartOfAccounts).values({ ...req.body, organizationId: orgId }).returning();
    res.json(account);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/chart-of-accounts/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const conditions = [eq(chartOfAccounts.id, req.params.id)];
    if (orgId) conditions.push(eq(chartOfAccounts.organizationId, orgId));

    const [account] = await db.update(chartOfAccounts)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    if (!account) return res.status(404).json({ error: "Konto nicht gefunden" });
    res.json(account);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/api/chart-of-accounts/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const conditions: any[] = [eq(chartOfAccounts.id, req.params.id), eq(chartOfAccounts.isSystem, false)];
    if (orgId) conditions.push(eq(chartOfAccounts.organizationId, orgId));

    const [account] = await db.delete(chartOfAccounts)
      .where(and(...conditions))
      .returning();
    if (!account) return res.status(400).json({ error: "Systemkonto kann nicht gelöscht werden" });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== JOURNAL ENTRIES ======

router.get("/api/journal-entries", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { from, to, propertyId } = req.query;

    if (propertyId && orgId && !(await validatePropertyOwnership(propertyId as string, orgId))) {
      return res.status(403).json({ error: "Kein Zugriff auf diese Liegenschaft" });
    }

    let conditions: any[] = [];

    if (orgId) conditions.push(eq(journalEntries.organizationId, orgId));

    if (from && to) {
      conditions.push(between(journalEntries.entryDate, from as string, to as string));
    } else if (from) {
      conditions.push(gte(journalEntries.entryDate, from as string));
    } else if (to) {
      conditions.push(lte(journalEntries.entryDate, to as string));
    }

    if (propertyId) {
      conditions.push(eq(journalEntries.propertyId, propertyId as string));
    }

    const entries = await db.select().from(journalEntries)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(journalEntries.entryDate), desc(journalEntries.createdAt));

    const entryIds = entries.map(e => e.id);
    let lines: any[] = [];
    if (entryIds.length > 0) {
      lines = await db.select({
        line: journalEntryLines,
        accountNumber: chartOfAccounts.accountNumber,
        accountName: chartOfAccounts.name,
      }).from(journalEntryLines)
        .leftJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
        .where(sql`${journalEntryLines.journalEntryId} = ANY(${entryIds})`);
    }

    const linesByEntry = new Map<string, any[]>();
    for (const l of lines) {
      const arr = linesByEntry.get(l.line.journalEntryId) || [];
      arr.push({ ...l.line, accountNumber: l.accountNumber, accountName: l.accountName });
      linesByEntry.set(l.line.journalEntryId, arr);
    }

    const result = entries.map(e => ({
      ...e,
      lines: linesByEntry.get(e.id) || [],
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/journal-entries", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { lines, ...entryData } = req.body;

    if (entryData.propertyId && orgId && !(await validatePropertyOwnership(entryData.propertyId, orgId))) {
      return res.status(403).json({ error: "Kein Zugriff auf diese Liegenschaft" });
    }

    if (!lines || lines.length < 2) {
      return res.status(400).json({ error: "Mindestens 2 Buchungszeilen erforderlich" });
    }

    const totalDebit = lines.reduce((sum: number, l: any) => sum + Number(l.debit || 0), 0);
    const totalCredit = lines.reduce((sum: number, l: any) => sum + Number(l.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({
        error: `Soll (${totalDebit.toFixed(2)}) und Haben (${totalCredit.toFixed(2)}) müssen übereinstimmen`,
      });
    }

    const year = new Date(entryData.entryDate).getFullYear();

    let bookingNumber = entryData.bookingNumber;
    if (!bookingNumber) {
      const seqConditions = [eq(bookingNumberSequences.currentYear, year)];
      if (orgId) seqConditions.push(eq(bookingNumberSequences.organizationId, orgId));

      const [seq] = await db.select().from(bookingNumberSequences).where(and(...seqConditions));

      if (seq) {
        bookingNumber = getNextBookingNumber(year, seq.currentNumber);
        await db.update(bookingNumberSequences)
          .set({ currentNumber: seq.currentNumber + 1 })
          .where(eq(bookingNumberSequences.id, seq.id));
      } else {
        bookingNumber = getNextBookingNumber(year, 0);
        if (orgId) {
          await db.insert(bookingNumberSequences).values({
            organizationId: orgId,
            currentYear: year,
            currentNumber: 1,
          });
        }
      }
    }

    const [entry] = await db.insert(journalEntries).values({
      ...entryData,
      organizationId: orgId || entryData.organizationId,
      bookingNumber,
    }).returning();

    const lineValues = lines.map((l: any) => ({
      journalEntryId: entry.id,
      accountId: l.accountId,
      debit: String(l.debit || 0),
      credit: String(l.credit || 0),
      description: l.description || null,
    }));

    const insertedLines = await db.insert(journalEntryLines).values(lineValues).returning();

    res.json({ ...entry, lines: insertedLines });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/journal-entries/:id/storno", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const conditions: any[] = [eq(journalEntries.id, req.params.id)];
    if (orgId) conditions.push(eq(journalEntries.organizationId, orgId));

    const original = await db.select().from(journalEntries).where(and(...conditions));
    if (!original.length) return res.status(404).json({ error: "Buchung nicht gefunden" });

    const origEntry = original[0];
    const origLines = await db.select().from(journalEntryLines)
      .where(eq(journalEntryLines.journalEntryId, origEntry.id));

    const year = new Date().getFullYear();
    const entryOrgId = origEntry.organizationId;

    const [seq] = await db.select().from(bookingNumberSequences)
      .where(and(eq(bookingNumberSequences.organizationId, entryOrgId), eq(bookingNumberSequences.currentYear, year)));

    let bookingNumber: string;
    if (seq) {
      bookingNumber = getNextBookingNumber(year, seq.currentNumber);
      await db.update(bookingNumberSequences)
        .set({ currentNumber: seq.currentNumber + 1 })
        .where(eq(bookingNumberSequences.id, seq.id));
    } else {
      bookingNumber = getNextBookingNumber(year, 0);
      await db.insert(bookingNumberSequences).values({
        organizationId: entryOrgId,
        currentYear: year,
        currentNumber: 1,
      });
    }

    const [stornoEntry] = await db.insert(journalEntries).values({
      organizationId: entryOrgId,
      bookingNumber,
      entryDate: new Date().toISOString().split('T')[0],
      description: `STORNO: ${origEntry.description}`,
      isStorno: true,
      stornoOf: origEntry.id,
      sourceType: origEntry.sourceType,
      sourceId: origEntry.sourceId,
      propertyId: origEntry.propertyId,
      unitId: origEntry.unitId,
      tenantId: origEntry.tenantId,
    }).returning();

    const stornoLines = origLines.map(l => ({
      journalEntryId: stornoEntry.id,
      accountId: l.accountId,
      debit: l.credit,
      credit: l.debit,
      description: `STORNO: ${l.description || ''}`,
    }));

    await db.insert(journalEntryLines).values(stornoLines);

    res.json(stornoEntry);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== SALDENLISTE (Trial Balance) ======

router.get("/api/accounting/trial-balance", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { from, to, propertyId } = req.query;

    if (propertyId && orgId && !(await validatePropertyOwnership(propertyId as string, orgId))) {
      return res.status(403).json({ error: "Kein Zugriff auf diese Liegenschaft" });
    }

    let dateCondition = sql`1=1`;
    if (from && to) {
      dateCondition = sql`je.entry_date BETWEEN ${from} AND ${to}`;
    } else if (from) {
      dateCondition = sql`je.entry_date >= ${from}`;
    } else if (to) {
      dateCondition = sql`je.entry_date <= ${to}`;
    }

    const orgCondition = orgId
      ? sql`AND (je.organization_id = ${orgId} OR je.organization_id IS NULL)`
      : sql``;

    const propertyCondition = propertyId ? sql`AND je.property_id = ${propertyId}` : sql``;

    const result = await db.execute(sql`
      SELECT
        coa.id,
        coa.account_number,
        coa.name,
        coa.account_type,
        COALESCE(SUM(jel.debit), 0) as total_debit,
        COALESCE(SUM(jel.credit), 0) as total_credit,
        COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) as balance
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND ${dateCondition} ${orgCondition} ${propertyCondition}
      WHERE coa.is_active = true
      GROUP BY coa.id, coa.account_number, coa.name, coa.account_type
      HAVING COALESCE(SUM(jel.debit), 0) != 0 OR COALESCE(SUM(jel.credit), 0) != 0
      ORDER BY coa.account_number
    `);

    res.json(result.rows || result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== BILANZ (Balance Sheet) ======

router.get("/api/accounting/balance-sheet", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { date, propertyId } = req.query;

    if (propertyId && orgId && !(await validatePropertyOwnership(propertyId as string, orgId))) {
      return res.status(403).json({ error: "Kein Zugriff auf diese Liegenschaft" });
    }

    const endDate = date || new Date().toISOString().split('T')[0];

    const orgCondition = orgId
      ? sql`AND (je.organization_id = ${orgId} OR je.organization_id IS NULL)`
      : sql``;

    const propertyCondition = propertyId ? sql`AND je.property_id = ${propertyId}` : sql``;

    const result = await db.execute(sql`
      SELECT
        coa.account_type,
        coa.account_number,
        coa.name,
        COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) as balance
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.entry_date <= ${endDate} ${orgCondition} ${propertyCondition}
      WHERE coa.is_active = true
        AND coa.account_type IN ('asset', 'liability', 'equity')
      GROUP BY coa.account_type, coa.account_number, coa.name
      HAVING ABS(COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)) > 0.001
      ORDER BY coa.account_number
    `);

    const rows: any[] = result.rows || result;
    const assets = rows.filter((r: any) => r.account_type === 'asset');
    const liabilities = rows.filter((r: any) => r.account_type === 'liability');
    const equity = rows.filter((r: any) => r.account_type === 'equity');

    const totalAssets = assets.reduce((s: number, r: any) => s + Number(r.balance), 0);
    const totalLiabilities = liabilities.reduce((s: number, r: any) => s + Math.abs(Number(r.balance)), 0);
    const totalEquity = equity.reduce((s: number, r: any) => s + Math.abs(Number(r.balance)), 0);

    res.json({
      date: endDate,
      assets: { items: assets, total: totalAssets },
      liabilities: { items: liabilities, total: totalLiabilities },
      equity: { items: equity, total: totalEquity },
      balanceCheck: Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.01,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== GuV (Profit & Loss) ======

router.get("/api/accounting/profit-loss", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { from, to, propertyId } = req.query;

    if (propertyId && orgId && !(await validatePropertyOwnership(propertyId as string, orgId))) {
      return res.status(403).json({ error: "Kein Zugriff auf diese Liegenschaft" });
    }

    const year = new Date().getFullYear();
    const startDate = from || `${year}-01-01`;
    const endDate = to || `${year}-12-31`;

    const orgCondition = orgId
      ? sql`AND (je.organization_id = ${orgId} OR je.organization_id IS NULL)`
      : sql``;

    const propertyCondition = propertyId ? sql`AND je.property_id = ${propertyId}` : sql``;

    const result = await db.execute(sql`
      SELECT
        coa.account_type,
        coa.account_number,
        coa.name,
        COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0) as balance
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
        AND je.entry_date BETWEEN ${startDate} AND ${endDate} ${orgCondition} ${propertyCondition}
      WHERE coa.is_active = true
        AND coa.account_type IN ('revenue', 'expense')
      GROUP BY coa.account_type, coa.account_number, coa.name
      HAVING ABS(COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)) > 0.001
      ORDER BY coa.account_number
    `);

    const rows: any[] = result.rows || result;
    const revenue = rows.filter((r: any) => r.account_type === 'revenue');
    const expenses = rows.filter((r: any) => r.account_type === 'expense');

    const totalRevenue = revenue.reduce((s: number, r: any) => s + Number(r.balance), 0);
    const totalExpenses = expenses.reduce((s: number, r: any) => s + Math.abs(Number(r.balance)), 0);

    res.json({
      period: { from: startDate, to: endDate },
      revenue: { items: revenue, total: totalRevenue },
      expenses: { items: expenses, total: totalExpenses },
      netIncome: totalRevenue - totalExpenses,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== UVA (Umsatzsteuervoranmeldung) ======

router.get("/api/accounting/uva", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { month, year, propertyId } = req.query;

    if (propertyId && orgId && !(await validatePropertyOwnership(propertyId as string, orgId))) {
      return res.status(403).json({ error: "Kein Zugriff auf diese Liegenschaft" });
    }

    const y = Number(year) || new Date().getFullYear();
    const m = Number(month) || new Date().getMonth() + 1;
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = new Date(y, m, 0).toISOString().split('T')[0];

    const orgCondition = orgId
      ? sql`AND (je.organization_id = ${orgId} OR je.organization_id IS NULL)`
      : sql``;

    const propertyCondition = propertyId ? sql`AND je.property_id = ${propertyId}` : sql``;

    const result = await db.execute(sql`
      SELECT
        coa.account_number,
        coa.name,
        COALESCE(SUM(jel.debit), 0) as total_debit,
        COALESCE(SUM(jel.credit), 0) as total_credit
      FROM chart_of_accounts coa
      JOIN journal_entry_lines jel ON jel.account_id = coa.id
      JOIN journal_entries je ON je.id = jel.journal_entry_id
        AND je.entry_date BETWEEN ${startDate} AND ${endDate} ${orgCondition} ${propertyCondition}
      WHERE coa.account_number IN ('2500', '3400', '3410', '3420')
      GROUP BY coa.account_number, coa.name
      ORDER BY coa.account_number
    `);

    const rows: any[] = result.rows || result;
    const vorsteuer = rows.filter((r: any) => r.account_number === '2500')
      .reduce((s: number, r: any) => s + Number(r.total_debit) - Number(r.total_credit), 0);
    const ust = rows.filter((r: any) => r.account_number.startsWith('34'))
      .reduce((s: number, r: any) => s + Number(r.total_credit) - Number(r.total_debit), 0);

    res.json({
      period: { month: m, year: y },
      vorsteuer: Math.abs(vorsteuer),
      umsatzsteuer: Math.abs(ust),
      zahllast: ust - vorsteuer,
      details: rows,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== KONTOBLATT (Account Ledger) ======

router.get("/api/accounting/account-ledger/:accountId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { from, to, propertyId } = req.query;

    if (propertyId && orgId && !(await validatePropertyOwnership(propertyId as string, orgId))) {
      return res.status(403).json({ error: "Kein Zugriff auf diese Liegenschaft" });
    }

    let dateCondition = sql`1=1`;
    if (from && to) {
      dateCondition = sql`je.entry_date BETWEEN ${from} AND ${to}`;
    }

    const orgCondition = orgId
      ? sql`AND (je.organization_id = ${orgId} OR je.organization_id IS NULL)`
      : sql``;

    const propertyCondition = propertyId ? sql`AND je.property_id = ${propertyId}` : sql``;

    const result = await db.execute(sql`
      SELECT
        je.entry_date,
        je.booking_number,
        je.description as entry_description,
        jel.debit,
        jel.credit,
        jel.description as line_description,
        je.beleg_nummer,
        je.property_id
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel.journal_entry_id
      WHERE jel.account_id = ${req.params.accountId}
        AND ${dateCondition}
        ${orgCondition}
        ${propertyCondition}
      ORDER BY je.entry_date, je.created_at
    `);

    res.json(result.rows || result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== XLSX EXPORT ENDPOINTS ======

router.get("/api/accounting/export/saldenliste", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { from, to, propertyId } = req.query;
    const year = new Date().getFullYear();
    const startDate = (from as string) || `${year}-01-01`;
    const endDate = (to as string) || `${year}-12-31`;

    if (propertyId && orgId && !(await validatePropertyOwnership(propertyId as string, orgId))) {
      return res.status(403).json({ error: "Kein Zugriff auf diese Liegenschaft" });
    }

    const dateCondition = sql`je.entry_date BETWEEN ${startDate} AND ${endDate}`;
    const orgCondition = orgId
      ? sql`AND (je.organization_id = ${orgId} OR je.organization_id IS NULL)`
      : sql``;
    const propertyCondition = propertyId ? sql`AND je.property_id = ${propertyId}` : sql``;

    const result = await db.execute(sql`
      SELECT
        coa.id, coa.account_number, coa.name, coa.account_type,
        COALESCE(SUM(jel.debit), 0) as total_debit,
        COALESCE(SUM(jel.credit), 0) as total_credit,
        COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) as balance
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND ${dateCondition} ${orgCondition} ${propertyCondition}
      WHERE coa.is_active = true
      GROUP BY coa.id, coa.account_number, coa.name, coa.account_type
      HAVING COALESCE(SUM(jel.debit), 0) != 0 OR COALESCE(SUM(jel.credit), 0) != 0
      ORDER BY coa.account_number
    `);

    const rows = result.rows || result;
    const orgName = (req as any).session?.organizationName || "Organisation";
    const buffer = exportSaldenliste(rows as any[], orgName);

    const fileYear = startDate.substring(0, 4);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="Saldenliste_${fileYear}.xlsx"`);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/accounting/export/bilanz", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { date, propertyId } = req.query;

    if (propertyId && orgId && !(await validatePropertyOwnership(propertyId as string, orgId))) {
      return res.status(403).json({ error: "Kein Zugriff auf diese Liegenschaft" });
    }

    const endDate = (date as string) || new Date().toISOString().split("T")[0];
    const orgCondition = orgId
      ? sql`AND (je.organization_id = ${orgId} OR je.organization_id IS NULL)`
      : sql``;
    const propertyCondition = propertyId ? sql`AND je.property_id = ${propertyId}` : sql``;

    const result = await db.execute(sql`
      SELECT
        coa.account_type, coa.account_number, coa.name,
        COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) as balance
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.entry_date <= ${endDate} ${orgCondition} ${propertyCondition}
      WHERE coa.is_active = true AND coa.account_type IN ('asset', 'liability', 'equity')
      GROUP BY coa.account_type, coa.account_number, coa.name
      HAVING ABS(COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)) > 0.001
      ORDER BY coa.account_number
    `);

    const rows: any[] = result.rows || result;
    const assets = rows.filter((r: any) => r.account_type === "asset");
    const liabilities = rows.filter((r: any) => r.account_type === "liability");
    const equity = rows.filter((r: any) => r.account_type === "equity");

    const bilanzData = {
      assets: { items: assets },
      liabilities: { items: liabilities },
      equity: { items: equity },
    };

    const orgName = (req as any).session?.organizationName || "Organisation";
    const buffer = exportBilanz(bilanzData as any, orgName);

    const fileYear = endDate.substring(0, 4);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="Bilanz_${fileYear}.xlsx"`);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/accounting/export/guv", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { from, to, propertyId } = req.query;

    if (propertyId && orgId && !(await validatePropertyOwnership(propertyId as string, orgId))) {
      return res.status(403).json({ error: "Kein Zugriff auf diese Liegenschaft" });
    }

    const year = new Date().getFullYear();
    const startDate = (from as string) || `${year}-01-01`;
    const endDate = (to as string) || `${year}-12-31`;

    const orgCondition = orgId
      ? sql`AND (je.organization_id = ${orgId} OR je.organization_id IS NULL)`
      : sql``;
    const propertyCondition = propertyId ? sql`AND je.property_id = ${propertyId}` : sql``;

    const result = await db.execute(sql`
      SELECT
        coa.account_type, coa.account_number, coa.name,
        COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0) as balance
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
        AND je.entry_date BETWEEN ${startDate} AND ${endDate} ${orgCondition} ${propertyCondition}
      WHERE coa.is_active = true AND coa.account_type IN ('revenue', 'expense')
      GROUP BY coa.account_type, coa.account_number, coa.name
      HAVING ABS(COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)) > 0.001
      ORDER BY coa.account_number
    `);

    const rows: any[] = result.rows || result;
    const revenue = rows.filter((r: any) => r.account_type === "revenue");
    const expenses = rows.filter((r: any) => r.account_type === "expense");
    const totalRevenue = revenue.reduce((s: number, r: any) => s + Number(r.balance), 0);
    const totalExpenses = expenses.reduce((s: number, r: any) => s + Math.abs(Number(r.balance)), 0);

    const guvData = {
      revenue: { items: revenue },
      expenses: { items: expenses },
      netIncome: totalRevenue - totalExpenses,
    };

    const orgName = (req as any).session?.organizationName || "Organisation";
    const buffer = exportGuV(guvData as any, orgName);

    const fileYear = startDate.substring(0, 4);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="GuV_${fileYear}.xlsx"`);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== TRIAL BALANCE VALIDATION SERVICE ROUTES ======

router.get("/api/accounting/account-balances", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht authentifiziert" });
    const { propertyId, from, to } = req.query;

    if (propertyId && !(await validatePropertyOwnership(propertyId as string, orgId))) {
      return res.status(403).json({ error: "Kein Zugriff auf diese Liegenschaft" });
    }

    const balances = await getAccountBalances(
      orgId,
      propertyId as string | undefined,
      from as string | undefined,
      to as string | undefined
    );
    res.json(balances);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/accounting/reconciliation-rate", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht authentifiziert" });
    const { propertyId, year } = req.query;

    if (propertyId && !(await validatePropertyOwnership(propertyId as string, orgId))) {
      return res.status(403).json({ error: "Kein Zugriff auf diese Liegenschaft" });
    }

    const rate = await getReconciliationRate(
      orgId,
      propertyId as string | undefined,
      year ? Number(year) : undefined
    );
    res.json(rate);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/accounting/validate-settlement", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht authentifiziert" });
    const { settlementId } = req.body;

    if (!settlementId) {
      return res.status(400).json({ error: "settlementId ist erforderlich" });
    }

    const result = await validateSettlementTotals(settlementId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/accounting/daily-checks", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht authentifiziert" });

    const warnings = await runDailyChecks(orgId);
    res.json({ warnings, checkedAt: new Date() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== PAYMENT SPLITTING SERVICE ROUTES ======

router.post("/api/payments/split", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht authentifiziert" });
    const { paymentAmount, tenantId } = req.body;

    if (!paymentAmount || !tenantId) {
      return res.status(400).json({ error: "paymentAmount und tenantId sind erforderlich" });
    }

    const result = await splitPaymentByPriority(Number(paymentAmount), tenantId, orgId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/payments/allocate", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht authentifiziert" });
    const { paymentId, invoiceId, amount } = req.body;

    if (!paymentId || !invoiceId || !amount) {
      return res.status(400).json({ error: "paymentId, invoiceId und amount sind erforderlich" });
    }

    const allocation = await allocatePaymentToInvoice(paymentId, invoiceId, Number(amount), orgId);
    res.json(allocation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/payments/unallocated", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht authentifiziert" });
    const { tenantId } = req.query;

    const payments = await getUnallocatedPayments(orgId, tenantId as string | undefined);
    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/payments/auto-match", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht authentifiziert" });

    const result = await autoMatchPayments(orgId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
