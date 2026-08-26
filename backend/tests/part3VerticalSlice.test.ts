import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { User } from '../src/models/User.js';
import { Customer } from '../src/models/Customer.js';
import { Device } from '../src/models/Device.js';
import { OLT, FiberNode } from '../src/models/FiberTopology.js';
import { DiagnosticsService } from '../src/services/diagnosticsService.js';
import { OpticalBudgetService } from '../src/services/opticalBudgetService.js';
import { AiTroubleshootingService } from '../src/services/aiTroubleshootingService.js';
import { recordAuditLog } from '../middleware/audit.js';

describe('AI ISP OS Part 3.1 — Master Production Vertical Slice E2E Test Suite', () => {
  let tenant: any;
  let operatorUser: any;
  let customer: any;
  let device: any;
  let centralOfficeNode: any;
  let fatNode: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    const rand = Date.now();
    // 1. Super Admin provisions Tenant
    tenant = await Tenant.create({
      name: `Apex Global Fiber Corp ${rand}`,
      slug: `apexglobal_${rand}`,
      subdomain: `apexglobal_${rand}.ai-ispos.com`,
      operatorKey: `opk_apex_global_${rand}`,
      owner: { name: 'Super Admin', email: `admin_${rand}@apexglobal.com`, phone: '123' },
    });

    // 2. Operator User setup
    operatorUser = await User.create({
      tenantId: tenant._id,
      fullName: 'NOC Lead Operator',
      email: `noc_${rand}@apexglobal.com`,
      phone: '+919988114455',
      passwordHash: 'argon2_hashed_secret',
      role: 'noc_operator',
      permissions: ['ALL'],
      status: 'active',
    });

    // 3. Topology Setup
    centralOfficeNode = await FiberNode.create({
      tenantId: tenant._id,
      nodeCode: `CO-PROD-${rand}`,
      name: 'Apex Central OLT Site',
      nodeType: 'CENTRAL_OFFICE',
      coordinates: { lat: 12.9352, lng: 77.6245 },
    });

    fatNode = await FiberNode.create({
      tenantId: tenant._id,
      nodeCode: `FAT-PROD-${rand}`,
      name: 'Koramangala FAT 01',
      nodeType: 'FAT_NAP_BOX',
      upstreamNodeId: centralOfficeNode._id,
      coordinates: { lat: 12.9365, lng: 77.6258 },
    });

    // 4. Device Binding
    device = await Device.create({
      tenantId: tenant._id,
      deviceIdStr: `ONT-PROD-${rand}`,
      serialNumber: `HWTC-PROD-${rand}`,
      macAddress: `AA:99:88:${(rand % 90 + 10)}:66:55`,
      status: 'online',
      currentRxPowerDbm: -21.2,
      currentTxPowerDbm: 2.4,
      uptimeSeconds: 86400,
    });

    // 5. Customer Creation
    customer = await Customer.create({
      tenantId: tenant._id,
      accountNumber: `ACC-PROD-${rand}`,
      serviceId: `SRV-PROD-${rand}`,
      fullName: 'Dr. Ramesh Sharma',
      phone: `+9199889${rand.toString().substring(8)}`,
      address: { street: '100ft Road', area: 'Koramangala', city: 'Bengaluru', pincode: '560034' },
      servicePlan: { name: 'Ultra Fiber 300M', downloadSpeedMbps: 300, monthlyFee: 1299 },
      assignedDeviceId: device._id,
      fiberDropInfo: { fatBoxNodeId: fatNode._id, portNumber: 2, dropCableLengthMeters: 45 },
      status: 'active',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('Step 1: System Readiness & Dependency Check', async () => {
    expect(tenant._id).toBeDefined();
    expect(operatorUser.role).toBe('noc_operator');
    expect(mongoose.connection.readyState).toBe(1);
  });

  it('Step 2: Operator executes diagnostic job and verifies normalized response', async () => {
    const diag = await DiagnosticsService.runDiagnostic({
      tenantId: tenant._id,
      deviceId: device._id,
      diagnosticType: 'PING',
      parameters: { host: '8.8.8.8', count: 4 },
    });

    expect(diag.status).toBe('COMPLETED');
    expect(diag.data.packetsReceived).toBe(4);
    expect(diag.data.packetLossPercent).toBe(0.0);
  });

  it('Step 3: Optical Budget Service calculates theoretical attenuation accurately', async () => {
    const budget = await OpticalBudgetService.calculateCustomerOpticalBudget(tenant._id, customer._id);

    expect(budget.fiberDistanceKm).toBeGreaterThan(0);
    expect(budget.splitterLossDb).toBe(10.5);
    expect(budget.expectedRxPowerDbm).toBeLessThan(0);
    expect(budget.observedRxPowerDbm).toBe(-21.2);
    expect(['OPTIMAL', 'DEGRADED']).toContain(budget.opticalHealthStatus);
  });

  it('Step 4: AI Troubleshooting engine evaluates customer state and issues structured diagnosis', async () => {
    const aiDiag = await AiTroubleshootingService.troubleshootCustomer(
      tenant._id,
      customer._id,
      'Checking broadband line health'
    );

    expect(aiDiag.summary).toContain('Dr. Ramesh Sharma');
    expect(aiDiag.observations.length).toBeGreaterThanOrEqual(2);
    expect(aiDiag.confidence).toBeDefined();
    expect(aiDiag.verification_plan).toBeDefined();
  });

  it('Step 5: Customer retrieves verified active broadband service in self-service portal', async () => {
    const custRecord = await Customer.findOne({ _id: customer._id, tenantId: tenant._id }).populate('assignedDeviceId');

    expect(custRecord).toBeDefined();
    expect(custRecord?.status).toBe('active');
    expect(custRecord?.servicePlan?.downloadSpeedMbps).toBe(300);
    expect((custRecord?.assignedDeviceId as any)?.status).toBe('online');
  });
});
