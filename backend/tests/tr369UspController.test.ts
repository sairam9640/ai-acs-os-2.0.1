import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { UspService, IUspParameter } from '../src/services/uspService.js';
import { Device } from '../src/models/Device.js';
import { Tenant } from '../src/models/Tenant.js';

describe('TR-369 / USP Controller & TR-181 Device:2 Test Suite', () => {
  let tenantId: Types.ObjectId;
  const testEndpointId = 'proto::NOKIA-USP-998877665544';
  const testSerial = '998877665544';

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await Tenant.deleteMany({ slug: 'usp_test_tenant' });
    await Device.deleteMany({ serialNumber: testSerial });

    const tenant = await Tenant.create({
      name: 'USP Test Fibernet',
      displayName: 'USP Fibernet',
      slug: 'usp_test_tenant',
      subdomain: 'usptest.ciniplay.in',
      operatorKey: 'op_usp_test',
      status: 'active',
      owner: { name: 'USP Admin', email: 'uspadmin@test.com', phone: '+919999988888' },
      plan: { name: 'Enterprise', maxCustomers: 5000, maxDevices: 5000, maxTechnicians: 50, monthlyFee: 10000, currency: 'INR', billingCycle: 'monthly', features: [] },
      branding: { logoUrl: '', primaryColor: '#8b5cf6', secondaryColor: '#0f172a', companyName: 'USP Test', supportPhone: '', supportEmail: '', portalTitle: 'USP Portal' },
      featureEntitlements: { tr069Acs: true, tr369Usp: true, fiberGis: true, aiCommandCenter: true, technicianDispatch: true, customerApp: true, whatsappAlerts: true, opticalDiagnostics: true },
      opticalThresholds: { warningDbm: -24.5, criticalDbm: -27.0 },
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
    });
    tenantId = tenant._id;
  });

  afterAll(async () => {
    await Tenant.deleteMany({ slug: 'usp_test_tenant' });
    await Device.deleteMany({ serialNumber: testSerial });
  });

  it('1. USP Agent Registration & Message Ingestion into Normalized Device Model', async () => {
    const testParams: IUspParameter[] = [
      { path: 'Device.DeviceInfo.Manufacturer', value: 'Nokia' },
      { path: 'Device.DeviceInfo.ModelName', value: 'XS-2426G-A' },
      { path: 'Device.DeviceInfo.HardwareVersion', value: '3FE49344AAAA' },
      { path: 'Device.DeviceInfo.SoftwareVersion', value: '3FE49344IJHK12' },
      { path: 'Device.Ethernet.Interface.1.MACAddress', value: '00:E0:CA:99:88:77' },
      { path: 'Device.IP.Interface.1.IPv4Address.1.IPAddress', value: '100.64.40.10' },
      { path: 'Device.Optical.Interface.1.RxPower', value: '-20.5' },
      { path: 'Device.Optical.Interface.1.TxPower', value: '2.5' },
      { path: 'Device.Optical.Interface.1.TxBiasCurrent', value: '13.2' },
      { path: 'Device.Optical.Interface.1.Voltage', value: '3.3' },
      { path: 'Device.DeviceInfo.TemperatureStatus.TemperatureSensor.1.Value', value: '43' },
      { path: 'Device.DeviceInfo.ProcessStatus.CPUUsage', value: '15' },
      { path: 'Device.WiFi.SSID.1.SSID', value: 'Nokia-USP-2.4G' },
      { path: 'Device.WiFi.Radio.1.Channel', value: 1 },
      { path: 'Device.WiFi.SSID.2.SSID', value: 'Nokia-USP-5G' },
      { path: 'Device.WiFi.Radio.2.Channel', value: 36 },
      { path: 'Device.PPP.Interface.1.Username', value: 'nokia_user@usptest' },
      { path: 'Device.Ethernet.VLANTermination.1.VLANID', value: 150 },
      { path: 'Device.Hosts.HostNumberOfEntries', value: 4 },
    ];

    const result = await UspService.handleUspMessage(
      {
        endpointId: testEndpointId,
        msgType: 'REGISTER',
        parameters: testParams,
        mtp: 'HTTP',
      },
      '202.62.75.90',
      'usptest.ciniplay.in:7547'
    );

    expect(result.success).toBe(true);
    expect(result.serialNumber).toBe(testSerial);
    expect(result.sessionStatus).toBe('CONNECTED');

    const device = await Device.findOne({ serialNumber: testSerial });
    expect(device).toBeDefined();
    expect(device?.protocol).toBe('TR-369');
    expect(device?.manufacturer).toBe('Nokia');
    expect(device?.modelName).toBe('XS-2426G-A');
    expect(device?.currentRxPowerDbm).toBe(-20.5);
    expect(device?.currentTxPowerDbm).toBe(2.5);
    expect(device?.biasCurrentMa).toBe(13.2);
    expect(device?.opticalVoltageV).toBe(3.3);
    expect(device?.temperatureC).toBe(43);
    expect(device?.wifi24?.ssid).toBe('Nokia-USP-2.4G');
    expect(device?.wifi24?.channel).toBe(1);
    expect(device?.wifi5g?.ssid).toBe('Nokia-USP-5G');
    expect(device?.wifi5g?.channel).toBe(36);
    expect(device?.wanProfiles?.[0]?.pppoeUsername).toBe('nokia_user@usptest');
    expect(device?.wanProfiles?.[0]?.vlanId).toBe(150);
    expect(device?.lanHostCount).toBe(4);
  });

  it('2. TR-369 USP GET retrieves real TR-181 data model parameters', async () => {
    const requestedPaths = [
      'Device.DeviceInfo.Manufacturer',
      'Device.DeviceInfo.ModelName',
      'Device.Optical.Interface.1.RxPower',
      'Device.WiFi.SSID.1.SSID',
      'Device.WiFi.Radio.1.Channel',
      'Device.Ethernet.VLANTermination.1.VLANID',
    ];

    const getResult = await UspService.executeUspGet(testEndpointId, requestedPaths);

    expect(getResult['Device.DeviceInfo.Manufacturer']).toBe('Nokia');
    expect(getResult['Device.DeviceInfo.ModelName']).toBe('XS-2426G-A');
    expect(Number(getResult['Device.Optical.Interface.1.RxPower'])).toBe(-20.5);
    expect(getResult['Device.WiFi.SSID.1.SSID']).toBe('Nokia-USP-2.4G');
    expect(Number(getResult['Device.WiFi.Radio.1.Channel'])).toBe(1);
    expect(Number(getResult['Device.Ethernet.VLANTermination.1.VLANID'])).toBe(150);
  });

  it('3. TR-369 USP SET executes parameter mutation with 2-Phase Fresh Verification GET', async () => {
    const updates = {
      'Device.WiFi.SSID.1.SSID': 'Nokia-USP-Custom-2.4G',
      'Device.WiFi.Radio.1.Channel': 6,
      'Device.Ethernet.VLANTermination.1.VLANID': 250,
    };

    const setResult = await UspService.executeUspSet(testEndpointId, updates, 'test_usp_corr_01');

    expect(setResult.success).toBe(true);
    expect(setResult.appliedChanges['Device.WiFi.SSID.1.SSID'].new).toBe('Nokia-USP-Custom-2.4G');
    expect(setResult.appliedChanges['Device.WiFi.Radio.1.Channel'].new).toBe(6);

    // Verify Fresh Verification Read (GET) contains the mutated values directly from parameter tree
    expect(setResult.freshVerification['Device.WiFi.SSID.1.SSID']).toBe('Nokia-USP-Custom-2.4G');
    expect(setResult.freshVerification['Device.WiFi.Radio.1.Channel']).toBe(6);
    expect(setResult.freshVerification['Device.Ethernet.VLANTermination.1.VLANID']).toBe(250);

    // Verify normalized device in DB reflects the updated values
    const updatedDevice = await Device.findOne({ serialNumber: testSerial });
    expect(updatedDevice?.wifi24?.ssid).toBe('Nokia-USP-Custom-2.4G');
    expect(updatedDevice?.wifi24?.channel).toBe(6);
    expect(updatedDevice?.wanProfiles?.[0]?.vlanId).toBe(250);
  });

  it('4. Failure Handling: Offline Agent or Unknown Endpoint ID returns graceful error', async () => {
    const setResult = await UspService.executeUspSet('proto::NON-EXISTENT-ENDPOINT', {
      'Device.WiFi.SSID.1.SSID': 'Test',
    });

    expect(setResult.success).toBe(false);
    expect(setResult.error).toContain('not found in database');
  });
});
