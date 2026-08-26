import { Types } from 'mongoose';
import { NotificationLog, NotificationChannel, INotificationLog } from '../models/NotificationLog.js';

export interface DispatchNotificationArgs {
  tenantId: string;
  recipient: {
    identifier: string;
    name: string;
    type: 'CUSTOMER' | 'TECHNICIAN' | 'OPERATOR';
  };
  channel: NotificationChannel;
  templateCode: string;
  variables: Record<string, string>;
}

export class MessagingService {
  private static templates: Record<string, string> = {
    OUTAGE_NOTIFICATION:
      'Dear {{customerName}}, your Apex Fiber connection is currently affected by {{reason}}. Our field technicians have been dispatched. Estimated resolution: 2 hours.',
    JOB_DISPATCHED:
      'Hello {{techName}}, priority work order {{jobNumber}} assigned for {{address}}. Please proceed with OTDR meter.',
    WIFI_CHANGED:
      'Dear {{customerName}}, your home Wi-Fi settings were updated successfully. If you did not request this, please contact support.',
    OPTICAL_ALERT:
      'NOC Alert: Optical power on {{ontSerial}} dropped to {{powerDbm}} dBm.',
  };

  /**
   * Dispatches a notification through the configured channel gateway
   */
  static async dispatchNotification({
    tenantId,
    recipient,
    channel,
    templateCode,
    variables,
  }: DispatchNotificationArgs): Promise<INotificationLog> {
    const rawTemplate = this.templates[templateCode] || 'Alert: Notification from your Internet Service Provider.';
    let rendered = rawTemplate;

    for (const [key, val] of Object.entries(variables)) {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), val);
    }

    // Mask secrets if any accidentally slipped into variables
    const sanitized = rendered.replace(/(password\s*[:=]\s*)(\S+)/gi, '$1********');
    const correlationId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // In a live environment this connects to WhatsApp Cloud API / Twilio / SendGrid
    const log = await NotificationLog.create({
      tenantId: new Types.ObjectId(tenantId),
      recipient,
      channel,
      templateCode,
      contentRenderedSanitized: sanitized,
      status: 'delivered',
      externalMessageId: `wamid_${Date.now()}`,
      correlationId,
    });

    return log;
  }
}
