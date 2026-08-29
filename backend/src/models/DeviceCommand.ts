import { Schema, model, Document, Types } from 'mongoose';

export type CommandActionType =
  | 'GET_PARAMETERS'
  | 'GET_PARAMETER_NAMES'
  | 'GetParameterNames'
  | 'GetParameterValues'
  | 'SetParameterValues'
  | 'SUMMON_LIVE_POLL'
  | 'CUSTOM_RPC'
  | 'REFRESH_TELEMETRY'
  | 'SET_WIFI_CONFIG'
  | 'SET_WAN_CONFIG'
  | 'BLOCK_CLIENT'
  | 'UNBLOCK_CLIENT'
  | 'REBOOT_DEVICE'
  | 'RUN_DIAGNOSTICS'
  | 'FIRMWARE_UPGRADE'
  | 'FACTORY_RESET';

export type CommandStatus =
  | 'pending'
  | 'created'
  | 'authorized'
  | 'queued'
  | 'dispatching'
  | 'sending'
  | 'sent'
  | 'acknowledged'
  | 'applied'
  | 'applied_pending_verification'
  | 'verifying'
  | 'verified'
  | 'verification_failed'
  | 'success'
  | 'failed'
  | 'expired'
  | 'timed_out'
  | 'canceled'
  | 'cancelled'
  | 'rolled_back';

export interface IDeviceCommand extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  deviceId: Types.ObjectId;
  customerId?: Types.ObjectId;
  action: CommandActionType;
  parameters: Record<string, any>;
  previousState?: Record<string, any>;
  status: CommandStatus;
  requestedBy: {
    userId: Types.ObjectId;
    role: string;
    email: string;
  };
  queuedAt: Date;
  sentAt?: Date;
  verifiedAt?: Date;
  completedAt?: Date;
  cwmpRequestId?: string;
  cwmpResponseStatus?: number;
  cwmpResponseTimestamp?: Date;
  affectedParameterPaths?: string[];
  dataModel?: 'TR-181' | 'TR-098';
  retryCount?: number;
  originalCommandId?: Types.ObjectId;
  verificationTargetValues?: Record<string, any>;
  verificationResult?: {
    verified: boolean;
    readBackValues: Record<string, any>;
    mismatches: string[];
  };
  errorMessage?: string;
  correlationId: string;
  rollbackOnFailure: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceCommandSchema = new Schema<IDeviceCommand>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
    action: {
      type: String,
      enum: [
        'GET_PARAMETERS',
        'GET_PARAMETER_NAMES',
        'GetParameterNames',
        'GetParameterValues',
        'SetParameterValues',
        'SUMMON_LIVE_POLL',
        'CUSTOM_RPC',
        'REFRESH_TELEMETRY',
        'SET_WIFI_CONFIG',
        'SET_WAN_CONFIG',
        'BLOCK_CLIENT',
        'UNBLOCK_CLIENT',
        'REBOOT_DEVICE',
        'RUN_DIAGNOSTICS',
        'FIRMWARE_UPGRADE',
        'FACTORY_RESET',
      ],
      default: 'GET_PARAMETERS',
      index: true,
    },
    parameters: { type: Schema.Types.Mixed, default: () => ({}) },
    previousState: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: [
        'pending',
        'PENDING',
        'created',
        'authorized',
        'queued',
        'dispatching',
        'sending',
        'sent',
        'acknowledged',
        'applied',
        'applied_pending_verification',
        'verifying',
        'verified',
        'verification_failed',
        'success',
        'failed',
        'expired',
        'timed_out',
        'canceled',
        'cancelled',
        'rolled_back',
      ],
      default: 'pending',
      index: true,
    },
    requestedBy: {
      userId: { type: Schema.Types.Mixed, default: () => new Types.ObjectId() },
      role: { type: String, default: 'operator_admin' },
      email: { type: String, default: 'operator@ai-ispos.com' },
    },
    queuedAt: { type: Date, default: Date.now },
    sentAt: { type: Date },
    verifiedAt: { type: Date },
    completedAt: { type: Date },
    cwmpRequestId: { type: String },
    cwmpResponseStatus: { type: Number },
    cwmpResponseTimestamp: { type: Date },
    affectedParameterPaths: [{ type: String }],
    dataModel: { type: String, enum: ['TR-181', 'TR-098'] },
    retryCount: { type: Number, default: 0 },
    originalCommandId: { type: Schema.Types.ObjectId, ref: 'DeviceCommand' },
    verificationTargetValues: { type: Schema.Types.Mixed },
    verificationResult: {
      verified: { type: Boolean },
      readBackValues: { type: Schema.Types.Mixed },
      mismatches: [{ type: String }],
    },
    errorMessage: { type: String },
    correlationId: { type: String, default: () => `corr_${Date.now()}`, index: true },
    rollbackOnFailure: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DeviceCommandSchema.index({ tenantId: 1, status: 1, queuedAt: -1 });

export const DeviceCommand = model<IDeviceCommand>('DeviceCommand', DeviceCommandSchema);
