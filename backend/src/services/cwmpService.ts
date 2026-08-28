import { Device, IDevice, IRxPowerRecord, IConnectedClient } from '../models/Device.js';
import { Customer } from '../models/Customer.js';
import { Tenant, ITenant } from '../models/Tenant.js';
import { PendingDeviceMapping } from '../models/PendingDeviceMapping.js';
import { WhatsAppService } from './whatsAppService.js';
import { CwmpVendorProfiles, CpeVendor } from './cwmpVendorProfiles.js';
import { CwmpXmlParser } from './cwmpXmlParser.js';

export interface CwmpInformData {
  manufacturer?: string;
  oui?: string;
  productClass?: string;
  serialNumber?: string;
  softwareVersion?: string;
  hardwareVersion?: string;
  macAddress?: string;
  connectionRequestUrl?: string;
  wanIp?: string;
  pppoeUsername?: string;
  opticalRxPower?: number;
  opticalTxPower?: number;
  opticalBiasCurrent?: number;
  opticalVoltage?: number;
  temperatureC?: number;
  cpuUsagePercent?: number;
  memoryUsagePercent?: number;
  wifiSsid24?: string;
  wifiPass24?: string;
  wifiSsid5g?: string;
  wifiPass5g?: string;
  vlanId?: number;
  wanConnectionStatus?: string;
  lanHostCount?: number;
  connectedClients?: IConnectedClient[];
  events?: string[];
  rawXml?: string;
}

import { SupportedParameterCache } from '../models/SupportedParameterCache.js';
import { CwmpSessionLog } from '../models/CwmpSessionLog.js';
import { DeviceCommand } from '../models/DeviceCommand.js';
import { Alert } from '../models/Incident.js';
import { User } from '../models/User.js';
import { buildTr069WanParams } from '../routes/operatorRoutes.js';

export interface CwmpHitLog {
  timestamp: Date;
  ip: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  vendor?: string;
  events?: string[];
  tenantSlug?: string;
  status: 'PROVISIONED' | 'DISCOVERED' | 'HEARTBEAT';
}

export interface ActiveSessionContext {
  sessionId: string;
  deviceId?: string;
  customerId?: string;
  serialNumber: string;
  serialAliases: string[];
  vendor: CpeVendor;
  manufacturer: string;
  modelName: string;
  firmwareVersion: string;
  hardwareVersion: string;
  clientIp: string;
  tenantId: string;
  tenantSlug: string;
  stage: 'INFORM_ACKED' | 'MISMATCH_BLOCKED' | 'GPN_SENT' | 'BASELINE_SENT' | 'OPTICAL_SENT' | 'ADD_OBJECT_SENT' | 'SPV_SENT' | 'CUSTOM_RPC_SENT' | 'COMPLETED';
  activeOpticalCandidate?: string;
  supportedOpticalPath?: string;
  timestamp: number;
}

export class CwmpService {
  private static recentHits: CwmpHitLog[] = [];
  private static totalHits = 0;
  private static sessionsById = new Map<string, ActiveSessionContext>();
  private static sessionsByConnection = new Map<string, ActiveSessionContext>();

  /**
   * Extracts TR-069 Session ID from HTTP Cookie header
   */
  static extractSessionCookie(cookieHeader?: string): string | undefined {
    return (
      CwmpXmlParser.extractCookie(cookieHeader, 'cwmpSession') ||
      CwmpXmlParser.extractCookie(cookieHeader, 'sessionID') ||
      CwmpXmlParser.extractCookie(cookieHeader, 'JSESSIONID')
    );
  }

  /**
   * Cleans expired sessions older than 120 seconds
   */
  private static cleanExpiredSessions(): void {
    const cutoff = Date.now() - 120000;
    for (const [id, s] of this.sessionsById.entries()) {
      if (s.timestamp < cutoff) {
        this.sessionsById.delete(id);
      }
    }
    for (const [connKey, s] of this.sessionsByConnection.entries()) {
      if (s.timestamp < cutoff) {
        this.sessionsByConnection.delete(connKey);
      }
    }
  }

  /**
   * Helper to extract the first matching parameter value from an extracted map
   */
  private static getFirstParam(paramMap: Map<string, string>, candidatePaths: string[]): string | undefined {
    for (const p of candidatePaths) {
      if (paramMap.has(p)) {
        const val = paramMap.get(p);
        if (val !== undefined && val !== '') return val;
      }
    }
    return undefined;
  }

  /**
   * Robust Inform XML Parser
   */
  static parseInformXml(xml: string): CwmpInformData {
    const data: CwmpInformData = { rawXml: xml, events: [] };
    if (!xml || typeof xml !== 'string') return data;

    const { parameters: pMap } = CwmpXmlParser.extractParameterMap(xml);

    data.manufacturer =
      CwmpXmlParser.extractTag(xml, 'Manufacturer') ||
      this.getFirstParam(pMap, ['Device.DeviceInfo.Manufacturer', 'InternetGatewayDevice.DeviceInfo.Manufacturer']);

    data.oui =
      CwmpXmlParser.extractTag(xml, 'OUI') ||
      this.getFirstParam(pMap, ['Device.DeviceInfo.ManufacturerOUI', 'InternetGatewayDevice.DeviceInfo.ManufacturerOUI']);

    data.productClass =
      CwmpXmlParser.extractTag(xml, 'ProductClass') ||
      this.getFirstParam(pMap, ['Device.DeviceInfo.ProductClass', 'InternetGatewayDevice.DeviceInfo.ProductClass', 'Device.DeviceInfo.ModelName', 'InternetGatewayDevice.DeviceInfo.ModelName']);

    data.serialNumber =
      CwmpXmlParser.extractTag(xml, 'SerialNumber') ||
      this.getFirstParam(pMap, ['Device.DeviceInfo.SerialNumber', 'InternetGatewayDevice.DeviceInfo.SerialNumber']);

    const eventMatches = xml.matchAll(/<(?:[a-zA-Z0-9_-]+:)?EventCode[^>]*>([^<]+)<\/(?:[a-zA-Z0-9_-]+:)?EventCode>/gi);
    for (const em of eventMatches) {
      if (em[1]) data.events?.push(em[1].trim());
    }

    data.softwareVersion =
      this.getFirstParam(pMap, ['Device.DeviceInfo.SoftwareVersion', 'InternetGatewayDevice.DeviceInfo.SoftwareVersion', 'InternetGatewayDevice.DeviceInfo.X_HW_SoftwareVersion']) ||
      CwmpXmlParser.extractTag(xml, 'SoftwareVersion');

    data.hardwareVersion =
      this.getFirstParam(pMap, ['Device.DeviceInfo.HardwareVersion', 'InternetGatewayDevice.HardwareVersion', 'InternetGatewayDevice.DeviceInfo.X_HW_HardwareVersion']) ||
      CwmpXmlParser.extractTag(xml, 'HardwareVersion');

    data.macAddress = this.getFirstParam(pMap, [
      'InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.1.MACAddress',
      'Device.Ethernet.Interface.1.MACAddress',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.MACAddress',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.MACAddress',
      'Device.DeviceInfo.MACAddress',
      'InternetGatewayDevice.DeviceInfo.MACAddress',
    ]);

    data.connectionRequestUrl =
      this.getFirstParam(pMap, ['Device.ManagementServer.ConnectionRequestURL', 'InternetGatewayDevice.ManagementServer.ConnectionRequestURL']) ||
      CwmpXmlParser.extractTag(xml, 'ConnectionRequestURL');

    data.wanIp = this.getFirstParam(pMap, [
      'Device.IP.Interface.1.IPv4Address.1.IPAddress',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.2.ExternalIPAddress',
      'Device.PPP.Interface.1.IPCPLocalIPAddress',
    ]);

    data.pppoeUsername = this.getFirstParam(pMap, [
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.2.Username',
      'Device.PPP.Interface.1.Username',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.X_HW_PPPoEUsername',
    ]);

    const wanStatus = this.getFirstParam(pMap, [
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ConnectionStatus',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ConnectionStatus',
      'Device.IP.Interface.1.Status',
    ]);
    if (wanStatus) data.wanConnectionStatus = wanStatus;

    const vlanRaw = this.getFirstParam(pMap, [
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.X_HW_VLAN',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.X_HW_VLAN',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.X_ZTE-COM_VLAN',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.X_TPLINK_VlanID',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.X_ALU_COM_VlanID',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.X_BROADCOM_COM_VLAN',
      'Device.Ethernet.VLANTermination.1.VLANID',
    ]);
    if (vlanRaw) {
      const v = parseInt(vlanRaw, 10);
      if (!isNaN(v)) data.vlanId = v;
    }

    // Optical Power extraction
    const rawRx = this.getFirstParam(pMap, [
      'InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalRxPower',
      'InternetGatewayDevice.DeviceInfo.X_HW_GPON.OpticalModuleInformation.RxPower',
      'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.RXPower',
      'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.RXPower',
      'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.TransceiverRxPower',
      'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.RXPower',
      'InternetGatewayDevice.WANDevice.1.X_VSOL_OpticalInfo.RxPower',
      'InternetGatewayDevice.WANDevice.1.X_SYROTECH_OpticalInfo.RxPower',
      'InternetGatewayDevice.WANDevice.1.X_NETLINK_OpticalInfo.RxPower',
      'InternetGatewayDevice.WANDevice.1.X_TPLINK_OptInfo.RxPower',
      'InternetGatewayDevice.WANDevice.1.X_NOKIA_OpticalInfo.RxPower',
      'Device.Optical.Interface.1.OpticalSignalLevel',
    ]);
    data.opticalRxPower = CwmpXmlParser.normalizeOpticalRxPower(rawRx);

    const rawTx = this.getFirstParam(pMap, [
      'InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalTxPower',
      'InternetGatewayDevice.DeviceInfo.X_HW_GPON.OpticalModuleInformation.TxPower',
      'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.TXPower',
      'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.TXPower',
      'InternetGatewayDevice.WANDevice.1.X_VSOL_OpticalInfo.TxPower',
      'InternetGatewayDevice.WANDevice.1.X_TPLINK_OptInfo.TxPower',
      'InternetGatewayDevice.WANDevice.1.X_NOKIA_OpticalInfo.TxPower',
      'Device.Optical.Interface.1.TransmitOpticalPower',
    ]);
    data.opticalTxPower = CwmpXmlParser.normalizeOpticalTxPower(rawTx);

    const rawBias = this.getFirstParam(pMap, [
      'InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalBiasCurrent',
      'InternetGatewayDevice.DeviceInfo.X_HW_GPON.OpticalModuleInformation.BiasCurrent',
      'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.TXBiasCurrent',
      'InternetGatewayDevice.WANDevice.1.X_TPLINK_OptInfo.BiasCurrent',
      'Device.Optical.Interface.1.TxBiasCurrent',
    ]);
    data.opticalBiasCurrent = CwmpXmlParser.normalizeBiasCurrent(rawBias);

    const rawVolt = this.getFirstParam(pMap, [
      'InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalVoltage',
      'InternetGatewayDevice.DeviceInfo.X_HW_GPON.OpticalModuleInformation.Voltage',
      'InternetGatewayDevice.WANDevice.1.X_TPLINK_OptInfo.Voltage',
      'Device.Optical.Interface.1.Voltage',
    ]);
    data.opticalVoltage = CwmpXmlParser.normalizeVoltage(rawVolt);

    const rawTemp = this.getFirstParam(pMap, [
      'InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.Temperature',
      'InternetGatewayDevice.DeviceInfo.X_HW_BoardTemp',
      'InternetGatewayDevice.DeviceInfo.X_ZTE-COM_BoardTemperature',
      'Device.DeviceInfo.TemperatureStatus.TemperatureSensor.1.Value',
      'Device.Optical.Interface.1.Temperature',
    ]);
    data.temperatureC = CwmpXmlParser.normalizeTemperature(rawTemp);

    // Wi-Fi SSIDs & Passwords
    data.wifiSsid24 = this.getFirstParam(pMap, [
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
      'Device.WiFi.SSID.1.SSID',
    ]);
    data.wifiPass24 = this.getFirstParam(pMap, [
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase',
      'Device.WiFi.AccessPoint.1.Security.KeyPassphrase',
    ]);

    data.wifiSsid5g = this.getFirstParam(pMap, [
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID',
      'Device.WiFi.SSID.2.SSID',
    ]);

    // Manufacturer & Brand Normalization
    if (data.productClass && (!data.manufacturer || data.manufacturer === 'Unknown' || data.manufacturer === 'GPON')) {
      if (/RH821|RL8|Richer/i.test(data.productClass)) data.manufacturer = 'RicherLink';
      else if (/HG8|EG8|OptiX|Huawei/i.test(data.productClass)) data.manufacturer = 'Huawei';
      else if (/F670|F660|F680|ZTE/i.test(data.productClass)) data.manufacturer = 'ZTE';
      else if (/V280|VSOL|V-SOL/i.test(data.productClass)) data.manufacturer = 'V-SOL';
      else if (/SY-|Syro/i.test(data.productClass)) data.manufacturer = 'Syrotech';
      else if (/HG323|Netlink/i.test(data.productClass)) data.manufacturer = 'Netlink';
      else if (/XC220|Archer|TP-Link/i.test(data.productClass)) data.manufacturer = 'TP-Link';
    }

    // Recursive extraction of all WAN Profiles from parameter map
    const wanProfiles: any[] = [];
    const pppKeys = new Set<string>();
    const ipKeys = new Set<string>();
    for (const [k] of pMap.entries()) {
      const pppMatch = k.match(/(InternetGatewayDevice\.WANDevice\.\d+\.WANConnectionDevice\.\d+\.WANPPPConnection\.\d+)\./);
      if (pppMatch) pppKeys.add(pppMatch[1]);
      const ipMatch = k.match(/(InternetGatewayDevice\.WANDevice\.\d+\.WANConnectionDevice\.\d+\.WANIPConnection\.\d+)\./);
      if (ipMatch) ipKeys.add(ipMatch[1]);
    }

    for (const prefix of pppKeys) {
      const name = pMap.get(`${prefix}.Name`) || `WAN_PPP_${wanProfiles.length + 1}`;
      const user = pMap.get(`${prefix}.Username`) || '';
      const extIp = pMap.get(`${prefix}.ExternalIPAddress`) || '';
      const vlan = parseInt(pMap.get(`${prefix}.VLANID`) || pMap.get(`${prefix}.X_CT_COM_VlanID`) || pMap.get(`${prefix}.X_HW_VLAN`) || '100', 10);
      const status = pMap.get(`${prefix}.ConnectionStatus`) || 'Connected';
      const service = pMap.get(`${prefix}.X_CT_COM_ServiceList`) || pMap.get(`${prefix}.X_FH_ServiceList`) || 'INTERNET';
      const gateway = pMap.get(`${prefix}.DefaultGateway`) || '100.64.10.1';
      const mask = pMap.get(`${prefix}.SubnetMask`) || '255.255.255.0';

      wanProfiles.push({
        name,
        connectionType: 'PPPoE',
        type: 'PPPoE',
        pppoeUsername: user,
        ipAddress: extIp,
        vlanId: isNaN(vlan) ? 100 : vlan,
        status,
        serviceType: service,
        gateway,
        subnetMask: mask,
        enabled: pMap.get(`${prefix}.Enable`) !== '0'
      });
    }

    for (const prefix of ipKeys) {
      const name = pMap.get(`${prefix}.Name`) || `WAN_IP_${wanProfiles.length + 1}`;
      const addrType = pMap.get(`${prefix}.AddressingType`) || 'DHCP';
      const extIp = pMap.get(`${prefix}.ExternalIPAddress`) || '';
      const vlan = parseInt(pMap.get(`${prefix}.VLANID`) || pMap.get(`${prefix}.X_CT_COM_VlanID`) || '100', 10);
      const status = pMap.get(`${prefix}.ConnectionStatus`) || 'Connected';
      const service = pMap.get(`${prefix}.X_CT_COM_ServiceList`) || 'VOIP/TR069';

      wanProfiles.push({
        name,
        connectionType: addrType === 'Static' ? 'Static' : 'IP_Routed',
        type: addrType,
        ipAddress: extIp,
        vlanId: isNaN(vlan) ? 100 : vlan,
        status,
        serviceType: service,
        enabled: pMap.get(`${prefix}.Enable`) !== '0'
      });
    }

    if (wanProfiles.length > 0) {
      (data as any).wanProfiles = wanProfiles;
    }

    // Recursive extraction of all LAN Host & Wi-Fi Associated Devices
    const connectedClients: any[] = [];
    const hostPrefixes = new Set<string>();
    for (const [k] of pMap.entries()) {
      const hostMatch = k.match(/(InternetGatewayDevice\.LANDevice\.\d+\.Hosts\.Host\.\d+)\./);
      if (hostMatch) hostPrefixes.add(hostMatch[1]);
      const wlanAssocMatch = k.match(/(InternetGatewayDevice\.LANDevice\.\d+\.WLANConfiguration\.\d+\.AssociatedDevice\.\d+)\./);
      if (wlanAssocMatch) hostPrefixes.add(wlanAssocMatch[1]);
    }

    for (const prefix of hostPrefixes) {
      const mac = pMap.get(`${prefix}.MACAddress`) || pMap.get(`${prefix}.AssociatedDeviceMACAddress`);
      const ip = pMap.get(`${prefix}.IPAddress`) || pMap.get(`${prefix}.AssociatedDeviceIPAddress`);
      const hostName = pMap.get(`${prefix}.HostName`) || pMap.get(`${prefix}.X_CT_COM_HostName`) || `Host-${mac ? mac.slice(-5).replace(':', '') : 'Client'}`;
      const ifType = pMap.get(`${prefix}.InterfaceType`) || (prefix.includes('WLANConfiguration.2') ? 'Wi-Fi 5GHz' : 'Wi-Fi 2.4GHz');
      const active = pMap.get(`${prefix}.Active`) !== '0' && pMap.get(`${prefix}.AssociatedDeviceAuthenticationState`) !== '0';

      if (mac || ip) {
        connectedClients.push({
          mac: mac || '',
          macAddress: mac || '',
          hostname: hostName,
          hostName: hostName,
          ip: ip || '',
          ipAddress: ip || '',
          connected: active,
          active: active,
          interfaceType: ifType,
          connectedInterface: ifType,
          band: ifType.includes('5') ? '5GHz' : '2.4GHz',
          lastSeen: new Date()
        });
      }
    }

    if (connectedClients.length > 0) {
      data.connectedClients = connectedClients;
      data.lanHostCount = connectedClients.length;
    }

    return data;
  }

  /**
   * Resolves target tenant dynamically based on path slug, subdomain, host header, existing device assignment, or subscriber PPPoE
   */
  static async resolveTenant(
    hostHeader?: string,
    pathOrQuerySlug?: string,
    cpeContext?: {
      serialAliases?: string[];
      pppoeUsername?: string;
      macAddress?: string;
      ssid?: string;
      wanIp?: string;
    }
  ): Promise<ITenant | null> {
    // 1. Super Admin Manual Pre-Mapping (Explicit assignment from Quarantine Workbench)
    if (cpeContext?.serialAliases && cpeContext.serialAliases.length > 0) {
      const mappedRecord = await PendingDeviceMapping.findOne({
        serialNumber: { $in: cpeContext.serialAliases },
        mappedTenantId: { $exists: true, $ne: null },
      });

      if (mappedRecord?.mappedTenantId) {
        if (typeof mappedRecord.mappedTenantId === 'object' && (mappedRecord.mappedTenantId as any).slug) {
          return mappedRecord.mappedTenantId as any;
        }
        const t = await Tenant.findById(mappedRecord.mappedTenantId);
        if (t) return t;
      }
    }

    // 2. Strict Dedicated Endpoint Resolution: Dedicated URL path slug (/tr069/:slug) or Subdomain (:slug.ciniplay.in)
    let incomingSlug: string | undefined;
    if (pathOrQuerySlug) {
      incomingSlug = pathOrQuerySlug.toLowerCase().trim();
    } else if (hostHeader) {
      const hostClean = hostHeader.split(':')[0].toLowerCase().trim();
      const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostClean);

      if (!isIpAddress) {
        const hostParts = hostClean.split('.');
        if (hostParts.length > 2 && hostParts[0] !== 'www' && hostParts[0] !== 'ciniplay') {
          incomingSlug = hostParts[0];
        }
      }
    }

    // If an explicit dedicated slug was provided, resolve the tenant
    if (incomingSlug) {
      let tenant = await Tenant.findOne({ slug: incomingSlug });
      if (tenant) return tenant;

      tenant = await Tenant.findOne({ subdomain: new RegExp(`^${incomingSlug}$`, 'i') });
      if (tenant) return tenant;
    }

    // 3. Registered Hardware Owner (Validated ONLY under its registered Tenant Slug or verified mapping)
    // If an ONT is registered to Tenant A, it must communicate under Tenant A's dedicated slug.
    if (cpeContext?.serialAliases && cpeContext.serialAliases.length > 0 && incomingSlug) {
      const existingDevice = await Device.findOne({
        serialNumber: { $in: cpeContext.serialAliases },
        tenantId: { $exists: true, $ne: null },
      });

      if (existingDevice?.tenantId) {
        const t = await Tenant.findById(existingDevice.tenantId);
        if (t && (t.slug === incomingSlug || t.subdomain?.toLowerCase() === incomingSlug)) {
          return t;
        }
      }
    }

    // 4. Strict Multi-Tenant Enforcement:
    // Root ACS access without a valid dedicated slug MUST NEVER auto-assign to any tenant.
    // Unmatched CPEs return null and are placed into the Pending Quarantine Pool for Super Admin manual review.
    return null;
  }

  /**
   * Continuous Optical Telemetry Ingestion, Deduplication, History (last 20 only), and Alert Engine
   */
  static async processOpticalTelemetryChange(
    device: IDevice,
    rxPower?: number,
    txPower?: number,
    bias?: number,
    volt?: number,
    temp?: number,
    sourcePath?: string
  ): Promise<void> {
    if (rxPower === undefined && txPower === undefined) return;

    if (!device.rxPowerHistory) device.rxPowerHistory = [];
    const lastHist = device.rxPowerHistory.length > 0
      ? device.rxPowerHistory[device.rxPowerHistory.length - 1]
      : null;

    const currentRx = rxPower !== undefined ? rxPower : device.currentRxPowerDbm;
    const currentTx = txPower !== undefined ? txPower : device.currentTxPowerDbm;

    if (currentRx === undefined) return;

    const deltaRx = lastHist ? parseFloat((currentRx - lastHist.valueDbm).toFixed(2)) : 0;
    const deltaTx = (lastHist?.txPowerDbm !== undefined && currentTx !== undefined)
      ? parseFloat((currentTx - lastHist.txPowerDbm).toFixed(2))
      : 0;

    const isRxChanged = !lastHist || Math.abs(currentRx - lastHist.valueDbm) >= 0.01;
    const isTxChanged = currentTx !== undefined && (!lastHist || lastHist.txPowerDbm === undefined || Math.abs(currentTx - lastHist.txPowerDbm) >= 0.01);

    // 1. DEDUPLICATION: Only record a new history entry when values have changed
    if (isRxChanged || isTxChanged) {
      device.rxPowerHistory.push({
        valueDbm: currentRx,
        txPowerDbm: currentTx,
        biasCurrentMa: bias ?? device.biasCurrentMa,
        voltageV: volt ?? device.opticalVoltageV,
        temperatureC: temp ?? device.temperatureC,
        timestamp: new Date(),
      });

      // 2. LIMIT HISTORY: Retain ONLY the last 20 changes
      if (device.rxPowerHistory.length > 20) {
        device.rxPowerHistory = device.rxPowerHistory.slice(-20);
      }

      device.currentRxPowerDbm = currentRx;
      if (currentTx !== undefined) device.currentTxPowerDbm = currentTx;
      device.opticalDelta = deltaRx;
      device.opticalHealthTrend = deltaRx > 0.3 ? 'improving' : deltaRx < -0.3 ? 'degrading' : 'stable';
      if (sourcePath) device.opticalTelemetrySourcePath = sourcePath;

      const previousStatus = device.opticalStatus;
      const newStatus = currentRx < -27.0 ? 'critical' : currentRx < -24.5 ? 'warning' : 'normal';
      device.opticalStatus = newStatus;

      // 3. 0.5 or 1.0 dB Change Detection & Critical/Warning Alert Generation
      if (lastHist && (Math.abs(deltaRx) >= 0.5 || currentRx < -27.0)) {
        const severity = (Math.abs(deltaRx) >= 1.0 || currentRx < -27.0) ? 'critical' : 'warning';
        
        // Find associated customer
        let customer = null;
        if (device.customerId) {
          customer = await Customer.findById(device.customerId);
        } else if (device.tenantId) {
          customer = await Customer.findOne({ assignedDeviceId: device._id, tenantId: device.tenantId });
        }

        const customerName = customer?.fullName || 'Unassigned Subscriber';

        // Save Alert in Database with strict tenant isolation
        const alert = await Alert.create({
          tenantId: device.tenantId,
          severity,
          sourceType: 'ONT_OPTICAL',
          sourceId: device.serialNumber,
          sourceName: customerName,
          message: `Optical power shift of ${deltaRx > 0 ? '+' : ''}${deltaRx} dB detected on ${device.serialNumber} (${customerName}). Old Rx: ${lastHist.valueDbm.toFixed(2)} dBm, New Rx: ${currentRx.toFixed(2)} dBm${currentTx !== undefined ? ` (Tx: ${currentTx.toFixed(2)} dBm)` : ''}.`,
          valueRecorded: currentRx,
          thresholdDbm: -27.0,
          acknowledged: false,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          occurrencesCount: 1,
        });

        console.log(
          `[OPTICAL_ALERT_SAVED] Alert ${alert._id} created for ${device.serialNumber} | Delta: ${deltaRx} dB | Severity: ${severity}`
        );

        // Resolve Assigned Operators & Technicians for WhatsApp Dispatch
        if (device.tenantId) {
          const operatorUsers = await User.find({
            tenantId: device.tenantId,
            role: { $in: ['operator_admin', 'noc_operator'] },
            status: 'active',
          });

          const technicianUsers = await User.find({
            tenantId: device.tenantId,
            role: 'technician',
            status: 'active',
          });

          const tenant = await Tenant.findById(device.tenantId);

          const recipients: Array<{ phone: string; role: 'operator' | 'technician' | 'admin' }> = [];
          if (tenant?.owner?.phone) {
            recipients.push({ phone: tenant.owner.phone, role: 'operator' });
          }
          for (const op of operatorUsers) {
            if (op.phone && !recipients.some(r => r.phone === op.phone)) {
              recipients.push({ phone: op.phone, role: 'operator' });
            }
          }
          for (const tech of technicianUsers) {
            if (tech.phone && !recipients.some(r => r.phone === tech.phone)) {
              recipients.push({ phone: tech.phone, role: 'technician' });
            }
          }

          for (const r of recipients) {
            WhatsAppService.sendOpticalPowerAlert({
              tenantId: device.tenantId.toString(),
              recipientPhone: r.phone,
              recipientRole: r.role,
              customerName,
              serialNumber: device.serialNumber,
              oldRxPowerDbm: lastHist.valueDbm,
              newRxPowerDbm: currentRx,
              deltaRxDb: deltaRx,
              oldTxPowerDbm: lastHist.txPowerDbm,
              newTxPowerDbm: currentTx,
              deltaTxDb: deltaTx,
              timestamp: new Date(),
              severity,
            }).catch(err => console.error('[CwmpService] WhatsApp optical alert failed:', err));
          }
        }
      }

      // 4. AUTOMATIC RECOVERY ALERT: When optical power returns to normal range (-10 dBm to -24.5 dBm)
      const wasDegraded = previousStatus === 'critical' || previousStatus === 'warning' || (lastHist && lastHist.valueDbm < -27.0);
      const isNowNormal = currentRx >= -24.5 && currentRx <= -10.0;

      if (wasDegraded && isNowNormal) {
        // Auto-acknowledge previous open optical alerts for this device
        await Alert.updateMany(
          {
            tenantId: device.tenantId,
            sourceId: device.serialNumber,
            sourceType: 'ONT_OPTICAL',
            acknowledged: false,
          },
          {
            $set: {
              acknowledged: true,
              acknowledgedAt: new Date(),
            },
          }
        );

        let customer = null;
        if (device.customerId) {
          customer = await Customer.findById(device.customerId);
        } else if (device.tenantId) {
          customer = await Customer.findOne({ assignedDeviceId: device._id, tenantId: device.tenantId });
        }
        const customerName = customer?.fullName || 'Unassigned Subscriber';

        if (device.tenantId) {
          const operatorUsers = await User.find({
            tenantId: device.tenantId,
            role: { $in: ['operator_admin', 'noc_operator'] },
            status: 'active',
          });
          const technicianUsers = await User.find({
            tenantId: device.tenantId,
            role: 'technician',
            status: 'active',
          });
          const tenant = await Tenant.findById(device.tenantId);

          const recipients: Array<{ phone: string; role: 'operator' | 'technician' | 'admin' }> = [];
          if (tenant?.owner?.phone) recipients.push({ phone: tenant.owner.phone, role: 'operator' });
          for (const op of operatorUsers) {
            if (op.phone && !recipients.some(r => r.phone === op.phone)) recipients.push({ phone: op.phone, role: 'operator' });
          }
          for (const tech of technicianUsers) {
            if (tech.phone && !recipients.some(r => r.phone === tech.phone)) recipients.push({ phone: tech.phone, role: 'technician' });
          }

          for (const r of recipients) {
            WhatsAppService.sendOpticalRecoveryAlert({
              tenantId: device.tenantId.toString(),
              recipientPhone: r.phone,
              recipientRole: r.role,
              customerName,
              serialNumber: device.serialNumber,
              previousRxPowerDbm: lastHist ? lastHist.valueDbm : -28.0,
              currentRxPowerDbm: currentRx,
              currentTxPowerDbm: currentTx,
              timestamp: new Date(),
            }).catch(err => console.error('[CwmpService] WhatsApp optical recovery alert failed:', err));
          }
        }
      }
    }
  }

  /**
   * Phase 1: Handles incoming Inform SOAP message from CPE
   */
  static async handleInform(
    xml: string,
    clientIp: string,
    hostHeader?: string,
    pathOrQuerySlug?: string,
    connectionKey?: string
  ): Promise<{ responseXml: string; sessionId: string }> {
    this.totalHits++;
    this.cleanExpiredSessions();

    const informData = this.parseInformXml(xml);
    const rawSerial = CwmpVendorProfiles.formatPonSerialNumber(informData.serialNumber) || `CPE-${clientIp.replace(/[^0-9]/g, '').slice(-8)}`;
    const serialAliases = CwmpXmlParser.getSerialNumberAliases(rawSerial);

    // Multi-factor tenant resolution (Explicit Path Slug -> Subdomain -> Existing DB Device -> Customer Match -> Heuristics -> Fallback)
    const tenant = await this.resolveTenant(hostHeader, pathOrQuerySlug, {
      serialAliases,
      pppoeUsername: informData.pppoeUsername,
      macAddress: informData.macAddress,
      ssid: informData.wifiSsid24 || informData.wifiSsid5g,
      wanIp: informData.wanIp,
    });
    const tenantSlug = tenant?.slug || 'quarantine_pending';
    const model = informData.productClass || informData.hardwareVersion || 'GPON-ONT';
    const vendorName = informData.manufacturer || 'Generic GPON';
    const detectedVendor = CwmpVendorProfiles.detectVendor(vendorName, model, informData.oui, informData.productClass, xml);

    // STRICT SECURITY GATE: Verify Tenant Ownership vs Incoming Routing Path
    // If device is already registered in DB, verify that incoming slug matches owner tenant
    const registeredDevice = await Device.findOne({ serialNumber: { $in: serialAliases } });
    let isTenantMismatch = false;

    if (registeredDevice && registeredDevice.tenantId) {
      if (pathOrQuerySlug) {
        const pathSlugClean = pathOrQuerySlug.toLowerCase().trim();
        const incomingTenant = await Tenant.findOne({
          $or: [
            { slug: pathSlugClean },
            { subdomain: new RegExp(`^${pathSlugClean}$`, 'i') },
          ],
        });

        if (incomingTenant && incomingTenant._id.toString() !== registeredDevice.tenantId.toString()) {
          isTenantMismatch = true;
          console.error(
            `[TENANT_MISMATCH_SECURITY_EVENT] 🚨 CRITICAL: ONT ${rawSerial} (Owner Tenant: ${registeredDevice.tenantId}) hit mismatched slug "${pathOrQuerySlug}" (Target Tenant: ${incomingTenant._id}). BLOCKING ALL ACS COMMANDS & TELEMETRY ACCESS.`
          );

          // Quarantine immediately into PendingDeviceMapping
          try {
            await PendingDeviceMapping.findOneAndUpdate(
              { serialNumber: rawSerial },
              {
                $set: {
                  manufacturer: vendorName,
                  oui: informData.oui,
                  productClass: model,
                  softwareVersion: informData.softwareVersion,
                  hardwareVersion: informData.hardwareVersion,
                  macAddress: informData.macAddress,
                  incomingHost: hostHeader,
                  incomingUrl: `/tr069${pathOrQuerySlug ? `/${pathOrQuerySlug}` : ''}`,
                  pathOrQuerySlug,
                  clientIp,
                  reason: 'CONFLICTING_HEADER',
                  rawInformXml: CwmpXmlParser.maskSensitiveData(xml.substring(0, 10000)),
                  lastSeenAt: new Date(),
                },
                $setOnInsert: {
                  status: 'PENDING',
                  firstSeenAt: new Date(),
                  alertCount: 0,
                },
              },
              { upsert: true, new: true }
            );
          } catch (err) {
            console.error('[CWMP] Error upserting mismatched PendingDeviceMapping:', err);
          }

          WhatsAppService.sendPendingDeviceAlert({
            serialNumber: rawSerial,
            manufacturer: vendorName,
            oui: informData.oui,
            productClass: model,
            incomingHost: hostHeader,
            incomingUrl: `/tr069${pathOrQuerySlug ? `/${pathOrQuerySlug}` : ''}`,
            pathOrQuerySlug,
            clientIp,
            reason: 'CONFLICTING_HEADER',
          }).catch(() => {});
        }
      }
    }

    // Create session tracking
    const sessionId = `cwmp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const sessionContext: ActiveSessionContext = {
      sessionId,
      serialNumber: rawSerial,
      serialAliases,
      vendor: detectedVendor,
      manufacturer: vendorName,
      modelName: model,
      firmwareVersion: informData.softwareVersion || 'V1.0.0',
      hardwareVersion: informData.hardwareVersion || 'V1.0',
      clientIp,
      tenantId: isTenantMismatch ? '' : (tenant ? tenant._id.toString() : ''),
      tenantSlug: isTenantMismatch ? 'quarantine_mismatch' : tenantSlug,
      stage: isTenantMismatch ? 'MISMATCH_BLOCKED' : 'INFORM_ACKED',
      timestamp: Date.now(),
    };

    this.sessionsById.set(sessionId, sessionContext);
    if (connectionKey) {
      this.sessionsByConnection.set(connectionKey, sessionContext);
    }

    const rxPower = informData.opticalRxPower;
    const txPower = informData.opticalTxPower;
    const opticalStatus = rxPower !== undefined
      ? (rxPower < -27.0 ? 'critical' : rxPower < -24.5 ? 'warning' : 'normal')
      : 'normal';

    let hitStatus: 'PROVISIONED' | 'DISCOVERED' | 'HEARTBEAT' = 'DISCOVERED';

    let resolvedDeviceId: string | undefined;
    let resolvedCustomerId: string | undefined;

    if (tenant && !isTenantMismatch) {
      // Lookup device in database (prefer tenant match first, then serial search)
      let device = await Device.findOne({
        serialNumber: { $in: serialAliases },
        tenantId: tenant._id,
      });

      if (!device) {
        device = await Device.findOne({
          serialNumber: { $in: serialAliases },
        });
      }

      const historyRecord: IRxPowerRecord | null = rxPower !== undefined ? {
        valueDbm: rxPower,
        txPowerDbm: txPower,
        timestamp: new Date(),
      } : null;

      if (device) {
        hitStatus = 'HEARTBEAT';
        device.status = 'online';
        device.lastInform = new Date();
        device.cwmpSessionId = sessionId;

        // 3-WAY HARDWARE IDENTITY LOCK: Registered Owner Tenant is IMMUTABLE
        if (device.tenantId) {
          sessionContext.tenantId = device.tenantId.toString();
        }

        if (informData.wanIp) device.ipAddress = informData.wanIp;
        device.externalIpAddress = clientIp;
        if (informData.softwareVersion) device.softwareVersion = informData.softwareVersion;
        if (informData.hardwareVersion) device.hardwareVersion = informData.hardwareVersion;
        if (informData.macAddress) device.macAddress = informData.macAddress;
        if (informData.productClass) device.modelName = informData.productClass;

        device.lastRawInformXml = xml;
        if (!device.rawParameters) device.rawParameters = {};

        if (informData.wifiSsid24 && device.wifi24) {
          device.wifi24.ssid = informData.wifiSsid24;
          if (informData.wifiPass24) device.wifi24.password = informData.wifiPass24;
        }
        if (informData.wifiSsid5g && device.wifi5g) device.wifi5g.ssid = informData.wifiSsid5g;
        if (informData.lanHostCount !== undefined) device.lanHostCount = informData.lanHostCount;

        if ((informData as any).wanProfiles && (informData as any).wanProfiles.length > 0) {
          const incoming = (informData as any).wanProfiles;
          if (!device.wanProfiles || device.wanProfiles.length === 0) {
            device.wanProfiles = incoming;
          } else {
            for (const inc of incoming) {
              const existing = device.wanProfiles.find((p: any) =>
                (inc.cpeObjectPath && p.cpeObjectPath === inc.cpeObjectPath) ||
                (inc.name && p.name === inc.name) ||
                (inc.serviceType === 'TR069' && (p.serviceType === 'TR069' || p.serviceType === 'VOIP/TR069' || p.isProtected))
              );
              if (existing) {
                if (inc.status) existing.status = inc.status;
                if (inc.ipAddress) existing.ipAddress = inc.ipAddress;
                if (inc.vlanId) existing.vlanId = inc.vlanId;
                if (inc.pppoeUsername) existing.pppoeUsername = inc.pppoeUsername;
              } else {
                device.wanProfiles.push(inc);
              }
            }
          }
        } else if (device.wanProfiles && device.wanProfiles.length > 0) {
          if (informData.vlanId !== undefined) device.wanProfiles[0].vlanId = informData.vlanId;
          if (informData.pppoeUsername) device.wanProfiles[0].pppoeUsername = informData.pppoeUsername;
        }

        if (informData.connectedClients && informData.connectedClients.length > 0) {
          device.connectedClients = informData.connectedClients;
          device.lanHostCount = informData.connectedClients.length;
        }

        // Process Continuous Optical Telemetry, Deduplication, History (20 Limit), and Critical/Recovery Alerts
        await CwmpService.processOpticalTelemetryChange(
          device,
          rxPower,
          txPower,
          informData.opticalBiasCurrent,
          informData.opticalVoltage,
          informData.temperatureC
        );

        // Device ownership is immutable during CWMP telemetry ingestion (only modified via explicit UI action)

        await device.save();
        resolvedDeviceId = device._id.toString();
        resolvedCustomerId = device.customerId?.toString();
      } else {
        hitStatus = 'PROVISIONED';
        const wanProfile: any = {
          name: 'Internet_TR069',
          connectionType: 'PPPoE',
          serviceType: 'INTERNET',
          status: 'Connected',
        };
        if (informData.vlanId !== undefined) wanProfile.vlanId = informData.vlanId;
        if (informData.pppoeUsername) wanProfile.pppoeUsername = informData.pppoeUsername;

        const deviceData: any = {
          tenantId: tenant._id,
          deviceIdStr: `dev_${Date.now()}_${rawSerial.slice(-4)}`,
          serialNumber: rawSerial,
          macAddress: informData.macAddress || `00:E0:${clientIp.split('.').map((p: string) => parseInt(p).toString(16).padStart(2, '0')).slice(-4).join(':')}`,
          manufacturer: vendorName,
          modelName: model,
          hardwareVersion: informData.hardwareVersion || 'V1.0',
          softwareVersion: informData.softwareVersion || 'V1.0.0',
          protocol: 'TR-069',
          status: 'online',
          lastInform: new Date(),
          ipAddress: informData.wanIp || clientIp,
          externalIpAddress: clientIp,
          opticalStatus,
          customerId: undefined,
          assigned: false,
          cwmpSessionId: sessionId,
          lastRawInformXml: xml,
          rawParameters: {},
          wanProfiles: [wanProfile],
          wifi24: {
            ssid: informData.wifiSsid24 || '',
            password: informData.wifiPass24 || '',
            enabled: true,
            channel: 6,
            channelAuto: true,
            bandwidthMhz: 20,
            securityMode: 'WPA2-PSK',
            txPowerPercent: 100,
          },
          wifi5g: {
            ssid: informData.wifiSsid5g || '',
            password: '',
            enabled: true,
            channel: 44,
            channelAuto: true,
            bandwidthMhz: 80,
            securityMode: 'WPA2-PSK',
            txPowerPercent: 100,
          },
          rxPowerHistory: historyRecord ? [historyRecord] : [],
        };

        if (rxPower !== undefined) deviceData.currentRxPowerDbm = rxPower;
        if (txPower !== undefined) deviceData.currentTxPowerDbm = txPower;
        if (informData.opticalBiasCurrent !== undefined) deviceData.biasCurrentMa = informData.opticalBiasCurrent;
        if (informData.opticalVoltage !== undefined) deviceData.opticalVoltageV = informData.opticalVoltage;
        if (informData.temperatureC !== undefined) deviceData.temperatureC = informData.temperatureC;
        if (informData.lanHostCount !== undefined) deviceData.lanHostCount = informData.lanHostCount;

        let newDevice: any;
        try {
          newDevice = await Device.create(deviceData);
        } catch (err: any) {
          newDevice = await Device.findOneAndUpdate(
            { serialNumber: rawSerial },
            { $set: deviceData },
            { new: true, upsert: true }
          );
        }
        resolvedDeviceId = newDevice?._id?.toString();
      }
    } else {
      // UNRESOLVED / UNMAPPED DEVICE: Record in PendingDeviceMapping and trigger Super Admin WhatsApp alert
      hitStatus = 'DISCOVERED';
      let detectedReason: 'MISSING_SLUG_AND_SUBDOMAIN' | 'UNKNOWN_TENANT_SLUG' | 'INVALID_SUBDOMAIN' = 'MISSING_SLUG_AND_SUBDOMAIN';

      if (pathOrQuerySlug) {
        detectedReason = 'UNKNOWN_TENANT_SLUG';
      } else if (hostHeader) {
        const hostParts = hostHeader.split(':')[0].toLowerCase().split('.');
        if (hostParts.length > 2 && hostParts[0] !== 'www' && hostParts[0] !== 'ciniplay') {
          detectedReason = 'INVALID_SUBDOMAIN';
        }
      }

      await PendingDeviceMapping.findOneAndUpdate(
        { serialNumber: rawSerial },
        {
          $set: {
            manufacturer: vendorName,
            oui: informData.oui,
            productClass: model,
            softwareVersion: informData.softwareVersion,
            hardwareVersion: informData.hardwareVersion,
            macAddress: informData.macAddress,
            incomingHost: hostHeader,
            incomingUrl: `/tr069${pathOrQuerySlug ? `/${pathOrQuerySlug}` : ''}`,
            pathOrQuerySlug,
            clientIp,
            reason: detectedReason,
            rawInformXml: xml.substring(0, 10000),
            wifi24: {
              ssid: informData.wifiSsid24 || '',
              password: informData.wifiPass24 || '',
              enabled: true,
              channel: 6,
              bandwidthMhz: 20,
              securityMode: 'WPA2-PSK',
              txPowerPercent: 100,
            },
            wifi5g: {
              ssid: informData.wifiSsid5g || '',
              password: informData.wifiPass5g || '',
              enabled: true,
              channel: 44,
              bandwidthMhz: 80,
              securityMode: 'WPA2-PSK',
              txPowerPercent: 100,
            },
            wan: {
              pppoeUsername: informData.pppoeUsername,
              vlanId: informData.vlanId,
              connectionType: 'PPPoE',
              ipAddress: informData.wanIp || clientIp,
              macAddress: informData.macAddress,
              status: informData.wanConnectionStatus || 'Connected',
            },
            telemetry: {
              rxPowerDbm: informData.opticalRxPower,
              txPowerDbm: informData.opticalTxPower,
              voltageV: informData.opticalVoltage,
              biasCurrentMa: informData.opticalBiasCurrent,
              temperatureC: informData.temperatureC,
              lanHostCount: informData.lanHostCount || 0,
            },
            lastSeenAt: new Date(),
          },
          $setOnInsert: {
            status: 'PENDING',
            firstSeenAt: new Date(),
            alertCount: 0,
          },
        },
        { upsert: true, new: true }
      ).catch((err) => console.error('[CWMP] Error upserting PendingDeviceMapping:', err));

      // Asynchronously dispatch WhatsApp alert to Super Admin (non-blocking)
      WhatsAppService.sendPendingDeviceAlert({
        serialNumber: rawSerial,
        manufacturer: vendorName,
        oui: informData.oui,
        productClass: model,
        incomingHost: hostHeader,
        incomingUrl: `/tr069${pathOrQuerySlug ? `/${pathOrQuerySlug}` : ''}`,
        pathOrQuerySlug,
        clientIp,
        reason: detectedReason,
      }).catch((waErr) => console.error('[CWMP] WhatsApp alert dispatch error:', waErr));

      console.warn(
        `[CWMP ACS] [UNMAPPED_CPE] Device ${rawSerial} (${model}) quarantined in PendingDeviceMapping. Reason: ${detectedReason}. WhatsApp alert triggered.`
      );
    }

    sessionContext.deviceId = resolvedDeviceId;
    sessionContext.customerId = resolvedCustomerId;

    this.recentHits.unshift({
      timestamp: new Date(),
      ip: clientIp,
      serialNumber: rawSerial,
      manufacturer: vendorName,
      model,
      vendor: detectedVendor,
      events: informData.events,
      tenantSlug,
      status: hitStatus,
    });
    if (this.recentHits.length > 50) this.recentHits.pop();

    CwmpSessionLog.create({
      tenantId: tenant?._id,
      serialNumber: rawSerial,
      sessionId,
      cwmpId: '1',
      direction: 'CPE_TO_ACS',
      rpcMethod: 'Inform',
      httpStatus: 200,
      rawXml: CwmpXmlParser.maskSensitiveData(xml),
      timestamp: new Date(),
    }).catch(() => {});

    const informRespXml = this.buildInformResponse();
    CwmpSessionLog.create({
      tenantId: tenant?._id,
      serialNumber: rawSerial,
      sessionId,
      cwmpId: '1',
      direction: 'ACS_TO_CPE',
      rpcMethod: 'InformResponse',
      httpStatus: 200,
      rawXml: informRespXml,
      timestamp: new Date(),
    }).catch(() => {});

    console.log(
      `[CWMP ACS] Ingested Inform from ${clientIp} | Tenant: ${tenantSlug} | Serial: ${rawSerial} | Vendor: ${detectedVendor} | Session: ${sessionId}`
    );
    return { responseXml: informRespXml, sessionId };
  }

  /**
   * Phase 2 & 3: Dispatches isolated, multi-stage GetParameterValues on empty POST.
   * Stage 1: Safe Baseline TR-098/TR-181 (Wi-Fi, WAN, LAN) with ZERO unverified optical paths.
   * Stage 2: Isolated Optical Candidate Discovery & Cached Path Querying.
   */
  static async checkPendingRpcOrPoll(
    clientIp: string,
    incomingSessionId?: string,
    hostHeader?: string,
    pathOrQuerySlug?: string,
    connectionKey?: string
  ): Promise<string | null> {
    try {
      const session =
        (incomingSessionId ? this.sessionsById.get(incomingSessionId) : undefined) ||
        (connectionKey ? this.sessionsByConnection.get(connectionKey) : undefined);

      if (!session) {
        console.warn(`[CWMP ACS] [EMPTY_POST] No active session found for Conn: ${connectionKey || clientIp}, SessionId: ${incomingSessionId || 'none'}. Returning 204.`);
        return null;
      }

      // STRICT TENANT ISOLATION: If session was blocked due to cross-tenant slug mismatch or quarantine, return ZERO commands & ZERO GPV
      if (session.stage === 'MISMATCH_BLOCKED' || !session.tenantId) {
        console.warn(`[CWMP ACS] [CROSS_TENANT_BLOCK] Suppressing all RPCs (Zero GPV, Zero SPV, Zero Reboot) for mismatched/quarantined session ${session.sessionId} (${session.serialNumber}). Returning 204.`);
        return null;
      }

      // 0. Check for Pending Operational Commands (SetParameterValues, Reboot, etc.)
      const serialAliases = session.serialAliases || CwmpXmlParser.getSerialNumberAliases(session.serialNumber);
      const dev = await Device.findOne({ serialNumber: { $in: serialAliases } });
      if (dev) {
        // Priority 1: High-priority configuration & diagnostic commands (SET_WIFI_CONFIG, SET_WAN_CONFIG, REBOOT_DEVICE, etc.)
        let pendingCmd = await DeviceCommand.findOne({
          deviceId: dev._id,
          action: { $nin: ['SUMMON_LIVE_POLL', 'GET_PARAMETERS', 'REFRESH_TELEMETRY'] },
          status: { $in: ['pending', 'queued', 'authorized', 'created', 'sending', 'sent'] }
        }).sort({ queuedAt: 1, createdAt: 1 });

        // Priority 2: General telemetry poll / summon commands
        if (!pendingCmd) {
          pendingCmd = await DeviceCommand.findOne({
            deviceId: dev._id,
            status: { $in: ['pending', 'queued', 'authorized', 'created', 'sending', 'sent'] }
          }).sort({ queuedAt: -1, createdAt: -1 });
        }

        if (pendingCmd) {
          const cmdAction = (pendingCmd as any).action || (pendingCmd as any).rpcMethod || (pendingCmd as any).commandType || '';
          
          // STRICT SECURITY GUARD 1: Prohibit stale commands (> 15 mins) from executing unexpectedly
          const cmdAgeSeconds = (Date.now() - new Date(pendingCmd.queuedAt || (pendingCmd as any).createdAt).getTime()) / 1000;
          if (cmdAgeSeconds > 900) {
            console.error(`[EMERGENCY GLOBAL GUARD] 🛑 Dropped stale command ${pendingCmd._id} (${cmdAction}) for ${session.serialNumber} (Age: ${Math.round(cmdAgeSeconds)}s)`);
            pendingCmd.status = 'expired';
            pendingCmd.errorMessage = `EXPIRED: Command dropped because it remained uncollected for ${Math.round(cmdAgeSeconds)}s (> 15 mins).`;
            await pendingCmd.save();
            return null;
          }

          // STRICT SECURITY GUARD 2: Only explicit, authenticated operator UI actions can trigger Reboot
          if (cmdAction === 'REBOOT_DEVICE' || cmdAction === 'Reboot') {
            const requester = (pendingCmd as any).requestedBy;
            if (!requester || (!requester.userId && !requester.email)) {
              console.error(`[EMERGENCY GLOBAL GUARD] 🚨 BLOCKED AUTOMATED REBOOT for ${session.serialNumber} (Cmd: ${pendingCmd._id}) - No authenticated operator found.`);
              pendingCmd.status = 'failed';
              pendingCmd.errorMessage = 'BLOCKED_BY_EMERGENCY_GLOBAL_GUARD: Automated reboot prohibited without verified operator.';
              await pendingCmd.save();
              return null;
            }

            pendingCmd.status = 'sending';
            pendingCmd.sentAt = new Date();
            await pendingCmd.save();
            const rebootXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header><cwmp:ID soapenv:mustUnderstand="1">4</cwmp:ID></soapenv:Header>
  <soapenv:Body><cwmp:Reboot><CommandKey>${pendingCmd._id}</CommandKey></cwmp:Reboot></soapenv:Body>
</soapenv:Envelope>`;
            console.log(`[Native CWMP OUT] Dispatched Authenticated Operator Reboot RPC for ${session.serialNumber} (Cmd: ${pendingCmd._id}, Operator: ${requester.email || requester.userId})`);
            return rebootXml;
          }

          // STRICT SECURITY GUARD 3: Only explicit, authenticated operator UI actions can trigger Factory Reset
          if (cmdAction === 'FACTORY_RESET' || cmdAction === 'FactoryReset') {
            const requester = (pendingCmd as any).requestedBy;
            if (!requester || (!requester.userId && !requester.email)) {
              console.error(`[EMERGENCY GLOBAL GUARD] 🚨 BLOCKED AUTOMATED FACTORY RESET for ${session.serialNumber} (Cmd: ${pendingCmd._id}) - No authenticated operator found.`);
              pendingCmd.status = 'failed';
              pendingCmd.errorMessage = 'BLOCKED_BY_EMERGENCY_GLOBAL_GUARD: Automated factory reset prohibited without verified operator.';
              await pendingCmd.save();
              return null;
            }

            pendingCmd.status = 'sending';
            pendingCmd.sentAt = new Date();
            await pendingCmd.save();
            const resetXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header><cwmp:ID soapenv:mustUnderstand="1">5</cwmp:ID></soapenv:Header>
  <soapenv:Body><cwmp:FactoryReset/></soapenv:Body>
</soapenv:Envelope>`;
            console.log(`[Native CWMP OUT] Dispatched Authenticated Operator FactoryReset RPC for ${session.serialNumber} (Cmd: ${pendingCmd._id})`);
            return resetXml;
          }

          // Handle Explicit GetParameterNames RPC Discovery
          if (cmdAction === 'GET_PARAMETER_NAMES' || cmdAction === 'GetParameterNames') {
            pendingCmd.status = 'sending';
            pendingCmd.sentAt = new Date();
            await pendingCmd.save();

            const pPath = (pendingCmd as any).parameters?.parameterPath || 'InternetGatewayDevice.WANDevice.1.';
            const nextLvl = (pendingCmd as any).parameters?.nextLevel !== undefined ? (pendingCmd as any).parameters.nextLevel : 0;
            const gpnXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header>
    <cwmp:ID soapenv:mustUnderstand="1">2</cwmp:ID>
  </soapenv:Header>
  <soapenv:Body>
    <cwmp:GetParameterNames>
      <ParameterPath>${pPath}</ParameterPath>
      <NextLevel>${nextLvl}</NextLevel>
    </cwmp:GetParameterNames>
  </soapenv:Body>
</soapenv:Envelope>`;
            console.log(`[Native CWMP OUT] Dispatched GetParameterNames for ${session.serialNumber} (Path: ${pPath}, Cmd: ${pendingCmd._id})`);
            return gpnXml;
          }

          // Handle Custom Raw CWMP RPC (for diagnostics & advanced testing)
          if (cmdAction === 'CUSTOM_RPC' && (pendingCmd as any).parameters?.customXml) {
            pendingCmd.status = 'sending';
            pendingCmd.sentAt = new Date();
            await pendingCmd.save();
            session.stage = 'CUSTOM_RPC_SENT';
            console.log(`[Native CWMP OUT] Dispatched CUSTOM_RPC for ${session.serialNumber} (Cmd: ${pendingCmd._id})`);
            return (pendingCmd as any).parameters.customXml;
          }
          if (
            cmdAction === 'GetParameterValues' ||
            cmdAction === 'SUMMON_LIVE_POLL' ||
            cmdAction === 'CUSTOM_RPC' ||
            (pendingCmd as any).commandType === 'SUMMON_LIVE_POLL'
          ) {
            pendingCmd.status = 'sending';
            pendingCmd.sentAt = new Date();
            await pendingCmd.save();

            session.stage = 'BASELINE_SENT';
            const requestedParams = (pendingCmd as any).parameters?.parameterNames || (pendingCmd as any).parameters?.paths;
            const targetParams = requestedParams && requestedParams.length > 0
              ? requestedParams
              : CwmpVendorProfiles.getSafeBaselineParameters(session.vendor, session.modelName);
            console.log(
              `[Native CWMP OUT] Dispatched GPV for ${session.serialNumber} (${session.modelName}) | Cmd: ${pendingCmd._id} | Params: [${targetParams.length}]`
            );

            const stringElements = targetParams.map((p: string) => `        <string>${p}</string>`).join('\n');
            const gpvXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header>
    <cwmp:ID soapenv:mustUnderstand="1">2</cwmp:ID>
  </soapenv:Header>
  <soapenv:Body>
    <cwmp:GetParameterValues>
      <ParameterNames soapenv:arrayType="xsd:string[${targetParams.length}]">
${stringElements}
      </ParameterNames>
    </cwmp:GetParameterValues>
  </soapenv:Body>
</soapenv:Envelope>`;
            return gpvXml;
          }

          // STRICT SECURITY GUARD 4: Parameter changes require verified operator request
          let rawParams = (pendingCmd as any).parameters?.tr069ParamValues || (pendingCmd as any).payload?.parameterValues;
          if (!Array.isArray(rawParams) || rawParams.length === 0) {
            const prof = (pendingCmd as any).parameters?.profile;
            if (prof) {
              rawParams = await buildTr069WanParams(prof, dev);
            } else {
              rawParams = [];
            }
          }

          if (Array.isArray(rawParams) && rawParams.length > 0) {
            pendingCmd.status = 'sending';
            pendingCmd.sentAt = new Date();
            await pendingCmd.save();

            const normalizedParams = rawParams.map((p: any) => {
              if (Array.isArray(p)) return { name: p[0], value: p[1], type: p[2] || 'xsd:string' };
              return { name: p.name || p.path, value: p.value, type: p.type || 'xsd:string' };
            });

            // Validate against SupportedParameterCache (reject known unsupported vendor parameters)
            const validParams: Array<{ name: string; value: any; type: string }> = [];
            for (const p of normalizedParams) {
              const cached = await SupportedParameterCache.findOne({
                parameterPath: p.name,
                status: 'UNSUPPORTED'
              });
              if (cached) {
                console.warn(`[CWMP ACS] 🛡️ Suppressed unsupported parameter '${p.name}' before SetParameterValues dispatch.`);
                continue;
              }
              validParams.push(p);
            }

            // If target WAN slot (slot > 1) does not exist in live device.rawParameters on CPE, issue scoped AddObject first
            const targetParamName = validParams[0]?.name || '';
            const slotMatch = targetParamName.match(/WANConnectionDevice\.(\d+)\./);
            const targetSlot = slotMatch ? parseInt(slotMatch[1], 10) : 1;

            const slotExistsInRaw = Object.keys(dev.rawParameters || {}).some(k =>
              k.includes(`WANConnectionDevice.${targetSlot}.`)
            );

            if (targetSlot > 1 && !slotExistsInRaw && session.stage !== 'ADD_OBJECT_SENT') {
              session.stage = 'ADD_OBJECT_SENT';
              const addObjectXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header><cwmp:ID soapenv:mustUnderstand="1">3</cwmp:ID></soapenv:Header>
  <soapenv:Body>
    <cwmp:AddObject>
      <ObjectName>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.</ObjectName>
      <ParameterKey>${pendingCmd._id}</ParameterKey>
    </cwmp:AddObject>
  </soapenv:Body>
</soapenv:Envelope>`;
              CwmpSessionLog.create({
                tenantId: session.tenantId,
                deviceId: dev._id,
                serialNumber: session.serialNumber,
                sessionId: session.sessionId,
                cwmpId: '3',
                direction: 'ACS_TO_CPE',
                rpcMethod: 'AddObject',
                httpStatus: 200,
                rawXml: addObjectXml,
                timestamp: new Date(),
              }).catch(() => {});
              console.log(`[Native CWMP OUT] Dispatched AddObject RPC for WANConnectionDevice on ${session.serialNumber} (Cmd: ${pendingCmd._id})`);
              return addObjectXml;
            }

            if (validParams.length === 0) {
              console.warn(`[CWMP ACS] ⚠️ No valid parameters remaining to dispatch for Cmd ${pendingCmd._id}. Marking as failed.`);
              pendingCmd.status = 'failed';
              pendingCmd.errorMessage = 'VALIDATION_FAILED: All queued parameters are marked unsupported or invalid for this CPE firmware.';
              pendingCmd.completedAt = new Date();
              await pendingCmd.save();
              return null;
            }

            console.log(`
[SET_WAN_CONFIG]
Command ID: ${pendingCmd._id}
Device ID: ${dev._id}
CPE Serial: ${session.serialNumber}
Model: ${session.modelName || dev.modelName}
Firmware: ${dev.softwareVersion || 'Unknown'}

[QUEUE]
Created: ${pendingCmd.queuedAt || (pendingCmd as any).createdAt}
Status: DISPATCHING_SPV
Parameters: [${validParams.map((p) => p.name).join(', ')}]

[CWMP]
Session ID: ${session.sessionId}
RPC sent: SetParameterValues
            `);

            const spvXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soapenv:Header><cwmp:ID soapenv:mustUnderstand="1">3</cwmp:ID></soapenv:Header>
  <soapenv:Body>
    <cwmp:SetParameterValues>
      <ParameterList soapenv:arrayType="cwmp:ParameterValueStruct[${validParams.length}]">
${validParams.map((p: any) => `        <ParameterValueStruct>
          <Name>${p.name}</Name>
          <Value xsi:type="${p.type}">${p.name.toLowerCase().includes('password') && p.value ? p.value : p.value}</Value>
        </ParameterValueStruct>`).join('\n')}
      </ParameterList>
      <ParameterKey>${pendingCmd._id}</ParameterKey>
    </cwmp:SetParameterValues>
  </soapenv:Body>
</soapenv:Envelope>`;
            session.stage = 'SPV_SENT';
            console.log(`[Native CWMP OUT] Dispatched SetParameterValues RPC for ${session.serialNumber} (Cmd: ${pendingCmd._id}) | Params: [${validParams.length}]`);
            return spvXml;
          }
        }
      }

      // Periodic Inform Telemetry Sync: Query safe baseline (Wi-Fi, WAN) + confirmed optical telemetry path
      session.stage = 'BASELINE_SENT';
      const baselineParams = CwmpVendorProfiles.getSafeBaselineParameters(session.vendor, session.modelName);
      
      const queryParams: string[] = [...baselineParams];
      const verifiedOpticalPath = dev?.opticalTelemetrySourcePath;
      if (verifiedOpticalPath) {
        if (!queryParams.includes(verifiedOpticalPath)) {
          queryParams.push(verifiedOpticalPath);
        }
        const companions = CwmpVendorProfiles.getOpticalCompanionPaths(verifiedOpticalPath);
        for (const comp of companions) {
          if (!queryParams.includes(comp)) queryParams.push(comp);
        }
      }

      const stringElements = queryParams.map((p) => `        <string>${p}</string>`).join('\n');
      const gpvXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header>
    <cwmp:ID soapenv:mustUnderstand="1">2</cwmp:ID>
  </soapenv:Header>
  <soapenv:Body>
    <cwmp:GetParameterValues>
      <ParameterNames soapenv:arrayType="xsd:string[${queryParams.length}]">
${stringElements}
      </ParameterNames>
    </cwmp:GetParameterValues>
  </soapenv:Body>
</soapenv:Envelope>`;

      console.log(
        `[CWMP ACS -> CPE] Dispatched Baseline GPV for ${session.serialNumber} (${session.modelName}) | Verified Optical: ${verifiedOpticalPath || 'Pending GPN'} | Params: [${queryParams.length}]`
      );
      return gpvXml;
    } catch (err: any) {
      console.error(`[CWMP ACS] [UNHANDLED_EXCEPTION in checkPendingRpcOrPoll]:`, err);
      return null;
    }
  }

  /**
   * Phase 2.5: Handles GetParameterNamesResponse from CPE, extracts confirmed parameters, and queries them
   */
  static async handleParameterNamesResponse(
    xml: string,
    clientIp: string,
    incomingSessionId?: string,
    hostHeader?: string,
    pathOrQuerySlug?: string,
    connectionKey?: string
  ): Promise<string | null> {
    const session =
      (incomingSessionId ? this.sessionsById.get(incomingSessionId) : undefined) ||
      (connectionKey ? this.sessionsByConnection.get(connectionKey) : undefined);

    CwmpSessionLog.create({
      serialNumber: session?.serialNumber || 'UNKNOWN',
      sessionId: session?.sessionId || incomingSessionId || 'unknown',
      cwmpId: '2',
      direction: 'CPE_TO_ACS',
      rpcMethod: 'GetParameterNamesResponse',
      httpStatus: 200,
      rawXml: xml.substring(0, 15000),
      timestamp: new Date(),
    }).catch(() => {});

    const detailedNames = CwmpXmlParser.extractParameterInfoListDetailed(xml);
    const names = detailedNames.map((d) => d.name);
    console.log(
      `[CWMP ACS] Ingested GetParameterNamesResponse from ${connectionKey || clientIp} | Serial: ${session?.serialNumber} | Discovered Total Names: [${names.length}]`
    );

    if (names.length === 0) {
      console.warn(`[CWMP ACS] Zero names returned by GPN from ${connectionKey || clientIp}. Falling back to safe baseline.`);
      return null;
    }

    // Determine data model
    const hasTr181 = names.some((n) => n.startsWith('Device.'));
    const hasTr098 = names.some((n) => n.startsWith('InternetGatewayDevice.'));
    const detectedDataModel = hasTr181 && hasTr098 ? 'HYBRID' : hasTr181 ? 'TR-181' : 'TR-098';

    // Asynchronously batch cache supported parameter paths with classification
    if (session) {
      const cacheUpdates = detailedNames.map((item) => ({
        updateOne: {
          filter: {
            vendor: session.vendor,
            modelName: session.modelName,
            parameterPath: item.name,
          },
          update: {
            $set: {
              status: 'SUPPORTED' as const,
              manufacturer: session.manufacturer,
              firmwareVersion: session.firmwareVersion,
              dataModel: detectedDataModel,
              category: CwmpVendorProfiles.classifyParameter(item.name),
              writable: item.writable,
              lastCheckedAt: new Date(),
              lastVerified: new Date(),
              lastSeen: new Date(),
            },
            $setOnInsert: { firstSeen: new Date() },
          },
          upsert: true,
        },
      }));
      SupportedParameterCache.bulkWrite(cacheUpdates).catch(() => {});
    }

    // 1. Identify confirmed 2.4 GHz & 5 GHz Wi-Fi parameters (TR-098 & TR-181)
    const wifiSsid = names.find((n) => /LANDevice\.\d+\.WLANConfiguration\.1\.SSID$|Device\.WiFi\.SSID\.1\.SSID$/i.test(n));
    const wifiKey = names.find((n) => /LANDevice\.\d+\.WLANConfiguration\.1\..*KeyPassphrase$|Device\.WiFi\.AccessPoint\.1\.Security\.KeyPassphrase$/i.test(n));
    const wifiChan = names.find((n) => /LANDevice\.\d+\.WLANConfiguration\.1\.Channel$|Device\.WiFi\.Radio\.1\.Channel$/i.test(n));
    const wifiBeacon = names.find((n) => /LANDevice\.\d+\.WLANConfiguration\.1\.BeaconType$|Device\.WiFi\.AccessPoint\.1\.Security\.ModeEnabled$/i.test(n));

    const wifi5gSsid = names.find((n) => /LANDevice\.\d+\.WLANConfiguration\.(2|5)\.SSID$|Device\.WiFi\.SSID\.2\.SSID$/i.test(n));
    const wifi5gKey = names.find((n) => /LANDevice\.\d+\.WLANConfiguration\.(2|5)\..*KeyPassphrase$|Device\.WiFi\.AccessPoint\.2\.Security\.KeyPassphrase$/i.test(n));
    const wifi5gChan = names.find((n) => /LANDevice\.\d+\.WLANConfiguration\.(2|5)\.Channel$|Device\.WiFi\.Radio\.2\.Channel$/i.test(n));
    const wifi5gBeacon = names.find((n) => /LANDevice\.\d+\.WLANConfiguration\.(2|5)\.BeaconType$|Device\.WiFi\.AccessPoint\.2\.Security\.ModeEnabled$/i.test(n));

    // 2. Identify confirmed WAN parameters (TR-098 & TR-181)
    const wanUser = names.find((n) => /WANDevice\.\d+\.WANConnectionDevice\.\d+\.WANPPPConnection\.\d+\.Username$|Device\.PPP\.Interface\.\d+\.Username$/i.test(n));
    const wanIp = names.find((n) => /WANDevice\.\d+\.WANConnectionDevice\.\d+\.(WANPPPConnection|WANIPConnection)\.\d+\.ExternalIPAddress$|Device\.IP\.Interface\.\d+\..*IPAddress$/i.test(n));
    const wanStatus = names.find((n) => /WANDevice\.\d+\.WANConnectionDevice\.\d+\.(WANPPPConnection|WANIPConnection)\.\d+\.ConnectionStatus$|Device\.PPP\.Interface\.\d+\.ConnectionStatus$/i.test(n));
    const wanVlan = names.find((n) => /WANDevice\.\d+\.WANConnectionDevice\.\d+\.WANPPPConnection\.\d+\.(X_HW_VLAN|X_CT-COM_VlanID|X_ZTE-COM_VLAN)$|Device\.Ethernet\.VLANTermination\.\d+\.VLANID$/i.test(n));
    const lanHosts = names.find((n) => /LANDevice\.\d+\.Hosts\.HostNumberOfEntries$|Device\.Hosts\.HostNumberOfEntries$/i.test(n));

    // 3. Identify confirmed Optical / PON telemetry parameters
    const opticalRxCandidates = names.filter((n) =>
      /rxpower|rx_power|opticalsignallevel|receivepower|rxdba|opt_rx/i.test(n) &&
      !/ping|traceroute|wlan|wifi|beacon/i.test(n) && !n.endsWith('.')
    );
    const opticalTxCandidates = names.filter((n) =>
      /txpower|tx_power|transmitopticalpower|opt_tx/i.test(n) &&
      !/ping|traceroute|wlan|wifi|beacon/i.test(n) && !n.endsWith('.')
    );
    const opticalCompanionCandidates = names.filter((n) =>
      /(epon|gpon|pon|optical).*(bias|volt|temp)/i.test(n) &&
      !/ping|traceroute|wlan|wifi/i.test(n) && !n.endsWith('.')
    );

    console.log(
      `[CWMP ACS] Discovered Optical Telemetry on ${session?.serialNumber}: [RX: ${opticalRxCandidates.length}] [TX: ${opticalTxCandidates.length}] [Companions: ${opticalCompanionCandidates.length}]`,
      { rx: opticalRxCandidates, tx: opticalTxCandidates }
    );

    // Build the query parameter list strictly from parameters that EXIST on the CPE
    const confirmedParams: string[] = [];
    if (wifiSsid) confirmedParams.push(wifiSsid);
    if (wifiKey) confirmedParams.push(wifiKey);
    if (wifiChan) confirmedParams.push(wifiChan);
    if (wifiBeacon) confirmedParams.push(wifiBeacon);

    if (wifi5gSsid) confirmedParams.push(wifi5gSsid);
    if (wifi5gKey) confirmedParams.push(wifi5gKey);
    if (wifi5gChan) confirmedParams.push(wifi5gChan);
    if (wifi5gBeacon) confirmedParams.push(wifi5gBeacon);

    if (wanUser) confirmedParams.push(wanUser);
    if (wanIp) confirmedParams.push(wanIp);
    if (wanStatus) confirmedParams.push(wanStatus);
    if (wanVlan) confirmedParams.push(wanVlan);
    if (lanHosts) confirmedParams.push(lanHosts);

    // Priority 1: All discovered Optical RX paths
    for (const optRx of opticalRxCandidates) {
      if (!confirmedParams.includes(optRx)) confirmedParams.push(optRx);
    }
    // Priority 2: All discovered Optical TX paths
    for (const optTx of opticalTxCandidates) {
      if (!confirmedParams.includes(optTx)) confirmedParams.push(optTx);
    }
    // Priority 3: Companions (Voltage, Temperature, Bias Current)
    for (const comp of opticalCompanionCandidates) {
      if (confirmedParams.length < 32 && !confirmedParams.includes(comp)) confirmedParams.push(comp);
    }

    // Priority 4: Discovered LAN Host details & Associated Wi-Fi Devices
    const hostParams = names.filter((n) =>
      /(LANDevice\.\d+\.Hosts\.Host\.\d+\.(IPAddress|MACAddress|HostName|Active|InterfaceType)|LANDevice\.\d+\.WLANConfiguration\.\d+\.AssociatedDevice\.\d+\.(AssociatedDeviceMACAddress|AssociatedDeviceIPAddress)|Device\.Hosts\.Host\.\d+\.(IPAddress|PhysAddress|HostName|Active))/i.test(n) &&
      !n.endsWith('.')
    );
    for (const hp of hostParams) {
      if (confirmedParams.length < 48 && !confirmedParams.includes(hp)) confirmedParams.push(hp);
    }

    if (session && confirmedParams.length > 0) {
      session.stage = 'OPTICAL_SENT';

      if (opticalRxCandidates.length > 0) {
        session.activeOpticalCandidate = opticalRxCandidates[0];
      }

      console.log(
        `[CWMP ACS -> CPE] Dispatched Confirmed GPV for ${session.serialNumber} | Params: [${confirmedParams.length}] -> ${confirmedParams.join(', ')}`
      );

      const stringElements = confirmedParams.map((p) => `        <string>${p}</string>`).join('\n');
      const gpvXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header>
    <cwmp:ID soapenv:mustUnderstand="1">3</cwmp:ID>
  </soapenv:Header>
  <soapenv:Body>
    <cwmp:GetParameterValues>
      <ParameterNames soapenv:arrayType="xsd:string[${confirmedParams.length}]">
${stringElements}
      </ParameterNames>
    </cwmp:GetParameterValues>
  </soapenv:Body>
</soapenv:Envelope>`;

      CwmpSessionLog.create({
        serialNumber: session.serialNumber,
        sessionId: session.sessionId,
        cwmpId: '3',
        direction: 'ACS_TO_CPE',
        rpcMethod: 'GetParameterValues',
        httpStatus: 200,
        rawXml: CwmpXmlParser.maskSensitiveData(gpvXml),
        timestamp: new Date(),
      }).catch(() => {});

      return gpvXml;
    }

    return null;
  }

  /**
   * Phase 3: Handles GetParameterValuesResponse, isolates Fault 9005, and saves to MongoDB
   */
  static async handleParameterValuesResponse(
    xml: string,
    clientIp: string,
    incomingSessionId?: string,
    hostHeader?: string,
    pathOrQuerySlug?: string,
    connectionKey?: string
  ): Promise<string | null> {
    const { parameters: pMap, rawMap, fault } = CwmpXmlParser.extractParameterMap(xml);

    const session =
      (incomingSessionId ? this.sessionsById.get(incomingSessionId) : undefined) ||
      (connectionKey ? this.sessionsByConnection.get(connectionKey) : undefined);

    if (!session) {
      console.warn(`[CWMP ACS] [GPV_REJECTED] No matching active session for Conn: ${connectionKey || clientIp}, SessionId: ${incomingSessionId || 'none'}. Rejecting write to prevent cross-device contamination.`);
      return null;
    }

    const tenant = session?.tenantId
      ? { _id: session.tenantId }
      : await this.resolveTenant(hostHeader, pathOrQuerySlug);
    if (!tenant) return null;

    const serialAliases = session?.serialAliases || CwmpXmlParser.getSerialNumberAliases(session?.serialNumber);

    let device: any = null;
    if (session?.deviceId) {
      device = await Device.findOne({
        _id: session.deviceId,
        ...(tenant?._id ? { tenantId: tenant._id } : {}),
      });
    }

    if (!device && serialAliases.length > 0) {
      device = await Device.findOne({
        serialNumber: { $in: serialAliases },
        ...(tenant?._id ? { tenantId: tenant._id } : {}),
      });
    }

    if (!device) {
      console.warn(`[CWMP ACS] Device not found in DB for IP ${clientIp} / Serial ${session?.serialNumber}`);
      return null;
    }

    console.log(`[CWMP ACS] Inbound Response XML for ${device.serialNumber} (Stage: ${session?.stage}):\n${xml.substring(0, 1000)}`);
    device.lastRawGetParameterValuesResponseXml = xml;
    if (!device.rawParameters) device.rawParameters = {};
    Object.assign(device.rawParameters, rawMap);

    // Handle AddObjectResponse from CPE
    if (xml.includes('AddObjectResponse')) {
      // 1. Locate the exact in-flight command that triggered AddObject
      const pendingCmd = await DeviceCommand.findOne({ 
        deviceId: device._id, 
        status: 'sending',
        action: 'SET_WAN_CONFIG' 
      }).sort({ sentAt: -1 }) || await DeviceCommand.findOne({ 
        deviceId: device._id, 
        status: { $in: ['queued', 'sending', 'sent'] },
        action: 'SET_WAN_CONFIG'
      }).sort({ queuedAt: -1 });

      const instMatch = xml.match(/<InstanceNumber>(\d+)<\/InstanceNumber>/i);
      if (!instMatch || !instMatch[1]) {
        console.error(`[Native CWMP IN] CPE AddObjectResponse missing valid InstanceNumber element for ${device.serialNumber}`);
        if (pendingCmd) {
          pendingCmd.status = 'failed';
          pendingCmd.errorMessage = 'CPE AddObjectResponse did not return a valid <InstanceNumber> element.';
          pendingCmd.completedAt = new Date();
          await pendingCmd.save();
        }
        return null;
      }

      const instanceNum = instMatch[1];
      console.log(`[Native CWMP IN] CPE created new WAN connection instance ${instanceNum} for ${device.serialNumber}`);
      
      if (session) {
        session.stage = 'SPV_SENT';
      }

      if (pendingCmd) {
        const rawParams = (pendingCmd as any).parameters?.tr069ParamValues || (pendingCmd as any).payload?.parameterValues || [];
        const normalizedParams = rawParams.map((p: any) => {
          let name = Array.isArray(p) ? p[0] : (p.name || p.path);
          // Rebuild parameter path with the actual created instance number
          name = name.replace(/WANConnectionDevice\.\d+\./, `WANConnectionDevice.${instanceNum}.`);
          const val = Array.isArray(p) ? p[1] : p.value;
          const type = Array.isArray(p) ? (p[2] || 'xsd:string') : (p.type || 'xsd:string');
          return { name, value: val, type };
        });

        // Persist resolved cpeObjectPath back to device.wanProfiles in MongoDB
        const resolvedCpePath = `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.${instanceNum}.WANPPPConnection.1.`;
        const profileId = String((pendingCmd.parameters as any)?.profile?._id || '');
        const profileName = String((pendingCmd.parameters as any)?.profile?.name || '');
        const profileVlan = (pendingCmd.parameters as any)?.profile?.vlanId;

        let targetProfile = (device.wanProfiles || []).find((p: any) => p._id && String(p._id) === profileId);
        if (!targetProfile && profileName && profileName !== 'New WAN Connection') {
          targetProfile = (device.wanProfiles || []).find((p: any) => p.name === profileName);
        }
        if (!targetProfile && profileVlan) {
          targetProfile = (device.wanProfiles || []).find((p: any) => !p.isProtected && p.vlanId === Number(profileVlan));
        }

        if (targetProfile) {
          targetProfile.cpeObjectPath = resolvedCpePath;
          device.markModified('wanProfiles');
          await device.save();
          console.log(`[Native CWMP DB] Persisted resolved cpeObjectPath '${resolvedCpePath}' for profile '${targetProfile.name}' on ${device.serialNumber}`);
        } else {
          console.warn(`[Native CWMP DB] Could not uniquely resolve profile for cpeObjectPath '${resolvedCpePath}' on ${device.serialNumber}. Skipping blind overwrite.`);
        }

        const spvXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soapenv:Header><cwmp:ID soapenv:mustUnderstand="1">3</cwmp:ID></soapenv:Header>
  <soapenv:Body>
    <cwmp:SetParameterValues>
      <ParameterList soapenv:arrayType="cwmp:ParameterValueStruct[${normalizedParams.length}]">
${normalizedParams.map((p: any) => `        <ParameterValueStruct>
          <Name>${p.name}</Name>
          <Value xsi:type="${p.type}">${p.value}</Value>
        </ParameterValueStruct>`).join('\n')}
      </ParameterList>
      <ParameterKey>${pendingCmd._id}</ParameterKey>
    </cwmp:SetParameterValues>
  </soapenv:Body>
</soapenv:Envelope>`;
        console.log(`[Native CWMP OUT] Dispatched SetParameterValues for newly added WANConnectionDevice instance ${instanceNum} on ${device.serialNumber}`);
        return spvXml;
      }
    }

    // Handle SetParameterValuesResponse from CPE
    if (xml.includes('SetParameterValuesResponse')) {
      console.log(`[Native CWMP IN] CPE successfully acknowledged SetParameterValues for ${device.serialNumber}`);
      await DeviceCommand.updateMany(
        { deviceId: device._id, status: { $in: ['sent', 'sending', 'queued', 'pending'] } },
        { $set: { status: 'success', completedAt: new Date() } }
      );
      if (device.pendingConfig) {
        device.pendingConfig.status = 'APPLIED';
        device.pendingConfig.appliedAt = new Date();
      }
      await device.save();
      return null;
    }

    // Handle RebootResponse from CPE
    if (xml.includes('RebootResponse')) {
      console.log(`[Native CWMP IN] CPE acknowledged Reboot command for ${device.serialNumber}`);
      await DeviceCommand.updateMany(
        { deviceId: device._id, action: 'REBOOT_DEVICE', status: { $in: ['sent', 'sending', 'queued', 'pending'] } },
        { $set: { status: 'success', completedAt: new Date() } }
      );
      return null;
    }

    // Handle GetParameterNamesResponse from CPE
    if (xml.includes('GetParameterNamesResponse')) {
      console.log(`[Native CWMP IN] CPE returned GetParameterNamesResponse for ${device.serialNumber}`);
      CwmpSessionLog.create({
        tenantId: tenant?._id,
        deviceId: device?._id,
        serialNumber: device.serialNumber,
        sessionId: session?.sessionId || incomingSessionId || 'unknown',
        cwmpId: '2',
        direction: 'CPE_TO_ACS',
        rpcMethod: 'GetParameterNamesResponse',
        httpStatus: 200,
        rawXml: xml,
        timestamp: new Date(),
      }).catch(() => {});

      const matches = xml.matchAll(/<ParameterInfoStruct>\s*<Name>([^<]+)<\/Name>\s*<Writable>([^<]+)<\/Writable>\s*<\/ParameterInfoStruct>/gi);
      for (const m of matches) {
        const pName = m[1].trim();
        const isWritable = m[2].trim() === '1' || m[2].trim() === 'true';
        SupportedParameterCache.findOneAndUpdate(
          { vendor: session?.vendor || 'GENEXIS', modelName: session?.modelName || 'Platinum-4410', parameterPath: pName },
          { $set: { status: 'SUPPORTED', writable: isWritable, lastSeenAt: new Date() } },
          { upsert: true }
        ).catch(() => {});
      }

      await DeviceCommand.updateMany(
        { deviceId: device._id, action: { $in: ['CUSTOM_RPC', 'GET_PARAMETER_NAMES'] }, status: { $in: ['sent', 'sending', 'queued', 'pending'] } },
        { $set: { status: 'success', completedAt: new Date() } }
      );
      return null;
    }

    CwmpSessionLog.create({
      tenantId: tenant?._id,
      deviceId: device?._id,
      serialNumber: device.serialNumber,
      sessionId: session?.sessionId || incomingSessionId || 'unknown',
      cwmpId: '3',
      direction: 'CPE_TO_ACS',
      rpcMethod: fault?.isFault ? 'Fault' : 'GetParameterValuesResponse',
      httpStatus: 200,
      rawXml: CwmpXmlParser.maskSensitiveData(xml),
      faultCode: fault?.faultCode,
      faultString: fault?.faultString,
      timestamp: new Date(),
    }).catch(() => {});

    // Handle SOAP Fault (e.g. Fault 9002 / 9003 / 9005 during SPV or GPV)
    if (fault?.isFault) {
      console.warn(
        `[CWMP ACS] CPE returned SOAP Fault ${fault.faultCode}: ${fault.faultString} during stage ${session?.stage}`
      );

      // Extract specific SetParameterValuesFault parameter name and code if present
      const spvFaultMatch = xml.match(/<SetParameterValuesFault>[\s\S]*?<ParameterName>([^<]+)<\/ParameterName>[\s\S]*?<FaultCode>([^<]+)<\/FaultCode>[\s\S]*?<FaultString>([^<]+)<\/FaultString>[\s\S]*?<\/SetParameterValuesFault>/i);
      let detailedErrorMsg = fault.faultString || `CWMP Fault ${fault.faultCode}`;
      if (spvFaultMatch) {
        const paramName = spvFaultMatch[1].trim();
        const fCode = spvFaultMatch[2].trim();
        const fString = spvFaultMatch[3].trim();
        detailedErrorMsg = `Fault ${fCode}: ${fString} (Parameter: ${paramName})`;
        console.warn(`[CWMP ACS] 🛑 Extracted SetParameterValuesFault on '${paramName}': ${detailedErrorMsg}`);
        SupportedParameterCache.findOneAndUpdate(
          { vendor: session?.vendor || 'GENEXIS', modelName: session?.modelName || 'Platinum-4410', parameterPath: paramName },
          { $set: { status: 'UNSUPPORTED', writable: false, lastSeenAt: new Date() } },
          { upsert: true }
        ).catch(() => {});
      } else {
        const failedParamMatch = xml.match(/<ParameterName>([^<]+)<\/ParameterName>/i);
        if (failedParamMatch && failedParamMatch[1]) {
          const failedParam = failedParamMatch[1].trim();
          detailedErrorMsg = `Fault ${fault.faultCode}: ${fault.faultString} (Parameter: ${failedParam})`;
          SupportedParameterCache.findOneAndUpdate(
            { vendor: session?.vendor || 'GENEXIS', modelName: session?.modelName || 'Platinum-4410', parameterPath: failedParam },
            { $set: { status: 'UNSUPPORTED', writable: false, lastSeenAt: new Date() } },
            { upsert: true }
          ).catch(() => {});
        }
      }

      console.log(`
[RESULT]
Stage: ${session?.stage}
Fault Code: ${fault.faultCode}
Fault String: ${fault.faultString}
Detailed: ${detailedErrorMsg}
Timestamp: ${new Date().toISOString()}
      `);

      // Only mark configuration commands as failed if the fault occurred during SetParameterValues (SPV) or AddObject
      if (session?.stage === 'SPV_SENT' || session?.stage === 'CUSTOM_RPC_SENT' || session?.stage === 'ADD_OBJECT_SENT') {
        const stageDesc = session?.stage === 'ADD_OBJECT_SENT' ? ' [AddObject Failed]' : '';
        await DeviceCommand.updateMany(
          { deviceId: device._id, status: { $in: ['sent', 'sending'] } },
          { $set: { status: 'failed', errorMessage: `${detailedErrorMsg}${stageDesc}`, completedAt: new Date() } }
        );
        if (device.pendingConfig && device.pendingConfig.status === 'APPLYING') {
          device.pendingConfig.status = 'FAILED';
          device.pendingConfig.failedAt = new Date();
          device.pendingConfig.errorMessage = `${detailedErrorMsg}${stageDesc}`;
        }
        await device.save();
      }

      // If Baseline GPV failed, do not fail operator commands: fallback to GetParameterNames discovery
      if (session?.stage === 'BASELINE_SENT') {
        console.warn(
          `[CWMP ACS] Baseline GPV batch rejected with Fault ${fault.faultCode} on ${session.serialNumber} (${session.modelName}). Dispatching GPN discovery fallback.`
        );
        session.stage = 'GPN_SENT';
        device.lastParameterSyncStatus = `FAULT_${fault.faultCode}_DISCOVERY_FALLBACK`;
        await device.save();

        const isTr181 = session.vendor === 'TR181_STANDARD';
        const gpnPath = isTr181 ? 'Device.Optical.' : 'InternetGatewayDevice.WANDevice.1.';
        const gpnXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header>
    <cwmp:ID soapenv:mustUnderstand="1">2</cwmp:ID>
  </soapenv:Header>
  <soapenv:Body>
    <cwmp:GetParameterNames>
      <ParameterPath>${gpnPath}</ParameterPath>
      <NextLevel>0</NextLevel>
    </cwmp:GetParameterNames>
  </soapenv:Body>
</soapenv:Envelope>`;
        return gpnXml;
      }

      if (session?.stage === 'OPTICAL_SENT' && session.activeOpticalCandidate) {
        await SupportedParameterCache.findOneAndUpdate(
          {
            vendor: session.vendor,
            modelName: session.modelName,
            parameterPath: session.activeOpticalCandidate,
          },
          {
            $set: {
              status: 'UNSUPPORTED',
              manufacturer: session.manufacturer,
              firmwareVersion: session.firmwareVersion,
              lastCheckedAt: new Date(),
              lastErrorCode: fault.faultCode,
              lastRawFault: fault.faultString || 'CWMP Fault 9005',
            },
          },
          { upsert: true }
        );

        device.lastParameterSyncStatus = 'FAULT_9005_OPTICAL';
        await device.save();
        console.log(
          `[CWMP ACS] Cached parameter as UNSUPPORTED: ${session.activeOpticalCandidate}. Baseline Wi-Fi/WAN data remains preserved.`
        );
      }
      return null;
    }

    // SUCCESSFUL RESPONSE: Extract all returned Wi-Fi, WAN, LAN, and Optical parameters
    const ssid24 = this.getFirstParam(pMap, ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID', 'Device.WiFi.SSID.1.SSID']);
    const pass24 = this.getFirstParam(pMap, [
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.PreSharedKey',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase',
      'Device.WiFi.AccessPoint.1.Security.KeyPassphrase',
    ]);
    const chan24 = this.getFirstParam(pMap, ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel', 'Device.WiFi.Radio.1.Channel']);
    const beacon24 = this.getFirstParam(pMap, [
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.BeaconType',
      'Device.WiFi.AccessPoint.1.Security.ModeEnabled',
    ]);

    const ssid5g = this.getFirstParam(pMap, [
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.3.SSID',
      'Device.WiFi.SSID.2.SSID',
    ]);
    const pass5g = this.getFirstParam(pMap, [
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.PreSharedKey',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.KeyPassphrase',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.PreSharedKey.1.KeyPassphrase',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.PreSharedKey.1.PreSharedKey',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.KeyPassphrase',
      'Device.WiFi.AccessPoint.2.Security.KeyPassphrase',
    ]);
    const chan5g = this.getFirstParam(pMap, [
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Channel',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Channel',
      'Device.WiFi.Radio.2.Channel',
    ]);
    const beacon5g = this.getFirstParam(pMap, [
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.BeaconType',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.BeaconType',
      'Device.WiFi.AccessPoint.2.Security.ModeEnabled',
    ]);

    // Multi-slot dynamic search for customer PPPoE credentials across slots 1..8
    let pppoeUser = '';
    let pppStatus = '';
    let pppIp = '';
    let rawVlan = '';

    for (let s = 1; s <= 8; s++) {
      const user = pMap.get(`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.${s}.WANPPPConnection.1.Username`);
      if (user) {
        pppoeUser = user;
        pppStatus = pMap.get(`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.${s}.WANPPPConnection.1.ConnectionStatus`) || '';
        pppIp = pMap.get(`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.${s}.WANPPPConnection.1.ExternalIPAddress`) || '';
        rawVlan = pMap.get(`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.${s}.WANPPPConnection.1.X_HW_VLAN`) ||
                  pMap.get(`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.${s}.WANPPPConnection.1.X_CT-COM_VlanID`) ||
                  pMap.get(`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.${s}.WANPPPConnection.1.VLANID`) || '';
        break;
      }
    }

    if (!pppoeUser) {
      pppoeUser = this.getFirstParam(pMap, [
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username',
        'Device.PPP.Interface.1.Username',
      ]) || '';
      pppStatus = this.getFirstParam(pMap, [
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ConnectionStatus',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.ConnectionStatus',
        'Device.PPP.Interface.1.ConnectionStatus',
      ]) || '';
      pppIp = this.getFirstParam(pMap, [
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.ExternalIPAddress',
        'Device.IP.Interface.1.IPv4Address.1.IPAddress',
      ]) || '';
      rawVlan = this.getFirstParam(pMap, [
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.X_HW_VLAN',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.X_CT-COM_VlanID',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_ZTE-COM_VLAN',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.X_CT-COM_VlanID',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.VLANID',
        'Device.Ethernet.VLANTermination.1.VLANID',
      ]) || '';
    }

    const rawHosts = this.getFirstParam(pMap, [
      'InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries',
      'Device.Hosts.HostNumberOfEntries',
    ]);

    if (device.wifi24) {
      if (ssid24) device.wifi24.ssid = ssid24;
      if (pass24) device.wifi24.password = pass24;
      if (chan24) {
        const c = parseInt(chan24, 10);
        if (!isNaN(c)) device.wifi24.channel = c;
      }
      if (beacon24) device.wifi24.securityMode = beacon24;
    }

    if (device.wifi5g) {
      if (ssid5g) device.wifi5g.ssid = ssid5g;
      if (pass5g) device.wifi5g.password = pass5g;
      if (chan5g) {
        const c = parseInt(chan5g, 10);
        if (!isNaN(c)) device.wifi5g.channel = c;
      }
      if (beacon5g) device.wifi5g.securityMode = beacon5g;
    }

    // Target the customer Internet profile specifically, protecting Management WAN
    const targetWanProf = (device.wanProfiles || []).find((p: any) => !p.isProtected && p.serviceType !== 'TR069') || device.wanProfiles?.[0];
    if (targetWanProf) {
      if (pppoeUser) targetWanProf.pppoeUsername = pppoeUser;
      if (pppStatus) targetWanProf.status = (pppStatus === 'Connected' ? 'Connected' : 'Connecting');
      if (pppIp) targetWanProf.ipAddress = pppIp;
      if (rawVlan) {
        const v = parseInt(rawVlan, 10);
        if (!isNaN(v)) targetWanProf.vlanId = v;
      }
    }
    if (rawHosts) {
      const h = parseInt(rawHosts, 10);
      if (!isNaN(h)) device.lanHostCount = h;
    }

    // Parse Connected LAN / Wi-Fi Clients from pMap
    const clientMap: Map<string, any> = new Map();
    for (const [key, val] of pMap.entries()) {
      if (!val || val === '' || val === '0.0.0.0' || val === '00:00:00:00:00:00') continue;
      const hostMatch = key.match(/(?:LANDevice\.\d+\.Hosts\.Host|Device\.Hosts\.Host)\.(\d+)\.(MACAddress|PhysAddress|IPAddress|HostName|Active|InterfaceType)/i);
      if (hostMatch) {
        const idx = hostMatch[1];
        const field = hostMatch[2].toLowerCase();
        if (!clientMap.has(idx)) {
          clientMap.set(idx, {
            mac: '',
            ip: '',
            hostname: '',
            interfaceType: '2.4GHz',
            connected: true,
            isBlocked: false,
            lastSeen: new Date(),
          });
        }
        const c = clientMap.get(idx);
        if (field === 'macaddress' || field === 'physaddress') c.mac = val.toUpperCase();
        if (field === 'ipaddress') c.ip = val;
        if (field === 'hostname') c.hostname = val;
        if (field === 'interfacetype') {
          c.interfaceType = /5g/i.test(val) ? '5GHz' : /ethernet|eth/i.test(val) ? 'Ethernet' : '2.4GHz';
        }
        if (field === 'active') c.connected = val === '1' || val.toLowerCase() === 'true';
      }
    }
    const parsedClients = Array.from(clientMap.values()).filter((c: any) => c.mac || c.ip);
    if (parsedClients.length > 0) {
      device.connectedClients = parsedClients.map((c: any) => ({
        ...c,
        hostname: c.hostname || (c.mac ? `Host (${c.mac.slice(-5)})` : 'Connected Device'),
      }));
    }

    device.lastParameterSyncStatus = 'PARTIAL_SUCCESS';

    // 2. Optical Telemetry Extraction (Dynamic Multi-Vendor Scanning)
    let activeCandidate = session?.activeOpticalCandidate;
    let rxValRaw: string | undefined = activeCandidate ? pMap.get(activeCandidate) : undefined;

    // If activeCandidate was not in pMap or returned empty, scan all keys in pMap for Optical RX
    if (!rxValRaw) {
      for (const [k, v] of pMap.entries()) {
        if (
          /rxpower|rx_power|opticalsignallevel|receivepower|rxdba|opt_rx/i.test(k) &&
          !/ping|traceroute|wlan|wifi|beacon|transmit/i.test(k) &&
          v !== undefined && v !== '' && v !== '0' && v !== '-40.0' && v !== 'N/A'
        ) {
          activeCandidate = k;
          rxValRaw = v;
          break;
        }
      }
    }

    const vendor = session?.vendor || 'CHINA_TELECOM';
    const normalizedRx = rxValRaw ? CwmpVendorProfiles.normalizeOpticalRx(vendor, activeCandidate || '', rxValRaw) : null;

    if (normalizedRx && normalizedRx.isReliable) {
      device.currentRxPowerDbm = normalizedRx.normalizedValue;
      device.opticalTelemetrySourcePath = activeCandidate;
      device.opticalStatus =
        normalizedRx.normalizedValue < -27.0 ? 'critical' :
        normalizedRx.normalizedValue < -24.5 ? 'warning' : 'normal';

      // Dynamically find TX Power from pMap
      let rawTx = this.getFirstParam(pMap, [
        'InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalTxPower',
        'InternetGatewayDevice.DeviceInfo.X_HW_GPON.OpticalModuleInformation.TxPower',
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.TXPower',
        'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.TXPower',
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.TXPower',
        'InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.TXPower',
        'InternetGatewayDevice.WANDevice.1.WANGponInterfaceConfig.TXPower',
        'InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.TXPower',
        'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.TXPower',
        'InternetGatewayDevice.WANDevice.1.X_VSOL_OpticalInfo.TxPower',
        'Device.Optical.Interface.1.TransmitOpticalPower',
      ]);
      if (!rawTx) {
        for (const [k, v] of pMap.entries()) {
          if (
            /txpower|tx_power|transmitopticalpower|opt_tx/i.test(k) &&
            !/ping|traceroute|wlan|wifi/i.test(k) &&
            v !== undefined && v !== '' && v !== '0' && v !== 'N/A'
          ) {
            rawTx = v;
            break;
          }
        }
      }
      const normalizedTx = CwmpVendorProfiles.normalizeOpticalTx(vendor, '', rawTx);
      if (normalizedTx) device.currentTxPowerDbm = normalizedTx.normalizedValue;

      const rawBias = this.getFirstParam(pMap, [
        'InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalBiasCurrent',
        'InternetGatewayDevice.DeviceInfo.X_HW_GPON.OpticalModuleInformation.BiasCurrent',
        'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.TXBiasCurrent',
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.BiasCurrent',
        'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.BiasCurrent',
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.BiasCurrent',
        'InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.BiasCurrent',
        'Device.Optical.Interface.1.TxBiasCurrent',
      ]);
      const bias = CwmpXmlParser.normalizeBiasCurrent(rawBias);
      if (bias !== undefined) device.biasCurrentMa = bias;

      const rawVolt = this.getFirstParam(pMap, [
        'InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalVoltage',
        'InternetGatewayDevice.DeviceInfo.X_HW_GPON.OpticalModuleInformation.Voltage',
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.Voltage',
        'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.Voltage',
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.SupplyVoltage',
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.SupplyVottage',
        'InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.SupplyVoltage',
        'InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.SupplyVottage',
        'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.SupplyVoltage',
        'Device.Optical.Interface.1.Voltage',
      ]);
      const volt = CwmpXmlParser.normalizeVoltage(rawVolt);
      if (volt !== undefined) device.opticalVoltageV = volt;

      const rawTemp = this.getFirstParam(pMap, [
        'InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.Temperature',
        'InternetGatewayDevice.DeviceInfo.X_HW_BoardTemp',
        'InternetGatewayDevice.DeviceInfo.X_ZTE-COM_BoardTemperature',
        'InternetGatewayDevice.DeviceInfo.Temperature',
        'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.Temperature',
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.TransceiverTemperature',
        'InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.TransceiverTemperature',
        'Device.DeviceInfo.TemperatureStatus.TemperatureSensor.1.Value',
        'Device.Optical.Interface.1.Temperature',
      ]);
      const temp = CwmpXmlParser.normalizeTemperature(rawTemp);
      if (temp !== undefined) device.temperatureC = temp;

      // Process Continuous Optical Telemetry, Deduplication, History (20 Limit), and Critical/Recovery Alerts
      await CwmpService.processOpticalTelemetryChange(
        device,
        normalizedRx.normalizedValue,
        normalizedTx?.normalizedValue,
        bias,
        volt,
        temp,
        activeCandidate
      );

      // Record in cache as SUPPORTED
      if (activeCandidate && session) {
        await SupportedParameterCache.findOneAndUpdate(
          {
            vendor: session.vendor,
            modelName: session.modelName,
            parameterPath: activeCandidate,
          },
          {
            $set: {
              status: 'SUPPORTED',
              manufacturer: session.manufacturer,
              firmwareVersion: session.firmwareVersion,
              lastCheckedAt: new Date(),
            },
          },
          { upsert: true }
        );
      }

      device.lastParameterSyncStatus = 'SUCCESS';
    }

    // IMMUTABLE HARDWARE LOCK: If device already has a registered owner tenantId, never re-bind automatically
    if (!device.tenantId) {
      const resolvedTenant = await this.resolveTenant(hostHeader, pathOrQuerySlug, {
        serialAliases,
        wanIp: pppIp || device.ipAddress,
      });

      if (resolvedTenant) {
        device.tenantId = resolvedTenant._id;
        if (session) {
          session.tenantId = resolvedTenant._id.toString();
          session.tenantSlug = resolvedTenant.slug;
        }
      }
    }

    device.lastInform = new Date();
    device.lastParameterSyncAt = new Date();
    device.status = 'online';
    await device.save();

    // Mark SUMMON_LIVE_POLL and any telemetry polling commands as success
    await DeviceCommand.updateMany(
      { deviceId: device._id, action: 'SUMMON_LIVE_POLL', status: { $in: ['sent', 'sending', 'queued', 'pending'] } },
      { $set: { status: 'success', completedAt: new Date() } }
    ).catch(() => {});

    console.log(
      `[CWMP ACS] Ingested Live GPV Response for ${device.serialNumber} | SSID: ${device.wifi24?.ssid ?? 'N/A'} | Rx: ${device.currentRxPowerDbm ?? 'N/A'} dBm | Status: ${device.lastParameterSyncStatus}`
    );

    return null;
  }

  static buildInformResponse(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header>
    <cwmp:ID soapenv:mustUnderstand="1">1</cwmp:ID>
  </soapenv:Header>
  <soapenv:Body>
    <cwmp:InformResponse>
      <MaxEnvelopes>1</MaxEnvelopes>
    </cwmp:InformResponse>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  static getStats(tenantSlug?: string, reqHost?: string) {
    const hits = tenantSlug && tenantSlug !== 'default'
      ? this.recentHits.filter((h) => h.tenantSlug === tenantSlug)
      : this.recentHits;
    const host = (reqHost || '31.42.125.25').split(':')[0];
    const slug = (tenantSlug && tenantSlug !== 'default') ? tenantSlug : 'rudra';
    const cwmpPathUrl = `http://${host}:7547/tr069/${slug}`;
    const cwmpSubdomainUrl = `http://${slug}.${host}:7547`;
    return {
      success: true,
      cwmpUrl: cwmpPathUrl,
      cwmpPathUrl,
      cwmpSubdomainUrl,
      tenantSlug: slug,
      totalHits: this.totalHits,
      activeListeningPort: 7547,
      authCredentials: {
        username: process.env.CWMP_CONN_REQ_USER || 'admin',
        password: process.env.CWMP_CONN_REQ_PASS || 'admin123',
        informIntervalSeconds: 60,
      },
      recentHits: hits,
      serverStatus: 'LISTENING',
    };
  }

  /**
   * Automatically reconciles all pending/unassigned CPEs into the active Fleet Inventory
   */
  static async syncAllPendingDevicesToFleet(): Promise<number> {
    try {
      const pendingItems = await PendingDeviceMapping.find({
        $or: [{ status: 'PENDING' }, { mappedTenantId: null }],
      });

      let syncedCount = 0;
      for (const p of pendingItems) {
        const serial = p.serialNumber;
        const serialAliases = CwmpXmlParser.getSerialNumberAliases(serial);
        const tenant = await this.resolveTenant(p.incomingHost, p.pathOrQuerySlug, {
          serialAliases,
          macAddress: p.macAddress,
        });

        if (tenant) {
          let existingDevice = await Device.findOne({ serialNumber: { $in: serialAliases } });
          if (!existingDevice) {
            existingDevice = await Device.create({
              tenantId: tenant._id,
              deviceIdStr: `dev_${Date.now()}_${serial.slice(-4)}`,
              serialNumber: serial,
              macAddress: p.macAddress || `00:E0:${p.clientIp?.split('.').map((x) => parseInt(x).toString(16).padStart(2, '0')).slice(-4).join(':') || '00:00:00:00'}`,
              manufacturer: p.manufacturer || 'Generic GPON',
              modelName: p.productClass || 'GPON-ONT',
              hardwareVersion: p.hardwareVersion || 'V1.0',
              softwareVersion: p.softwareVersion || 'V1.0.0',
              protocol: 'TR-069',
              status: 'online',
              lastInform: p.lastSeenAt || new Date(),
              ipAddress: p.clientIp,
              externalIpAddress: p.clientIp,
              opticalStatus: 'normal',
              assigned: false,
              rawParameters: {},
              wanProfiles: [{
                name: 'Internet_TR069',
                connectionType: 'PPPoE',
                serviceType: 'INTERNET',
                status: 'Connected',
              }],
              wifi24: {
                ssid: '',
                password: '',
                enabled: true,
                channel: 6,
                channelAuto: true,
                bandwidthMhz: 20,
                securityMode: 'WPA2-PSK',
                txPowerPercent: 100,
              },
              wifi5g: {
                ssid: '',
                password: '',
                enabled: true,
                channel: 44,
                channelAuto: true,
                bandwidthMhz: 80,
                securityMode: 'WPA2-PSK',
                txPowerPercent: 100,
              },
            });
          } else {
            existingDevice.tenantId = tenant._id;
            await existingDevice.save();
          }

          p.status = 'MAPPED';
          p.mappedTenantId = tenant._id as any;
          p.mappedTenantSlug = tenant.slug;
          p.mappedAt = new Date();
          await p.save();
          syncedCount++;
        }
      }
      return syncedCount;
    } catch (err: any) {
      console.error('[CWMP] Error syncing pending devices to fleet:', err);
      return 0;
    }
  }
}