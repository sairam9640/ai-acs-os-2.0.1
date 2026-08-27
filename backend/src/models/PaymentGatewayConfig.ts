import { Schema, model, Document, Types } from 'mongoose';

export type PaymentGatewayType = 'RAZORPAY' | 'CASHFREE' | 'PHONEPE' | 'PAYTM' | 'STRIPE';

export interface IPaymentGatewayConfig extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  gateway: PaymentGatewayType;
  displayName: string;
  isEnabled: boolean;
  isTestMode: boolean;
  // Encrypted credential payload (AES-256-GCM)
  encryptedCredentials: {
    iv: string;
    authTag: string;
    ciphertext: string;
  };
  // Public non-sensitive metadata for frontend checkout initialization
  publicMetadata: {
    keyId?: string;
    merchantId?: string;
    appId?: string;
    currency: string;
  };
  webhookEndpointUrl: string;
  webhookSecretEncrypted?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentGatewayConfigSchema = new Schema<IPaymentGatewayConfig>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    gateway: {
      type: String,
      enum: ['RAZORPAY', 'CASHFREE', 'PHONEPE', 'PAYTM', 'STRIPE'],
      required: true,
      index: true,
    },
    displayName: { type: String, required: true },
    isEnabled: { type: Boolean, default: false, index: true },
    isTestMode: { type: Boolean, default: true },
    encryptedCredentials: {
      iv: { type: String, required: true },
      authTag: { type: String, required: true },
      ciphertext: { type: String, required: true },
    },
    publicMetadata: {
      keyId: { type: String },
      merchantId: { type: String },
      appId: { type: String },
      currency: { type: String, default: 'INR' },
    },
    webhookEndpointUrl: { type: String, required: true },
    webhookSecretEncrypted: { type: String },
  },
  { timestamps: true }
);

PaymentGatewayConfigSchema.index({ tenantId: 1, gateway: 1 }, { unique: true });

export const PaymentGatewayConfig = model<IPaymentGatewayConfig>(
  'PaymentGatewayConfig',
  PaymentGatewayConfigSchema
);
