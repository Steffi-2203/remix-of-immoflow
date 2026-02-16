import { db } from "./db";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "stephania.pfeffer@outlook.de";
const ADMIN_NAME = process.env.ADMIN_NAME || "Stephania Pfeffer";
const ADMIN_ORG_NAME = "ImmoflowMe Admin";

async function ensureAdminSeeded(): Promise<void> {
  try {
    let orgId: string;
    const existingOrg = await db.execute(
      sql`SELECT id FROM organizations WHERE name = ${ADMIN_ORG_NAME} LIMIT 1`
    );
    if (existingOrg.rows.length > 0) {
      orgId = existingOrg.rows[0].id as string;
    } else {
      orgId = crypto.randomUUID();
      await db.execute(sql`
        INSERT INTO organizations (id, name, subscription_tier, subscription_status)
        VALUES (${orgId}, ${ADMIN_ORG_NAME}, 'professional'::subscription_tier, 'active'::subscription_status)
      `);
      console.log("[SEED] Organisation erstellt");
    }

    let userId: string;
    const existingAdmin = await db.execute(
      sql`SELECT id, organization_id FROM profiles WHERE email = ${ADMIN_EMAIL} LIMIT 1`
    );
    if (existingAdmin.rows.length > 0) {
      userId = existingAdmin.rows[0].id as string;
      const currentOrgId = existingAdmin.rows[0].organization_id as string | null;
      if (currentOrgId !== orgId) {
        await db.execute(
          sql`UPDATE profiles SET organization_id = ${orgId} WHERE id = ${userId}`
        );
        console.log("[SEED] Admin organization_id repariert");
      }
    } else {
      userId = crypto.randomUUID();
      const adminPassword =
        process.env.ADMIN_INITIAL_PASSWORD || crypto.randomBytes(16).toString("base64url");
      const passwordHash = await bcrypt.hash(adminPassword, 12);

      await db.execute(sql`
        INSERT INTO profiles (id, email, password_hash, full_name, organization_id, subscription_tier)
        VALUES (${userId}, ${ADMIN_EMAIL}, ${passwordHash}, ${ADMIN_NAME}, ${orgId}, 'professional'::user_subscription_tier)
      `);
      console.log("[SEED] Admin-Profil erstellt");
    }

    const existingRole = await db.execute(
      sql`SELECT id FROM user_roles WHERE user_id = ${userId} AND role = 'admin' LIMIT 1`
    );
    if (existingRole.rows.length === 0) {
      await db.execute(sql`
        INSERT INTO user_roles (user_id, role) VALUES (${userId}, 'admin')
      `);
      console.log("[SEED] Admin-Rolle zugewiesen");
    }

    const existingMembership = await db.execute(
      sql`SELECT id FROM user_organizations WHERE user_id = ${userId} AND organization_id = ${orgId} LIMIT 1`
    );
    if (existingMembership.rows.length === 0) {
      await db.execute(sql`
        INSERT INTO user_organizations (user_id, organization_id, role, is_default)
        VALUES (${userId}, ${orgId}, 'admin', true)
      `);
      console.log("[SEED] Organisations-Mitgliedschaft erstellt");
    }

    await db.execute(sql`DELETE FROM login_attempts WHERE email = ${ADMIN_EMAIL}`);

    console.log("[SEED] Admin-Seed abgeschlossen");
  } catch (error) {
    console.error("[SEED] Fehler beim Admin-Seed:", error);
  }
}

export async function runSeed() {
  await ensureAdminSeeded();
}
