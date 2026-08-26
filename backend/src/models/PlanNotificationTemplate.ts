import { Schema, model, Document, Types } from 'mongoose';

export type PlanNotificationEventType =
  | 'PLAN_ACTIVATED'
  | 'PLAN_RENEWED'
  | 'PLAN_EXPIRING_7D'
  | 'PLAN_EXPIRING_3D'
  | 'PLAN_EXPIRING_1D'
  | 'PLAN_EXPIRED'
  | 'PAYMENT_RECEIVED';

export interface IPlanNotificationTemplate extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  eventType: PlanNotificationEventType;
  title: string;
  templateText: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlanNotificationTemplateSchema = new Schema<IPlanNotificationTemplate>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    eventType: {
      type: String,
      required: true,
      enum: [
        'PLAN_ACTIVATED',
        'PLAN_RENEWED',
        'PLAN_EXPIRING_7D',
        'PLAN_EXPIRING_3D',
        'PLAN_EXPIRING_1D',
        'PLAN_EXPIRED',
        'PAYMENT_RECEIVED',
      ],
    },
    title: { type: String, required: true },
    templateText: { type: String, required: true },
    isEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PlanNotificationTemplateSchema.index({ tenantId: 1, eventType: 1 }, { unique: true });

export const PlanNotificationTemplate = model<IPlanNotificationTemplate>(
  'PlanNotificationTemplate',
  PlanNotificationTemplateSchema
);

export const DEFAULT_PLAN_TEMPLATES: Record<PlanNotificationEventType, { title: string; template: string }> = {
  PLAN_ACTIVATED: {
    title: 'New Plan Activated',
    template:
      '🎉 *{operator_name} — High-Speed Fiber Plan Activated!*\n\n' +
      'Dear *{customer_name}* (ID: `{account_number}`),\n\n' +
      'Your broadband plan *{plan_name}* has been successfully activated.\n\n' +
      '📦 *Plan Details:*\n' +
      '• Price: ₹{price}\n' +
      '• Expiry Date: {expiry_date}\n' +
      '• Validity: {remaining_days} Days\n\n' +
      'Thank you for choosing {operator_name}!',
  },
  PLAN_RENEWED: {
    title: 'Plan Renewed Successfully',
    template:
      '✅ *{operator_name} — Subscription Renewed!*\n\n' +
      'Dear *{customer_name}*,\n\n' +
      'Your fiber broadband plan *{plan_name}* has been renewed successfully.\n\n' +
      '📦 *Updated Validity:*\n' +
      '• Amount Paid: ₹{price}\n' +
      '• Next Expiry Date: {expiry_date}\n' +
      '• Remaining Days: {remaining_days} Days\n\n' +
      'Enjoy uninterrupted high-speed internet with {operator_name}.',
  },
  PLAN_EXPIRING_7D: {
    title: 'Plan Expiring in 7 Days',
    template:
      '⚠️ *{operator_name} — Plan Expiry Notice (7 Days)*\n\n' +
      'Dear *{customer_name}* (ID: `{account_number}`),\n\n' +
      'Your broadband subscription *{plan_name}* will expire in *{remaining_days} days* on *{expiry_date}*.\n\n' +
      '💳 Renewal Amount: ₹{price}\n\n' +
      'Please renew early to avoid any service interruption.',
  },
  PLAN_EXPIRING_3D: {
    title: 'Plan Expiring in 3 Days',
    template:
      '⏳ *{operator_name} — Urgent Expiry Reminder (3 Days)*\n\n' +
      'Dear *{customer_name}*,\n\n' +
      'Your fiber broadband plan *{plan_name}* is expiring in *{remaining_days} days* on *{expiry_date}*.\n\n' +
      '💳 Recharge Amount: ₹{price}\n\n' +
      'Contact your operator {operator_name} or recharge online now to avoid disconnection.',
  },
  PLAN_EXPIRING_1D: {
    title: 'Plan Expiring Tomorrow (1 Day)',
    template:
      '🚨 *{operator_name} — Final Expiry Notice (Expires Tomorrow)*\n\n' +
      'Dear *{customer_name}* (Account: `{account_number}`),\n\n' +
      'Your high-speed plan *{plan_name}* will expire *tomorrow ({expiry_date})*.\n\n' +
      '💳 Plan Renewal: ₹{price}\n\n' +
      '⚠️ Service will be temporarily suspended after expiry. Please renew today.',
  },
  PLAN_EXPIRED: {
    title: 'Plan Expired Notice',
    template:
      '🛑 *{operator_name} — Broadband Plan Expired*\n\n' +
      'Dear *{customer_name}*,\n\n' +
      'Your fiber internet plan *{plan_name}* has expired on *{expiry_date}*.\n\n' +
      '💳 Renewal Amount: ₹{price}\n\n' +
      'Please recharge immediately to restore your high-speed internet connection.',
  },
  PAYMENT_RECEIVED: {
    title: 'Payment Received Acknowledgment',
    template:
      '🧾 *{operator_name} — Payment Acknowledgment*\n\n' +
      'Dear *{customer_name}* (ID: `{account_number}`),\n\n' +
      'We have successfully received your payment of *₹{price}* for *{plan_name}*.\n\n' +
      '• New Validity: {expiry_date} ({remaining_days} Days)\n' +
      '• Operator: {operator_name}\n\n' +
      'Thank you for your payment!',
  },
};
