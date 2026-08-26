import { Types } from 'mongoose';
import { Customer } from '../models/Customer.js';
import { Tenant } from '../models/Tenant.js';
import {
  PlanNotificationTemplate,
  PlanNotificationEventType,
  DEFAULT_PLAN_TEMPLATES,
} from '../models/PlanNotificationTemplate.js';
import { WhatsAppService } from './whatsAppService.js';
import { recordAuditLog } from '../middleware/audit.js';

export interface IPlanEventPayload {
  tenantId: string | Types.ObjectId;
  customerId: string | Types.ObjectId;
  accountNumber: string;
  customerName: string;
  mobileNumber: string;
  planName: string;
  price: number;
  expiryDate: string;
  remainingDays: number;
  operatorName?: string;
  eventType: PlanNotificationEventType;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
}

export interface IPlanNotificationResult {
  success: boolean;
  duplicatePrevented?: boolean;
  messageId?: string;
  eventKey?: string;
  renderedMessage?: string;
  error?: string;
}

export class PlanNotificationService {
  /**
   * Interpolates template tokens with actual event payload values
   */
  static renderTemplate(templateText: string, data: IPlanEventPayload): string {
    return templateText
      .replace(/{customer_name}/gi, data.customerName || 'Subscriber')
      .replace(/{customer_id}/gi, String(data.customerId || ''))
      .replace(/{account_number}/gi, data.accountNumber || '')
      .replace(/{mobile_number}/gi, data.mobileNumber || '')
      .replace(/{plan_name}/gi, data.planName || 'Fiber Broadband')
      .replace(/{price}/gi, String(data.price ?? 0))
      .replace(/{expiry_date}/gi, data.expiryDate || 'N/A')
      .replace(/{remaining_days}/gi, String(data.remainingDays ?? 0))
      .replace(/{operator_name}/gi, data.operatorName || 'Your ISP')
      .replace(/{tenant_id}/gi, String(data.tenantId || ''));
  }

  /**
   * Emits Plan Notification Event, executes deduplication check, and dispatches via existing WhatsApp service
   */
  static async emitPlanNotificationEvent(
    payload: IPlanEventPayload,
    options: { forceRetrigger?: boolean } = {}
  ): Promise<IPlanNotificationResult> {
    const tId = new Types.ObjectId(payload.tenantId);
    const cId = new Types.ObjectId(payload.customerId);

    // 1. Fetch Customer and Operator Tenant metadata
    const [customer, tenant] = await Promise.all([
      Customer.findOne({ _id: cId, tenantId: tId }),
      Tenant.findById(tId),
    ]);

    if (!customer) {
      return { success: false, error: `Customer not found with ID ${payload.customerId}` };
    }

    const operatorName = payload.operatorName || tenant?.displayName || tenant?.name || 'AI ISP OS';
    payload.operatorName = operatorName;

    // 2. Anti-Spam / Deduplication Check:
    // Generate canonical event key for this subscriber, event type, and expiry date
    const canonicalExpiry = payload.expiryDate || new Date(customer.servicePlan?.endDate || customer.servicePlan?.renewalDate || Date.now()).toISOString().split('T')[0];
    const eventKey = `${cId.toString()}_${payload.eventType}_${canonicalExpiry}`;

    const existingHistory = customer.servicePlan?.notificationHistory || [];
    const alreadyEmitted = existingHistory.some((h) => h.eventKey === eventKey);

    if (alreadyEmitted && !options.forceRetrigger) {
      console.log(`[PlanNotificationService] 🛑 Duplicate event prevented for [${eventKey}] (${customer.fullName}). Use forceRetrigger to bypass.`);
      return {
        success: true,
        duplicatePrevented: true,
        eventKey,
        error: 'Duplicate event notification skipped (already emitted for this expiry window).',
      };
    }

    // 3. Retrieve or fallback customizable template
    let templateDoc = await PlanNotificationTemplate.findOne({
      tenantId: tId,
      eventType: payload.eventType,
    });

    if (!templateDoc) {
      const defaultTmpl = DEFAULT_PLAN_TEMPLATES[payload.eventType];
      if (defaultTmpl) {
        templateDoc = await PlanNotificationTemplate.create({
          tenantId: tId,
          eventType: payload.eventType,
          title: defaultTmpl.title,
          templateText: defaultTmpl.template,
          isEnabled: true,
        });
      }
    }

    if (templateDoc && !templateDoc.isEnabled) {
      return {
        success: false,
        error: `Notification template for ${payload.eventType} is disabled by operator.`,
      };
    }

    const templateString = templateDoc?.templateText || DEFAULT_PLAN_TEMPLATES[payload.eventType]?.template || 'Plan notification for {customer_name}';
    const renderedMessage = this.renderTemplate(templateString, payload);

    // 4. Dispatch via existing WhatsApp service
    const targetPhone = payload.mobileNumber || customer.phone;
    const waResult = await WhatsAppService.sendPlanNotificationMessage({
      tenantId: tId.toString(),
      recipientPhone: targetPhone,
      customerName: customer.fullName,
      eventType: payload.eventType,
      renderedMessage,
      metadata: {
        customerId: customer._id.toString(),
        accountNumber: customer.accountNumber,
        planName: payload.planName,
        price: payload.price,
        expiryDate: payload.expiryDate,
        remainingDays: payload.remainingDays,
        operatorName,
        tenantId: tId.toString(),
      },
    });

    // 5. Update Customer's notification history
    await Customer.updateOne(
      { _id: cId, tenantId: tId },
      {
        $push: {
          'servicePlan.notificationHistory': {
            eventType: payload.eventType,
            eventKey,
            emittedAt: new Date(),
            recipientPhone: targetPhone,
          },
        },
      }
    );

    // 6. Record mandatory Audit Log
    try {
      await recordAuditLog({
        tenantId: tId,
        actorId: payload.actorId || 'system_event_engine',
        actorEmail: payload.actorEmail || 'system@ai-ispos.com',
        actorRole: payload.actorRole || 'SYSTEM',
        action: `PLAN_NOTIFICATION_EMITTED_${payload.eventType}`,
        targetResource: 'CustomerPlanNotification',
        targetId: customer._id.toString(),
        targetIdentifier: `${customer.accountNumber} (${payload.eventType})`,
        correlationId: waResult.messageId,
      });
    } catch (_) {}

    return {
      success: true,
      duplicatePrevented: false,
      messageId: waResult.messageId,
      eventKey,
      renderedMessage,
    };
  }
}
