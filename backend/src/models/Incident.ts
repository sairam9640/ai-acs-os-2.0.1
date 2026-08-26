import { Schema, model, Document, Types } from 'mongoose';

export type IncidentSeverity = 'info' | 'warning' | 'major' | 'critical';
export type IncidentStatus =
  | 'open'
  | 'active'
  | 'acknowledged'
  | 'investigating'
  | 'identified'
  | 'in_progress'
  | 'monitoring'
  | 'resolved'
  | 'closed';

export interface IAlert extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  incidentId?: Types.ObjectId;
  severity: IncidentSeverity;
  sourceType: 'ONT_OPTICAL' | 'PON_LOS' | 'OLT_OFFLINE' | 'FIBER_CUT' | 'SLA_BREACH';
  sourceId: string;
  sourceName: string;
  message: string;
  valueRecorded?: number;
  thresholdDbm?: number;
  acknowledged: boolean;
  acknowledgedBy?: Types.ObjectId;
  acknowledgedAt?: Date;
  firstSeenAt: Date;
  lastSeenAt: Date;
  occurrencesCount: number;
}

const AlertSchema = new Schema<IAlert>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    incidentId: { type: Schema.Types.ObjectId, ref: 'Incident', index: true },
    severity: {
      type: String,
      enum: ['info', 'warning', 'major', 'critical'],
      default: 'warning',
      index: true,
    },
    sourceType: {
      type: String,
      enum: ['ONT_OPTICAL', 'PON_LOS', 'OLT_OFFLINE', 'FIBER_CUT', 'SLA_BREACH'],
      required: true,
      index: true,
    },
    sourceId: { type: String, required: true },
    sourceName: { type: String, required: true },
    message: { type: String, required: true },
    valueRecorded: { type: Number },
    thresholdDbm: { type: Number },
    acknowledged: { type: Boolean, default: false },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    occurrencesCount: { type: Number, default: 1 },
  },
  { timestamps: true }
);

AlertSchema.index({ tenantId: 1, sourceType: 1, sourceId: 1, acknowledged: 1 });
export const Alert = model<IAlert>('Alert', AlertSchema);

export interface IIncident extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  incidentNumber: string; // e.g. "INC-2026-0042"
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category: 'OPTICAL_DEGRADATION' | 'FIBER_CUT' | 'PON_OUTAGE' | 'POWER_OUTAGE' | 'HARDWARE_FAILURE';
  suspectedComponent?: {
    type: 'OLT' | 'PON' | 'FIBER_SEGMENT' | 'SPLITTER' | 'FAT_BOX' | 'ONT';
    id: Types.ObjectId;
    name: string;
    code: string;
  };
  affectedCustomersCount: number;
  affectedCustomerIds: Types.ObjectId[];
  assignedTechnicianId?: Types.ObjectId;
  slaDeadline: Date;
  slaBreached: boolean;
  rootCauseNotes?: string;
  resolutionSummary?: string;
  aiDiagnosticSummary?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IncidentSchema = new Schema<IIncident>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    incidentNumber: { type: String, default: () => `INC-${Date.now()}`, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: 'Network incident report' },
    severity: {
      type: String,
      enum: ['info', 'warning', 'major', 'critical'],
      default: 'major',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'active', 'acknowledged', 'investigating', 'identified', 'in_progress', 'monitoring', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    category: {
      type: String,
      enum: ['OPTICAL_DEGRADATION', 'FIBER_CUT', 'PON_OUTAGE', 'POWER_OUTAGE', 'HARDWARE_FAILURE'],
      default: 'OPTICAL_DEGRADATION',
    },
    suspectedComponent: {
      type: { type: String, enum: ['OLT', 'PON', 'FIBER_SEGMENT', 'SPLITTER', 'FAT_BOX', 'ONT'] },
      id: { type: Schema.Types.ObjectId },
      name: { type: String },
      code: { type: String },
    },
    affectedCustomersCount: { type: Number, default: 0 },
    affectedCustomerIds: [{ type: Schema.Types.ObjectId, ref: 'Customer' }],
    assignedTechnicianId: { type: Schema.Types.ObjectId, ref: 'User' },
    slaDeadline: { type: Date, default: () => new Date(Date.now() + 4 * 3600000) },
    slaBreached: { type: Boolean, default: false },
    rootCauseNotes: { type: String },
    resolutionSummary: { type: String },
    aiDiagnosticSummary: { type: String },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

IncidentSchema.index({ tenantId: 1, incidentNumber: 1 }, { unique: true });
IncidentSchema.index({ tenantId: 1, status: 1, severity: 1 });
export const Incident = model<IIncident>('Incident', IncidentSchema);
