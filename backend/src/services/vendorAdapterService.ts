export interface NormalizedParameterMap {
  wifi24Ssid: string;
  wifi24Password: string;
  wifi24Channel: string;
  wifi5gSsid: string;
  wifi5gPassword: string;
  wifi5gChannel: string;
  opticalRxPower: string;
  opticalTxPower: string;
  pppoeUsername: string;
  pppoePassword: string;
  vlanId: string;
  rebootRpc: string;
}

export class VendorAdapterService {
  private static vendorMaps: Record<string, NormalizedParameterMap> = {
    huawei: {
      wifi24Ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
      wifi24Password: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase',
      wifi24Channel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel',
      wifi5gSsid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID',
      wifi5gPassword: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase',
      wifi5gChannel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Channel',
      opticalRxPower: 'InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalRxPower',
      opticalTxPower: 'InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalTxPower',
      pppoeUsername: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
      pppoePassword: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password',
      vlanId: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.X_HW_VLAN',
      rebootRpc: 'Reboot',
    },
    zte: {
      wifi24Ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
      wifi24Password: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase',
      wifi24Channel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel',
      wifi5gSsid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID',
      wifi5gPassword: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.PreSharedKey.1.KeyPassphrase',
      wifi5gChannel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Channel',
      opticalRxPower: 'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.RXPower',
      opticalTxPower: 'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.TXPower',
      pppoeUsername: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
      pppoePassword: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password',
      vlanId: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.VLANID',
      rebootRpc: 'Reboot',
    },
    nokia: {
      wifi24Ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
      wifi24Password: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase',
      wifi24Channel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel',
      wifi5gSsid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID',
      wifi5gPassword: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.KeyPassphrase',
      wifi5gChannel: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Channel',
      opticalRxPower: 'InternetGatewayDevice.WANDevice.1.X_NOKIA_OpticalInfo.RxPower',
      opticalTxPower: 'InternetGatewayDevice.WANDevice.1.X_NOKIA_OpticalInfo.TxPower',
      pppoeUsername: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
      pppoePassword: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password',
      vlanId: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.VLANID',
      rebootRpc: 'Reboot',
    },
  };

  /**
   * Resolves the vendor parameter map for a device
   */
  static getParameterMap(manufacturer: string): NormalizedParameterMap {
    const key = (manufacturer || 'huawei').toLowerCase().trim();
    if (key.includes('zte')) return this.vendorMaps.zte;
    if (key.includes('nokia') || key.includes('alcatel')) return this.vendorMaps.nokia;
    return this.vendorMaps.huawei;
  }

  /**
   * Transforms normalized Wi-Fi parameter object into vendor-specific CWMP parameter array
   */
  static buildWifiSetParameters(manufacturer: string, wifiConfig: { wifi24?: any; wifi5g?: any }) {
    const map = this.getParameterMap(manufacturer);
    const params: Array<{ name: string; value: string | number | boolean; type: string }> = [];

    if (wifiConfig.wifi24?.ssid) {
      params.push({ name: map.wifi24Ssid, value: wifiConfig.wifi24.ssid, type: 'xsd:string' });
    }
    if (wifiConfig.wifi24?.password) {
      params.push({ name: map.wifi24Password, value: wifiConfig.wifi24.password, type: 'xsd:string' });
    }
    if (wifiConfig.wifi24?.channel) {
      params.push({ name: map.wifi24Channel, value: wifiConfig.wifi24.channel, type: 'xsd:unsignedInt' });
    }

    if (wifiConfig.wifi5g?.ssid) {
      params.push({ name: map.wifi5gSsid, value: wifiConfig.wifi5g.ssid, type: 'xsd:string' });
    }
    if (wifiConfig.wifi5g?.password) {
      params.push({ name: map.wifi5gPassword, value: wifiConfig.wifi5g.password, type: 'xsd:string' });
    }
    if (wifiConfig.wifi5g?.channel) {
      params.push({ name: map.wifi5gChannel, value: wifiConfig.wifi5g.channel, type: 'xsd:unsignedInt' });
    }

    return params;
  }

  /**
   * Transforms normalized WAN parameters into vendor-specific CWMP parameter array
   */
  static buildWanSetParameters(manufacturer: string, wanConfig: { pppoeUsername?: string; pppoePassword?: string; vlanId?: number }) {
    const map = this.getParameterMap(manufacturer);
    const params: Array<{ name: string; value: string | number | boolean; type: string }> = [];

    if (wanConfig.pppoeUsername) {
      params.push({ name: map.pppoeUsername, value: wanConfig.pppoeUsername, type: 'xsd:string' });
    }
    if (wanConfig.pppoePassword) {
      params.push({ name: map.pppoePassword, value: wanConfig.pppoePassword, type: 'xsd:string' });
    }
    if (wanConfig.vlanId) {
      params.push({ name: map.vlanId, value: wanConfig.vlanId, type: 'xsd:unsignedInt' });
    }

    return params;
  }
}
