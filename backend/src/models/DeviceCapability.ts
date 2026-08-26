import { Schema, model, Document } from 'mongoose';

export interface IDeviceCapabilityConfig {
  vendor: string;
  modelPattern: string; // e.g. "HG8145V5", "ZXHN F670L", "G-140W-ME"
  displayName: string;
  hardwareType: 'GPON_ONT' | 'EPON_ONT' | 'XPON_ONT' | 'ROUTER';
  supportsDualBandWifi: boolean;
  supportsSingleBandWifi: boolean;
  supportsWifiPasswordChange: boolean;
  supportsWifiChannelSelect: boolean;
  supportsWanProfileEdit: boolean;
  supportsWanVlanConfig: boolean;
  supportsConnectedClientList: boolean;
  supportsConnectedClientBlock: boolean;
  supportsRemoteReboot: boolean;
  supportsPingDiagnostics: boolean;
  supportsTracerouteDiagnostics: boolean;
  supportsSpeedTest: boolean;
  supportsOpticalTelemetry: boolean;
  supportsCpuMemoryTelemetry: boolean;
  supportsFirmwareUpgrade: boolean;
  tr069Supported: boolean;
  tr369Supported: boolean;
  notes?: string;
}

export interface IDeviceCapability extends Document, IDeviceCapabilityConfig {
  createdAt: Date;
  updatedAt: Date;
}

const DeviceCapabilitySchema = new Schema<IDeviceCapability>(
  {
    vendor: { type: String, required: true, index: true },
    modelPattern: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    hardwareType: {
      type: String,
      enum: ['GPON_ONT', 'EPON_ONT', 'XPON_ONT', 'ROUTER'],
      default: 'GPON_ONT',
    },
    supportsDualBandWifi: { type: Boolean, default: true },
    supportsSingleBandWifi: { type: Boolean, default: true },
    supportsWifiPasswordChange: { type: Boolean, default: true },
    supportsWifiChannelSelect: { type: Boolean, default: true },
    supportsWanProfileEdit: { type: Boolean, default: true },
    supportsWanVlanConfig: { type: Boolean, default: true },
    supportsConnectedClientList: { type: Boolean, default: true },
    supportsConnectedClientBlock: { type: Boolean, default: true },
    supportsRemoteReboot: { type: Boolean, default: true },
    supportsPingDiagnostics: { type: Boolean, default: true },
    supportsTracerouteDiagnostics: { type: Boolean, default: true },
    supportsSpeedTest: { type: Boolean, default: true },
    supportsOpticalTelemetry: { type: Boolean, default: true },
    supportsCpuMemoryTelemetry: { type: Boolean, default: true },
    supportsFirmwareUpgrade: { type: Boolean, default: true },
    tr069Supported: { type: Boolean, default: true },
    tr369Supported: { type: Boolean, default: false },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const DeviceCapability = model<IDeviceCapability>('DeviceCapability', DeviceCapabilitySchema);
