/**
 * Tax Reporting Service — E1a Beilage
 *
 * Aggregates rental income, operating costs, maintenance expenses,
 * depreciation (AfA), and administration costs per owner per property
 * to produce Austrian E1a tax form data (Einkünfte aus V+V).
 */

import { db } from "../db";
import {
  properties,
  monthlyInvoices,
  expenses,
  tenants,
  units,
  taxReports,
} from "@shared/schema";
import type { E1aKennzahlen } from "@shared/schema/taxReporting";
import { eq, and, gte, lte, inArray } from "drizzle-orm";

// ── Interfaces ───────────────────────────────────────────────────────────

interface PropertyE1aData {
  propertyId: string;
  propertyName: string;
  ownershipShare: number;
  kennzahlen: E1aKennzahlen;
}

interface OwnerE1aReport {
  ownerId: string;
  ownerName: string;
  taxYear: number;
  properties: PropertyE1aData[];
  totals: E1aKennzahlen;
}

// ── Service ──────────────────────────────────────────────────────────────

class TaxReportingService {
  /**
   * Calculate E1a data for a specific property owner across all their properties.
   */
  async calculateE1a(
    organizationId: string,
    ownerId: string,
    taxYear: number
  ): Promise<OwnerE1aReport> {
    const startDate = new Date(taxYear, 0, 1);
    const endDate = new Date(taxYear, 11, 31);

    // Get owner + their properties with shares
    const ownerProps = await db.execute<{
      id: string;
      name: string;
      property_id: string;
      ownership_share: string;
      property_name: string;
    }>(
      `SELECT po.id, po.name, po.property_id, po.ownership_share,
              p.name as property_name
       FROM property_owners po
       JOIN properties p ON p.id = po.property_id
       WHERE po.id = $1
         AND p.organization_id = $2`,
      [ownerId, organizationId]
    );

    const rows = (ownerProps as any).rows ?? ownerProps;
    if (!rows || rows.length === 0) {
      return {
        ownerId,
        ownerName: "Unbekannt",
        taxYear,
        properties: [],
        totals: this.emptyKennzahlen(),
      };
    }

    const ownerName = rows[0].name;
    const propertyResults: PropertyE1aData[] = [];

    for (const row of rows) {
      const share = Number(row.ownership_share) / 100;
      const kz = await this.calculatePropertyKennzahlen(
        row.property_id,
        startDate,
        endDate,
        share
      );
      propertyResults.push({
        propertyId: row.property_id,
        propertyName: row.property_name,
        ownershipShare: Number(row.ownership_share),
        kennzahlen: kz,
      });
    }

    const totals = this.sumKennzahlen(propertyResults.map((p) => p.kennzahlen));

    return { ownerId, ownerName, taxYear, properties: propertyResults, totals };
  }

  /**
   * Calculate E1a Kennzahlen for a single property, scaled by ownership share.
   */
  private async calculatePropertyKennzahlen(
    propertyId: string,
    startDate: Date,
    endDate: Date,
    share: number
  ): Promise<E1aKennzahlen> {
    // ── Income from invoices ──────────────────────────────────────────
    const propUnits = await db
      .select({ id: units.id })
      .from(units)
      .where(eq(units.propertyId, propertyId));
    const unitIds = propUnits.map((u) => u.id);

    let mieteinnahmen = 0;
    let bkEinnahmen = 0;

    if (unitIds.length > 0) {
      const propTenants = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(inArray(tenants.unitId, unitIds));
      const tenantIds = propTenants.map((t) => t.id);

      if (tenantIds.length > 0) {
        const invoices = await db
          .select()
          .from(monthlyInvoices)
          .where(
            and(
              inArray(monthlyInvoices.tenantId, tenantIds),
              gte(monthlyInvoices.createdAt, startDate),
              lte(monthlyInvoices.createdAt, endDate)
            )
          );

        for (const inv of invoices) {
          mieteinnahmen += Number(inv.grundmiete) || 0;
          bkEinnahmen +=
            (Number(inv.betriebskosten) || 0) +
            (Number(inv.heizungskosten) || 0);
        }
      }
    }

    // ── Expenses ──────────────────────────────────────────────────────
    const expData = await db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.propertyId, propertyId),
          gte(expenses.datum, startDate.toISOString()),
          lte(expenses.datum, endDate.toISOString())
        )
      );

    let instandhaltung = 0;
    let verwaltung = 0;

    for (const exp of expData) {
      const betrag = Number(exp.betrag) || 0;
      const cat = exp.category as string;
      if (
        cat === "instandhaltung" ||
        cat === "reparatur" ||
        cat === "sanierung"
      ) {
        instandhaltung += betrag;
      } else if (cat === "verwaltung" || cat === "hausverwaltung") {
        verwaltung += betrag;
      }
    }

    // ── AfA (1.5% of building value p.a.) ─────────────────────────────
    const [prop] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId));

    const gebaeudewert = Number((prop as any)?.anschaffungskosten) || 0;
    const afa = gebaeudewert * 0.015;

    // Apply ownership share
    const kz370 = Math.round(mieteinnahmen * share * 100) / 100;
    const kz371 = Math.round(bkEinnahmen * share * 100) / 100;
    const kz380 = Math.round(instandhaltung * share * 100) / 100;
    const kz381 = Math.round(afa * share * 100) / 100;
    const kz382 = 0; // Zinsen — not tracked yet
    const kz383 = Math.round(verwaltung * share * 100) / 100;
    const kz390 = Math.round((kz370 + kz371 - kz380 - kz381 - kz382 - kz383) * 100) / 100;

    return { kz370, kz371, kz380, kz381, kz382, kz383, kz390 };
  }

  // ── XML Generation (FinanzOnline E1a) ──────────────────────────────────

  generateE1aXml(report: OwnerE1aReport): string {
    const t = report.totals;
    return `<?xml version="1.0" encoding="UTF-8"?>
<Steuererklaerung xmlns="http://www.bmf.gv.at/elda">
  <Formular>E1a</Formular>
  <Steuerjahr>${report.taxYear}</Steuerjahr>
  <Steuerpflichtiger>${this.escapeXml(report.ownerName)}</Steuerpflichtiger>
  <EinkuenfteVermietung>
    <KZ370>${t.kz370.toFixed(2)}</KZ370>
    <KZ371>${t.kz371.toFixed(2)}</KZ371>
    <KZ380>${t.kz380.toFixed(2)}</KZ380>
    <KZ381>${t.kz381.toFixed(2)}</KZ381>
    <KZ382>${t.kz382.toFixed(2)}</KZ382>
    <KZ383>${t.kz383.toFixed(2)}</KZ383>
    <KZ390>${t.kz390.toFixed(2)}</KZ390>
  </EinkuenfteVermietung>
  <Liegenschaften>
${report.properties
  .map(
    (p) => `    <Liegenschaft>
      <Name>${this.escapeXml(p.propertyName)}</Name>
      <Anteil>${p.ownershipShare}%</Anteil>
      <KZ370>${p.kennzahlen.kz370.toFixed(2)}</KZ370>
      <KZ371>${p.kennzahlen.kz371.toFixed(2)}</KZ371>
      <KZ380>${p.kennzahlen.kz380.toFixed(2)}</KZ380>
      <KZ381>${p.kennzahlen.kz381.toFixed(2)}</KZ381>
      <KZ390>${p.kennzahlen.kz390.toFixed(2)}</KZ390>
    </Liegenschaft>`
  )
  .join("\n")}
  </Liegenschaften>
</Steuererklaerung>`;
  }

  // ── Persistence ────────────────────────────────────────────────────────

  async saveReport(
    organizationId: string,
    ownerId: string,
    propertyId: string,
    taxYear: number,
    data: E1aKennzahlen,
    xmlContent: string
  ) {
    const [existing] = await db
      .select()
      .from(taxReports)
      .where(
        and(
          eq(taxReports.organizationId, organizationId),
          eq(taxReports.ownerId, ownerId),
          eq(taxReports.propertyId, propertyId),
          eq(taxReports.taxYear, taxYear),
          eq(taxReports.reportType, "E1a")
        )
      );

    if (existing) {
      await db
        .update(taxReports)
        .set({ data, xmlContent, status: "entwurf" })
        .where(eq(taxReports.id, existing.id));
      return existing.id;
    }

    const [inserted] = await db
      .insert(taxReports)
      .values({
        organizationId,
        ownerId,
        propertyId,
        reportType: "E1a",
        taxYear,
        data,
        xmlContent,
        status: "entwurf",
      })
      .returning({ id: taxReports.id });

    return inserted.id;
  }

  async getHistory(organizationId: string) {
    return db
      .select()
      .from(taxReports)
      .where(eq(taxReports.organizationId, organizationId));
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private emptyKennzahlen(): E1aKennzahlen {
    return { kz370: 0, kz371: 0, kz380: 0, kz381: 0, kz382: 0, kz383: 0, kz390: 0 };
  }

  private sumKennzahlen(items: E1aKennzahlen[]): E1aKennzahlen {
    const sum = this.emptyKennzahlen();
    for (const k of items) {
      sum.kz370 += k.kz370;
      sum.kz371 += k.kz371;
      sum.kz380 += k.kz380;
      sum.kz381 += k.kz381;
      sum.kz382 += k.kz382;
      sum.kz383 += k.kz383;
      sum.kz390 += k.kz390;
    }
    return sum;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}

export const taxReportingService = new TaxReportingService();
