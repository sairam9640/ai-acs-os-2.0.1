import { Schema, model, Document, Types } from 'mongoose';

export interface IRxPowerRecord {
  valueDbm: number;
  txPowerDbm?: number;
  temperatureC?: number;
  voltageV?: number;
  biasCurrentMa?: number;
  timestamp: Date;
}

export interface ISpeedTestResult {
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
  jitterMs?: number;
  packetLossPercent?: number;
  serverLocation?: string;
  timestamp: Date;
}

export interface IDiagnosticLog {
  type: 'ping' | 'traceroute' | 'speedtest' | 'loopback';
  targetHost: string;
  success: boolean;
  rawOutput: string;
  latencyAvgMs?: number;
  hops?: string[];
  executedAt: Date;
}

export interface IConnectedClient {
  mac: string;
  hostname: string;
  ip: string;
  interfaceType: '2.4GHz' | '5GHz' | 'Ethernet';
  signalDbm?: number;
  connected: boolean;
  isBlocked: boolean;
  rxBytes?: number;
  txBytes?: number;
  lastSeen: Date;
}

export interface IDeviceWifiBand {
  ssid: string;
  password?: string;
  enabled: boolean;
  channel: number;
  channelAuto: boolean;
  bandwidthMhz: number; // 20, 40, 80, 160
  securityMode: 'WPA2-PSK' | 'WPA3-SAE' | 'WPA/WPA2-PSK' | 'Open';
  txPowerPercent: number;
}

export interface IDeviceWanProfile {
  _id?: Types.ObjectId | string;
  name: string;
  enableWan?: boolean;
  connectionType: 'PPPoE' | 'IPoE_DHCP' | 'Static' | 'Bridge';
  serviceType?: string;
  cpeObjectPath?: string;
  serviceUsage?: {
    internet?: boolean;
    voip?: boolean;
    tr069?: boolean;
    iptvDhcp?: boolean;
    iptvBridge?: boolean;
    other?: boolean;
  };
  vlanEnabled?: boolean;
  vlanId: number;
  vlanPriority8021p?: number; // 0 - 7
  multicastVlanId?: number; // 1 - 4095
  bridgeMode?: string; // 'Transparent Bridging' | 'Bridge Ethernet'
  enableBridge?: boolean;
  enableQos?: boolean;
  adminStatus?: 'Enable' | 'Disable';
  ipProtocol?: 'IPv4' | 'IPv6' | 'IPv4/IPv6';
  mldpProxy?: boolean;
  mtu?: number;
  natEnabled?: boolean;
  firewallEnabled?: boolean;
  wanPortBindings?: string[];
  lanPortBindings?: string[];
  ssidBindings?: string[];
  pppoeUsername?: string;
  pppoePasswordEncrypted?: string;
  pppoePassword?: string;
  pppoePasswordMasked?: string;
  passwordConfigured?: boolean;
  pppoeType?: 'Continuous' | 'OnDemand' | 'Manual';
  idleTimeSeconds?: number;
  authMethod?: 'AUTO' | 'PAP' | 'CHAP' | 'MS-CHAP';
  acName?: string;
  serviceName?: string;
  ipAddress?: string;
  subnetMask?: string;
  gateway?: string;
  dnsMode?: 'Auto' | 'Manual';
  dnsServers?: string;
  primaryDns?: string;
  secondaryDns?: string;
  status: 'Connected' | 'Disconnected' | 'Connecting';
  isDefault?: boolean;
  lastKnownGoodBackup?: any;
}

export interface IDevice extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  deviceIdStr: string; // Internal ACS device ID
  serialNumber: string;
  macAddress: string;
  manufacturer: string;
  modelName: string;
  hardwareVersion: string;
  softwareVersion: string;
  protocol: 'TR-069' | 'TR-369';
  status: 'online' | 'offline';
  uptimeSeconds: number;
  lastInform: Date;
  ipAddress: string;
  externalIpAddress?: string;
  
  // Associations
  customerId?: Types.ObjectId;
  ponPortId?: Types.ObjectId;
  oltId?: Types.ObjectId;
  assigned: boolean;

  // Wi-Fi Dual-Band Configuration
  wifi24: IDeviceWifiBand;
  wifi5g: IDeviceWifiBand;
  additionalSsids?: {
    instance: number;
    band: '2.4GHz' | '5GHz';
    ssid: string;
    password?: string;
    enabled: boolean;
    channel?: number;
    bandwidthMhz?: number;
    securityMode?: string;
  }[];

  // WAN Profiles
  wanProfiles: IDeviceWanProfile[];

  // Optical Telemetry — authoritative TR-069 sourced only, never fabricated
  currentRxPowerDbm?: number;
  currentTxPowerDbm?: number;
  opticalDelta?: number;
  opticalHealthTrend?: 'improving' | 'degrading' | 'stable';
  biasCurrentMa?: number;
  opticalVoltageV?: number;
  opticalStatus: 'normal' | 'warning' | 'critical' | 'loss_of_signal';
  rxPowerHistory: IRxPowerRecord[];

  // Hardware metrics — authoritative TR-069 sourced only
  cpuUsagePercent?: number;
  memoryUsagePercent?: number;
  temperatureC?: number;

  // LAN
  lanHostCount?: number;

  // Connected Devices
  connectedClients: IConnectedClient[];

  // Diagnostic Logs
  diagnosticHistory: IDiagnosticLog[];
  speedTestHistory: ISpeedTestResult[];

  // Management State
  pendingCommandsCount: number;
  cwmpUsername?: string;
  cwmpPassword?: string;
  acsUrl?: string;
  pendingConfig?: {
    status: 'PENDING_PUSH' | 'APPLIED' | 'FAILED';
    queuedAt: Date;
    appliedAt?: Date;
    wifi24?: any;
    wifi5g?: any;
    wan?: any;
  };
  // Raw Response Archival & Audit
  rawParameters?: Record<string, string>;
  lastRawInformXml?: string;
  lastRawGetParameterValuesResponseXml?: string;
  lastParameterSyncAt?: Date;
  lastParameterSyncStatus?: string;
  lastLivePollAt?: Date; // Timestamp when operator last triggered a live poll (summon/refresh-telemetry)
  periodicInformInterval?: number;
  periodicInformConfigured?: boolean;
  opticalTelemetrySourcePath?: string;
  cwmpSessionId?: string;
  // Firmware capability flags — set by ACS after live probing
  addObjectNotSupported?: boolean; // true if firmware returns Fault 9003 on AddObject (e.g. Genexis P4410-V2-1.44)
  wanSlotPollPending?: boolean;   // true while ACS is waiting for WAN slot to appear after GUI provisioning

  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema<IDevice>(
  {
    periodicInformInterval: { type: Number, default: 300 },
    periodicInformConfigured: { type: Boolean, default: false },
    rawParameters: { type: Schema.Types.Mixed, default: {} },
    lastRawInformXml: { type: String },
    lastRawGetParameterValuesResponseXml: { type: String },
    lastParameterSyncAt: { type: Date },
    lastParameterSyncStatus: { type: String },
    lastLivePollAt: { type: Date, index: true }, // Operator-triggered live poll timestamp
    opticalTelemetrySourcePath: { type: String },
    cwmpSessionId: { type: String },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    deviceIdStr: { type: String, required: false, index: true },
    serialNumber: { type: String, required: true, index: true },
    macAddress: { type: String, required: false, index: true },
    manufacturer: { type: String },
    modelName: { type: String },
    hardwareVersion: { type: String },
    softwareVersion: { type: String },
    protocol: { type: String, enum: ['TR-069', 'TR-369', 'SNMP'], default: 'TR-069', index: true },
    status: {
      type: String,
      enum: ['online', 'offline', 'degraded', 'warning', 'critical', 'los', 'unprovisioned'],
      default: 'online',
      index: true,
    },
    lastInform: { type: Date, default: Date.now },
    ipAddress: { type: String },
    externalIpAddress: { type: String },

    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
    ponPortId: { type: Schema.Types.ObjectId, ref: 'PONPort', index: true },
    oltId: { type: Schema.Types.ObjectId, ref: 'OLT', index: true },
    assigned: { type: Boolean, default: false },

    wifi24: {
      ssid: { type: String },
      password: { type: String },
      enabled: { type: Boolean, default: true },
      channel: { type: Number, default: 6 },
      channelAuto: { type: Boolean, default: true },
      bandwidthMhz: { type: Number, default: 20 },
      securityMode: { type: String, default: 'WPA2-PSK' },
      txPowerPercent: { type: Number, default: 100 },
    },

    wifi5g: {
      ssid: { type: String },
      password: { type: String },
      enabled: { type: Boolean, default: true },
      channel: { type: Number, default: 36 },
      channelAuto: { type: Boolean, default: true },
      bandwidthMhz: { type: Number, default: 80 },
      securityMode: { type: String, default: 'WPA2-PSK' },
      txPowerPercent: { type: Number, default: 100 },
    },

    additionalSsids: [
      {
        instance: { type: Number },
        band: { type: String, enum: ['2.4GHz', '5GHz'], default: '2.4GHz' },
        ssid: { type: String },
        password: { type: String },
        enabled: { type: Boolean, default: true },
        channel: { type: Number },
        bandwidthMhz: { type: Number },
        securityMode: { type: String, default: 'WPA2-PSK' },
      },
    ],

    wanProfiles: [
      {
        name: { type: String, default: 'pppoe_0/0_0' },
        enableWan: { type: Boolean, default: true },
        connectionType: { type: String, default: 'PPPoE' },
        serviceType: { type: String, default: 'INTERNET' },
        bearerService: { type: String, default: 'INTERNET' },
        transMode: { type: String, default: 'PON' },
        mode: { type: String, default: 'Route' },
        linkMode: { type: String, default: 'PPP' },
        ipAssignment: { type: String, default: 'DHCP' },
        vlanMode: { type: String, default: 'TAG' },
        isProtected: { type: Boolean, default: false },
        cpeObjectPath: { type: String },
        serviceUsage: {
          internet: { type: Boolean, default: true },
          voip: { type: Boolean, default: false },
          tr069: { type: Boolean, default: false },
          iptvDhcp: { type: Boolean, default: false },
          iptvBridge: { type: Boolean, default: false },
          other: { type: Boolean, default: false },
        },
        vlanEnabled: { type: Boolean, default: false },
        vlanId: { type: Number },
        vlanPriority8021p: { type: Number, default: 0, min: 0, max: 7 },
        multicastVlanId: { type: Number, default: 0 },
        bridgeMode: { type: String, default: 'Bridge Ethernet (Transparent Bridging)' },
        enableBridge: { type: Boolean, default: false },
        enableQos: { type: Boolean, default: false },
        adminStatus: { type: String, default: 'Enable' },
        ipProtocol: { type: String, default: 'IPv4/IPv6' },
        mldpProxy: { type: Boolean, default: false },
        mtu: { type: Number, default: 1492 },
        natEnabled: { type: Boolean, default: true },
        firewallEnabled: { type: Boolean, default: true },
        wanPortBindings: [{ type: String }],
        lanPortBindings: [{ type: String }],
        ssidBindings: [{ type: String }],
        pppoeUsername: { type: String },
        pppoePasswordEncrypted: { type: String },
        pppoeType: { type: String, default: 'Continuous' },
        idleTimeSeconds: { type: Number, default: 0 },
        authMethod: { type: String, default: 'AUTO' },
        acName: { type: String, default: '' },
        serviceName: { type: String, default: '' },
        ipAddress: { type: String },
        subnetMask: { type: String },
        gateway: { type: String },
        dnsMode: { type: String, default: 'Auto' },
        dnsServers: { type: String },
        primaryDns: { type: String, default: '' },
        secondaryDns: { type: String, default: '' },
        status: { type: String, default: 'Connected' },
        isDefault: { type: Boolean, default: true },
        lastKnownGoodBackup: { type: Schema.Types.Mixed },
      },
    ],

    // Optical telemetry — no defaults; only set when real TR-069 data is received
    currentRxPowerDbm: { type: Number },
    currentTxPowerDbm: { type: Number },
    opticalDelta: { type: Number },
    opticalHealthTrend: { type: String, enum: ['improving', 'degrading', 'stable'] },
    biasCurrentMa: { type: Number },
    opticalVoltageV: { type: Number },
    opticalStatus: {
      type: String,
      enum: ['normal', 'warning', 'critical', 'loss_of_signal'],
      default: 'normal',
      index: true,
    },
    rxPowerHistory: [
      {
        valueDbm: { type: Number, required: true },
        txPowerDbm: { type: Number },
        temperatureC: { type: Number },
        voltageV: { type: Number },
        biasCurrentMa: { type: Number },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // Hardware metrics — no defaults; only set when real TR-069 data is received
    cpuUsagePercent: { type: Number },
    memoryUsagePercent: { type: Number },
    temperatureC: { type: Number },

    // LAN
    lanHostCount: { type: Number },

    connectedClients: [{ type: Schema.Types.Mixed }],

    diagnosticHistory: [
      {
        type: { type: String, default: 'ping' },
        targetHost: { type: String, default: '8.8.8.8' },
        success: { type: Boolean, default: true },
        rawOutput: { type: String, default: '64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=12.4 ms' },
        latencyAvgMs: { type: Number, default: 12.4 },
        hops: [{ type: String }],
        executedAt: { type: Date, default: Date.now },
      },
    ],

    pendingCommandsCount: { type: Number, default: 0 },
    cwmpUsername: { type: String },
    cwmpPassword: { type: String },
    acsUrl: { type: String },
    // Firmware capability flags
    addObjectNotSupported: { type: Boolean, default: false },
    wanSlotPollPending: { type: Boolean, default: false },
    pendingConfig: {
      status: { type: String, enum: ['PENDING_PUSH', 'APPLIED', 'FAILED', 'PENDING', 'APPLYING'] },
      queuedAt: { type: Date },
      appliedAt: { type: Date },
      wifi24: { type: Schema.Types.Mixed },
      wifi5g: { type: Schema.Types.Mixed },
      wan: { type: Schema.Types.Mixed }
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret: any) => {
        delete ret.cwmpPassword;
        if (ret.wifi24) {
          delete ret.wifi24.password;
        }
        if (ret.wifi5g) {
          delete ret.wifi5g.password;
        }
        if (ret.wanProfiles && Array.isArray(ret.wanProfiles)) {
          ret.wanProfiles.forEach((wp: any) => {
            wp.passwordConfigured = Boolean(wp.pppoePasswordEncrypted || wp.pppoePassword);
            delete wp.pppoePasswordEncrypted;
            delete wp.pppoePassword;
            wp.pppoePasswordMasked = '••••••••';
          });
        }
        return ret;
      },
    },
  }
);

DeviceSchema.index({ tenantId: 1, serialNumber: 1 }, { unique: true });
DeviceSchema.index({ tenantId: 1, macAddress: 1 });
DeviceSchema.index({ tenantId: 1, status: 1, opticalStatus: 1 });

export const Device = model<IDevice>('Device', DeviceSchema);
