import { Schema, model, Document, Types } from 'mongoose';

export interface ISmtpSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string; // e.g. "admin@gmail.com"
  pass: string; // Google App Password (16 characters)
  fromEmail: string;
  fromName: string;
  updatedAt?: Date;
}

export interface IWhatsAppSettings {
  enabled: boolean;
  status: 'DISCONNECTED' | 'SCAN_QR_REQUIRED' | 'CONNECTING' | 'CONNECTED';
  sessionName: string;
  connectedPhone?: string;
  deviceInfo?: string;
  qrCodeDataUrl?: string;
  qrCodeRaw?: string;
  lastConnectedAt?: Date;
  updatedAt?: Date;
}

export interface ISuperAdminAlertSettings {
  whatsappEnabled: boolean;
  recipientPhone?: string; // e.g. "+919949667788"
  alertOnPendingDevice: boolean;
  cooldownMinutes: number; // default 360 (6 hours per serial)
  updatedAt?: Date;
}

export interface ISystemSetting extends Document {
  _id: Types.ObjectId;
  key: string; // 'global_config'
  smtp: ISmtpSettings;
  whatsapp: IWhatsAppSettings;
  superAdminAlerts: ISuperAdminAlertSettings;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingSchema = new Schema<ISystemSetting>(
  {
    key: { type: String, required: true, unique: true, default: 'global_config' },
    smtp: {
      enabled: { type: Boolean, default: false },
      host: { type: String, default: 'smtp.gmail.com' },
      port: { type: Number, default: 465 },
      secure: { type: Boolean, default: true },
      user: { type: String, default: '' },
      pass: { type: String, default: '' },
      fromEmail: { type: String, default: '' },
      fromName: { type: String, default: 'AI ISP OS Platform' },
      updatedAt: { type: Date, default: Date.now },
    },
    whatsapp: {
      enabled: { type: Boolean, default: true },
      status: {
        type: String,
        enum: ['DISCONNECTED', 'SCAN_QR_REQUIRED', 'CONNECTING', 'CONNECTED'],
        default: 'DISCONNECTED',
      },
      sessionName: { type: String, default: 'primary_isp_session' },
      connectedPhone: { type: String },
      deviceInfo: { type: String },
      qrCodeDataUrl: { type: String },
      qrCodeRaw: { type: String },
      lastConnectedAt: { type: Date },
      updatedAt: { type: Date, default: Date.now },
    },
    superAdminAlerts: {
      whatsappEnabled: { type: Boolean, default: true },
      recipientPhone: { type: String, default: '' },
      alertOnPendingDevice: { type: Boolean, default: true },
      cooldownMinutes: { type: Number, default: 360 },
      updatedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

export const SystemSetting = model<ISystemSetting>('SystemSetting', SystemSettingSchema);
