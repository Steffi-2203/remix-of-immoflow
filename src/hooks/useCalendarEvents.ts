import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns';

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: 'maintenance' | 'rental_end' | 'rental_start' | 'invoice' | 'task';
  propertyName?: string;
  unitNumber?: string;
  link?: string;
}

const EVENT_COLORS = {
  maintenance: 'bg-orange-500',
  rental_end: 'bg-red-500',
  rental_start: 'bg-green-500',
  invoice: 'bg-blue-500',
  task: 'bg-purple-500',
} as const;

export function getEventColor(type: CalendarEvent['type']): string {
  return EVENT_COLORS[type];
}

export function useCalendarEvents(year: number, month: number) {
  const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['calendarEvents', year, month],
    queryFn: async () => {
      const events: CalendarEvent[] = [];

      // 1. Maintenance contracts - next due dates
      const { data: contracts } = await supabase
        .from('maintenance_contracts')
        .select('id, title, next_due_date, property_id, properties(name)')
        .gte('next_due_date', startDate)
        .lte('next_due_date', endDate)
        .eq('is_active', true);

      if (contracts) {
        contracts.forEach((contract: any) => {
          events.push({
            id: `mc-${contract.id}`,
            date: contract.next_due_date,
            title: contract.title,
            type: 'maintenance',
            propertyName: contract.properties?.name,
            link: `/liegenschaften/${contract.property_id}`,
          });
        });
      }

      // 2. Tenant rental ends
      const { data: tenantsEnding } = await supabase
        .from('tenants')
        .select('id, first_name, last_name, mietende, unit_id, units(top_nummer, property_id, properties(name))')
        .gte('mietende', startDate)
        .lte('mietende', endDate)
        .eq('status', 'aktiv');

      if (tenantsEnding) {
        tenantsEnding.forEach((tenant: any) => {
          events.push({
            id: `te-${tenant.id}`,
            date: tenant.mietende,
            title: `Mietende: ${tenant.first_name} ${tenant.last_name}`,
            type: 'rental_end',
            propertyName: tenant.units?.properties?.name,
            unitNumber: tenant.units?.top_nummer,
            link: `/mieter/${tenant.id}/bearbeiten`,
          });
        });
      }

      // 3. Tenant rental starts (future starts)
      const { data: tenantsStarting } = await supabase
        .from('tenants')
        .select('id, first_name, last_name, mietbeginn, unit_id, units(top_nummer, property_id, properties(name))')
        .gte('mietbeginn', startDate)
        .lte('mietbeginn', endDate);

      if (tenantsStarting) {
        tenantsStarting.forEach((tenant: any) => {
          events.push({
            id: `ts-${tenant.id}`,
            date: tenant.mietbeginn,
            title: `Mietbeginn: ${tenant.first_name} ${tenant.last_name}`,
            type: 'rental_start',
            propertyName: tenant.units?.properties?.name,
            unitNumber: tenant.units?.top_nummer,
            link: `/mieter/${tenant.id}/bearbeiten`,
          });
        });
      }

      // 4. Monthly invoices due dates
      const { data: invoices } = await supabase
        .from('monthly_invoices')
        .select('id, faellig_am, month, year, tenant_id, tenants(first_name, last_name, unit_id, units(top_nummer, properties(name)))')
        .gte('faellig_am', startDate)
        .lte('faellig_am', endDate)
        .eq('status', 'offen');

      if (invoices) {
        invoices.forEach((invoice: any) => {
          events.push({
            id: `inv-${invoice.id}`,
            date: invoice.faellig_am,
            title: `Fällig: ${invoice.tenants?.first_name} ${invoice.tenants?.last_name}`,
            type: 'invoice',
            propertyName: invoice.tenants?.units?.properties?.name,
            unitNumber: invoice.tenants?.units?.top_nummer,
            link: '/zahlungen?tab=invoices',
          });
        });
      }

      // 5. Maintenance tasks due dates
      const { data: tasks } = await supabase
        .from('maintenance_tasks')
        .select('id, title, due_date, property_id, properties(name)')
        .gte('due_date', startDate)
        .lte('due_date', endDate)
        .neq('status', 'abgeschlossen');

      if (tasks) {
        tasks.forEach((task: any) => {
          if (task.due_date) {
            events.push({
              id: `task-${task.id}`,
              date: task.due_date,
              title: task.title,
              type: 'task',
              propertyName: task.properties?.name,
              link: '/wartungen',
            });
          }
        });
      }

      return events;
    },
  });
}

export function groupEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>();
  
  events.forEach((event) => {
    const dateKey = event.date;
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(event);
  });
  
  return grouped;
}
