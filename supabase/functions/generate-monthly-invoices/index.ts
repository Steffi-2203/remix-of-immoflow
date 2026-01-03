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

interface GenerateInvoicesRequest {
  year?: number;
  month?: number;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get year and month from request body or use current date
    let year: number;
    let month: number;
    
    try {
      const body: GenerateInvoicesRequest = await req.json();
      const now = new Date();
      year = body.year || now.getFullYear();
      month = body.month || now.getMonth() + 1;
    } catch {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1;
    }

    console.log(`Generating invoices for ${month}/${year}`);

    // Fetch all active tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, unit_id, grundmiete, betriebskosten_vorschuss, heizungskosten_vorschuss, status")
      .eq("status", "aktiv");

    if (tenantsError) {
      throw new Error(`Failed to fetch tenants: ${tenantsError.message}`);
    }

    if (!tenants || tenants.length === 0) {
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

    console.log(`Found ${tenants.length} active tenants`);

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
      const grundmiete = Number(tenant.grundmiete) || 0;
      const betriebskosten = Number(tenant.betriebskosten_vorschuss) || 0;
      const heizungskosten = Number(tenant.heizungskosten_vorschuss) || 0;
      const gesamtbetrag = grundmiete + betriebskosten + heizungskosten;
      
      // Calculate USt (10% for residential rent in Austria)
      const ust = gesamtbetrag * 0.10;

      return {
        tenant_id: tenant.id,
        unit_id: tenant.unit_id,
        year,
        month,
        grundmiete,
        betriebskosten,
        heizungskosten,
        gesamtbetrag: gesamtbetrag + ust,
        ust,
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

    console.log(`Created ${createdInvoices?.length || 0} invoices`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully created ${createdInvoices?.length || 0} invoices for ${month}/${year}`,
        created: createdInvoices?.length || 0,
        skipped: existingTenantIds.size,
        invoices: createdInvoices
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error generating invoices:", errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});
