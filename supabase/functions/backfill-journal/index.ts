import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EXPENSE_ACCOUNT_MAP: Record<string, string> = {
  versicherung: '5000',
  instandhaltung: '5100',
  reparatur: '5100',
  lift: '5200',
  heizung: '5300',
  wasser: '5400',
  strom: '5500',
  muell: '5600',
  hausbetreuung: '5700',
  garten: '5800',
  schneeraeumung: '5900',
  grundsteuer: '6000',
  verwaltung: '6100',
  kanal: '6200',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sb = createClient(supabaseUrl, serviceRoleKey)

    // 1. Get organization from chart_of_accounts
    const { data: orgRow } = await sb
      .from('chart_of_accounts')
      .select('organization_id')
      .not('organization_id', 'is', null)
      .limit(1)
      .single()

    if (!orgRow?.organization_id) {
      return new Response(JSON.stringify({ error: 'No organization found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const orgId = orgRow.organization_id

    // 2. Load chart of accounts into a map: account_number -> id
    const { data: accounts } = await sb
      .from('chart_of_accounts')
      .select('id, account_number')
      .eq('organization_id', orgId)

    const accMap = new Map<string, string>()
    for (const a of accounts || []) {
      accMap.set(a.account_number, a.id)
    }

    // 3. Load existing journal entries to check idempotency
    const { data: existingEntries } = await sb
      .from('journal_entries')
      .select('source_type, source_id')
      .not('source_type', 'is', null)
      .not('source_id', 'is', null)

    const existingSet = new Set<string>()
    for (const e of existingEntries || []) {
      existingSet.add(`${e.source_type}:${e.source_id}`)
    }

    let invoicesBooked = 0
    let paymentsBooked = 0
    let expensesBooked = 0
    let skipped = 0
    const errors: string[] = []

    // ── INVOICES ─────────────────────────────────────────────
    const { data: invoices } = await sb
      .from('monthly_invoices')
      .select('id, tenant_id, unit_id, year, month, grundmiete, betriebskosten, heizungskosten, ust, gesamtbetrag, faellig_am')
      .order('year', { ascending: true })
      .order('month', { ascending: true })

    const accForderung = accMap.get('2100')
    const accMiete = accMap.get('4000')
    const accBK = accMap.get('4100')
    const accHK = accMap.get('4200')
    const accUSt = accMap.get('3540')
    const accBank = accMap.get('2800')
    const accVorsteuer = accMap.get('2500')

    for (const inv of invoices || []) {
      if (existingSet.has(`invoice:${inv.id}`)) { skipped++; continue }
      if (!accForderung || !accMiete) { skipped++; continue }

      const gesamt = Number(inv.gesamtbetrag) || 0
      if (gesamt === 0) { skipped++; continue }

      // Get property_id from unit
      let propertyId: string | null = null
      if (inv.unit_id) {
        const { data: unit } = await sb.from('units').select('property_id').eq('id', inv.unit_id).single()
        propertyId = unit?.property_id || null
      }

      // Get booking number
      const { data: bookingNum } = await sb.rpc('next_booking_number', { _org_id: orgId })

      const entryDate = inv.faellig_am || `${inv.year}-${String(inv.month).padStart(2, '0')}-01`

      const { data: entry, error: entryErr } = await sb
        .from('journal_entries')
        .insert({
          organization_id: orgId,
          entry_date: entryDate,
          booking_number: bookingNum as string,
          description: `Vorschreibung ${inv.month}/${inv.year}`,
          property_id: propertyId,
          unit_id: inv.unit_id,
          tenant_id: inv.tenant_id,
          source_type: 'invoice',
          source_id: inv.id,
        })
        .select('id')
        .single()

      if (entryErr || !entry) {
        errors.push(`Invoice ${inv.id}: ${entryErr?.message}`)
        continue
      }

      const lines: any[] = [
        { journal_entry_id: entry.id, account_id: accForderung, debit: gesamt, credit: 0 },
      ]

      const grundmiete = Number(inv.grundmiete) || 0
      if (grundmiete > 0 && accMiete) {
        lines.push({ journal_entry_id: entry.id, account_id: accMiete, debit: 0, credit: grundmiete })
      }
      const bk = Number(inv.betriebskosten) || 0
      if (bk > 0 && accBK) {
        lines.push({ journal_entry_id: entry.id, account_id: accBK, debit: 0, credit: bk })
      }
      const hk = Number(inv.heizungskosten) || 0
      if (hk > 0 && accHK) {
        lines.push({ journal_entry_id: entry.id, account_id: accHK, debit: 0, credit: hk })
      }
      const ust = Number(inv.ust) || 0
      if (ust > 0 && accUSt) {
        lines.push({ journal_entry_id: entry.id, account_id: accUSt, debit: 0, credit: ust })
      }

      await sb.from('journal_entry_lines').insert(lines)
      invoicesBooked++
    }

    // ── PAYMENTS ─────────────────────────────────────────────
    const { data: payments } = await sb
      .from('payments')
      .select('id, tenant_id, betrag, eingangs_datum, buchungs_datum, zahlungsart')
      .order('eingangs_datum', { ascending: true })

    for (const pay of payments || []) {
      if (existingSet.has(`payment:${pay.id}`)) { skipped++; continue }
      if (!accBank || !accForderung) { skipped++; continue }

      const betrag = Number(pay.betrag) || 0
      if (betrag === 0) { skipped++; continue }

      // Get unit/property from tenant
      let unitId: string | null = null
      let propertyId: string | null = null
      if (pay.tenant_id) {
        const { data: tenant } = await sb.from('tenants').select('unit_id').eq('id', pay.tenant_id).single()
        unitId = tenant?.unit_id || null
        if (unitId) {
          const { data: unit } = await sb.from('units').select('property_id').eq('id', unitId).single()
          propertyId = unit?.property_id || null
        }
      }

      const { data: bookingNum } = await sb.rpc('next_booking_number', { _org_id: orgId })
      const entryDate = pay.eingangs_datum || pay.buchungs_datum

      const { data: entry, error: entryErr } = await sb
        .from('journal_entries')
        .insert({
          organization_id: orgId,
          entry_date: entryDate,
          booking_number: bookingNum as string,
          description: `Zahlungseingang ${pay.zahlungsart || ''}`.trim(),
          property_id: propertyId,
          unit_id: unitId,
          tenant_id: pay.tenant_id,
          source_type: 'payment',
          source_id: pay.id,
        })
        .select('id')
        .single()

      if (entryErr || !entry) {
        errors.push(`Payment ${pay.id}: ${entryErr?.message}`)
        continue
      }

      await sb.from('journal_entry_lines').insert([
        { journal_entry_id: entry.id, account_id: accBank, debit: betrag, credit: 0 },
        { journal_entry_id: entry.id, account_id: accForderung, debit: 0, credit: betrag },
      ])
      paymentsBooked++
    }

    // ── EXPENSES ─────────────────────────────────────────────
    const { data: expenses } = await sb
      .from('expenses')
      .select('id, property_id, category, betrag, datum, bezeichnung, beleg_nummer')
      .order('datum', { ascending: true })

    for (const exp of expenses || []) {
      if (existingSet.has(`expense:${exp.id}`)) { skipped++; continue }
      if (!accBank) { skipped++; continue }

      const brutto = Number(exp.betrag) || 0
      if (brutto === 0) { skipped++; continue }

      const expAccNum = EXPENSE_ACCOUNT_MAP[exp.category] || '6300'
      const accExpense = accMap.get(expAccNum)
      if (!accExpense) { skipped++; continue }

      const netto = Math.round((brutto / 1.20) * 100) / 100
      const vst = Math.round((brutto - netto) * 100) / 100

      const { data: bookingNum } = await sb.rpc('next_booking_number', { _org_id: orgId })

      const { data: entry, error: entryErr } = await sb
        .from('journal_entries')
        .insert({
          organization_id: orgId,
          entry_date: exp.datum,
          booking_number: bookingNum as string,
          description: exp.bezeichnung,
          property_id: exp.property_id,
          source_type: 'expense',
          source_id: exp.id,
          beleg_nummer: exp.beleg_nummer,
        })
        .select('id')
        .single()

      if (entryErr || !entry) {
        errors.push(`Expense ${exp.id}: ${entryErr?.message}`)
        continue
      }

      const lines: any[] = [
        { journal_entry_id: entry.id, account_id: accExpense, debit: netto, credit: 0 },
      ]
      if (accVorsteuer && vst > 0) {
        lines.push({ journal_entry_id: entry.id, account_id: accVorsteuer, debit: vst, credit: 0 })
      }
      lines.push({ journal_entry_id: entry.id, account_id: accBank, debit: 0, credit: brutto })

      await sb.from('journal_entry_lines').insert(lines)
      expensesBooked++
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoices_booked: invoicesBooked,
        payments_booked: paymentsBooked,
        expenses_booked: expensesBooked,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
