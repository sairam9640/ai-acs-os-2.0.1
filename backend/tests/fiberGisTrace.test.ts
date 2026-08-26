import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { Customer } from '../src/models/Customer.js';
import { Device } from '../src/models/Device.js';
import { OLT, PONPort, FiberNode, FiberSegment } from '../src/models/FiberTopology.js';
import { FiberGisService } from '../src/services/fiberGisService.js';

describe('AI ISP OS — Fiber GIS Topology, Routing & Fault Correlation Engine', () => {
  let tenant: any;
  let customer: any;
  let fatBox: any;
  let primarySplitter: any;
  let centralOffice: any;
  let olt: any;
  let ponPort: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    tenant = await Tenant.create({
      name: 'GIS Test Tenant',
      displayName: 'GIS Fiber',
      slug: 'gistest',
      subdomain: 'gistest.ai-ispos.com',
      operatorKey: 'opk_gis_test',
      owner: { name: 'GIS Lead', email: 'gis@test.com', phone: '123' },
    });

    olt = await OLT.create({
      tenantId: tenant._id,
      name: 'Central OLT Chassis',
      code: 'OLT-01',
      ipAddress: '10.10.1.1',
      totalSlots: 4,
      totalPonPorts: 16,
      location: { name: 'Exchange', lat: 12.93, lng: 77.62, address: 'Central Exchange' },
    });

    ponPort = await PONPort.create({
      tenantId: tenant._id,
      oltId: olt._id,
      slotNumber: 1,
      portNumber: 1,
      portIdentifier: '0/1/1',
      txPowerDbm: 5.0,
    });

    centralOffice = await FiberNode.create({
      tenantId: tenant._id,
      nodeCode: 'CO-01',
      name: 'Central ODF',
      type: 'CENTRAL_OFFICE',
      location: { lat: 12.93, lng: 77.62, address: 'Exchange' },
      oltId: olt._id,
    });

    primarySplitter = await FiberNode.create({
      tenantId: tenant._id,
      nodeCode: 'SPL-01',
      name: 'Splitter 1:8',
      type: 'PRIMARY_SPLITTER',
      location: { lat: 12.932, lng: 77.624, address: 'Junction' },
      upstreamNodeId: centralOffice._id,
      ponPortId: ponPort._id,
    });

    fatBox = await FiberNode.create({
      tenantId: tenant._id,
      nodeCode: 'FAT-01',
      name: 'FAT Box 01',
      type: 'FAT_NAP_BOX',
      location: { lat: 12.934, lng: 77.626, address: 'Pole #1' },
      upstreamNodeId: primarySplitter._id,
      ponPortId: ponPort._id,
    });

    // Cable segments
    await FiberSegment.create({
      tenantId: tenant._id,
      cableCode: 'CABLE-FEED-01',
      name: 'Feeder Cable',
      category: 'FEEDER',
      totalCores: 24,
      liveCores: 12,
      darkCores: 12,
      fromNodeId: centralOffice._id,
      toNodeId: primarySplitter._id,
      lengthMeters: 500,
      measuredLossDb: 0.2,
      coordinates: [{ lat: 12.93, lng: 77.62 }, { lat: 12.932, lng: 77.624 }],
    });

    await FiberSegment.create({
      tenantId: tenant._id,
      cableCode: 'CABLE-DIST-01',
      name: 'Distribution Cable',
      category: 'DISTRIBUTION',
      totalCores: 12,
      liveCores: 6,
      darkCores: 6,
      fromNodeId: primarySplitter._id,
      toNodeId: fatBox._id,
      lengthMeters: 300,
      measuredLossDb: 0.15,
      coordinates: [{ lat: 12.932, lng: 77.624 }, { lat: 12.934, lng: 77.626 }],
    });

    const device = await Device.create({
      tenantId: tenant._id,
      deviceIdStr: 'ONT-GIS-01',
      serialNumber: 'HWTCGIS001',
      macAddress: 'AA:11:22:33:44:55',
      currentRxPowerDbm: -21.2,
    });

    customer = await Customer.create({
      tenantId: tenant._id,
      accountNumber: 'CUST-GIS-001',
      serviceId: 'SRV-GIS-001',
      fullName: 'Anita Roy',
      phone: '+919876500002',
      address: {
        street: 'Lake Road',
        area: 'Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
        coordinates: { lat: 12.936, lng: 77.628 },
      },
      assignedDeviceId: device._id,
      fiberDropInfo: {
        fatBoxId: fatBox._id,
        fatPortNumber: 1,
        dropCableLengthMeters: 60,
        splitterId: primarySplitter._id,
        ponPortId: ponPort._id,
        oltId: olt._id,
      },
      servicePlan: {
        name: 'GigaFast 200 Mbps',
        monthlyFee: 799,
        downloadSpeedMbps: 200,
        uploadSpeedMbps: 200,
      },
    });
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: tenant._id });
    await Customer.deleteMany({ tenantId: tenant._id });
    await Device.deleteMany({ tenantId: tenant._id });
    await OLT.deleteMany({ tenantId: tenant._id });
    await PONPort.deleteMany({ tenantId: tenant._id });
    await FiberNode.deleteMany({ tenantId: tenant._id });
    await FiberSegment.deleteMany({ tenantId: tenant._id });
    await mongoose.disconnect();
  });

  it('Trace Customer Route should trace from Customer -> ONT -> FAT Box -> Splitter -> PON -> OLT', async () => {
    const trace = await FiberGisService.traceCustomerRoute(customer._id.toString());
    expect(trace).toBeDefined();
    expect(trace.customerId).toBe(customer._id.toString());
    expect(trace.pathNodes.length).toBeGreaterThanOrEqual(6);

    const types = trace.pathNodes.map((n: any) => n.nodeType);
    expect(types).toContain('CUSTOMER_PREMISE');
    expect(types).toContain('ONT_DEVICE');
    expect(types).toContain('FAT_NAP_BOX');
    expect(types).toContain('PRIMARY_SPLITTER');
    expect(types).toContain('PON_PORT');
    expect(types).toContain('OLT_CHASSIS');

    expect(trace.isFullyLinked).toBe(true);
    expect(trace.totalDistanceMeters).toBeGreaterThan(0);
  });

  it('Reverse Fault Impact should identify affected subscriber when FAT Box or Splitter fails', async () => {
    const impact = await FiberGisService.calculateFaultImpact(
      tenant._id.toString(),
      'FIBER_NODE',
      fatBox._id.toString()
    );

    expect(impact).toBeDefined();
    expect(impact.totalImpactedCustomers).toBe(1);
    expect(impact.impactedCustomers[0].accountNumber).toBe('CUST-GIS-001');
    expect(impact.totalMonthlyRevenueAtRisk).toBe(799);
  });

  it('Universal trace should support search by ONT Serial, MAC Address, FAT Code, Splitter, and OLT', async () => {
    // Trace by ONT Serial
    const ontTrace = await FiberGisService.traceElement(tenant._id.toString(), 'HWTCGIS001', 'ont');
    expect(ontTrace).toBeDefined();
    expect(ontTrace.matchedTarget.type).toBe('ONT');
    expect(ontTrace.pathNodes.length).toBeGreaterThan(0);

    // Trace by MAC
    const macTrace = await FiberGisService.traceElement(tenant._id.toString(), 'AA:11:22:33:44:55', 'mac');
    expect(macTrace).toBeDefined();
    expect(macTrace.matchedTarget.type).toBe('MAC');

    // Trace by FAT Node Code
    const fatTrace = await FiberGisService.traceElement(tenant._id.toString(), 'FAT-01', 'fat');
    expect(fatTrace).toBeDefined();
    expect(fatTrace.matchedTarget.type).toBe('FAT_NODE');

    // Trace by Splitter Code
    const splTrace = await FiberGisService.traceElement(tenant._id.toString(), 'SPL-01', 'splitter');
    expect(splTrace).toBeDefined();
    expect(splTrace.matchedTarget.type).toBe('SPLITTER');

    // Trace by OLT Code
    const oltTrace = await FiberGisService.traceElement(tenant._id.toString(), 'OLT-01', 'olt');
    expect(oltTrace).toBeDefined();
    expect(oltTrace.matchedTarget.type).toBe('OLT');
  });

  it('Zero Fake Data policy should return NOT_CONFIGURED for unlinked hops without inventing fake links', async () => {
    const unlinkedCust = await Customer.create({
      tenantId: tenant._id,
      accountNumber: 'CUST-UNLINKED-01',
      serviceId: 'SRV-UNLINKED-01',
      fullName: 'Unlinked Subscriber',
      phone: '9999900000',
      email: 'unlinked@test.com',
      serviceAddress: 'Sector 9 Remote Road',
      planId: 'plan-basic',
      billing: { monthlyRate: 799, currency: 'INR', dueDay: 5 },
      status: 'active',
      fiberDropInfo: {
        dropCableLengthMeters: 25,
      },
    });

    const trace = await FiberGisService.traceElement(tenant._id.toString(), unlinkedCust.accountNumber, 'customer');
    expect(trace).toBeDefined();
    expect(trace.isFullyLinked).toBe(false);

    // Find the FAT hop
    const fatHop = trace.pathNodes.find((n: any) => n.nodeType === 'FAT_NAP_BOX');
    expect(fatHop).toBeDefined();
    expect(fatHop.isConfigured).toBe(false);
    expect(fatHop.status).toBe('NOT_CONFIGURED');
    expect(fatHop.nodeCode).toBe('Not Configured');

    await Customer.deleteOne({ _id: unlinkedCust._id });
  });

  it('Should accurately compute dark fiber cores and core utilization metrics', async () => {
    const layers = await FiberGisService.getMapLayers(tenant._id.toString());
    expect(layers.summary).toBeDefined();
    expect(layers.summary.totalSegments).toBeGreaterThan(0);
    expect(layers.summary.coreMetrics).toBeDefined();
    expect(layers.summary.coreMetrics.totalCores).toBe(36); // 24 feeder + 12 dist
    expect(layers.summary.coreMetrics.liveCores).toBe(18);  // 12 feeder + 6 dist
    expect(layers.summary.coreMetrics.darkCores).toBe(18);  // 36 - 18
    expect(layers.summary.coreMetrics.utilizationPercent).toBe(50);
  });

  it('Should strictly enforce multi-tenant isolation on GIS layers and universal trace', async () => {
    const otherTenant = await Tenant.create({
      name: 'Rival ISP Ltd',
      slug: 'rivalisp',
      subdomain: 'rival.ai-ispos.com',
      operatorKey: 'opk_rival_gis',
      owner: { name: 'Rival', email: 'rival@test.com', phone: '000' },
    });

    // Empty tenant gets empty layers with zero fake data
    const rivalLayers = await FiberGisService.getMapLayers(otherTenant._id.toString());
    expect(rivalLayers.olts.length).toBe(0);
    expect(rivalLayers.nodes.length).toBe(0);
    expect(rivalLayers.segments.length).toBe(0);
    expect(rivalLayers.customers.length).toBe(0);
    expect(rivalLayers.summary.totalOlts).toBe(0);

    // Rival cannot trace tenant's customer
    await expect(
      FiberGisService.traceElement(otherTenant._id.toString(), customer.accountNumber, 'customer')
    ).rejects.toThrow();

    await Tenant.deleteOne({ _id: otherTenant._id });
  });
});
