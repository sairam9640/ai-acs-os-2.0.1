import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  tenantId?: Types.ObjectId; // null for Super Admin platform actions
  actorId: Types.ObjectId;
  actorEmail: string;
  actorRole: string;
  action: string; // e.g. "TENANT_CREATED", "WIFI_PASSWORD_CHANGED", "DEVICE_REBOOTED", "FIBER_CUT_DISPATCHED"
  targetResource: string; // e.g. "Device", "Tenant", "Customer", "FiberSegment"
  targetId: string;
  targetIdentifier?: string; // Serial, Account #, Slug
  beforeStateSanitized?: Record<string, any>;
  afterStateSanitized?: Record<string, any>;
  correlationId: string;
  ipAddress: string;
  userAgent?: string;
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED_BY_POLICY';
  failureReason?: string;
  timestamp: Date;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorEmail: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, index: true },
    targetResource: { type: String, required: true, index: true },
    targetId: { type: String, required: true, index: true },
    targetIdentifier: { type: String },
    beforeStateSanitized: { type: Schema.Types.Mixed },
    afterStateSanitized: { type: Schema.Types.Mixed },
    correlationId: { type: String, required: true, index: true },
    ipAddress: { type: String, default: '127.0.0.1' },
    userAgent: { type: String, default: '' },
    result: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'BLOCKED_BY_POLICY'],
      default: 'SUCCESS',
      index: true,
    },
    failureReason: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

AuditLogSchema.index({ tenantId: 1, action: 1, timestamp: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);
