import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Tenant {
  id: string;
  unit_id: string;
  grundmiete: number;
  betriebskosten_vorschuss: number;
  heizungskosten_vorschuss: number;
  status: string;
}

interface Unit {
  id: string;
  type: string;
  property_id: string;
}

// USt-Sätze basierend auf Einheitstyp (Österreich):
// Wohnung: Miete 10%, BK 10%, Heizung 20%
// Geschäft/Garage/Stellplatz/Lager: Miete 20%, BK 20%, Heizung 20%
const getVatRates = (unitType: string) => {
  const isCommercial = ['geschaeft', 'garage', 'stellplatz', 'lager'].includes(unitType);
  return {
    ust_satz_miete: isCommercial ? 20 : 10,
    ust_satz_bk: isCommercial ? 20 : 10,
    ust_satz_heizung: 20, // Heizung immer 20%
  };
};

// Berechnet USt aus Bruttobetrag
const calculateVatFromGross = (grossAmount: number, vatRate: number): number => {
  if (vatRate === 0) return 0;
  return grossAmount - (grossAmount / (1 + vatRate / 100));
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    // Check if this is a Service Role call (from cron job)
    const isServiceRoleCall = token === supabaseServiceKey;
    
    if (isServiceRoleCall) {
      console.log("[CRON] Service Role authentication - cron job execution");
    } else {
      // Verify user authentication for manual calls
      if (!authHeader) {
        console.error("[CRON] Missing authorization header");
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized - Missing authorization header' }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Create client with user's token to verify their identity
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) {
        console.error("[CRON] Invalid token:", authError?.message);
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized - Invalid token' }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check if user has admin role
      const { data: roles, error: roleError } = await userClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (roleError) {
        console.error("[CRON] Error checking roles:", roleError.message);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to verify permissions' }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const isAdmin = roles?.some(r => r.role === 'admin');
      if (!isAdmin) {
        console.error("[CRON] User is not admin:", user.id);
        return new Response(
          JSON.stringify({ success: false, error: 'Forbidden - Admin access required' }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log(`[CRON] Authorized admin user: ${user.id}`);
    }

    // Use service role for actual data operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use current date for automatic generation (1st of month)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    console.log(`[CRON] Automatic invoice generation for ${month}/${year}`);

    // Fetch ALL units (system-wide, for all properties)
    const { data: units, error: unitsError } = await supabase
      .from("units")
      .select("id, type, property_id");

    if (unitsError) {
      throw new Error(`Failed to fetch units: ${unitsError.message}`);
    }

    if (!units || units.length === 0) {
      console.log("[CRON] No units found in system");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No units found",
          created: 0 
        }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    console.log(`[CRON] Found ${units.length} units across all properties`);

    const unitIds = units.map(u => u.id);

    // Create a map of unit_id to unit type
    const unitTypeMap = new Map<string, string>();
    units.forEach((unit: Unit) => {
      unitTypeMap.set(unit.id, unit.type);
    });

    // Fetch all active tenants for all units
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, unit_id, grundmiete, betriebskosten_vorschuss, heizungskosten_vorschuss, status")
      .in("unit_id", unitIds)
      .eq("status", "aktiv");

    if (tenantsError) {
      throw new Error(`Failed to fetch tenants: ${tenantsError.message}`);
    }

    if (!tenants || tenants.length === 0) {
      console.log("[CRON] No active tenants found");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No active tenants found",
          created: 0 
        }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    console.log(`[CRON] Found ${tenants.length} active tenants`);

    // Check for existing invoices for this month
    const { data: existingInvoices, error: existingError } = await supabase
      .from("monthly_invoices")
      .select("tenant_id")
      .eq("year", year)
      .eq("month", month);

    if (existingError) {
      throw new Error(`Failed to check existing invoices: ${existingError.message}`);
    }

    const existingTenantIds = new Set(existingInvoices?.map(inv => inv.tenant_id) || []);

    // Filter out tenants who already have invoices
    const tenantsToInvoice = tenants.filter(t => !existingTenantIds.has(t.id));

    if (tenantsToInvoice.length === 0) {
      console.log(`[CRON] All ${tenants.length} tenants already have invoices for ${month}/${year}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `All ${tenants.length} tenants already have invoices for ${month}/${year}`,
          created: 0,
          skipped: tenants.length
        }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Calculate due date (5th of the invoice month)
    const dueDate = new Date(year, month - 1, 5);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Create invoices for all active tenants
    const invoices = tenantsToInvoice.map((tenant: Tenant) => {
      const unitType = unitTypeMap.get(tenant.unit_id) || 'wohnung';
      const vatRates = getVatRates(unitType);
      
      const grundmiete = Number(tenant.grundmiete) || 0;
      const betriebskosten = Number(tenant.betriebskosten_vorschuss) || 0;
      const heizungskosten = Number(tenant.heizungskosten_vorschuss) || 0;
      
      // Beträge sind Bruttobeträge, USt wird herausgerechnet
      const ustMiete = calculateVatFromGross(grundmiete, vatRates.ust_satz_miete);
      const ustBk = calculateVatFromGross(betriebskosten, vatRates.ust_satz_bk);
      const ustHeizung = calculateVatFromGross(heizungskosten, vatRates.ust_satz_heizung);
      const ust = ustMiete + ustBk + ustHeizung;
      
      const gesamtbetrag = grundmiete + betriebskosten + heizungskosten;

      console.log(`[CRON] Creating invoice for tenant ${tenant.id}: unit type=${unitType}, total=${gesamtbetrag.toFixed(2)}€, ust=${ust.toFixed(2)}€`);

      return {
        tenant_id: tenant.id,
        unit_id: tenant.unit_id,
        year,
        month,
        grundmiete,
        betriebskosten,
        heizungskosten,
        gesamtbetrag,
        ust: Math.round(ust * 100) / 100,
        ust_satz_miete: vatRates.ust_satz_miete,
        ust_satz_bk: vatRates.ust_satz_bk,
        ust_satz_heizung: vatRates.ust_satz_heizung,
        status: "offen",
        faellig_am: dueDateStr,
      };
    });

    // Insert all invoices
    const { data: createdInvoices, error: insertError } = await supabase
      .from("monthly_invoices")
      .insert(invoices)
      .select();

    if (insertError) {
      throw new Error(`Failed to create invoices: ${insertError.message}`);
    }

    console.log(`[CRON] Successfully created ${createdInvoices?.length || 0} invoices for ${month}/${year}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully created ${createdInvoices?.length || 0} invoices for ${month}/${year}`,
        created: createdInvoices?.length || 0,
        skipped: existingTenantIds.size
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error: unknown) {
    // Log detailed error internally, return generic message to client
    console.error("[CRON] Error generating invoices:", error instanceof Error ? error.message : "Unknown error");
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Ein Fehler ist aufgetreten. Bitte kontaktieren Sie den Support." 
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});
