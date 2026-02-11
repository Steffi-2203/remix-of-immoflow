import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** SHA-256 hex hash of a string */
async function sha256Hex(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** SHA-256 hex of a Uint8Array */
async function sha256HexBytes(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Canonical JSON for deterministic hashing */
function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value))
    return "[" + value.map(canonicalize).join(",") + "]";
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const parts = keys.map(
    (k) =>
      JSON.stringify(k) +
      ":" +
      canonicalize((value as Record<string, unknown>)[k])
  );
  return "{" + parts.join(",") + "}";
}

/** HMAC-SHA256 signature using SUPABASE_SERVICE_ROLE_KEY as secret */
async function hmacSign(data: string): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Routes: POST /gdpr-export (create), GET /gdpr-export/{id}/status,
    //         GET /gdpr-export/{id}/download, POST /gdpr-export/{id}/verify

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // User client (for RLS-scoped queries)
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Service client (for admin operations like updating status, storage)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Route: POST /gdpr-export → create export request
    if (req.method === "POST" && pathParts.length <= 1) {
      return await handleCreateExport(req, user, userClient, serviceClient);
    }

    // Route: GET /gdpr-export/{id}/status
    const exportId = pathParts[1];
    const action = pathParts[2];

    if (!exportId) {
      return jsonResponse({ error: "Missing exportId" }, 400);
    }

    if (req.method === "GET" && action === "status") {
      return await handleGetStatus(exportId, user, userClient);
    }

    if (req.method === "GET" && action === "download") {
      return await handleDownload(exportId, user, userClient, serviceClient);
    }

    if (req.method === "POST" && action === "verify") {
      return await handleVerify(req, exportId, user, userClient);
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (error) {
    console.error("GDPR export error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

// ─── Handlers ───────────────────────────────────────────

async function handleCreateExport(
  req: Request,
  user: { id: string; email?: string },
  userClient: ReturnType<typeof createClient>,
  serviceClient: ReturnType<typeof createClient>
) {
  const body = await req.json().catch(() => ({}));
  const scope = body.scope || "full";
  const deliveryMethod = body.deliveryMethod || "download";

  // Rate limit: max 3 pending/preparing exports per user
  const { data: existing } = await userClient
    .from("gdpr_export_requests")
    .select("id")
    .in("status", ["pending", "preparing"])
    .eq("user_id", user.id);

  if (existing && existing.length >= 3) {
    return jsonResponse(
      {
        error: "Too many pending export requests. Please wait for existing exports to complete.",
      },
      429
    );
  }

  // Get user's org
  const { data: profile } = await userClient
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  // Create the export request
  const { data: exportReq, error } = await userClient
    .from("gdpr_export_requests")
    .insert({
      user_id: user.id,
      organization_id: profile?.organization_id,
      scope,
      delivery_method: deliveryMethod,
      legal_basis: body.legalBasis || "Art. 15 DSGVO",
    })
    .select()
    .single();

  if (error) {
    console.error("Insert error:", error);
    return jsonResponse({ error: "Failed to create export request" }, 500);
  }

  // Log audit event
  await serviceClient.from("audit_logs").insert({
    user_id: user.id,
    action: "gdpr_export_requested",
    table_name: "gdpr_export_requests",
    record_id: exportReq.id,
    new_data: { scope, deliveryMethod },
  });

  // Start async export preparation
  EdgeRuntime.waitUntil(
    prepareExport(exportReq.id, user, serviceClient, scope)
  );

  return jsonResponse(
    {
      exportId: exportReq.id,
      status: "pending",
      message: "Export request accepted. Check status for updates.",
    },
    202
  );
}

async function handleGetStatus(
  exportId: string,
  user: { id: string },
  userClient: ReturnType<typeof createClient>
) {
  const { data, error } = await userClient
    .from("gdpr_export_requests")
    .select(
      "id, status, scope, format_version, manifest_hash, file_size_bytes, requested_at, prepared_at, delivered_at, retention_until, error_message"
    )
    .eq("id", exportId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return jsonResponse({ error: "Export not found" }, 404);
  }

  return jsonResponse(data);
}

async function handleDownload(
  exportId: string,
  user: { id: string },
  userClient: ReturnType<typeof createClient>,
  serviceClient: ReturnType<typeof createClient>
) {
  const { data: exportReq, error } = await userClient
    .from("gdpr_export_requests")
    .select("*")
    .eq("id", exportId)
    .eq("user_id", user.id)
    .single();

  if (error || !exportReq) {
    return jsonResponse({ error: "Export not found" }, 404);
  }

  if (exportReq.status !== "ready") {
    return jsonResponse(
      { error: `Export not ready. Current status: ${exportReq.status}` },
      400
    );
  }

  if (!exportReq.file_path) {
    return jsonResponse({ error: "Export file not available" }, 404);
  }

  // Generate short-lived signed URL (24 hours)
  const { data: signedUrl, error: signError } = await serviceClient.storage
    .from("gdpr-exports")
    .createSignedUrl(exportReq.file_path, 86400);

  if (signError || !signedUrl) {
    console.error("Signed URL error:", signError);
    return jsonResponse({ error: "Failed to generate download link" }, 500);
  }

  // Mark as delivered
  await serviceClient
    .from("gdpr_export_requests")
    .update({
      status: "delivered",
      delivered_at: new Date().toISOString(),
      downloaded_at: new Date().toISOString(),
      download_url_expires_at: new Date(
        Date.now() + 86400 * 1000
      ).toISOString(),
    })
    .eq("id", exportId);

  // Audit
  await serviceClient.from("audit_logs").insert({
    user_id: user.id,
    action: "gdpr_export_downloaded",
    table_name: "gdpr_export_requests",
    record_id: exportId,
  });

  return jsonResponse({
    downloadUrl: signedUrl.signedUrl,
    expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
    manifestHash: exportReq.manifest_hash,
    manifestSignature: exportReq.manifest_signature,
  });
}

async function handleVerify(
  req: Request,
  exportId: string,
  user: { id: string },
  userClient: ReturnType<typeof createClient>
) {
  const body = await req.json().catch(() => ({}));
  const { manifestHash } = body;

  const { data: exportReq, error } = await userClient
    .from("gdpr_export_requests")
    .select("manifest_hash, manifest_signature, manifest, status")
    .eq("id", exportId)
    .eq("user_id", user.id)
    .single();

  if (error || !exportReq) {
    return jsonResponse({ error: "Export not found" }, 404);
  }

  const hashValid = manifestHash
    ? manifestHash === exportReq.manifest_hash
    : null;

  // Verify signature
  const canonicalManifest = canonicalize(exportReq.manifest);
  const expectedHash = await sha256Hex(canonicalManifest);
  const hashChainValid = expectedHash === exportReq.manifest_hash;

  return jsonResponse({
    exportId,
    status: exportReq.status,
    hashValid,
    hashChainIntact: hashChainValid,
    manifestHash: exportReq.manifest_hash,
    signaturePresent: !!exportReq.manifest_signature,
  });
}

// ─── Export Preparation (async) ─────────────────────────

async function prepareExport(
  exportId: string,
  user: { id: string; email?: string },
  serviceClient: ReturnType<typeof createClient>,
  scope: string
) {
  try {
    // Update status to preparing
    await serviceClient
      .from("gdpr_export_requests")
      .update({ status: "preparing" })
      .eq("id", exportId);

    // Collect all data
    const exportData = await collectUserData(user.id, serviceClient, scope);

    // Build manifest
    const files: Array<{ path: string; hash: string; sizeBytes: number }> = [];

    const dataFiles: Record<string, unknown> = {};

    // Profile
    if (exportData.profile) {
      const json = JSON.stringify(exportData.profile, null, 2);
      const hash = await sha256Hex(json);
      files.push({
        path: "data/profile.json",
        hash: `sha256:${hash}`,
        sizeBytes: json.length,
      });
      dataFiles["data/profile.json"] = exportData.profile;
    }

    // Tenants/Contracts
    if (exportData.tenants?.length) {
      const json = JSON.stringify(exportData.tenants, null, 2);
      const hash = await sha256Hex(json);
      files.push({
        path: "data/contracts.json",
        hash: `sha256:${hash}`,
        sizeBytes: json.length,
      });
      dataFiles["data/contracts.json"] = exportData.tenants;
    }

    // Invoices
    if (exportData.invoices?.length) {
      const json = JSON.stringify(exportData.invoices, null, 2);
      const hash = await sha256Hex(json);
      files.push({
        path: "data/invoices.json",
        hash: `sha256:${hash}`,
        sizeBytes: json.length,
      });
      dataFiles["data/invoices.json"] = exportData.invoices;
    }

    // Payments
    if (exportData.payments?.length) {
      const json = JSON.stringify(exportData.payments, null, 2);
      const hash = await sha256Hex(json);
      files.push({
        path: "data/payments.json",
        hash: `sha256:${hash}`,
        sizeBytes: json.length,
      });
      dataFiles["data/payments.json"] = exportData.payments;
    }

    // Audit events
    if (exportData.auditEvents?.length) {
      const json = JSON.stringify(exportData.auditEvents, null, 2);
      const hash = await sha256Hex(json);
      files.push({
        path: "data/audit_events.json",
        hash: `sha256:${hash}`,
        sizeBytes: json.length,
      });
      dataFiles["data/audit_events.json"] = exportData.auditEvents;
    }

    // Expenses
    if (exportData.expenses?.length) {
      const json = JSON.stringify(exportData.expenses, null, 2);
      const hash = await sha256Hex(json);
      files.push({
        path: "data/expenses.json",
        hash: `sha256:${hash}`,
        sizeBytes: json.length,
      });
      dataFiles["data/expenses.json"] = exportData.expenses;
    }

    // Properties & Units
    if (exportData.properties?.length) {
      const json = JSON.stringify(exportData.properties, null, 2);
      const hash = await sha256Hex(json);
      files.push({
        path: "data/properties.json",
        hash: `sha256:${hash}`,
        sizeBytes: json.length,
      });
      dataFiles["data/properties.json"] = exportData.properties;
    }

    // Build manifest
    const manifest = {
      userId: user.id,
      exportedAt: new Date().toISOString(),
      formatVersion: "1.0",
      scope,
      legalBasis: "Art. 15 DSGVO",
      retentionUntil: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      files,
      statistics: {
        totalFiles: files.length,
        totalSizeBytes: files.reduce((sum, f) => sum + f.sizeBytes, 0),
      },
    };

    const canonicalManifest = canonicalize(manifest);
    const manifestHash = await sha256Hex(canonicalManifest);
    const manifestSignature = await hmacSign(canonicalManifest);

    // Build combined JSON export (since we can't create ZIP in edge functions easily)
    const exportPackage = {
      manifest,
      signature: {
        algorithm: "HMAC-SHA256",
        manifestHash: `sha256:${manifestHash}`,
        signature: manifestSignature,
        signedAt: new Date().toISOString(),
      },
      data: dataFiles,
    };

    const exportJson = JSON.stringify(exportPackage, null, 2);
    const exportBytes = new TextEncoder().encode(exportJson);

    // Upload to storage
    const filePath = `${user.id}/export-${exportId}.json`;
    const { error: uploadError } = await serviceClient.storage
      .from("gdpr-exports")
      .upload(filePath, exportBytes, {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Update export request with manifest and status
    await serviceClient
      .from("gdpr_export_requests")
      .update({
        status: "ready",
        manifest,
        manifest_hash: `sha256:${manifestHash}`,
        manifest_signature: manifestSignature,
        file_path: filePath,
        file_size_bytes: exportBytes.length,
        prepared_at: new Date().toISOString(),
      })
      .eq("id", exportId);

    // Audit
    await serviceClient.from("audit_logs").insert({
      user_id: user.id,
      action: "gdpr_export_prepared",
      table_name: "gdpr_export_requests",
      record_id: exportId,
      new_data: { manifestHash, fileCount: files.length },
    });

    console.log(
      `GDPR export ${exportId} prepared for user ${user.id} (${files.length} files, ${exportBytes.length} bytes)`
    );
  } catch (error) {
    console.error(`GDPR export ${exportId} failed:`, error);
    await serviceClient
      .from("gdpr_export_requests")
      .update({
        status: "failed",
        error_message:
          error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", exportId);
  }
}

async function collectUserData(
  userId: string,
  client: ReturnType<typeof createClient>,
  scope: string
) {
  // Get profile and org
  const { data: profile } = await client
    .from("profiles")
    .select("id, email, full_name, organization_id, created_at")
    .eq("id", userId)
    .single();

  const orgId = profile?.organization_id;

  // Get tenants (contracts)
  const { data: tenants } = orgId
    ? await client
        .from("tenants")
        .select(
          "id, first_name, last_name, email, phone, mietbeginn, mietende, status, unit_id, created_at"
        )
        .limit(1000)
    : { data: [] };

  // Get invoices
  const { data: invoices } = orgId
    ? await client
        .from("monthly_invoices")
        .select(
          "id, month, year, gesamtbetrag, grundmiete, betriebskosten, heizungskosten, ust, status, faellig_am, created_at"
        )
        .limit(1000)
    : { data: [] };

  // Get payments
  const { data: payments } = orgId
    ? await client
        .from("payments")
        .select(
          "id, betrag, eingangs_datum, zahlungsart, tenant_id, created_at"
        )
        .limit(1000)
    : { data: [] };

  // Get audit events for this user
  const { data: auditEvents } = await client
    .from("audit_logs")
    .select(
      "id, action, table_name, record_id, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1000);

  // Get expenses
  const { data: expenses } = orgId
    ? await client
        .from("expenses")
        .select(
          "id, bezeichnung, betrag, datum, category, expense_type, created_at"
        )
        .limit(1000)
    : { data: [] };

  // Get properties and units
  const { data: properties } = orgId
    ? await client
        .from("properties")
        .select(
          "id, name, address, city, postal_code, country, created_at, units(id, top_nummer, type, qm, status)"
        )
        .limit(1000)
    : { data: [] };

  return {
    profile: profile
      ? {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          organizationId: profile.organization_id,
          createdAt: profile.created_at,
        }
      : null,
    tenants: tenants || [],
    invoices: invoices || [],
    payments: payments || [],
    auditEvents: auditEvents || [],
    expenses: expenses || [],
    properties: properties || [],
  };
}

// ─── Helpers ────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
