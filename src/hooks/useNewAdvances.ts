import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpdateAdvancesParams {
  propertyId: string;
  totalBkKosten: number; // Echte BK-Kosten aus der Jahresabrechnung
  totalHkKosten: number; // Echte Heizkosten aus der Jahresabrechnung
  units: Array<{
    id: string;
    qm: number;
    mea: number;
    currentTenantId: string | null;
  }>;
  totals: {
    qm: number;
    mea: number;
  };
}

/**
 * Hook to update tenant advance payments based on actual yearly costs.
 * After a settlement is finalized, this calculates new monthly advances:
 * - BK: (Unit's BK share from settlement) / 12
 * - HK: (Unit's HK share from settlement) / 12
 */
export function useUpdateNewAdvances() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ propertyId, totalBkKosten, totalHkKosten, units, totals }: UpdateAdvancesParams) => {
      const updates: Array<{ id: string; betriebskosten_vorschuss: number; heizungskosten_vorschuss: number }> = [];

      for (const unit of units) {
        if (!unit.currentTenantId) continue;

        // Calculate unit's share of BK (based on MEA)
        const bkAnteil = totals.mea > 0 
          ? (unit.mea / totals.mea) * totalBkKosten 
          : 0;
        
        // Calculate unit's share of HK (based on qm)
        const hkAnteil = totals.qm > 0 
          ? (unit.qm / totals.qm) * totalHkKosten 
          : 0;

        // New monthly advance = yearly share / 12, rounded to 2 decimals
        const newBkVorschuss = Math.round((bkAnteil / 12) * 100) / 100;
        const newHkVorschuss = Math.round((hkAnteil / 12) * 100) / 100;

        updates.push({
          id: unit.currentTenantId,
          betriebskosten_vorschuss: newBkVorschuss,
          heizungskosten_vorschuss: newHkVorschuss,
        });
      }

      // Update each tenant's advance payments
      let updatedCount = 0;
      for (const update of updates) {
        const { error } = await supabase
          .from('tenants')
          .update({
            betriebskosten_vorschuss: update.betriebskosten_vorschuss,
            heizungskosten_vorschuss: update.heizungskosten_vorschuss,
          })
          .eq('id', update.id);

        if (error) {
          console.error('Error updating tenant advances:', error);
          throw error;
        }
        updatedCount++;
      }

      return { updatedCount, updates };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success(`Neue Vorschreibungen für ${data.updatedCount} Mieter aktualisiert`);
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren der Vorschreibungen');
      console.error('Update advances error:', error);
    },
  });
}
