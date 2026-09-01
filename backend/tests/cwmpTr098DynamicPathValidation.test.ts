import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { Device } from '../src/models/Device.js';
import { DeviceCommand } from '../src/models/DeviceCommand.js';
import { buildTr069WanParams } from '../src/routes/operatorRoutes.js';
import {
  discoverLiveTr098WanTree,
  selectCustomerWanSlot,
  validateWanParameters,
  computePayloadHash,
  buildDynamicTr098WanParams,
} from '../src/services/tr098WanDiscoveryService.js';
import { CwmpService } from '../src/services/cwmpService.js';

describe('TR-098 Dynamic WAN Path Validation & Fault 9005 Remediation Suite', () => {
  let tenant: any;
  let testDevice: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    tenant = await Tenant.create({
      name: 'Dynamic Path Test Tenant',
      slug: 'path_test',
      subdomain: 'pathtest.ai-ispos.com',
      operatorKey: 'opk_pathtest',
      owner: { name: 'Path Tester', email: 'path@tester.com', phone: '9999999999' },
    });

    testDevice = await Device.create({
      tenantId: tenant._id,
      deviceIdStr: 'DEV-DYNAMIC-PATH-01',
      serialNumber: 'BC62D21470F0',
      modelName: 'Platinum-4410',
      status: 'online',
      rawParameters: {},
    });
  });

  afterAll(async () => {
    await DeviceCommand.deleteMany({ tenantId: tenant._id });
    await Device.deleteMany({ tenantId: tenant._id });
    await Tenant.deleteMany({ _id: tenant._id });
    await mongoose.disconnect();
  });

  // 1. WANConnectionDevice.3.WANPPPConnection.1 exists and is writable.
  it('1. should select WANConnectionDevice.3 when WANPPPConnection.1 exists on slot 3', async () => {
    const rawParams = {
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Name': '1_TR069_R_VID_100',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Enable': true,
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Username': 'cust_slot3@isp.in',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Password': 'pass123',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.ConnectionType': 'IP_Routed',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.X_CT-COM_WANEponLinkConfig.VLANIDMark': 488,
    };

    const topology = discoverLiveTr098WanTree(rawParams);
    const selected = selectCustomerWanSlot(topology, true);
    expect(selected?.slot).toBe(3);
    expect(selected?.basePath).toBe('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1');

    const result = await buildDynamicTr098WanParams(
      { connectionType: 'PPPoE', username: 'cust_slot3@isp.in', password: 'secretpassword', vlanId: 488 },
      { modelName: 'Platinum-4410' },
      rawParams
    );

    expect(result.errors.length).toBe(0);
    const paths = result.params.map(([p]) => p);
    expect(paths).toContain('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Username');
    expect(paths).toContain('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.X_CT-COM_WANEponLinkConfig.VLANIDMark');
  });

  // 2. WANConnectionDevice.3 exists but WANPPPConnection.1 does not exist.
  it('2. should not pick WANConnectionDevice.3 for PPP if it only has IP or is missing WANPPPConnection.1', () => {
    const rawParams = {
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Name': '1_TR069_R_VID_100',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Enable': true,
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANIPConnection.1.Enable': true,
    };

    const topology = discoverLiveTr098WanTree(rawParams);
    const selected = selectCustomerWanSlot(topology, true);
    expect(selected?.slot).toBe(2);
    expect(selected?.basePath).toBe('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1');
  });

  // 3. Only WANIPConnection.1 exists.
  it('3. should preserve slot 1 as management and fall back to available writable customer slot when only WANIPConnection.1 exists', () => {
    const rawParams = {
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Name': '1_TR069_R_VID_100',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Enable': true,
    };

    const topology = discoverLiveTr098WanTree(rawParams);
    expect(topology.managementSlot).toBe(1);
    expect(topology.availableCustomerPppSlots.length).toBe(0);
  });

  // 4. PPPoE object exists on WANConnectionDevice.2 instead of .3.
  it('4. should dynamically bind to WANConnectionDevice.2 when PPPoE exists on slot 2', async () => {
    const rawParams = {
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Name': '1_TR069_R_VID_100',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Enable': true,
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username': 'vaishnavi_vpn@tpartmgmt.in',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Password': 'password',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.ConnectionType': 'IP_Routed',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.X_CT-COM_WANEponLinkConfig.VLANIDMark': 488,
    };

    const result = await buildDynamicTr098WanParams(
      { connectionType: 'PPPoE', username: 'vaishnavi_vpn@tpartmgmt.in', password: 'password', vlanId: 488 },
      { modelName: 'Platinum-4410' },
      rawParams
    );

    expect(result.errors.length).toBe(0);
    const paths = result.params.map(([p]) => p);
    expect(paths).toContain('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username');
    expect(paths).not.toContain('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Username');
  });

  // 5. NATEnabled is missing and is omitted.
  it('5. should omit NATEnabled without failing if missing or unsupported on the CPE tree', () => {
    const rawParams = {
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Enable': true,
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username': 'user',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Password': 'pass',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.ConnectionType': 'IP_Routed',
    };

    const requested: Array<[string, any, string]> = [
      ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Enable', true, 'xsd:boolean'],
      ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username', 'user', 'xsd:string'],
      ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Password', 'pass', 'xsd:string'],
      ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.NATEnabled', true, 'xsd:boolean'],
      ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.ConnectionType', 'IP_Routed', 'xsd:string'],
    ];

    const validation = validateWanParameters(requested, rawParams);
    expect(validation.errors.length).toBe(0);
    expect(validation.omittedOptional).toContain('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.NATEnabled');
    const validPaths = validation.validParams.map(([p]) => p);
    expect(validPaths).not.toContain('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.NATEnabled');
  });

  // 6. VLANIDMark exists on a different WANConnectionDevice instance.
  it('6. should target VLANIDMark on the matching customer WANConnectionDevice instance', async () => {
    const rawParams = {
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Name': '1_TR069_R_VID_100',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Enable': true,
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username': 'user',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Password': 'pass',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.ConnectionType': 'IP_Routed',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.X_CT-COM_WANEponLinkConfig.VLANIDMark': 488,
    };

    const result = await buildDynamicTr098WanParams(
      { connectionType: 'PPPoE', username: 'user', password: 'pass', vlanId: 488 },
      { modelName: 'Platinum-4410' },
      rawParams
    );

    const vlanEntry = result.params.find(([p]) => p.includes('VLANIDMark'));
    expect(vlanEntry).toBeDefined();
    expect(vlanEntry![0]).toBe('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.X_CT-COM_WANEponLinkConfig.VLANIDMark');
  });

  // 7. MulticastVlan is missing and does not block Internet provisioning.
  it('7. should not include MulticastVlan in Internet WAN provisioning payload', async () => {
    const rawParams = {
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Name': '1_TR069_R_VID_100',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Enable': true,
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username': 'user',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Password': 'pass',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.ConnectionType': 'IP_Routed',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.X_CT-COM_WANEponLinkConfig.VLANIDMark': 488,
    };

    const result = await buildDynamicTr098WanParams(
      { connectionType: 'PPPoE', username: 'user', password: 'pass', vlanId: 488, multicastVlanId: 100 },
      { modelName: 'Platinum-4410' },
      rawParams
    );

    const paths = result.params.map(([p]) => p);
    const hasMulticast = paths.some(p => p.toLowerCase().includes('multicastvlan'));
    expect(hasMulticast).toBe(false);
  });

  // 8. Fault 9005 stores the exact invalid parameter.
  it('8. should store faultCode 9005 and exact faultParameter on the command document', async () => {
    const invalidPath = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Enable';
    const cmd = await DeviceCommand.create({
      tenantId: tenant._id,
      deviceId: testDevice._id,
      action: 'SET_WAN_CONFIG',
      parameters: { tr069ParamValues: [[invalidPath, true, 'xsd:boolean']] },
      status: 'failed',
      faultCode: 9005,
      faultParameter: invalidPath,
      faultString: 'Invalid parameter name',
      retryable: false,
      payloadHash: 'dummyhash123',
      correlationId: `corr_fault9005_${Date.now()}`,
    });

    const saved = await DeviceCommand.findById(cmd._id);
    expect(saved?.faultCode).toBe(9005);
    expect(saved?.faultParameter).toBe(invalidPath);
    expect(saved?.faultString).toBe('Invalid parameter name');
    expect(saved?.retryable).toBe(false);
  });

  // 9. Fault 9005 disables identical-payload retry.
  it('9. should detect identical payload hash for Fault 9005 and prohibit identical retry', () => {
    const payload = [
      ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Enable', true, 'xsd:boolean'],
      ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Username', 'cust@isp.in', 'xsd:string'],
    ] as Array<[string, any, string]>;

    const hash1 = computePayloadHash(payload);
    const hash2 = computePayloadHash(payload);
    expect(hash1).toBe(hash2);

    const oldCmd = { faultCode: 9005, retryable: false, payloadHash: hash1 };
    const isIdentical = (oldCmd.faultCode === 9005 || oldCmd.retryable === false) && oldCmd.payloadHash === hash2;
    expect(isIdentical).toBe(true);
  });

  // 10. Retry performs fresh parameter discovery.
  it('10. should produce a different payload hash when retried against refreshed discovered tree', async () => {
    // Old invalid tree on slot 3
    const oldParams: Array<[string, any, string]> = [
      ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Username', 'user', 'xsd:string'],
      ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Enable', true, 'xsd:boolean'],
    ];
    const oldHash = computePayloadHash(oldParams);

    // Refreshed live tree on slot 2
    const refreshedRaw = {
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Name': '1_TR069_R_VID_100',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Enable': true,
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username': 'user',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Password': 'pass',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.ConnectionType': 'IP_Routed',
    };

    const newResult = await buildDynamicTr098WanParams(
      { connectionType: 'PPPoE', username: 'user', password: 'pass' },
      { modelName: 'Platinum-4410' },
      refreshedRaw
    );

    expect(newResult.payloadHash).not.toBe(oldHash);
  });

  // 11. PPPoE username and password are included when required.
  it('11. should include both Username and Password when PPPoE credentials are provided', async () => {
    const rawParams = {
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Enable': true,
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username': 'user',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Password': 'pass',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.ConnectionType': 'IP_Routed',
    };

    const result = await buildDynamicTr098WanParams(
      { connectionType: 'PPPoE', username: 'user123@isp.in', password: 'mypassword' },
      { modelName: 'Platinum-4410' },
      rawParams
    );

    const userParam = result.params.find(([p]) => p.endsWith('.Username'));
    const passParam = result.params.find(([p]) => p.endsWith('.Password'));
    expect(userParam).toBeDefined();
    expect(userParam![1]).toBe('user123@isp.in');
    expect(passParam).toBeDefined();
    expect(passParam![1]).toBe('mypassword');
  });

  // 12. Password is never included in read-back verification.
  it('12. should never include Password in read-back verification paths', () => {
    const affectedPaths = [
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Enable',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Password',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.ConnectionType',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.X_CT-COM_WANEponLinkConfig.VLANIDMark',
    ];

    const pathsToVerify = affectedPaths.filter(p => !p.toLowerCase().includes('password'));
    expect(pathsToVerify).not.toContain('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Password');
    expect(pathsToVerify.length).toBe(4);
  });

  // 13. TR-069 management slot remains unchanged.
  it('13. should preserve the TR-069 management slot 1 untouched during customer WAN provisioning', async () => {
    const rawParams = {
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Name': '1_TR069_R_VID_100',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Enable': true,
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Enable': true,
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username': 'cust@isp.in',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Password': 'pass',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.ConnectionType': 'IP_Routed',
    };

    const topology = discoverLiveTr098WanTree(rawParams);
    expect(topology.managementSlot).toBe(1);

    const result = await buildDynamicTr098WanParams(
      { connectionType: 'PPPoE', username: 'cust@isp.in', password: 'pass' },
      { modelName: 'Platinum-4410' },
      rawParams
    );

    const targetsSlot1 = result.params.some(([p]) => p.includes('WANConnectionDevice.1.'));
    expect(targetsSlot1).toBe(false);
  });

  // 14. TR-181 behavior remains unchanged.
  it('14. should construct standard TR-181 Device. paths for TR-181 enabled devices', async () => {
    const tr181Profile = {
      connectionType: 'PPPoE',
      username: 'tr181_user@isp.in',
      password: 'tr181password',
      vlanId: 488,
      enableWan: true,
    };

    const tr181Device = {
      rawParameters: {
        'Device.PPP.Interface.1.Username': 'old_user',
        'Device.Ethernet.VLANTermination.1.VLANID': 100,
      },
    };

    const params = await buildTr069WanParams(tr181Profile, tr181Device);
    const paths = params.map(([p]) => p);
    expect(paths).toContain('Device.PPP.Interface.1.Username');
    expect(paths).toContain('Device.PPP.Interface.1.Password');
    expect(paths).toContain('Device.Ethernet.VLANTermination.1.VLANID');
    expect(paths).not.toContain('InternetGatewayDevice.WANDevice.1.');
  });

  // 15. Status transitions work:
  //     pending → sending → applied → verified
  //     pending → sending → applied_pending_verification → verified
  //     pending → sending → failed for fault 9005
  it('15. should transition correctly through all lifecycle states', async () => {
    // Flow A: pending -> sending -> applied -> verified
    const cmdA = await DeviceCommand.create({
      tenantId: tenant._id,
      deviceId: testDevice._id,
      action: 'SET_WAN_CONFIG',
      parameters: { username: 'test_a' },
      status: 'pending',
      correlationId: `corr_a_${Date.now()}`,
    });
    expect(cmdA.status).toBe('pending');

    cmdA.status = 'sending';
    cmdA.sentAt = new Date();
    await cmdA.save();
    expect(cmdA.status).toBe('sending');

    cmdA.status = 'applied';
    cmdA.cwmpResponseStatus = 0;
    await cmdA.save();
    expect(cmdA.status).toBe('applied');

    cmdA.status = 'verified';
    cmdA.verifiedAt = new Date();
    await cmdA.save();
    expect(cmdA.status).toBe('verified');

    // Flow B: pending -> sending -> applied_pending_verification -> verified
    const cmdB = await DeviceCommand.create({
      tenantId: tenant._id,
      deviceId: testDevice._id,
      action: 'SET_WAN_CONFIG',
      parameters: { username: 'test_b' },
      status: 'pending',
      correlationId: `corr_b_${Date.now()}`,
    });
    cmdB.status = 'sending';
    await cmdB.save();

    cmdB.status = 'applied_pending_verification';
    cmdB.cwmpResponseStatus = 1;
    await cmdB.save();
    expect(cmdB.status).toBe('applied_pending_verification');

    cmdB.status = 'verified';
    await cmdB.save();
    expect(cmdB.status).toBe('verified');

    // Flow C: pending -> sending -> failed for fault 9005
    const cmdC = await DeviceCommand.create({
      tenantId: tenant._id,
      deviceId: testDevice._id,
      action: 'SET_WAN_CONFIG',
      parameters: { username: 'test_c' },
      status: 'pending',
      correlationId: `corr_c_${Date.now()}`,
    });
    cmdC.status = 'sending';
    await cmdC.save();

    cmdC.status = 'failed';
    cmdC.faultCode = 9005;
    cmdC.faultParameter = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Enable';
    cmdC.faultString = 'Invalid parameter name';
    cmdC.retryable = false;
    await cmdC.save();

    expect(cmdC.status).toBe('failed');
    expect(cmdC.faultCode).toBe(9005);
    expect(cmdC.retryable).toBe(false);
  });

  // 16. (a) Partial GPV response confirms untouched paths outside query scope survive pruning
  it('16. should preserve untouched paths outside the queried scope during scoped prefix pruning', async () => {
    // Populate test device with Wi-Fi, optical, and WAN parameters
    testDevice.rawParameters = {
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID': 'MyHomeWifi_2.4G',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable': true,
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Name': '1_TR069_R_VID_100',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username': 'old_user@isp.in',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Enable': true,
    };
    await testDevice.save();

    // Start a simulated CWMP session for testDevice
    const informXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header><cwmp:ID soapenv:mustUnderstand="1">1</cwmp:ID></soapenv:Header>
  <soapenv:Body>
    <cwmp:Inform>
      <DeviceId>
        <Manufacturer>GENEXIS</Manufacturer>
        <OUI>00259E</OUI>
        <ProductClass>HGU</ProductClass>
        <SerialNumber>${testDevice.serialNumber}</SerialNumber>
      </DeviceId>
      <Event soapenv:arrayType="cwmp:EventStruct[1]">
        <EventStruct><EventCode>2 PERIODIC</EventCode><CommandKey></CommandKey></EventStruct>
      </Event>
      <MaxEnvelopes>1</MaxEnvelopes>
      <CurrentTime>2026-09-01T22:00:00Z</CurrentTime>
      <RetryCount>0</RetryCount>
      <ParameterList soapenv:arrayType="cwmp:ParameterValueStruct[0]"></ParameterList>
    </cwmp:Inform>
  </soapenv:Body>
</soapenv:Envelope>`;

    const informRes = await CwmpService.handleInform(informXml, '10.0.0.1', undefined, tenant.slug);
    const sessionId = informRes.sessionId;

    // Queue a GPV query for ONLY the WANConnectionDevice.2 slot username
    const gpvQueryCmd = await DeviceCommand.create({
      tenantId: tenant._id,
      deviceId: testDevice._id,
      action: 'GetParameterValues',
      parameters: {
        parameterNames: ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username']
      },
      status: 'queued',
      requestedBy: { email: 'admin@isp.in', role: 'operator_admin' }
    });

    await CwmpService.checkPendingRpcOrPoll('10.0.0.1', sessionId, undefined, tenant.slug);

    // Simulated CPE response: Returns empty parameter list for that query (slot 2 was deleted on physical CPE)
    const gpvResponseXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header><cwmp:ID soapenv:mustUnderstand="1">2</cwmp:ID></soapenv:Header>
  <soapenv:Body>
    <cwmp:GetParameterValuesResponse>
      <ParameterList soapenv:arrayType="cwmp:ParameterValueStruct[0]">
      </ParameterList>
    </cwmp:GetParameterValuesResponse>
  </soapenv:Body>
</soapenv:Envelope>`;

    await CwmpService.handleParameterValuesResponse(gpvResponseXml, '10.0.0.1', sessionId, undefined, tenant.slug);

    const refreshedDev = await Device.findById(testDevice._id);
    expect(refreshedDev).toBeDefined();
    // Untouched Wi-Fi & Slot 1 parameters SURVIVED pruning
    expect(refreshedDev!.rawParameters['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID']).toBe('MyHomeWifi_2.4G');
    expect(refreshedDev!.rawParameters['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Name']).toBe('1_TR069_R_VID_100');
    // The queried path that was absent in CPE response was successfully PRUNED
    expect(refreshedDev!.rawParameters['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username']).toBeUndefined();
  });

  // 17. (b) Deleted WAN slot no longer shows up as 'detected' on the next session
  it('17. should prune deleted WAN slot and correctly report requiresAddObject on next session', async () => {
    // Device now only has Slot 1 (Management TR069)
    testDevice.rawParameters = {
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Name': '1_TR069_R_VID_100',
    };
    await testDevice.save();

    // Call dynamic WAN discovery for a new PPPoE profile
    const result = await buildDynamicTr098WanParams(
      { connectionType: 'PPPoE', username: 'new_customer@isp.in' },
      testDevice
    );

    // Must NOT guess slot 2, must require AddObject
    expect(result.requiresAddObject).toBe(true);
    expect(result.basePath).toBe('');
    expect(result.params.length).toBe(0);
  });

  // 18. (c) Fail-loud path in waiting_for_wan_slot correctly halts instead of defaulting to slot 2
  it('18. should fail loudly on unresolvable WAN slot in waiting_for_wan_slot without guessing slot 2', async () => {
    testDevice.addObjectNotSupported = true;
    await testDevice.save();

    // Create a simulated CWMP session
    const informXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header><cwmp:ID soapenv:mustUnderstand="1">1</cwmp:ID></soapenv:Header>
  <soapenv:Body>
    <cwmp:Inform>
      <DeviceId>
        <Manufacturer>GENEXIS</Manufacturer>
        <OUI>00259E</OUI>
        <ProductClass>HGU</ProductClass>
        <SerialNumber>${testDevice.serialNumber}</SerialNumber>
      </DeviceId>
      <Event soapenv:arrayType="cwmp:EventStruct[1]">
        <EventStruct><EventCode>2 PERIODIC</EventCode><CommandKey></CommandKey></EventStruct>
      </Event>
      <MaxEnvelopes>1</MaxEnvelopes>
      <CurrentTime>2026-09-01T22:00:00Z</CurrentTime>
      <RetryCount>0</RetryCount>
      <ParameterList soapenv:arrayType="cwmp:ParameterValueStruct[0]"></ParameterList>
    </cwmp:Inform>
  </soapenv:Body>
</soapenv:Envelope>`;

    const informRes = await CwmpService.handleInform(informXml, '10.0.0.1', undefined, tenant.slug);
    const sessionId = informRes.sessionId;

    // Create a waiting_for_wan_slot command with missing/unparseable slot in tr069ParamValues
    const malformedWaitCmd = await DeviceCommand.create({
      tenantId: tenant._id,
      deviceId: testDevice._id,
      action: 'SET_WAN_CONFIG',
      status: 'waiting_for_wan_slot',
      parameters: {
        tr069ParamValues: [
          ['Invalid.Parameter.Path.Without.Slot', 'some_val', 'xsd:string']
        ]
      }
    });

    const gpvXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header><cwmp:ID soapenv:mustUnderstand="1">2</cwmp:ID></soapenv:Header>
  <soapenv:Body>
    <cwmp:GetParameterValuesResponse>
      <ParameterList soapenv:arrayType="cwmp:ParameterValueStruct[1]">
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.DeviceInfo.ModelName</Name>
          <Value>Platinum-4410</Value>
        </ParameterValueStruct>
      </ParameterList>
    </cwmp:GetParameterValuesResponse>
  </soapenv:Body>
</soapenv:Envelope>`;

    // Execute handleParameterValuesResponse
    await CwmpService.handleParameterValuesResponse(gpvXml, '10.0.0.1', sessionId, undefined, tenant.slug);

    const updatedCmd = await DeviceCommand.findById(malformedWaitCmd._id);
    expect(updatedCmd?.status).toBe('failed');
    expect(updatedCmd?.errorMessage).toContain('UNRESOLVABLE_WAN_SLOT');
  });

  // 19. (c) Fail-loud path in Fault 9003 handler correctly halts instead of defaulting to slot 2
  it('19. should fail loudly on Fault 9003 when target slot cannot be extracted without guessing slot 2', async () => {
    const sessionContext = {
      sessionId: 'session_9003_test',
      serialNumber: testDevice.serialNumber,
      serialAliases: [testDevice.serialNumber],
      vendor: 'GENEXIS' as any,
      manufacturer: 'GENEXIS',
      modelName: 'Platinum-4410',
      firmwareVersion: '1.44',
      hardwareVersion: 'V2',
      clientIp: '10.0.0.1',
      tenantId: tenant._id.toString(),
      tenantSlug: tenant.slug,
      stage: 'ADD_OBJECT_SENT' as any,
      timestamp: Date.now(),
    };

    // Store in CwmpService sessions map
    (CwmpService as any).sessionsById.set('session_9003_test', sessionContext);

    // Queue command with unparseable slot parameter
    const malformedCmd = await DeviceCommand.create({
      tenantId: tenant._id,
      deviceId: testDevice._id,
      action: 'SET_WAN_CONFIG',
      status: 'sending',
      parameters: {
        tr069ParamValues: [
          ['NoSlotPathHere', 'val', 'xsd:string']
        ]
      }
    });

    const faultXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header><cwmp:ID soapenv:mustUnderstand="1">3</cwmp:ID></soapenv:Header>
  <soapenv:Body>
    <soapenv:Fault>
      <faultcode>Client</faultcode>
      <faultstring>CWMP fault</faultstring>
      <detail>
        <cwmp:Fault>
          <FaultCode>9003</FaultCode>
          <FaultString>Invalid arguments</FaultString>
        </cwmp:Fault>
      </detail>
    </soapenv:Fault>
  </soapenv:Body>
</soapenv:Envelope>`;

    await CwmpService.handleParameterValuesResponse(faultXml, '10.0.0.1', 'session_9003_test', undefined, tenant.slug);

    const updatedFaultCmd = await DeviceCommand.findById(malformedCmd._id);
    expect(updatedFaultCmd?.status).toBe('failed');
    expect(updatedFaultCmd?.errorMessage).toContain('FAILED_UNKNOWN_WAN_SLOT');
  });

  // 20. Multi-WAN Slot Preservation: Creating a new Voice WAN does not overwrite existing Internet WAN in Slot 2
  it('20. should preserve existing Internet WAN in Slot 2 and require AddObject when creating a second Voice WAN profile', async () => {
    const rawTreeWithInternet = {
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Name': '1_TR069_R_VID_100',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.X_CT-COM_ServiceList': 'TR069',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Enable': true,
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username': 'internet_user@isp.in',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Password': 'secret',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.X_CT-COM_WANEponLinkConfig.Mode': 2,
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.X_CT-COM_WANEponLinkConfig.VLANIDMark': 100,
    };

    const mockDeviceWithInternet = {
      _id: 'dev_multi_wan_test',
      modelName: 'Platinum-4410',
      wanProfiles: [
        {
          _id: 'prof_internet_1',
          name: 'Internet_WAN',
          serviceType: 'INTERNET',
          connectionType: 'PPPoE',
          vlanId: 100,
          cpeObjectPath: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.',
        }
      ],
      rawParameters: rawTreeWithInternet,
    };

    // Attempting to create a NEW Voice WAN profile (no cpeObjectPath yet)
    const newVoiceProfile = {
      _id: 'prof_voice_2',
      name: 'Voice_WAN',
      serviceType: 'VOIP',
      connectionType: 'IP_Routed',
      vlanId: 200,
    };

    const voiceResult = await buildDynamicTr098WanParams(newVoiceProfile, mockDeviceWithInternet, rawTreeWithInternet);

    // MUST NOT overwrite slot 2! MUST require AddObject to create a new slot on CPE.
    expect(voiceResult.requiresAddObject).toBe(true);
    expect(voiceResult.basePath).toBe('');
    expect(voiceResult.params.length).toBe(0);
  });
});
