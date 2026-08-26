import { Schema, model, Document, Types } from 'mongoose';

export type PendingMappingReason =
  | 'MISSING_SLUG_AND_SUBDOMAIN'
  | 'UNKNOWN_TENANT_SLUG'
  | 'INVALID_SUBDOMAIN'
  | 'CONFLICTING_HEADER'
  | 'MANUAL_HOLD';

export type PendingMappingStatus = 'PENDING' | 'MAPPED' | 'IGNORED';

export interface IPendingDeviceMapping extends Document {
  _id: Types.ObjectId;
  serialNumber: string;
  manufacturer: string;
  oui?: string;
  productClass?: string;
  softwareVersion?: string;
  hardwareVersion?: string;
  macAddress?: string;
  incomingHost?: string;
  incomingUrl?: string;
  pathOrQuerySlug?: string;
  clientIp?: string;
  reason: PendingMappingReason;
  status: PendingMappingStatus;
  mappedTenantId?: Types.ObjectId;
  mappedTenantSlug?: string;
  mappedBy?: Types.ObjectId;
  mappedAt?: Date;
  lastWhatsAppAlertAt?: Date;
  alertCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  rawInformXml?: string;
  wifi24?: {
    ssid?: string;
    password?: string;
    enabled?: boolean;
    channel?: number;
    bandwidthMhz?: number;
    securityMode?: string;
    txPowerPercent?: number;
  };
  wifi5g?: {
    ssid?: string;
    password?: string;
    enabled?: boolean;
    channel?: number;
    bandwidthMhz?: number;
    securityMode?: string;
    txPowerPercent?: number;
  };
  wan?: {
    pppoeUsername?: string;
    vlanId?: number;
    connectionType?: string;
    ipAddress?: string;
    macAddress?: string;
    status?: string;
  };
  telemetry?: {
    rxPowerDbm?: number;
    txPowerDbm?: number;
    voltageV?: number;
    biasCurrentMa?: number;
    temperatureC?: number;
    lanHostCount?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PendingDeviceMappingSchema = new Schema<IPendingDeviceMapping>(
  {
    serialNumber: { type: String, required: true, unique: true, index: true },
    manufacturer: { type: String, default: 'UNKNOWN' },
    oui: { type: String },
    productClass: { type: String },
    softwareVersion: { type: String },
    hardwareVersion: { type: String },
    macAddress: { type: String },
    incomingHost: { type: String },
    incomingUrl: { type: String },
    pathOrQuerySlug: { type: String },
    clientIp: { type: String },
    wifi24: {
      ssid: { type: String, default: '' },
      password: { type: String, default: '' },
      enabled: { type: Boolean, default: true },
      channel: { type: Number, default: 6 },
      bandwidthMhz: { type: Number, default: 20 },
      securityMode: { type: String, default: 'WPA2-PSK' },
      txPowerPercent: { type: Number, default: 100 },
    },
    wifi5g: {
      ssid: { type: String, default: '' },
      password: { type: String, default: '' },
      enabled: { type: Boolean, default: true },
      channel: { type: Number, default: 44 },
      bandwidthMhz: { type: Number, default: 80 },
      securityMode: { type: String, default: 'WPA2-PSK' },
      txPowerPercent: { type: Number, default: 100 },
    },
    wan: {
      pppoeUsername: { type: String },
      vlanId: { type: Number },
      connectionType: { type: String, default: 'PPPoE' },
      ipAddress: { type: String },
      macAddress: { type: String },
      status: { type: String },
    },
    telemetry: {
      rxPowerDbm: { type: Number },
      txPowerDbm: { type: Number },
      voltageV: { type: Number },
      biasCurrentMa: { type: Number },
      temperatureC: { type: Number },
      lanHostCount: { type: Number, default: 0 },
    },
    reason: {
      type: String,
      enum: [
        'MISSING_SLUG_AND_SUBDOMAIN',
        'UNKNOWN_TENANT_SLUG',
        'INVALID_SUBDOMAIN',
        'CONFLICTING_HEADER',
        'MANUAL_HOLD',
      ],
      default: 'MISSING_SLUG_AND_SUBDOMAIN',
    },
    status: {
      type: String,
      enum: ['PENDING', 'MAPPED', 'IGNORED'],
      default: 'PENDING',
      index: true,
    },
    mappedTenantId: { type: Schema.Types.ObjectId, ref: 'Tenant' },
    mappedTenantSlug: { type: String },
    mappedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    mappedAt: { type: Date },
    lastWhatsAppAlertAt: { type: Date },
    alertCount: { type: Number, default: 0 },
    firstSeenAt: { type: Date, default: Date.now },
    rawInformXml: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret: any) => {
        if (ret.wifi24) delete ret.wifi24.password;
        if (ret.wifi5g) delete ret.wifi5g.password;
        if (ret.wan) {
          ret.wan.passwordConfigured = Boolean(ret.wan.pppoePasswordEncrypted || ret.wan.pppoePassword);
          delete ret.wan.pppoePasswordEncrypted;
          delete ret.wan.pppoePassword;
          ret.wan.pppoePasswordMasked = '••••••••';
        }
        return ret;
      },
    },
  }
);

export const PendingDeviceMapping = model<IPendingDeviceMapping>(
  'PendingDeviceMapping',
  PendingDeviceMappingSchema
);
