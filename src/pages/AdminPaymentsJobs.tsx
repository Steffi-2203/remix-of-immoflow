import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Briefcase, CreditCard, Percent, RefreshCw,
  CheckCircle, XCircle, Clock, Loader2, AlertTriangle,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useOverpayments, useInterestAccruals, useJobs } from "@/hooks/useAdminLedger";

function JobStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Erledigt</Badge>;
    case "failed":
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Fehlgeschlagen</Badge>;
    case "processing":
      return <Badge className="bg-blue-600"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Läuft</Badge>;
    case "retrying":
      return <Badge variant="secondary"><RefreshCw className="h-3 w-3 mr-1" />Retry</Badge>;
    case "pending":
      return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Wartend</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function LedgerTypeBadge({ type }: { type: string }) {
  switch (type) {
    case "credit":
      return <Badge className="bg-emerald-600">Guthaben</Badge>;
    case "interest":
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">Zinsen</Badge>;
    case "fee":
      return <Badge variant="destructive">Mahngebühr</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

function formatDate(d: string | null | undefined) {
  if (!d) return "–";
  try {
    return format(new Date(d), "dd.MM.yy HH:mm", { locale: de });
  } catch {
    return d;
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" }).format(amount);
}

function PaginationControls({ page, totalPages, onPageChange }: {
  page: number; totalPages: number; onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">Seite {page} von {totalPages}</p>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminPaymentsJobs() {
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [overpaymentPage, setOverpaymentPage] = useState(1);
  const [interestPage, setInterestPage] = useState(1);

  const { data: jobs, isLoading: jobsLoading, mutate: refreshJobs } = useJobs(
    jobFilter === "all" ? undefined : jobFilter
  );
  const { data: overpayments, isLoading: opLoading } = useOverpayments(overpaymentPage);
  const { data: interest, isLoading: intLoading } = useInterestAccruals(interestPage);

  const failedCount = jobs?.filter((j) => j.status === "failed").length ?? 0;
  const totalOverpayments = overpayments?.pagination?.total ?? 0;
  const totalInterest = interest?.pagination?.total ?? 0;
  const interestSum = interest?.data?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;
  const overpaymentSum = overpayments?.data?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;

  return (
    <MainLayout title="Payments & Jobs" subtitle="Admin-Übersicht: Background-Jobs, Überzahlungen, Verzugszinsen">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Fehlgeschlagene Jobs</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <AlertTriangle className={`h-5 w-5 ${failedCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                {jobsLoading ? <Skeleton className="h-8 w-12" /> : failedCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Jobs gesamt</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                {jobsLoading ? <Skeleton className="h-8 w-12" /> : jobs?.length ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Überzahlungen</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-500" />
                {opLoading ? <Skeleton className="h-8 w-16" /> : formatCurrency(overpaymentSum)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground">{totalOverpayments} Einträge</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Verzugszinsen + Gebühren</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Percent className="h-5 w-5 text-amber-500" />
                {intLoading ? <Skeleton className="h-8 w-16" /> : formatCurrency(interestSum)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground">{totalInterest} Einträge</p>
            </CardContent>
          </Card>
        </div>

        {/* Jobs Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Background Jobs
                </CardTitle>
                <CardDescription>Job-Queue Status und Fehler</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={jobFilter} onValueChange={setJobFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="pending">Wartend</SelectItem>
                    <SelectItem value="processing">Läuft</SelectItem>
                    <SelectItem value="completed">Erledigt</SelectItem>
                    <SelectItem value="failed">Fehlgeschlagen</SelectItem>
                    <SelectItem value="retrying">Retry</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => refreshJobs()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : !jobs?.length ? (
              <p className="text-center py-8 text-muted-foreground">Keine Jobs gefunden</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Priorität</TableHead>
                      <TableHead>Versuche</TableHead>
                      <TableHead>Erstellt</TableHead>
                      <TableHead>Fehler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id} className={job.status === "failed" ? "bg-destructive/5" : ""}>
                        <TableCell><JobStatusBadge status={job.status} /></TableCell>
                        <TableCell className="font-mono text-sm">{job.job_type}</TableCell>
                        <TableCell>{job.priority}</TableCell>
                        <TableCell>{job.retry_count}/{job.max_retries}</TableCell>
                        <TableCell className="text-sm">{formatDate(job.created_at)}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-destructive">
                          {job.error || "–"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Two-column: Overpayments + Interest */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overpayments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-500" />
                Überzahlungen (Guthaben)
              </CardTitle>
              <CardDescription>Mieter mit offenen Guthaben aus Überzahlungen</CardDescription>
            </CardHeader>
            <CardContent>
              {opLoading ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : !overpayments?.data?.length ? (
                <p className="text-center py-6 text-muted-foreground">Keine Überzahlungen vorhanden</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mieter</TableHead>
                        <TableHead className="text-right">Betrag</TableHead>
                        <TableHead>Datum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overpayments.data.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            {entry.first_name} {entry.last_name}
                          </TableCell>
                          <TableCell className="text-right font-mono text-emerald-600">
                            {formatCurrency(Number(entry.amount))}
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(entry.booking_date)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <PaginationControls
                    page={overpaymentPage}
                    totalPages={overpayments.pagination.totalPages}
                    onPageChange={setOverpaymentPage}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Interest + Fees */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-amber-500" />
                Verzugszinsen & Mahngebühren
              </CardTitle>
              <CardDescription>§1333 ABGB Zinsen und Mahngebühren nach Stufe</CardDescription>
            </CardHeader>
            <CardContent>
              {intLoading ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : !interest?.data?.length ? (
                <p className="text-center py-6 text-muted-foreground">Keine Verzugszinsen vorhanden</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mieter</TableHead>
                        <TableHead>Typ</TableHead>
                        <TableHead className="text-right">Betrag</TableHead>
                        <TableHead>Datum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {interest.data.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            {entry.first_name} {entry.last_name}
                          </TableCell>
                          <TableCell><LedgerTypeBadge type={entry.type} /></TableCell>
                          <TableCell className="text-right font-mono text-amber-600">
                            {formatCurrency(Number(entry.amount))}
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(entry.booking_date)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <PaginationControls
                    page={interestPage}
                    totalPages={interest.pagination.totalPages}
                    onPageChange={setInterestPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
