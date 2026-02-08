import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import {
  useDuplicateGroup,
  useMergeDuplicates,
  type DuplicateRow,
  type MergeRequest,
} from "@/hooks/useDuplicateResolution";

interface DuplicateResolutionDialogProps {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved?: (result: { canonicalId: string; deletedCount: number }) => void;
}

type MergePolicy = "keep_latest" | "sum_amounts" | "manual";

export function DuplicateResolutionDialog({
  groupId,
  open,
  onOpenChange,
  onResolved,
}: DuplicateResolutionDialogProps) {
  const { data: group, isLoading, error } = useDuplicateGroup(open ? groupId : null);
  const mergeMutation = useMergeDuplicates(groupId);

  const [canonicalId, setCanonicalId] = useState<string | null>(null);
  const [policy, setPolicy] = useState<MergePolicy>("keep_latest");
  const [auditComment, setAuditComment] = useState("");
  const [manualAmount, setManualAmount] = useState<string>("");
  const [manualTaxRate, setManualTaxRate] = useState<string>("");

  // Set suggested canonical when data loads
  const effectiveCanonicalId = canonicalId || group?.suggestedCanonicalId || null;

  const preview = useMemo(() => {
    if (!group?.rows || !effectiveCanonicalId) return null;

    const canonical = group.rows.find((r) => r.id === effectiveCanonicalId);
    if (!canonical) return null;

    if (policy === "keep_latest") {
      return {
        amount: canonical.amount,
        taxRate: canonical.tax_rate,
        meta: canonical.meta,
      };
    }
    if (policy === "sum_amounts") {
      const totalAmount = group.rows.reduce((s, r) => s + (r.amount || 0), 0);
      const mergedMeta = group.rows.reduce(
        (acc, r) => ({ ...acc, ...(r.meta as Record<string, unknown> || {}) }),
        {} as Record<string, unknown>
      );
      return { amount: totalAmount, taxRate: canonical.tax_rate, meta: mergedMeta };
    }
    // manual
    return {
      amount: manualAmount ? parseFloat(manualAmount) : canonical.amount,
      taxRate: manualTaxRate ? parseFloat(manualTaxRate) : canonical.tax_rate,
      meta: canonical.meta,
    };
  }, [group, effectiveCanonicalId, policy, manualAmount, manualTaxRate]);

  const deleteCount = group ? group.rows.length - 1 : 0;
  const isValid = auditComment.trim().length >= 5 && effectiveCanonicalId && preview;

  const handleMerge = async () => {
    if (!effectiveCanonicalId || !isValid) return;

    const req: MergeRequest = {
      canonicalId: effectiveCanonicalId,
      mergePolicy: policy,
      auditComment: auditComment.trim(),
      runId: `manual-${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID().slice(0, 8)}`,
    };

    if (policy === "manual") {
      req.mergedValues = {
        amount: preview?.amount,
        taxRate: preview?.taxRate,
        meta: preview?.meta as Record<string, unknown>,
      };
    }

    const result = await mergeMutation.mutateAsync(req);
    onResolved?.({ canonicalId: result.canonicalId, deletedCount: result.deletedCount });
    onOpenChange(false);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatAmount = (n: number) =>
    n.toLocaleString("de-AT", { style: "currency", currency: "EUR" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Duplikat auflösen
          </DialogTitle>
          <DialogDescription>
            Wählen Sie die kanonische Zeile und die Merge-Strategie.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Fehler beim Laden: {(error as Error).message}
            </AlertDescription>
          </Alert>
        )}

        {group && (
          <div className="space-y-4">
            {/* Group info */}
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{group.lineType}</Badge>
              <span className="font-mono">{group.normalizedDescription}</span>
            </div>

            {/* Row selection */}
            <div className="space-y-2">
              <Label>Kanonische Zeile wählen</Label>
              <RadioGroup
                value={effectiveCanonicalId || ""}
                onValueChange={setCanonicalId}
                aria-label="Kanonische Zeile wählen"
              >
                {group.rows.map((row: DuplicateRow) => (
                  <label
                    key={row.id}
                    className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                      effectiveCanonicalId === row.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value={row.id} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {row.id.slice(0, 8)}…
                        </span>
                        {row.id === group.suggestedCanonicalId && (
                          <Badge variant="secondary" className="text-xs">
                            Empfohlen
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-4 mt-1 text-sm">
                        <span className="font-medium">{formatAmount(row.amount)}</span>
                        <span className="text-muted-foreground">{formatDate(row.created_at)}</span>
                        {row.meta && Object.keys(row.meta).length > 0 && (
                          <span className="text-muted-foreground text-xs">
                            meta: {JSON.stringify(row.meta).slice(0, 40)}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Merge policy */}
            <div className="space-y-2">
              <Label>Merge-Strategie</Label>
              <RadioGroup
                value={policy}
                onValueChange={(v) => setPolicy(v as MergePolicy)}
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="keep_latest" />
                  <span className="text-sm">Neueste behalten</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="sum_amounts" />
                  <span className="text-sm">Beträge summieren</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="manual" />
                  <span className="text-sm">Manuell bearbeiten</span>
                </label>
              </RadioGroup>
            </div>

            {/* Manual fields */}
            {policy === "manual" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="manual-amount">Betrag (€)</Label>
                  <Input
                    id="manual-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    placeholder={String(
                      group.rows.find((r) => r.id === effectiveCanonicalId)?.amount ?? 0
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="manual-tax">USt-Satz</Label>
                  <Input
                    id="manual-tax"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={manualTaxRate}
                    onChange={(e) => setManualTaxRate(e.target.value)}
                    placeholder={String(
                      group.rows.find((r) => r.id === effectiveCanonicalId)?.tax_rate ?? 0
                    )}
                  />
                </div>
              </div>
            )}

            {/* Preview */}
            {preview && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                <Label className="text-xs text-muted-foreground">Merge-Vorschau</Label>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Betrag: </span>
                    <span className="font-medium">{formatAmount(preview.amount)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">USt: </span>
                    <span className="font-medium">{((preview.taxRate || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Zu löschen: </span>
                    <span className="font-medium text-destructive">{deleteCount}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Audit comment */}
            <div className="space-y-2">
              <Label htmlFor="audit-comment">
                Audit-Kommentar <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="audit-comment"
                value={auditComment}
                onChange={(e) => setAuditComment(e.target.value)}
                placeholder="Grund für die Zusammenführung (min. 5 Zeichen)…"
                aria-required="true"
                className="min-h-[80px]"
              />
              {auditComment.length > 0 && auditComment.trim().length < 5 && (
                <p className="text-xs text-destructive">Mindestens 5 Zeichen erforderlich</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleMerge}
            disabled={!isValid || mergeMutation.isPending}
          >
            {mergeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Merge bestätigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
