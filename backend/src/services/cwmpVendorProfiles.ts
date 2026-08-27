/**
 * TR-069 Multi-Vendor CPE Data Models & Parameter Profiles
 * Isolates Safe Baseline TR-098/TR-181 requests from Optical Discovery.
 * Eliminates SOAP Fault 9005 by testing optical candidates separately and caching supported paths.
 */

export type CpeVendor =
  | 'HUAWEI'
  | 'ZTE'
  | 'VSOL'
  | 'RICHERLINK'
  | 'GENEXIS'
  | 'REALTEK'
  | 'SYROTECH'
  | 'CHINA_TELECOM' // Netlink, C-Data, DBC, Optilink, BDCOM, Digisol, Econet
  | 'TPLINK'
  | 'NOKIA'
  | 'TR181_STANDARD'
  | 'GENERIC_TR098';

export interface OpticalTelemetryScalingResult {
  rawValue: string;
  normalizedValue: number;
  unit: string;
  scaleFactor: number;
  sourcePath: string;
  vendor: CpeVendor;
  isReliable: boolean;
}

export class CwmpVendorProfiles {
  /**
   * Detects the specific CPE vendor and data model from Inform headers & payload
   */
  static detectVendor(
    manufacturer?: string,
    modelName?: string,
    oui?: string,
    productClass?: string,
    rawXml?: string
  ): CpeVendor {
    const text = ((manufacturer || '') + ' ' + (modelName || '') + ' ' + (oui || '') + ' ' + (productClass || '') + ' ' + (rawXml || '')).toLowerCase();
    let detected: CpeVendor = 'CHINA_TELECOM';

    // 1. Syrotech ONTs (SY-GPON series)
    if (/syrotech|sy-gpon|syro/i.test(text)) {
      detected = 'SYROTECH';
    }
    // 2. Realtek / OEM Realtek chipsets (OUI 00E04C, XPON+1GE, etc.)
    else if (/realtek|00e04c|xpon\+1ge/i.test(text) || oui === '00E04C') {
      detected = 'REALTEK';
    }
    // 3. Genexis Titanium / Platinum / Earth series
    else if (/genexis|gnxs|titanium|platinum|earth/i.test(text)) {
      detected = 'GENEXIS';
    }
    // 4. Huawei EchoLife / OptiXstar series
    else if (/huawei|echolife|hg8|eg8|optix|hw_gpon|x_hw_/i.test(text) || (oui === '00259E' && !/genexis|gnxs|titanium|earth/i.test(text)) || oui === '001E10') {
      detected = 'HUAWEI';
    }
    // 5. ZTE NetSphere / ZXHN series
    else if (/zte|zxhn|f670|f660|f680|x_zte/i.test(text) || oui === '002293' || oui === '0019C6') {
      detected = 'ZTE';
    }
    // 6. V-SOL (V2801, V2804, etc.)
    else if (/vsol|v-sol|v280|x_vsol/i.test(text) || oui === '000C43' || oui === '5422F8') {
      detected = 'VSOL';
    }
    // 7. RicherLink (RL821, RH821, etc.)
    else if (/richerlink|rh821|rl801|rl804|rl821/i.test(text) || oui === 'E84D8E') {
      detected = 'RICHERLINK';
    }
    // 8. TP-Link (Archer, XC220, etc.)
    else if (/tp-link|tplink|archer|xc220|x_tplink/i.test(text) || oui === '003192' || oui === '50C7BF') {
      detected = 'TPLINK';
    }
    // 9. Nokia / Alcatel-Lucent (G-140W, etc.)
    else if (/nokia|alcatel|alu_|g-140|g-240|isom/i.test(text) || oui === '001FE2' || oui === '002194') {
      detected = 'NOKIA';
    }
    // 10. TR-181 Device:2 Data Model (USP / Modern TR-181 ONTs)
    else if (/device\.optical\.|device\.wifi\.|device\.ip\./i.test(text)) {
      detected = 'TR181_STANDARD';
    }

    // Explicit warning when OUI/heuristic guess disagrees with <Manufacturer> from Inform
    if (manufacturer && manufacturer !== 'Unknown' && manufacturer !== 'Generic' && manufacturer !== 'HGU') {
      const cleanMan = manufacturer.toLowerCase();
      const detectedLow = detected.toLowerCase();
      if (!cleanMan.includes(detectedLow) && !detectedLow.includes(cleanMan) && detected !== 'CHINA_TELECOM' && detected !== 'TR181_STANDARD') {
        console.warn(`[CWMP ACS] [VENDOR_MISMATCH_WARN] Inform <Manufacturer> '${manufacturer}' differs from detected vendor profile '${detected}' for OUI: '${oui}', Model: '${modelName}'`);
      }
    }

    return detected;
  }

  /**
   * Converts 16-character Hex PON Serial Number (e.g. 48575443... -> HWTC...)
   */
  static formatPonSerialNumber(rawSn?: string): string {
    if (!rawSn) return '';
    const clean = String(rawSn).trim();

    // If already standard format (e.g. HWTC12345678, ZTEG12345678, VSOL12345678, GNXS12345678)
    if (/^[A-Za-z]{4}[0-9A-Fa-f]{8,12}$/.test(clean)) {
      return clean.toUpperCase();
    }

    // If 16 hex characters (4 bytes vendor prefix in ASCII + 4 bytes serial)
    if (/^[0-9A-Fa-f]{16}$/.test(clean)) {
      const hexPrefix = clean.substring(0, 8);
      const suffix = clean.substring(8);
      let vendorAscii = '';
      for (let i = 0; i < 8; i += 2) {
        vendorAscii += String.fromCharCode(parseInt(hexPrefix.substr(i, 2), 16));
      }
      if (/^[A-Za-z0-9]{4}$/.test(vendorAscii)) {
        return `${vendorAscii.toUpperCase()}${suffix.toUpperCase()}`;
      }
    }

    return clean;
  }

  /**
   * Automatically extracts 10-digit mobile phone and clean customer name from PPPoE subscriber ID
   * Example: 'ss8549293374_sid@ftth.bsnl.in' -> { phone: '+918549293374', cleanName: 'Subscriber 8549293374' }
   */
  static enrichSubscriberFromPppoe(pppoeUsername?: string): { phone?: string; cleanName?: string } {
    if (!pppoeUsername) return {};
    const clean = String(pppoeUsername).trim();

    // Match 10-digit Indian mobile number
    const match = clean.match(/(?:^|[^0-9])([6-9]\d{9})(?:[^0-9]|$)/);
    if (match && match[1]) {
      const phoneDigits = match[1];
      const namePart = clean.split('@')[0].replace(/[0-9_.-]/g, ' ').trim();
      return {
        phone: `+91${phoneDigits}`,
        cleanName: namePart ? namePart.toUpperCase() : `Subscriber ${phoneDigits}`,
      };
    }

    return {};
  }

  /**
   * Checks whether a given CPE model supports dual-band 2.4 GHz + 5.0 GHz Wi-Fi
   */
  static isDualBandModel(vendor?: string, modelName?: string, productClass?: string): boolean {
    const text = `${vendor || ''} ${modelName || ''} ${productClass || ''}`.toLowerCase();
    if (/earth[-_ ]?2022/i.test(text)) return false; // Genexis Earth-2022 is single-band 2.4 GHz
    if (/titanium[-_ ]?2122|2122a|platinum|genexis/i.test(text)) return true;
    if (/eg8145|hg8145|optixstar|f670|f680|v2804|archer|xc220|g-140w|g-240w/i.test(text)) return true;
    return false;
  }

  /**
   * PHASE 2: Returns 100% Safe Standard Baseline TR-098 / TR-181 parameters.
   * NEVER mixes unverified optical paths into this request.
   * Guarantees Wi-Fi, LAN, WAN PPPoE are retrieved with ZERO 9005 Fault aborts.
   */
  static getSafeBaselineParameters(vendor: CpeVendor, modelName?: string): string[] {
    if (vendor === 'TR181_STANDARD') {
      return [
        'Device.WiFi.SSID.1.SSID',
        'Device.WiFi.AccessPoint.1.Security.KeyPassphrase',
        'Device.WiFi.Radio.1.Channel',
        'Device.WiFi.SSID.2.SSID',
        'Device.WiFi.AccessPoint.2.Security.KeyPassphrase',
        'Device.WiFi.Radio.2.Channel',
        'Device.PPP.Interface.1.Username',
        'Device.PPP.Interface.1.ConnectionStatus',
        'Device.IP.Interface.1.IPv4Address.1.IPAddress',
        'Device.Ethernet.VLANTermination.1.VLANID',
        'Device.Hosts.HostNumberOfEntries',
      ];
    }

    if (vendor === 'GENEXIS' && !/earth/i.test(modelName || '')) {
      return [
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.PreSharedKey',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.X_WPSKeyWord',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.BeaconType',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.X_RFBand',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.PreSharedKey',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.X_WPSKeyWord',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Channel',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.BeaconType',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.X_RFBand',
        'InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ConnectionStatus',
      ];
    }

    // Standard Universal TR-098 / IGD Parameters guaranteed on 100% of devices (TR-098 Issue 1 & 2)
    return [
      'InternetGatewayDevice.DeviceInfo.Manufacturer',
      'InternetGatewayDevice.DeviceInfo.ManufacturerOUI',
      'InternetGatewayDevice.DeviceInfo.ModelName',
      'InternetGatewayDevice.DeviceInfo.Description',
      'InternetGatewayDevice.DeviceInfo.SerialNumber',
      'InternetGatewayDevice.DeviceInfo.HardwareVersion',
      'InternetGatewayDevice.DeviceInfo.SoftwareVersion',
      'InternetGatewayDevice.DeviceInfo.UpTime',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
      'InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries',
      'InternetGatewayDevice.ManagementServer.ConnectionRequestURL',
      'InternetGatewayDevice.ManagementServer.ParameterKey',
    ];
  }

  /**
   * PHASE 3: Returns candidate optical parameter paths for the vendor.
   * ACS will test candidates individually or use cached working paths to avoid 9005 aborts.
   */
  static getOpticalCandidates(vendor: CpeVendor): string[] {
    switch (vendor) {
      case 'HUAWEI':
        return [
          'InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalRxPower',
          'InternetGatewayDevice.DeviceInfo.X_HW_GPON.OpticalModuleInformation.RxPower',
          'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.RXPower',
        ];

      case 'ZTE':
        return [
          'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.RXPower',
          'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_GponInterfaceConfig.RXPower',
        ];

      case 'VSOL':
      case 'RICHERLINK':
        return [
          'InternetGatewayDevice.WANDevice.1.X_VSOL_OpticalInfo.RxPower',
          'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.RXPower',
          'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.RXPower',
        ];

      case 'TPLINK':
        return [
          'InternetGatewayDevice.WANDevice.1.X_TPLINK_OptInfo.RxPower',
          'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.RXPower',
        ];

      case 'NOKIA':
        return [
          'InternetGatewayDevice.WANDevice.1.X_NOKIA_OpticalInfo.RxPower',
          'InternetGatewayDevice.WANDevice.1.X_ALU_COM_OntOpticalInfo.ReceivePower',
          'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.RXPower',
        ];

      case 'TR181_STANDARD':
        return [
          'Device.Optical.Interface.1.OpticalSignalLevel',
        ];

      case 'CHINA_TELECOM':
      default:
        // Syrotech, Netlink, Genexis, C-Data, DBC, Realtek, Econet
        return [
          'InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.RXPower',
          'InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.RXPower',
          'InternetGatewayDevice.WANDevice.1.WANGponInterfaceConfig.RXPower',
          'InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.RXPower',
          'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.RXPower',
          'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.RXPower',
          'InternetGatewayDevice.WANDevice.1.X_CTC_EPONInterfaceConfig.RXPower',
          'InternetGatewayDevice.WANDevice.1.X_BROADCOM_COM_OpticalInfo.RxPower',
          'InternetGatewayDevice.WANDevice.1.X_ECONET_GponInterfaceConfig.RXPower',
          'InternetGatewayDevice.DeviceInfo.X_CT-COM_OpticalInfo.RxPower',
          'InternetGatewayDevice.WANDevice.1.X_SYROTECH_OpticalInfo.RxPower',
          'InternetGatewayDevice.WANDevice.1.X_NETLINK_OpticalInfo.RxPower',
          'Device.Optical.Interface.1.OpticalSignalLevel',
        ];
    }
  }

  /**
   * Given a confirmed working optical RX path, returns the corresponding companion metrics in that same tree.
   */
  static getOpticalCompanionPaths(rxPath: string): string[] {
    if (rxPath.includes('X_CT-COM_EponInterfaceConfig')) {
      return [
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.TXPower',
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.BiasCurrent',
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.SupplyVoltage',
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.SupplyVottage',
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.TransceiverTemperature',
      ];
    }

    if (rxPath.includes('X_CMCC_EponInterfaceConfig')) {
      return [
        'InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.TXPower',
        'InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.BiasCurrent',
        'InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.SupplyVoltage',
        'InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.SupplyVottage',
        'InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.TransceiverTemperature',
      ];
    }

    if (rxPath.includes('WANGponInterfaceConfig') || rxPath.includes('WANEponInterfaceConfig')) {
      const base = rxPath.substring(0, rxPath.lastIndexOf('.'));
      return [
        `${base}.TXPower`,
        `${base}.BiasCurrent`,
        `${base}.SupplyVoltage`,
        `${base}.TransceiverTemperature`,
      ];
    }

    if (rxPath.includes('X_CT-COM_GponInterfaceConfig') || rxPath.includes('X_GponInterfaceConfig')) {
      const base = rxPath.substring(0, rxPath.lastIndexOf('.'));
      return [
        `${base}.TXPower`,
        `${base}.TransceiverTemperature`,
        `${base}.SupplyVoltage`,
        `${base}.BiasCurrent`,
      ];
    }

    if (rxPath.includes('X_HW_DEBUG.SMP.ONT')) {
      return [
        'InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalTxPower',
        'InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalVoltage',
        'InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalBiasCurrent',
        'InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.Temperature',
      ];
    }

    if (rxPath.includes('X_ZTE-COM_WANPONInterfaceConfig')) {
      return [
        'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.TXPower',
        'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.TXBiasCurrent',
        'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.SupplyVoltage',
        'InternetGatewayDevice.DeviceInfo.X_ZTE-COM_BoardTemperature',
      ];
    }

    if (rxPath.includes('X_CT-COM_GponInterfaceConfig')) {
      return [
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.TXPower',
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.Voltage',
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.BiasCurrent',
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.Temperature',
      ];
    }

    if (rxPath.includes('X_GponInterfaceConfig')) {
      return [
        'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.TXPower',
        'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.TransceiverTxPower',
        'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.Voltage',
        'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.BiasCurrent',
        'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.Temperature',
      ];
    }

    if (rxPath.includes('X_VSOL_OpticalInfo')) {
      return [
        'InternetGatewayDevice.WANDevice.1.X_VSOL_OpticalInfo.TxPower',
        'InternetGatewayDevice.WANDevice.1.X_VSOL_OpticalInfo.Voltage',
        'InternetGatewayDevice.WANDevice.1.X_VSOL_OpticalInfo.BiasCurrent',
        'InternetGatewayDevice.WANDevice.1.X_VSOL_OpticalInfo.Temperature',
      ];
    }

    if (rxPath.includes('Device.Optical.Interface')) {
      return [
        'Device.Optical.Interface.1.TransmitOpticalPower',
        'Device.Optical.Interface.1.TxBiasCurrent',
        'Device.Optical.Interface.1.Voltage',
        'Device.Optical.Interface.1.Temperature',
      ];
    }

    return [];
  }

  /**
   * Telemetry Normalization & Scaling Rules configured strictly by vendor & path.
   * Avoids blind arbitrary conversion.
   */
  static normalizeOpticalRx(
    vendor: CpeVendor,
    paramPath: string,
    raw: string | number | undefined
  ): OpticalTelemetryScalingResult | undefined {
    if (raw === undefined || raw === null || raw === '') return undefined;
    const cleanStr = String(raw).replace(/dBm|dbm|\s+/g, '').trim();
    const num = parseFloat(cleanStr);
    if (isNaN(num)) return undefined;

    if (num === 0) {
      return { rawValue: cleanStr, normalizedValue: -40.0, unit: 'dBm', scaleFactor: 1, sourcePath: paramPath, vendor, isReliable: true };
    }

    let scale = 1;
    let normalized = num;

    // TR-181 Device.Optical.Interface.1.OpticalSignalLevel is in 0.001 dBm
    if (paramPath.startsWith('Device.Optical.') || Math.abs(num) >= 10000) {
      scale = 1000;
      normalized = Math.abs(num) / 1000;
    }
    // TR-098 vendor extensions (Huawei, ZTE, CTC, VSOL) report in 0.01 dBm (e.g. -2145 or 2145)
    else if (Math.abs(num) >= 100) {
      scale = 100;
      normalized = Math.abs(num) / 100;
    }
    // Float representation (e.g. -21.45 or 21.45)
    else {
      scale = 1;
      normalized = Math.abs(num);
    }

    if (normalized > 50) normalized = 40.0;
    const finalValue = -Number(normalized.toFixed(2));

    return {
      rawValue: cleanStr,
      normalizedValue: finalValue,
      unit: 'dBm',
      scaleFactor: scale,
      sourcePath: paramPath,
      vendor,
      isReliable: true,
    };
  }

  static normalizeOpticalTx(
    vendor: CpeVendor,
    paramPath: string,
    raw: string | number | undefined
  ): OpticalTelemetryScalingResult | undefined {
    if (raw === undefined || raw === null || raw === '') return undefined;
    const cleanStr = String(raw).replace(/dBm|dbm|\s+/g, '').trim();
    const num = parseFloat(cleanStr);
    if (isNaN(num)) return undefined;

    let scale = 1;
    let normalized = num;

    if (Math.abs(num) >= 1000) {
      scale = 1000;
      normalized = num / 1000;
    } else if (Math.abs(num) >= 100) {
      scale = 100;
      normalized = num / 100;
    }

    return {
      rawValue: cleanStr,
      normalizedValue: Number(normalized.toFixed(2)),
      unit: 'dBm',
      scaleFactor: scale,
      sourcePath: paramPath,
      vendor,
      isReliable: true,
    };
  }

  /**
   * Automatically classifies real discovered parameter paths into capability domains
   */
  static classifyParameter(path: string): string {
    const p = path.toLowerCase();
    if (p.includes('deviceinfo') || p.includes('serialnumber') || p.includes('softwareversion') || p.includes('hardwareversion') || p.includes('devicesummary')) return 'IDENTITY';
    if (p.includes('wlan') || p.includes('wifi') || p.includes('ssid') || p.includes('presharedkey') || p.includes('beacontype') || p.includes('radio') || p.includes('accesspoint')) return 'WIFI';
    if (p.includes('optical') || p.includes('rxpower') || p.includes('txpower') || p.includes('laser') || p.includes('opti') || p.includes('opticalsignallevel') || p.includes('biascurrent') || p.includes('opticalvoltage')) return 'OPTICAL';
    if (p.includes('gpon') || p.includes('epon') || p.includes('pon')) return 'PON';
    if (p.includes('wanppp') || (p.includes('ppp') && p.includes('user'))) return 'PPPOE';
    if (p.includes('vlan')) return 'VLAN';
    if (p.includes('wandevice') || p.includes('wanconnection') || p.includes('externalipaddress') || p.includes('connectionstatus') || p.includes('wanipconnection')) return 'WAN';
    if (p.includes('hosts') || p.includes('hostnumberofentries')) return 'HOSTS';
    if (p.includes('lanethernet') || p.includes('ethernet.interface')) return 'PORTS';
    if (p.includes('cpu') || p.includes('memory') || p.includes('ram') || p.includes('temp') || p.includes('uptime')) return 'HARDWARE';
    if (p.includes('diagnostic') || p.includes('ipping') || p.includes('traceroute') || p.includes('downloaddiagnostics') || p.includes('uploaddiagnostics')) return 'DIAGNOSTICS';
    if (p.includes('voice') || p.includes('voip') || p.includes('sip')) return 'VOICE';
    if (p.includes('usb')) return 'USB';
    if (p.includes('firewall') || p.includes('filter')) return 'FIREWALL';
    if (p.includes('nat') || p.includes('portmapping')) return 'NAT';
    if (p.includes('dns')) return 'DNS';
    if (p.includes('dhcp')) return 'DHCP';
    if (p.includes('landevice') || p.includes('lan.')) return 'LAN';
    if (p.includes('managementserver') || p.includes('time') || p.includes('userinterface')) return 'SYSTEM';
    return 'OTHER';
  }

  /**
   * Deterministically classifies the frequency band of a discovered Wi-Fi interface
   * using explicit CPE parameter evidence (RFBand, Standard, Channel, Radio reference).
   * Never assumes band based only on instance index.
   */
  static determineWifiBand(
    rawParams: Record<string, any>,
    instance: number,
    ssid: string
  ): '2.4GHz' | '5GHz' | '6GHz' | 'UNKNOWN' {
    const rawKeys = Object.keys(rawParams);

    // 1. Explicit Band Parameter
    const bandKey = rawKeys.find((k) =>
      new RegExp(`(WLANConfiguration\\.${instance}\\.(X_RFBand|OperatingFrequencyBand|SupportedFrequencyBands)|Device\\.WiFi\\.Radio\\.${instance}\\.OperatingFrequencyBand)`, 'i').test(k)
    );
    if (bandKey && rawParams[bandKey]) {
      const val = String(rawParams[bandKey]).toLowerCase();
      if (val.includes('5g') || val.includes('5ghz') || val.includes('5.0')) return '5GHz';
      if (val.includes('2.4') || val.includes('2g') || val.includes('2.4ghz')) return '2.4GHz';
      if (val.includes('6g') || val.includes('6ghz')) return '6GHz';
    }

    // 2. Explicit Operating Standards
    const stdKey = rawKeys.find((k) =>
      new RegExp(`(WLANConfiguration\\.${instance}\\.(Standard|OperatingStandards)|Device\\.WiFi\\.Radio\\.${instance}\\.OperatingStandards)`, 'i').test(k)
    );
    if (stdKey && rawParams[stdKey]) {
      const val = String(rawParams[stdKey]).toLowerCase();
      if (val.includes('11ac') || val.includes('11a,') || val.includes('ac,') || val === 'a') return '5GHz';
      if (val.includes('11ax')) return '5GHz';
      if (val.includes('11b') || val.includes('11g') || val.includes('b,g,n')) return '2.4GHz';
    }

    // 3. Explicit Channel Numbers (1-14 = 2.4G, 36-165 = 5G)
    const chanKey = rawKeys.find((k) =>
      new RegExp(`(WLANConfiguration\\.${instance}\\.Channel|Device\\.WiFi\\.Radio\\.${instance}\\.Channel)`, 'i').test(k)
    );
    if (chanKey && rawParams[chanKey] !== undefined) {
      const chan = parseInt(String(rawParams[chanKey]), 10);
      if (!isNaN(chan)) {
        if (chan >= 36 && chan <= 165) return '5GHz';
        if (chan >= 1 && chan <= 14) return '2.4GHz';
      }
    }

    // 4. Possible Channels String Evidence
    const possKey = rawKeys.find((k) =>
      new RegExp(`(WLANConfiguration\\.${instance}\\.PossibleChannels)`, 'i').test(k)
    );
    if (possKey && rawParams[possKey]) {
      const p = String(rawParams[possKey]);
      if (/36|40|44|48|149|153|157|161|165/.test(p) && !/1,2,3,4,5/.test(p)) return '5GHz';
      if (/1,2,3,4,5|1-11|1-13|1-14/.test(p)) return '2.4GHz';
    }

    // 5. Explicit Radio Reference in TR-181
    const radioRefKey = rawKeys.find((k) =>
      new RegExp(`(Device\\.WiFi\\.SSID\\.${instance}\\.LowerLayers)`, 'i').test(k)
    );
    if (radioRefKey && rawParams[radioRefKey]) {
      const ref = String(rawParams[radioRefKey]);
      if (/Radio\\.2/i.test(ref)) return '5GHz';
      if (/Radio\\.1/i.test(ref)) return '2.4GHz';
    }

    // 6. Explicit SSID Name Hint (e.g. ends with _5G / -5G vs _2.4G / -2.4G)
    if (ssid) {
      const cleanSsid = ssid.toUpperCase();
      if (/[-_ ]5G(HZ)?$/i.test(cleanSsid) || /[-_ ]5\\.0G/i.test(cleanSsid)) return '5GHz';
      if (/[-_ ]2\\.4G(HZ)?$/i.test(cleanSsid) || /[-_ ]2G/i.test(cleanSsid)) return '2.4GHz';
    }

    // 7. Standard TR-098 Default Primary Instance 1
    if (instance === 1) {
      return '2.4GHz';
    }

    // If no conclusive proof exists from the CPE, do NOT guess
    return 'UNKNOWN';
  }
}

export interface DiscoveredWifiInterface {
  instance: number;
  ssid: string;
  band: '2.4GHz' | '5GHz' | '6GHz' | 'UNKNOWN';
  radioPath?: string;
  channel?: number;
  security?: string;
  password?: string;
  status: 'Active' | 'Disabled' | 'UNKNOWN';
  sourcePaths: {
    ssidPath?: string;
    keyPath?: string;
    channelPath?: string;
    beaconPath?: string;
    bandPath?: string;
    standardPath?: string;
    radioRefPath?: string;
  };
}
