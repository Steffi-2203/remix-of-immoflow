import { db } from "../db";
import { sql } from "drizzle-orm";
import { tenants, units, properties, vpiAdjustments, rentHistory, monthlyInvoices } from "@shared/schema";
import { eq, and, isNull, gte, lte, desc } from "drizzle-orm";
import { format, addMonths } from "date-fns";
import { de } from "date-fns/locale";

interface VpiData {
  year: number;
  month: number;
  value: number;
}

interface VpiAdjustmentResult {
  tenantId: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  currentRent: number;
  newRent: number;
  percentageIncrease: number;
  baseVpi: number;
  currentVpi: number;
  effectiveDate: string;
}

const SCHWELLENWERT = 0.05;

export class VpiAutomationService {
  /**
   * Fetch the latest VPI value from the vpi_values table.
   * Falls back to hardcoded value if table is empty.
   */
  private async getCurrentVpi(): Promise<VpiData> {
    try {
      const result = await db.execute(sql`
        SELECT year, month, value FROM vpi_values
        ORDER BY year DESC, month DESC
        LIMIT 1
      `);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          year: Number(row.year),
          month: Number(row.month),
          value: Number(row.value),
        };
      }
    } catch (e) {
      console.warn('VPI table not available, using fallback:', e);
    }
    // Fallback for environments without the table
    return { year: 2025, month: 1, value: 122.3 };
  }

  /**
   * Get a specific VPI value by year/month.
   */
  async getVpiValue(year: number, month: number): Promise<number | null> {
    try {
      const result = await db.execute(sql`
        SELECT value FROM vpi_values
        WHERE year = ${year} AND month = ${month}
        LIMIT 1
      `);
      return result.rows.length > 0 ? Number(result.rows[0].value) : null;
    } catch {
      return null;
    }
  }

  /**
   * Add or update a VPI value (for admin UI).
   */
  async upsertVpiValue(year: number, month: number, value: number, source = 'manual', notes?: string): Promise<void> {
    await db.execute(sql`
      INSERT INTO vpi_values (year, month, value, source, notes)
      VALUES (${year}, ${month}, ${value}, ${source}, ${notes ?? null})
      ON CONFLICT (year, month) DO UPDATE
      SET value = EXCLUDED.value, source = EXCLUDED.source, notes = EXCLUDED.notes, updated_at = now()
    `);
  }

  /**
   * List all stored VPI values, newest first.
   */
  async listVpiValues(): Promise<VpiData[]> {
    const result = await db.execute(sql`
      SELECT year, month, value FROM vpi_values
      ORDER BY year DESC, month DESC
    `);
    return result.rows.map(r => ({
      year: Number(r.year),
      month: Number(r.month),
      value: Number(r.value),
    }));
  }

  async checkVpiAdjustments(organizationId: string): Promise<VpiAdjustmentResult[]> {
    const currentVpi = await this.getCurrentVpi();
    
    const activeTenants = await db.select({
      tenant: tenants,
      unit: units,
      property: properties,
    })
      .from(tenants)
      .innerJoin(units, eq(tenants.unitId, units.id))
      .innerJoin(properties, eq(units.propertyId, properties.id))
      .where(and(
        eq(properties.organizationId, organizationId),
        isNull(tenants.deletedAt),
        eq(tenants.status, 'aktiv')
      ));

    const adjustments: VpiAdjustmentResult[] = [];

    for (const row of activeTenants) {
      const baseVpi = Number(row.tenant.vpiBase) || 100;
      const lastAdjustmentDate = row.tenant.lastVpiAdjustment 
        ? new Date(row.tenant.lastVpiAdjustment) 
        : null;

      const percentageIncrease = (currentVpi.value - baseVpi) / baseVpi;
      
      if (percentageIncrease >= SCHWELLENWERT) {
        const currentRent = Number(row.tenant.hauptmiete) || 0;
        const newRent = Math.round(currentRent * (1 + percentageIncrease) * 100) / 100;
        
        if (!lastAdjustmentDate || lastAdjustmentDate < new Date(currentVpi.year, currentVpi.month - 1, 1)) {
          adjustments.push({
            tenantId: row.tenant.id,
            tenantName: `${row.tenant.vorname || ''} ${row.tenant.nachname || ''}`.trim(),
            propertyName: row.property.name || '',
            unitNumber: row.unit.topNummer || '',
            currentRent,
            newRent,
            percentageIncrease,
            baseVpi,
            currentVpi: currentVpi.value,
            effectiveDate: format(addMonths(new Date(), 1), 'yyyy-MM-01'),
          });
        }
      }
    }

    return adjustments;
  }

  async applyVpiAdjustment(
    organizationId: string,
    tenantId: string,
    newRent: number,
    currentVpiValue: number,
    effectiveDate: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const tenant = await db.select({
        tenant: tenants,
        unit: units,
        property: properties,
      })
        .from(tenants)
        .innerJoin(units, eq(tenants.unitId, units.id))
        .innerJoin(properties, eq(units.propertyId, properties.id))
        .where(and(
          eq(tenants.id, tenantId),
          eq(properties.organizationId, organizationId)
        ))
        .limit(1);

      if (!tenant[0]) {
        return { success: false, message: 'Mieter nicht gefunden' };
      }

      const currentRent = Number(tenant[0].tenant.hauptmiete) || 0;
      const percentageIncrease = ((newRent - currentRent) / currentRent) * 100;

      await db.insert(vpiAdjustments).values({
        id: crypto.randomUUID(),
        tenantId,
        baseVpi: Number(tenant[0].tenant.vpiBase) || 100,
        currentVpi: currentVpiValue,
        oldRent: currentRent.toString(),
        newRent: newRent.toString(),
        percentageChange: percentageIncrease.toString(),
        effectiveDate: new Date(effectiveDate),
        status: 'applied',
        appliedAt: new Date(),
      });

      await db.insert(rentHistory).values({
        id: crypto.randomUUID(),
        tenantId,
        hauptmiete: newRent.toString(),
        betriebskosten: tenant[0].tenant.betriebskosten || '0',
        heizkosten: tenant[0].tenant.heizkosten || '0',
        sonstigeKosten: tenant[0].tenant.sonstigeKosten || '0',
        validFrom: new Date(effectiveDate),
        reason: `VPI-Anpassung: ${percentageIncrease.toFixed(2)}%`,
      });

      await db.update(tenants)
        .set({
          hauptmiete: newRent.toString(),
          vpiBase: currentVpiValue.toString(),
          lastVpiAdjustment: new Date(effectiveDate),
        })
        .where(eq(tenants.id, tenantId));

      return { success: true, message: `Miete von ${currentRent}€ auf ${newRent}€ angepasst` };
    } catch (error) {
      console.error('VPI adjustment failed:', error);
      return { success: false, message: 'Fehler bei der VPI-Anpassung' };
    }
  }

  async generateVpiNotificationLetter(adjustment: VpiAdjustmentResult): Promise<string> {
    const effectiveDate = format(new Date(adjustment.effectiveDate), 'dd.MM.yyyy', { locale: de });
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
        <h2>Mitteilung über Mietanpassung gemäß Verbraucherpreisindex</h2>
        
        <p>Sehr geehrte(r) ${adjustment.tenantName},</p>
        
        <p>gemäß den Bestimmungen Ihres Mietvertrages teilen wir Ihnen mit, dass aufgrund der 
        Entwicklung des Verbraucherpreisindex (VPI) eine Anpassung Ihrer Miete erfolgt.</p>
        
        <h3>Details der Anpassung:</h3>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Objekt:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${adjustment.propertyName} - ${adjustment.unitNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Basis-VPI:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${adjustment.baseVpi}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Aktueller VPI:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${adjustment.currentVpi}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Veränderung:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${(adjustment.percentageIncrease * 100).toFixed(2)}%</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Bisherige Miete:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${adjustment.currentRent.toFixed(2)} €</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Neue Miete:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>${adjustment.newRent.toFixed(2)} €</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Gültig ab:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${effectiveDate}</td>
          </tr>
        </table>
        
        <p>Die Anpassung erfolgt auf Grundlage des von der Statistik Austria veröffentlichten 
        Verbraucherpreisindex.</p>
        
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        
        <p>Mit freundlichen Grüßen,<br>
        Ihre Hausverwaltung</p>
      </div>
    `;
  }
}

export const vpiAutomationService = new VpiAutomationService();
