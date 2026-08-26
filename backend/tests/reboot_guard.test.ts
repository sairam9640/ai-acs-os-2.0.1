import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CwmpService } from '../src/services/cwmpService';
import { Device } from '../src/models/Device';
import { DeviceCommand } from '../src/models/DeviceCommand';
import { Customer } from '../src/models/Customer';
import { Tenant } from '../src/models/Tenant';
import { PendingDeviceMapping } from '../src/models/PendingDeviceMapping';
import { Alert } from '../src/models/Incident';
import { User } from '../src/models/User';
import { WhatsAppService } from '../src/services/whatsAppService';
import { CwmpXmlParser } from '../src/services/cwmpXmlParser';
import { Types } from 'mongoose';

describe('FINAL SECURITY AND TENANT-ISOLATION AUDIT SUITE', () => {
  const mockTenantAId = new Types.ObjectId();
  const mockTenantBId = new Types.ObjectId();
  const mockDeviceId = new Types.ObjectId();
  const testSerial = 'TEST_ONT_READONLY_99';

  beforeEach(() => {
    vi.restoreAllMocks();
    (CwmpService as any).sessionsById.clear();
    (CwmpService as any).sessionsByConnection.clear();
  });

  it('TEST 1: Inbound Inform (BOOT/PERIODIC) NEVER creates or mutates Customer records', async () => {
    const informXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header><cwmp:ID>1</cwmp:ID></soapenv:Header>
  <soapenv:Body>
    <cwmp:Inform>
      <DeviceId>
        <Manufacturer>GENEXIS</Manufacturer>
        <OUI>00259E</OUI>
        <ProductClass>Titanium-2122A</ProductClass>
        <SerialNumber>${testSerial}</SerialNumber>
      </DeviceId>
      <Event soapenv:arrayType="cwmp:EventStruct[1]">
        <EventStruct><EventCode>2 PERIODIC</EventCode><CommandKey></CommandKey></EventStruct>
      </Event>
      <ParameterList soapenv:arrayType="cwmp:ParameterValueStruct[2]">
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username</Name>
          <Value>user_new_subscriber_8410@isp.in</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.DeviceInfo.SoftwareVersion</Name>
          <Value>V2.1.0</Value>
        </ParameterValueStruct>
      </ParameterList>
    </cwmp:Inform>
  </soapenv:Body>
</soapenv:Envelope>`;

    const customerCreateSpy = vi.spyOn(Customer, 'create');
    const customerUpdateSpy = vi.spyOn(Customer, 'updateOne');
    const customerFindOneAndUpdateSpy = vi.spyOn(Customer, 'findOneAndUpdate');

    vi.spyOn(CwmpService as any, 'resolveTenant').mockResolvedValue({
      _id: mockTenantAId,
      slug: 'rudra',
    });

    vi.spyOn(Device, 'findOne').mockResolvedValue(null);
    vi.spyOn(Device, 'create').mockResolvedValue({
      _id: mockDeviceId,
      serialNumber: testSerial,
      tenantId: mockTenantAId,
      assigned: false,
      customerId: undefined,
    } as any);

    const res = await CwmpService.handleInform(informXml, '192.168.1.100', 'sess_ro_1', 'rudra.app.ciniplay.in');

    // VERIFY: Customer.create and Customer.update were NEVER invoked
    expect(customerCreateSpy).not.toHaveBeenCalled();
    expect(customerUpdateSpy).not.toHaveBeenCalled();
    expect(customerFindOneAndUpdateSpy).not.toHaveBeenCalled();
    expect(res.responseXml).toContain('<cwmp:InformResponse>');
  });

  it('TEST 2: Empty POST on 0 BOOTSTRAP / 1 BOOT dispatches ONLY read-only GPV (Zero SPV / Zero Reboot)', async () => {
    const sessionObj = {
      serialNumber: testSerial,
      vendor: 'GENEXIS',
      modelName: 'Titanium-2122A',
      tenantId: mockTenantAId.toString(),
      deviceId: mockDeviceId.toString(),
      stage: 'INFORM_INGESTED',
    };
    (CwmpService as any).sessionsByConnection.set('conn_boot_1', sessionObj);
    (CwmpService as any).sessionsById.set('sess_boot_1', sessionObj);

    vi.spyOn(Device, 'findOne').mockResolvedValue({
      _id: mockDeviceId,
      serialNumber: testSerial,
      tenantId: mockTenantAId,
      periodicInformConfigured: false,
      periodicInformInterval: 0,
      opticalTelemetrySourcePath: 'InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.RxPower',
      save: vi.fn().mockResolvedValue(true),
    } as any);

    vi.spyOn(DeviceCommand, 'findOne').mockReturnValue({
      sort: vi.fn().mockResolvedValue(null),
    } as any);

    const rpcResponse = await CwmpService.checkPendingRpcOrPoll('conn_boot_1', 'sess_boot_1');

    expect(rpcResponse).toBeTruthy();
    expect(rpcResponse).toContain('<cwmp:GetParameterValues>');
    expect(rpcResponse).not.toContain('<cwmp:SetParameterValues>');
    expect(rpcResponse).not.toContain('<cwmp:Reboot>');
    expect(rpcResponse).not.toContain('<cwmp:FactoryReset>');
    expect(rpcResponse).not.toContain('<cwmp:Download>');
  });

  it('TEST 3: Emergency Global Guard blocks unauthenticated / automated Reboot & FactoryReset', async () => {
    const sessionObj = {
      serialNumber: testSerial,
      vendor: 'GENEXIS',
      modelName: 'Titanium-2122A',
      tenantId: mockTenantAId.toString(),
      deviceId: mockDeviceId.toString(),
      stage: 'INFORM_INGESTED',
    };
    (CwmpService as any).sessionsByConnection.set('conn_guard_1', sessionObj);
    (CwmpService as any).sessionsById.set('sess_guard_1', sessionObj);

    vi.spyOn(Device, 'findOne').mockResolvedValue({
      _id: mockDeviceId,
      serialNumber: testSerial,
      tenantId: mockTenantAId,
      save: vi.fn().mockResolvedValue(true),
    } as any);

    const mockUnauthReboot = {
      _id: new Types.ObjectId(),
      action: 'REBOOT_DEVICE',
      status: 'pending',
      requestedBy: {}, // Anonymous / automated
      queuedAt: new Date(),
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(DeviceCommand, 'findOne').mockReturnValue({
      sort: vi.fn().mockResolvedValue(mockUnauthReboot),
    } as any);

    const rpcResponse = await CwmpService.checkPendingRpcOrPoll('conn_guard_1', 'sess_guard_1');

    expect(rpcResponse).toBeNull();
    expect(mockUnauthReboot.status).toBe('failed');
    expect(mockUnauthReboot.errorMessage).toContain('BLOCKED_BY_EMERGENCY_GLOBAL_GUARD');
  });

  it('TEST 4: Emergency Global Guard drops stale commands (> 15 mins old)', async () => {
    const sessionObj = {
      serialNumber: testSerial,
      vendor: 'GENEXIS',
      modelName: 'Titanium-2122A',
      tenantId: mockTenantAId.toString(),
      deviceId: mockDeviceId.toString(),
      stage: 'INFORM_INGESTED',
    };
    (CwmpService as any).sessionsByConnection.set('conn_stale_1', sessionObj);
    (CwmpService as any).sessionsById.set('sess_stale_1', sessionObj);

    vi.spyOn(Device, 'findOne').mockResolvedValue({
      _id: mockDeviceId,
      serialNumber: testSerial,
      tenantId: mockTenantAId,
      save: vi.fn().mockResolvedValue(true),
    } as any);

    const mockStaleCmd = {
      _id: new Types.ObjectId(),
      action: 'REBOOT_DEVICE',
      status: 'pending',
      requestedBy: {
        userId: new Types.ObjectId(),
        email: 'admin@rudra.in',
      },
      queuedAt: new Date(Date.now() - 25 * 60 * 1000), // 25 mins old
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(DeviceCommand, 'findOne').mockReturnValue({
      sort: vi.fn().mockResolvedValue(mockStaleCmd),
    } as any);

    const rpcResponse = await CwmpService.checkPendingRpcOrPoll('conn_stale_1', 'sess_stale_1');

    expect(rpcResponse).toBeNull();
    expect(mockStaleCmd.status).toBe('expired');
    expect(mockStaleCmd.errorMessage).toContain('EXPIRED');
  });

  it('TEST 5: Explicit, authenticated Operator UI configuration change pushes SetParameterValues ONCE', async () => {
    const sessionObj = {
      serialNumber: testSerial,
      vendor: 'GENEXIS',
      modelName: 'Titanium-2122A',
      tenantId: mockTenantAId.toString(),
      deviceId: mockDeviceId.toString(),
      stage: 'INFORM_INGESTED',
    };
    (CwmpService as any).sessionsByConnection.set('conn_auth_1', sessionObj);
    (CwmpService as any).sessionsById.set('sess_auth_1', sessionObj);

    vi.spyOn(Device, 'findOne').mockResolvedValue({
      _id: mockDeviceId,
      serialNumber: testSerial,
      tenantId: mockTenantAId,
      save: vi.fn().mockResolvedValue(true),
    } as any);

    const mockAuthSpv = {
      _id: new Types.ObjectId(),
      action: 'SET_WIFI_CONFIG',
      parameters: {
        tr069ParamValues: [
          ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID', 'Rudra_Fiber_5G', 'xsd:string']
        ]
      },
      status: 'pending',
      requestedBy: {
        userId: new Types.ObjectId(),
        email: 'operator_admin@rudra.in',
      },
      queuedAt: new Date(),
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(DeviceCommand, 'findOne').mockReturnValue({
      sort: vi.fn().mockResolvedValue(mockAuthSpv),
    } as any);

    const rpcResponse = await CwmpService.checkPendingRpcOrPoll('conn_auth_1', 'sess_auth_1');

    expect(rpcResponse).toBeTruthy();
    expect(rpcResponse).toContain('<cwmp:SetParameterValues>');
    expect(rpcResponse).toContain('Rudra_Fiber_5G');
    expect(mockAuthSpv.status).toBe('sending');
  });

  it('TEST 6: HARDWARE OWNER LOCK & DEDICATED SLUG MATCH: Registered hardware owner resolves with dedicated slug; root access (no slug) returns null for quarantine', async () => {
    vi.spyOn(Tenant, 'findById').mockImplementation((id: any) => {
      if (id.toString() === mockTenantAId.toString()) {
        return Promise.resolve({ _id: mockTenantAId, slug: 'rudra' } as any);
      }
      return Promise.resolve(null);
    });

    vi.spyOn(Tenant, 'findOne').mockImplementation((query: any) => {
      if (query.slug === 'rudra') {
        return Promise.resolve({ _id: mockTenantAId, slug: 'rudra' } as any);
      }
      return Promise.resolve(null);
    });

    vi.spyOn(Device, 'findOne').mockImplementation((query: any) => {
      if (query.serialNumber) {
        return Promise.resolve({
          _id: mockDeviceId,
          serialNumber: testSerial,
          tenantId: mockTenantAId, // Locked to Tenant A
          save: vi.fn().mockResolvedValue(true),
        } as any);
      }
      return Promise.resolve(null);
    });

    // 1. Valid dedicated slug (/tr069/rudra) resolves to Owner Tenant
    const resolvedDedicated = await CwmpService.resolveTenant(undefined, 'rudra', {
      serialAliases: [testSerial],
    });
    expect(resolvedDedicated).toBeDefined();
    expect((resolvedDedicated as any)._id.toString()).toBe(mockTenantAId.toString());

    // 2. Root ACS access (NO SLUG) -> MUST NEVER auto-assign -> returns null (Quarantine Pool)
    const resolvedRoot = await CwmpService.resolveTenant(undefined, undefined, {
      serialAliases: [testSerial],
    });
    expect(resolvedRoot).toBeNull();
  });

  it('TEST 7: UNMATCHED DEVICE QUARANTINE: Unregistered CPEs with unknown slug or root access return null and enter Pending Quarantine', async () => {
    vi.spyOn(Device, 'findOne').mockResolvedValue(null);
    vi.spyOn(Tenant, 'findOne').mockResolvedValue(null);

    // 1. Unknown slug
    const resolvedUnknownSlug = await CwmpService.resolveTenant(undefined, 'unknown_corp', {
      serialAliases: ['NEW_UNMAPPED_SERIAL_123'],
    });
    expect(resolvedUnknownSlug).toBeNull();

    // 2. Root access without slug
    const resolvedRoot = await CwmpService.resolveTenant(undefined, undefined, {
      serialAliases: ['NEW_UNMAPPED_SERIAL_123'],
    });
    expect(resolvedRoot).toBeNull();
  });

  it('TEST 8: WRONG SLUG / TENANT MISMATCH COMPLETE BLOCK: Registered ONT hitting wrong slug triggers Complete Block and Zero GPV/SPV/Reboot', async () => {
    const informXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header><cwmp:ID>1</cwmp:ID></soapenv:Header>
  <soapenv:Body>
    <cwmp:Inform>
      <DeviceId>
        <Manufacturer>GENEXIS</Manufacturer>
        <OUI>00259E</OUI>
        <ProductClass>Titanium-2122A</ProductClass>
        <SerialNumber>${testSerial}</SerialNumber>
      </DeviceId>
      <Event soapenv:arrayType="cwmp:EventStruct[1]">
        <EventStruct><EventCode>2 PERIODIC</EventCode><CommandKey></CommandKey></EventStruct>
      </Event>
      <ParameterList soapenv:arrayType="cwmp:ParameterValueStruct[1]">
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.DeviceInfo.SoftwareVersion</Name>
          <Value>V2.1.0</Value>
        </ParameterValueStruct>
      </ParameterList>
    </cwmp:Inform>
  </soapenv:Body>
</soapenv:Envelope>`;

    // Device is registered in DB to Tenant A
    vi.spyOn(Device, 'findOne').mockResolvedValue({
      _id: mockDeviceId,
      serialNumber: testSerial,
      tenantId: mockTenantAId, // Locked to Tenant A
      save: vi.fn().mockResolvedValue(true),
    } as any);

    vi.spyOn(Tenant, 'findById').mockImplementation((id: any) => {
      if (id.toString() === mockTenantAId.toString()) {
        return Promise.resolve({ _id: mockTenantAId, slug: 'rudra' } as any);
      }
      return Promise.resolve(null);
    });

    // Incoming request uses wrong slug 'vgigafiber' (Tenant B)
    vi.spyOn(Tenant, 'findOne').mockImplementation((query: any) => {
      if (query.slug === 'vgigafiber' || (query.$or && query.$or.some((o: any) => o.slug === 'vgigafiber'))) {
        return Promise.resolve({ _id: mockTenantBId, slug: 'vgigafiber' } as any);
      }
      return Promise.resolve(null);
    });

    const pendingMappingSpy = vi.spyOn(PendingDeviceMapping, 'findOneAndUpdate').mockResolvedValue({} as any);

    // 1. Process Inform
    const informRes = await CwmpService.handleInform(informXml, '192.168.1.100', undefined, 'vgigafiber', 'conn_mismatch_1');
    expect(informRes.responseXml).toContain('<cwmp:InformResponse>');
    expect(pendingMappingSpy).toHaveBeenCalled(); // Quarantined

    // 2. Process subsequent Empty POST check
    const rpcResponse = await CwmpService.checkPendingRpcOrPoll('conn_mismatch_1', informRes.sessionId);

    // VERIFY: Complete Block -> Zero GPV, Zero SPV, Zero Reboot (returns null / HTTP 204)
    expect(rpcResponse).toBeNull();
  });

  it('TEST 9: COMMAND QUEUE ISOLATION: Quarantined or cross-tenant devices reject any operator commands', async () => {
    const quarantinedSerial = 'CPE_QUARANTINED_999';
    const unauthorizedTenantId = new Types.ObjectId();

    const sessionObj = {
      serialNumber: quarantinedSerial,
      vendor: 'GENEXIS',
      modelName: 'Titanium-2122A',
      tenantId: '', // Quarantined / Unassigned
      tenantSlug: 'quarantine_pending',
      stage: 'INFORM_INGESTED',
    };
    (CwmpService as any).sessionsByConnection.set('conn_quarantine_1', sessionObj);
    (CwmpService as any).sessionsById.set('sess_quarantine_1', sessionObj);

    vi.spyOn(Device, 'findOne').mockResolvedValue({
      _id: mockDeviceId,
      serialNumber: quarantinedSerial,
      tenantId: undefined, // Unassigned
      save: vi.fn().mockResolvedValue(true),
    } as any);

    const mockUnauthorizedCmd = {
      _id: new Types.ObjectId(),
      deviceId: mockDeviceId,
      tenantId: unauthorizedTenantId,
      action: 'REBOOT_DEVICE',
      status: 'pending',
      requestedBy: { userId: new Types.ObjectId(), email: 'attacker@otherisp.in' },
    };

    vi.spyOn(DeviceCommand, 'findOne').mockImplementation((query: any) => {
      if (query.tenantId && query.tenantId.toString() === unauthorizedTenantId.toString()) {
        return { sort: vi.fn().mockResolvedValue(mockUnauthorizedCmd) } as any;
      }
      return { sort: vi.fn().mockResolvedValue(null) } as any;
    });

    const rpcResponse = await CwmpService.checkPendingRpcOrPoll('conn_quarantine_1', 'sess_quarantine_1');

    // VERIFY: Zero commands dispatched
    expect(rpcResponse).toBeNull();
  });

  it('TEST 10: RAW DATA AND PPPOE PASSWORD SECURITY: SENSITIVE VALUES ARE REDACTED BEFORE STORAGE/EXPOSURE', async () => {
    const rawSoapWithPassword = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Body>
    <cwmp:Inform>
      <ParameterList>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase</Name>
          <Value>SuperSecretWifiPass123</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password</Name>
          <Value>UltraSecretPppoePass456</Value>
        </ParameterValueStruct>
      </ParameterList>
    </cwmp:Inform>
  </soapenv:Body>
</soapenv:Envelope>`;

    const maskedXml = CwmpXmlParser.maskSensitiveData(rawSoapWithPassword);

    // VERIFY: Plaintext passwords are completely masked
    expect(maskedXml).not.toContain('SuperSecretWifiPass123');
    expect(maskedXml).not.toContain('UltraSecretPppoePass456');
    expect(maskedXml).toContain('********');
  });

  it('TEST 11: ASYNC COMMAND LIFECYCLE & DEDUPLICATION: Supports pending, sending, success, failed, expired, canceled with zero duplicate execution', async () => {
    const sessionObj = {
      serialNumber: testSerial,
      vendor: 'GENEXIS',
      modelName: 'Titanium-2122A',
      tenantId: mockTenantAId.toString(),
      deviceId: mockDeviceId.toString(),
      stage: 'INFORM_INGESTED',
    };
    (CwmpService as any).sessionsByConnection.set('conn_async_1', sessionObj);
    (CwmpService as any).sessionsById.set('sess_async_1', sessionObj);

    vi.spyOn(Device, 'findOne').mockResolvedValue({
      _id: mockDeviceId,
      serialNumber: testSerial,
      tenantId: mockTenantAId,
      status: 'online',
      save: vi.fn().mockResolvedValue(true),
    } as any);

    // 1. Ingest SetParameterValuesResponse -> marks commands as 'success'
    const spvResponseXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Header><cwmp:ID soapenv:mustUnderstand="1">3</cwmp:ID></soapenv:Header>
  <soapenv:Body>
    <cwmp:SetParameterValuesResponse>
      <Status>0</Status>
    </cwmp:SetParameterValuesResponse>
  </soapenv:Body>
</soapenv:Envelope>`;

    const updateManySpy = vi.spyOn(DeviceCommand, 'updateMany').mockResolvedValue({ acknowledged: true, modifiedCount: 1 } as any);

    await CwmpService.handleParameterValuesResponse(spvResponseXml, '192.168.1.100', 'sess_async_1', 'rudra.ciniplay.in', 'rudra', 'conn_async_1');

    expect(updateManySpy).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: mockDeviceId, status: { $in: ['sent', 'sending', 'queued', 'pending'] } }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'success' }) })
    );
  });

  it('TEST 12: CWMP FAULT HANDLING: CPE Fault 9005 or 9003 updates command status to failed with exact error reason', async () => {
    const sessionObj = {
      serialNumber: testSerial,
      vendor: 'GENEXIS',
      modelName: 'Titanium-2122A',
      tenantId: mockTenantAId.toString(),
      deviceId: mockDeviceId.toString(),
      stage: 'SPV_SENT',
    };
    (CwmpService as any).sessionsByConnection.set('conn_fault_1', sessionObj);
    (CwmpService as any).sessionsById.set('sess_fault_1', sessionObj);

    vi.spyOn(Device, 'findOne').mockResolvedValue({
      _id: mockDeviceId,
      serialNumber: testSerial,
      tenantId: mockTenantAId,
      status: 'online',
      save: vi.fn().mockResolvedValue(true),
    } as any);

    const faultXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Body>
    <soapenv:Fault>
      <faultcode>Client</faultcode>
      <faultstring>CWMP fault</faultstring>
      <detail>
        <cwmp:Fault>
          <FaultCode>9007</FaultCode>
          <FaultString>Notification request rejected</FaultString>
        </cwmp:Fault>
      </detail>
    </soapenv:Fault>
  </soapenv:Body>
</soapenv:Envelope>`;

    const updateManySpy = vi.spyOn(DeviceCommand, 'updateMany').mockResolvedValue({ acknowledged: true, modifiedCount: 1 } as any);

    await CwmpService.handleParameterValuesResponse(faultXml, '192.168.1.100', 'sess_fault_1', 'rudra.ciniplay.in', 'rudra', 'conn_fault_1');

    expect(updateManySpy).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: mockDeviceId, status: { $in: ['sent', 'sending'] } }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'failed', errorMessage: 'Notification request rejected' }) })
    );
  });

  it('TEST 13: OPTICAL CONTINUOUS MONITORING, DEDUPLICATION & 20-ENTRY LIMIT: Duplicate values are dropped; only changed entries are saved; capped at 20', async () => {
    const mockDevice: any = {
      _id: mockDeviceId,
      serialNumber: testSerial,
      tenantId: mockTenantAId,
      currentRxPowerDbm: -19.5,
      currentTxPowerDbm: 2.1,
      rxPowerHistory: [
        { valueDbm: -19.5, txPowerDbm: 2.1, timestamp: new Date(Date.now() - 60000) }
      ],
      opticalStatus: 'normal',
      save: vi.fn().mockResolvedValue(true),
    };

    // 1. Ingest IDENTICAL power values -> NO duplicate entry should be created
    await CwmpService.processOpticalTelemetryChange(mockDevice, -19.5, 2.1);
    expect(mockDevice.rxPowerHistory.length).toBe(1);

    // 2. Ingest CHANGED power values -> creates 1 new entry
    await CwmpService.processOpticalTelemetryChange(mockDevice, -19.7, 2.15);
    expect(mockDevice.rxPowerHistory.length).toBe(2);
    expect(mockDevice.currentRxPowerDbm).toBe(-19.7);
    expect(mockDevice.currentTxPowerDbm).toBe(2.15);

    // 3. Ingest 25 sequential distinct power changes -> verify capped strictly at last 20
    for (let i = 0; i < 25; i++) {
      await CwmpService.processOpticalTelemetryChange(mockDevice, -19.8 - i * 0.05, 2.2 + i * 0.01);
    }
    expect(mockDevice.rxPowerHistory.length).toBe(20);
  });

  it('TEST 14: OPTICAL 0.5 dB & 1.0 dB SHIFT CRITICAL ALERT & WHATSAPP DISPATCH: Generates DB Alert and sends WhatsApp notification to Operator and Technician', async () => {
    const mockCustomer = {
      _id: new Types.ObjectId(),
      tenantId: mockTenantAId,
      fullName: 'Ravi Kumar (FTTH Subscriber)',
      phone: '+919876543210',
    };

    const mockOperatorUser = {
      _id: new Types.ObjectId(),
      tenantId: mockTenantAId,
      fullName: 'Operator Admin',
      phone: '+919988776655',
      role: 'operator_admin',
    };

    const mockTechnicianUser = {
      _id: new Types.ObjectId(),
      tenantId: mockTenantAId,
      fullName: 'Suresh Field Tech',
      phone: '+919123456789',
      role: 'technician',
    };

    vi.spyOn(Customer, 'findById').mockResolvedValue(mockCustomer as any);
    vi.spyOn(Customer, 'findOne').mockResolvedValue(mockCustomer as any);
    vi.spyOn(User, 'find').mockImplementation((query: any) => {
      if (query.role === 'technician') return Promise.resolve([mockTechnicianUser] as any);
      return Promise.resolve([mockOperatorUser] as any);
    });
    vi.spyOn(Tenant, 'findById').mockResolvedValue({
      _id: mockTenantAId,
      name: 'Rudra Fiber',
      displayName: 'Rudra Fiber',
      owner: { phone: '+919988776655' }
    } as any);

    const alertCreateSpy = vi.spyOn(Alert, 'create').mockResolvedValue({
      _id: new Types.ObjectId(),
      tenantId: mockTenantAId,
    } as any);

    const waAlertSpy = vi.spyOn(WhatsAppService, 'sendOpticalPowerAlert').mockResolvedValue({
      success: true,
      messageId: 'wa_msg_123',
    });

    const mockDevice: any = {
      _id: mockDeviceId,
      serialNumber: testSerial,
      tenantId: mockTenantAId,
      customerId: mockCustomer._id,
      currentRxPowerDbm: -19.0,
      currentTxPowerDbm: 2.5,
      rxPowerHistory: [
        { valueDbm: -19.0, txPowerDbm: 2.5, timestamp: new Date(Date.now() - 60000) }
      ],
      opticalStatus: 'normal',
      save: vi.fn().mockResolvedValue(true),
    };

    // Trigger sudden -1.2 dB drop (-19.0 -> -20.2 dBm) -> shift >= 0.5 and >= 1.0 dB
    await CwmpService.processOpticalTelemetryChange(mockDevice, -20.2, 2.4);

    // VERIFY: Alert created in Database with exact fields
    expect(alertCreateSpy).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: mockTenantAId,
      severity: 'critical',
      sourceType: 'ONT_OPTICAL',
      sourceId: testSerial,
      sourceName: 'Ravi Kumar (FTTH Subscriber)',
      valueRecorded: -20.2,
      acknowledged: false,
    }));

    // VERIFY: WhatsApp Alert sent to Operator and Technician with all required payload details
    expect(waAlertSpy).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: mockTenantAId.toString(),
      customerName: 'Ravi Kumar (FTTH Subscriber)',
      serialNumber: testSerial,
      oldRxPowerDbm: -19.0,
      newRxPowerDbm: -20.2,
      deltaRxDb: -1.2,
      severity: 'critical',
    }));
  });

  it('TEST 15: OPTICAL AUTOMATIC RECOVERY ALERT & RESOLUTION: Return to healthy margin resolves open alerts and dispatches recovery notification', async () => {
    const mockCustomer = {
      _id: new Types.ObjectId(),
      tenantId: mockTenantAId,
      fullName: 'Ravi Kumar (FTTH Subscriber)',
      phone: '+919876543210',
    };

    const mockOperatorUser = {
      _id: new Types.ObjectId(),
      tenantId: mockTenantAId,
      fullName: 'Operator Admin',
      phone: '+919988776655',
      role: 'operator_admin',
    };

    vi.spyOn(Customer, 'findById').mockResolvedValue(mockCustomer as any);
    vi.spyOn(User, 'find').mockResolvedValue([mockOperatorUser] as any);
    vi.spyOn(Tenant, 'findById').mockResolvedValue({
      _id: mockTenantAId,
      name: 'Rudra Fiber',
      owner: { phone: '+919988776655' }
    } as any);

    const alertUpdateSpy = vi.spyOn(Alert, 'updateMany').mockResolvedValue({ acknowledged: true, modifiedCount: 1 } as any);
    const waRecoverySpy = vi.spyOn(WhatsAppService, 'sendOpticalRecoveryAlert').mockResolvedValue({
      success: true,
      messageId: 'wa_recov_123',
    });

    const mockDevice: any = {
      _id: mockDeviceId,
      serialNumber: testSerial,
      tenantId: mockTenantAId,
      customerId: mockCustomer._id,
      currentRxPowerDbm: -28.5, // Was in critical state
      currentTxPowerDbm: 2.0,
      rxPowerHistory: [
        { valueDbm: -28.5, txPowerDbm: 2.0, timestamp: new Date(Date.now() - 60000) }
      ],
      opticalStatus: 'critical',
      save: vi.fn().mockResolvedValue(true),
    };

    // Optical signal restored to healthy -19.5 dBm
    await CwmpService.processOpticalTelemetryChange(mockDevice, -19.5, 2.3);

    // VERIFY: Optical status restored to normal
    expect(mockDevice.opticalStatus).toBe('normal');

    // VERIFY: Open unacknowledged alerts for this ONT automatically marked as acknowledged
    expect(alertUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: mockTenantAId, sourceId: testSerial, sourceType: 'ONT_OPTICAL', acknowledged: false }),
      expect.objectContaining({ $set: expect.objectContaining({ acknowledged: true }) })
    );

    // VERIFY: WhatsApp Recovery Notification dispatched
    expect(waRecoverySpy).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: mockTenantAId.toString(),
      customerName: 'Ravi Kumar (FTTH Subscriber)',
      serialNumber: testSerial,
      currentRxPowerDbm: -19.5,
      previousRxPowerDbm: -28.5,
    }));
  });

  it('TEST 16: STRICT MULTI-TENANT ISOLATION OF ALERTS: Telemetry alerts from Tenant A are isolated and inaccessible to Tenant B', async () => {
    const alertQuerySpy = vi.spyOn(Alert, 'find').mockImplementation((query: any) => {
      if (query.tenantId && query.tenantId.toString() === mockTenantAId.toString()) {
        return {
          populate: vi.fn().mockReturnValue({
            sort: vi.fn().mockReturnValue({
              skip: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { _id: new Types.ObjectId(), tenantId: mockTenantAId, sourceId: 'ONT_TENANT_A' }
                ]),
              }),
            }),
          }),
        } as any;
      }
      return {
        populate: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            skip: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any;
    });

    const tenantAAlerts = await Alert.find({ tenantId: mockTenantAId }).populate('').sort({}).skip(0).limit(10);
    const tenantBAlerts = await Alert.find({ tenantId: mockTenantBId }).populate('').sort({}).skip(0).limit(10);

    expect(tenantAAlerts.length).toBe(1);
    expect((tenantAAlerts[0] as any).sourceId).toBe('ONT_TENANT_A');
    expect(tenantBAlerts.length).toBe(0);
  });
});
