import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Tenant {
  id: string;
  unit_id: string;
  first_name: string;
  last_name: string;
  grundmiete: number;
  betriebskosten_vorschuss: number;
  heizungskosten_vorschuss: number;
  status: string;
}

interface Unit {
  id: string;
  type: string;
  property_id: string;
  top_nummer: string;
}

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
}

interface Organization {
  id: string;
  name: string;
  iban: string | null;
  bic: string | null;
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

const monthNames = [
  'Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

function formatCurrency(amount: number): string {
  return `€ ${amount.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface VorschreibungParams {
  tenantName: string;
  propertyName: string;
  propertyAddress: string;
  propertyCity: string;
  unitNumber: string;
  month: number;
  year: number;
  grundmiete: number;
  betriebskosten: number;
  heizungskosten: number;
  ustSatzMiete: number;
  ustSatzBk: number;
  ustSatzHeizung: number;
  ust: number;
  gesamtbetrag: number;
  faelligAm: string;
  organizationName: string;
  iban?: string;
  bic?: string;
}

function generateVorschreibungPdf(params: VorschreibungParams): Uint8Array {
  const {
    tenantName,
    propertyName,
    propertyAddress,
    propertyCity,
    unitNumber,
    month,
    year,
    grundmiete,
    betriebskosten,
    heizungskosten,
    ustSatzMiete,
    ustSatzBk,
    ustSatzHeizung,
    ust,
    gesamtbetrag,
    faelligAm,
    organizationName,
    iban,
    bic,
  } = params;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  const monthName = monthNames[month - 1];

  // Calculate USt amounts for each position (from gross to net)
  const ustMiete = calculateVatFromGross(grundmiete, ustSatzMiete);
  const ustBk = calculateVatFromGross(betriebskosten, ustSatzBk);
  const ustHeizung = calculateVatFromGross(heizungskosten, ustSatzHeizung);

  // Net amounts (excluding USt)
  const grundmieteNetto = grundmiete - ustMiete;
  const betriebskostenNetto = betriebskosten - ustBk;
  const heizkostenNetto = heizungskosten - ustHeizung;

  // Header - Sender
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(organizationName, margin, yPos);
  yPos += 15;

  // Recipient
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(tenantName, margin, yPos);
  yPos += 5;
  doc.text(propertyAddress, margin, yPos);
  yPos += 5;
  doc.text(`Top ${unitNumber}`, margin, yPos);
  yPos += 5;
  doc.text(propertyCity, margin, yPos);
  yPos += 15;

  // Date and invoice number right-aligned
  doc.setFontSize(10);
  const today = new Date();
  doc.text(`Datum: ${today.toLocaleDateString('de-AT')}`, pageWidth - margin - 40, yPos - 30);
  doc.text(`Nr.: ${year}-${String(month).padStart(2, '0')}-${unitNumber}`, pageWidth - margin - 40, yPos - 24);

  // Subject
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Monatliche Vorschreibung ${monthName} ${year}`, margin, yPos);
  yPos += 10;

  // Property info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(`Liegenschaft: ${propertyName} | Top ${unitNumber}`, margin, yPos);
  yPos += 10;

  // Salutation
  doc.setTextColor(0);
  doc.text(`Sehr geehrte/r ${tenantName},`, margin, yPos);
  yPos += 8;

  // Introduction text - updated for ongoing validity
  const introText = `hiermit übersenden wir Ihnen die monatliche Vorschreibung für ${monthName} ${year}. Diese gilt so lange, bis eine neue Vorschreibung an Sie versandt wird. Bitte überweisen Sie den folgenden Betrag bis zum 5. jeden Monats.`;
  const splitIntro = doc.splitTextToSize(introText, pageWidth - 2 * margin);
  doc.text(splitIntro, margin, yPos);
  yPos += splitIntro.length * 5 + 10;

  // Invoice table - simplified without autoTable
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(59, 130, 246);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
  doc.setTextColor(255);
  doc.text('Position', margin + 2, yPos + 6);
  doc.text('Netto', margin + 70, yPos + 6);
  doc.text('USt.', margin + 100, yPos + 6);
  doc.text('Brutto', margin + 140, yPos + 6);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);

  // Row 1: Grundmiete
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
  doc.text('Grundmiete', margin + 2, yPos + 6);
  doc.text(formatCurrency(grundmieteNetto), margin + 70, yPos + 6);
  doc.text(`${ustSatzMiete}%`, margin + 100, yPos + 6);
  doc.text(formatCurrency(grundmiete), margin + 140, yPos + 6);
  yPos += 9;

  // Row 2: Betriebskosten
  doc.text('BK-Vorschuss', margin + 2, yPos + 6);
  doc.text(formatCurrency(betriebskostenNetto), margin + 70, yPos + 6);
  doc.text(`${ustSatzBk}%`, margin + 100, yPos + 6);
  doc.text(formatCurrency(betriebskosten), margin + 140, yPos + 6);
  yPos += 9;

  // Row 3: Heizung
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
  doc.text('HK-Vorschuss', margin + 2, yPos + 6);
  doc.text(formatCurrency(heizkostenNetto), margin + 70, yPos + 6);
  doc.text(`${ustSatzHeizung}%`, margin + 100, yPos + 6);
  doc.text(formatCurrency(heizungskosten), margin + 140, yPos + 6);
  yPos += 10;

  // Total row
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(59, 130, 246);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');
  doc.setTextColor(255);
  doc.text('Gesamtbetrag', margin + 2, yPos + 7);
  doc.text(formatCurrency(grundmieteNetto + betriebskostenNetto + heizkostenNetto), margin + 70, yPos + 7);
  doc.text(formatCurrency(ust), margin + 100, yPos + 7);
  doc.text(formatCurrency(gesamtbetrag), margin + 140, yPos + 7);
  yPos += 20;

  // Due date box
  doc.setTextColor(0);
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 20, 3, 3);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Fälligkeitsdatum: 5. jeden Monats`, margin + 5, yPos + 8);
  doc.text(`Zu zahlen: ${formatCurrency(gesamtbetrag)}`, margin + 5, yPos + 15);
  
  yPos += 30;

  // Payment information
  if (iban || bic) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Bankverbindung:', margin, yPos);
    yPos += 6;
    
    doc.setFont('helvetica', 'normal');
    if (iban) {
      doc.text(`IBAN: ${iban}`, margin, yPos);
      yPos += 5;
    }
    if (bic) {
      doc.text(`BIC: ${bic}`, margin, yPos);
      yPos += 5;
    }
    doc.text(`Verwendungszweck: Miete ${monthName} ${year} - Top ${unitNumber}`, margin, yPos);
    yPos += 10;
  }

  // Closing text
  yPos += 5;
  const closingText = 'Bei Fragen zu dieser Vorschreibung stehen wir Ihnen gerne zur Verfügung.\n\nMit freundlichen Grüßen\nIhre Hausverwaltung';
  const splitClosing = doc.splitTextToSize(closingText, pageWidth - 2 * margin);
  doc.text(splitClosing, margin, yPos);

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(`Vorschreibung ${monthName} ${year} - ${propertyName} - Top ${unitNumber}`, margin, pageHeight - 10);
  doc.text('Seite 1 von 1', pageWidth - margin - 20, pageHeight - 10);

  // Return as Uint8Array
  return doc.output('arraybuffer') as unknown as Uint8Array;
}

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

    // Fetch ALL units with property info (system-wide, for all properties)
    const { data: units, error: unitsError } = await supabase
      .from("units")
      .select("id, type, property_id, top_nummer");

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
    const propertyIds = [...new Set(units.map(u => u.property_id))];

    // Fetch properties
    const { data: properties, error: propertiesError } = await supabase
      .from("properties")
      .select("id, name, address, city, postal_code")
      .in("id", propertyIds);

    if (propertiesError) {
      throw new Error(`Failed to fetch properties: ${propertiesError.message}`);
    }

    const propertyMap = new Map<string, Property>();
    properties?.forEach((p: Property) => propertyMap.set(p.id, p));

    // Create a map of unit_id to unit info
    const unitMap = new Map<string, Unit>();
    units.forEach((unit: Unit) => {
      unitMap.set(unit.id, unit);
    });

    // Fetch organization info for PDF
    const { data: orgData } = await supabase
      .from("organizations")
      .select("id, name, iban, bic")
      .limit(1)
      .single();

    const organization: Organization = orgData || { id: '', name: 'Hausverwaltung', iban: null, bic: null };

    // Fetch all active tenants for all units with full info
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, unit_id, first_name, last_name, grundmiete, betriebskosten_vorschuss, heizungskosten_vorschuss, status")
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
      const unit = unitMap.get(tenant.unit_id);
      const unitType = unit?.type || 'wohnung';
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

    // Generate PDFs for each created invoice
    let pdfsCreated = 0;
    const monthName = monthNames[month - 1];

    for (const invoice of createdInvoices || []) {
      try {
        const tenant = tenantsToInvoice.find(t => t.id === invoice.tenant_id);
        const unit = unitMap.get(invoice.unit_id);
        const property = unit ? propertyMap.get(unit.property_id) : null;

        if (!tenant || !unit || !property) {
          console.error(`[CRON] Missing data for invoice ${invoice.id}`);
          continue;
        }

        const tenantName = `${tenant.first_name} ${tenant.last_name}`;
        const vatRates = getVatRates(unit.type);

        // Generate PDF
        const pdfParams: VorschreibungParams = {
          tenantName,
          propertyName: property.name,
          propertyAddress: property.address,
          propertyCity: `${property.postal_code} ${property.city}`,
          unitNumber: unit.top_nummer,
          month: invoice.month,
          year: invoice.year,
          grundmiete: invoice.grundmiete,
          betriebskosten: invoice.betriebskosten,
          heizungskosten: invoice.heizungskosten,
          ustSatzMiete: vatRates.ust_satz_miete,
          ustSatzBk: vatRates.ust_satz_bk,
          ustSatzHeizung: vatRates.ust_satz_heizung,
          ust: invoice.ust,
          gesamtbetrag: invoice.gesamtbetrag,
          faelligAm: invoice.faellig_am,
          organizationName: organization.name,
          iban: organization.iban || undefined,
          bic: organization.bic || undefined,
        };

        const pdfData = generateVorschreibungPdf(pdfParams);
        
        // Generate filename
        const sanitizedName = tenantName.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_');
        const filename = `Vorschreibung_${monthName}_${year}_Top${unit.top_nummer}_${sanitizedName}.pdf`;
        const storagePath = `${tenant.id}/${filename}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('tenant-documents')
          .upload(storagePath, pdfData, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (uploadError) {
          console.error(`[CRON] Failed to upload PDF for tenant ${tenant.id}:`, uploadError.message);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('tenant-documents')
          .getPublicUrl(storagePath);

        // Create tenant document entry
        const { error: docError } = await supabase
          .from('tenant_documents')
          .insert({
            tenant_id: tenant.id,
            name: `Vorschreibung ${monthName} ${year}`,
            type: 'vorschreibung',
            file_url: urlData.publicUrl,
          });

        if (docError) {
          console.error(`[CRON] Failed to create document entry for tenant ${tenant.id}:`, docError.message);
          continue;
        }

        pdfsCreated++;
        console.log(`[CRON] Created PDF for tenant ${tenant.id}: ${filename}`);
      } catch (pdfError) {
        console.error(`[CRON] Error generating PDF for invoice ${invoice.id}:`, pdfError);
      }
    }

    console.log(`[CRON] Successfully created ${pdfsCreated} PDFs for ${month}/${year}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully created ${createdInvoices?.length || 0} invoices and ${pdfsCreated} PDFs for ${month}/${year}`,
        created: createdInvoices?.length || 0,
        pdfsCreated,
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
