import { Types } from 'mongoose';
import { AutomationRule, AutomationLog, IAutomationRule } from '../models/AutomationRule.js';
import { MessagingService } from './messagingService.js';
import { IncidentService } from './incidentService.js';

export class AutomationEngineService {
  /**
   * Evaluates active tenant rules when an event triggers
   */
  static async evaluateEvent({
    tenantId,
    trigger,
    contextData,
  }: {
    tenantId: Types.ObjectId | string;
    trigger: string;
    contextData: Record<string, any>;
  }) {
    const rules = await AutomationRule.find({
      tenantId: new Types.ObjectId(tenantId),
      trigger,
      isActive: true,
    });

    for (const rule of rules) {
      // Check cooldown window
      if (rule.lastTriggeredAt) {
        const elapsedMinutes = (Date.now() - rule.lastTriggeredAt.getTime()) / (1000 * 60);
        if (elapsedMinutes < rule.cooldownMinutes) {
          await AutomationLog.create({
            tenantId: rule.tenantId,
            ruleId: rule._id,
            ruleName: rule.name,
            trigger,
            contextData,
            actionExecuted: rule.action,
            result: 'SKIPPED_COOLDOWN',
            message: `Skipped execution: Cooldown active (${Math.round(rule.cooldownMinutes - elapsedMinutes)} mins remaining)`,
          });
          continue;
        }
      }

      // Execute Action
      try {
        let actionResult = 'Executed successfully';
        if (rule.action === 'SEND_WHATSAPP_NOTIFICATION') {
          await MessagingService.dispatchNotification({
            tenantId: rule.tenantId.toString(),
            recipient: {
              identifier: contextData.customerPhone || '+919845012345',
              name: contextData.customerName || 'Subscriber',
              type: 'CUSTOMER',
            },
            channel: 'WHATSAPP',
            templateCode: 'OUTAGE_NOTIFICATION',
            variables: {
              customerName: contextData.customerName || 'Subscriber',
              reason: contextData.reason || 'Upstream fiber maintenance',
            },
          });
        }

        rule.lastTriggeredAt = new Date();
        rule.executionCount += 1;
        await rule.save();

        await AutomationLog.create({
          tenantId: rule.tenantId,
          ruleId: rule._id,
          ruleName: rule.name,
          trigger,
          contextData,
          actionExecuted: rule.action,
          result: 'SUCCESS',
          message: actionResult,
        });
      } catch (err: any) {
        await AutomationLog.create({
          tenantId: rule.tenantId,
          ruleId: rule._id,
          ruleName: rule.name,
          trigger,
          contextData,
          actionExecuted: rule.action,
          result: 'FAILED',
          message: err.message,
        });
      }
    }
  }
}
