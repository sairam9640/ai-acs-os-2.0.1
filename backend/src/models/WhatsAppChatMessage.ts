import { Schema, model, Document, Types } from 'mongoose';

export type ChatDirection = 'INBOUND' | 'OUTBOUND';
export type SenderType = 'CUSTOMER' | 'BOT' | 'OPERATOR';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface IWhatsAppChatMessage extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  phone: string;
  senderName: string;
  customerId?: Types.ObjectId;
  leadId?: Types.ObjectId;
  direction: ChatDirection;
  senderType: SenderType;
  messageText: string;
  rawPayload?: any;
  status: MessageStatus;
  sessionState?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppChatMessageSchema = new Schema<IWhatsAppChatMessage>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    phone: { type: String, required: true, index: true, trim: true },
    senderName: { type: String, default: 'Customer' },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'CustomerLead', index: true },
    direction: { type: String, enum: ['INBOUND', 'OUTBOUND'], required: true, index: true },
    senderType: { type: String, enum: ['CUSTOMER', 'BOT', 'OPERATOR'], required: true, index: true },
    messageText: { type: String, required: true },
    rawPayload: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['SENT', 'DELIVERED', 'READ', 'FAILED'], default: 'DELIVERED' },
    sessionState: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export const WhatsAppChatMessage = model<IWhatsAppChatMessage>('WhatsAppChatMessage', WhatsAppChatMessageSchema);
