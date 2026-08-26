import { Schema, model, Document, Types } from 'mongoose';

export type AutomationTrigger =
  | 'OPTICAL_DROP_DETECTED'
  | 'OFFLINE_CLUSTER_DETECTED'
  | 'ALARM_TRIGGERED'
  | 'TICKET_CREATED'
  | 'COMMAND_FAILED';

export type AutomationAction =
  | 'SEND_WHATSAPP_NOTIFICATION'
  | 'CREATE_TECHNICIAN_JOB'
  | 'RUN_REMOTE_DIAGNOSTIC'
  | 'REQUEST_APPROVAL'
  | 'AUTO_REBOOT_ONT';

export interface IAutomationRule extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  conditions: {
    minOpticalDropDb?: number; // e.g. 6.0 dB
    minOfflineCount?: number; // e.g. 5 ONTs on same splitter/PON
    severity?: string;
    area?: string;
  };
  action: AutomationAction;
  actionPayload: Record<string, any>;
  cooldownMinutes: number; // e.g. 30 mins to prevent notification storm
  lastTriggeredAt?: Date;
  executionCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AutomationRuleSchema = new Schema<IAutomationRule>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    trigger: {
      type: String,
      enum: [
        'OPTICAL_DROP_DETECTED',
        'OFFLINE_CLUSTER_DETECTED',
        'ALARM_TRIGGERED',
        'TICKET_CREATED',
        'COMMAND_FAILED',
      ],
      required: true,
      index: true,
    },
    conditions: {
      minOpticalDropDb: { type: Number },
      minOfflineCount: { type: Number },
      severity: { type: String },
      area: { type: String },
    },
    action: {
      type: String,
      enum: [
        'SEND_WHATSAPP_NOTIFICATION',
        'CREATE_TECHNICIAN_JOB',
        'RUN_REMOTE_DIAGNOSTIC',
        'REQUEST_APPROVAL',
        'AUTO_REBOOT_ONT',
      ],
      required: true,
    },
    actionPayload: { type: Schema.Types.Mixed, default: {} },
    cooldownMinutes: { type: Number, default: 30 },
    lastTriggeredAt: { type: Date },
    executionCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const AutomationRule = model<IAutomationRule>('AutomationRule', AutomationRuleSchema);

export interface IAutomationLog extends Document {
  tenantId: Types.ObjectId;
  ruleId: Types.ObjectId;
  ruleName: string;
  trigger: string;
  contextData: Record<string, any>;
  actionExecuted: string;
  result: 'SUCCESS' | 'FAILED' | 'SKIPPED_COOLDOWN';
  message: string;
  timestamp: Date;
}

const AutomationLogSchema = new Schema<IAutomationLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    ruleId: { type: Schema.Types.ObjectId, ref: 'AutomationRule', required: true, index: true },
    ruleName: { type: String, required: true },
    trigger: { type: String, required: true },
    contextData: { type: Schema.Types.Mixed },
    actionExecuted: { type: String, required: true },
    result: { type: String, enum: ['SUCCESS', 'FAILED', 'SKIPPED_COOLDOWN'], default: 'SUCCESS' },
    message: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export const AutomationLog = model<IAutomationLog>('AutomationLog', AutomationLogSchema);
