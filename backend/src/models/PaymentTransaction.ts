import { Schema, model, Document, Types } from 'mongoose';
import { PaymentGatewayType } from './PaymentGatewayConfig.js';

export type PaymentStatus = 'INITIATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'SETTLED';
export type SettlementStatus = 'PENDING' | 'SETTLED' | 'DISPUTED';
export type PaymentMode = 'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'NET_BANKING' | 'WALLET' | 'CASH' | 'CHEQUE' | 'OTHER';

export interface IPaymentTransaction extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  customerId: Types.ObjectId;
  accountNumber: string;
  customerName: string;
  customerPhone: string;
  transactionId: string; // Internal unique reference e.g. "TXN-178822-ABCD"
  orderId?: string; // Gateway order ID e.g. "order_Oxx123"
  gatewayTransactionId?: string; // Gateway payment ID e.g. "pay_Pxx123"
  gateway: PaymentGatewayType | 'CASH_OFFLINE' | 'UPI_DIRECT';
  amount: number;
  currency: string;
  fee: number;
  tax: number;
  netAmount: number;
  status: PaymentStatus;
  settlementStatus: SettlementStatus;
  settlementDate?: Date;
  settlementBatchId?: string;
  paymentMode: PaymentMode;
  description: string;
  metadata: {
    planId?: string;
    planName?: string;
    validityDays?: number;
    isAutoRenewal?: boolean;
    operatorBranch?: string;
    collectedByActorId?: string;
  };
  failureReason?: string;
  rawGatewayResponse?: any;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    accountNumber: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    transactionId: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, index: true },
    gatewayTransactionId: { type: String, index: true },
    gateway: {
      type: String,
      enum: ['RAZORPAY', 'CASHFREE', 'PHONEPE', 'PAYTM', 'STRIPE', 'CASH_OFFLINE', 'UPI_DIRECT'],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    fee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'SETTLED'],
      default: 'INITIATED',
      index: true,
    },
    settlementStatus: {
      type: String,
      enum: ['PENDING', 'SETTLED', 'DISPUTED'],
      default: 'PENDING',
      index: true,
    },
    settlementDate: { type: Date },
    settlementBatchId: { type: String },
    paymentMode: {
      type: String,
      enum: ['UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING', 'WALLET', 'CASH', 'CHEQUE', 'OTHER'],
      default: 'UPI',
    },
    description: { type: String, default: 'Broadband Plan Subscription Payment' },
    metadata: {
      planId: { type: String },
      planName: { type: String },
      validityDays: { type: Number },
      isAutoRenewal: { type: Boolean, default: false },
      operatorBranch: { type: String, default: 'Main Office' },
      collectedByActorId: { type: String },
    },
    failureReason: { type: String },
    rawGatewayResponse: { type: Schema.Types.Mixed },
    idempotencyKey: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

PaymentTransactionSchema.index({ tenantId: 1, createdAt: -1 });
PaymentTransactionSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
PaymentTransactionSchema.index({ tenantId: 1, settlementStatus: 1 });

export const PaymentTransaction = model<IPaymentTransaction>(
  'PaymentTransaction',
  PaymentTransactionSchema
);
