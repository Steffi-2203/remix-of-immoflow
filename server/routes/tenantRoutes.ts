import { Router, Request, Response } from "express";
import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "@shared/schema";
import { insertTenantSchema, insertRentHistorySchema } from "@shared/schema";
import { storage } from "../storage";
import { isAuthenticated, requireRole, getUserRoles, getProfileFromSession, isTester, maskPersonalData, snakeToCamel, parsePagination, paginateArray , type AuthenticatedRequest } from "./helpers";
import { verifyTenantOwnership, verifyUnitOwnership } from "../lib/ownershipCheck";

const router = Router();

// ===== Tenants CRUD =====

router.get("/api/units/:unitId/tenants", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.status(403).json({ error: "Keine Organisation zugeordnet" });
    const isOwner = await verifyUnitOwnership(req.params.unitId, profile.organizationId);
    if (!isOwner) return res.status(403).json({ error: "Zugriff verweigert" });
    const unit = await storage.getUnit(req.params.unitId);
    if (unit) {
      const property = await storage.getProperty(unit.propertyId);
      if (property && property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    const tenants = await storage.getTenantsByUnit(req.params.unitId);
    const roles = await getUserRoles(req);
    res.json(isTester(roles) ? maskPersonalData(tenants) : tenants);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tenants" });
  }
});

router.get("/api/tenants", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    const tenants = await storage.getTenantsByOrganization(profile?.organizationId);
    const roles = await getUserRoles(req);
    const items = isTester(roles) ? maskPersonalData(tenants) : tenants;
    const { page, limit } = parsePagination(req);
    const result = paginateArray(items, page, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tenants" });
  }
});

router.get("/api/tenants/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    const tenant = await storage.getTenant(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    const unit = await storage.getUnit(tenant.unitId);
    if (unit) {
      const property = await storage.getProperty(unit.propertyId);
      if (property && property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    const roles = await getUserRoles(req);
    res.json(isTester(roles) ? maskPersonalData(tenant) : tenant);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tenant" });
  }
});

router.delete("/api/tenants/:id", isAuthenticated, requireRole("property_manager"), async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    const tenant = await storage.getTenant(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    const unit = await storage.getUnit(tenant.unitId);
    if (unit) {
      const property = await storage.getProperty(unit.propertyId);
      if (property && property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    await storage.softDeleteTenant(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete tenant" });
  }
});

router.post("/api/tenants", isAuthenticated, requireRole("property_manager"), async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    const body = snakeToCamel(req.body);
    
    const unit = await storage.getUnit(body.unitId);
    if (!unit) {
      return res.status(404).json({ error: "Einheit nicht gefunden" });
    }
    
    const property = await storage.getProperty(unit.propertyId);
    if (!property || property.organizationId !== profile?.organizationId) {
      return res.status(403).json({ error: "Zugriff verweigert" });
    }
    
    const tenantData = {
      unitId: body.unitId,
      firstName: body.firstName || 'Unbekannt',
      lastName: body.lastName || 'Unbekannt',
      email: body.email || null,
      phone: body.phone || null,
      mobilePhone: body.mobilePhone || null,
      status: body.status || 'aktiv',
      mietbeginn: body.mietbeginn || null,
      mietende: body.mietende || null,
      grundmiete: body.grundmiete?.toString() || '0',
      betriebskostenVorschuss: body.betriebskostenVorschuss?.toString() || '0',
      heizkostenVorschuss: body.heizkostenVorschuss?.toString() || '0',
      wasserkostenVorschuss: body.wasserkostenVorschuss?.toString() || '0',
      warmwasserkostenVorschuss: body.warmwasserkostenVorschuss?.toString() || '0',
      sonstigeKosten: body.sonstigeKosten && typeof body.sonstigeKosten === 'object' ? body.sonstigeKosten : null,
      kaution: body.kaution?.toString() || null,
      kautionBezahlt: body.kautionBezahlt || false,
      iban: body.iban || null,
      bic: body.bic || null,
      sepaMandat: body.sepaMandat || false,
      sepaMandatDatum: body.sepaMandatDatum || null,
      notes: body.notes || null,
    };
    
    const validationResult = insertTenantSchema.safeParse(tenantData);
    if (!validationResult.success) {
      console.error("Tenant validation error:", validationResult.error.flatten());
      return res.status(400).json({ 
        error: "Validierung fehlgeschlagen", 
        details: validationResult.error.flatten() 
      });
    }
    
    const [tenant] = await db.insert(schema.tenants).values(validationResult.data).returning();
    res.json(tenant);
  } catch (error) {
    console.error("Create tenant error:", error);
    res.status(500).json({ error: "Mieter konnte nicht erstellt werden" });
  }
});

// ===== Tenant Rent History =====

router.get("/api/tenants/:tenantId/rent-history", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.status(403).json({ error: "Keine Organisation zugeordnet" });
    const isOwner = await verifyTenantOwnership(req.params.tenantId, profile.organizationId);
    if (!isOwner) return res.status(403).json({ error: "Zugriff verweigert" });
    const tenant = await storage.getTenant(req.params.tenantId);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    const unit = await storage.getUnit(tenant.unitId);
    if (!unit) {
      return res.status(403).json({ error: "Access denied - unit not found" });
    }
    const property = await storage.getProperty(unit.propertyId);
    if (!property || property.organizationId !== profile?.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const history = await storage.getRentHistoryByTenant(req.params.tenantId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch rent history" });
  }
});

router.post("/api/tenants/:tenantId/rent-history", isAuthenticated, requireRole("property_manager", "finance"), async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.status(403).json({ error: "Keine Organisation zugeordnet" });
    const isOwner = await verifyTenantOwnership(req.params.tenantId, profile.organizationId);
    if (!isOwner) return res.status(403).json({ error: "Zugriff verweigert" });
    const tenant = await storage.getTenant(req.params.tenantId);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    const unit = await storage.getUnit(tenant.unitId);
    if (!unit) {
      return res.status(403).json({ error: "Access denied - unit not found" });
    }
    const property = await storage.getProperty(unit.propertyId);
    if (!property || property.organizationId !== profile?.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const normalizedBody = snakeToCamel(req.body);
    const validationResult = insertRentHistorySchema.safeParse({
      ...normalizedBody,
      tenantId: req.params.tenantId
    });
    if (!validationResult.success) {
      return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
    }
    const rentHistory = await storage.createRentHistory(validationResult.data);
    res.json(rentHistory);
  } catch (error) {
    console.error("Create rent history error:", error);
    res.status(500).json({ error: "Failed to create rent history" });
  }
});

// ====== LEASES (Mietverträge) ======

router.get("/api/tenants/:tenantId/leases", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.status(403).json({ error: "Keine Organisation zugeordnet" });
    const isOwner = await verifyTenantOwnership(req.params.tenantId, profile.organizationId);
    if (!isOwner) return res.status(403).json({ error: "Zugriff verweigert" });
    const leases = await storage.getLeasesByTenant(req.params.tenantId);
    res.json(leases);
  } catch (error) {
    console.error("Get leases by tenant error:", error);
    res.status(500).json({ error: "Failed to fetch leases" });
  }
});

router.get("/api/units/:unitId/leases", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.status(403).json({ error: "Keine Organisation zugeordnet" });
    const isOwner = await verifyUnitOwnership(req.params.unitId, profile.organizationId);
    if (!isOwner) return res.status(403).json({ error: "Zugriff verweigert" });
    const leases = await storage.getLeasesByUnit(req.params.unitId);
    res.json(leases);
  } catch (error) {
    console.error("Get leases by unit error:", error);
    res.status(500).json({ error: "Failed to fetch leases" });
  }
});

router.get("/api/leases/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const lease = await storage.getLease(req.params.id);
    if (!lease) {
      return res.status(404).json({ error: "Lease not found" });
    }
    res.json(lease);
  } catch (error) {
    console.error("Get lease error:", error);
    res.status(500).json({ error: "Failed to fetch lease" });
  }
});

router.post("/api/leases", isAuthenticated, requireRole("property_manager"), async (req: AuthenticatedRequest, res) => {
  try {
    const validatedData = schema.insertLeaseSchema.parse(req.body);
    const lease = await storage.createLease(validatedData);
    res.status(201).json(lease);
  } catch (error: any) {
    console.error("Create lease error:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create lease" });
  }
});

router.patch("/api/leases/:id", isAuthenticated, requireRole("property_manager"), async (req: AuthenticatedRequest, res) => {
  try {
    const lease = await storage.updateLease(req.params.id, req.body);
    if (!lease) {
      return res.status(404).json({ error: "Lease not found" });
    }
    res.json(lease);
  } catch (error) {
    console.error("Update lease error:", error);
    res.status(500).json({ error: "Failed to update lease" });
  }
});

// ===== Tenant Invoices & Payments =====

router.get("/api/tenants/:tenantId/invoices", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.status(403).json({ error: "Keine Organisation zugeordnet" });
    const isOwner = await verifyTenantOwnership(req.params.tenantId, profile.organizationId);
    if (!isOwner) return res.status(403).json({ error: "Zugriff verweigert" });
    const invoices = await storage.getInvoicesByTenant(req.params.tenantId);
    const roles = await getUserRoles(req);
    res.json(isTester(roles) ? maskPersonalData(invoices) : invoices);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tenant invoices" });
  }
});

router.get("/api/tenants/:tenantId/payments", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.status(403).json({ error: "Keine Organisation zugeordnet" });
    const isOwner = await verifyTenantOwnership(req.params.tenantId, profile.organizationId);
    if (!isOwner) return res.status(403).json({ error: "Zugriff verweigert" });
    const payments = await storage.getPaymentsByTenant(req.params.tenantId);
    const roles = await getUserRoles(req);
    res.json(isTester(roles) ? maskPersonalData(payments) : payments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tenant payments" });
  }
});

// ===== Tenant Documents =====

router.get("/api/tenant-documents", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.session.organizationId;
    const documents = await db.select()
      .from(schema.tenantDocuments)
      .where(eq(schema.tenantDocuments.organizationId, orgId));
    
    res.json(documents.map(d => ({
      ...d,
      tenant_id: d.tenantId,
      organization_id: d.organizationId,
      file_url: d.fileUrl,
      file_size: d.fileSize,
      mime_type: d.mimeType,
      created_at: d.createdAt,
      updated_at: d.updatedAt,
    })));
  } catch (error) {
    console.error('Tenant documents fetch error:', error);
    res.status(500).json({ error: "Failed to fetch tenant documents" });
  }
});

router.get("/api/tenants/:tenantId/documents", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.status(403).json({ error: "Keine Organisation zugeordnet" });
    const isOwnerTenantDoc = await verifyTenantOwnership(req.params.tenantId, profile.organizationId);
    if (!isOwnerTenantDoc) return res.status(403).json({ error: "Zugriff verweigert" });
    const { tenantId } = req.params;
    const documents = await db.select()
      .from(schema.tenantDocuments)
      .where(eq(schema.tenantDocuments.tenantId, tenantId));
    
    res.json(documents.map(d => ({
      ...d,
      tenant_id: d.tenantId,
      organization_id: d.organizationId,
      file_url: d.fileUrl,
      file_size: d.fileSize,
      mime_type: d.mimeType,
      created_at: d.createdAt,
      updated_at: d.updatedAt,
    })));
  } catch (error) {
    console.error('Tenant documents fetch error:', error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.post("/api/tenants/:tenantId/documents", isAuthenticated, requireRole("property_manager"), async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.status(403).json({ error: "Keine Organisation zugeordnet" });
    const isOwnerTenantDoc = await verifyTenantOwnership(req.params.tenantId, profile.organizationId);
    if (!isOwnerTenantDoc) return res.status(403).json({ error: "Zugriff verweigert" });
    const { tenantId } = req.params;
    const orgId = req.session.organizationId;
    const body = snakeToCamel(req.body);
    
    const tenantResult = await db.select({
      tenantId: schema.tenants.id,
      unitId: schema.tenants.unitId,
      propertyId: schema.units.propertyId,
      organizationId: schema.properties.organizationId,
    })
      .from(schema.tenants)
      .leftJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .leftJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(eq(schema.tenants.id, tenantId));
    
    if (tenantResult.length === 0 || tenantResult[0].organizationId !== orgId) {
      return res.status(403).json({ error: "Tenant not found or access denied" });
    }
    
    const result = await db.insert(schema.tenantDocuments).values({
      tenantId,
      organizationId: orgId,
      name: body.name,
      category: body.category || 'sonstiges',
      fileUrl: body.fileUrl || body.file_url,
      fileSize: body.fileSize || body.file_size,
      mimeType: body.mimeType || body.mime_type,
      notes: body.notes,
    }).returning();
    
    res.json(result[0]);
  } catch (error) {
    console.error('Tenant document create error:', error);
    res.status(500).json({ error: "Failed to create document" });
  }
});

router.delete("/api/tenant-documents/:id", isAuthenticated, requireRole("property_manager"), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const orgId = req.session.organizationId;
    await db.delete(schema.tenantDocuments).where(and(eq(schema.tenantDocuments.id, id), eq(schema.tenantDocuments.organizationId, orgId)));
    res.json({ success: true });
  } catch (error) {
    console.error('Tenant document delete error:', error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

// ====== LEASE CONTRACT GENERATOR (Mietvertragsgenerator) ======

interface ClauseSection {
  id: string;
  title: string;
  content: string;
  required: boolean;
}

const mrgClauses: ClauseSection[] = [
  {
    id: "mietgegenstand",
    title: "§1 Mietgegenstand",
    content: "Der Vermieter/die Vermieterin, {{vermieterName}}, vermietet dem Mieter/der Mieterin, {{mieterName}}, die Wohnung/das Geschäftslokal Top {{topNummer}} im Haus {{adresse}} mit einer Nutzfläche von ca. {{flaeche}} m². Der Mietgegenstand wird zu Wohnzwecken vermietet und darf nur zu diesem Zweck verwendet werden. Zum Mietgegenstand gehören auch die mitvermieteten Einrichtungsgegenstände und Zubehör gemäß Übergabeprotokoll.",
    required: true,
  },
  {
    id: "mietdauer",
    title: "§2 Mietdauer",
    content: "Das Mietverhältnis beginnt am {{mietbeginn}} und wird {{mietende}} abgeschlossen. Bei befristeten Mietverhältnissen gemäß § 29 Abs 1 Z 3 MRG beträgt die Mindestdauer drei Jahre. Eine vorzeitige Auflösung ist nur aus wichtigem Grund gemäß § 1118 ABGB oder § 30 MRG möglich.",
    required: true,
  },
  {
    id: "mietzins",
    title: "§3 Mietzins und Betriebskosten",
    content: "Der monatliche Hauptmietzins beträgt EUR {{miete}} (netto, zzgl. USt gemäß § 10 UStG). Zusätzlich sind monatlich Betriebskosten in Höhe von EUR {{betriebskosten}} als Akontierung zu entrichten. Die Betriebskosten werden gemäß §§ 21–24 MRG abgerechnet. Der Gesamtmietzins ist jeweils am 1. eines jeden Monats im Voraus auf das Konto des Vermieters zu überweisen. Bei verspäteter Zahlung fallen Verzugszinsen in gesetzlicher Höhe an.",
    required: true,
  },
  {
    id: "kaution",
    title: "§4 Kaution",
    content: "Der Mieter/die Mieterin hinterlegt bei Vertragsabschluss eine Kaution in Höhe von EUR {{kaution}} (entspricht drei Bruttomonatsmieten). Die Kaution dient zur Sicherstellung sämtlicher Ansprüche des Vermieters aus dem Mietverhältnis. Die Kaution ist auf einem Sparbuch oder einem Treuhandkonto zu veranlagen und wird nach ordnungsgemäßer Rückgabe des Mietgegenstandes samt aufgelaufener Zinsen zurückerstattet. Ein Abzug ist nur bei dokumentierten Schäden oder offenen Forderungen zulässig.",
    required: false,
  },
  {
    id: "wertbestaendigkeit",
    title: "§5 Wertbeständigkeit (VPI-Anpassung)",
    content: "Der Hauptmietzins unterliegt der Wertsicherung gemäß § 16 Abs 6 MRG und wird jährlich an den Verbraucherpreisindex (VPI) angepasst. Ausgangsbasis ist der zum Zeitpunkt des Vertragsabschlusses zuletzt veröffentlichte Indexwert. Eine Anpassung erfolgt, wenn sich der Index um mindestens 5% gegenüber der letzten Anpassung verändert hat. Die Anpassung wird dem Mieter mindestens 14 Tage vor Wirksamkeit schriftlich mitgeteilt.",
    required: false,
  },
  {
    id: "instandhaltung",
    title: "§6 Instandhaltung und Reparaturen",
    content: "Die Erhaltungspflicht des Vermieters richtet sich nach § 3 MRG und umfasst die allgemeinen Teile des Hauses, die Behebung ernster Schäden des Hauses sowie die Beseitigung einer vom Mietgegenstand ausgehenden erheblichen Gesundheitsgefährdung. Der Mieter hat die laufende Wartung und Instandhaltung des Mietgegenstands auf eigene Kosten durchzuführen (§ 8 MRG). Kleinreparaturen bis zu einem Betrag von EUR 150,00 je Einzelfall trägt der Mieter. Schäden sind dem Vermieter unverzüglich schriftlich anzuzeigen.",
    required: false,
  },
  {
    id: "kuendigung",
    title: "§7 Kündigung",
    content: "Die Kündigung des Mietverhältnisses durch den Vermieter ist nur aus den in § 30 Abs 2 MRG genannten wichtigen Gründen zulässig und bedarf der gerichtlichen Aufkündigung. Der Mieter kann das Mietverhältnis unter Einhaltung einer dreimonatigen Kündigungsfrist zum Monatsletzten kündigen. Bei befristeten Mietverhältnissen kann der Mieter nach Ablauf des ersten Vertragsjahres unter Einhaltung einer dreimonatigen Kündigungsfrist zum Monatsletzten kündigen (§ 29 Abs 2 MRG). Die Kündigung hat schriftlich zu erfolgen.",
    required: false,
  },
  {
    id: "untervermietung",
    title: "§8 Untervermietung",
    content: "Die gänzliche oder teilweise Untervermietung oder sonstige Weitergabe des Mietgegenstandes an Dritte bedarf der vorherigen schriftlichen Zustimmung des Vermieters. Eine Untervermietung kann gemäß § 30 Abs 2 Z 4 MRG einen Kündigungsgrund darstellen, wenn der Mieter den Mietgegenstand ganz oder teilweise zu einem unverhältnismäßig hohen Entgelt weitervermietet oder wenn der Mieter den Mietgegenstand nicht regelmäßig zur Befriedigung seines dringenden Wohnbedürfnisses verwendet.",
    required: false,
  },
  {
    id: "haustiere",
    title: "§9 Haustiere",
    content: "Die Haltung von Haustieren ist grundsätzlich gestattet, soweit dadurch keine unzumutbare Belästigung anderer Hausbewohner oder eine Beschädigung des Mietgegenstandes entsteht. Kleintiere (z.B. Fische, Hamster) dürfen ohne gesonderte Zustimmung gehalten werden. Für die Haltung von Hunden und Katzen ist die vorherige schriftliche Zustimmung des Vermieters erforderlich. Der Mieter haftet für alle durch die Tierhaltung verursachten Schäden.",
    required: false,
  },
  {
    id: "hausordnung",
    title: "§10 Hausordnung",
    content: "Der Mieter verpflichtet sich zur Einhaltung der jeweils gültigen Hausordnung. Die Nachtruhe ist von 22:00 Uhr bis 06:00 Uhr einzuhalten. Die gemeinschaftlich genutzten Räume und Flächen sind pfleglich zu behandeln. Wesentliche Änderungen der Hausordnung werden dem Mieter schriftlich mitgeteilt. Die Nichteinhaltung der Hausordnung kann gemäß § 30 Abs 2 Z 3 MRG einen Kündigungsgrund darstellen.",
    required: false,
  },
  {
    id: "rueckgabe",
    title: "§11 Rückgabe des Mietgegenstands",
    content: "Bei Beendigung des Mietverhältnisses ist der Mietgegenstand in ordnungsgemäßem Zustand unter Berücksichtigung der gewöhnlichen Abnutzung zurückzugeben. Ein Übergabeprotokoll wird gemeinsam erstellt. Einbauten und Veränderungen, die der Mieter vorgenommen hat, sind auf Verlangen des Vermieters zu entfernen, sofern nicht eine Vereinbarung über deren Verbleib getroffen wird (§ 10 MRG). Nicht entfernte Fahrnisse gehen entschädigungslos in das Eigentum des Vermieters über.",
    required: false,
  },
  {
    id: "schlussbestimmungen",
    title: "§12 Schlussbestimmungen",
    content: "Dieser Vertrag unterliegt österreichischem Recht, insbesondere dem Mietrechtsgesetz (MRG) und dem ABGB. Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform. Sollten einzelne Bestimmungen dieses Vertrages unwirksam sein oder werden, so wird die Wirksamkeit der übrigen Bestimmungen dadurch nicht berührt. Für Streitigkeiten aus diesem Mietverhältnis ist das sachlich zuständige Gericht am Ort der Liegenschaft zuständig. Dieser Vertrag wird in zweifacher Ausfertigung errichtet, wobei jede Vertragspartei eine Ausfertigung erhält.",
    required: true,
  },
];

const befristetClauses: ClauseSection[] = mrgClauses.map(c => {
  if (c.id === "mietdauer") {
    return {
      ...c,
      content: "Das Mietverhältnis beginnt am {{mietbeginn}} und ist bis zum {{mietende}} befristet (§ 29 Abs 1 Z 3 MRG). Die Mindestdauer beträgt drei Jahre. Das Mietverhältnis endet durch Zeitablauf, ohne dass es einer Kündigung bedarf. Eine vorzeitige Auflösung ist nur aus wichtigem Grund gemäß § 1118 ABGB oder § 30 MRG möglich. Der Mieter kann nach Ablauf des ersten Vertragsjahres unter Einhaltung einer dreimonatigen Kündigungsfrist zum Monatsletzten kündigen (§ 29 Abs 2 MRG).",
    };
  }
  return c;
});

const wegClauses: ClauseSection[] = [
  {
    id: "mietgegenstand",
    title: "§1 Nutzungsgegenstand",
    content: "Die Wohnungseigentümergemeinschaft, vertreten durch {{vermieterName}}, überlässt dem Nutzer/der Nutzerin, {{mieterName}}, das Objekt Top {{topNummer}} im Haus {{adresse}} mit einer Nutzfläche von ca. {{flaeche}} m² zur Nutzung. Das Nutzungsrecht bezieht sich auf die im WEG-Parifizierungsplan ausgewiesene Einheit.",
    required: true,
  },
  {
    id: "mietdauer",
    title: "§2 Nutzungsdauer",
    content: "Das Nutzungsverhältnis beginnt am {{mietbeginn}} und wird {{mietende}} abgeschlossen. Es gelten die Bestimmungen des WEG 2002 und subsidiär das ABGB.",
    required: true,
  },
  {
    id: "mietzins",
    title: "§3 Nutzungsentgelt und Betriebskosten",
    content: "Das monatliche Nutzungsentgelt beträgt EUR {{miete}}. Zusätzlich sind monatlich Betriebskosten in Höhe von EUR {{betriebskosten}} als Akontierung zu entrichten. Die Betriebskosten werden nach den Anteilen gemäß Nutzwertfestlegung abgerechnet. Das Gesamtentgelt ist jeweils am 1. eines jeden Monats im Voraus zu überweisen.",
    required: true,
  },
  {
    id: "kaution",
    title: "§4 Kaution",
    content: "Der Nutzer/die Nutzerin hinterlegt bei Vertragsabschluss eine Kaution in Höhe von EUR {{kaution}}. Die Kaution wird nach ordnungsgemäßer Rückgabe des Nutzungsgegenstandes samt aufgelaufener Zinsen zurückerstattet.",
    required: false,
  },
  {
    id: "instandhaltung",
    title: "§5 Instandhaltung",
    content: "Die Erhaltung der allgemeinen Teile obliegt der Eigentümergemeinschaft gemäß WEG 2002. Der Nutzer hat den Nutzungsgegenstand pfleglich zu behandeln und Schäden unverzüglich der Hausverwaltung zu melden.",
    required: false,
  },
  {
    id: "kuendigung",
    title: "§6 Kündigung",
    content: "Das Nutzungsverhältnis kann von beiden Seiten unter Einhaltung einer dreimonatigen Kündigungsfrist zum Monatsletzten gekündigt werden. Die Kündigung hat schriftlich zu erfolgen.",
    required: false,
  },
  {
    id: "hausordnung",
    title: "§7 Hausordnung",
    content: "Der Nutzer verpflichtet sich zur Einhaltung der von der Eigentümergemeinschaft beschlossenen Hausordnung.",
    required: false,
  },
  {
    id: "schlussbestimmungen",
    title: "§8 Schlussbestimmungen",
    content: "Dieser Vertrag unterliegt österreichischem Recht. Änderungen bedürfen der Schriftform. Gerichtsstand ist der Ort der Liegenschaft. Dieser Vertrag wird in zweifacher Ausfertigung errichtet.",
    required: true,
  },
];

const leaseTemplates = [
  {
    id: "mrg_standard",
    name: "MRG-Standardmietvertrag",
    description: "Vollständiger Mietvertrag nach MRG für unbefristete Mietverhältnisse",
    clauses: mrgClauses,
  },
  {
    id: "mrg_befristet",
    name: "MRG-Befristeter Mietvertrag",
    description: "Befristeter Mietvertrag (mind. 3 Jahre) gemäß § 29 MRG",
    clauses: befristetClauses,
  },
  {
    id: "weg_nutzungsvertrag",
    name: "WEG-Nutzungsvertrag",
    description: "Nutzungsvertrag für WEG-Objekte nach WEG 2002",
    clauses: wegClauses,
  },
];

router.get("/api/lease-templates", isAuthenticated, async (_req, res) => {
  res.json(leaseTemplates);
});

router.post("/api/lease-contracts/generate", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const { templateId, tenantId, unitId, propertyId, leaseStart, leaseEnd, monthlyRent, operatingCosts, deposit, selectedClauses, customNotes } = req.body;

    const template = leaseTemplates.find(t => t.id === templateId);
    if (!template) return res.status(400).json({ error: "Vorlage nicht gefunden" });

    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.status(403).json({ error: "Keine Organisation zugeordnet" });

    const [tenant, unit, property, org] = await Promise.all([
      tenantId ? db.select().from(schema.tenants).where(eq(schema.tenants.id, tenantId)).then(r => r[0]) : null,
      unitId ? db.select().from(schema.units).where(eq(schema.units.id, unitId)).then(r => r[0]) : null,
      propertyId ? db.select().from(schema.properties).where(eq(schema.properties.id, propertyId)).then(r => r[0]) : null,
      db.select().from(schema.organizations).where(eq(schema.organizations.id, profile.organizationId)).then(r => r[0]),
    ]);

    const mieterName = tenant ? `${tenant.firstName} ${tenant.lastName}` : "_______________";
    const vermieterName = org?.name || "_______________";
    const adresse = property ? `${property.address}, ${property.postalCode} ${property.city}` : "_______________";
    const topNummer = unit?.topNummer || "___";
    const flaeche = unit?.flaeche || "___";
    const miete = monthlyRent != null ? Number(monthlyRent).toFixed(2) : "___";
    const betriebskosten = operatingCosts != null ? Number(operatingCosts).toFixed(2) : "___";
    const kautionVal = deposit != null ? Number(deposit).toFixed(2) : "___";

    const formatDate = (d: string | null) => {
      if (!d) return "auf unbestimmte Zeit";
      const date = new Date(d);
      return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
    };

    const mietbeginn = formatDate(leaseStart);
    const mietende = leaseEnd ? formatDate(leaseEnd) : "auf unbestimmte Zeit";

    const replacePlaceholders = (text: string) =>
      text
        .replace(/\{\{mieterName\}\}/g, mieterName)
        .replace(/\{\{vermieterName\}\}/g, vermieterName)
        .replace(/\{\{adresse\}\}/g, adresse)
        .replace(/\{\{topNummer\}\}/g, topNummer)
        .replace(/\{\{flaeche\}\}/g, String(flaeche))
        .replace(/\{\{miete\}\}/g, miete)
        .replace(/\{\{betriebskosten\}\}/g, betriebskosten)
        .replace(/\{\{kaution\}\}/g, kautionVal)
        .replace(/\{\{mietbeginn\}\}/g, mietbeginn)
        .replace(/\{\{mietende\}\}/g, mietende);

    const activeClauses = template.clauses.filter(
      c => c.required || (selectedClauses && selectedClauses.includes(c.id))
    );

    const filledClauses = activeClauses.map(c => ({
      id: c.id,
      title: c.title,
      content: replacePlaceholders(c.content),
      required: c.required,
    }));

    const contract = {
      templateId,
      templateName: template.name,
      mieterName,
      vermieterName,
      adresse,
      topNummer,
      flaeche,
      miete,
      betriebskosten,
      kaution: kautionVal,
      mietbeginn,
      mietende,
      clauses: filledClauses,
      customNotes: customNotes || "",
      generatedAt: new Date().toISOString(),
    };

    res.json(contract);
  } catch (error) {
    console.error("Lease contract generate error:", error);
    res.status(500).json({ error: "Fehler bei der Vertragserstellung" });
  }
});

router.post("/api/lease-contracts/generate-pdf", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const { templateId, tenantId, unitId, propertyId, leaseStart, leaseEnd, monthlyRent, operatingCosts, deposit, selectedClauses, customNotes } = req.body;

    const template = leaseTemplates.find(t => t.id === templateId);
    if (!template) return res.status(400).json({ error: "Vorlage nicht gefunden" });

    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.status(403).json({ error: "Keine Organisation zugeordnet" });

    const [tenant, unit, property, org] = await Promise.all([
      tenantId ? db.select().from(schema.tenants).where(eq(schema.tenants.id, tenantId)).then(r => r[0]) : null,
      unitId ? db.select().from(schema.units).where(eq(schema.units.id, unitId)).then(r => r[0]) : null,
      propertyId ? db.select().from(schema.properties).where(eq(schema.properties.id, propertyId)).then(r => r[0]) : null,
      db.select().from(schema.organizations).where(eq(schema.organizations.id, profile.organizationId)).then(r => r[0]),
    ]);

    const mieterName = tenant ? `${tenant.firstName} ${tenant.lastName}` : "_______________";
    const vermieterName = org?.name || "_______________";
    const adresse = property ? `${property.address}, ${property.postalCode} ${property.city}` : "_______________";
    const topNummer = unit?.topNummer || "___";
    const flaeche = unit?.flaeche || "___";
    const miete = monthlyRent != null ? Number(monthlyRent).toFixed(2) : "___";
    const betriebskosten = operatingCosts != null ? Number(operatingCosts).toFixed(2) : "___";
    const kautionVal = deposit != null ? Number(deposit).toFixed(2) : "___";

    const formatDate = (d: string | null) => {
      if (!d) return "auf unbestimmte Zeit";
      const date = new Date(d);
      return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
    };

    const mietbeginn = formatDate(leaseStart);
    const mietende = leaseEnd ? formatDate(leaseEnd) : "auf unbestimmte Zeit";

    const replacePlaceholders = (text: string) =>
      text
        .replace(/\{\{mieterName\}\}/g, mieterName)
        .replace(/\{\{vermieterName\}\}/g, vermieterName)
        .replace(/\{\{adresse\}\}/g, adresse)
        .replace(/\{\{topNummer\}\}/g, topNummer)
        .replace(/\{\{flaeche\}\}/g, String(flaeche))
        .replace(/\{\{miete\}\}/g, miete)
        .replace(/\{\{betriebskosten\}\}/g, betriebskosten)
        .replace(/\{\{kaution\}\}/g, kautionVal)
        .replace(/\{\{mietbeginn\}\}/g, mietbeginn)
        .replace(/\{\{mietende\}\}/g, mietende);

    const activeClauses = template.clauses.filter(
      c => c.required || (selectedClauses && selectedClauses.includes(c.id))
    );

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pageWidth = 210;
    const marginLeft = 25;
    const marginRight = 25;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let y = 20;
    let pageNum = 1;

    const addFooter = () => {
      const today = new Date();
      const dateStr = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Erstellt am ${dateStr}`, marginLeft, 285);
      doc.text(`Seite ${pageNum}`, pageWidth - marginRight, 285, { align: "right" });
    };

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > 270) {
        addFooter();
        doc.addPage();
        pageNum++;
        y = 20;
      }
    };

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(vermieterName, marginLeft, y);
    y += 5;
    if (org?.address) { doc.text(org.address, marginLeft, y); y += 5; }
    if (org?.email) { doc.text(org.email, marginLeft, y); y += 5; }
    y += 5;

    doc.setLineWidth(0.5);
    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 10;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const title = templateId === "weg_nutzungsvertrag" ? "NUTZUNGSVERTRAG" : "MIETVERTRAG";
    doc.text(title, pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`(${template.name})`, pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.setLineWidth(0.3);
    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Zwischen", marginLeft, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text(`Vermieter/in: ${vermieterName}`, marginLeft + 5, y);
    y += 6;
    doc.text("und", marginLeft, y);
    y += 6;
    doc.text(`Mieter/in: ${mieterName}`, marginLeft + 5, y);
    y += 6;
    doc.text(`wird folgender ${title.toLowerCase()} geschlossen:`, marginLeft, y);
    y += 12;

    for (const clause of activeClauses) {
      const filledContent = replacePlaceholders(clause.content);

      checkPageBreak(20);

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(clause.title, marginLeft, y);
      y += 7;

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(filledContent, contentWidth);
      for (const line of lines) {
        checkPageBreak(5);
        doc.text(line, marginLeft, y);
        y += 4.5;
      }
      y += 6;
    }

    if (customNotes) {
      checkPageBreak(20);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Besondere Vereinbarungen", marginLeft, y);
      y += 7;
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      const noteLines = doc.splitTextToSize(customNotes, contentWidth);
      for (const line of noteLines) {
        checkPageBreak(5);
        doc.text(line, marginLeft, y);
        y += 4.5;
      }
      y += 6;
    }

    checkPageBreak(50);
    y += 10;
    doc.setLineWidth(0.3);
    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const sigDate = `Wien, am ____________________`;
    doc.text(sigDate, marginLeft, y);
    y += 20;

    doc.line(marginLeft, y, marginLeft + 60, y);
    doc.line(pageWidth - marginRight - 60, y, pageWidth - marginRight, y);
    y += 5;
    doc.setFontSize(9);
    doc.text("Vermieter/in", marginLeft, y);
    doc.text("Mieter/in", pageWidth - marginRight - 60, y);

    addFooter();

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    if (propertyId) {
      try {
        const docName = `Mietvertrag_${topNummer}_${mietbeginn.replace(/\./g, "-")}`;
        await db.insert(schema.propertyDocuments).values({
          propertyId,
          organizationId: profile.organizationId,
          name: docName,
          category: 'vertrag',
          mimeType: 'application/pdf',
          fileSize: pdfBuffer.length,
          notes: `Mietvertrag für ${mieterName}, Top ${topNummer}, ab ${mietbeginn}`,
        });
      } catch (archiveErr) {
        console.error("Lease contract archive error:", archiveErr);
      }
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Mietvertrag_${topNummer}_${mietbeginn.replace(/\./g, "-")}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Lease contract PDF error:", error);
    res.status(500).json({ error: "Fehler bei der PDF-Erstellung" });
  }
});

router.get("/api/lease-contracts", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.json([]);

    const contracts = await db
      .select({
        id: schema.propertyDocuments.id,
        propertyId: schema.propertyDocuments.propertyId,
        name: schema.propertyDocuments.name,
        category: schema.propertyDocuments.category,
        fileUrl: schema.propertyDocuments.fileUrl,
        fileSize: schema.propertyDocuments.fileSize,
        mimeType: schema.propertyDocuments.mimeType,
        notes: schema.propertyDocuments.notes,
        createdAt: schema.propertyDocuments.createdAt,
        propertyAddress: schema.properties.address,
        propertyCity: schema.properties.city,
      })
      .from(schema.propertyDocuments)
      .innerJoin(schema.properties, eq(schema.propertyDocuments.propertyId, schema.properties.id))
      .where(and(
        eq(schema.propertyDocuments.organizationId, profile.organizationId),
        eq(schema.propertyDocuments.category, 'vertrag')
      ))
      .orderBy(desc(schema.propertyDocuments.createdAt));

    res.json(contracts);
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Abrufen der Verträge" });
  }
});

export default router;
