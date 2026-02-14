import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { trigger_type, context = {}, dry_run = true } = await req.json();

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: 'No organization' }), { status: 400, headers: corsHeaders });
    }

    // Load active rules for this organization
    const query = supabase
      .from('automation_rules')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true);

    if (trigger_type) {
      query.eq('trigger_type', trigger_type);
    }

    const { data: rules, error: rulesError } = await query;

    if (rulesError) {
      return new Response(JSON.stringify({ error: rulesError.message }), { status: 500, headers: corsHeaders });
    }

    // Evaluate each rule
    const results = (rules || []).map((rule) => {
      const conditions = rule.conditions || {};
      let would_trigger = true;

      // Simple condition evaluation
      for (const [key, expected] of Object.entries(conditions)) {
        if (context[key] !== undefined && context[key] !== expected) {
          would_trigger = false;
          break;
        }
      }

      return {
        rule_name: rule.name,
        rule_id: rule.id,
        trigger_type: rule.trigger_type,
        would_trigger,
        actions: rule.actions || [],
        dry_run,
      };
    });

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
