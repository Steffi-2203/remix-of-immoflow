import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDemoData } from '@/contexts/DemoDataContext';

export type ExpenseCategory = 'betriebskosten_umlagefaehig' | 'instandhaltung' | 'sonstige_kosten';
export type ExpenseType = 
  | 'versicherung'
  | 'grundsteuer'
  | 'muellabfuhr'
  | 'wasser_abwasser'
  | 'heizung'
  | 'strom_allgemein'
  | 'hausbetreuung'
  | 'lift'
  | 'gartenpflege'
  | 'schneeraeumung'
  | 'verwaltung'
  | 'ruecklage'
  | 'reparatur'
  | 'sanierung'
  | 'sonstiges'
  | 'makler'
  | 'notar'
  | 'grundbuch'
  | 'finanzierung';

export interface Expense {
  id: string;
  property_id: string;
  category: ExpenseCategory;
  expense_type: ExpenseType;
  bezeichnung: string;
  betrag: number;
  datum: string;
  beleg_nummer: string | null;
  beleg_url: string | null;
  notizen: string | null;
  year: number;
  month: number;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseInsert {
  property_id: string;
  category: ExpenseCategory;
  expense_type?: ExpenseType;
  bezeichnung: string;
  betrag: number;
  datum: string;
  beleg_nummer?: string;
  notizen?: string;
  year: number;
  month: number;
}

export interface ExpenseUpdate extends Partial<ExpenseInsert> {
  id: string;
}

export function useExpenses(propertyId?: string, year?: number, month?: number) {
  const { isDemoMode, expenses: demoExpenses } = useDemoData();

  const realQuery = useQuery({
    queryKey: ['expenses', propertyId, year, month],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select('*, properties(name)')
        .order('datum', { ascending: false });
      
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }
      if (year) {
        query = query.eq('year', year);
      }
      if (month) {
        query = query.eq('month', month);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as (Expense & { properties: { name: string } })[];
    },
    enabled: !isDemoMode,
  });

  if (isDemoMode) {
    let filtered = [...demoExpenses] as any[];
    if (propertyId) filtered = filtered.filter(e => e.property_id === propertyId);
    if (year) filtered = filtered.filter(e => e.year === year);
    if (month) filtered = filtered.filter(e => e.month === month);
    return { data: filtered, isLoading: false, error: null, isError: false };
  }

  return realQuery;
}

export function useExpensesByCategory(propertyId?: string, year?: number) {
  const { isDemoMode, expenses: demoExpenses } = useDemoData();

  const realQuery = useQuery({
    queryKey: ['expenses', 'by-category', propertyId, year],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select('*')
        .order('datum', { ascending: false });
      
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }
      if (year) {
        query = query.eq('year', year);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;

      const expenses = data as Expense[];
      
      const betriebskosten = expenses.filter(e => e.category === 'betriebskosten_umlagefaehig');
      const instandhaltung = expenses.filter(e => e.category === 'instandhaltung');
      
      return {
        betriebskosten,
        instandhaltung,
        totalBetriebskosten: betriebskosten.reduce((sum, e) => sum + Number(e.betrag), 0),
        totalInstandhaltung: instandhaltung.reduce((sum, e) => sum + Number(e.betrag), 0),
        total: expenses.reduce((sum, e) => sum + Number(e.betrag), 0),
      };
    },
    enabled: !isDemoMode,
  });

  if (isDemoMode) {
    let filtered = [...demoExpenses] as Expense[];
    if (propertyId) filtered = filtered.filter(e => e.property_id === propertyId) as Expense[];
    if (year) filtered = filtered.filter(e => e.year === year) as Expense[];
    
    const betriebskosten = filtered.filter(e => e.category === 'betriebskosten_umlagefaehig');
    const instandhaltung = filtered.filter(e => e.category === 'instandhaltung');
    
    return {
      data: {
        betriebskosten,
        instandhaltung,
        totalBetriebskosten: betriebskosten.reduce((sum, e) => sum + Number(e.betrag), 0),
        totalInstandhaltung: instandhaltung.reduce((sum, e) => sum + Number(e.betrag), 0),
        total: filtered.reduce((sum, e) => sum + Number(e.betrag), 0),
      },
      isLoading: false,
      error: null,
      isError: false,
    };
  }

  return realQuery;
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { isDemoMode, addExpense } = useDemoData();
  
  return useMutation({
    mutationFn: async (expense: ExpenseInsert) => {
      if (isDemoMode) {
        return addExpense(expense as any);
      }
      const { data, error } = await supabase
        .from('expenses')
        .insert(expense)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Kosten erfolgreich erfasst');
    },
    onError: (error) => {
      toast.error('Fehler beim Erfassen der Kosten');
      console.error('Create expense error:', error);
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  const { isDemoMode, updateExpense: updateDemoExpense } = useDemoData();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: ExpenseUpdate) => {
      if (isDemoMode) {
        updateDemoExpense(id, updates as any);
        return { id, ...updates };
      }
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Kosten aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren der Kosten');
      console.error('Update expense error:', error);
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const { isDemoMode, deleteExpense: deleteDemoExpense } = useDemoData();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        deleteDemoExpense(id);
        return;
      }
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Kosten gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen der Kosten');
      console.error('Delete expense error:', error);
    },
  });
}

// Labels for UI
export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  betriebskosten_umlagefaehig: 'Betriebskosten (umlagefähig)',
  instandhaltung: 'Instandhaltung',
  sonstige_kosten: 'Sonstige Kosten',
};

export const expenseTypeLabels: Record<ExpenseType, string> = {
  versicherung: 'Versicherung',
  grundsteuer: 'Grundsteuer',
  muellabfuhr: 'Müllabfuhr',
  wasser_abwasser: 'Wasser/Abwasser',
  heizung: 'Heizung',
  strom_allgemein: 'Strom Allgemein',
  hausbetreuung: 'Hausbetreuung',
  lift: 'Lift',
  gartenpflege: 'Gartenpflege',
  schneeraeumung: 'Schneeräumung',
  verwaltung: 'Verwaltung',
  ruecklage: 'Rücklage',
  reparatur: 'Reparatur',
  sanierung: 'Sanierung',
  sonstiges: 'Sonstiges',
  makler: 'Makler',
  notar: 'Notar',
  grundbuch: 'Grundbuchkosten',
  finanzierung: 'Finanzierung',
};

export const expenseTypesByCategory: Record<ExpenseCategory, ExpenseType[]> = {
  betriebskosten_umlagefaehig: [
    'versicherung', 'grundsteuer', 'muellabfuhr', 'wasser_abwasser',
    'heizung', 'strom_allgemein', 'hausbetreuung', 'lift',
    'gartenpflege', 'schneeraeumung', 'verwaltung', 'ruecklage', 'sonstiges',
  ],
  instandhaltung: ['reparatur', 'sanierung', 'sonstiges'],
  sonstige_kosten: ['makler', 'notar', 'grundbuch', 'finanzierung', 'sonstiges'],
};
