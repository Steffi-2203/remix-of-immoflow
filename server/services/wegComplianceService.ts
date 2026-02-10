/**
 * WEG §31 Reserve Fund Compliance Service.
 * Ensures minimum reserve contributions per Austrian WEG-Novelle 2022/2024.
 *
 * MRG §27 Kautions-Rückgabe: Deposit return deadline tracking.
 * WEG §24 Eigentümerversammlung: Assembly invitation deadlines.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import { billingLogger } from "../lib/logger";

const logger = billingLogger.child({ module: "weg-compliance" });

// WEG §31: Minimum reserve per m² per month (€0.90 as of WEG-Novelle 2022)
const WEG_MIN_RESERVE_PER_QM_MONTH = 0.90;

// MRG §27b: Deposit must be returned within 14 days after move-out + handover
const MRG_DEPOSIT_RETURN_DAYS = 14;

// WEG §24: Assembly invitation must be sent at least 14 days before
const WEG_ASSEMBLY_INVITATION_DAYS = 14;

export interface ReserveComplianceResult {
  propertyId: string;
  totalQm: number;
  minimumMonthlyReserve: number;
  currentMonthlyReserve: number;
  isCompliant: boolean;
  deficit: number;
}

export interface DepositReturnCheck {
  tenantId: string;
  tenantName: string;
  moveOutDate: string;
  depositAmount: number;
  deadlineDate: string;
  daysOverdue: number;
  isOverdue: boolean;
}

/**
 * Check WEG §31 reserve fund compliance for a property.
 * Minimum contribution: €0.90/m²/month (configurable for future law changes).
 */
export async function checkReserveCompliance(
  propertyId: string,
  currentMonthlyReserve: number
): Promise<ReserveComplianceResult> {
  const result = await db.execute(sql`
    SELECT 
      COALESCE(SUM(CAST(flaeche AS numeric)), 0) AS total_qm
    FROM units
    WHERE property_id = ${propertyId}::uuid
  `);

  const totalQm = Number((result.rows?.[0] as any)?.total_qm || 0);
  const minimumMonthlyReserve = Math.round(totalQm * WEG_MIN_RESERVE_PER_QM_MONTH * 100) / 100;
  const isCompliant = currentMonthlyReserve >= minimumMonthlyReserve;
  const deficit = isCompliant ? 0 : Math.round((minimumMonthlyReserve - currentMonthlyReserve) * 100) / 100;

  if (!isCompliant) {
    logger.warn(
      { propertyId, totalQm, minimumMonthlyReserve, currentMonthlyReserve, deficit },
      "WEG §31: Reserve fund below minimum"
    );
  }

  return {
    propertyId,
    totalQm,
    minimumMonthlyReserve,
    currentMonthlyReserve,
    isCompliant,
    deficit,
  };
}

/**
 * MRG §27b: Check for overdue deposit returns.
 * Returns list of tenants who moved out and whose deposit return deadline has passed.
 */
export async function checkDepositReturnDeadlines(
  organizationId: string
): Promise<DepositReturnCheck[]> {
  const result = await db.execute(sql`
    SELECT 
      t.id AS tenant_id,
      t.first_name || ' ' || t.last_name AS tenant_name,
      t.mietende AS move_out_date,
      COALESCE(CAST(t.kaution AS numeric), 0) AS deposit_amount,
      t.kaution_bezahlt AS deposit_paid
    FROM tenants t
    JOIN units u ON t.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE p.organization_id = ${organizationId}::uuid
      AND t.status IN ('beendet', 'gekündigt')
      AND t.mietende IS NOT NULL
      AND t.mietende < NOW()
      AND COALESCE(CAST(t.kaution AS numeric), 0) > 0
      AND t.kaution_bezahlt = true
    ORDER BY t.mietende ASC
  `);

  const checks: DepositReturnCheck[] = [];
  const now = new Date();

  for (const row of (result.rows || []) as any[]) {
    const moveOutDate = new Date(row.move_out_date);
    const deadlineDate = new Date(moveOutDate);
    deadlineDate.setDate(deadlineDate.getDate() + MRG_DEPOSIT_RETURN_DAYS);

    const daysOverdue = Math.max(0, Math.floor((now.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24)));

    checks.push({
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      moveOutDate: moveOutDate.toISOString().split("T")[0],
      depositAmount: Number(row.deposit_amount),
      deadlineDate: deadlineDate.toISOString().split("T")[0],
      daysOverdue,
      isOverdue: now > deadlineDate,
    });
  }

  if (checks.some(c => c.isOverdue)) {
    logger.warn(
      { organizationId, overdueCount: checks.filter(c => c.isOverdue).length },
      "MRG §27b: Overdue deposit returns detected"
    );
  }

  return checks;
}

/**
 * WEG §24: Calculate assembly invitation deadline.
 * Invitation must be sent at least 14 days before the assembly date.
 */
export function getAssemblyInvitationDeadline(assemblyDate: Date): Date {
  const deadline = new Date(assemblyDate);
  deadline.setDate(deadline.getDate() - WEG_ASSEMBLY_INVITATION_DAYS);
  return deadline;
}

/**
 * Check if assembly invitation deadline is approaching (within 7 days).
 */
export function isInvitationDeadlineApproaching(assemblyDate: Date): {
  approaching: boolean;
  deadline: Date;
  daysUntilDeadline: number;
} {
  const deadline = getAssemblyInvitationDeadline(assemblyDate);
  const now = new Date();
  const daysUntilDeadline = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    approaching: daysUntilDeadline >= 0 && daysUntilDeadline <= 7,
    deadline,
    daysUntilDeadline,
  };
}
