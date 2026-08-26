import { Schema, model, Document, Types } from 'mongoose';

export type HighRiskActionType =
  | 'REBOOT_DEVICE'
  | 'DELETE_WAN_PROFILE'
  | 'FIRMWARE_UPGRADE'
  | 'FACTORY_RESET'
  | 'BULK_CONFIGURATION'
  | 'PON_PORT_RESET';

export interface IApprovalPolicy extends Document {
  tenantId: Types.ObjectId;
  requireApprovalForReboot: boolean;
  requireApprovalForWanDelete: boolean;
  requireApprovalForFirmware: boolean;
  requireApprovalForReset: boolean;
  requireApprovalForBulk: boolean;
  approverRoles: string[]; // e.g. ['super_admin', 'operator_admin']
  autoExpireHours: number;
  createdAt: Date;
  updatedAt: Date;
}

const ApprovalPolicySchema = new Schema<IApprovalPolicy>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true, index: true },
    requireApprovalForReboot: { type: Boolean, default: false },
    requireApprovalForWanDelete: { type: Boolean, default: true },
    requireApprovalForFirmware: { type: Boolean, default: true },
    requireApprovalForReset: { type: Boolean, default: true },
    requireApprovalForBulk: { type: Boolean, default: true },
    approverRoles: [{ type: String, default: ['operator_admin', 'super_admin'] }],
    autoExpireHours: { type: Number, default: 24 },
  },
  { timestamps: true }
);

export const ApprovalPolicy = model<IApprovalPolicy>('ApprovalPolicy', ApprovalPolicySchema);

export interface IApprovalRequest extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  requestNumber: string; // e.g. "APR-2026-0042"
  actionType: HighRiskActionType;
  targetResource: string; // e.g. "Device", "Customer", "PONPort"
  targetId: Types.ObjectId;
  targetIdentifier: string; // Serial, Account #, Port ID
  requestedBy: {
    userId: Types.ObjectId;
    fullName: string;
    email: string;
    role: string;
  };
  reason: string;
  parameters: Record<string, any>;
  previousState?: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  decisionBy?: {
    userId: Types.ObjectId;
    fullName: string;
    email: string;
    role: string;
  };
  decisionNotes?: string;
  decisionAt?: Date;
  executedCommandId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ApprovalRequestSchema = new Schema<IApprovalRequest>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    requestNumber: { type: String, default: () => `APR-${Date.now()}`, trim: true },
    actionType: {
      type: String,
      default: function(this: any) { return this.action || 'REBOOT_DEVICE'; },
      index: true,
    },
    targetResource: {
      type: Schema.Types.Mixed,
      default: 'Device',
    },
    targetId: {
      type: Schema.Types.Mixed,
      default: () => new Types.ObjectId(),
    },
    targetIdentifier: {
      type: String,
      default: function(this: any) {
        if (typeof this.targetResource === 'object' && this.targetResource?.identifier) {
          return this.targetResource.identifier;
        }
        return 'TARGET-01';
      },
    },
    requestedBy: {
      userId: { type: Schema.Types.Mixed, default: () => new Types.ObjectId() },
      fullName: { type: String, default: function(this: any) { return this.name || 'Operator'; } },
      email: { type: String, default: 'operator@ai-ispos.com' },
      role: { type: String, default: 'noc_operator' },
    },
    reason: { type: String, default: 'Operational maintenance request' },
    parameters: { type: Schema.Types.Mixed, default: () => ({}) },
    previousState: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'],
      default: 'pending',
      index: true,
    },
    decisionBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      fullName: { type: String },
      email: { type: String },
      role: { type: String },
    },
    decisionNotes: { type: String },
    decisionAt: { type: Date },
    executedCommandId: { type: Schema.Types.ObjectId, ref: 'DeviceCommand' },
  },
  { timestamps: true }
);

ApprovalRequestSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export const ApprovalRequest = model<IApprovalRequest>('ApprovalRequest', ApprovalRequestSchema);
