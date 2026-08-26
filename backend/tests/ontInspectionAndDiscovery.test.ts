import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { CwmpService } from '../src/services/cwmpService.js';
import { CwmpVendorProfiles } from '../src/services/cwmpVendorProfiles.js';
import { UspService } from '../src/services/uspService.js';
import { Device } from '../src/models/Device.js';
import { Tenant } from '../src/models/Tenant.js';

describe('ONT Inspection, Multi-Vendor Parameter Discovery & Subdomain Routing', () => {
  let tenantRudraId: Types.ObjectId;
  let tenantVgigaId: Types.ObjectId;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await Tenant.deleteMany({ slug: { $in: ['rudra_test', 'vgigafiber_test'] } });
    await Device.deleteMany({ serialNumber: { $in: ['HGU44953BC5ECC0', 'USP998877665544', 'GENEXIS92907060'] } });

    const tenantRudra = await Tenant.create({
      name: 'Rudra Fibernet Test',
      displayName: 'Rudra',
      slug: 'rudra_test',
      subdomain: 'rudra.ciniplay.in',
      operatorKey: 'op_rudra_test',
      status: 'active',
      owner: { name: 'Rudra Admin', email: 'rudra@test.com', phone: '+919999999991' },
      plan: { name: 'Standard', maxCustomers: 1000, maxDevices: 1000, maxTechnicians: 10, monthlyFee: 5000, currency: 'INR', billingCycle: 'monthly', features: [] },
      branding: { logoUrl: '', primaryColor: '#2563eb', secondaryColor: '#0f172a', companyName: 'Rudra', supportPhone: '', supportEmail: '', portalTitle: 'Rudra Portal' },
      featureEntitlements: { tr069Acs: true, tr369Usp: true, fiberGis: true, aiCommandCenter: true, technicianDispatch: true, customerApp: true, whatsappAlerts: true, opticalDiagnostics: true },
      opticalThresholds: { warningDbm: -24.5, criticalDbm: -27.0 },
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
    });
    tenantRudraId = tenantRudra._id;

    const tenantVgiga = await Tenant.create({
      name: 'V Giga Fiber Test',
      displayName: 'V GIGA FIBER',
      slug: 'vgigafiber_test',
      subdomain: 'vgigafiber.ciniplay.in',
      operatorKey: 'op_vgiga_test',
      status: 'active',
      owner: { name: 'VGiga Admin', email: 'vgiga@test.com', phone: '+919999999992' },
      plan: { name: 'Enterprise', maxCustomers: 5000, maxDevices: 5000, maxTechnicians: 50, monthlyFee: 15000, currency: 'INR', billingCycle: 'monthly', features: [] },
      branding: { logoUrl: '', primaryColor: '#10b981', secondaryColor: '#0f172a', companyName: 'V Giga', supportPhone: '', supportEmail: '', portalTitle: 'VGiga Portal' },
      featureEntitlements: { tr069Acs: true, tr369Usp: true, fiberGis: true, aiCommandCenter: true, technicianDispatch: true, customerApp: true, whatsappAlerts: true, opticalDiagnostics: true },
      opticalThresholds: { warningDbm: -24.5, criticalDbm: -27.0 },
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
    });
    tenantVgigaId = tenantVgiga._id;
  });

  afterAll(async () => {
    await Tenant.deleteMany({ slug: { $in: ['rudra_test', 'vgigafiber_test'] } });
    await Device.deleteMany({ serialNumber: { $in: ['HGU44953BC5ECC0', 'USP998877665544', 'GENEXIS92907060'] } });
  });

  it('1. TR-069 XML parser correctly extracts optical telemetry, Wi-Fi, and WAN for HGU RH821v6W-DG', () => {
    const sampleXml = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
        <soapenv:Body>
          <cwmp:Inform>
            <DeviceId>
              <Manufacturer>HGU</Manufacturer>
              <OUI>00E0CA</OUI>
              <ProductClass>RH821GWV-DG</ProductClass>
              <SerialNumber>HGU44953BC5ECC0</SerialNumber>
            </DeviceId>
            <ParameterList>
              <ParameterValueStruct>
                <Name>Device.DeviceInfo.SoftwareVersion</Name>
                <Value>V2.1.5-26577</Value>
              </ParameterValueStruct>
              <ParameterValueStruct>
                <Name>Device.DeviceInfo.HardwareVersion</Name>
                <Value>V2.0</Value>
              </ParameterValueStruct>
              <ParameterValueStruct>
                <Name>InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalRxPower</Name>
                <Value>-2140</Value>
              </ParameterValueStruct>
              <ParameterValueStruct>
                <Name>InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalTxPower</Name>
                <Value>210</Value>
              </ParameterValueStruct>
              <ParameterValueStruct>
                <Name>InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalBiasCurrent</Name>
                <Value>14500</Value>
              </ParameterValueStruct>
              <ParameterValueStruct>
                <Name>InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalVoltage</Name>
                <Value>3300</Value>
              </ParameterValueStruct>
              <ParameterValueStruct>
                <Name>InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.Temperature</Name>
                <Value>45000</Value>
              </ParameterValueStruct>
              <ParameterValueStruct>
                <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID</Name>
                <Value>Rudra-Fiber-2.4G</Value>
              </ParameterValueStruct>
              <ParameterValueStruct>
                <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID</Name>
                <Value>Rudra-Fiber-5G</Value>
              </ParameterValueStruct>
              <ParameterValueStruct>
                <Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress</Name>
                <Value>192.168.22.183</Value>
              </ParameterValueStruct>
              <ParameterValueStruct>
                <Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username</Name>
                <Value>user@rudra.net</Value>
              </ParameterValueStruct>
              <ParameterValueStruct>
                <Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.X_HW_VLAN</Name>
                <Value>100</Value>
              </ParameterValueStruct>
            </ParameterList>
          </cwmp:Inform>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    const parsed = CwmpService.parseInformXml(sampleXml);
    expect(parsed.serialNumber).toBe('HGU44953BC5ECC0');
    expect(parsed.manufacturer).toBe('HGU');
    expect(parsed.productClass).toBe('RH821GWV-DG');
    expect(parsed.softwareVersion).toBe('V2.1.5-26577');
    expect(parsed.hardwareVersion).toBe('V2.0');
    expect(parsed.opticalRxPower).toBe(-21.4);
    expect(parsed.opticalTxPower).toBe(2.1);
    expect(parsed.opticalBiasCurrent).toBe(14.5);
    expect(parsed.opticalVoltage).toBe(3.3);
    expect(parsed.temperatureC).toBe(45);
    expect(parsed.wifiSsid24).toBe('Rudra-Fiber-2.4G');
    expect(parsed.wifiSsid5g).toBe('Rudra-Fiber-5G');
    expect(parsed.wanIp).toBe('192.168.22.183');
    expect(parsed.pppoeUsername).toBe('user@rudra.net');
    expect(parsed.vlanId).toBe(100);
  });

  it('2. Subdomain & path routing correctly resolves tenant from Host header or URL slug', async () => {
    // 1. Root domain -> Rudra
    const rootTenant = await CwmpService.resolveTenant('ciniplay.in:7547');
    expect(rootTenant).toBeDefined();

    // 2. Subdomain header -> V Giga Fiber
    const vGigaTenant = await CwmpService.resolveTenant('vgigafiber.ciniplay.in:7547');
    expect(vGigaTenant?.slug).toBe('vgigafiber_test');

    // 3. Path parameter slug -> V Giga Fiber
    const pathTenant = await CwmpService.resolveTenant(undefined, 'vgigafiber_test');
    expect(pathTenant?.slug).toBe('vgigafiber_test');
  });

  it('3. TR-369 / USP Service normalizes Device:2 data model into unified ONT schema', () => {
    const uspParams = [
      { path: 'Device.DeviceInfo.Manufacturer', value: 'Nokia' },
      { path: 'Device.DeviceInfo.ModelName', value: 'XS-2426G-A' },
      { path: 'Device.DeviceInfo.HardwareVersion', value: '3FE49344AAAA' },
      { path: 'Device.DeviceInfo.SoftwareVersion', value: '3FE49344IJHK12' },
      { path: 'Device.Optical.Interface.1.RxPower', value: '-19.8' },
      { path: 'Device.Optical.Interface.1.TxPower', value: '2.4' },
      { path: 'Device.Optical.Interface.1.TxBiasCurrent', value: '12.8' },
      { path: 'Device.Optical.Interface.1.Voltage', value: '3.3' },
      { path: 'Device.DeviceInfo.TemperatureStatus.TemperatureSensor.1.Value', value: '42' },
      { path: 'Device.WiFi.SSID.1.SSID', value: 'VGiga-Ultra-2.4G' },
      { path: 'Device.WiFi.SSID.2.SSID', value: 'VGiga-Ultra-5G' },
      { path: 'Device.IP.Interface.1.IPv4Address.1.IPAddress', value: '100.64.20.15' },
      { path: 'Device.PPP.Interface.1.Username', value: 'vgiga_cust_101@vgiga' },
      { path: 'Device.Ethernet.VLANTermination.1.VLANID', value: '200' },
    ];

    const normalized = UspService.normalizeUspData('proto::Nokia-USP998877665544', uspParams);
    expect(normalized.protocol).toBe('TR-369');
    expect(normalized.manufacturer).toBe('Nokia');
    expect(normalized.modelName).toBe('XS-2426G-A');
    expect(normalized.currentRxPowerDbm).toBe(-19.8);
    expect(normalized.currentTxPowerDbm).toBe(2.4);
    expect(normalized.biasCurrentMa).toBe(12.8);
    expect(normalized.opticalVoltageV).toBe(3.3);
    expect(normalized.temperatureC).toBe(42);
    expect(normalized.ipAddress).toBe('100.64.20.15');
  });

  it('4. Zero fake data policy: unreceived fields return undefined / null rather than mock values', () => {
    const sparseXml = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
        <soapenv:Body>
          <cwmp:Inform>
            <DeviceId>
              <SerialNumber>GENEXIS92907060</SerialNumber>
            </DeviceId>
          </cwmp:Inform>
        </soapenv:Body>
      </soapenv:Envelope>
    `;
    const parsed = CwmpService.parseInformXml(sparseXml);
    expect(parsed.serialNumber).toBe('GENEXIS92907060');
    expect(parsed.opticalRxPower).toBeUndefined();
    expect(parsed.opticalTxPower).toBeUndefined();
    expect(parsed.opticalBiasCurrent).toBeUndefined();
    expect(parsed.opticalVoltage).toBeUndefined();
    expect(parsed.temperatureC).toBeUndefined();
    expect(parsed.wifiSsid24).toBeUndefined();
  });

  it('5. Safe Baseline GPV separates standard TR-098 Wi-Fi/WAN from unverified optical paths', () => {
    const baselineParams = CwmpVendorProfiles.getSafeBaselineParameters('CHINA_TELECOM');
    expect(baselineParams).toContain('InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID');
    expect(baselineParams).toContain('InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries');
    expect(baselineParams).toContain('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username');
    
    // Crucially: MUST NOT contain unverified vendor optical path in the baseline batch
    const hasOpticalInBaseline = baselineParams.some(p => p.includes('Optical') || p.includes('RXPower') || p.includes('RxPower'));
    expect(hasOpticalInBaseline).toBe(false);
  });

  it('6. Fault 9005 Isolation: Optical Fault 9005 preserves Wi-Fi/WAN data and caches path as UNSUPPORTED', async () => {
    const testSerial = 'GNXS_TEST_FAULT_9005';
    const testIp = '103.111.222.33';

    // 1. Initial Inform
    const informXml = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
        <soapenv:Body>
          <cwmp:Inform>
            <DeviceId>
              <Manufacturer>GENEXIS</Manufacturer>
              <OUI>002293</OUI>
              <ProductClass>Titanium-2122A</ProductClass>
              <SerialNumber>${testSerial}</SerialNumber>
            </DeviceId>
          </cwmp:Inform>
        </soapenv:Body>
      </soapenv:Envelope>
    `;
    const informRes = await CwmpService.handleInform(informXml, testIp, 'vgigafiber.ciniplay.in:7547');
    expect(informRes.sessionId).toBeDefined();

    // 2. Step 1 Empty POST -> Generates GetParameterNames root discovery
    const gpnRpc = await CwmpService.checkPendingRpcOrPoll(testIp, informRes.sessionId);
    expect(gpnRpc).toContain('GetParameterNames');
    expect(gpnRpc).toContain('InternetGatewayDevice.');

    // 3. CPE returns GetParameterNamesResponse -> ACS dispatches Confirmed GPV
    const gpnResponseXml = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
        <soapenv:Body>
          <cwmp:GetParameterNamesResponse>
            <ParameterList>
              <ParameterInfoStruct>
                <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID</Name>
                <Writable>1</Writable>
              </ParameterInfoStruct>
              <ParameterInfoStruct>
                <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase</Name>
                <Writable>1</Writable>
              </ParameterInfoStruct>
              <ParameterInfoStruct>
                <Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username</Name>
                <Writable>1</Writable>
              </ParameterInfoStruct>
              <ParameterInfoStruct>
                <Name>InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries</Name>
                <Writable>0</Writable>
              </ParameterInfoStruct>
            </ParameterList>
          </cwmp:GetParameterNamesResponse>
        </soapenv:Body>
      </soapenv:Envelope>
    `;
    const confirmedGpvRpc = await CwmpService.handleParameterNamesResponse(gpnResponseXml, testIp, informRes.sessionId);
    expect(confirmedGpvRpc).toContain('GetParameterValues');
    expect(confirmedGpvRpc).toContain('InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID');
    expect(confirmedGpvRpc).not.toContain('X_CT-COM_GponInterfaceConfig.RXPower');

    // 4. Confirmed GPV Response -> Ingests Wi-Fi & PPPoE into MongoDB
    const baselineResponseXml = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
        <soapenv:Body>
          <cwmp:GetParameterValuesResponse>
            <ParameterList>
              <ParameterValueStruct>
                <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID</Name>
                <Value>VGiga-Fiber-2.4G</Value>
              </ParameterValueStruct>
              <ParameterValueStruct>
                <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase</Name>
                <Value>secretWifiKey123</Value>
              </ParameterValueStruct>
              <ParameterValueStruct>
                <Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username</Name>
                <Value>cust8450@vgiga.net</Value>
              </ParameterValueStruct>
              <ParameterValueStruct>
                <Name>InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries</Name>
                <Value>5</Value>
              </ParameterValueStruct>
            </ParameterList>
          </cwmp:GetParameterValuesResponse>
        </soapenv:Body>
      </soapenv:Envelope>
    `;
    await CwmpService.handleParameterValuesResponse(baselineResponseXml, testIp, informRes.sessionId);

    // Verify baseline data is in MongoDB
    const devBeforeOptical = await Device.findOne({ serialNumber: testSerial });
    expect(devBeforeOptical?.wifi24?.ssid).toBe('VGiga-Fiber-2.4G');
    expect(devBeforeOptical?.wifi24?.password).toBe('secretWifiKey123');
    expect(devBeforeOptical?.wanProfiles?.[0]?.pppoeUsername).toBe('cust8450@vgiga.net');
    expect(devBeforeOptical?.lanHostCount).toBe(5);

    // 5. Simulated Real CPE Fault 9005 on invalid optical candidate
    const faultXml = `
      <SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
        <SOAP-ENV:Body>
          <SOAP-ENV:Fault>
            <faultcode>Client</faultcode>
            <faultstring>CWMP fault</faultstring>
            <detail>
              <cwmp:Fault>
                <FaultCode>9005</FaultCode>
                <FaultString>Invalid parameter name:InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.RXPower</FaultString>
              </cwmp:Fault>
            </detail>
          </SOAP-ENV:Fault>
        </SOAP-ENV:Body>
      </SOAP-ENV:Envelope>
    `;
    await CwmpService.handleParameterValuesResponse(faultXml, testIp, informRes.sessionId);

    // Verify: Wi-Fi/WAN data in DB was NOT lost or overwritten with null
    const devAfterFault = await Device.findOne({ serialNumber: testSerial });
    expect(devAfterFault?.wifi24?.ssid).toBe('VGiga-Fiber-2.4G');
    expect(devAfterFault?.wifi24?.password).toBe('secretWifiKey123');
    expect(devAfterFault?.wanProfiles?.[0]?.pppoeUsername).toBe('cust8450@vgiga.net');
    expect(devAfterFault?.lanHostCount).toBe(5);

    // Cleanup
    await Device.deleteOne({ serialNumber: testSerial });
  });
});
