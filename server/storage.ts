import { db } from "./db";
import { eq, and, desc, asc, isNull } from "drizzle-orm";
import * as schema from "@shared/schema";

export interface IStorage {
  getOrganizations(): Promise<schema.Organization[]>;
  getOrganization(id: string): Promise<schema.Organization | undefined>;
  getProperties(): Promise<schema.Property[]>;
  getPropertiesByOrganization(organizationId?: string): Promise<schema.Property[]>;
  getProperty(id: string): Promise<schema.Property | undefined>;
  getUnitsByProperty(propertyId: string): Promise<schema.Unit[]>;
  getUnitsByOrganization(organizationId?: string): Promise<schema.Unit[]>;
  getUnit(id: string): Promise<schema.Unit | undefined>;
  getTenants(): Promise<schema.Tenant[]>;
  getTenantsByOrganization(organizationId?: string): Promise<schema.Tenant[]>;
  getTenant(id: string): Promise<schema.Tenant | undefined>;
  getTenantsByUnit(unitId: string): Promise<schema.Tenant[]>;
  getMonthlyInvoices(year?: number, month?: number): Promise<schema.MonthlyInvoice[]>;
  getMonthlyInvoicesByOrganization(organizationId?: string, year?: number, month?: number): Promise<schema.MonthlyInvoice[]>;
  getInvoicesByTenant(tenantId: string): Promise<schema.MonthlyInvoice[]>;
  getAllPayments(): Promise<schema.Payment[]>;
  getPaymentsByOrganization(organizationId?: string): Promise<schema.Payment[]>;
  getPaymentsByTenant(tenantId: string): Promise<schema.Payment[]>;
  getExpensesByProperty(propertyId: string, year?: number): Promise<schema.Expense[]>;
  getExpensesByOrganization(organizationId?: string): Promise<schema.Expense[]>;
  getExpense(id: string): Promise<schema.Expense | undefined>;
  getBankAccounts(): Promise<schema.BankAccount[]>;
  getBankAccount(id: string): Promise<schema.BankAccount | undefined>;
  getBankAccountsByOrganization(organizationId?: string): Promise<schema.BankAccount[]>;
  getTransactionsByBankAccount(bankAccountId: string): Promise<schema.Transaction[]>;
  getTransactionsByOrganization(organizationId?: string): Promise<schema.Transaction[]>;
  getSettlementsByProperty(propertyId: string): Promise<schema.Settlement[]>;
  getMaintenanceContractsByProperty(propertyId: string): Promise<schema.MaintenanceContract[]>;
  getMaintenanceTasks(status?: string): Promise<schema.MaintenanceTask[]>;
  getMaintenanceTasksByOrganization(organizationId?: string, status?: string): Promise<schema.MaintenanceTask[]>;
  getContractors(): Promise<schema.Contractor[]>;
  getContractorsByOrganization(organizationId?: string): Promise<schema.Contractor[]>;
  getDistributionKeys(): Promise<schema.DistributionKey[]>;
  softDeleteUnit(id: string): Promise<void>;
  softDeleteTenant(id: string): Promise<void>;
  getRentHistoryByTenant(tenantId: string): Promise<schema.RentHistory[]>;
  createRentHistory(data: schema.InsertRentHistory): Promise<schema.RentHistory>;
}

class DatabaseStorage implements IStorage {
  async getOrganizations(): Promise<schema.Organization[]> {
    return db.select().from(schema.organizations).orderBy(asc(schema.organizations.name));
  }

  async getOrganization(id: string): Promise<schema.Organization | undefined> {
    const result = await db.select().from(schema.organizations).where(eq(schema.organizations.id, id)).limit(1);
    return result[0];
  }

  async getProperties(): Promise<schema.Property[]> {
    return db.select().from(schema.properties)
      .where(isNull(schema.properties.deletedAt))
      .orderBy(asc(schema.properties.name));
  }

  async getPropertiesByOrganization(organizationId?: string): Promise<schema.Property[]> {
    if (!organizationId) return [];
    return db.select().from(schema.properties)
      .where(and(
        eq(schema.properties.organizationId, organizationId),
        isNull(schema.properties.deletedAt)
      ))
      .orderBy(asc(schema.properties.name));
  }

  async getProperty(id: string): Promise<schema.Property | undefined> {
    const result = await db.select().from(schema.properties)
      .where(and(eq(schema.properties.id, id), isNull(schema.properties.deletedAt)))
      .limit(1);
    return result[0];
  }

  async getUnitsByProperty(propertyId: string): Promise<schema.Unit[]> {
    return db.select().from(schema.units)
      .where(and(
        eq(schema.units.propertyId, propertyId),
        isNull(schema.units.deletedAt)
      ))
      .orderBy(asc(schema.units.topNummer));
  }

  async getTenants(): Promise<schema.Tenant[]> {
    return db.select().from(schema.tenants)
      .where(isNull(schema.tenants.deletedAt))
      .orderBy(asc(schema.tenants.lastName));
  }

  async getTenantsByOrganization(organizationId?: string): Promise<schema.Tenant[]> {
    if (!organizationId) return [];
    const units = await this.getUnitsByOrganization(organizationId);
    if (units.length === 0) return [];
    const allTenants: schema.Tenant[] = [];
    for (const unit of units) {
      const tenants = await db.select().from(schema.tenants)
        .where(and(
          eq(schema.tenants.unitId, unit.id),
          isNull(schema.tenants.deletedAt)
        ))
        .orderBy(asc(schema.tenants.lastName));
      allTenants.push(...tenants);
    }
    return allTenants;
  }

  async getTenant(id: string): Promise<schema.Tenant | undefined> {
    const result = await db.select().from(schema.tenants)
      .where(and(eq(schema.tenants.id, id), isNull(schema.tenants.deletedAt)))
      .limit(1);
    return result[0];
  }

  async getTenantsByUnit(unitId: string): Promise<schema.Tenant[]> {
    return db.select().from(schema.tenants)
      .where(and(
        eq(schema.tenants.unitId, unitId),
        isNull(schema.tenants.deletedAt)
      ))
      .orderBy(desc(schema.tenants.createdAt));
  }

  async getMonthlyInvoices(year?: number, month?: number): Promise<schema.MonthlyInvoice[]> {
    let query = db.select().from(schema.monthlyInvoices);
    if (year && month) {
      return query.where(and(
        eq(schema.monthlyInvoices.year, year),
        eq(schema.monthlyInvoices.month, month)
      )).orderBy(desc(schema.monthlyInvoices.createdAt));
    } else if (year) {
      return query.where(eq(schema.monthlyInvoices.year, year)).orderBy(desc(schema.monthlyInvoices.createdAt));
    }
    return query.orderBy(desc(schema.monthlyInvoices.createdAt));
  }

  async getMonthlyInvoicesByOrganization(organizationId?: string, year?: number, month?: number): Promise<schema.MonthlyInvoice[]> {
    if (!organizationId) return [];
    const units = await this.getUnitsByOrganization(organizationId);
    if (units.length === 0) return [];
    const unitIds = units.map(u => u.id);
    const allInvoices: schema.MonthlyInvoice[] = [];
    for (const unitId of unitIds) {
      let invoices: schema.MonthlyInvoice[];
      if (year && month) {
        invoices = await db.select().from(schema.monthlyInvoices)
          .where(and(
            eq(schema.monthlyInvoices.unitId, unitId),
            eq(schema.monthlyInvoices.year, year),
            eq(schema.monthlyInvoices.month, month)
          )).orderBy(desc(schema.monthlyInvoices.createdAt));
      } else if (year) {
        invoices = await db.select().from(schema.monthlyInvoices)
          .where(and(
            eq(schema.monthlyInvoices.unitId, unitId),
            eq(schema.monthlyInvoices.year, year)
          )).orderBy(desc(schema.monthlyInvoices.createdAt));
      } else {
        invoices = await db.select().from(schema.monthlyInvoices)
          .where(eq(schema.monthlyInvoices.unitId, unitId))
          .orderBy(desc(schema.monthlyInvoices.createdAt));
      }
      allInvoices.push(...invoices);
    }
    return allInvoices;
  }

  async getInvoicesByTenant(tenantId: string): Promise<schema.MonthlyInvoice[]> {
    return db.select().from(schema.monthlyInvoices)
      .where(eq(schema.monthlyInvoices.tenantId, tenantId))
      .orderBy(desc(schema.monthlyInvoices.year), desc(schema.monthlyInvoices.month));
  }

  async getAllPayments(): Promise<schema.Payment[]> {
    return db.select().from(schema.payments)
      .orderBy(desc(schema.payments.buchungsDatum));
  }

  async getPaymentsByOrganization(organizationId?: string): Promise<schema.Payment[]> {
    if (!organizationId) return [];
    const tenants = await this.getTenantsByOrganization(organizationId);
    if (tenants.length === 0) return [];
    const allPayments: schema.Payment[] = [];
    for (const tenant of tenants) {
      const payments = await db.select().from(schema.payments)
        .where(eq(schema.payments.tenantId, tenant.id))
        .orderBy(desc(schema.payments.buchungsDatum));
      allPayments.push(...payments);
    }
    return allPayments.sort((a, b) => 
      new Date(b.buchungsDatum).getTime() - new Date(a.buchungsDatum).getTime()
    );
  }

  async getPaymentsByTenant(tenantId: string): Promise<schema.Payment[]> {
    return db.select().from(schema.payments)
      .where(eq(schema.payments.tenantId, tenantId))
      .orderBy(desc(schema.payments.buchungsDatum));
  }

  async getExpensesByOrganization(organizationId?: string): Promise<schema.Expense[]> {
    if (!organizationId) return [];
    const properties = await this.getPropertiesByOrganization(organizationId);
    if (properties.length === 0) return [];
    const allExpenses: schema.Expense[] = [];
    for (const prop of properties) {
      const expenses = await db.select().from(schema.expenses)
        .where(eq(schema.expenses.propertyId, prop.id))
        .orderBy(desc(schema.expenses.datum));
      allExpenses.push(...expenses);
    }
    return allExpenses.sort((a, b) => 
      new Date(b.datum).getTime() - new Date(a.datum).getTime()
    );
  }

  async getExpensesByProperty(propertyId: string, year?: number): Promise<schema.Expense[]> {
    if (year) {
      return db.select().from(schema.expenses)
        .where(and(eq(schema.expenses.propertyId, propertyId), eq(schema.expenses.year, year)))
        .orderBy(desc(schema.expenses.datum));
    }
    return db.select().from(schema.expenses)
      .where(eq(schema.expenses.propertyId, propertyId))
      .orderBy(desc(schema.expenses.datum));
  }

  async getExpense(id: string): Promise<schema.Expense | undefined> {
    const result = await db.select().from(schema.expenses).where(eq(schema.expenses.id, id)).limit(1);
    return result[0];
  }

  async getBankAccounts(): Promise<schema.BankAccount[]> {
    return db.select().from(schema.bankAccounts).orderBy(asc(schema.bankAccounts.accountName));
  }

  async getBankAccount(id: string): Promise<schema.BankAccount | undefined> {
    const result = await db.select().from(schema.bankAccounts).where(eq(schema.bankAccounts.id, id));
    return result[0];
  }

  async getBankAccountsByOrganization(organizationId?: string): Promise<schema.BankAccount[]> {
    if (!organizationId) return [];
    return db.select().from(schema.bankAccounts)
      .where(eq(schema.bankAccounts.organizationId, organizationId))
      .orderBy(asc(schema.bankAccounts.accountName));
  }

  async getTransactionsByBankAccount(bankAccountId: string): Promise<schema.Transaction[]> {
    return db.select().from(schema.transactions)
      .where(eq(schema.transactions.bankAccountId, bankAccountId))
      .orderBy(desc(schema.transactions.transactionDate));
  }

  async getTransactionsByOrganization(organizationId?: string): Promise<schema.Transaction[]> {
    if (!organizationId) return [];
    const bankAccounts = await this.getBankAccountsByOrganization(organizationId);
    if (bankAccounts.length === 0) return [];
    const bankAccountIds = bankAccounts.map(ba => ba.id);
    const allTransactions: schema.Transaction[] = [];
    for (const baId of bankAccountIds) {
      const txns = await db.select().from(schema.transactions)
        .where(eq(schema.transactions.bankAccountId, baId))
        .orderBy(desc(schema.transactions.transactionDate));
      allTransactions.push(...txns);
    }
    return allTransactions.sort((a, b) => 
      new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
    );
  }

  async getUnitsByOrganization(organizationId?: string): Promise<schema.Unit[]> {
    if (!organizationId) return [];
    const properties = await this.getPropertiesByOrganization(organizationId);
    if (properties.length === 0) return [];
    const allUnits: schema.Unit[] = [];
    for (const prop of properties) {
      const units = await db.select().from(schema.units)
        .where(and(
          eq(schema.units.propertyId, prop.id),
          isNull(schema.units.deletedAt)
        ))
        .orderBy(asc(schema.units.topNummer));
      allUnits.push(...units);
    }
    return allUnits;
  }

  async getSettlementsByProperty(propertyId: string): Promise<schema.Settlement[]> {
    return db.select().from(schema.settlements)
      .where(eq(schema.settlements.propertyId, propertyId))
      .orderBy(desc(schema.settlements.year));
  }

  async getMaintenanceContractsByProperty(propertyId: string): Promise<schema.MaintenanceContract[]> {
    return db.select().from(schema.maintenanceContracts)
      .where(eq(schema.maintenanceContracts.propertyId, propertyId))
      .orderBy(asc(schema.maintenanceContracts.nextDueDate));
  }

  async getMaintenanceTasks(status?: string): Promise<schema.MaintenanceTask[]> {
    if (status) {
      return db.select().from(schema.maintenanceTasks)
        .where(eq(schema.maintenanceTasks.status, status))
        .orderBy(asc(schema.maintenanceTasks.dueDate));
    }
    return db.select().from(schema.maintenanceTasks).orderBy(asc(schema.maintenanceTasks.dueDate));
  }

  async getMaintenanceTasksByOrganization(organizationId?: string, status?: string): Promise<schema.MaintenanceTask[]> {
    if (!organizationId) return [];
    const properties = await this.getPropertiesByOrganization(organizationId);
    if (properties.length === 0) return [];
    const allTasks: schema.MaintenanceTask[] = [];
    for (const prop of properties) {
      const contracts = await this.getMaintenanceContractsByProperty(prop.id);
      for (const contract of contracts) {
        let tasks: schema.MaintenanceTask[];
        if (status) {
          tasks = await db.select().from(schema.maintenanceTasks)
            .where(and(
              eq(schema.maintenanceTasks.contractId, contract.id),
              eq(schema.maintenanceTasks.status, status)
            ))
            .orderBy(asc(schema.maintenanceTasks.dueDate));
        } else {
          tasks = await db.select().from(schema.maintenanceTasks)
            .where(eq(schema.maintenanceTasks.contractId, contract.id))
            .orderBy(asc(schema.maintenanceTasks.dueDate));
        }
        allTasks.push(...tasks);
      }
    }
    return allTasks;
  }

  async getContractors(): Promise<schema.Contractor[]> {
    return db.select().from(schema.contractors)
      .where(eq(schema.contractors.isActive, true))
      .orderBy(asc(schema.contractors.companyName));
  }

  async getContractorsByOrganization(organizationId?: string): Promise<schema.Contractor[]> {
    if (!organizationId) return [];
    return db.select().from(schema.contractors)
      .where(and(
        eq(schema.contractors.organizationId, organizationId),
        eq(schema.contractors.isActive, true)
      ))
      .orderBy(asc(schema.contractors.companyName));
  }

  async getDistributionKeys(): Promise<schema.DistributionKey[]> {
    return db.select().from(schema.distributionKeys)
      .where(eq(schema.distributionKeys.isActive, true))
      .orderBy(asc(schema.distributionKeys.sortOrder));
  }

  async getProfileByEmail(email: string): Promise<schema.Profile | undefined> {
    const result = await db.select().from(schema.profiles)
      .where(eq(schema.profiles.email, email)).limit(1);
    return result[0];
  }

  async getProfileById(id: string): Promise<schema.Profile | undefined> {
    const result = await db.select().from(schema.profiles)
      .where(eq(schema.profiles.id, id)).limit(1);
    return result[0];
  }

  async createProfile(data: schema.InsertProfile): Promise<schema.Profile> {
    const result = await db.insert(schema.profiles).values(data).returning();
    return result[0];
  }

  async updateProfile(id: string, data: Partial<schema.InsertProfile>): Promise<schema.Profile | undefined> {
    const result = await db.update(schema.profiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.profiles.id, id))
      .returning();
    return result[0];
  }

  async getProfilesByOrganization(organizationId: string): Promise<schema.Profile[]> {
    return db.select().from(schema.profiles)
      .where(eq(schema.profiles.organizationId, organizationId))
      .orderBy(asc(schema.profiles.fullName));
  }

  async getUserRoles(userId: string): Promise<schema.UserRole[]> {
    return db.select().from(schema.userRoles)
      .where(eq(schema.userRoles.userId, userId));
  }

  async addUserRole(userId: string, role: string): Promise<schema.UserRole> {
    const result = await db.insert(schema.userRoles).values({
      userId,
      role: role as any,
    }).returning();
    return result[0];
  }

  async removeUserRole(userId: string, role: string): Promise<void> {
    await db.delete(schema.userRoles)
      .where(and(
        eq(schema.userRoles.userId, userId),
        eq(schema.userRoles.role, role as any)
      ));
  }

  async createInvite(data: schema.InsertOrganizationInvite): Promise<schema.OrganizationInvite> {
    const result = await db.insert(schema.organizationInvites).values(data).returning();
    return result[0];
  }

  async getInviteByToken(token: string): Promise<schema.OrganizationInvite | undefined> {
    const result = await db.select().from(schema.organizationInvites)
      .where(eq(schema.organizationInvites.token, token)).limit(1);
    return result[0];
  }

  async getInvitesByOrganization(organizationId: string): Promise<schema.OrganizationInvite[]> {
    return db.select().from(schema.organizationInvites)
      .where(eq(schema.organizationInvites.organizationId, organizationId))
      .orderBy(desc(schema.organizationInvites.createdAt));
  }

  async updateInvite(id: string, data: Partial<schema.InsertOrganizationInvite>): Promise<schema.OrganizationInvite | undefined> {
    const result = await db.update(schema.organizationInvites)
      .set(data)
      .where(eq(schema.organizationInvites.id, id))
      .returning();
    return result[0];
  }

  async getPendingInviteByEmail(email: string): Promise<schema.OrganizationInvite | undefined> {
    const result = await db.select().from(schema.organizationInvites)
      .where(and(
        eq(schema.organizationInvites.email, email.toLowerCase()),
        eq(schema.organizationInvites.status, 'pending')
      ))
      .limit(1);
    return result[0];
  }

  async deleteInvite(id: string): Promise<void> {
    await db.delete(schema.organizationInvites)
      .where(eq(schema.organizationInvites.id, id));
  }

  async getOrganization(id: string): Promise<schema.Organization | undefined> {
    const result = await db.select().from(schema.organizations)
      .where(eq(schema.organizations.id, id)).limit(1);
    return result[0];
  }

  async createOrganization(data: schema.InsertOrganization): Promise<schema.Organization> {
    const result = await db.insert(schema.organizations).values(data).returning();
    return result[0];
  }

  async getOrganizationByName(name: string): Promise<schema.Organization | undefined> {
    const result = await db.select().from(schema.organizations)
      .where(eq(schema.organizations.name, name))
      .limit(1);
    return result[0];
  }

  async createProperty(data: schema.InsertProperty): Promise<schema.Property> {
    const result = await db.insert(schema.properties).values(data).returning();
    return result[0];
  }

  async updateProperty(id: string, data: Partial<schema.InsertProperty>): Promise<schema.Property | undefined> {
    const result = await db.update(schema.properties)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.properties.id, id))
      .returning();
    return result[0];
  }

  async deleteProperty(id: string): Promise<void> {
    await db.update(schema.properties)
      .set({ deletedAt: new Date() })
      .where(eq(schema.properties.id, id));
  }

  async softDeleteUnit(id: string): Promise<void> {
    await db.update(schema.units)
      .set({ deletedAt: new Date() })
      .where(eq(schema.units.id, id));
  }

  async softDeleteTenant(id: string): Promise<void> {
    await db.update(schema.tenants)
      .set({ deletedAt: new Date() })
      .where(eq(schema.tenants.id, id));
  }

  async getRentHistoryByTenant(tenantId: string): Promise<schema.RentHistory[]> {
    return db.select().from(schema.rentHistory)
      .where(eq(schema.rentHistory.tenantId, tenantId))
      .orderBy(desc(schema.rentHistory.validFrom));
  }

  async createRentHistory(data: schema.InsertRentHistory): Promise<schema.RentHistory> {
    const result = await db.insert(schema.rentHistory).values(data).returning();
    return result[0];
  }

  async createPropertyManager(data: { userId: string; propertyId: string }): Promise<schema.PropertyManager> {
    const result = await db.insert(schema.propertyManagers).values(data).returning();
    return result[0];
  }

  async deletePropertyManager(userId: string, propertyId: string): Promise<void> {
    await db.delete(schema.propertyManagers)
      .where(and(
        eq(schema.propertyManagers.userId, userId),
        eq(schema.propertyManagers.propertyId, propertyId)
      ));
  }

  async getPropertyManagersByUser(userId: string): Promise<schema.PropertyManager[]> {
    return db.select().from(schema.propertyManagers)
      .where(eq(schema.propertyManagers.userId, userId));
  }

  async createPayment(data: schema.InsertPayment): Promise<schema.Payment> {
    const result = await db.insert(schema.payments).values(data).returning();
    return result[0];
  }

  async deletePayment(id: string): Promise<void> {
    await db.delete(schema.payments).where(eq(schema.payments.id, id));
  }

  async getPayment(id: string): Promise<schema.Payment | undefined> {
    const result = await db.select().from(schema.payments)
      .where(eq(schema.payments.id, id)).limit(1);
    return result[0];
  }

  async createTransaction(data: schema.InsertTransaction): Promise<schema.Transaction> {
    const result = await db.insert(schema.transactions).values(data).returning();
    return result[0];
  }

  async getTransaction(id: string): Promise<schema.Transaction | undefined> {
    const result = await db.select().from(schema.transactions)
      .where(eq(schema.transactions.id, id)).limit(1);
    return result[0];
  }

  async deleteTransaction(id: string): Promise<void> {
    await db.delete(schema.transactions).where(eq(schema.transactions.id, id));
  }

  async getTransactions(): Promise<schema.Transaction[]> {
    return db.select().from(schema.transactions)
      .orderBy(desc(schema.transactions.transactionDate));
  }

  async createExpense(data: schema.InsertExpense): Promise<schema.Expense> {
    const result = await db.insert(schema.expenses).values(data).returning();
    return result[0];
  }

  async deleteExpense(id: string): Promise<void> {
    await db.delete(schema.expenses).where(eq(schema.expenses.id, id));
  }

  async deleteExpensesByTransactionId(transactionId: string): Promise<void> {
    await db.delete(schema.expenses)
      .where(eq(schema.expenses.transactionId, transactionId));
  }

  async deleteTransactionSplits(transactionId: string): Promise<void> {
    await db.delete(schema.transactionSplits)
      .where(eq(schema.transactionSplits.transactionId, transactionId));
  }

  async getAccountCategories(organizationId: string): Promise<schema.AccountCategory[]> {
    return db.select().from(schema.accountCategories)
      .where(eq(schema.accountCategories.organizationId, organizationId))
      .orderBy(asc(schema.accountCategories.name));
  }

  async getUnit(id: string): Promise<schema.Unit | undefined> {
    const result = await db.select().from(schema.units)
      .where(and(eq(schema.units.id, id), isNull(schema.units.deletedAt)))
      .limit(1);
    return result[0];
  }

  async getUnits(): Promise<schema.Unit[]> {
    return db.select().from(schema.units)
      .where(isNull(schema.units.deletedAt))
      .orderBy(asc(schema.units.topNummer));
  }

  async getExpenses(year?: number, month?: number): Promise<schema.Expense[]> {
    let query = db.select().from(schema.expenses);
    if (year && month) {
      return query.where(and(
        eq(schema.expenses.year, year),
        eq(schema.expenses.month, month)
      )).orderBy(desc(schema.expenses.datum));
    } else if (year) {
      return query.where(eq(schema.expenses.year, year)).orderBy(desc(schema.expenses.datum));
    }
    return query.orderBy(desc(schema.expenses.datum));
  }

  async updateExpense(id: string, data: Partial<schema.InsertExpense>): Promise<schema.Expense> {
    const result = await db.update(schema.expenses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.expenses.id, id))
      .returning();
    return result[0];
  }

  async getInvoice(id: string): Promise<schema.MonthlyInvoice | undefined> {
    const result = await db.select().from(schema.monthlyInvoices)
      .where(eq(schema.monthlyInvoices.id, id)).limit(1);
    return result[0];
  }

  async createInvoice(data: schema.InsertMonthlyInvoice): Promise<schema.MonthlyInvoice> {
    const result = await db.insert(schema.monthlyInvoices).values(data).returning();
    return result[0];
  }

  async updateInvoice(id: string, data: Partial<schema.InsertMonthlyInvoice>): Promise<schema.MonthlyInvoice> {
    const result = await db.update(schema.monthlyInvoices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.monthlyInvoices.id, id))
      .returning();
    return result[0];
  }

  async deleteInvoice(id: string): Promise<void> {
    await db.delete(schema.monthlyInvoices).where(eq(schema.monthlyInvoices.id, id));
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<schema.Payment[]> {
    return db.select().from(schema.payments)
      .where(eq(schema.payments.invoiceId, invoiceId))
      .orderBy(asc(schema.payments.buchungsDatum));
  }

  async updatePayment(id: string, data: Partial<schema.InsertPayment>): Promise<schema.Payment> {
    const result = await db.update(schema.payments)
      .set(data)
      .where(eq(schema.payments.id, id))
      .returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
