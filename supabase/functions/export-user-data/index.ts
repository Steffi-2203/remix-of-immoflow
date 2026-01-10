import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get profile data
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Get organization data
    let organization = null;
    if (profile?.organization_id) {
      const { data: org } = await supabaseClient
        .from('organizations')
        .select('id, name, created_at')
        .eq('id', profile.organization_id)
        .single();
      organization = org;
    }

    // Get properties (without sensitive org fields)
    const { data: properties } = await supabaseClient
      .from('properties')
      .select('id, name, address, city, postal_code, country, created_at');

    // Get units
    const { data: units } = await supabaseClient
      .from('units')
      .select('id, top_nummer, type, qm, mea, property_id, created_at');

    // Get tenants (with masked IBAN/BIC for privacy)
    const { data: tenants } = await supabaseClient
      .from('tenants')
      .select('id, first_name, last_name, email, phone, mietbeginn, mietende, status, created_at');

    // Get payments (summary only)
    const { data: payments } = await supabaseClient
      .from('payments')
      .select('id, betrag, eingangs_datum, zahlungsart, created_at');

    // Get expenses (summary only)
    const { data: expenses } = await supabaseClient
      .from('expenses')
      .select('id, bezeichnung, betrag, datum, category, created_at');

    // Get invoices
    const { data: invoices } = await supabaseClient
      .from('monthly_invoices')
      .select('id, month, year, gesamtbetrag, status, created_at');

    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
      profile: profile ? {
        fullName: profile.full_name,
        email: profile.email,
        createdAt: profile.created_at,
      } : null,
      organization: organization,
      statistics: {
        propertiesCount: properties?.length || 0,
        unitsCount: units?.length || 0,
        tenantsCount: tenants?.length || 0,
        paymentsCount: payments?.length || 0,
        expensesCount: expenses?.length || 0,
        invoicesCount: invoices?.length || 0,
      },
      data: {
        properties: properties || [],
        units: units || [],
        tenants: tenants || [],
        payments: payments || [],
        expenses: expenses || [],
        invoices: invoices || [],
      },
    };

    // Log the export for audit purposes
    console.log(`Data export requested by user ${user.id} at ${new Date().toISOString()}`);

    return new Response(JSON.stringify(exportData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
