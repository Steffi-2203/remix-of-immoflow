import { db } from "../db";
import { 
  payments, 
  monthlyInvoices, 
  tenants,
  units,
  properties,
  messages 
} from "@shared/schema";
import { eq, and, gte, lte, desc, or, inArray, sql } from "drizzle-orm";
import { roundMoney } from "@shared/utils";
import { writeAudit } from "../lib/auditLog";

interface PaymentAllocation {
  invoiceId: string;
  allocatedAmount: number;
}

interface DunningLevel {
  level: 1 | 2 | 3;
  name: string;
  daysOverdue: number;
  fee: number;
}

interface DunningResult {
  tenantId: string;
  tenantName: string;
  email: string | null;
  outstandingAmount: number;
  dunningLevel: DunningLevel;
  overdueInvoices: Array<{
    id: string;
    month: number;
    year: number;
    amount: number;
    dueDate: string;
  }>;
}

const DUNNING_LEVELS: DunningLevel[] = [
  { level: 1, name: "Zahlungserinnerung", daysOverdue: 14, fee: 0 },
  { level: 2, name: "1. Mahnung", daysOverdue: 30, fee: 5 },
  { level: 3, name: "2. Mahnung", daysOverdue: 45, fee: 10 },
];

export class PaymentService {
  async allocatePayment(
    paymentId: string,
    amount: number,
    tenantId: string,
    userId?: string
  ): Promise<PaymentAllocation[]> {
    return db.transaction(async (tx) => {
      const openInvoices = await tx.select()
        .from(monthlyInvoices)
        .where(and(
          eq(monthlyInvoices.tenantId, tenantId),
          or(
            eq(monthlyInvoices.status, 'offen'),
            eq(monthlyInvoices.status, 'teilbezahlt'),
            eq(monthlyInvoices.status, 'ueberfaellig')
          )
        ))
        .orderBy(monthlyInvoices.year, monthlyInvoices.month)
        .for('update');

      const tenantPayments = await tx.select()
        .from(payments)
        .where(eq(payments.tenantId, tenantId));
      
      const paidByInvoice = new Map<string, number>();
      for (const payment of tenantPayments) {
        if (payment.invoiceId) {
          const current = paidByInvoice.get(payment.invoiceId) || 0;
          paidByInvoice.set(payment.invoiceId, current + Number(payment.betrag || 0));
        }
      }

      const allocations: PaymentAllocation[] = [];
      let remainingAmount = amount;
      let firstInvoiceId: string | null = null;

      for (const invoice of openInvoices) {
        if (remainingAmount <= 0) break;

        const invoiceTotal = Number(invoice.gesamtbetrag) || 0;
        const alreadyPaid = paidByInvoice.get(invoice.id) || 0;
        const stillOwed = roundMoney(invoiceTotal - alreadyPaid);
        
        if (stillOwed <= 0) continue;

        const bk = Number(invoice.betriebskosten) || 0;
        const wasser = Number(invoice.wasserkosten) || 0;
        const hk = Number(invoice.heizungskosten) || 0;
        const miete = Number(invoice.grundmiete) || 0;

        let toAllocate = Math.min(remainingAmount, stillOwed);
        let allocatedBk = 0, allocatedWasser = 0, allocatedHk = 0, allocatedMiete = 0;

        const allocBk = Math.min(toAllocate, bk);
        allocatedBk = roundMoney(allocBk);
        toAllocate -= allocBk;

        const allocWasser = Math.min(toAllocate, wasser);
        allocatedWasser = roundMoney(allocWasser);
        toAllocate -= allocWasser;

        const allocHk = Math.min(toAllocate, hk);
        allocatedHk = roundMoney(allocHk);
        toAllocate -= allocHk;

        const allocMiete = Math.min(toAllocate, miete);
        allocatedMiete = roundMoney(allocMiete);

        const allocated = roundMoney(allocatedBk + allocatedWasser + allocatedHk + allocatedMiete);
        
        if (!firstInvoiceId) {
          firstInvoiceId = invoice.id;
        }
        
        allocations.push({
          invoiceId: invoice.id,
          allocatedAmount: allocated
        });

        remainingAmount = roundMoney(remainingAmount - allocated);

        const totalPaidAfter = roundMoney(alreadyPaid + allocated);
        const newStatus = totalPaidAfter >= invoiceTotal ? 'bezahlt' : 'teilbezahlt';
        await tx.update(monthlyInvoices)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(monthlyInvoices.id, invoice.id));
      }

      if (firstInvoiceId && paymentId) {
        await tx.update(payments)
          .set({ invoiceId: firstInvoiceId })
          .where(eq(payments.id, paymentId));
      }

      if (userId && allocations.length > 0) {
        await writeAudit(tx, userId, 'payments', paymentId, 'update', null, {
          paymentId,
          tenantId,
          amount,
          allocatedTo: allocations.map(a => a.invoiceId),
          totalAllocated: allocations.reduce((sum, a) => sum + a.allocatedAmount, 0),
        });
      }

      return allocations;
    });
  }

  async getTenantBalance(tenantId: string, year?: number): Promise<{
    sollGesamt: number;
    istGesamt: number;
    saldo: number;
    openInvoices: number;
  }> {
    let invoiceQuery = db.select().from(monthlyInvoices)
      .where(eq(monthlyInvoices.tenantId, tenantId));
    
    if (year) {
      invoiceQuery = db.select().from(monthlyInvoices)
        .where(and(
          eq(monthlyInvoices.tenantId, tenantId),
          eq(monthlyInvoices.year, year)
        ));
    }

    const invoices = await invoiceQuery;
    
    let paymentQuery;
    if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      paymentQuery = db.select().from(payments)
        .where(and(
          eq(payments.tenantId, tenantId),
          gte(payments.buchungsDatum, startDate),
          lte(payments.buchungsDatum, endDate)
        ));
    } else {
      paymentQuery = db.select().from(payments)
        .where(eq(payments.tenantId, tenantId));
    }

    const tenantPayments = await paymentQuery;

    const sollGesamt = invoices.reduce((sum, inv) => sum + Number(inv.gesamtbetrag || 0), 0);
    const istGesamt = tenantPayments.reduce((sum, p) => sum + Number(p.betrag || 0), 0);
    const openInvoices = invoices.filter(inv => inv.status === 'offen' || inv.status === 'teilbezahlt').length;

    return {
      sollGesamt: roundMoney(sollGesamt),
      istGesamt: roundMoney(istGesamt),
      saldo: roundMoney(sollGesamt - istGesamt),
      openInvoices
    };
  }

  getDunningLevel(daysOverdue: number): DunningLevel | null {
    for (let i = DUNNING_LEVELS.length - 1; i >= 0; i--) {
      if (daysOverdue >= DUNNING_LEVELS[i].daysOverdue) {
        return DUNNING_LEVELS[i];
      }
    }
    return null;
  }

  async getTenantsForDunning(organizationId: string): Promise<DunningResult[]> {
    const today = new Date();
    const results: DunningResult[] = [];

    const orgProperties = await db.select({ id: properties.id })
      .from(properties)
      .where(eq(properties.organizationId, organizationId));
    
    if (!orgProperties.length) return [];
    
    const propertyIds = orgProperties.map(p => p.id);
    
    const orgUnits = await db.select({ id: units.id })
      .from(units)
      .where(inArray(units.propertyId, propertyIds));
    
    if (!orgUnits.length) return [];
    
    const unitIds = orgUnits.map(u => u.id);
    
    const orgTenants = await db.select()
      .from(tenants)
      .where(inArray(tenants.unitId, unitIds));
    
    if (!orgTenants.length) return [];
    
    const orgTenantIds = orgTenants.map(t => t.id);
    const tenantMap = new Map(orgTenants.map(t => [t.id, t]));

    const overdueInvoices = await db.select()
      .from(monthlyInvoices)
      .where(and(
        inArray(monthlyInvoices.tenantId, orgTenantIds),
        or(
          eq(monthlyInvoices.status, 'offen'),
          eq(monthlyInvoices.status, 'teilbezahlt'),
          eq(monthlyInvoices.status, 'ueberfaellig')
        ),
        lte(monthlyInvoices.faelligAm, today.toISOString().split('T')[0])
      ));

    const tenantIds = [...new Set(overdueInvoices.map(inv => inv.tenantId))];
    
    for (const tenantId of tenantIds) {
      const tenant = tenantMap.get(tenantId);
      if (!tenant) continue;

      const tenantInvoices = overdueInvoices.filter(inv => inv.tenantId === tenantId);
      
      const oldestInvoice = tenantInvoices.reduce((oldest, inv) => {
        const invDate = new Date(inv.faelligAm!);
        const oldestDate = new Date(oldest.faelligAm!);
        return invDate < oldestDate ? inv : oldest;
      }, tenantInvoices[0]);

      const daysOverdue = Math.floor(
        (today.getTime() - new Date(oldestInvoice.faelligAm!).getTime()) / (1000 * 60 * 60 * 24)
      );

      const dunningLevel = this.getDunningLevel(daysOverdue);
      if (!dunningLevel) continue;

      const outstandingAmount = tenantInvoices.reduce(
        (sum, inv) => sum + Number(inv.gesamtbetrag || 0), 0
      );

      results.push({
        tenantId,
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        email: tenant.email,
        outstandingAmount: roundMoney(outstandingAmount),
        dunningLevel,
        overdueInvoices: tenantInvoices.map(inv => ({
          id: inv.id,
          month: inv.month,
          year: inv.year,
          amount: Number(inv.gesamtbetrag || 0),
          dueDate: inv.faelligAm!
        }))
      });
    }

    return results.sort((a, b) => b.dunningLevel.level - a.dunningLevel.level);
  }

  async recordDunningAction(
    tenantId: string,
    dunningLevel: number,
    organizationId: string
  ): Promise<void> {
    await db.insert(messages).values({
      organizationId,
      messageType: 'dunning',
      recipientType: 'tenant',
      subject: `Mahnstufe ${dunningLevel} gesendet`,
      messageBody: `Automatische Mahnung (Stufe ${dunningLevel}) wurde an den Mieter gesendet. Mieter-ID: ${tenantId}`,
      status: 'sent',
      sentAt: new Date(),
    });
  }

  async getPaymentHistory(
    tenantId: string,
    limit: number = 12
  ): Promise<Array<typeof payments.$inferSelect>> {
    return db.select()
      .from(payments)
      .where(eq(payments.tenantId, tenantId))
      .orderBy(desc(payments.buchungsDatum))
      .limit(limit);
  }
}

export const paymentService = new PaymentService();
