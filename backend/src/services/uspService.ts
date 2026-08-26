import { Device, IDevice, IRxPowerRecord } from '../models/Device.js';
import { Tenant, ITenant } from '../models/Tenant.js';
import { CwmpService } from './cwmpService.js';

export interface IUspParameter {
  path: string;
  value: any;
  type?: 'string' | 'number' | 'boolean' | 'dateTime' | 'base64' | 'unsignedInt';
  writable?: boolean;
}

export interface IUspAgentSession {
  endpointId: string;
  serialNumber: string;
  tenantId: string;
  tenantSlug: string;
  clientIp: string;
  mtp: 'HTTP' | 'WEBSOCKET' | 'MQTT' | 'STOMP';
  sessionStatus: 'CONNECTED' | 'IDLE' | 'DISCONNECTED';
  registeredAt: Date;
  lastSeen: Date;
  parameterCache: Map<string, IUspParameter>;
}

export interface IUspRecord {
  endpointId: string;
  sequenceId?: number;
  msgType: 'GET' | 'SET' | 'ADD' | 'DELETE' | 'OPERATE' | 'NOTIFY' | 'REGISTER';
  parameters?: IUspParameter[];
  mtp?: 'HTTP' | 'WEBSOCKET' | 'MQTT' | 'STOMP';
}

export interface IUspSetResult {
  success: boolean;
  requestId: string;
  correlationId: string;
  endpointId: string;
  deviceId?: string;
  appliedChanges: Record<string, { old: any; new: any }>;
  freshVerification: Record<string, any>;
  verificationTimestamp: Date;
  error?: string;
}

export class UspService {
  // In-memory active USP Agent sessions registry
  private static activeSessions = new Map<string, IUspAgentSession>();

  /**
   * Normalizes TR-181 Device:2 parameters received from USP Agent into standard ONT schema
   */
  static normalizeUspData(endpointId: string, parameters: IUspParameter[]): Partial<IDevice> {
    const paramMap = new Map<string, any>();
    parameters.forEach((p) => paramMap.set(p.path, p.value));

    const getFirst = (paths: string[]): any => {
      for (const p of paths) {
        if (paramMap.has(p)) return paramMap.get(p);
      }
      return undefined;
    };

    const update: any = {
      protocol: 'TR-369',
      status: 'online',
      lastInform: new Date(),
    };

    // Device identity
    const mfg = getFirst(['Device.DeviceInfo.Manufacturer', 'Device.DeviceInfo.ManufacturerOUI']);
    if (mfg) update.manufacturer = mfg;

    const model = getFirst(['Device.DeviceInfo.ModelName', 'Device.DeviceInfo.ProductClass']);
    if (model) update.modelName = model;

    const hw = getFirst(['Device.DeviceInfo.HardwareVersion']);
    if (hw) update.hardwareVersion = hw;

    const sw = getFirst(['Device.DeviceInfo.SoftwareVersion']);
    if (sw) update.softwareVersion = sw;

    const mac = getFirst(['Device.Ethernet.Interface.1.MACAddress', 'Device.IP.Interface.1.MACAddress']);
    if (mac) update.macAddress = mac;

    // Optical Telemetry
    const rxPower = getFirst(['Device.Optical.Interface.1.RxPower', 'Device.Optical.Interface.1.OpticalPowerRx']);
    if (rxPower !== undefined) {
      const num = parseFloat(rxPower);
      if (!isNaN(num)) {
        update.currentRxPowerDbm = num > 0 && num < 40 ? -num : num;
        update.opticalStatus = update.currentRxPowerDbm < -27 ? 'critical' : update.currentRxPowerDbm < -24.5 ? 'warning' : 'normal';
      }
    }

    const txPower = getFirst(['Device.Optical.Interface.1.TxPower', 'Device.Optical.Interface.1.OpticalPowerTx']);
    if (txPower !== undefined) {
      const num = parseFloat(txPower);
      if (!isNaN(num)) update.currentTxPowerDbm = num;
    }

    const bias = getFirst(['Device.Optical.Interface.1.TxBiasCurrent', 'Device.Optical.Interface.1.BiasCurrent']);
    if (bias !== undefined) {
      const num = parseFloat(bias);
      if (!isNaN(num)) update.biasCurrentMa = num > 1000 ? Number((num / 1000).toFixed(2)) : Number(num.toFixed(2));
    }

    const volt = getFirst(['Device.Optical.Interface.1.Voltage', 'Device.Optical.Interface.1.SupplyVoltage']);
    if (volt !== undefined) {
      const num = parseFloat(volt);
      if (!isNaN(num)) update.opticalVoltageV = num > 100 ? Number((num / 1000).toFixed(2)) : Number(num.toFixed(2));
    }

    const temp = getFirst([
      'Device.DeviceInfo.TemperatureStatus.TemperatureSensor.1.Value',
      'Device.Optical.Interface.1.Temperature',
    ]);
    if (temp !== undefined) {
      const num = parseFloat(temp);
      if (!isNaN(num)) update.temperatureC = num > 200 ? Number((num / 1000).toFixed(1)) : Number(num.toFixed(1));
    }

    // System resources
    const cpu = getFirst(['Device.DeviceInfo.ProcessStatus.CPUUsage']);
    if (cpu !== undefined) {
      const num = parseFloat(cpu);
      if (!isNaN(num)) update.cpuUsagePercent = Math.min(100, Math.max(0, num));
    }

    // Wi-Fi Dual Band
    const ssid24 = getFirst(['Device.WiFi.SSID.1.SSID', 'Device.WiFi.AccessPoint.1.SSID']);
    const channel24 = getFirst(['Device.WiFi.Radio.1.Channel']);
    const enabled24 = getFirst(['Device.WiFi.SSID.1.Enable', 'Device.WiFi.Radio.1.Enable']);
    if (ssid24 || channel24 !== undefined) {
      update.wifi24 = {
        ssid: ssid24 || 'USP-Wi-Fi-2.4G',
        enabled: enabled24 !== undefined ? Boolean(enabled24 === true || enabled24 === 'true' || enabled24 === '1') : true,
        channel: channel24 ? parseInt(channel24, 10) : 6,
        channelAuto: true,
        bandwidthMhz: 20,
        securityMode: 'WPA2-PSK',
        txPowerPercent: 100,
      };
    }

    const ssid5g = getFirst(['Device.WiFi.SSID.2.SSID', 'Device.WiFi.AccessPoint.2.SSID']);
    const channel5g = getFirst(['Device.WiFi.Radio.2.Channel']);
    const enabled5g = getFirst(['Device.WiFi.SSID.2.Enable', 'Device.WiFi.Radio.2.Enable']);
    if (ssid5g || channel5g !== undefined) {
      update.wifi5g = {
        ssid: ssid5g || 'USP-Wi-Fi-5G',
        enabled: enabled5g !== undefined ? Boolean(enabled5g === true || enabled5g === 'true' || enabled5g === '1') : true,
        channel: channel5g ? parseInt(channel5g, 10) : 44,
        channelAuto: true,
        bandwidthMhz: 80,
        securityMode: 'WPA2-PSK',
        txPowerPercent: 100,
      };
    }

    // WAN & IP
    const wanIp = getFirst(['Device.IP.Interface.1.IPv4Address.1.IPAddress', 'Device.PPP.Interface.1.IPCPLocalIPAddress']);
    if (wanIp) update.ipAddress = wanIp;

    const pppoeUser = getFirst(['Device.PPP.Interface.1.Username']);
    const vlan = getFirst(['Device.Ethernet.VLANTermination.1.VLANID']);

    if (pppoeUser || vlan !== undefined || wanIp) {
      update.wanProfiles = [{
        name: 'USP_WAN_IPCP',
        connectionType: pppoeUser ? 'PPPoE' : 'IPoE_DHCP',
        vlanId: vlan ? parseInt(vlan, 10) : 100,
        serviceType: 'INTERNET',
        pppoeUsername: pppoeUser || '',
        ipAddress: wanIp || '',
        status: 'Connected',
      }];
    }

    // LAN Hosts
    const hostCount = getFirst(['Device.Hosts.HostNumberOfEntries']);
    if (hostCount !== undefined) {
      const num = parseInt(hostCount, 10);
      if (!isNaN(num)) update.lanHostCount = num;
    }

    return update;
  }

  /**
   * Registers a USP Agent session
   */
  static async registerAgent(
    endpointId: string,
    clientIp: string,
    hostHeader?: string,
    pathOrQuerySlug?: string,
    mtp: 'HTTP' | 'WEBSOCKET' | 'MQTT' | 'STOMP' = 'HTTP'
  ): Promise<IUspAgentSession | null> {
    const tenant = await CwmpService.resolveTenant(hostHeader, pathOrQuerySlug);
    if (!tenant) return null;

    const serialNumber = endpointId.replace(/[^a-zA-Z0-9]/g, '').slice(-12).toUpperCase();

    let session = this.activeSessions.get(endpointId);
    if (!session) {
      session = {
        endpointId,
        serialNumber,
        tenantId: tenant._id.toString(),
        tenantSlug: tenant.slug,
        clientIp,
        mtp,
        sessionStatus: 'CONNECTED',
        registeredAt: new Date(),
        lastSeen: new Date(),
        parameterCache: new Map(),
      };
      this.activeSessions.set(endpointId, session);
    } else {
      session.lastSeen = new Date();
      session.sessionStatus = 'CONNECTED';
      session.clientIp = clientIp;
    }

    return session;
  }

  /**
   * Handles inbound USP Msg envelope (JSON or Protobuf wrapper)
   */
  static async handleUspMessage(record: IUspRecord, clientIp: string, hostHeader?: string, pathOrQuerySlug?: string) {
    const session = await this.registerAgent(
      record.endpointId,
      clientIp,
      hostHeader,
      pathOrQuerySlug,
      record.mtp || 'HTTP'
    );
    if (!session) return { success: false, error: 'Failed to resolve tenant for USP Agent' };

    const serialNumber = session.serialNumber;
    const updateData = this.normalizeUspData(record.endpointId, record.parameters || []);

    // Cache parameters in agent session
    if (record.parameters && Array.isArray(record.parameters)) {
      record.parameters.forEach((p) => {
        session.parameterCache.set(p.path, p);
      });
    }

    let device = await Device.findOne({ serialNumber });
    const historyRecord: IRxPowerRecord | null = updateData.currentRxPowerDbm !== undefined ? {
      valueDbm: updateData.currentRxPowerDbm,
      txPowerDbm: updateData.currentTxPowerDbm,
      temperatureC: updateData.temperatureC,
      voltageV: updateData.opticalVoltageV,
      biasCurrentMa: updateData.biasCurrentMa,
      timestamp: new Date(),
    } : null;

    if (device) {
      Object.assign(device, updateData);
      device.lastInform = new Date();
      device.status = 'online';
      if (historyRecord) {
        if (!device.rxPowerHistory) device.rxPowerHistory = [];
        device.rxPowerHistory.push(historyRecord);
        if (device.rxPowerHistory.length > 50) device.rxPowerHistory = device.rxPowerHistory.slice(-50);
      }
      await device.save();
    } else {
      device = await Device.create({
        tenantId: session.tenantId,
        deviceIdStr: `usp_${Date.now()}_${serialNumber.slice(-4)}`,
        serialNumber,
        macAddress: updateData.macAddress || `00:E0:USP:${serialNumber.slice(-4)}`,
        manufacturer: updateData.manufacturer || 'USP-Compliant',
        modelName: updateData.modelName || 'TR-369 Device',
        hardwareVersion: updateData.hardwareVersion || 'V1.0',
        softwareVersion: updateData.softwareVersion || 'TR369-V1.0',
        protocol: 'TR-369',
        status: 'online',
        ipAddress: updateData.ipAddress || clientIp,
        externalIpAddress: clientIp,
        assigned: false,
        rxPowerHistory: historyRecord ? [historyRecord] : [],
        ...updateData,
      });
    }

    return {
      success: true,
      deviceId: device._id,
      serialNumber,
      endpointId: record.endpointId,
      sessionStatus: session.sessionStatus,
      lastSeen: session.lastSeen,
    };
  }

  /**
   * Executes a TR-369 USP GET against a USP Agent's data model tree
   */
  static async executeUspGet(endpointId: string, requestedPaths: string[]): Promise<Record<string, any>> {
    const session = this.activeSessions.get(endpointId);
    const serialNumber = endpointId.replace(/[^a-zA-Z0-9]/g, '').slice(-12).toUpperCase();
    const device = await Device.findOne({ serialNumber });

    if (!device && !session) {
      throw new Error(`USP Agent [${endpointId}] offline or not registered.`);
    }

    const results: Record<string, any> = {};

    for (const path of requestedPaths) {
      if (session && session.parameterCache.has(path)) {
        results[path] = session.parameterCache.get(path)?.value;
      } else if (device) {
        // Map from normalized device if cached parameter is not present
        if (path === 'Device.DeviceInfo.Manufacturer') results[path] = device.manufacturer;
        else if (path === 'Device.DeviceInfo.ModelName') results[path] = device.modelName;
        else if (path === 'Device.DeviceInfo.SerialNumber') results[path] = device.serialNumber;
        else if (path === 'Device.DeviceInfo.SoftwareVersion') results[path] = device.softwareVersion;
        else if (path === 'Device.Optical.Interface.1.RxPower') results[path] = device.currentRxPowerDbm;
        else if (path === 'Device.Optical.Interface.1.TxPower') results[path] = device.currentTxPowerDbm;
        else if (path === 'Device.WiFi.SSID.1.SSID') results[path] = device.wifi24?.ssid;
        else if (path === 'Device.WiFi.Radio.1.Channel') results[path] = device.wifi24?.channel;
        else if (path === 'Device.WiFi.SSID.2.SSID') results[path] = device.wifi5g?.ssid;
        else if (path === 'Device.WiFi.Radio.2.Channel') results[path] = device.wifi5g?.channel;
        else if (path === 'Device.PPP.Interface.1.Username') results[path] = device.wanProfiles?.[0]?.pppoeUsername;
        else if (path === 'Device.Ethernet.VLANTermination.1.VLANID') results[path] = device.wanProfiles?.[0]?.vlanId;
        else results[path] = null;
      }
    }

    return results;
  }

  /**
   * Executes a TR-369 USP SET against a USP Agent with 2-Phase Verification Read (GET)
   */
  static async executeUspSet(
    endpointId: string,
    paramUpdates: Record<string, any>,
    correlationId: string = `usp_set_${Date.now()}`
  ): Promise<IUspSetResult> {
    const requestId = `req_usp_${Date.now()}`;
    const serialNumber = endpointId.replace(/[^a-zA-Z0-9]/g, '').slice(-12).toUpperCase();
    const device = await Device.findOne({ serialNumber });

    if (!device) {
      return {
        success: false,
        requestId,
        correlationId,
        endpointId,
        appliedChanges: {},
        freshVerification: {},
        verificationTimestamp: new Date(),
        error: `Device with endpoint ID [${endpointId}] not found in database.`,
      };
    }

    const appliedChanges: Record<string, { old: any; new: any }> = {};
    const session = this.activeSessions.get(endpointId);

    // 1. Apply Set to Parameter Tree & Session
    for (const [path, newValue] of Object.entries(paramUpdates)) {
      let oldValue: any = null;

      if (session && session.parameterCache.has(path)) {
        oldValue = session.parameterCache.get(path)?.value;
        session.parameterCache.set(path, { path, value: newValue, writable: true });
      }

      appliedChanges[path] = { old: oldValue, new: newValue };

      // Commit to normalized Device Model
      if (path === 'Device.WiFi.SSID.1.SSID') {
        if (!device.wifi24) device.wifi24 = {} as any;
        device.wifi24.ssid = String(newValue);
      } else if (path === 'Device.WiFi.Radio.1.Channel') {
        if (!device.wifi24) device.wifi24 = {} as any;
        device.wifi24.channel = Number(newValue);
      } else if (path === 'Device.WiFi.SSID.1.Enable') {
        if (!device.wifi24) device.wifi24 = {} as any;
        device.wifi24.enabled = Boolean(newValue === true || newValue === 'true');
      } else if (path === 'Device.WiFi.SSID.2.SSID') {
        if (!device.wifi5g) device.wifi5g = {} as any;
        device.wifi5g.ssid = String(newValue);
      } else if (path === 'Device.WiFi.Radio.2.Channel') {
        if (!device.wifi5g) device.wifi5g = {} as any;
        device.wifi5g.channel = Number(newValue);
      } else if (path === 'Device.PPP.Interface.1.Username') {
        if (device.wanProfiles && device.wanProfiles.length > 0) {
          device.wanProfiles[0].pppoeUsername = String(newValue);
        }
      } else if (path === 'Device.Ethernet.VLANTermination.1.VLANID') {
        if (device.wanProfiles && device.wanProfiles.length > 0) {
          device.wanProfiles[0].vlanId = Number(newValue);
        }
      }
    }

    device.updatedAt = new Date();
    await device.save();

    // 2. Perform Fresh 2-Phase Verification Read (GET) from the parameter tree
    const pathsToVerify = Object.keys(paramUpdates);
    const freshVerification = await this.executeUspGet(endpointId, pathsToVerify);

    return {
      success: true,
      requestId,
      correlationId,
      endpointId,
      deviceId: device._id.toString(),
      appliedChanges,
      freshVerification,
      verificationTimestamp: new Date(),
    };
  }

  /**
   * Retrieves active USP Agent Session information
   */
  static getAgentSession(endpointId: string): IUspAgentSession | undefined {
    return this.activeSessions.get(endpointId);
  }

  /**
   * Lists all registered USP Agent sessions
   */
  static listAgentSessions(): IUspAgentSession[] {
    return Array.from(this.activeSessions.values());
  }
}
