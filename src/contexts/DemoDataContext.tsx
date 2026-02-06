import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { 
  mockProperties, 
  mockUnits, 
  mockTenants, 
  mockTransactions,
  mockExpenses,
  mockPayments,
  mockBankAccounts,
  mockMaintenanceTasks,
  mockDashboardStats,
  type DemoProperty,
  type DemoUnit,
  type DemoTenant,
  type DemoTransaction,
  type DemoExpense,
  type DemoPayment,
  type DemoBankAccount,
  type DemoMaintenanceTask,
} from '@/data/mockData';
import { DashboardStats } from '@/types';

interface DemoDataContextType {
  isDemoMode: boolean;
  
  // Properties
  properties: DemoProperty[];
  addProperty: (property: Omit<DemoProperty, 'id' | 'created_at' | 'updated_at'>) => DemoProperty;
  updateProperty: (id: string, updates: Partial<DemoProperty>) => void;
  deleteProperty: (id: string) => void;
  
  // Units
  units: DemoUnit[];
  addUnit: (unit: Omit<DemoUnit, 'id' | 'created_at' | 'updated_at'>) => DemoUnit;
  updateUnit: (id: string, updates: Partial<DemoUnit>) => void;
  deleteUnit: (id: string) => void;
  
  // Tenants
  tenants: DemoTenant[];
  addTenant: (tenant: Omit<DemoTenant, 'id' | 'created_at' | 'updated_at'>) => DemoTenant;
  updateTenant: (id: string, updates: Partial<DemoTenant>) => void;
  deleteTenant: (id: string) => void;
  
  // Transactions
  transactions: DemoTransaction[];
  addTransaction: (transaction: Omit<DemoTransaction, 'id' | 'created_at' | 'updated_at'>) => DemoTransaction;
  updateTransaction: (id: string, updates: Partial<DemoTransaction>) => void;
  deleteTransaction: (id: string) => void;
  
  // Expenses
  expenses: DemoExpense[];
  addExpense: (expense: Omit<DemoExpense, 'id' | 'created_at' | 'updated_at'>) => DemoExpense;
  updateExpense: (id: string, updates: Partial<DemoExpense>) => void;
  deleteExpense: (id: string) => void;
  
  // Payments
  payments: DemoPayment[];
  addPayment: (payment: Omit<DemoPayment, 'id' | 'created_at'>) => DemoPayment;
  updatePayment: (id: string, updates: Partial<DemoPayment>) => void;
  deletePayment: (id: string) => void;
  
  // Bank Accounts
  bankAccounts: DemoBankAccount[];
  addBankAccount: (account: Omit<DemoBankAccount, 'id' | 'created_at' | 'updated_at'>) => DemoBankAccount;
  updateBankAccount: (id: string, updates: Partial<DemoBankAccount>) => void;
  deleteBankAccount: (id: string) => void;
  
  // Maintenance Tasks
  maintenanceTasks: DemoMaintenanceTask[];
  addMaintenanceTask: (task: Omit<DemoMaintenanceTask, 'id' | 'created_at' | 'updated_at'>) => DemoMaintenanceTask;
  updateMaintenanceTask: (id: string, updates: Partial<DemoMaintenanceTask>) => void;
  deleteMaintenanceTask: (id: string) => void;
  
  // Dashboard Stats
  dashboardStats: DashboardStats;
}

const DemoDataContext = createContext<DemoDataContextType | null>(null);

export function useDemoData(): DemoDataContextType {
  const context = useContext(DemoDataContext);
  if (!context) {
    // Return non-demo mode defaults when context is not available
    return {
      isDemoMode: false,
      properties: [],
      addProperty: () => ({ id: '' } as DemoProperty),
      updateProperty: () => {},
      deleteProperty: () => {},
      units: [],
      addUnit: () => ({ id: '' } as DemoUnit),
      updateUnit: () => {},
      deleteUnit: () => {},
      tenants: [],
      addTenant: () => ({ id: '' } as DemoTenant),
      updateTenant: () => {},
      deleteTenant: () => {},
      transactions: [],
      addTransaction: () => ({ id: '' } as DemoTransaction),
      updateTransaction: () => {},
      deleteTransaction: () => {},
      expenses: [],
      addExpense: () => ({ id: '' } as DemoExpense),
      updateExpense: () => {},
      deleteExpense: () => {},
      payments: [],
      addPayment: () => ({ id: '' } as DemoPayment),
      updatePayment: () => {},
      deletePayment: () => {},
      bankAccounts: [],
      addBankAccount: () => ({ id: '' } as DemoBankAccount),
      updateBankAccount: () => {},
      deleteBankAccount: () => {},
      maintenanceTasks: [],
      addMaintenanceTask: () => ({ id: '' } as DemoMaintenanceTask),
      updateMaintenanceTask: () => {},
      deleteMaintenanceTask: () => {},
      dashboardStats: mockDashboardStats,
    };
  }
  return context;
}

function generateId(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function DemoDataProvider({ children }: { children: ReactNode }) {
  const { data: role } = useUserRole();
  const isDemoMode = role === 'tester';
  
  // Initialize state with mock data
  const [properties, setProperties] = useState<DemoProperty[]>(() => [...mockProperties]);
  const [units, setUnits] = useState<DemoUnit[]>(() => [...mockUnits]);
  const [tenants, setTenants] = useState<DemoTenant[]>(() => [...mockTenants]);
  const [transactions, setTransactions] = useState<DemoTransaction[]>(() => [...mockTransactions]);
  const [expenses, setExpenses] = useState<DemoExpense[]>(() => [...mockExpenses]);
  const [payments, setPayments] = useState<DemoPayment[]>(() => [...mockPayments]);
  const [bankAccounts, setBankAccounts] = useState<DemoBankAccount[]>(() => [...mockBankAccounts]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<DemoMaintenanceTask[]>(() => [...mockMaintenanceTasks]);
  
  // Properties CRUD
  const addProperty = useCallback((property: Omit<DemoProperty, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const newProperty: DemoProperty = {
      ...property,
      id: generateId(),
      created_at: now,
      updated_at: now,
    };
    setProperties(prev => [newProperty, ...prev]);
    return newProperty;
  }, []);
  
  const updateProperty = useCallback((id: string, updates: Partial<DemoProperty>) => {
    setProperties(prev => prev.map(p => 
      p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
    ));
  }, []);
  
  const deleteProperty = useCallback((id: string) => {
    setProperties(prev => prev.filter(p => p.id !== id));
    // Also delete related units and their tenants
    setUnits(prev => prev.filter(u => u.property_id !== id));
  }, []);
  
  // Units CRUD
  const addUnit = useCallback((unit: Omit<DemoUnit, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const newUnit: DemoUnit = {
      ...unit,
      id: generateId(),
      created_at: now,
      updated_at: now,
    } as DemoUnit;
    setUnits(prev => [newUnit, ...prev]);
    return newUnit;
  }, []);
  
  const updateUnit = useCallback((id: string, updates: Partial<DemoUnit>) => {
    setUnits(prev => prev.map(u => 
      u.id === id ? { ...u, ...updates, updated_at: new Date().toISOString() } : u
    ));
  }, []);
  
  const deleteUnit = useCallback((id: string) => {
    setUnits(prev => prev.filter(u => u.id !== id));
  }, []);
  
  // Tenants CRUD
  const addTenant = useCallback((tenant: Omit<DemoTenant, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const newTenant: DemoTenant = {
      ...tenant,
      id: generateId(),
      created_at: now,
      updated_at: now,
    };
    setTenants(prev => [newTenant, ...prev]);
    return newTenant;
  }, []);
  
  const updateTenant = useCallback((id: string, updates: Partial<DemoTenant>) => {
    setTenants(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
    ));
  }, []);
  
  const deleteTenant = useCallback((id: string) => {
    setTenants(prev => prev.filter(t => t.id !== id));
  }, []);
  
  // Transactions CRUD
  const addTransaction = useCallback((transaction: Omit<DemoTransaction, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const newTransaction: DemoTransaction = {
      ...transaction,
      id: generateId(),
      created_at: now,
      updated_at: now,
    };
    setTransactions(prev => [newTransaction, ...prev]);
    return newTransaction;
  }, []);
  
  const updateTransaction = useCallback((id: string, updates: Partial<DemoTransaction>) => {
    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
    ));
  }, []);
  
  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);
  
  // Expenses CRUD
  const addExpense = useCallback((expense: Omit<DemoExpense, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const newExpense: DemoExpense = {
      ...expense,
      id: generateId(),
      created_at: now,
      updated_at: now,
    };
    setExpenses(prev => [newExpense, ...prev]);
    return newExpense;
  }, []);
  
  const updateExpense = useCallback((id: string, updates: Partial<DemoExpense>) => {
    setExpenses(prev => prev.map(e => 
      e.id === id ? { ...e, ...updates, updated_at: new Date().toISOString() } : e
    ));
  }, []);
  
  const deleteExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);
  
  // Payments CRUD
  const addPayment = useCallback((payment: Omit<DemoPayment, 'id' | 'created_at'>) => {
    const now = new Date().toISOString();
    const newPayment: DemoPayment = {
      ...payment,
      id: generateId(),
      created_at: now,
    };
    setPayments(prev => [newPayment, ...prev]);
    return newPayment;
  }, []);
  
  const updatePayment = useCallback((id: string, updates: Partial<DemoPayment>) => {
    setPayments(prev => prev.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ));
  }, []);
  
  const deletePayment = useCallback((id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  }, []);
  
  // Bank Accounts CRUD
  const addBankAccount = useCallback((account: Omit<DemoBankAccount, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const newAccount: DemoBankAccount = {
      ...account,
      id: generateId(),
      created_at: now,
      updated_at: now,
    };
    setBankAccounts(prev => [newAccount, ...prev]);
    return newAccount;
  }, []);
  
  const updateBankAccount = useCallback((id: string, updates: Partial<DemoBankAccount>) => {
    setBankAccounts(prev => prev.map(a => 
      a.id === id ? { ...a, ...updates, updated_at: new Date().toISOString() } : a
    ));
  }, []);
  
  const deleteBankAccount = useCallback((id: string) => {
    setBankAccounts(prev => prev.filter(a => a.id !== id));
  }, []);
  
  // Maintenance Tasks CRUD
  const addMaintenanceTask = useCallback((task: Omit<DemoMaintenanceTask, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const newTask: DemoMaintenanceTask = {
      ...task,
      id: generateId(),
      created_at: now,
      updated_at: now,
    };
    setMaintenanceTasks(prev => [newTask, ...prev]);
    return newTask;
  }, []);
  
  const updateMaintenanceTask = useCallback((id: string, updates: Partial<DemoMaintenanceTask>) => {
    setMaintenanceTasks(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
    ));
  }, []);
  
  const deleteMaintenanceTask = useCallback((id: string) => {
    setMaintenanceTasks(prev => prev.filter(t => t.id !== id));
  }, []);
  
  // Calculate dashboard stats dynamically
  const dashboardStats = useMemo((): DashboardStats => {
    const occupiedUnits = units.filter(u => u.status === 'vermietet').length;
    const vacantUnits = units.filter(u => u.status === 'leerstand').length;
    const activeTenants = tenants.filter(t => t.status === 'aktiv');
    
    const monthlyRevenue = activeTenants.reduce((sum, t) => 
      sum + (t.grundmiete || 0) + (t.betriebskosten_vorschuss || 0) + (t.heizungskosten_vorschuss || 0), 0
    );
    
    return {
      totalProperties: properties.length,
      totalUnits: units.length,
      occupiedUnits,
      vacantUnits,
      totalTenants: activeTenants.length,
      monthlyRevenue,
      monthlyBetriebskosten: mockDashboardStats.monthlyBetriebskosten,
      openInvoices: mockDashboardStats.openInvoices,
      overdueAmount: mockDashboardStats.overdueAmount,
    };
  }, [properties, units, tenants]);
  
  const value = useMemo((): DemoDataContextType => ({
    isDemoMode,
    properties,
    addProperty,
    updateProperty,
    deleteProperty,
    units,
    addUnit,
    updateUnit,
    deleteUnit,
    tenants,
    addTenant,
    updateTenant,
    deleteTenant,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    payments,
    addPayment,
    updatePayment,
    deletePayment,
    bankAccounts,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    maintenanceTasks,
    addMaintenanceTask,
    updateMaintenanceTask,
    deleteMaintenanceTask,
    dashboardStats,
  }), [
    isDemoMode,
    properties, addProperty, updateProperty, deleteProperty,
    units, addUnit, updateUnit, deleteUnit,
    tenants, addTenant, updateTenant, deleteTenant,
    transactions, addTransaction, updateTransaction, deleteTransaction,
    expenses, addExpense, updateExpense, deleteExpense,
    payments, addPayment, updatePayment, deletePayment,
    bankAccounts, addBankAccount, updateBankAccount, deleteBankAccount,
    maintenanceTasks, addMaintenanceTask, updateMaintenanceTask, deleteMaintenanceTask,
    dashboardStats,
  ]);
  
  return (
    <DemoDataContext.Provider value={value}>
      {children}
    </DemoDataContext.Provider>
  );
}
