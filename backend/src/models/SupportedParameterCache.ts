import { Schema, model, Document, Types } from 'mongoose';

export type ParameterSupportStatus = 'SUPPORTED' | 'UNSUPPORTED' | 'UNKNOWN' | 'STALE';

export interface ISupportedParameterCache extends Document {
  _id: Types.ObjectId;
  tenantId?: Types.ObjectId;
  vendor: string;
  manufacturer?: string;
  oui?: string;
  productClass?: string;
  modelName?: string;
  firmwareVersion?: string;
  protocol?: string;
  dataModel?: string;
  parameterPath: string;
  category?: string;
  writable?: boolean;
  status: ParameterSupportStatus;
  firstSeen?: Date;
  lastSeen?: Date;
  lastVerified?: Date;
  lastCheckedAt: Date;
  lastErrorCode?: string;
  lastRawFault?: string;
  lastRawResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupportedParameterCacheSchema = new Schema<ISupportedParameterCache>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    vendor: { type: String, required: true, index: true },
    manufacturer: { type: String, index: true },
    oui: { type: String, index: true },
    productClass: { type: String, index: true },
    modelName: { type: String, index: true },
    firmwareVersion: { type: String, index: true },
    protocol: { type: String, default: 'TR-069' },
    dataModel: { type: String, default: 'TR-098' },
    parameterPath: { type: String, required: true, index: true },
    category: { type: String, default: 'OTHER', index: true },
    writable: { type: Boolean, default: false },
    status: { type: String, enum: ['SUPPORTED', 'UNSUPPORTED', 'UNKNOWN', 'STALE'], default: 'UNKNOWN', index: true },
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
    lastVerified: { type: Date },
    lastCheckedAt: { type: Date, default: Date.now },
    lastErrorCode: { type: String },
    lastRawFault: { type: String },
    lastRawResponse: { type: String },
  },
  { timestamps: true }
);

SupportedParameterCacheSchema.index(
  { vendor: 1, modelName: 1, firmwareVersion: 1, parameterPath: 1 },
  { unique: false }
);

SupportedParameterCacheSchema.index(
  { modelName: 1, category: 1 }
);

export const SupportedParameterCache = model<ISupportedParameterCache>(
  'SupportedParameterCache',
  SupportedParameterCacheSchema
);
