import { db } from "../db";
import { eq, and, lte, isNull, sql } from "drizzle-orm";

export interface ComplianceWarning {
  type: 'weg_reserve' | 'weg_invitation' | 'mrg_deposit_return';
  severity: 'info' | 'warnung' | 'fehler';
  message: string;
  details: Record<string, unknown>;
}

export async function checkWEGReserveCompliance(propertyId: string): Promise<ComplianceWarning[]> {
  const warnings: ComplianceWarning[] = [];
  try {
    const result = await db.execute(sql`
      SELECT COALESCE(SUM(CAST(ruecklage_beitrag AS NUMERIC)), 0) as total_reserve
      FROM weg_wirtschaftsplaene
      WHERE property_id = ${propertyId}::uuid AND jahr = EXTRACT(YEAR FROM NOW())
    `);
    const totalReserve = parseFloat((result as any).rows?.[0]?.total_reserve || '0');
    
    const unitCount = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM units WHERE property_id = ${propertyId}::uuid
    `);
    const count = parseInt((unitCount as any).rows?.[0]?.cnt || '0');
    
    if (count > 0 && totalReserve < count * 50) {
      warnings.push({
        type: 'weg_reserve',
        severity: 'warnung',
        message: `WEG §31: Rücklage unter Empfehlung (${totalReserve.toFixed(2)} EUR für ${count} Einheiten)`,
        details: { propertyId, totalReserve, unitCount: count, recommendedMinimum: count * 50 },
      });
    }
  } catch {}
  return warnings;
}

export function checkWEGInvitationDeadline(assemblyDate: Date | string, invitationSentDate: Date | string | null): ComplianceWarning[] {
  const warnings: ComplianceWarning[] = [];
  const assembly = typeof assemblyDate === 'string' ? new Date(assemblyDate) : assemblyDate;
  
  if (!invitationSentDate) {
    warnings.push({
      type: 'weg_invitation',
      severity: 'fehler',
      message: 'WEG §24 Abs 5: Keine Einladung versendet',
      details: { assemblyDate: assembly.toISOString() },
    });
    return warnings;
  }

  const invitation = typeof invitationSentDate === 'string' ? new Date(invitationSentDate) : invitationSentDate;
  const diffDays = Math.ceil((assembly.getTime() - invitation.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 14) {
    warnings.push({
      type: 'weg_invitation',
      severity: 'fehler',
      message: `WEG §24 Abs 5: Einladungsfrist nicht eingehalten (${diffDays} Tage statt mindestens 14)`,
      details: { assemblyDate: assembly.toISOString(), invitationDate: invitation.toISOString(), daysBefore: diffDays },
    });
  }

  return warnings;
}

export async function checkDepositReturnCompliance(organizationId: string): Promise<ComplianceWarning[]> {
  const warnings: ComplianceWarning[] = [];
  try {
    const overdueDeposits = await db.execute(sql`
      SELECT d.id, d.amount, d.deposit_type, t.first_name, t.last_name, t.mietende,
             EXTRACT(DAY FROM NOW() - t.mietende::timestamp) as days_since_end
      FROM deposits d
      JOIN tenants t ON d.tenant_id = t.id
      JOIN units u ON t.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      WHERE p.organization_id = ${organizationId}::uuid
        AND t.mietende IS NOT NULL
        AND t.mietende < NOW()
        AND d.status != 'zurückgegeben'
        AND d.status != 'aufgelöst'
    `);

    for (const row of (overdueDeposits as any).rows || []) {
      const daysSinceEnd = parseInt(row.days_since_end || '0');
      if (daysSinceEnd > 30) {
        warnings.push({
          type: 'mrg_deposit_return',
          severity: daysSinceEnd > 180 ? 'fehler' : 'warnung',
          message: `MRG §27: Kaution für ${row.first_name} ${row.last_name} seit ${daysSinceEnd} Tagen nicht zurückgegeben (${parseFloat(row.amount).toFixed(2)} EUR)`,
          details: {
            depositId: row.id,
            tenantName: `${row.first_name} ${row.last_name}`,
            amount: parseFloat(row.amount),
            daysSinceLeaseEnd: daysSinceEnd,
            depositType: row.deposit_type,
          },
        });
      }
    }
  } catch {}
  return warnings;
}

export async function runFullComplianceCheck(organizationId: string): Promise<ComplianceWarning[]> {
  const warnings: ComplianceWarning[] = [];
  
  const depositWarnings = await checkDepositReturnCompliance(organizationId);
  warnings.push(...depositWarnings);

  try {
    const orgProperties = await db.execute(sql`
      SELECT id FROM properties WHERE organization_id = ${organizationId}::uuid
    `);
    for (const prop of (orgProperties as any).rows || []) {
      const reserveWarnings = await checkWEGReserveCompliance(prop.id);
      warnings.push(...reserveWarnings);
    }
  } catch {}

  return warnings;
}
