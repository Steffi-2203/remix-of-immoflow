import { test, expect } from '@playwright/test';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.TEST_STRIPE_WEBHOOK_SECRET || '';

function generateSignature(payload: string, secret: string, timestamp?: number): string {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${payload}`;
  const sig = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${ts},v1=${sig}`;
}

function createEvent(type: string, data: Record<string, unknown>) {
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2024-12-18.acacia',
    created: Math.floor(Date.now() / 1000),
    type,
    data: { object: data },
    livemode: false,
    pending_webhooks: 1,
    request: { id: `req_test_${Date.now()}`, idempotency_key: null },
  };
}

test.describe('Stripe Webhook Signature Verification', () => {
  test.skip(!WEBHOOK_SECRET, 'TEST_STRIPE_WEBHOOK_SECRET not set — skipping signed webhook tests');

  test('rejects requests without stripe-signature header', async ({ request }) => {
    const event = createEvent('charge.succeeded', { id: 'ch_test', amount: 1000, currency: 'eur' });
    const response = await request.post('/api/stripe/webhook', {
      data: JSON.stringify(event),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
  });

  test('rejects requests with invalid signature', async ({ request }) => {
    const event = createEvent('charge.succeeded', { id: 'ch_test', amount: 1000, currency: 'eur' });
    const payload = JSON.stringify(event);
    const response = await request.post('/api/stripe/webhook', {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=1234567890,v1=invalid_signature_here',
      },
    });
    expect([400, 401, 403]).toContain(response.status());
  });

  test('rejects expired signature (timestamp tolerance)', async ({ request }) => {
    const event = createEvent('charge.succeeded', { id: 'ch_test', amount: 1000, currency: 'eur' });
    const payload = JSON.stringify(event);
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 600;
    const signature = generateSignature(payload, WEBHOOK_SECRET, expiredTimestamp);
    const response = await request.post('/api/stripe/webhook', {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
    });
    expect([400, 401, 403]).toContain(response.status());
  });

  test('accepts validly signed webhook event', async ({ request }) => {
    const event = createEvent('checkout.session.completed', {
      id: `cs_test_${Date.now()}`,
      payment_status: 'paid',
      mode: 'subscription',
      metadata: {},
    });
    const payload = JSON.stringify(event);
    const signature = generateSignature(payload, WEBHOOK_SECRET);
    const response = await request.post('/api/stripe/webhook', {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
    });
    expect([200, 202]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('received', true);
    }
  });

  test('handles charge.succeeded with valid signature', async ({ request }) => {
    const event = createEvent('charge.succeeded', {
      id: `ch_test_${Date.now()}`,
      amount: 92500,
      amount_captured: 92500,
      currency: 'eur',
      status: 'succeeded',
      paid: true,
      metadata: { invoiceId: 'e2e00000-0000-0000-0000-000000000099' },
    });
    const payload = JSON.stringify(event);
    const signature = generateSignature(payload, WEBHOOK_SECRET);
    const response = await request.post('/api/stripe/webhook', {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
    });
    expect([200, 202]).toContain(response.status());
  });
});
