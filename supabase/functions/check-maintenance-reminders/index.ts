import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Find contracts where reminder should be sent
    // (next_due_date - reminder_days) <= today AND reminder_sent_at is null or older than 7 days
    const { data: contracts, error: fetchError } = await supabase
      .from("maintenance_contracts")
      .select(`
        *,
        properties:property_id (
          id,
          name,
          address
        )
      `)
      .eq("is_active", true);

    if (fetchError) {
      throw new Error(`Error fetching contracts: ${fetchError.message}`);
    }

    const contractsToRemind = contracts?.filter((contract) => {
      const dueDate = new Date(contract.next_due_date);
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - contract.reminder_days);

      // Check if reminder should be sent
      if (reminderDate > today) return false;

      // Check if reminder was already sent recently (within 7 days)
      if (contract.reminder_sent_at) {
        const lastReminder = new Date(contract.reminder_sent_at);
        const daysSinceReminder = Math.floor(
          (today.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceReminder < 7) return false;
      }

      return true;
    }) || [];

    console.log(`Found ${contractsToRemind.length} contracts needing reminders`);

    const results: { success: number; failed: number } = { success: 0, failed: 0 };

    for (const contract of contractsToRemind) {
      try {
        // Create internal message for reminder
        const dueDate = new Date(contract.next_due_date);
        const isOverdue = dueDate < today;
        
        const subject = isOverdue
          ? `⚠️ ÜBERFÄLLIG: ${contract.title} - ${contract.properties?.name}`
          : `🔔 Wartung fällig: ${contract.title} - ${contract.properties?.name}`;

        const messageBody = `
Wartungsvertrag erfordert Ihre Aufmerksamkeit:

**${contract.title}**
Liegenschaft: ${contract.properties?.name}, ${contract.properties?.address}
Fälligkeitstermin: ${dueDate.toLocaleDateString("de-AT")}
${isOverdue ? `⚠️ ÜBERFÄLLIG seit ${Math.abs(Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))} Tagen` : ""}

${contract.contractor_name ? `Vertragspartner: ${contract.contractor_name}` : ""}
${contract.contractor_contact ? `Kontakt: ${contract.contractor_contact}` : ""}
${contract.contractor_email ? `E-Mail: ${contract.contractor_email}` : ""}

${contract.notes ? `Notizen: ${contract.notes}` : ""}

Bitte planen Sie die Wartung zeitnah und markieren Sie sie nach Durchführung als erledigt.
        `.trim();

        // Insert message
        const { error: messageError } = await supabase.from("messages").insert({
          organization_id: contract.organization_id,
          recipient_type: "internal",
          message_type: "maintenance_reminder",
          subject,
          message_body: messageBody,
          status: "sent",
          sent_at: new Date().toISOString(),
        });

        if (messageError) {
          console.error(`Error creating message for contract ${contract.id}:`, messageError);
          results.failed++;
          continue;
        }

        // Update reminder_sent_at
        const { error: updateError } = await supabase
          .from("maintenance_contracts")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", contract.id);

        if (updateError) {
          console.error(`Error updating reminder_sent_at for contract ${contract.id}:`, updateError);
        }

        // Optionally create a maintenance task if overdue
        if (isOverdue) {
          const { error: taskError } = await supabase.from("maintenance_tasks").insert({
            organization_id: contract.organization_id,
            property_id: contract.property_id,
            title: `[ÜBERFÄLLIG] ${contract.title}`,
            description: `Wiederkehrende Wartung überfällig seit ${dueDate.toLocaleDateString("de-AT")}. ${contract.description || ""}`,
            category: "maintenance",
            priority: "urgent",
            due_date: todayStr,
            contractor_name: contract.contractor_name,
            contractor_contact: contract.contractor_contact,
            status: "open",
          });

          if (taskError) {
            console.error(`Error creating task for contract ${contract.id}:`, taskError);
          }
        }

        results.success++;
      } catch (err) {
        console.error(`Error processing contract ${contract.id}:`, err);
        results.failed++;
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${contractsToRemind.length} contracts`,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in check-maintenance-reminders:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
