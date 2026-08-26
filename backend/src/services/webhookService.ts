import crypto from 'crypto';
import { EventBusService } from './eventBusService.js';

export interface WebhookPayload {
  eventId: string;
  provider: 'WHATSAPP' | 'STRIPE' | 'RAZORPAY';
  eventType: string;
  timestamp: string;
  tenantId?: string;
  data: Record<string, any>;
}

export class WebhookService {
  private static processedEventIds: Set<string> = new Set();
  private static providerSecrets: Record<string, string> = {
    WHATSAPP: process.env.WHATSAPP_WEBHOOK_SECRET || 'whsec_whatsapp_master_secret_2026',
    STRIPE: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_stripe_master_secret_2026',
    RAZORPAY: process.env.RAZORPAY_WEBHOOK_SECRET || 'whsec_razorpay_master_secret_2026',
  };

  /**
   * Validates HMAC-SHA256 signature against provider secret
   */
  static validateSignature(provider: 'WHATSAPP' | 'STRIPE' | 'RAZORPAY', rawPayload: string, signature: string): boolean {
    const secret = this.providerSecrets[provider];
    if (!secret) return false;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawPayload)
      .digest('hex');

    // Safe timing-safe comparison
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch {
      return signature === expectedSignature;
    }
  }

  /**
   * Processes inbound webhook with idempotency check
   */
  static async processWebhook(payload: WebhookPayload): Promise<{ status: 'PROCESSED' | 'DUPLICATE_SKIPPED'; eventId: string }> {
    // 1. Idempotency Check
    if (this.processedEventIds.has(payload.eventId)) {
      return { status: 'DUPLICATE_SKIPPED', eventId: payload.eventId };
    }

    // 2. Mark event ID as processed
    this.processedEventIds.add(payload.eventId);
    if (this.processedEventIds.size > 5000) {
      const firstItem = this.processedEventIds.values().next().value;
      if (firstItem) this.processedEventIds.delete(firstItem);
    }

    // 3. Publish to typed Event Bus for downstream domain consumption
    if (payload.provider === 'WHATSAPP') {
      await EventBusService.publish({
        eventType: 'TicketCreated',
        tenantId: payload.tenantId || 'global',
        correlationId: payload.eventId,
        payload: {
          source: 'WHATSAPP_INBOUND',
          from: payload.data.from,
          messageText: payload.data.text,
        },
      });
    }

    return { status: 'PROCESSED', eventId: payload.eventId };
  }
}
