import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface DuplicateRow {
  id: string;
  invoice_id: string;
  unit_id: string;
  line_type: string;
  description: string;
  normalized_description: string;
  amount: number;
  tax_rate: number;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface DuplicateGroup {
  groupId: string;
  invoiceId: string;
  unitId: string;
  lineType: string;
  normalizedDescription: string;
  rows: DuplicateRow[];
  suggestedCanonicalId: string;
}

export interface MergeRequest {
  canonicalId: string;
  mergePolicy: "keep_latest" | "sum_amounts" | "manual";
  mergedValues?: {
    amount?: number;
    taxRate?: number;
    meta?: Record<string, unknown>;
  };
  auditComment: string;
  runId: string;
}

export interface MergeResult {
  status: string;
  canonicalId: string;
  mergedIds: string[];
  deletedCount: number;
  auditLogId: string | null;
  mergePolicy: string;
}

export function useDuplicateGroups() {
  return useQuery({
    queryKey: ["duplicate-groups"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("duplicate-merge", {
        method: "GET",
      });
      if (error) throw error;
      return data as { groups: DuplicateGroup[]; total: number };
    },
  });
}

export function useDuplicateGroup(groupId: string | null) {
  return useQuery({
    queryKey: ["duplicate-group", groupId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        `duplicate-merge?groupId=${encodeURIComponent(groupId!)}`,
        { method: "GET" }
      );
      if (error) throw error;
      return data as DuplicateGroup;
    },
    enabled: !!groupId,
  });
}

export function useMergeDuplicates(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (req: MergeRequest) => {
      const { data, error } = await supabase.functions.invoke(
        `duplicate-merge?groupId=${encodeURIComponent(groupId)}`,
        {
          method: "POST",
          body: req,
        }
      );
      if (error) throw error;
      return data as MergeResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["duplicate-groups"] });
      queryClient.invalidateQueries({ queryKey: ["duplicate-group", groupId] });
      toast({
        title: "Duplikate zusammengeführt",
        description: `${result.deletedCount} Zeile(n) gelöscht, Canonical: ${result.canonicalId.slice(0, 8)}…`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Fehler beim Zusammenführen",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}
