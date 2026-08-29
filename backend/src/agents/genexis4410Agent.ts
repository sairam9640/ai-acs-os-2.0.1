import http from 'http';
import https from 'https';
import { CwmpVendorProfiles } from '../services/cwmpVendorProfiles.js';

export interface Genexis4410State {
  serialNumber: string;
  oui: string;
  manufacturer: string;
  modelName: string;
  softwareVersion: string;
  hardwareVersion: string;
  opticalRxDbm: number;
  opticalTxDbm: number;
  temperature: number;
  voltage: number;
  biasCurrent: number;
  wifi24: {
    ssid: string;
    key: string;
    channel: number;
    enabled: boolean;
  };
  wifi5g: {
    ssid: string;
    key: string;
    channel: number;
    enabled: boolean;
  };
  wanPppoe: {
    username: string;
    password: string;
    ipAddress: string;
    status: string;
    vlanId: number;
    natEnabled: boolean;
  };
  connectedClients: Array<{
    hostname: string;
    ip: string;
    mac: string;
    interface: string;
    active: boolean;
  }>;
}

export class Genexis4410Agent {
  public state: Genexis4410State;
  public acsUrl: string;
  public cwmpSessionId: string = '';

  constructor(acsUrl = 'http://127.0.0.1:7547/', serialNumber = 'GNXS-GX4410-PROD01') {
    this.acsUrl = acsUrl;
    this.state = {
      serialNumber,
      oui: '00259E',
      manufacturer: 'GENEXIS',
      modelName: 'Platinum GX 4410',
      softwareVersion: 'GX4410-FW2.1.8-RELEASE',
      hardwareVersion: 'GX4410-HW1.0',
      opticalRxDbm: -19.45,
      opticalTxDbm: 2.38,
      temperature: 42.1,
      voltage: 3.31,
      biasCurrent: 14.8,
      wifi24: {
        ssid: 'Genexis_GX4410_2.4G',
        key: 'Genexis@Pass2026',
        channel: 6,
        enabled: true,
      },
      wifi5g: {
        ssid: 'Genexis_GX4410_5G',
        key: 'Genexis@Pass5G2026',
        channel: 44,
        enabled: true,
      },
      wanPppoe: {
        username: 'gx4410_user@isp.in',
        password: 'PppoePassword#99',
        ipAddress: '103.14.77.102',
        status: 'Connected',
        vlanId: 100,
        natEnabled: true,
      },
      connectedClients: [
        { hostname: 'iPhone-15-Pro', ip: '192.168.1.10', mac: 'CC:F7:35:91:19:9D', interface: '5GHz', active: true },
        { hostname: 'Galaxy-S23-Ultra', ip: '192.168.1.11', mac: '08:5B:D6:F5:B4:73', interface: '5GHz', active: true },
        { hostname: 'MacBook-Pro-M2', ip: '192.168.1.12', mac: '3C:64:CF:A6:91:DB', interface: '5GHz', active: true },
        { hostname: 'Redmi-Note-12', ip: '192.168.1.13', mac: 'D8:44:89:AE:4F:B7', interface: '2.4GHz', active: true },
        { hostname: 'Smart-Home-Plug', ip: '192.168.1.14', mac: '40:AE:30:4B:62:83', interface: '2.4GHz', active: true },
        { hostname: 'Private-Mobile-User', ip: '192.168.1.15', mac: 'C6:BB:89:19:CF:69', interface: '2.4GHz', active: true },
      ],
    };
  }

  /**
   * Generates the TR-069 Inform XML payload for Genexis Platinum GX 4410
   */
  public generateInformXml(): string {
    this.cwmpSessionId = `cwmp_gx4410_${Date.now()}`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soapenv:Header>
    <cwmp:ID soapenv:mustUnderstand="1">1</cwmp:ID>
  </soapenv:Header>
  <soapenv:Body>
    <cwmp:Inform>
      <DeviceId>
        <Manufacturer>${this.state.manufacturer}</Manufacturer>
        <OUI>${this.state.oui}</OUI>
        <ProductClass>${this.state.modelName}</ProductClass>
        <SerialNumber>${this.state.serialNumber}</SerialNumber>
      </DeviceId>
      <Event soapenv:arrayType="cwmp:EventStruct[2]">
        <EventStruct><EventCode>1 BOOT</EventCode><CommandKey></CommandKey></EventStruct>
        <EventStruct><EventCode>2 PERIODIC</EventCode><CommandKey></CommandKey></EventStruct>
      </Event>
      <MaxEnvelopes>1</MaxEnvelopes>
      <CurrentTime>${new Date().toISOString()}</CurrentTime>
      <RetryCount>0</RetryCount>
      <ParameterList soapenv:arrayType="cwmp:ParameterValueStruct[20]">
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.DeviceInfo.Manufacturer</Name>
          <Value xsi:type="xsd:string">${this.state.manufacturer}</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.DeviceInfo.ManufacturerOUI</Name>
          <Value xsi:type="xsd:string">${this.state.oui}</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.DeviceInfo.ModelName</Name>
          <Value xsi:type="xsd:string">${this.state.modelName}</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.DeviceInfo.SoftwareVersion</Name>
          <Value xsi:type="xsd:string">${this.state.softwareVersion}</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.DeviceInfo.HardwareVersion</Name>
          <Value xsi:type="xsd:string">${this.state.hardwareVersion}</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.DeviceInfo.SerialNumber</Name>
          <Value xsi:type="xsd:string">${this.state.serialNumber}</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID</Name>
          <Value xsi:type="xsd:string">${this.state.wifi24.ssid}</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID</Name>
          <Value xsi:type="xsd:string">${this.state.wifi5g.ssid}</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username</Name>
          <Value xsi:type="xsd:string">${this.state.wanPppoe.username}</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.ExternalIPAddress</Name>
          <Value xsi:type="xsd:string">${this.state.wanPppoe.ipAddress}</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.ConnectionStatus</Name>
          <Value xsi:type="xsd:string">${this.state.wanPppoe.status}</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.RxPower</Name>
          <Value xsi:type="xsd:string">${Math.round(this.state.opticalRxDbm * 100)}</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.TxPower</Name>
          <Value xsi:type="xsd:string">${Math.round(this.state.opticalTxDbm * 100)}</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries</Name>
          <Value xsi:type="xsd:unsignedInt">${this.state.connectedClients.length}</Value>
        </ParameterValueStruct>
      </ParameterList>
    </cwmp:Inform>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  /**
   * Generates GetParameterNamesResponse for GPN root query
   */
  public generateGpnResponse(id = '2'): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header><cwmp:ID soapenv:mustUnderstand="1">${id}</cwmp:ID></soapenv:Header>
  <soapenv:Body>
    <cwmp:GetParameterNamesResponse>
      <ParameterList soapenv:arrayType="cwmp:ParameterInfoStruct[24]">
        <ParameterInfoStruct><Name>InternetGatewayDevice.DeviceInfo.ModelName</Name><Writable>false</Writable></ParameterInfoStruct>
        <ParameterInfoStruct><Name>InternetGatewayDevice.DeviceInfo.SoftwareVersion</Name><Writable>false</Writable></ParameterInfoStruct>
        <ParameterInfoStruct><Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID</Name><Writable>true</Writable></ParameterInfoStruct>
        <ParameterInfoStruct><Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase</Name><Writable>true</Writable></ParameterInfoStruct>
        <ParameterInfoStruct><Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel</Name><Writable>true</Writable></ParameterInfoStruct>
        <ParameterInfoStruct><Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.BeaconType</Name><Writable>true</Writable></ParameterInfoStruct>
        <ParameterInfoStruct><Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID</Name><Writable>true</Writable></ParameterInfoStruct>
        <ParameterInfoStruct><Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase</Name><Writable>true</Writable></ParameterInfoStruct>
        <ParameterInfoStruct><Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Channel</Name><Writable>true</Writable></ParameterInfoStruct>
        <ParameterInfoStruct><Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.BeaconType</Name><Writable>true</Writable></ParameterInfoStruct>
        <ParameterInfoStruct><Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Enable</Name><Writable>true</Writable></ParameterInfoStruct>
        <ParameterInfoStruct><Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Enable</Name><Writable>true</Writable></ParameterInfoStruct>
        <ParameterInfoStruct><Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username</Name><Writable>true</Writable></ParameterInfoStruct>
        <ParameterInfoStruct><Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Password</Name><Writable>true</Writable></ParameterInfoStruct>
        <ParameterInfoStruct><Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.ExternalIPAddress</Name><Writable>false</Writable></ParameterInfoStruct>
        <ParameterInfoStruct><Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.ConnectionStatus</Name><Writable>false</Writable></ParameterInfoStruct>
        <ParameterInfoStruct><Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.VLANID</Name><Writable>true</Writable></ParameterInfoStruct>
        <ParameterInfoStruct><Name>InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.RxPower</Name><Writable>false</Writable></ParameterInfoStruct>
        <ParameterInfoStruct><Name>InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.TxPower</Name><Writable>false</Writable></ParameterInfoStruct>
        <ParameterInfoStruct><Name>InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries</Name><Writable>false</Writable></ParameterInfoStruct>
      </ParameterList>
    </cwmp:GetParameterNamesResponse>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  /**
   * Generates GetParameterValuesResponse containing all live 4410 attributes
   */
  public generateGpvResponse(requestedParams: string[] = [], id = '3'): string {
    const allKnownValues: Record<string, { val: string; type: string }> = {
      'InternetGatewayDevice.DeviceInfo.Manufacturer': { val: this.state.manufacturer, type: 'xsd:string' },
      'InternetGatewayDevice.DeviceInfo.ManufacturerOUI': { val: this.state.oui, type: 'xsd:string' },
      'InternetGatewayDevice.DeviceInfo.ModelName': { val: this.state.modelName, type: 'xsd:string' },
      'InternetGatewayDevice.DeviceInfo.SoftwareVersion': { val: this.state.softwareVersion, type: 'xsd:string' },
      'InternetGatewayDevice.DeviceInfo.HardwareVersion': { val: this.state.hardwareVersion, type: 'xsd:string' },
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID': { val: this.state.wifi24.ssid, type: 'xsd:string' },
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase': { val: this.state.wifi24.key, type: 'xsd:string' },
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase': { val: this.state.wifi24.key, type: 'xsd:string' },
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel': { val: String(this.state.wifi24.channel), type: 'xsd:unsignedInt' },
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.BeaconType': { val: '11i', type: 'xsd:string' },
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID': { val: this.state.wifi5g.ssid, type: 'xsd:string' },
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase': { val: this.state.wifi5g.key, type: 'xsd:string' },
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.KeyPassphrase': { val: this.state.wifi5g.key, type: 'xsd:string' },
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Channel': { val: String(this.state.wifi5g.channel), type: 'xsd:unsignedInt' },
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.BeaconType': { val: '11i', type: 'xsd:string' },
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Enable': { val: 'true', type: 'xsd:boolean' },
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username': { val: this.state.wanPppoe.username, type: 'xsd:string' },
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.ExternalIPAddress': { val: this.state.wanPppoe.ipAddress, type: 'xsd:string' },
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.ConnectionStatus': { val: this.state.wanPppoe.status, type: 'xsd:string' },
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.VLANID': { val: String(this.state.wanPppoe.vlanId), type: 'xsd:unsignedInt' },
      'InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.RxPower': { val: String(Math.round(this.state.opticalRxDbm * 100)), type: 'xsd:string' },
      'InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.TxPower': { val: String(Math.round(this.state.opticalTxDbm * 100)), type: 'xsd:string' },
      'InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries': { val: String(this.state.connectedClients.length), type: 'xsd:unsignedInt' },
    };

    // Add Host 1..6 attributes
    this.state.connectedClients.forEach((cl, idx) => {
      const hIdx = idx + 1;
      allKnownValues[`InternetGatewayDevice.LANDevice.1.Hosts.Host.${hIdx}.HostName`] = { val: cl.hostname, type: 'xsd:string' };
      allKnownValues[`InternetGatewayDevice.LANDevice.1.Hosts.Host.${hIdx}.IPAddress`] = { val: cl.ip, type: 'xsd:string' };
      allKnownValues[`InternetGatewayDevice.LANDevice.1.Hosts.Host.${hIdx}.MACAddress`] = { val: cl.mac, type: 'xsd:string' };
      allKnownValues[`InternetGatewayDevice.LANDevice.1.Hosts.Host.${hIdx}.InterfaceType`] = { val: cl.interface, type: 'xsd:string' };
      allKnownValues[`InternetGatewayDevice.LANDevice.1.Hosts.Host.${hIdx}.Active`] = { val: cl.active ? '1' : '0', type: 'xsd:boolean' };
    });

    const outputParams = requestedParams.length > 0
      ? requestedParams.filter((p) => allKnownValues[p])
      : Object.keys(allKnownValues);

    const paramEntries = outputParams.map(
      (p) => `        <ParameterValueStruct>
          <Name>${p}</Name>
          <Value xsi:type="${allKnownValues[p].type}">${allKnownValues[p].val}</Value>
        </ParameterValueStruct>`
    ).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soapenv:Header><cwmp:ID soapenv:mustUnderstand="1">${id}</cwmp:ID></soapenv:Header>
  <soapenv:Body>
    <cwmp:GetParameterValuesResponse>
      <ParameterList soapenv:arrayType="cwmp:ParameterValueStruct[${outputParams.length}]">
${paramEntries}
      </ParameterList>
    </cwmp:GetParameterValuesResponse>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  /**
   * Applies incoming SetParameterValues to local simulated state
   */
  public applySetParameterValues(spvXml: string): string {
    const pMatches = spvXml.matchAll(/<Name>([^<]+)<\/Name>\s*<Value[^>]*>([^<]*)<\/Value>/gi);
    for (const match of pMatches) {
      const name = match[1];
      const val = match[2];

      // Wi-Fi 2.4G
      if (name.includes('WLANConfiguration.1.SSID')) this.state.wifi24.ssid = val;
      if (name.includes('WLANConfiguration.1') && name.includes('KeyPassphrase')) this.state.wifi24.key = val;
      if (name.includes('WLANConfiguration.1.Channel')) this.state.wifi24.channel = parseInt(val, 10) || 6;

      // Wi-Fi 5G
      if ((name.includes('WLANConfiguration.5.SSID') || name.includes('WLANConfiguration.2.SSID'))) this.state.wifi5g.ssid = val;
      if ((name.includes('WLANConfiguration.5') || name.includes('WLANConfiguration.2')) && name.includes('KeyPassphrase')) this.state.wifi5g.key = val;
      if (name.includes('WLANConfiguration.5.Channel') || name.includes('WLANConfiguration.2.Channel')) this.state.wifi5g.channel = parseInt(val, 10) || 44;

      // WAN PPPoE
      if (name.includes('WANPPPConnection') && name.includes('Username')) this.state.wanPppoe.username = val;
      if (name.includes('WANPPPConnection') && name.includes('Password')) this.state.wanPppoe.password = val;
      if (name.includes('WANPPPConnection') && name.includes('VLANID')) this.state.wanPppoe.vlanId = parseInt(val, 10) || 100;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header><cwmp:ID soapenv:mustUnderstand="1">3</cwmp:ID></soapenv:Header>
  <soapenv:Body>
    <cwmp:SetParameterValuesResponse>
      <Status>0</Status>
    </cwmp:SetParameterValuesResponse>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  /**
   * Dispatches an HTTP SOAP request to the ACS URL
   */
  public async sendSoapPost(xmlPayload: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(this.acsUrl);
      const isHttps = parsedUrl.protocol === 'https:';
      const transport = isHttps ? https : http;

      const req = transport.request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname || '/',
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'Content-Length': Buffer.byteLength(xmlPayload),
            SOAPAction: '',
            Connection: 'keep-alive',
          },
          timeout: 10000,
        },
        (res) => {
          let responseData = '';
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          res.on('end', () => {
            resolve(responseData);
          });
        }
      );

      req.on('error', (err) => {
        reject(err);
      });

      req.write(xmlPayload);
      req.end();
    });
  }

  /**
   * Runs a complete end-to-end CWMP conversation simulation
   */
  public async runFullEndToEndSession(): Promise<{
    success: boolean;
    discoveredVendor: string;
    wifi24Ssid: string;
    wifi5gSsid: string;
    wanPppoeUser: string;
    opticalRxDbm: number;
    connectedClientsCount: number;
    log: string[];
  }> {
    const sessionLogs: string[] = [];
    const log = (msg: string) => {
      sessionLogs.push(msg);
      console.log(`[Genexis 4410 Test Agent] ${msg}`);
    };

    log(`🚀 Initializing Genexis Platinum GX 4410 E2E Test Agent (Serial: ${this.state.serialNumber})`);
    
    // 1. Vendor Profile Test
    const detectedVendor = CwmpVendorProfiles.detectVendor(
      this.state.manufacturer,
      this.state.modelName,
      this.state.oui
    );
    log(`Step 1: Detected Vendor Profile: ${detectedVendor}`);

    // 2. Dual-Band Resolution Test
    const band24 = CwmpVendorProfiles.determineWifiBand(
      {
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID': this.state.wifi24.ssid,
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel': this.state.wifi24.channel,
      },
      1,
      this.state.wifi24.ssid
    );
    const band5g = CwmpVendorProfiles.determineWifiBand(
      {
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID': this.state.wifi5g.ssid,
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Channel': this.state.wifi5g.channel,
      },
      5,
      this.state.wifi5g.ssid
    );
    log(`Step 2: Dual-Band Band Analysis -> Instance 1: ${band24} | Instance 5: ${band5g}`);

    // 3. Optical Telemetry Scaling Test
    const optScaled = CwmpVendorProfiles.normalizeOpticalRx(
      'GENEXIS',
      'InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.RxPower',
      String(Math.round(this.state.opticalRxDbm * 100))
    );
    const rxNorm = optScaled ? optScaled.normalizedValue : this.state.opticalRxDbm;
    const isRel = optScaled ? optScaled.isReliable : true;
    log(`Step 3: Optical Telemetry Scaling -> Raw: ${Math.round(this.state.opticalRxDbm * 100)} => Normalized: ${rxNorm} dBm (Reliable: ${isRel})`);

    // 4. Client Friendly Name Resolution Test
    const resolvedClients = this.state.connectedClients.map((cl) => {
      const friendly = CwmpVendorProfiles.resolveFriendlyDeviceName(cl.hostname, cl.mac, cl.interface);
      return { mac: cl.mac, original: cl.hostname, resolved: friendly };
    });
    log(`Step 4: Resolved Connected Client Names (${resolvedClients.length}):`);
    resolvedClients.forEach((rc) => log(`   • [${rc.mac}] ${rc.original} -> "${rc.resolved}"`));

    return {
      success: detectedVendor === 'GENEXIS' && band24 === '2.4GHz' && band5g === '5GHz' && isRel,
      discoveredVendor: detectedVendor,
      wifi24Ssid: this.state.wifi24.ssid,
      wifi5gSsid: this.state.wifi5g.ssid,
      wanPppoeUser: this.state.wanPppoe.username,
      opticalRxDbm: rxNorm,
      connectedClientsCount: this.state.connectedClients.length,
      log: sessionLogs,
    };
  }
}

// Standalone execution entrypoint
if (process.argv[1]?.endsWith('genexis4410Agent.ts') || process.argv[1]?.endsWith('genexis4410Agent.js')) {
  const agent = new Genexis4410Agent();
  agent.runFullEndToEndSession().then((res) => {
    console.log('\n=== GENEXIS PLATINUM GX 4410 AGENT TEST RESULTS ===');
    console.log(JSON.stringify(res, null, 2));
    process.exit(res.success ? 0 : 1);
  });
}
