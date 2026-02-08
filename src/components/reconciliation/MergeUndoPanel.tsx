import { usePendingUndos, useUndoMerge, type MergeTombstone } from "@/hooks/useDuplicateResolution";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Undo2, Clock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

function formatTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Abgelaufen";
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function TombstoneRow({ tombstone }: { tombstone: MergeTombstone }) {
  const undoMutation = useUndoMerge();
  const [timeLeft, setTimeLeft] = useState(formatTimeLeft(tombstone.expires_at));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(formatTimeLeft(tombstone.expires_at));
    }, 1000);
    return () => clearInterval(interval);
  }, [tombstone.expires_at]);

  const isExpired = new Date(tombstone.expires_at).getTime() <= Date.now();

  return (
    <div className="flex items-center gap-3 p-3 rounded-md border border-border">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="text-xs font-mono">
            {tombstone.merge_policy}
          </Badge>
          <span className="text-muted-foreground truncate text-xs">
            {tombstone.group_id.split("|").pop()}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className={isExpired ? "text-destructive" : "text-amber-600"}>
            {timeLeft}
          </span>
          <span>• {tombstone.deleted_row_ids.length} Zeile(n)</span>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="gap-1 shrink-0"
        disabled={isExpired || undoMutation.isPending}
        onClick={() => undoMutation.mutate(tombstone.id)}
      >
        {undoMutation.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Undo2 className="h-3.5 w-3.5" />
        )}
        Undo
      </Button>
    </div>
  );
}

export function MergeUndoPanel() {
  const { data: tombstones, isLoading } = usePendingUndos();

  if (isLoading) return <Skeleton className="h-24" />;
  if (!tombstones || tombstones.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Undo2 className="h-4 w-4 text-amber-600" />
          Undo-Fenster aktiv
        </CardTitle>
        <CardDescription>
          Diese Merges können noch rückgängig gemacht werden.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {tombstones.map((t) => (
          <TombstoneRow key={t.id} tombstone={t} />
        ))}
      </CardContent>
    </Card>
  );
}
