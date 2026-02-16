import { db } from "./db";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "stephania.pfeffer@outlook.de";
const ADMIN_NAME = process.env.ADMIN_NAME || "Stephania Pfeffer";
const ADMIN_ORG_NAME = "ImmoflowMe Admin";

async function ensureAdminSeeded(): Promise<void> {
  // 1. Organisation sicherstellen (SELECT-first, kein unique index auf name vorhanden)
  let orgId: string;
  const existingOrg = await db.execute(
    sql`SELECT id FROM organizations WHERE name = ${ADMIN_ORG_NAME} LIMIT 1`
  );
  if (existingOrg.rows.length > 0) {
    orgId = existingOrg.rows[0].id as string;
    console.log("[SEED] Organisation existiert bereits:", orgId);
  } else {
    orgId = crypto.randomUUID();
    await db.execute(sql`
      INSERT INTO organizations (id, name, subscription_tier, subscription_status)
      VALUES (
        ${orgId},
        ${ADMIN_ORG_NAME},
        'professional'::subscription_tier,
        'active'::subscription_status
      )
    `);
    console.log("[SEED] Organisation erstellt:", orgId);
  }

  // 2. Admin-Profil sicherstellen (ON CONFLICT auf unique email)
  const adminPassword =
    process.env.ADMIN_INITIAL_PASSWORD || crypto.randomBytes(16).toString("base64url");
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const userId = crypto.randomUUID();

  const profileResult = await db.execute(sql`
    INSERT INTO profiles (id, email, password_hash, full_name, organization_id, subscription_tier)
    VALUES (
      ${userId},
      ${ADMIN_EMAIL},
      ${passwordHash},
      ${ADMIN_NAME},
      ${orgId},
      'pro'::user_subscription_tier
    )
    ON CONFLICT (email) DO UPDATE SET
      organization_id = ${orgId},
      password_hash = CASE
        WHEN profiles.password_hash IS NULL THEN ${passwordHash}
        ELSE profiles.password_hash
      END
    RETURNING id
  `);
  const finalUserId = profileResult.rows[0].id as string;
  if (finalUserId === userId) {
    console.log("[SEED] Admin-Profil erstellt:", finalUserId);
  } else {
    console.log("[SEED] Admin-Profil existiert bereits:", finalUserId);
  }

  // 3. Admin-Rolle sicherstellen (kein composite unique index auf user_id+role, SELECT-first)
  const existingRole = await db.execute(
    sql`SELECT id FROM user_roles WHERE user_id = ${finalUserId} AND role = 'admin'::app_role LIMIT 1`
  );
  if (existingRole.rows.length === 0) {
    await db.execute(sql`
      INSERT INTO user_roles (user_id, role)
      VALUES (${finalUserId}, 'admin'::app_role)
    `);
    console.log("[SEED] Admin-Rolle zugewiesen");
  } else {
    console.log("[SEED] Admin-Rolle existiert bereits");
  }

  // 4. Organisations-Mitgliedschaft sicherstellen (ON CONFLICT auf unique user_id+organization_id)
  await db.execute(sql`
    INSERT INTO user_organizations (user_id, organization_id, role, is_default)
    VALUES (${finalUserId}, ${orgId}, 'admin', true)
    ON CONFLICT (user_id, organization_id) DO UPDATE SET
      role = 'admin',
      is_default = true
  `);
  console.log("[SEED] Organisations-Mitgliedschaft sichergestellt");

  // 5. Login-Versuche bereinigen (verhindert Account-Lockout)
  await db.execute(sql`DELETE FROM login_attempts WHERE email = ${ADMIN_EMAIL}`);

  console.log("[SEED] Admin-Seed erfolgreich abgeschlossen");
}

export async function runSeed() {
  console.log("[SEED] Starte Admin-Seed...");
  try {
    await ensureAdminSeeded();
  } catch (error) {
    console.error("[SEED] KRITISCHER FEHLER beim Admin-Seed:", error);
    console.error("[SEED] Admin-Login wird in Produktion NICHT funktionieren!");
  }
}
