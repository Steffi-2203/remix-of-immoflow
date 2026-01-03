import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SettlementItem {
  unitId: string;
  tenantId: string | null;
  tenantName: string;
  tenantEmail: string | null;
  isLeerstandBK: boolean;
  isLeerstandHK: boolean;
  bkAnteil: number;
  hkAnteil: number;
  bkVorschuss: number;
  hkVorschuss: number;
  bkSaldo: number;
  hkSaldo: number;
  gesamtSaldo: number;
}

export interface SaveSettlementData {
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  year: number;
  totalBk: number;
  totalHk: number;
  bkMieter: number;
  hkMieter: number;
  bkEigentuemer: number;
  hkEigentuemer: number;
  items: SettlementItem[];
  sendEmails: boolean;
}

export function useExistingSettlement(propertyId: string | undefined, year: number | undefined) {
  return useQuery({
    queryKey: ['settlement', propertyId, year],
    queryFn: async () => {
      if (!propertyId || !year) return null;
      
      const { data, error } = await supabase
        .from('operating_cost_settlements')
        .select(`
          *,
          settlement_items (*)
        `)
        .eq('property_id', propertyId)
        .eq('year', year)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId && !!year,
  });
}

export function useSaveSettlement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: SaveSettlementData) => {
      const { propertyId, propertyName, propertyAddress, year, totalBk, totalHk, bkMieter, hkMieter, bkEigentuemer, hkEigentuemer, items, sendEmails } = data;
      
      // Check if settlement already exists
      const { data: existing } = await supabase
        .from('operating_cost_settlements')
        .select('id')
        .eq('property_id', propertyId)
        .eq('year', year)
        .maybeSingle();

      let settlementId: string;

      if (existing) {
        // Update existing settlement
        const { data: updated, error: updateError } = await supabase
          .from('operating_cost_settlements')
          .update({
            gesamtkosten: totalBk + totalHk,
            total_bk: totalBk,
            total_hk: totalHk,
            bk_mieter: bkMieter,
            hk_mieter: hkMieter,
            bk_eigentuemer: bkEigentuemer,
            hk_eigentuemer: hkEigentuemer,
            status: 'berechnet',
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) throw updateError;
        settlementId = updated.id;

        // Delete old items
        await supabase
          .from('settlement_items')
          .delete()
          .eq('settlement_id', settlementId);
      } else {
        // Create new settlement
        const { data: created, error: createError } = await supabase
          .from('operating_cost_settlements')
          .insert({
            property_id: propertyId,
            year,
            gesamtkosten: totalBk + totalHk,
            total_bk: totalBk,
            total_hk: totalHk,
            bk_mieter: bkMieter,
            hk_mieter: hkMieter,
            bk_eigentuemer: bkEigentuemer,
            hk_eigentuemer: hkEigentuemer,
            status: 'berechnet',
          })
          .select()
          .single();

        if (createError) throw createError;
        settlementId = created.id;
      }

      // Insert settlement items
      const itemsToInsert = items.map(item => ({
        settlement_id: settlementId,
        unit_id: item.unitId,
        tenant_id: item.tenantId,
        tenant_name: item.tenantName,
        tenant_email: item.tenantEmail,
        is_leerstand_bk: item.isLeerstandBK,
        is_leerstand_hk: item.isLeerstandHK,
        bk_anteil: item.bkAnteil,
        hk_anteil: item.hkAnteil,
        bk_vorschuss: item.bkVorschuss,
        hk_vorschuss: item.hkVorschuss,
        bk_saldo: item.bkSaldo,
        hk_saldo: item.hkSaldo,
        gesamt_saldo: item.gesamtSaldo,
        email_status: sendEmails && item.tenantEmail ? 'pending' : null,
      }));

      const { data: insertedItems, error: itemsError } = await supabase
        .from('settlement_items')
        .insert(itemsToInsert)
        .select();

      if (itemsError) throw itemsError;

      // Send emails if requested
      if (sendEmails) {
        const itemsWithEmail = insertedItems.filter(item => item.tenant_email);
        
        for (const item of itemsWithEmail) {
          try {
            const { error: emailError } = await supabase.functions.invoke('send-settlement-email', {
              body: {
                settlementItemId: item.id,
                propertyName,
                propertyAddress,
                unitTopNummer: items.find(i => i.unitId === item.unit_id)?.tenantName?.split(' ')[0] || '',
                tenantName: item.tenant_name,
                tenantEmail: item.tenant_email,
                year,
                bkAnteil: item.bk_anteil,
                hkAnteil: item.hk_anteil,
                bkVorschuss: item.bk_vorschuss,
                hkVorschuss: item.hk_vorschuss,
                bkSaldo: item.bk_saldo,
                hkSaldo: item.hk_saldo,
                gesamtSaldo: item.gesamt_saldo,
                isLeerstandBK: item.is_leerstand_bk,
                isLeerstandHK: item.is_leerstand_hk,
              },
            });

            if (emailError) {
              console.error('Email error:', emailError);
            }
          } catch (err) {
            console.error('Failed to send email:', err);
          }
        }
      }

      return { settlementId, itemsCount: insertedItems.length };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settlement'] });
      toast.success(`Abrechnung gespeichert (${data.itemsCount} Positionen)`);
    },
    onError: (error) => {
      console.error('Save settlement error:', error);
      toast.error('Fehler beim Speichern der Abrechnung');
    },
  });
}

export function useFinalizeSettlement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ settlementId }: { settlementId: string }) => {
      const { data, error } = await supabase
        .from('operating_cost_settlements')
        .update({
          status: 'abgeschlossen',
          finalized_at: new Date().toISOString(),
        })
        .eq('id', settlementId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlement'] });
      toast.success('Abrechnung finalisiert');
    },
    onError: (error) => {
      console.error('Finalize error:', error);
      toast.error('Fehler beim Finalisieren');
    },
  });
}
