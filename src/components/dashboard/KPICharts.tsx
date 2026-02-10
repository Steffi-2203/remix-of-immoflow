import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInvoices } from '@/hooks/useInvoices';
import { usePayments } from '@/hooks/usePayments';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))', '#10b981', '#f59e0b'];

const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function fmt(n: number) {
  return `€ ${n.toLocaleString('de-AT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function KPICharts() {
  const currentYear = new Date().getFullYear();
  const { data: invoices = [] } = useInvoices(currentYear);
  const { data: prevYearInvoices = [] } = useInvoices(currentYear - 1);
  const { data: payments = [] } = usePayments();

  const monthlyData = useMemo(() => {
    return monthNames.map((name, i) => {
      const month = i + 1;
      const monthInvoices = invoices.filter((inv: any) => inv.month === month);
      const soll = monthInvoices.reduce((s: number, inv: any) => s + Number(inv.gesamtbetrag || 0), 0);
      const paid = monthInvoices.filter((inv: any) => inv.status === 'bezahlt')
        .reduce((s: number, inv: any) => s + Number(inv.gesamtbetrag || 0), 0);
      const overdue = monthInvoices.filter((inv: any) => inv.status === 'ueberfaellig')
        .reduce((s: number, inv: any) => s + Number(inv.gesamtbetrag || 0), 0);

      return { name, soll, bezahlt: paid, ueberfaellig: overdue };
    });
  }, [invoices]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    invoices.forEach((inv: any) => {
      const status = inv.status || 'offen';
      counts[status] = (counts[status] || 0) + 1;
    });
    const labels: Record<string, string> = {
      offen: 'Offen', bezahlt: 'Bezahlt', teilbezahlt: 'Teilbezahlt',
      ueberfaellig: 'Überfällig', storniert: 'Storniert',
    };
    return Object.entries(counts).map(([key, value]) => ({
      name: labels[key] || key,
      value,
    }));
  }, [invoices]);

  const rentTrend = useMemo(() => {
    return monthNames.map((name, i) => {
      const month = i + 1;
      const thisYear = invoices.filter((inv: any) => inv.month === month)
        .reduce((s: number, inv: any) => s + Number(inv.grundmiete || 0), 0);
      const lastYear = prevYearInvoices.filter((inv: any) => inv.month === month)
        .reduce((s: number, inv: any) => s + Number(inv.grundmiete || 0), 0);
      return { name, [currentYear]: thisYear, [currentYear - 1]: lastYear };
    });
  }, [invoices, prevYearInvoices, currentYear]);

  if (invoices.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Soll vs. Ist ({currentYear})</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis tickFormatter={(v) => fmt(v)} className="text-xs" />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Bar dataKey="soll" name="Soll" fill="hsl(var(--muted-foreground))" radius={[2, 2, 0, 0]} />
              <Bar dataKey="bezahlt" name="Bezahlt" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              <Bar dataKey="ueberfaellig" name="Überfällig" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Vorschreibungs-Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Mietentwicklung: {currentYear - 1} vs. {currentYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={rentTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis tickFormatter={(v) => fmt(v)} className="text-xs" />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Line type="monotone" dataKey={String(currentYear - 1)} stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey={String(currentYear)} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
