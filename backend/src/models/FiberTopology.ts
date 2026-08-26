import { Schema, model, Document, Types } from 'mongoose';

// 1. OLT Chassis Model
export interface IOLT extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  name: string;
  code: string;
  ipAddress: string;
  vendor: string; // e.g. "Huawei MA5800", "ZTE C320", "Nokia FX-4"
  modelName: string;
  totalSlots: number;
  totalPonPorts: number;
  location: {
    name: string;
    lat: number;
    lng: number;
    address: string;
  };
  status: 'online' | 'warning' | 'critical' | 'offline';
  temperatureC?: number;
  cpuUsagePercent?: number;
  createdAt: Date;
  updatedAt: Date;
}

const OLTSchema = new Schema<IOLT>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, default: function(this: any) { return this.name ? this.name.toUpperCase().replace(/\s+/g, '-') : 'OLT-01'; }, trim: true },
    ipAddress: { type: String, required: true },
    vendor: { type: String, default: 'Huawei' },
    modelName: { type: String, default: 'MA5800-X7' },
    totalSlots: { type: Number, default: 7 },
    totalPonPorts: { type: Number, default: 16 },
    location: {
      name: { type: String, default: 'Central POP / NOC' },
      lat: { type: Number, default: 12.9352 },
      lng: { type: Number, default: 77.6245 },
      address: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['online', 'warning', 'critical', 'offline'],
      default: 'online',
    },
    temperatureC: { type: Number, default: 38 },
    cpuUsagePercent: { type: Number, default: 22 },
  },
  { timestamps: true }
);

OLTSchema.index({ tenantId: 1, code: 1 }, { unique: true });
export const OLT = model<IOLT>('OLT', OLTSchema);

// 2. PON Port Model
export interface IPONPort extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  oltId: Types.ObjectId;
  slotNumber: number;
  portNumber: number;
  portIdentifier: string; // e.g. "0/1/3"
  splitRatio: string; // e.g. "1:64"
  txPowerDbm: number; // e.g. +4.5 dBm
  maxOnts: number;
  connectedOntsCount: number;
  onlineOntsCount: number;
  status: 'active' | 'degraded' | 'los' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
}

const PONPortSchema = new Schema<IPONPort>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    oltId: { type: Schema.Types.ObjectId, ref: 'OLT', required: true, index: true },
    slotNumber: { type: Number, default: 0 },
    portNumber: { type: Number, default: 1 },
    portIdentifier: { type: String, default: function(this: any) { return `${this.slotNumber ?? 0}/${this.portNumber ?? 1}`; } },
    splitRatio: { type: String, default: '1:64' },
    txPowerDbm: { type: Number, default: 4.5 },
    maxOnts: { type: Number, default: 64 },
    connectedOntsCount: { type: Number, default: 0 },
    onlineOntsCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'degraded', 'los', 'disabled'],
      default: 'active',
    },
  },
  { timestamps: true }
);

PONPortSchema.index({ tenantId: 1, oltId: 1, portIdentifier: 1 }, { unique: true });
export const PONPort = model<IPONPort>('PONPort', PONPortSchema);

// 3. Fiber Passive Infrastructure Node (Joint Box, Splitter, FAT/NAP)
export type FiberNodeType =
  | 'CENTRAL_OFFICE'
  | 'JOINT_BOX'
  | 'PRIMARY_SPLITTER'
  | 'SECONDARY_SPLITTER'
  | 'FAT_NAP_BOX'
  | 'MANHOLE'
  | 'POLE';

export interface IFiberNode extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  nodeCode: string; // e.g. "FAT-KORM-04", "JB-SOUTH-02"
  name: string;
  type: FiberNodeType;
  nodeType?: string;
  location: {
    lat: number;
    lng: number;
    address: string;
    elevationMeters?: number;
  };
  totalCapacity: number; // e.g. 8 ports, 16 ports, 24 splices
  usedCapacity: number;
  upstreamNodeId?: Types.ObjectId;
  upstreamPortNumber?: number;
  ponPortId?: Types.ObjectId;
  oltId?: Types.ObjectId;
  qrCodeToken?: string;
  status: 'healthy' | 'maintenance' | 'fault' | 'planned';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FiberNodeSchema = new Schema<IFiberNode>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    nodeCode: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        'CENTRAL_OFFICE',
        'JOINT_BOX',
        'PRIMARY_SPLITTER',
        'SECONDARY_SPLITTER',
        'FAT_NAP_BOX',
        'MANHOLE',
        'POLE',
      ],
      default: function(this: any) { return this.nodeType || 'FAT_NAP_BOX'; },
      index: true,
    },
    nodeType: {
      type: String,
      default: function(this: any) { return this.type || 'CENTRAL_OFFICE'; },
    },
    location: {
      lat: { type: Number, default: function(this: any) { return this.coordinates?.lat || 12.9716; } },
      lng: { type: Number, default: function(this: any) { return this.coordinates?.lng || 77.5946; } },
      address: { type: String, default: '' },
      elevationMeters: { type: Number, default: 0 },
    },
    totalCapacity: { type: Number, default: 16 },
    usedCapacity: { type: Number, default: 0 },
    upstreamNodeId: { type: Schema.Types.ObjectId, ref: 'FiberNode', index: true },
    upstreamPortNumber: { type: Number },
    ponPortId: { type: Schema.Types.ObjectId, ref: 'PONPort', index: true },
    oltId: { type: Schema.Types.ObjectId, ref: 'OLT', index: true },
    qrCodeToken: { type: String },
    status: {
      type: String,
      enum: ['healthy', 'maintenance', 'fault', 'planned'],
      default: 'healthy',
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

FiberNodeSchema.index({ tenantId: 1, nodeCode: 1 }, { unique: true });
export const FiberNode = model<IFiberNode>('FiberNode', FiberNodeSchema);

// 4. Fiber Cable Segment Model
export interface IFiberSegment extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  cableCode: string; // e.g. "FIB-FEED-01", "FIB-DIST-04"
  name: string;
  category: 'FEEDER' | 'DISTRIBUTION' | 'DROP';
  fiberStandard: string; // e.g. "G.652.D Single-Mode"
  totalCores: number; // e.g. 24, 48, 96
  liveCores: number;
  darkCores: number;
  fromNodeId: Types.ObjectId;
  toNodeId: Types.ObjectId;
  lengthMeters: number;
  attenuationDbPerKm: number;
  measuredLossDb: number;
  status: 'healthy' | 'attenuated' | 'cut' | 'maintenance';
  coordinates: Array<{ lat: number; lng: number }>; // Geo polyline
  createdAt: Date;
  updatedAt: Date;
}

const FiberSegmentSchema = new Schema<IFiberSegment>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    cableCode: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['FEEDER', 'DISTRIBUTION', 'DROP'],
      default: 'DISTRIBUTION',
      index: true,
    },
    fiberStandard: { type: String, default: 'G.652.D Single-Mode' },
    totalCores: { type: Number, default: 24 },
    liveCores: { type: Number, default: 12 },
    darkCores: { type: Number, default: 12 },
    fromNodeId: { type: Schema.Types.ObjectId, ref: 'FiberNode', required: true, index: true },
    toNodeId: { type: Schema.Types.ObjectId, ref: 'FiberNode', required: true, index: true },
    lengthMeters: { type: Number, required: true },
    attenuationDbPerKm: { type: Number, default: 0.35 },
    measuredLossDb: { type: Number, default: 0.8 },
    status: {
      type: String,
      enum: ['healthy', 'attenuated', 'cut', 'maintenance'],
      default: 'healthy',
      index: true,
    },
    coordinates: [
      {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

FiberSegmentSchema.index({ tenantId: 1, cableCode: 1 }, { unique: true });
export const FiberSegment = model<IFiberSegment>('FiberSegment', FiberSegmentSchema);
