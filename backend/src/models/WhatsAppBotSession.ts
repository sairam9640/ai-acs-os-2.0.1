import { Schema, model, Document, Types } from 'mongoose';

export type BotStep =
  | 'IDLE'
  | 'MAIN_MENU'
  | 'AWAITING_NEW_SSID'
  | 'AWAITING_NEW_PASSWORD'
  | 'AWAITING_BLOCK_DEVICE'
  | 'LEAD_CAPTURE_NAME'
  | 'LEAD_CAPTURE_ADDRESS'
  | 'LEAD_CAPTURE_PINCODE';

export interface IWhatsAppBotSession extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  phone: string;
  customerId?: Types.ObjectId;
  currentStep: BotStep;
  tempData: Record<string, any>;
  lastInteractionAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppBotSessionSchema = new Schema<IWhatsAppBotSession>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    phone: { type: String, required: true, index: true, trim: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
    currentStep: {
      type: String,
      enum: [
        'IDLE',
        'MAIN_MENU',
        'AWAITING_NEW_SSID',
        'AWAITING_NEW_PASSWORD',
        'AWAITING_BLOCK_DEVICE',
        'LEAD_CAPTURE_NAME',
        'LEAD_CAPTURE_ADDRESS',
        'LEAD_CAPTURE_PINCODE',
      ],
      default: 'IDLE',
    },
    tempData: { type: Schema.Types.Mixed, default: {} },
    lastInteractionAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const WhatsAppBotSession = model<IWhatsAppBotSession>('WhatsAppBotSession', WhatsAppBotSessionSchema);
