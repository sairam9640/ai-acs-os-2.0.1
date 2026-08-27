import { Schema, model, Document, Types } from 'mongoose';

export interface ICustomerPlan extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  name: string;
  code: string;
  price: number;
  currency: string;
  billingCycleDays: number;
  expiryDate?: Date;
  downloadSpeedMbps: number;
  uploadSpeedMbps: number;
  dataLimitGb: number;
  description?: string;
  isActive: boolean;
  activeSubscribersCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerPlanSchema = new Schema<ICustomerPlan>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    billingCycleDays: { type: Number, default: 30, min: 1 },
    expiryDate: { type: Date },
    downloadSpeedMbps: { type: Number, default: 100, min: 1 },
    uploadSpeedMbps: { type: Number, default: 100, min: 1 },
    dataLimitGb: { type: Number, default: 0, min: 0 },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    activeSubscribersCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CustomerPlanSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export const CustomerPlan = model<ICustomerPlan>('CustomerPlan', CustomerPlanSchema);
