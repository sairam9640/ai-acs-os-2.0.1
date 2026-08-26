import { Schema, model, Document, Types } from 'mongoose';

export type NotificationChannel = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'IN_APP_PUSH';

export interface INotificationLog extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  recipient: {
    identifier: string; // phone # or email
    name: string;
    type: 'CUSTOMER' | 'TECHNICIAN' | 'OPERATOR';
  };
  channel: NotificationChannel;
  templateCode: string; // e.g. "OUTAGE_ALERT", "JOB_DISPATCHED", "WIFI_CHANGED", "INVOICE_OVERDUE"
  contentRenderedSanitized: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'throttled';
  errorMessage?: string;
  externalMessageId?: string;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    recipient: {
      identifier: { type: String, required: true },
      name: { type: String, required: true },
      type: { type: String, enum: ['CUSTOMER', 'TECHNICIAN', 'OPERATOR'], default: 'CUSTOMER' },
    },
    channel: {
      type: String,
      enum: ['WHATSAPP', 'SMS', 'EMAIL', 'IN_APP_PUSH'],
      default: 'WHATSAPP',
      index: true,
    },
    templateCode: { type: String, required: true, index: true },
    contentRenderedSanitized: { type: String, required: true },
    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'failed', 'throttled'],
      default: 'sent',
      index: true,
    },
    errorMessage: { type: String },
    externalMessageId: { type: String },
    correlationId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

export const NotificationLog = model<INotificationLog>('NotificationLog', NotificationLogSchema);
