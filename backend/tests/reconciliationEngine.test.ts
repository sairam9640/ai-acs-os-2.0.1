import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { Device } from '../src/models/Device.js';
import { Customer } from '../src/models/Customer.js';
import { ReconciliationEngineService } from '../src/services/reconciliationEngineService.js';

describe('AI ISP OS Part 1.6 — Three-Way Data Reconciliation Engine Tests', () => {
  let tenant: any;
  let orphanedDevice: any;
  let degradedDevice: any;
  let overdueCustomer: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    tenant = await Tenant.create({
      name: 'Reconciliation Test ISP',
      slug: 'recontest',
      subdomain: 'recontest.ai-ispos.com',
      operatorKey: 'opk_recon_test',
      owner: { name: 'Recon Lead', email: 'recon@test.com', phone: '123' },
    });

    // 1. Orphaned online ONT (Active session, no customer binding)
    orphanedDevice = await Device.create({
      tenantId: tenant._id,
      deviceIdStr: 'ONT-ORPHAN-01',
      serialNumber: 'HWTC-ORPHAN-01',
      macAddress: 'CC:AA:11:22:33:44',
      status: 'online',
      currentRxPowerDbm: -21.0,
    });

    // 2. Degraded ONT (Optical Power < -27.0 dBm)
    degradedDevice = await Device.create({
      tenantId: tenant._id,
      deviceIdStr: 'ONT-DEGRADED-01',
      serialNumber: 'HWTC-DEGRADED-01',
      macAddress: 'CC:AA:11:22:33:55',
      status: 'online',
      currentRxPowerDbm: -29.4,
    });

    // 3. Customer with active status but overdue billing
    overdueCustomer = await Customer.create({
      tenantId: tenant._id,
      accountNumber: 'ACC-OVERDUE-01',
      serviceId: 'SRV-OVERDUE-01',
      fullName: 'Overdue Subscriber',
      phone: '+919988776655',
      address: { street: '1st Ave', area: 'Central', city: 'Bengaluru', pincode: '560001' },
      servicePlan: {
        name: 'Fiber 100M',
        downloadSpeedMbps: 100,
        uploadSpeedMbps: 100,
        monthlyFee: 699,
        billingStatus: 'overdue',
      },
      status: 'active',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('Should run full audit and detect orphaned devices, optical drift, and billing discrepancies', async () => {
    const report = await ReconciliationEngineService.runFullAudit(tenant._id);

    expect(report.tenantId).toBe(tenant._id.toString());
    expect(report.totalDevicesAudited).toBeGreaterThanOrEqual(2);
    expect(report.totalCustomersAudited).toBeGreaterThanOrEqual(1);
    expect(report.mismatchesDetected).toBeGreaterThanOrEqual(3);

    const orphanMismatch = report.mismatches.find((m) => m.resourceIdentifier === 'HWTC-ORPHAN-01');
    expect(orphanMismatch).toBeDefined();
    expect(orphanMismatch?.category).toBe('DEVICE_INVENTORY');
    expect(orphanMismatch?.severity).toBe('HIGH');

    const driftMismatch = report.mismatches.find((m) => m.resourceIdentifier === 'HWTC-DEGRADED-01' && m.category === 'OPTICAL_DRIFT');
    expect(driftMismatch).toBeDefined();
    expect(driftMismatch?.category).toBe('OPTICAL_DRIFT');

    const billingMismatch = report.mismatches.find((m) => m.resourceIdentifier === 'ACC-OVERDUE-01');
    expect(billingMismatch).toBeDefined();
    expect(billingMismatch?.category).toBe('BILLING_SUBSCRIPTION');
  });
});
