/**
 * Universal Multi-Vendor Router Data Extractor
 * Supports: Genexis, Syrotech, Realtek, Huawei, ZTE, RicherLink, FiberHome, Nokia, Netlink, VSOL, DBC
 * 
 * Works with both GenieACS object tree format (item.InternetGatewayDevice.*._value)
 * and flat CWMP parameter maps (map['InternetGatewayDevice.*']).
 */

export interface OpticalPowerResult {
  rxPower: string | null;
  txPower: string | null;
  temperature: string | null;
  voltage?: string | null;
  biasCurrent?: string | null;
}

export interface ExtractedWanConnection {
  type: 'WANPPPConnection' | 'WANIPConnection';
  serviceType: string;
  username?: string | null;
  password?: string | null;
  externalIP?: string | null;
  gateway?: string | null;
  dns?: string | null;
  status: string;
  vlanId?: number | null;
}

export interface ExtractedWiFiConfig {
  band: '2.4GHz' | '5GHz';
  enabled: boolean;
  ssid: string | null;
  password: string | null;
  security: string;
  stations: number;
  channel: number | null;
}

export interface ExtractedConnectedHost {
  hostName: string;
  ipAddress: string;
  macAddress: string;
  active: boolean;
  interfaceType?: string;
}

/**
 * 1. Extract Accurate Optical RX & TX Power (dBm)
 * Automatically converts 0.1 µW and scaled integer formats to standard dBm.
 */
export function extractOpticalPower(item: any): OpticalPowerResult {
  const igd = item?.InternetGatewayDevice || {};
  const wandev = igd.WANDevice?.['1'] || {};

  // Try all vendor paths in priority order
  const rawRx =
    wandev.X_CT_COM_EponInterfaceConfig?.RXPower?._value ??
    wandev.X_CT_COM_GponInterfaceConfig?.RXPower?._value ??
    wandev['X_CT-COM_EponInterfaceConfig']?.RXPower?._value ??
    wandev['X_CT-COM_GponInterfaceConfig']?.RXPower?._value ??
    wandev.WANEponInterfaceConfig?.RXPower?._value ??
    wandev.WANGponInterfaceConfig?.RXPower?._value ??
    igd.GX_OntOpticalParam?.RxPower?._value ??
    igd.DeviceInfo?.X_CT_COM_Telephony?.OpticalInfo?.RxPower?._value ??
    igd.DeviceInfo?.['X_CT-COM_Telephony']?.OpticalInfo?.RxPower?._value ??
    wandev.X_HW_GponInterfaceConfig?.RXPower?._value ??
    wandev['X_HW_GponInterfaceConfig']?.RXPower?._value ??
    wandev.X_ZTE_COM_GponInterfaceConfig?.RXPower?._value ??
    wandev['X_ZTE-COM_GponInterfaceConfig']?.RXPower?._value ??
    wandev.X_FH_EponInterfaceConfig?.RXPower?._value ??
    wandev['X_FH_EponInterfaceConfig']?.RXPower?._value ??
    wandev.X_CMCC_EponInterfaceConfig?.RXPower?._value ??
    wandev['X_CMCC_EponInterfaceConfig']?.RXPower?._value ??
    wandev.X_ALU_COM_GponInterfaceConfig?.RXPower?._value ??
    wandev['X_ALU-COM_GponInterfaceConfig']?.RXPower?._value ??
    item?.VirtualParameters?.RXPower?._value ??
    item?.['InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.RXPower'] ??
    item?.['InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.RXPower'] ??
    item?.['InternetGatewayDevice.GX_OntOpticalParam.RxPower'] ??
    null;

  const rawTx =
    wandev.X_CT_COM_EponInterfaceConfig?.TXPower?._value ??
    wandev.X_CT_COM_GponInterfaceConfig?.TXPower?._value ??
    wandev['X_CT-COM_EponInterfaceConfig']?.TXPower?._value ??
    wandev['X_CT-COM_GponInterfaceConfig']?.TXPower?._value ??
    wandev.WANEponInterfaceConfig?.TXPower?._value ??
    wandev.WANGponInterfaceConfig?.TXPower?._value ??
    igd.GX_OntOpticalParam?.TxPower?._value ??
    igd.DeviceInfo?.X_CT_COM_Telephony?.OpticalInfo?.TxPower?._value ??
    igd.DeviceInfo?.['X_CT-COM_Telephony']?.OpticalInfo?.TxPower?._value ??
    wandev.X_HW_GponInterfaceConfig?.TXPower?._value ??
    wandev['X_HW_GponInterfaceConfig']?.TXPower?._value ??
    wandev.X_ZTE_COM_GponInterfaceConfig?.TXPower?._value ??
    wandev['X_ZTE-COM_GponInterfaceConfig']?.TXPower?._value ??
    wandev.X_FH_EponInterfaceConfig?.TXPower?._value ??
    wandev['X_FH_EponInterfaceConfig']?.TXPower?._value ??
    wandev.X_CMCC_EponInterfaceConfig?.TXPower?._value ??
    wandev['X_CMCC_EponInterfaceConfig']?.TXPower?._value ??
    wandev.X_ALU_COM_GponInterfaceConfig?.TXPower?._value ??
    wandev['X_ALU-COM_GponInterfaceConfig']?.TXPower?._value ??
    item?.VirtualParameters?.TXPower?._value ??
    item?.['InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.TXPower'] ??
    item?.['InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.TXPower'] ??
    item?.['InternetGatewayDevice.GX_OntOpticalParam.TxPower'] ??
    null;

  const normalizePower = (val: any): string | null => {
    if (val === null || val === undefined || val === '') return null;
    const n = parseFloat(String(val).replace(/dBm|dbm|\s+/g, '').trim());
    if (isNaN(n)) return null;

    // Case A: Realtek/Broadcom raw power in 0.1 µW (num > 100) -> convert to dBm
    // Formula: dBm = 10 * log10((num / 10) / 1000)
    if (n > 100) {
      const uW = n / 10;
      const dbm = 10 * Math.log10(uW / 1000);
      return dbm.toFixed(2);
    }
    // Case B: Scaled Integer (e.g. -2145 means -21.45 dBm)
    if (n < -100) {
      return (n / 100).toFixed(2);
    }
    // Case C: Standard direct float string (e.g. "-21.45")
    return n.toFixed(2);
  };

  const rawTemp =
    wandev.X_CT_COM_GponInterfaceConfig?.TransceiverTemperature?._value ||
    wandev['X_CT-COM_GponInterfaceConfig']?.TransceiverTemperature?._value ||
    wandev['X_CT-COM_EponInterfaceConfig']?.TransceiverTemperature?._value ||
    igd.DeviceInfo?.TemperatureStatus?.Temperature?._value ||
    item?.['InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.TransceiverTemperature'] ||
    null;

  const normalizeTemp = (val: any): string | null => {
    if (!val) return null;
    const n = parseFloat(String(val).replace(/C|\s+/g, ''));
    if (isNaN(n)) return null;
    if (n > 200) return (n / 1000).toFixed(1);
    return n.toFixed(1);
  };

  return {
    rxPower: normalizePower(rawRx),
    txPower: normalizePower(rawTx),
    temperature: normalizeTemp(rawTemp),
  };
}

/**
 * 2. Extract Complete WAN & PPPoE Connections
 */
export function extractWANConnections(item: any): ExtractedWanConnection[] {
  const igd = item?.InternetGatewayDevice || {};
  const wanDevices = igd.WANDevice || {};
  const connections: ExtractedWanConnection[] = [];

  for (const wKey in wanDevices) {
    const connDevs = wanDevices[wKey]?.WANConnectionDevice || {};
    for (const cKey in connDevs) {
      // Check WANPPPConnection (PPPoE)
      const pppConns = connDevs[cKey]?.WANPPPConnection || {};
      for (const pKey in pppConns) {
        const conn = pppConns[pKey];
        if (conn && conn._object !== false) {
          const vlanVal =
            conn.X_CT_COM_VLAN?._value ||
            conn['X_CT-COM_VLAN']?._value ||
            conn.VLANID?._value ||
            conn.X_HW_VLAN?._value;
          connections.push({
            type: 'WANPPPConnection',
            serviceType:
              conn.X_CT_COM_ServiceList?._value ||
              conn['X_CT-COM_ServiceList']?._value ||
              conn.X_CMCC_ServiceList?._value ||
              conn.X_FH_ServiceList?._value ||
              'INTERNET',
            username: conn.Username?._value || null,
            password: conn.Password?._value || null,
            externalIP: conn.ExternalIPAddress?._value || null,
            gateway: conn.DefaultGateway?._value || null,
            dns: conn.DNSServers?._value || null,
            status: conn.ConnectionStatus?._value || 'Unconfigured',
            vlanId: vlanVal ? parseInt(String(vlanVal), 10) : null,
          });
        }
      }

      // Check WANIPConnection (DHCP / Static / IPoE / Bridge / TR069)
      const ipConns = connDevs[cKey]?.WANIPConnection || {};
      for (const iKey in ipConns) {
        const conn = ipConns[iKey];
        if (conn && conn._object !== false) {
          const vlanVal =
            conn.X_CT_COM_VLAN?._value ||
            conn['X_CT-COM_VLAN']?._value ||
            conn.VLANID?._value ||
            conn.X_HW_VLAN?._value;
          connections.push({
            type: 'WANIPConnection',
            serviceType:
              conn.X_CT_COM_ServiceList?._value ||
              conn['X_CT-COM_ServiceList']?._value ||
              conn.X_CMCC_ServiceList?._value ||
              'INTERNET',
            externalIP: conn.ExternalIPAddress?._value || null,
            gateway: conn.DefaultGateway?._value || null,
            dns: conn.DNSServers?._value || null,
            status: conn.ConnectionStatus?._value || 'Connected',
            vlanId: vlanVal ? parseInt(String(vlanVal), 10) : null,
          });
        }
      }
    }
  }

  return connections;
}

/**
 * 3. Extract Wi-Fi 2.4GHz & 5GHz Configurations & Passwords
 */
export function extractWiFiConfigurations(item: any): Record<string, ExtractedWiFiConfig> {
  const igd = item?.InternetGatewayDevice || {};
  const wlan = igd.LANDevice?.['1']?.WLANConfiguration || {};
  const wifi: Record<string, ExtractedWiFiConfig> = {};

  for (let i = 1; i <= 8; i++) {
    const cfg = wlan[String(i)];
    if (!cfg) continue;

    const ssid = cfg.SSID?._value || null;
    const enabled = cfg.Enable?._value ?? false;
    const password =
      cfg.KeyPassphrase?._value ||
      cfg.PreSharedKey?.['1']?.KeyPassphrase?._value ||
      cfg.PreSharedKey?.['1']?.PreSharedKey?._value ||
      null;
    const security = cfg.BeaconType?._value || 'WPA2-PSK';
    const stations = parseInt(String(cfg.TotalAssociations?._value || '0'), 10);
    const channel = cfg.Channel?._value ? parseInt(String(cfg.Channel._value), 10) : null;

    if (ssid || enabled) {
      wifi[`wlan${i}`] = {
        band: i >= 5 ? '5GHz' : '2.4GHz',
        enabled: Boolean(enabled),
        ssid,
        password,
        security,
        stations: isNaN(stations) ? 0 : stations,
        channel: isNaN(channel as any) ? null : channel,
      };
    }
  }

  return wifi;
}

/**
 * 4. Extract Connected Client Hosts (LAN & WLAN)
 */
export function extractConnectedHosts(item: any): ExtractedConnectedHost[] {
  const igd = item?.InternetGatewayDevice || {};
  const hostsObj = igd.LANDevice?.['1']?.Hosts?.Host || {};
  const clients: ExtractedConnectedHost[] = [];

  for (const k in hostsObj) {
    const host = hostsObj[k];
    if (host && host._object !== false && host.IPAddress?._value) {
      clients.push({
        hostName: host.HostName?._value || 'Wireless Device',
        ipAddress: host.IPAddress._value,
        macAddress: host.MACAddress?._value || 'N/A',
        active: host.Active?._value ?? true,
        interfaceType: host.InterfaceType?._value || undefined,
      });
    }
  }

  return clients;
}

/**
 * Universal Aggregator: Ingests raw device payload and produces unified data structure
 */
export function extractFullDeviceData(item: any) {
  return {
    optical: extractOpticalPower(item),
    wanConnections: extractWANConnections(item),
    wifi: extractWiFiConfigurations(item),
    connectedHosts: extractConnectedHosts(item),
  };
}
