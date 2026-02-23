import crypto from 'crypto';

export function generateStripeSignature(payload: string, secret: string, timestamp?: number): string {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return `t=${ts},v1=${signature}`;
}

export function createStripeEvent(type: string, data: Record<string, unknown>): Record<string, unknown> {
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2024-12-18.acacia',
    created: Math.floor(Date.now() / 1000),
    type,
    data: {
      object: data,
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: `req_test_${Date.now()}`,
      idempotency_key: null,
    },
  };
}

export function createChargeSucceededEvent(invoiceId: string, amountCents: number): Record<string, unknown> {
  return createStripeEvent('charge.succeeded', {
    id: `ch_test_${Date.now()}`,
    amount: amountCents,
    amount_captured: amountCents,
    currency: 'eur',
    status: 'succeeded',
    paid: true,
    metadata: { invoiceId },
  });
}

export function createInvoicePaymentSucceededEvent(invoiceId: string, amountCents: number): Record<string, unknown> {
  return createStripeEvent('invoice.payment_succeeded', {
    id: `in_test_${Date.now()}`,
    amount_paid: amountCents,
    currency: 'eur',
    status: 'paid',
    metadata: { invoiceId },
  });
}
