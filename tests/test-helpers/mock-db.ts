// Lightweight mocks for db and audit used in unit tests

export function createMockDb() {
  const inserts: any[] = [];
  const updates: any[] = [];
  const selects: any[] = [];
  return {
    insert: (table: any) => ({
      values: (v: any) => {
        inserts.push({ table, v });
        return { onConflictDoUpdate: () => Promise.resolve({ rows: [v] }) };
      },
    }),
    update: (table: any) => ({
      set: (v: any) => ({
        where: () => {
          updates.push({ table, v });
          return Promise.resolve();
        },
      }),
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    }),
    query: async (sql: string, params?: any[]) => {
      selects.push({ sql, params });
      return [];
    },
    __state: { inserts, updates, selects },
  };
}

export function createMockAudit() {
  const calls: any[] = [];
  return {
    insertAudit: async (payload: any) => {
      calls.push(payload);
      return Promise.resolve();
    },
    __calls: calls,
  };
}
