import { Schema, model, Document, Types } from 'mongoose';

export interface ITenantPlanConfig {
  name: string;
  maxCustomers: number;
  maxDevices: number;
  maxTechnicians: number;
  monthlyFee: number;
  currency: string;
  billingCycle: 'monthly' | 'quarterly' | 'annually';
  features: string[];
}

export interface ITenantBranding {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
  supportPhone: string;
  supportEmail: string;
  portalTitle: string;
}

export interface ITenant extends Document {
  _id: Types.ObjectId;
  name: string;
  displayName: string;
  slug: string; // e.g. 'rudra', 'speednet'
  subdomain: string; // e.g. 'rudra.ai-ispos.com'
  customDomain?: string;
  operatorKey: string;
  status: 'active' | 'trial' | 'suspended' | 'archived';
  owner: {
    name: string;
    email: string;
    phone: string;
  };
  address?: {
    door?: string;
    street?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  branding: ITenantBranding;
  plan: ITenantPlanConfig;
  featureEntitlements: {
    tr069Acs: boolean;
    tr369Usp: boolean;
    fiberGis: boolean;
    aiCommandCenter: boolean;
    technicianDispatch: boolean;
    customerApp: boolean;
    whatsappAlerts: boolean;
    opticalDiagnostics: boolean;
  };
  opticalThresholds: {
    warningDbm: number; // e.g. -27.0
    criticalDbm: number; // e.g. -30.0
  };
  whatsapp?: {
    status: 'NOT_CONNECTED' | 'SCAN_QR_REQUIRED' | 'CONNECTED' | 'DISCONNECTED';
    phone?: string;
    deviceInfo?: string;
    pairedAt?: Date;
    lastSeen?: Date;
    qrCodeDataUrl?: string;
    qrCodeRaw?: string;
  };
  timezone: string;
  locale: string;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true },
    displayName: { type: String, default: function(this: any) { return this.name || 'ISP Tenant'; }, trim: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    subdomain: { type: String, required: true, unique: true, index: true, lowercase: true },
    customDomain: { type: String, sparse: true, unique: true },
    operatorKey: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['active', 'trial', 'suspended', 'archived'],
      default: 'active',
      index: true,
    },
    owner: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true },
    },
    address: {
      door: { type: String, default: '' },
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    branding: {
      logoUrl: { type: String, default: '/brand/default-logo.svg' },
      primaryColor: { type: String, default: '#2563eb' },
      secondaryColor: { type: String, default: '#0f172a' },
      companyName: { type: String, default: 'AI ISP Operator' },
      supportPhone: { type: String, default: '+91 1800 123 4567' },
      supportEmail: { type: String, default: 'support@example.com' },
      portalTitle: { type: String, default: 'ISP Operations Portal' },
    },
    plan: {
      name: { type: String, default: 'Enterprise Pro' },
      maxCustomers: { type: Number, default: 5000 },
      maxDevices: { type: Number, default: 5000 },
      maxTechnicians: { type: Number, default: 20 },
      monthlyFee: { type: Number, default: 4999 },
      currency: { type: String, default: 'INR' },
      billingCycle: { type: String, enum: ['monthly', 'quarterly', 'annually'], default: 'monthly' },
      features: [{ type: String }],
    },
    featureEntitlements: {
      tr069Acs: { type: Boolean, default: true },
      tr369Usp: { type: Boolean, default: true },
      fiberGis: { type: Boolean, default: true },
      aiCommandCenter: { type: Boolean, default: true },
      technicianDispatch: { type: Boolean, default: true },
      customerApp: { type: Boolean, default: true },
      whatsappAlerts: { type: Boolean, default: true },
      opticalDiagnostics: { type: Boolean, default: true },
    },
    opticalThresholds: {
      warningDbm: { type: Number, default: -27.0 },
      criticalDbm: { type: Number, default: -30.0 },
    },
    whatsapp: {
      status: {
        type: String,
        enum: ['NOT_CONNECTED', 'SCAN_QR_REQUIRED', 'CONNECTED', 'DISCONNECTED'],
        default: 'NOT_CONNECTED',
      },
      phone: { type: String },
      deviceInfo: { type: String },
      pairedAt: { type: Date },
      lastSeen: { type: Date },
      qrCodeDataUrl: { type: String },
      qrCodeRaw: { type: String },
    },
    timezone: { type: String, default: 'Asia/Kolkata' },
    locale: { type: String, default: 'en-IN' },
  },
  { timestamps: true }
);

export const Tenant = model<ITenant>('Tenant', TenantSchema);
