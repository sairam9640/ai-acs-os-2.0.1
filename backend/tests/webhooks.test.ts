import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { WebhookService } from '../src/services/webhookService.js';

describe('AI ISP OS Part 1.6 — Cryptographic Webhook & Idempotency Tests', () => {
  const secret = 'whsec_whatsapp_master_secret_2026';

  it('Should successfully validate valid HMAC-SHA256 signature', () => {
    const rawPayload = JSON.stringify({ event: 'message', from: '+919876543210' });
    const signature = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

    const isValid = WebhookService.validateSignature('WHATSAPP', rawPayload, signature);
    expect(isValid).toBe(true);
  });

  it('Should reject invalid or tampered HMAC-SHA256 signature', () => {
    const rawPayload = JSON.stringify({ event: 'message', from: '+919876543210' });
    const tamperedSignature = 'deadbeef1234567890abcdef';

    const isValid = WebhookService.validateSignature('WHATSAPP', rawPayload, tamperedSignature);
    expect(isValid).toBe(false);
  });

  it('Should process fresh webhook and skip duplicate event IDs idempotently', async () => {
    const eventId = `wh_evt_test_${Date.now()}`;
    const payload = {
      eventId,
      provider: 'WHATSAPP' as const,
      eventType: 'message.received',
      timestamp: new Date().toISOString(),
      data: { from: '+919876543210', text: 'Internet is not working' },
    };

    // First arrival
    const res1 = await WebhookService.processWebhook(payload);
    expect(res1.status).toBe('PROCESSED');

    // Duplicate arrival
    const res2 = await WebhookService.processWebhook(payload);
    expect(res2.status).toBe('DUPLICATE_SKIPPED');
  });
});
