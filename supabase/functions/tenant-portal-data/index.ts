import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate user via anon client
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Use service role for data queries — bypasses RLS
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Find tenant_portal_access for this user
    const { data: access, error: accessError } = await adminClient
      .from("tenant_portal_access")
      .select("tenant_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (accessError) {
      console.error("Access lookup error:", accessError);
      return new Response(
        JSON.stringify({ error: "Fehler beim Zugriff" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!access) {
      return new Response(
        JSON.stringify({ error: "Kein Mieter-Zugang gefunden", isTenant: false }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tenantId = access.tenant_id;

    // 2. Fetch tenant, unit, property, invoices, payments in parallel
    const [tenantRes, invoicesRes, paymentsRes] = await Promise.all([
      adminClient
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single(),
      adminClient
        .from("monthly_invoices")
        .select("id, month, year, gesamtbetrag, status, faellig_am")
        .eq("tenant_id", tenantId)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(24),
      adminClient
        .from("payments")
        .select("id, betrag, eingangs_datum, zahlungsart")
        .eq("tenant_id", tenantId)
        .order("eingangs_datum", { ascending: false })
        .limit(24),
    ]);

    if (tenantRes.error || !tenantRes.data) {
      return new Response(
        JSON.stringify({ error: "Mieterdaten nicht gefunden" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tenant = tenantRes.data;

    // Fetch unit and property sequentially (depend on tenant data)
    let unit = null;
    let property = null;

    if (tenant.unit_id) {
      const { data: unitData } = await adminClient
        .from("units")
        .select("id, top_nummer, property_id, flaeche, status")
        .eq("id", tenant.unit_id)
        .single();
      unit = unitData;

      if (unit?.property_id) {
        const { data: propData } = await adminClient
          .from("properties")
          .select("id, name, address, city, postal_code")
          .eq("id", unit.property_id)
          .single();
        property = propData;
      }
    }

    // Calculate balance from unpaid invoices
    const invoices = invoicesRes.data || [];
    const balance = invoices
      .filter((i: any) => i.status !== "bezahlt")
      .reduce((sum: number, i: any) => sum + (i.gesamtbetrag || 0), 0);

    // Update last_login_at
    await adminClient
      .from("tenant_portal_access")
      .update({ last_login_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_active", true);

    return new Response(
      JSON.stringify({
        isTenant: true,
        tenant: {
          id: tenant.id,
          first_name: tenant.first_name,
          last_name: tenant.last_name,
          grundmiete: tenant.grundmiete,
          email: tenant.email,
        },
        unit,
        property,
        invoices,
        payments: paymentsRes.data || [],
        balance,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Interner Serverfehler" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
