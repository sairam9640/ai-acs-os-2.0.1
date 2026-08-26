import { Schema, model, Document, Types } from 'mongoose';

export type CwmpRpcDirection = 'CPE_TO_ACS' | 'ACS_TO_CPE';

export interface ICwmpSessionLog extends Document {
  _id: Types.ObjectId;
  tenantId?: Types.ObjectId;
  deviceId?: Types.ObjectId;
  serialNumber: string;
  sessionId: string;
  cwmpId?: string;
  direction: CwmpRpcDirection;
  rpcMethod: string;
  httpStatus: number;
  rawXml?: string;
  faultCode?: string;
  faultString?: string;
  durationMs?: number;
  timestamp: Date;
  createdAt: Date;
}

const CwmpSessionLogSchema = new Schema<ICwmpSessionLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', index: true },
    serialNumber: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    cwmpId: { type: String },
    direction: { type: String, enum: ['CPE_TO_ACS', 'ACS_TO_CPE'], required: true },
    rpcMethod: { type: String, required: true, index: true },
    httpStatus: { type: Number, default: 200 },
    rawXml: { type: String },
    faultCode: { type: String },
    faultString: { type: String },
    durationMs: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

CwmpSessionLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 86400 });
CwmpSessionLogSchema.index({ serialNumber: 1, timestamp: -1 });

export const CwmpSessionLog = model<ICwmpSessionLog>('CwmpSessionLog', CwmpSessionLogSchema);
