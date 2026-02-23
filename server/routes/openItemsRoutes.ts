import { Router, Request, Response } from "express";
import { isAuthenticated , type AuthenticatedRequest } from "./helpers";
import { db } from "../db";
import { monthlyInvoices, units, tenants, properties, payments, paymentAllocations } from "@shared/schema";
import { eq, ne, and, sql, gte, lte, desc, sum, isNull } from "drizzle-orm";
import { exportOPListe } from "../services/xlsxExportService";

const router = Router();

function getOrgId(req: AuthenticatedRequest): string | null {
  return req.user?.organizationId || req.session?.organizationId || null;
}

router.get("/api/open-items", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Keine Organisation zugeordnet" });
    const { propertyId, tenantId, from, to } = req.query;

    const conditions: any[] = [ne(monthlyInvoices.status, 'bezahlt'), eq(properties.organizationId, orgId)];

    if (propertyId) {
      conditions.push(eq(units.propertyId, propertyId as string));
    }

    if (tenantId) {
      conditions.push(eq(monthlyInvoices.tenantId, tenantId as string));
    }

    if (from) {
      conditions.push(gte(monthlyInvoices.faelligAm, from as string));
    }

    if (to) {
      conditions.push(lte(monthlyInvoices.faelligAm, to as string));
    }

    const results = await db
      .select({
        invoice: monthlyInvoices,
        unitTopNummer: units.topNummer,
        propertyId: properties.id,
        propertyName: properties.name,
        propertyAddress: properties.address,
        tenantFirstName: tenants.firstName,
        tenantLastName: tenants.lastName,
        tenantEmail: tenants.email,
      })
      .from(monthlyInvoices)
      .innerJoin(units, eq(monthlyInvoices.unitId, units.id))
      .innerJoin(properties, eq(units.propertyId, properties.id))
      .leftJoin(tenants, eq(monthlyInvoices.tenantId, tenants.id))
      .where(and(...conditions))
      .orderBy(desc(monthlyInvoices.faelligAm));

    const items = results.map((r) => ({
      ...r.invoice,
      unitTopNummer: r.unitTopNummer,
      propertyId: r.propertyId,
      propertyName: r.propertyName,
      propertyAddress: r.propertyAddress,
      tenantName: r.tenantFirstName && r.tenantLastName
        ? `${r.tenantFirstName} ${r.tenantLastName}`
        : null,
      tenantEmail: r.tenantEmail,
    }));

    res.json(items);
  } catch (error: any) {
    console.error("Error fetching open items:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/open-items/kpis", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Keine Organisation zugeordnet" });
    const today = new Date().toISOString().split("T")[0];

    const { propertyId } = req.query;
    const orgFilter = sql`AND p.organization_id = ${orgId}`;
    const propertyFilter = propertyId ? sql`AND p.id = ${propertyId}` : sql``;

    const openResult = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total_open,
        COALESCE(SUM(mi.gesamtbetrag::numeric), 0) AS total_open_amount
      FROM monthly_invoices mi
      INNER JOIN units u ON u.id = mi.unit_id
      INNER JOIN properties p ON p.id = u.property_id
      WHERE mi.status != 'bezahlt'
      ${orgFilter}
      ${propertyFilter}
    `);

    const overdueResult = await db.execute(sql`
      SELECT
        COUNT(*)::int AS overdue_count,
        COALESCE(SUM(mi.gesamtbetrag::numeric), 0) AS overdue_amount
      FROM monthly_invoices mi
      INNER JOIN units u ON u.id = mi.unit_id
      INNER JOIN properties p ON p.id = u.property_id
      WHERE mi.status != 'bezahlt'
        AND mi.faellig_am < ${today}
      ${orgFilter}
      ${propertyFilter}
    `);

    const paymentsResult = await db.execute(sql`
      SELECT
        COALESCE(SUM(pay.betrag::numeric), 0) AS payments_last_7_days,
        COUNT(*)::int AS payments_last_7_days_count
      FROM payments pay
      INNER JOIN tenants t ON t.id = pay.tenant_id
      INNER JOIN units u ON u.id = t.unit_id
      INNER JOIN properties p ON p.id = u.property_id
      WHERE pay.buchungs_datum >= (CURRENT_DATE - INTERVAL '7 days')::date
      ${orgFilter}
      ${propertyFilter}
    `);

    const agingResult = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE mi.faellig_am >= (CURRENT_DATE - INTERVAL '30 days')::date AND mi.faellig_am < ${today})::int AS days30_count,
        COALESCE(SUM(mi.gesamtbetrag::numeric) FILTER (WHERE mi.faellig_am >= (CURRENT_DATE - INTERVAL '30 days')::date AND mi.faellig_am < ${today}), 0) AS days30_amount,
        COUNT(*) FILTER (WHERE mi.faellig_am >= (CURRENT_DATE - INTERVAL '60 days')::date AND mi.faellig_am < (CURRENT_DATE - INTERVAL '30 days')::date)::int AS days60_count,
        COALESCE(SUM(mi.gesamtbetrag::numeric) FILTER (WHERE mi.faellig_am >= (CURRENT_DATE - INTERVAL '60 days')::date AND mi.faellig_am < (CURRENT_DATE - INTERVAL '30 days')::date), 0) AS days60_amount,
        COUNT(*) FILTER (WHERE mi.faellig_am >= (CURRENT_DATE - INTERVAL '90 days')::date AND mi.faellig_am < (CURRENT_DATE - INTERVAL '60 days')::date)::int AS days90_count,
        COALESCE(SUM(mi.gesamtbetrag::numeric) FILTER (WHERE mi.faellig_am >= (CURRENT_DATE - INTERVAL '90 days')::date AND mi.faellig_am < (CURRENT_DATE - INTERVAL '60 days')::date), 0) AS days90_amount,
        COUNT(*) FILTER (WHERE mi.faellig_am < (CURRENT_DATE - INTERVAL '90 days')::date)::int AS days90plus_count,
        COALESCE(SUM(mi.gesamtbetrag::numeric) FILTER (WHERE mi.faellig_am < (CURRENT_DATE - INTERVAL '90 days')::date), 0) AS days90plus_amount
      FROM monthly_invoices mi
      INNER JOIN units u ON u.id = mi.unit_id
      INNER JOIN properties p ON p.id = u.property_id
      WHERE mi.status != 'bezahlt'
        AND mi.faellig_am < ${today}
      ${orgFilter}
      ${propertyFilter}
    `);

    const open = (openResult.rows || openResult)[0] as any;
    const overdue = (overdueResult.rows || overdueResult)[0] as any;
    const pay = (paymentsResult.rows || paymentsResult)[0] as any;
    const aging = (agingResult.rows || agingResult)[0] as any;

    res.json({
      totalOpen: Number(open.total_open || 0),
      totalOpenAmount: Number(open.total_open_amount || 0),
      overdueCount: Number(overdue.overdue_count || 0),
      overdueAmount: Number(overdue.overdue_amount || 0),
      paymentsLast7Days: Number(pay.payments_last_7_days || 0),
      paymentsLast7DaysCount: Number(pay.payments_last_7_days_count || 0),
      aging: {
        days30: {
          count: Number(aging.days30_count || 0),
          amount: Number(aging.days30_amount || 0),
        },
        days60: {
          count: Number(aging.days60_count || 0),
          amount: Number(aging.days60_amount || 0),
        },
        days90: {
          count: Number(aging.days90_count || 0),
          amount: Number(aging.days90_amount || 0),
        },
        days90plus: {
          count: Number(aging.days90plus_count || 0),
          amount: Number(aging.days90plus_amount || 0),
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching open items KPIs:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/bank-matching/suggestions", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Keine Organisation zugeordnet" });

    const orgFilter = sql`AND p.organization_id = ${orgId}`;

    const unmatchedPayments = await db
      .select()
      .from(payments)
      .where(isNull(payments.invoiceId));

    const openInvoices = await db.execute(sql`
      SELECT mi.*, t.first_name, t.last_name, t.id AS tid
      FROM monthly_invoices mi
      INNER JOIN units u ON u.id = mi.unit_id
      INNER JOIN properties p ON p.id = u.property_id
      LEFT JOIN tenants t ON t.id = mi.tenant_id
      WHERE mi.status != 'bezahlt'
      ${orgFilter}
    `);

    const invoiceRows: any[] = openInvoices.rows || openInvoices;

    const suggestions = unmatchedPayments.map((payment) => {
      const paymentAmount = Number(payment.betrag);
      const suggestedInvoices = invoiceRows.filter((inv: any) => {
        const invoiceAmount = Number(inv.gesamtbetrag);
        const amountMatch = Math.abs(paymentAmount - invoiceAmount) <= 0.01;
        const tenantMatch = payment.tenantId && inv.tenant_id === payment.tenantId;
        return amountMatch || tenantMatch;
      });

      return {
        payment,
        suggestedInvoices,
      };
    });

    res.json(suggestions);
  } catch (error: any) {
    console.error("Error fetching bank matching suggestions:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/bank-matching/confirm", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Keine Organisation zugeordnet" });
    const { paymentId, invoiceId } = req.body;

    if (!paymentId || !invoiceId) {
      return res.status(400).json({ error: "paymentId und invoiceId sind erforderlich" });
    }

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId));

    if (!payment) {
      return res.status(404).json({ error: "Zahlung nicht gefunden" });
    }

    const [invoice] = await db
      .select()
      .from(monthlyInvoices)
      .where(eq(monthlyInvoices.id, invoiceId));

    if (!invoice) {
      return res.status(404).json({ error: "Rechnung nicht gefunden" });
    }

    await db
      .update(payments)
      .set({ invoiceId })
      .where(eq(payments.id, paymentId));

    await db.insert(paymentAllocations).values({
      paymentId,
      invoiceId,
      appliedAmount: payment.betrag,
      allocationType: "miete",
    });

    const allocationResult = await db.execute(sql`
      SELECT COALESCE(SUM(applied_amount::numeric), 0) AS total_allocated
      FROM payment_allocations
      WHERE invoice_id = ${invoiceId}
    `);

    const totalAllocated = Number(
      ((allocationResult.rows || allocationResult)[0] as any).total_allocated || 0
    );
    const invoiceTotal = Number(invoice.gesamtbetrag || 0);

    if (totalAllocated >= invoiceTotal) {
      await db
        .update(monthlyInvoices)
        .set({ status: "bezahlt" })
        .where(eq(monthlyInvoices.id, invoiceId));
    } else if (totalAllocated > 0) {
      await db
        .update(monthlyInvoices)
        .set({ status: "teilbezahlt" })
        .where(eq(monthlyInvoices.id, invoiceId));
    }

    res.json({ success: true, message: "Zahlung erfolgreich zugeordnet" });
  } catch (error: any) {
    console.error("Error confirming bank matching:", error);
    res.status(500).json({ error: error.message });
  }
});

// ====== XLSX EXPORT ======

router.get("/api/accounting/export/op-liste", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Keine Organisation zugeordnet" });
    const { propertyId } = req.query;

    const conditions: any[] = [ne(monthlyInvoices.status, 'bezahlt'), eq(properties.organizationId, orgId)];

    if (propertyId) {
      conditions.push(eq(units.propertyId, propertyId as string));
    }

    const results = await db
      .select({
        invoice: monthlyInvoices,
        unitTopNummer: units.topNummer,
        propertyId: properties.id,
        propertyName: properties.name,
        tenantFirstName: tenants.firstName,
        tenantLastName: tenants.lastName,
      })
      .from(monthlyInvoices)
      .innerJoin(units, eq(monthlyInvoices.unitId, units.id))
      .innerJoin(properties, eq(units.propertyId, properties.id))
      .leftJoin(tenants, eq(monthlyInvoices.tenantId, tenants.id))
      .where(and(...conditions))
      .orderBy(desc(monthlyInvoices.faelligAm));

    const items = results.map((r) => ({
      ...r.invoice,
      unitTopNummer: r.unitTopNummer,
      propertyName: r.propertyName,
      tenantName: r.tenantFirstName && r.tenantLastName
        ? `${r.tenantFirstName} ${r.tenantLastName}`
        : null,
    }));

    const orgName = (req as any).session?.organizationName || "Organisation";
    const buffer = exportOPListe(items, orgName);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="OP-Liste_${new Date().getFullYear()}.xlsx"`);
    res.send(buffer);
  } catch (error: any) {
    console.error("Error exporting OP-Liste:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
