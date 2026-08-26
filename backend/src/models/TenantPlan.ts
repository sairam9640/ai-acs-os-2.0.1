import { Schema, model, Document } from 'mongoose';

export interface ITenantPlan extends Document {
  name: string; // e.g. "Starter", "Growth", "Enterprise Pro", "Carrier Custom"
  code: string;
  maxCustomers: number;
  maxDevices: number;
  maxTechnicians: number;
  monthlyFee: number;
  annualFee: number;
  currency: string;
  features: string[];
  isPublic: boolean;
  activeSubscriptionsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const TenantPlanSchema = new Schema<ITenantPlan>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, index: true },
    maxCustomers: { type: Number, required: true },
    maxDevices: { type: Number, required: true },
    maxTechnicians: { type: Number, required: true },
    monthlyFee: { type: Number, required: true },
    annualFee: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    features: [{ type: String }],
    isPublic: { type: Boolean, default: true },
    activeSubscriptionsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const TenantPlan = model<ITenantPlan>('TenantPlan', TenantPlanSchema);
