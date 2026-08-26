import { Schema, model, Document, Types } from 'mongoose';

export interface IChecklistItem {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
  completedAt?: Date;
}

export interface IJobEvidence {
  preRxPowerDbm?: number;
  postRxPowerDbm?: number;
  measuredLossDb?: number;
  photoUrls: string[];
  technicianNotes: string;
  customerSignatureUrl?: string;
  customerOtpVerified?: boolean;
}

export interface ITechnicianJob extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  jobNumber: string; // e.g. "JOB-2026-089"
  technicianUserId: Types.ObjectId;
  customerId: Types.ObjectId;
  ticketId?: Types.ObjectId;
  incidentId?: Types.ObjectId;
  title: string;
  type: 'NEW_INSTALLATION' | 'FIBER_FAULT_REPAIR' | 'ONT_REPLACEMENT' | 'RELOCATION' | 'ROUTINE_CHECK';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'assigned' | 'in_progress' | 'escalated' | 'completed' | 'cancelled';
  scheduledDate: Date;
  slaDeadline: Date;
  slaBreached: boolean;
  location: {
    lat: number;
    lng: number;
    address: string;
    area: string;
  };
  guidedChecklist: IChecklistItem[];
  evidence: IJobEvidence;
  aiSuggestedNextStep?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TechnicianJobSchema = new Schema<ITechnicianJob>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    jobNumber: { type: String, default: () => `JOB-${Date.now()}`, trim: true },
    technicianUserId: { type: Schema.Types.ObjectId, ref: 'User', default: () => new Types.ObjectId(), index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: () => new Types.ObjectId(), index: true },
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', index: true },
    incidentId: { type: Schema.Types.ObjectId, ref: 'Incident', index: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        'NEW_INSTALLATION',
        'FIBER_FAULT_REPAIR',
        'ONT_REPLACEMENT',
        'RELOCATION',
        'ROUTINE_CHECK',
      ],
      default: 'FIBER_FAULT_REPAIR',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['assigned', 'in_progress', 'escalated', 'completed', 'cancelled'],
      default: 'assigned',
      index: true,
    },
    scheduledDate: { type: Date, default: Date.now },
    slaDeadline: { type: Date, default: () => new Date(Date.now() + 8 * 3600000) },
    slaBreached: { type: Boolean, default: false },
    location: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
      address: { type: String, default: '' },
      area: { type: String, default: '' },
    },
    guidedChecklist: [
      {
        id: { type: String, required: true },
        label: { type: String, required: true },
        required: { type: Boolean, default: true },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date },
      },
    ],
    evidence: {
      preRxPowerDbm: { type: Number },
      postRxPowerDbm: { type: Number },
      measuredLossDb: { type: Number },
      photoUrls: [{ type: String }],
      technicianNotes: { type: String, default: '' },
      customerSignatureUrl: { type: String },
      customerOtpVerified: { type: Boolean, default: false },
    },
    aiSuggestedNextStep: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

TechnicianJobSchema.index({ tenantId: 1, jobNumber: 1 }, { unique: true });
TechnicianJobSchema.index({ tenantId: 1, technicianUserId: 1, status: 1 });

export const TechnicianJob = model<ITechnicianJob>('TechnicianJob', TechnicianJobSchema);
