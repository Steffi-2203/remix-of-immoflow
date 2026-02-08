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
  undoWindowMinutes: number;
  undoExpiresAt: string;
}

export interface MergeTombstone {
  id: string;
  group_id: string;
  canonical_id: string;
  deleted_row_ids: string[];
  merge_policy: string;
  merged_by: string;
  created_at: string;
  expires_at: string;
}

export interface UndoResult {
  status: string;
  restoredCount: number;
  canonicalId: string;
  groupId: string;
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

export function usePendingUndos() {
  return useQuery({
    queryKey: ["merge-pending-undos"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "duplicate-merge?action=pending-undos",
        { method: "GET" }
      );
      if (error) throw error;
      return (data as { tombstones: MergeTombstone[] }).tombstones;
    },
    refetchInterval: 15_000, // refresh every 15s to track expiry
  });
}

export function useMergeDuplicates(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (req: MergeRequest) => {
      const { data, error } = await supabase.functions.invoke(
        `duplicate-merge?groupId=${encodeURIComponent(groupId)}`,
        { method: "POST", body: req }
      );
      if (error) throw error;
      return data as MergeResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["duplicate-groups"] });
      queryClient.invalidateQueries({ queryKey: ["duplicate-group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["merge-pending-undos"] });
      toast({
        title: "Duplikate zusammengeführt (soft-delete)",
        description: `${result.deletedCount} Zeile(n) soft-gelöscht. Undo verfügbar für ${result.undoWindowMinutes} Minuten.`,
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

export function useUndoMerge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tombstoneId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "duplicate-merge?action=undo",
        { method: "POST", body: { tombstoneId } }
      );
      if (error) throw error;
      return data as UndoResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["duplicate-groups"] });
      queryClient.invalidateQueries({ queryKey: ["merge-pending-undos"] });
      toast({
        title: "Merge rückgängig gemacht",
        description: `${result.restoredCount} Zeile(n) wiederhergestellt.`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Undo fehlgeschlagen",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}
