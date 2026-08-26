import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { Customer } from '../src/models/Customer.js';
import { Device } from '../src/models/Device.js';
import { OLT, PONPort, FiberNode } from '../src/models/FiberTopology.js';
import { OpticalBudgetService } from '../src/services/opticalBudgetService.js';
import { OtdrLocalizationService } from '../src/services/otdrLocalizationService.js';
import { TopologyValidationService } from '../src/services/topologyValidationService.js';

describe('AI ISP OS Part 2.4 — Fiber GIS Engineering, Optical Budget & OTDR Tests', () => {
  let tenant: any;
  let olt: any;
  let centralOfficeNode: any;
  let splitterNode: any;
  let fatNode: any;
  let customer: any;
  let device: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    tenant = await Tenant.create({
      name: 'Fiber Eng Test ISP',
      slug: 'fibereng',
      subdomain: 'fibereng.ai-ispos.com',
      operatorKey: 'opk_fiber_eng',
      owner: { name: 'Fiber Lead', email: 'fiber@test.com', phone: '123' },
    });

    olt = await OLT.create({
      tenantId: tenant._id,
      name: 'Eng OLT 01',
      code: 'OLT-ENG-01',
      vendor: 'Huawei',
      modelName: 'MA5800',
      ipAddress: '10.200.0.1',
      totalPonPorts: 16,
      location: { lat: 12.9352, lng: 77.6245, address: 'Eng Central Office' },
    });

    centralOfficeNode = await FiberNode.create({
      tenantId: tenant._id,
      nodeCode: 'CO-ENG-01',
      name: 'Eng Central Office',
      type: 'CENTRAL_OFFICE',
      oltId: olt._id,
      location: { lat: 12.9352, lng: 77.6245, address: 'Eng Central Office' },
    });

    splitterNode = await FiberNode.create({
      tenantId: tenant._id,
      nodeCode: 'SPL-ENG-01',
      name: 'Primary 1:8 Splitter',
      type: 'PRIMARY_SPLITTER',
      upstreamNodeId: centralOfficeNode._id,
      location: { lat: 12.9360, lng: 77.6255, address: 'Splitter 1:8 Pole' },
    });

    fatNode = await FiberNode.create({
      tenantId: tenant._id,
      nodeCode: 'FAT-ENG-01',
      name: 'Pole FAT NAP-01',
      type: 'FAT_NAP_BOX',
      upstreamNodeId: splitterNode._id,
      location: { lat: 12.9370, lng: 77.6265, address: 'Pole FAT NAP-01' },
    });

    device = await Device.create({
      tenantId: tenant._id,
      deviceIdStr: 'ONT-ENG-01',
      serialNumber: 'HWTC-ENG-01',
      macAddress: 'AA:11:22:99:88:77',
      status: 'online',
      currentRxPowerDbm: -20.8,
    });

    customer = await Customer.create({
      tenantId: tenant._id,
      accountNumber: 'ACC-FIBER-001',
      serviceId: 'SRV-FIBER-001',
      fullName: 'Fiber Budget Subscriber',
      phone: '+919988001122',
      address: { street: '1st Cross', area: 'Koramangala', city: 'Bengaluru', pincode: '560034' },
      fiberDropInfo: { fatBoxNodeId: fatNode._id, portNumber: 1, dropCableLengthMeters: 50 },
      assignedDeviceId: device._id,
      status: 'active',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('Should calculate theoretical optical budget and compare against observed ONT RX power', async () => {
    const budget = await OpticalBudgetService.calculateCustomerOpticalBudget(tenant._id, customer._id);

    expect(budget.fiberDistanceKm).toBeGreaterThan(0);
    expect(budget.splitterLossDb).toBe(10.5); // 1:8 splitter
    expect(budget.connectorSpliceLossDb).toBe(0.70);
    expect(budget.totalTheoreticalLossDb).toBeGreaterThan(12.0);
    expect(budget.observedRxPowerDbm).toBe(-20.8);
    expect(budget.opticalHealthStatus).toBe('OPTIMAL');
  });

  it('Should project OTDR fault distance along route with uncertainty radius', async () => {
    const projection = await OtdrLocalizationService.localizeFiberBreak({
      tenantId: tenant._id,
      startNodeId: centralOfficeNode._id,
      measuredDistanceMeters: 450,
      estimatedLossDb: 22.0,
    });

    expect(projection.measuredDistanceMeters).toBe(450);
    expect(projection.uncertaintyRadiusMeters).toBe(25.0);
    expect(projection.projectedCoordinates.lat).toBeGreaterThan(12.935);
    expect(projection.nearestAccessPoint.nodeCode).toBe('SPL-ENG-01');
  });

  it('TopologyValidationService should compute quality score and identify complete network integrity', async () => {
    const quality = await TopologyValidationService.evaluateTopologyQuality(tenant._id);

    expect(quality.totalNodes).toBeGreaterThanOrEqual(3);
    expect(quality.dataQualityScore).toBeGreaterThanOrEqual(90);
    expect(quality.grade).toBe('EXCELLENT');
  });
});
