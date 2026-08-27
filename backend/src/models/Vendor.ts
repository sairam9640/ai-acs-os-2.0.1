import { Schema, model, Document, Types } from 'mongoose';

export interface IVendor extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  name: string;
  code: string;
  contactPerson: string;
  phone: string;
  email: string;
  address?: string;
  taxNumber?: string; // GSTIN / Tax ID
  paymentTerms?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    contactPerson: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    taxNumber: { type: String, default: '' },
    paymentTerms: { type: String, default: 'Net 30' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

VendorSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export const Vendor = model<IVendor>('Vendor', VendorSchema);
