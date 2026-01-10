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

    // Create client with user's auth
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

    // Create admin client for deletion
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Log the deletion request for audit
    console.log(`Account deletion requested by user ${user.id} at ${new Date().toISOString()}`);

    // Get user's profile to find organization
    const { data: profile } = await adminClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    const organizationId = profile?.organization_id;

    // Delete in order respecting foreign keys
    // Note: Many tables have CASCADE on delete, but we do it explicitly for audit

    // 1. Delete payments
    await adminClient.from('payments').delete().eq('tenant_id', user.id);

    // 2. Delete tenant fees
    // (linked through tenants which we'll handle via organization)

    // 3. Delete data linked to organization
    if (organizationId) {
      // Delete transactions
      await adminClient.from('transactions').delete().eq('organization_id', organizationId);
      
      // Delete bank accounts
      await adminClient.from('bank_accounts').delete().eq('organization_id', organizationId);
      
      // Delete SEPA collections
      await adminClient.from('sepa_collections').delete().eq('organization_id', organizationId);
      
      // Delete learned matches
      await adminClient.from('learned_matches').delete().eq('organization_id', organizationId);
      
      // Delete distribution keys (non-system)
      await adminClient.from('distribution_keys').delete()
        .eq('organization_id', organizationId)
        .eq('is_system', false);
      
      // Delete account categories (non-system)
      await adminClient.from('account_categories').delete()
        .eq('organization_id', organizationId)
        .eq('is_system', false);
    }

    // 4. Delete profile (this may cascade to other data)
    await adminClient.from('profiles').delete().eq('id', user.id);

    // 5. Delete user roles
    await adminClient.from('user_roles').delete().eq('user_id', user.id);

    // 6. Delete property managers
    await adminClient.from('property_managers').delete().eq('user_id', user.id);

    // 7. Delete the organization if user was the only member
    if (organizationId) {
      const { count } = await adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);
      
      if (count === 0) {
        // No other users in org, safe to delete
        await adminClient.from('organizations').delete().eq('id', organizationId);
      }
    }

    // 8. Finally, delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      throw deleteError;
    }

    console.log(`Account ${user.id} successfully deleted at ${new Date().toISOString()}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete account' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
