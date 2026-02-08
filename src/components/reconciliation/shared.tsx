import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Loader2, Ban, RotateCcw, RefreshCw } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:             { label: 'Wartend',          icon: Clock,        variant: 'outline' },
  running:             { label: 'Läuft',            icon: Loader2,      variant: 'secondary' },
  completed:           { label: 'Abgeschlossen',    icon: CheckCircle2, variant: 'default' },
  failed:              { label: 'Fehlgeschlagen',    icon: XCircle,     variant: 'destructive' },
  cancelled:           { label: 'Abgebrochen',      icon: Ban,          variant: 'outline' },
  rolled_back:         { label: 'Zurückgerollt',    icon: RotateCcw,    variant: 'destructive' },
  pending_reprocess:   { label: 'Reprocess wartend', icon: RefreshCw,   variant: 'secondary' },
};

export function RunStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className={`h-3 w-3 ${status === 'running' ? 'animate-spin' : ''}`} />
      {config.label}
    </Badge>
  );
}

export function ChunkStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    done: 'bg-primary/10 text-primary border-primary/20',
    failed: 'bg-destructive/10 text-destructive border-destructive/20',
    processing: 'bg-accent text-accent-foreground border-accent',
    pending: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
}

export function formatDuration(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt) return '–';
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  const seconds = Math.round((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}
