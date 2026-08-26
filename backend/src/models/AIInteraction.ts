import { Schema, model, Document, Types } from 'mongoose';

export interface IAIInteraction extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  userRole: string;
  contextType: 'INCIDENT_DIAGNOSIS' | 'ONT_TROUBLESHOOT' | 'CUSTOMER_ASSIST' | 'FIELD_TECH_GUIDE';
  prompt: string;
  evidence: {
    affectedScope?: string;
    commonPonPortId?: Types.ObjectId;
    commonFiberSegmentId?: Types.ObjectId;
    opticalTrendSummary?: string;
    recentAlarmsCount?: number;
    offlineOntCount?: number;
  };
  reasoningSteps: string[];
  confidenceScore: number; // e.g. 0.94 (94%)
  recommendedActions: Array<{
    actionType: string;
    description: string;
    isPrivileged: boolean;
    parameters?: Record<string, any>;
  }>;
  requiresHumanApproval: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'auto_applied';
  approvedByUserId?: Types.ObjectId;
  approvedAt?: Date;
  executedCommandId?: Types.ObjectId;
  executionResult?: string;
  userFeedbackRating?: number; // 1 to 5
  userFeedbackNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AIInteractionSchema = new Schema<IAIInteraction>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userRole: { type: String, required: true },
    contextType: {
      type: String,
      enum: ['INCIDENT_DIAGNOSIS', 'ONT_TROUBLESHOOT', 'CUSTOMER_ASSIST', 'FIELD_TECH_GUIDE'],
      required: true,
      index: true,
    },
    prompt: { type: String, required: true },
    evidence: {
      affectedScope: { type: String },
      commonPonPortId: { type: Schema.Types.ObjectId, ref: 'PONPort' },
      commonFiberSegmentId: { type: Schema.Types.ObjectId, ref: 'FiberSegment' },
      opticalTrendSummary: { type: String },
      recentAlarmsCount: { type: Number, default: 0 },
      offlineOntCount: { type: Number, default: 0 },
    },
    reasoningSteps: [{ type: String }],
    confidenceScore: { type: Number, default: 0.9 },
    recommendedActions: [
      {
        actionType: { type: String, required: true },
        description: { type: String, required: true },
        isPrivileged: { type: Boolean, default: false },
        parameters: { type: Schema.Types.Mixed },
      },
    ],
    requiresHumanApproval: { type: Boolean, default: false },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'auto_applied'],
      default: 'pending',
    },
    approvedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    executedCommandId: { type: Schema.Types.ObjectId, ref: 'DeviceCommand' },
    executionResult: { type: String },
    userFeedbackRating: { type: Number },
    userFeedbackNotes: { type: String },
  },
  { timestamps: true }
);

export const AIInteraction = model<IAIInteraction>('AIInteraction', AIInteractionSchema);
