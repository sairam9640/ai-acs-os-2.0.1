import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { DeviceLabService } from '../src/services/deviceLabService.js';

describe('AI ISP OS Part 1.4 — Virtual CPE Lab & Certification Tests', () => {
  let tenant: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    tenant = await Tenant.create({
      name: 'Lab Test ISP',
      slug: 'labtest',
      subdomain: 'labtest.ai-ispos.com',
      operatorKey: 'opk_lab_test',
      owner: { name: 'Lab Lead', email: 'lab@test.com', phone: '123' },
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('Should simulate virtual CPE inform session and report normalized parameters', async () => {
    const result = await DeviceLabService.simulateCpeInform({
      tenantId: tenant._id,
      manufacturer: 'Huawei',
      modelName: 'HG8145V5',
      serialNumber: 'HWTC-LAB-9901',
      rxPowerDbm: -22.1,
    });

    expect(result.informStatus).toBe('COMPLETED');
    expect(result.serialNumber).toBe('HWTC-LAB-9901');
    expect(result.parametersReported['InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalRxPower']).toBe(-22.1);
  });

  it('Should certify Huawei vendor profile across all required CWMP capabilities', async () => {
    const cert = await DeviceLabService.certifyVendorProfile('Huawei');
    expect(cert.certificationStatus).toBe('CERTIFIED_COMPATIBLE');
    expect(cert.capabilitiesTested.tr069PeriodicInform).toBe(true);
    expect(cert.capabilitiesTested.dualBandWifiManagement).toBe(true);
    expect(cert.capabilitiesTested.wanProfileVlanProvisioning).toBe(true);
  });
});
