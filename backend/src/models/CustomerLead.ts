import { Schema, model, Document, Types } from 'mongoose';

export type LeadStatus = 'NEW_LEAD' | 'CONTACTED' | 'SURVEY_SCHEDULED' | 'FEASIBILITY_PASSED' | 'CONVERTED' | 'DROPPED';
export type LeadSource = 'WHATSAPP_BOT' | 'WEBSITE' | 'REFERRAL' | 'MANUAL';

export interface ICustomerLead extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  leadNumber: string; // e.g. "LEAD-2026-1044"
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  pincode: string;
  status: LeadStatus;
  source: LeadSource;
  notes?: string;
  assignedTechnicianId?: Types.ObjectId;
  convertedCustomerId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerLeadSchema = new Schema<ICustomerLead>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    leadNumber: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, index: true, trim: true },
    email: { type: String, trim: true },
    address: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['NEW_LEAD', 'CONTACTED', 'SURVEY_SCHEDULED', 'FEASIBILITY_PASSED', 'CONVERTED', 'DROPPED'],
      default: 'NEW_LEAD',
      index: true,
    },
    source: {
      type: String,
      enum: ['WHATSAPP_BOT', 'WEBSITE', 'REFERRAL', 'MANUAL'],
      default: 'WHATSAPP_BOT',
    },
    notes: { type: String },
    assignedTechnicianId: { type: Schema.Types.ObjectId, ref: 'User' },
    convertedCustomerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  },
  { timestamps: true }
);

export const CustomerLead = model<ICustomerLead>('CustomerLead', CustomerLeadSchema);
