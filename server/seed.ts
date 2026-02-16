import { db } from "./db";
import { sql, eq, and } from "drizzle-orm";
import {
  organizations,
  profiles,
  userRoles,
  userOrganizations,
  loginAttempts,
} from "../shared/schema";
import bcrypt from "bcrypt";
import crypto from "crypto";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "stephania.pfeffer@outlook.de";
const ADMIN_NAME = process.env.ADMIN_NAME || "Stephania Pfeffer";
const ADMIN_ORG_NAME = "ImmoflowMe Admin";

export async function runSeed(): Promise<void> {
  console.log("[SEED] Starte Seed-Prozess...");

  try {
    await db.transaction(async (tx) => {
      // 1. Organisation sicherstellen (kein unique index auf name, SELECT-first)
      const existingOrg = await tx.query.organizations.findFirst({
        where: eq(organizations.name, ADMIN_ORG_NAME),
      });

      let orgId: string;

      if (existingOrg) {
        console.log("[SEED] Organisation existiert bereits:", existingOrg.id);
        orgId = existingOrg.id;
      } else {
        console.log("[SEED] Erstelle Organisation...");
        const inserted = await tx
          .insert(organizations)
          .values({
            name: ADMIN_ORG_NAME,
            subscriptionTier: sql`'professional'::subscription_tier`,
            subscriptionStatus: sql`'active'::subscription_status`,
          })
          .returning();

        orgId = inserted[0].id;
        console.log("[SEED] Organisation erstellt:", orgId);
      }

      // 2. Admin-Profil sicherstellen (ON CONFLICT auf unique email)
      const adminPassword =
        process.env.ADMIN_INITIAL_PASSWORD || crypto.randomBytes(16).toString("base64url");
      const passwordHash = await bcrypt.hash(adminPassword, 12);

      const existingProfile = await tx.query.profiles.findFirst({
        where: eq(profiles.email, ADMIN_EMAIL),
      });

      let adminId: string;

      if (existingProfile) {
        console.log("[SEED] Admin-Profil existiert bereits:", existingProfile.id);
        adminId = existingProfile.id;

        if (existingProfile.organizationId !== orgId) {
          await tx
            .update(profiles)
            .set({ organizationId: orgId })
            .where(eq(profiles.id, existingProfile.id));
          console.log("[SEED] Admin organization_id repariert");
        }
      } else {
        console.log("[SEED] Erstelle Admin-Profil...");
        const inserted = await tx
          .insert(profiles)
          .values({
            email: ADMIN_EMAIL,
            fullName: ADMIN_NAME,
            passwordHash: passwordHash,
            organizationId: orgId,
            subscriptionTier: sql`'pro'::user_subscription_tier`,
          })
          .onConflictDoNothing()
          .returning();

        if (inserted.length === 0) {
          const fallback = await tx.query.profiles.findFirst({
            where: eq(profiles.email, ADMIN_EMAIL),
          });
          if (!fallback) {
            throw new Error("[SEED] Admin-Profil konnte nicht erstellt werden.");
          }
          adminId = fallback.id;
        } else {
          adminId = inserted[0].id;
        }
        console.log("[SEED] Admin-Profil erstellt:", adminId);
      }

      // 3. Admin-Rolle sicherstellen (kein composite unique index, SELECT-first)
      const existingRole = await tx.query.userRoles.findFirst({
        where: and(
          eq(userRoles.userId, adminId),
          eq(userRoles.role, "admin"),
        ),
      });

      if (existingRole) {
        console.log("[SEED] Admin-Rolle existiert bereits");
      } else {
        console.log("[SEED] Erstelle Admin-Rolle...");
        await tx.insert(userRoles).values({
          userId: adminId,
          role: sql`'admin'::app_role`,
        });
        console.log("[SEED] Admin-Rolle erstellt");
      }

      // 4. Organisations-Mitgliedschaft sicherstellen (ON CONFLICT auf unique user_id+organization_id)
      const existingMembership = await tx.query.userOrganizations.findFirst({
        where: and(
          eq(userOrganizations.userId, adminId),
          eq(userOrganizations.organizationId, orgId),
        ),
      });

      if (existingMembership) {
        console.log("[SEED] Mitgliedschaft existiert bereits");
      } else {
        console.log("[SEED] Erstelle Mitgliedschaft...");
        await tx
          .insert(userOrganizations)
          .values({
            userId: adminId,
            organizationId: orgId,
            role: "admin",
            isDefault: true,
          })
          .onConflictDoNothing();
        console.log("[SEED] Mitgliedschaft erstellt");
      }

      // 5. Login-Versuche bereinigen (verhindert Account-Lockout)
      await tx
        .delete(loginAttempts)
        .where(eq(loginAttempts.email, ADMIN_EMAIL));
    });

    console.log("[SEED] Seed-Prozess erfolgreich abgeschlossen");
  } catch (err) {
    console.error("[SEED] KRITISCHER FEHLER im Seed-Prozess:", err);
    console.error("[SEED] Admin-Login wird in Produktion NICHT funktionieren!");
  }
}
