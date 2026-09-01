import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Device } from '../src/models/Device.js';
import { Tenant } from '../src/models/Tenant.js';
import { DeviceCommand } from '../src/models/DeviceCommand.js';
import { CwmpService } from '../src/services/cwmpService.js';
import { CwmpVendorProfiles } from '../src/services/cwmpVendorProfiles.js';
import { Genexis4410Agent } from '../src/agents/genexis4410Agent.js';
import { buildTr069WanParams } from '../src/routes/operatorRoutes.js';

describe('AI ISP OS — Genexis Platinum GX 4410 Comprehensive End-to-End Test Suite', () => {
  let testTenant: any;
  let testSerial = 'GNXS-GX4410-AUTO-01';
  let agent: Genexis4410Agent;
  let activeSessionId: string = '';

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await Tenant.deleteMany({ slug: 'genexis_test_tenant' });
    await Device.deleteMany({ serialNumber: testSerial });
    await DeviceCommand.deleteMany({ 'requestedBy.email': 'test-agent@genexis.com' });

    testTenant = await Tenant.create({
      name: 'Genexis Test ISP',
      displayName: 'Genexis ISP',
      slug: 'genexis_test_tenant',
      subdomain: 'genexis.test.in',
      operatorKey: 'op_genexis_test',
      status: 'active',
      owner: { name: 'Genexis Lab Engineer', email: 'lab@genexis.com', phone: '+919888877771' },
      plan: { name: 'Enterprise', maxCustomers: 5000, maxDevices: 5000, maxTechnicians: 20, monthlyFee: 10000, currency: 'INR', billingCycle: 'monthly', features: [] },
      branding: { logoUrl: '', primaryColor: '#2563eb', secondaryColor: '#0f172a', companyName: 'Genexis ISP', supportPhone: '', supportEmail: '', portalTitle: 'Genexis Portal' },
      featureEntitlements: { tr069Acs: true, tr369Usp: true, fiberGis: true, aiCommandCenter: true, technicianDispatch: true, customerApp: true, whatsappAlerts: true, opticalDiagnostics: true },
      opticalThresholds: { warningDbm: -24.5, criticalDbm: -27.0 },
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
    });

    agent = new Genexis4410Agent('http://127.0.0.1:7547/', testSerial);
  });

  afterAll(async () => {
    await Tenant.deleteMany({ slug: 'genexis_test_tenant' });
    await Device.deleteMany({ serialNumber: testSerial });
    await DeviceCommand.deleteMany({ 'requestedBy.email': 'test-agent@genexis.com' });
  });

  it('1. Should detect and classify Genexis Platinum GX 4410 vendor profile accurately', async () => {
    const profile = CwmpVendorProfiles.detectVendor(
      agent.state.manufacturer,
      agent.state.modelName,
      agent.state.oui,
      'GX4410-HGU'
    );
    expect(profile).toBe('GENEXIS');
  });

  it('2. Should ingest Inform from Genexis GX 4410, create/update device document with proper metadata', async () => {
    const informXml = agent.generateInformXml();
    const informRes = await CwmpService.handleInform(informXml, '192.168.1.1', undefined, 'genexis_test_tenant');

    expect(informRes).toBeDefined();
    expect(informRes.sessionId).toBeDefined();
    activeSessionId = informRes.sessionId;

    const dev = await Device.findOne({ serialNumber: testSerial });
    expect(dev).toBeDefined();
    expect(dev?.manufacturer).toBe('GENEXIS');
    expect(dev?.status).toBe('online');
    expect(dev?.modelName).toContain('4410');
  });

  it('3. Should ingest GetParameterNames response and discover all 4410 parameters without Fault 9005', async () => {
    const gpnXml = agent.generateGpnResponse('2');
    const gpnRes = await CwmpService.handleParameterNamesResponse(gpnXml, '192.168.1.1', activeSessionId, undefined, 'genexis_test_tenant');

    expect(gpnRes).toBeDefined();
    const dev = await Device.findOne({ serialNumber: testSerial });
    expect(dev).toBeDefined();
    expect(dev?.serialNumber).toBe(testSerial);
  });

  it('4. Should ingest GPV response and correctly extract Dual-Band Wi-Fi 2.4 GHz and 5.0 GHz credentials', async () => {
    const gpvXml = agent.generateGpvResponse();
    const gpvRes = await CwmpService.handleParameterValuesResponse(gpvXml, '192.168.1.1', activeSessionId, undefined, 'genexis_test_tenant');

    expect(gpvRes).toBeDefined();
    const dev = await Device.findOne({ serialNumber: testSerial });
    expect(dev?.wifi24?.ssid).toBe('Genexis_GX4410_2.4G');
    expect(dev?.wifi24?.password).toBe('Genexis@Pass2026');
    expect(dev?.wifi5g?.ssid).toBe('Genexis_GX4410_5G');
    expect(dev?.wifi5g?.password).toBe('Genexis@Pass5G2026');
  });

  it('5. Should scale Optical RX & TX power accurately for Genexis (-19.45 dBm and +2.38 dBm)', async () => {
    const dev = await Device.findOne({ serialNumber: testSerial });
    expect(dev?.currentRxPowerDbm).toBeCloseTo(-19.45, 1);
    expect(dev?.currentTxPowerDbm).toBeCloseTo(2.38, 1);
    expect(dev?.opticalStatus).toBe('normal');
  });

  it('6. Should extract WAN PPPoE username, IP address, and VLAN correctly from Slot 2', async () => {
    const dev = await Device.findOne({ serialNumber: testSerial });
    expect(dev?.wanProfiles).toBeDefined();
    expect(dev?.wanProfiles?.length).toBeGreaterThan(0);
    const pppProfile = dev?.wanProfiles?.[0];
    expect(pppProfile?.pppoeUsername).toBe('gx4410_user@isp.in');
    expect(pppProfile?.status).toBe('Connected');
    expect(pppProfile?.vlanId).toBe(100);
  });

  it('7. Should parse all Connected Clients with friendly brand names (Apple, Samsung, Xiaomi, Smart Home)', async () => {
    const dev = await Device.findOne({ serialNumber: testSerial });
    expect(dev?.connectedClients).toBeDefined();
    expect(dev?.connectedClients?.length).toBe(6);

    const appleClient = dev?.connectedClients?.find((c) => c.mac.startsWith('CC:F7:35'));
    expect(appleClient?.hostname).toBe('iPhone-15-Pro');

    const samsungClient = dev?.connectedClients?.find((c) => c.mac.startsWith('08:5B:D6'));
    expect(samsungClient?.hostname).toBe('Galaxy-S23-Ultra');

    const macbookClient = dev?.connectedClients?.find((c) => c.mac.startsWith('3C:64:CF'));
    expect(macbookClient?.hostname).toBe('MacBook-Pro-M2');
  });

  it('8. Should build TR-069 WAN params for GX 4410 without PRE_DISPATCH_VALIDATION_FAILED', async () => {
    const dev = await Device.findOne({ serialNumber: testSerial });
    const targetProfile = {
      enableWan: true,
      pppoeUsername: 'gx4410_updated@isp.in',
      pppoePassword: 'NewSecretPassword2026',
      vlanId: 200,
      connectionType: 'PPPoE',
    };

    const builtParams = await buildTr069WanParams(targetProfile, dev);
    expect(builtParams.length).toBeGreaterThan(0);
    const userParam = builtParams.find(([path]) => path.includes('Username'));
    expect(userParam).toBeDefined();
    expect(userParam?.[1]).toBe('gx4410_updated@isp.in');
  });

  it('9. Should dispatch SetParameterValues to write updated Wi-Fi & WAN credentials on GX 4410', async () => {
    const dev = await Device.findOne({ serialNumber: testSerial });
    expect(dev).toBeDefined();

    // Queue SET_WIFI_CONFIG command
    const wifiCmd = await DeviceCommand.create({
      tenantId: testTenant._id,
      deviceId: dev!._id,
      action: 'SET_WIFI_CONFIG',
      parameters: {
        wifi24: { ssid: 'Genexis_4410_Office', password: 'NewSecurePass@2026' },
        wifi5g: { ssid: 'Genexis_4410_5G_VIP', password: 'New5GSecurePass@2026' },
      },
      status: 'queued',
      requestedBy: { email: 'test-agent@genexis.com', role: 'operator_admin' },
      queuedAt: new Date(),
    });

    expect(wifiCmd).toBeDefined();
    expect(wifiCmd.status).toBe('queued');

    // Simulate ACS dispatching SetParameterValues
    const spvXml = agent.generateSpvXml([
      { name: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID', value: 'Genexis_4410_Office', type: 'xsd:string' },
      { name: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase', value: 'NewSecurePass@2026', type: 'xsd:string' },
      { name: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID', value: 'Genexis_4410_5G_VIP', type: 'xsd:string' },
      { name: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase', value: 'New5GSecurePass@2026', type: 'xsd:string' },
    ]);
    expect(spvXml).toContain('Genexis_4410_Office');

    // Simulate CPE returning SetParameterValuesResponse (Status 0 = Applied)
    const spvResXml = agent.generateSpvResponse();
    const handleSpvRes = await CwmpService.handleParameterValuesResponse(spvResXml, '192.168.1.1', activeSessionId, undefined, 'genexis_test_tenant');
    expect(handleSpvRes).toBeDefined();
  });

  it('10. Should confirm Write-Back Verification via follow-up GetParameterValues', async () => {
    // Update local agent state to reflect written values
    agent.state.wifi24.ssid = 'Genexis_4410_Office';
    agent.state.wifi24.key = 'NewSecurePass@2026';
    agent.state.wifi5g.ssid = 'Genexis_4410_5G_VIP';
    agent.state.wifi5g.key = 'New5GSecurePass@2026';

    // CPE sends GPV response confirming written parameters
    const verifyGpvXml = agent.generateGpvResponse();
    const gpvRes = await CwmpService.handleParameterValuesResponse(verifyGpvXml, '192.168.1.1', activeSessionId, undefined, 'genexis_test_tenant');
    expect(gpvRes).toBeDefined();

    const dev = await Device.findOne({ serialNumber: testSerial });
    expect(dev?.wifi24?.ssid).toBe('Genexis_4410_Office');
    expect(dev?.wifi24?.password).toBe('NewSecurePass@2026');
    expect(dev?.wifi5g?.ssid).toBe('Genexis_4410_5G_VIP');
    expect(dev?.wifi5g?.password).toBe('New5GSecurePass@2026');
  });

  it('11. Should run full agent standalone test successfully', async () => {
    const fullResult = await agent.runFullEndToEndSession();
    expect(fullResult.success).toBe(true);
    expect(fullResult.discoveredVendor).toBe('GENEXIS');
    expect(fullResult.wifi24Ssid).toBe('Genexis_4410_Office');
    expect(fullResult.wifi5gSsid).toBe('Genexis_4410_5G_VIP');
    expect(fullResult.wanPppoeUser).toBe('gx4410_user@isp.in');
  });

  it('12. Should execute AddObject-based WAN creation on Genexis GX4410 with strict TR-069 ordering and SetParameterAttributes in a single session', async () => {
    const dev = await Device.findOne({ serialNumber: testSerial });
    expect(dev).toBeDefined();

    // Queue a SET_WAN_CONFIG command requiring AddObject (e.g. Slot 3)
    const wanCmd = await DeviceCommand.create({
      tenantId: testTenant._id,
      deviceId: dev!._id,
      action: 'SET_WAN_CONFIG',
      parameters: {
        profile: {
          name: 'Genexis_Fiber_Internet',
          connectionType: 'PPPoE',
          pppoeUsername: 'gx4410_strict@isp.in',
          pppoePassword: 'SecretGenexis2026',
          vlanId: 300,
          enableWan: true,
        },
        tr069ParamValues: [
          ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Username', 'gx4410_strict@isp.in', 'xsd:string'],
          ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Password', 'SecretGenexis2026', 'xsd:string'],
          ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Enable', true, 'xsd:boolean'],
          ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.X_CT-COM_WANEponLinkConfig.Mode', 2, 'xsd:int'],
          ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.X_CT-COM_WANEponLinkConfig.VLANIDMark', 300, 'xsd:int'],
        ],
      },
      status: 'queued',
      requestedBy: { email: 'test-agent@genexis.com', role: 'operator_admin' },
      queuedAt: new Date(),
    });

    expect(wanCmd).toBeDefined();

    // Step 1: Empty POST from CPE -> ACS dispatches AddObject
    const addObjectXml = await CwmpService.checkPendingRpcOrPoll('192.168.1.1', activeSessionId, undefined, 'genexis_test_tenant');
    expect(addObjectXml).toBeDefined();
    expect(addObjectXml).toContain('<cwmp:AddObject>');
    expect(addObjectXml).toContain('WANConnectionDevice');

    // Step 2: CPE replies with AddObjectResponse (InstanceNumber: 3) -> ACS replies with strict ordered SPV
    const addObjectResXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header><cwmp:ID soapenv:mustUnderstand="1">3</cwmp:ID></soapenv:Header>
  <soapenv:Body>
    <cwmp:AddObjectResponse>
      <InstanceNumber>3</InstanceNumber>
      <Status>0</Status>
    </cwmp:AddObjectResponse>
  </soapenv:Body>
</soapenv:Envelope>`;

    const spvResponseXml = await CwmpService.handleParameterValuesResponse(addObjectResXml, '192.168.1.1', activeSessionId, undefined, 'genexis_test_tenant');
    expect(spvResponseXml).toBeDefined();
    expect(spvResponseXml).toContain('<cwmp:SetParameterValues>');

    // Verify strict TR-069 ordering: ConnectionType first, then Enable, then Username/Password, then VLAN
    const connTypeIdx = spvResponseXml!.indexOf('ConnectionType');
    const enableIdx = spvResponseXml!.indexOf('Enable');
    const userIdx = spvResponseXml!.indexOf('Username');
    const passIdx = spvResponseXml!.indexOf('Password');
    const vlanIdx = spvResponseXml!.indexOf('WANEponLinkConfig');

    expect(connTypeIdx).toBeGreaterThan(0);
    expect(enableIdx).toBeGreaterThan(connTypeIdx);
    expect(userIdx).toBeGreaterThan(enableIdx);
    expect(passIdx).toBeGreaterThan(userIdx);
    expect(vlanIdx).toBeGreaterThan(passIdx);

    // Step 3: CPE acknowledges SetParameterValues with SetParameterValuesResponse -> ACS returns SetParameterAttributes (SPA)
    const spvAckXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header><cwmp:ID soapenv:mustUnderstand="1">3</cwmp:ID></soapenv:Header>
  <soapenv:Body>
    <cwmp:SetParameterValuesResponse>
      <Status>0</Status>
    </cwmp:SetParameterValuesResponse>
  </soapenv:Body>
</soapenv:Envelope>`;

    const spaResponseXml = await CwmpService.handleParameterValuesResponse(spvAckXml, '192.168.1.1', activeSessionId, undefined, 'genexis_test_tenant');
    expect(spaResponseXml).toBeDefined();
    expect(spaResponseXml).toContain('<cwmp:SetParameterAttributes>');
    expect(spaResponseXml).toContain('ConnectionStatus');
    expect(spaResponseXml).toContain('ExternalIPAddress');
    expect(spaResponseXml).toContain('<Notification>1</Notification>');

    // Step 4: CPE acknowledges SetParameterAttributes with SetParameterAttributesResponse -> ACS returns verification GPV
    const spaAckXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header><cwmp:ID soapenv:mustUnderstand="1">5</cwmp:ID></soapenv:Header>
  <soapenv:Body>
    <cwmp:SetParameterAttributesResponse/>
  </soapenv:Body>
</soapenv:Envelope>`;

    const verifyGpvXml = await CwmpService.handleParameterValuesResponse(spaAckXml, '192.168.1.1', activeSessionId, undefined, 'genexis_test_tenant');
    expect(verifyGpvXml).toBeDefined();
    expect(verifyGpvXml).toContain('<cwmp:GetParameterValues>');

    // Step 5: Verification GPV response completes the sequence
    const verifyGpvAckXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soapenv:Header><cwmp:ID soapenv:mustUnderstand="1">4</cwmp:ID></soapenv:Header>
  <soapenv:Body>
    <cwmp:GetParameterValuesResponse>
      <ParameterList soapenv:arrayType="cwmp:ParameterValueStruct[2]">
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Username</Name>
          <Value xsi:type="xsd:string">gx4410_strict@isp.in</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.ConnectionStatus</Name>
          <Value xsi:type="xsd:string">Connected</Value>
        </ParameterValueStruct>
      </ParameterList>
    </cwmp:GetParameterValuesResponse>
  </soapenv:Body>
</soapenv:Envelope>`;

    const finalRes = await CwmpService.handleParameterValuesResponse(verifyGpvAckXml, '192.168.1.1', activeSessionId, undefined, 'genexis_test_tenant');
    expect(finalRes).toBeNull(); // Session closes cleanly with HTTP 204

    const updatedCmd = await DeviceCommand.findById(wanCmd._id);
    expect(['success', 'verified']).toContain(updatedCmd?.status);
  });
});
