import { Schema, model, Document, Types } from 'mongoose';

export interface ICustomerServicePlan {
  planId?: string;
  name: string;
  price?: number;
  downloadSpeedMbps: number;
  uploadSpeedMbps: number;
  monthlyFee: number;
  dataLimitGb: number; // 0 = unlimited
  currentCycleUsageGb: number;
  billingStatus: 'paid' | 'overdue' | 'grace_period';
  startDate?: Date;
  endDate?: Date;
  renewalDate: Date;
  status?: 'active' | 'expiring_soon' | 'expired' | 'grace_period' | 'suspended';
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  paymentReference?: string;
  notificationHistory?: Array<{
    eventType: string;
    eventKey: string;
    emittedAt: Date;
    recipientPhone: string;
  }>;
}

export interface ICustomerWanConfig {
  connectionType: 'PPPoE' | 'DHCP' | 'Static';
  pppoeUsername?: string;
  pppoePasswordEncrypted?: string;
  pppoePassword?: string;
  passwordConfigured?: boolean;
  pppoePasswordMasked?: string;
  vlanId: number;
  staticIp?: string;
  gateway?: string;
  dnsPrimary?: string;
  dnsSecondary?: string;
}

export interface ICustomerKyc {
  documentType: 'aadhaar' | 'pan' | 'voter_id' | 'passport' | 'driving_license' | 'other';
  documentNumber: string;
  idProofFrontUrl?: string;
  idProofBackUrl?: string;
  addressProofUrl?: string;
  customerPhotoUrl?: string;
  status: 'verified' | 'pending' | 'rejected';
  verifiedAt?: Date;
}

export interface ICustomerDocument {
  documentId: string;
  name: string;
  category: 'AADHAAR_FRONT' | 'AADHAAR_BACK' | 'PAN_CARD' | 'CAF_FORM' | 'INSTALLATION_PHOTO' | 'OPTICAL_TERMINATION' | 'OTHER';
  url: string;
  fileSizeBytes?: number;
  uploadedAt: Date;
  uploadedByActorId?: string;
  uploadedByEmail?: string;
  isVerified?: boolean;
}

export interface ICustomer extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  accountNumber: string; // e.g. "CUST-RD-10023"
  serviceId: string; // e.g. "SRV-FTTH-890"
  fullName: string;
  phone: string;
  email: string;
  address: {
    door?: string;
    building?: string;
    street: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  kyc?: ICustomerKyc;
  documents?: ICustomerDocument[];
  assignedDeviceId?: Types.ObjectId; // References Device (ONT)
  fiberDropInfo: {
    fatBoxId?: Types.ObjectId; // References FiberNode (FAT/NAP)
    fatPortNumber?: number;
    dropCableLengthMeters?: number;
    splitterId?: Types.ObjectId;
    ponPortId?: Types.ObjectId;
    oltId?: Types.ObjectId;
  };
  servicePlan: ICustomerServicePlan;
  wanConfig: ICustomerWanConfig;
  status: 'active' | 'suspended' | 'pending_install' | 'churned';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    accountNumber: { type: String, required: true, trim: true },
    serviceId: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, lowercase: true, trim: true, index: true },
    address: {
      door: { type: String, default: '' },
      building: { type: String, default: '' },
      street: { type: String, default: '' },
      area: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      coordinates: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 },
      },
    },
    kyc: {
      documentType: { type: String, default: 'aadhaar' },
      documentNumber: { type: String, default: '' },
      idProofFrontUrl: { type: String, default: '' },
      idProofBackUrl: { type: String, default: '' },
      addressProofUrl: { type: String, default: '' },
      customerPhotoUrl: { type: String, default: '' },
      status: { type: String, enum: ['verified', 'pending', 'rejected'], default: 'verified' },
      verifiedAt: { type: Date, default: Date.now },
    },
    documents: [
      {
        documentId: { type: String, required: true },
        name: { type: String, required: true },
        category: {
          type: String,
          enum: [
            'AADHAAR_FRONT',
            'AADHAAR_BACK',
            'PAN_CARD',
            'CAF_FORM',
            'INSTALLATION_PHOTO',
            'OPTICAL_TERMINATION',
            'OTHER',
          ],
          default: 'OTHER',
        },
        url: { type: String, required: true },
        fileSizeBytes: { type: Number },
        uploadedAt: { type: Date, default: () => new Date() },
        uploadedByActorId: { type: String },
        uploadedByEmail: { type: String },
        isVerified: { type: Boolean, default: true },
      },
    ],
    assignedDeviceId: { type: Schema.Types.ObjectId, ref: 'Device', index: true },
    fiberDropInfo: {
      fatBoxId: { type: Schema.Types.ObjectId, ref: 'FiberNode' },
      fatBoxNodeId: { type: Schema.Types.ObjectId, ref: 'FiberNode' },
      fatPortNumber: { type: Number },
      portNumber: { type: Number },
      dropCableLengthMeters: { type: Number, default: 45 },
      splitterId: { type: Schema.Types.ObjectId, ref: 'FiberNode' },
      ponPortId: { type: Schema.Types.ObjectId, ref: 'PONPort' },
      oltId: { type: Schema.Types.ObjectId, ref: 'OLT' },
    },
    servicePlan: {
      planId: { type: String, default: 'plan_100m' },
      name: { type: String, default: 'SuperFast 100 Mbps Unlimited' },
      price: { type: Number, default: 699 },
      downloadSpeedMbps: { type: Number, default: 100 },
      uploadSpeedMbps: { type: Number, default: 100 },
      monthlyFee: { type: Number, default: 699 },
      dataLimitGb: { type: Number, default: 0 },
      currentCycleUsageGb: { type: Number, default: 142.5 },
      billingStatus: {
        type: String,
        enum: ['paid', 'overdue', 'grace_period'],
        default: 'paid',
      },
      startDate: { type: Date, default: () => new Date() },
      endDate: { type: Date, default: () => new Date(Date.now() + 30 * 86400000) },
      renewalDate: { type: Date, default: () => new Date(Date.now() + 30 * 86400000) },
      status: {
        type: String,
        enum: ['active', 'expiring_soon', 'expired', 'grace_period', 'suspended'],
        default: 'active',
      },
      lastPaymentDate: { type: Date },
      lastPaymentAmount: { type: Number },
      paymentReference: { type: String },
      notificationHistory: [
        {
          eventType: { type: String },
          eventKey: { type: String },
          emittedAt: { type: Date, default: () => new Date() },
          recipientPhone: { type: String },
        },
      ],
    },
    wanConfig: {
      connectionType: { type: String, default: 'PPPoE' },
      pppoeUsername: { type: String, default: 'user@isp' },
      pppoePasswordEncrypted: { type: String },
      vlanId: { type: Number, default: 100 },
      dnsPrimary: { type: String, default: '8.8.8.8' },
      dnsSecondary: { type: String, default: '1.1.1.1' },
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending_install', 'pending_installation', 'churned'],
      default: 'active',
      index: true,
    },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret: any) => {
        if (ret.wanConfig) {
          ret.wanConfig.passwordConfigured = Boolean(ret.wanConfig.pppoePasswordEncrypted || ret.wanConfig.pppoePassword);
          delete ret.wanConfig.pppoePasswordEncrypted;
          delete ret.wanConfig.pppoePassword;
          ret.wanConfig.pppoePasswordMasked = '••••••••';
        }
        return ret;
      },
    },
  }
);

CustomerSchema.index({ tenantId: 1, accountNumber: 1 }, { unique: true });
CustomerSchema.index({ tenantId: 1, serviceId: 1 }, { unique: true });
CustomerSchema.index({ tenantId: 1, phone: 1 });

export const Customer = model<ICustomer>('Customer', CustomerSchema);
