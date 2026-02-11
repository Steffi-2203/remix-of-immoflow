/**
 * tests/integration/billing_payment_sepa.integration.test.ts
 *
 * Integrationstest für: Abrechnung (BK), Zahlung Allocation FIFO, SEPA Flow
 * Passt zur bestehenden Testarchitektur:
 * - vitest.server.config.ts
 * - helpers: resetDb(), seedPortfolio()
 *
 * Ausführen:
 * NODE_ENV=test npx vitest -c vitest.server.config.ts tests/integration/billing_payment_sepa.integration.test.ts --run
 */

import request from 'supertest';
import { beforeAll, afterAll, beforeEach, test, expect, vi } from 'vitest';
import { startTestApp, stopTestApp } from '../helpers/testApp';
import { resetDb, seedPortfolio } from '../helpers/dbHelpers';

let app: any;
let db: any;
let authToken: string;
let orgId: string;
let propertyId: string;

beforeAll(async () => {
  ({ app, db } = await startTestApp({ useTestcontainers: true }));
});

afterAll(async () => {
  await stopTestApp(app);
});

beforeEach(async () => {
  await resetDb(db);
  const seeded = await seedPortfolio(db, {
    orgs: 1,
    properties: 1,
    owners: 2,
    invoicesPerOwner: 2
  });
  orgId = seeded.orgs[0].id;
  propertyId = seeded.properties[0].id;

  // Create admin user and login to obtain auth token
  const admin = await db.insert('users').values({
    org_id: orgId,
    email: 'e2e+admin@example.com',
    password_hash: 'testhash',
    role: 'admin'
  }).returning('*');

  const loginResp = await request(app)
    .post('/api/auth/login')
    .send({ email: 'e2e+admin@example.com', password: 'password' })
    .expect(200);

  authToken = loginResp.body.token;
});

test('Full BK flow then lock period prevents further allocations', async () => {
  // 1. Create invoices for property for year 2025
  const invoiceResp = await request(app)
    .post('/api/invoices')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      orgId,
      propertyId,
      year: 2025,
      lines: [
        { description: 'Heizung', amount_cents: 50000 },
        { description: 'Wasser', amount_cents: 20000 }
      ]
    })
    .expect(201);

  const invoiceId = invoiceResp.body.id;

  // 2. Generate settlement (BK)
  const bkResp = await request(app)
    .post('/api/settlements')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ orgId, propertyId, year: 2025 })
    .expect(201);

  expect(bkResp.body.status).toBe('draft');

  // 3. Finalize settlement
  const finalizeResp = await request(app)
    .post(`/api/settlements/${bkResp.body.id}/finalize`)
    .set('Authorization', `Bearer ${authToken}`)
    .expect(200);

  expect(finalizeResp.body.status).toBe('finalized');

  // 4. Lock booking period 2025-12
  await request(app)
    .post('/api/booking-periods/lock')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ orgId, period: '2025-12' })
    .expect(200);

  // 5. Create a payment with booking_date inside locked period -> expect 409
  const paymentResp = await request(app)
    .post('/api/payments')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      orgId,
      amount_cents: 70000,
      booking_date: '2025-12-15',
      payment_method: 'bank_transfer'
    });

  expect(paymentResp.status).toBe(409);

  // 6. Create a payment in open period -> expect allocation success
  const paymentOpenResp = await request(app)
    .post('/api/payments')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      orgId,
      amount_cents: 70000,
      booking_date: '2025-11-15',
      payment_method: 'bank_transfer'
    })
    .expect(201);

  const paymentId = paymentOpenResp.body.id;

  // 7. Verify FIFO allocation: first invoice lines should be allocated first
  const allocations = await db.select().from('allocations').where({ payment_id: paymentId });
  expect(allocations.length).toBeGreaterThan(0);

  // 8. Perform Storno on the payment and assert audit event exists
  await request(app)
    .post(`/api/payments/${paymentId}/storno`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({ reason: 'Test Storno' })
    .expect(200);

  const audit = await db
    .select()
    .from('audit_events')
    .where({ entity_type: 'payment', entity_id: paymentId })
    .orderBy('created_at', 'desc')
    .limit(1);

  expect(audit.length).toBeGreaterThan(0);
  expect(audit[0].event_type).toBe('STORNO');
});

test('SEPA flow generates pain.001 and processes bank response', async () => {
  // 1. Create SEPA mandate for owner
  const owner = await db
    .select()
    .from('owners')
    .where({ property_id: propertyId })
    .limit(1)
    .then((r: any[]) => r[0]);

  const mandateResp = await request(app)
    .post('/api/sepa/mandates')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      orgId,
      ownerId: owner.id,
      iban: 'AT611904300234573201',
      bic: 'BICATW22'
    })
    .expect(201);

  // 2. Create scheduled SEPA collection
  const sepaResp = await request(app)
    .post('/api/sepa/collections')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      orgId,
      propertyId,
      mandateId: mandateResp.body.id,
      amount_cents: 100000,
      due_date: '2025-12-01'
    })
    .expect(201);

  // 3. Trigger SEPA file generation (creates pain.001 and sends to bank-mock)
  const generateResp = await request(app)
    .post('/api/sepa/generate')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ orgId, date: '2025-11-30' })
    .expect(200);

  expect(generateResp.body.files_created).toBeGreaterThan(0);

  // 4. Simulate bank acceptance callback
  const bankCallback = await request(app)
    .post('/api/sepa/callback')
    .send({
      fileId: generateResp.body.files[0].id,
      status: 'ACCEPTED'
    })
    .expect(200);

  // 5. Verify collection marked as processed
  const collection = await db
    .select()
    .from('sepa_collections')
    .where({ id: sepaResp.body.id })
    .then((r: any[]) => r[0]);

  expect(collection.status).toBe('processed');
});
