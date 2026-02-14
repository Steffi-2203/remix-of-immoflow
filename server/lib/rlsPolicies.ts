import { pool } from "../db";
import { logger } from "./logger";

const TABLES_WITH_ORG_ID = [
  "properties",
  "journal_entries",
];

const TABLES_VIA_PROPERTY = [
  {
    table: "units",
    condition: `property_id IN (SELECT id FROM properties WHERE organization_id = current_setting('app.current_org', true)::uuid)`,
  },
  {
    table: "settlements",
    condition: `property_id IN (SELECT id FROM properties WHERE organization_id = current_setting('app.current_org', true)::uuid)`,
  },
];

const TABLES_VIA_UNIT = [
  {
    table: "tenants",
    condition: `unit_id IN (SELECT u.id FROM units u JOIN properties p ON u.property_id = p.id WHERE p.organization_id = current_setting('app.current_org', true)::uuid)`,
  },
  {
    table: "monthly_invoices",
    condition: `unit_id IN (SELECT u.id FROM units u JOIN properties p ON u.property_id = p.id WHERE p.organization_id = current_setting('app.current_org', true)::uuid)`,
  },
  {
    table: "leases",
    condition: `unit_id IN (SELECT u.id FROM units u JOIN properties p ON u.property_id = p.id WHERE p.organization_id = current_setting('app.current_org', true)::uuid)`,
  },
];

const TABLES_VIA_TENANT = [
  {
    table: "payments",
    condition: `tenant_id IN (SELECT t.id FROM tenants t JOIN units u ON t.unit_id = u.id JOIN properties p ON u.property_id = p.id WHERE p.organization_id = current_setting('app.current_org', true)::uuid)`,
  },
  {
    table: "payment_allocations",
    condition: `payment_id IN (SELECT py.id FROM payments py JOIN tenants t ON py.tenant_id = t.id JOIN units u ON t.unit_id = u.id JOIN properties p ON u.property_id = p.id WHERE p.organization_id = current_setting('app.current_org', true)::uuid)`,
  },
];

async function tableExists(client: any, tableName: string): Promise<boolean> {
  const result = await client.query(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)`,
    [tableName]
  );
  return result.rows[0].exists;
}

async function policyExists(client: any, tableName: string, policyName: string): Promise<boolean> {
  const result = await client.query(
    `SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = $1 AND policyname = $2)`,
    [tableName, policyName]
  );
  return result.rows[0].exists;
}

async function enableRLS(client: any, tableName: string): Promise<void> {
  await client.query(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`);
  logger.info(`RLS enabled on ${tableName}`);
}

async function createPolicy(
  client: any,
  tableName: string,
  policyName: string,
  using: string
): Promise<void> {
  const exists = await policyExists(client, tableName, policyName);
  if (exists) {
    logger.info(`Policy ${policyName} already exists on ${tableName}, skipping`);
    return;
  }
  await client.query(
    `CREATE POLICY ${policyName} ON ${tableName} AS PERMISSIVE FOR ALL USING (${using})`
  );
  logger.info(`Policy ${policyName} created on ${tableName}`);
}

async function createBypassPolicy(client: any, tableName: string): Promise<void> {
  const policyName = `bypass_rls_${tableName}`;
  const exists = await policyExists(client, tableName, policyName);
  if (exists) {
    logger.info(`Bypass policy ${policyName} already exists on ${tableName}, skipping`);
    return;
  }
  await client.query(
    `CREATE POLICY ${policyName} ON ${tableName} AS PERMISSIVE FOR ALL USING (current_setting('app.current_org', true) IS NULL OR current_setting('app.current_org', true) = '')`
  );
  logger.info(`Bypass policy ${policyName} created on ${tableName}`);
}

export async function setupRLS(): Promise<void> {
  const client = await pool.connect();
  try {
    const allTables = [
      ...TABLES_WITH_ORG_ID,
      ...TABLES_VIA_PROPERTY.map((t) => t.table),
      ...TABLES_VIA_UNIT.map((t) => t.table),
      ...TABLES_VIA_TENANT.map((t) => t.table),
    ];

    for (const tableName of allTables) {
      const exists = await tableExists(client, tableName);
      if (!exists) {
        logger.warn(`Table ${tableName} does not exist, skipping RLS setup`);
        continue;
      }

      try {
        await enableRLS(client, tableName);
      } catch (err: any) {
        logger.warn(`Failed to enable RLS on ${tableName}: ${err.message}`);
      }
    }

    for (const tableName of TABLES_WITH_ORG_ID) {
      if (!(await tableExists(client, tableName))) continue;
      try {
        await createPolicy(
          client,
          tableName,
          `org_isolation_${tableName}`,
          `organization_id = current_setting('app.current_org', true)::uuid`
        );
        await createBypassPolicy(client, tableName);
      } catch (err: any) {
        logger.warn(`Failed to create policy on ${tableName}: ${err.message}`);
      }
    }

    for (const { table, condition } of TABLES_VIA_PROPERTY) {
      if (!(await tableExists(client, table))) continue;
      try {
        await createPolicy(client, table, `org_isolation_${table}`, condition);
        await createBypassPolicy(client, table);
      } catch (err: any) {
        logger.warn(`Failed to create policy on ${table}: ${err.message}`);
      }
    }

    for (const { table, condition } of TABLES_VIA_UNIT) {
      if (!(await tableExists(client, table))) continue;
      try {
        await createPolicy(client, table, `org_isolation_${table}`, condition);
        await createBypassPolicy(client, table);
      } catch (err: any) {
        logger.warn(`Failed to create policy on ${table}: ${err.message}`);
      }
    }

    for (const { table, condition } of TABLES_VIA_TENANT) {
      if (!(await tableExists(client, table))) continue;
      try {
        await createPolicy(client, table, `org_isolation_${table}`, condition);
        await createBypassPolicy(client, table);
      } catch (err: any) {
        logger.warn(`Failed to create policy on ${table}: ${err.message}`);
      }
    }

    logger.info("RLS setup completed successfully");
  } catch (err: any) {
    logger.error(`RLS setup failed: ${err.message}`);
  } finally {
    client.release();
  }
}
