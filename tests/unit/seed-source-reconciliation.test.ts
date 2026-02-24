import { describe, it, expect } from 'vitest';

interface PaymentAllocation {
  invoiceId: string;
  appliedAmount: number;
  source: string;
}

interface Invoice {
  id: string;
  paidAmount: number;
  gesamtbetrag: number;
}

function computeVariance(
  invoices: Invoice[],
  allocations: PaymentAllocation[],
  excludeSource?: string
): { invoiceId: string; variance: number }[] {
  const filtered = excludeSource
    ? allocations.filter(a => a.source !== excludeSource)
    : allocations;

  return invoices
    .map(inv => {
      const allocTotal = filtered
        .filter(a => a.invoiceId === inv.id)
        .reduce((sum, a) => sum + a.appliedAmount, 0);
      const variance = inv.paidAmount - allocTotal;
      return { invoiceId: inv.id, variance };
    })
    .filter(v => Math.abs(v.variance) > 0.01);
}

describe('Reconciliation Variance Calculation', () => {
  const invoices: Invoice[] = [
    { id: 'inv-1', paidAmount: 850, gesamtbetrag: 850 },
    { id: 'inv-2', paidAmount: 1200, gesamtbetrag: 1200 },
    { id: 'inv-3', paidAmount: 500, gesamtbetrag: 750 },
  ];

  const allocations: PaymentAllocation[] = [
    { invoiceId: 'inv-1', appliedAmount: 850, source: 'manual' },
    { invoiceId: 'inv-2', appliedAmount: 1200, source: 'seed' },
    { invoiceId: 'inv-3', appliedAmount: 500, source: 'manual' },
  ];

  it('should find zero variances when all allocations match', () => {
    const result = computeVariance(invoices, allocations);
    expect(result).toHaveLength(0);
  });

  it('should detect variance when allocation is missing', () => {
    const partial = allocations.filter(a => a.invoiceId !== 'inv-1');
    const result = computeVariance(invoices, partial);
    expect(result).toHaveLength(1);
    expect(result[0].invoiceId).toBe('inv-1');
    expect(result[0].variance).toBe(850);
  });

  it('should exclude seed rows when excludeSource is set', () => {
    const result = computeVariance(invoices, allocations, 'seed');
    expect(result).toHaveLength(1);
    expect(result[0].invoiceId).toBe('inv-2');
    expect(result[0].variance).toBe(1200);
  });

  it('should handle partial payments correctly', () => {
    const partialInvoices: Invoice[] = [
      { id: 'inv-p1', paidAmount: 400, gesamtbetrag: 800 },
    ];
    const partialAllocs: PaymentAllocation[] = [
      { invoiceId: 'inv-p1', appliedAmount: 400, source: 'manual' },
    ];
    const result = computeVariance(partialInvoices, partialAllocs);
    expect(result).toHaveLength(0);
  });

  it('should handle multiple allocations per invoice', () => {
    const multiInvoices: Invoice[] = [
      { id: 'inv-m1', paidAmount: 1000, gesamtbetrag: 1000 },
    ];
    const multiAllocs: PaymentAllocation[] = [
      { invoiceId: 'inv-m1', appliedAmount: 600, source: 'manual' },
      { invoiceId: 'inv-m1', appliedAmount: 400, source: 'seed' },
    ];
    const result = computeVariance(multiInvoices, multiAllocs);
    expect(result).toHaveLength(0);
  });

  it('should correctly exclude only seed when mixed sources exist per invoice', () => {
    const mixedInvoices: Invoice[] = [
      { id: 'inv-m1', paidAmount: 1000, gesamtbetrag: 1000 },
    ];
    const mixedAllocs: PaymentAllocation[] = [
      { invoiceId: 'inv-m1', appliedAmount: 600, source: 'manual' },
      { invoiceId: 'inv-m1', appliedAmount: 400, source: 'seed' },
    ];
    const result = computeVariance(mixedInvoices, mixedAllocs, 'seed');
    expect(result).toHaveLength(1);
    expect(result[0].variance).toBe(400);
  });

  it('should tolerate rounding within 0.01 EUR', () => {
    const roundingInvoices: Invoice[] = [
      { id: 'inv-r1', paidAmount: 100.005, gesamtbetrag: 100 },
    ];
    const roundingAllocs: PaymentAllocation[] = [
      { invoiceId: 'inv-r1', appliedAmount: 100, source: 'manual' },
    ];
    const result = computeVariance(roundingInvoices, roundingAllocs);
    expect(result).toHaveLength(0);
  });

  it('should flag variance above 0.01 EUR threshold', () => {
    const thresholdInvoices: Invoice[] = [
      { id: 'inv-t1', paidAmount: 100.02, gesamtbetrag: 100 },
    ];
    const thresholdAllocs: PaymentAllocation[] = [
      { invoiceId: 'inv-t1', appliedAmount: 100, source: 'manual' },
    ];
    const result = computeVariance(thresholdInvoices, thresholdAllocs);
    expect(result).toHaveLength(1);
    expect(result[0].variance).toBeCloseTo(0.02, 2);
  });
});

describe('Seed Script Source Tagging', () => {
  it('seed-demo.ts INSERT contains source=seed for payments', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('server/scripts/seed-demo.ts', 'utf-8');
    expect(content).toContain("'seed'");
    expect(content).toMatch(/INSERT INTO payments.*source/s);
  });

  it('seed-demo.ts INSERT contains source=seed for payment_allocations', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('server/scripts/seed-demo.ts', 'utf-8');
    expect(content).toMatch(/INSERT INTO payment_allocations.*source/s);
  });

  it('seed-leases-payments.ts INSERT contains source=seed for payments', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('server/scripts/seed-leases-payments.ts', 'utf-8');
    expect(content).toContain("'seed'");
    expect(content).toMatch(/INSERT INTO payments.*source/s);
  });

  it('seed-leases-payments.ts INSERT contains source=seed for payment_allocations', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('server/scripts/seed-leases-payments.ts', 'utf-8');
    expect(content).toMatch(/INSERT INTO payment_allocations.*source/s);
  });
});

describe('Reconciliation SQL and Workflow', () => {
  it('reconcile_paid_amounts.sql contains source_breakdown section', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('scripts/reconcile_paid_amounts.sql', 'utf-8');
    expect(content).toContain("source_breakdown");
    expect(content).toContain("payment_allocations");
  });

  it('nightly-reconcile.yml tracks seed_count metric', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('.github/workflows/nightly-reconcile.yml', 'utf-8');
    expect(content).toContain("seed_count");
    expect(content).toContain("source = 'seed'");
  });

  it('nightly-reconcile.yml has fail threshold at 55', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('.github/workflows/nightly-reconcile.yml', 'utf-8');
    expect(content).toContain("variance_count > 55");
  });

  it('fixture seed-payments.sql tags both payments and allocations as seed', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('fixtures/seed-payments.sql', 'utf-8');
    expect(content).toContain("'seed'");
    expect(content).toContain("payment_allocations");
    expect(content).toContain("payments");
  });
});
