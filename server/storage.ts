import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";
import * as schema from "@shared/schema";

export interface IStorage {
  getOrganizations(): Promise<schema.Organization[]>;
  getProperties(): Promise<schema.Property[]>;
  getProperty(id: string): Promise<schema.Property | undefined>;
  getUnitsByProperty(propertyId: string): Promise<schema.Unit[]>;
  getTenants(): Promise<schema.Tenant[]>;
  getTenant(id: string): Promise<schema.Tenant | undefined>;
  getTenantsByUnit(unitId: string): Promise<schema.Tenant[]>;
  getMonthlyInvoices(year?: number, month?: number): Promise<schema.MonthlyInvoice[]>;
  getInvoicesByTenant(tenantId: string): Promise<schema.MonthlyInvoice[]>;
  getPaymentsByTenant(tenantId: string): Promise<schema.Payment[]>;
  getExpensesByProperty(propertyId: string, year?: number): Promise<schema.Expense[]>;
  getBankAccounts(): Promise<schema.BankAccount[]>;
  getTransactionsByBankAccount(bankAccountId: string): Promise<schema.Transaction[]>;
  getSettlementsByProperty(propertyId: string): Promise<schema.Settlement[]>;
  getMaintenanceContractsByProperty(propertyId: string): Promise<schema.MaintenanceContract[]>;
  getMaintenanceTasks(status?: string): Promise<schema.MaintenanceTask[]>;
  getContractors(): Promise<schema.Contractor[]>;
  getDistributionKeys(): Promise<schema.DistributionKey[]>;
}

class DatabaseStorage implements IStorage {
  async getOrganizations(): Promise<schema.Organization[]> {
    return db.select().from(schema.organizations).orderBy(asc(schema.organizations.name));
  }

  async getProperties(): Promise<schema.Property[]> {
    return db.select().from(schema.properties).orderBy(asc(schema.properties.name));
  }

  async getProperty(id: string): Promise<schema.Property | undefined> {
    const result = await db.select().from(schema.properties).where(eq(schema.properties.id, id)).limit(1);
    return result[0];
  }

  async getUnitsByProperty(propertyId: string): Promise<schema.Unit[]> {
    return db.select().from(schema.units)
      .where(eq(schema.units.propertyId, propertyId))
      .orderBy(asc(schema.units.topNummer));
  }

  async getTenants(): Promise<schema.Tenant[]> {
    return db.select().from(schema.tenants).orderBy(asc(schema.tenants.lastName));
  }

  async getTenant(id: string): Promise<schema.Tenant | undefined> {
    const result = await db.select().from(schema.tenants).where(eq(schema.tenants.id, id)).limit(1);
    return result[0];
  }

  async getTenantsByUnit(unitId: string): Promise<schema.Tenant[]> {
    return db.select().from(schema.tenants)
      .where(eq(schema.tenants.unitId, unitId))
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

  async getInvoicesByTenant(tenantId: string): Promise<schema.MonthlyInvoice[]> {
    return db.select().from(schema.monthlyInvoices)
      .where(eq(schema.monthlyInvoices.tenantId, tenantId))
      .orderBy(desc(schema.monthlyInvoices.year), desc(schema.monthlyInvoices.month));
  }

  async getPaymentsByTenant(tenantId: string): Promise<schema.Payment[]> {
    return db.select().from(schema.payments)
      .where(eq(schema.payments.tenantId, tenantId))
      .orderBy(desc(schema.payments.buchungsDatum));
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

  async getBankAccounts(): Promise<schema.BankAccount[]> {
    return db.select().from(schema.bankAccounts).orderBy(asc(schema.bankAccounts.accountName));
  }

  async getTransactionsByBankAccount(bankAccountId: string): Promise<schema.Transaction[]> {
    return db.select().from(schema.transactions)
      .where(eq(schema.transactions.bankAccountId, bankAccountId))
      .orderBy(desc(schema.transactions.transactionDate));
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

  async getContractors(): Promise<schema.Contractor[]> {
    return db.select().from(schema.contractors)
      .where(eq(schema.contractors.isActive, true))
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
    await db.delete(schema.properties).where(eq(schema.properties.id, id));
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
      .where(eq(schema.units.id, id)).limit(1);
    return result[0];
  }

  async getUnits(): Promise<schema.Unit[]> {
    return db.select().from(schema.units)
      .orderBy(asc(schema.units.topNummer));
  }
}

export const storage = new DatabaseStorage();
