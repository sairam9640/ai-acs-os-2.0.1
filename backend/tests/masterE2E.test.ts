import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/index.js';
import { Tenant } from '../src/models/Tenant.js';
import { User } from '../src/models/User.js';
import { Customer } from '../src/models/Customer.js';
import { Device } from '../src/models/Device.js';
import { OLT, PONPort, FiberNode, FiberSegment } from '../src/models/FiberTopology.js';
import { ApprovalPolicy } from '../src/models/ApprovalPolicy.js';
import { InventoryItem } from '../src/models/InventoryItem.js';
import { generateToken } from '../src/middleware/auth.js';
import { FiberGisService } from '../src/services/fiberGisService.js';
import { OpticalMonitoringService } from '../src/services/opticalMonitoringService.js';
import { AIToolRegistry } from '../src/services/aiToolRegistry.js';
import { MessagingService } from '../src/services/messagingService.js';
import { MetricsService } from '../src/services/metricsService.js';

describe('AI ISP OS — Master E2E System Integration Test Suite (Documents 01–05)', () => {
  let superAdminToken: string;
  let operatorToken: string;
  let tenant: any;
  let olt: any;
  let ponPort: any;
  let fatNode: any;
  let splitterNode: any;
  let centralOfficeNode: any;
  let customer: any;
  let device: any;
  let inventoryItem: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    await Tenant.deleteMany({ slug: 'masterisp' });
    await User.deleteMany({ email: { $in: ['master.sa@ai-ispos.com', 'admin@masterisp.com'] } });

    // 1. Super Admin Principal
    const saUser = await User.create({
      email: 'master.sa@ai-ispos.com',
      phone: '+919000000000',
      fullName: 'Master Super Admin',
      role: 'super_admin',
      permissions: ['ALL'],
    });

    superAdminToken = generateToken({
      userId: saUser._id.toString(),
      email: saUser.email,
      role: saUser.role,
      permissions: ['ALL'],
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('Phase 1: Super Admin Provisions New ISP Tenant & Quota Entitlements', async () => {
    const res = await request(app)
      .post('/api/v1/superadmin/tenants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Master Broadband Network',
        displayName: 'Master Fiber',
        slug: 'masterisp',
        subdomain: 'masterisp.ai-ispos.com',
        operatorKey: 'opk_master_isp',
        plan: {
          code: 'enterprise',
          maxCustomers: 50000,
          maxDevices: 50000,
          maxTechnicians: 100,
        },
        owner: {
          name: 'Rajesh Kumar',
          email: 'rajesh@masterisp.com',
          phone: '+919845011223',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    tenant = res.body.tenant;
    expect(tenant.slug).toBe('masterisp');

    // Create Operator Admin User
    const opAdmin = await User.create({
      tenantId: tenant._id,
      email: 'admin@masterisp.com',
      phone: '+919845011223',
      fullName: 'Rajesh Kumar',
      role: 'operator_admin',
      permissions: ['ALL'],
    });

    operatorToken = generateToken({
      userId: opAdmin._id.toString(),
      email: opAdmin.email,
      role: opAdmin.role,
      tenantId: tenant._id.toString(),
      permissions: ['ALL'],
    });

    // Create Tenant Approval Policy
    await ApprovalPolicy.create({
      tenantId: tenant._id,
      requireApprovalForReboot: true,
      requireApprovalForWanDelete: true,
      requireApprovalForFirmware: true,
    });
  });

  it('Phase 2 & 6: Provision Physical Fiber GIS Topology (OLT -> Splitter -> FAT Box)', async () => {
    olt = await OLT.create({
      tenantId: tenant._id,
      name: 'Master Central OLT 01',
      model: 'Huawei MA5800-X7',
      ipAddress: '10.100.0.1',
      totalPonPorts: 16,
      coordinates: { lat: 12.9352, lng: 77.6245 },
    });

    ponPort = await PONPort.create({
      tenantId: tenant._id,
      oltId: olt._id,
      slotNumber: 0,
      portNumber: 1,
      name: 'PON 0/1',
      maxOnuCapacity: 64,
    });

    centralOfficeNode = await FiberNode.create({
      tenantId: tenant._id,
      nodeCode: 'CO-MASTER-01',
      name: 'Central Office Point',
      nodeType: 'CENTRAL_OFFICE',
      oltId: olt._id,
      coordinates: { lat: 12.9352, lng: 77.6245 },
    });

    splitterNode = await FiberNode.create({
      tenantId: tenant._id,
      nodeCode: 'SPL-MIG-01',
      name: 'Primary Optical Splitter (1:8)',
      nodeType: 'PRIMARY_SPLITTER',
      upstreamNodeId: centralOfficeNode._id,
      splitRatio: '1:8',
      coordinates: { lat: 12.9360, lng: 77.6255 },
    });

    fatNode = await FiberNode.create({
      tenantId: tenant._id,
      nodeCode: 'FAT-NAP-01',
      name: 'Pole FAT Box NAP-01',
      nodeType: 'FAT_NAP_BOX',
      upstreamNodeId: splitterNode._id,
      totalDropPorts: 16,
      usedDropPorts: 4,
      coordinates: { lat: 12.9370, lng: 77.6265 },
    });

    expect(fatNode.nodeCode).toBe('FAT-NAP-01');
  });

  it('Phase 3 & 4: Register Hardware Inventory Asset & Onboard Subscriber with ONT Binding', async () => {
    inventoryItem = await InventoryItem.create({
      tenantId: tenant._id,
      assetTag: 'AST-ONT-MASTER-01',
      itemType: 'GPON_ONT',
      vendor: 'Huawei',
      modelName: 'HG8145V5',
      serialNumber: 'HWTCE2E001',
      macAddress: 'AA:BB:CC:99:88:77',
      status: 'available',
      warehouseLocation: 'Central POP Warehouse',
    });

    device = await Device.create({
      tenantId: tenant._id,
      deviceIdStr: 'ONT-MASTER-01',
      serialNumber: inventoryItem.serialNumber,
      macAddress: inventoryItem.macAddress,
      manufacturer: 'Huawei',
      modelName: 'HG8145V5',
      status: 'online',
      currentRxPowerDbm: -21.2,
      currentTxPowerDbm: 2.1,
      oltId: olt._id,
      ponPortId: ponPort._id,
      wifi24: { ssid: 'Master_2.4G', password: 'pass', enabled: true, channel: 6, bandwidthMhz: 20 },
      wifi5g: { ssid: 'Master_5G', password: 'pass', enabled: true, channel: 36, bandwidthMhz: 80 },
    });

    const custRes = await request(app)
      .post('/api/v1/operator/customers')
      .set('Authorization', `Bearer ${operatorToken}`)
      .set('x-tenant-slug', 'masterisp')
      .send({
        fullName: 'Vikramaditya Sharma',
        phone: '+919876543210',
        email: 'vikram@masterisp.com',
        address: {
          street: '42 Orchid Boulevard',
          area: 'Koramangala',
          city: 'Bengaluru',
          pincode: '560034',
          coordinates: { lat: 12.9375, lng: 77.6270 },
        },
        servicePlan: {
          name: 'Master Gigabit Fiber',
          downloadSpeedMbps: 1000,
          monthlyFee: 1999,
        },
        wanConfig: {
          connectionType: 'PPPoE',
          pppoeUsername: 'vikram@masterisp',
          vlanId: 100,
        },
        fiberDropInfo: {
          fatBoxNodeId: fatNode._id,
          portNumber: 5,
          dropCableLengthMeters: 45,
        },
        assignedDeviceId: device._id,
      });

    expect(custRes.status).toBe(201);
    expect(custRes.body.success).toBe(true);
    customer = custRes.body.customer;
    expect(customer.accountNumber).toBeDefined();
  });

  it('Phase 6: Trace End-to-End Mapped Fiber Path (Customer -> FAT -> Splitter -> Central Office -> OLT)', async () => {
    const trace = await FiberGisService.traceCustomerRoute(customer._id);
    expect(trace.totalDistanceMeters).toBeGreaterThan(0);
    expect(trace.pathNodes.length).toBeGreaterThanOrEqual(3);
    expect(trace.pathNodes[0].name).toContain('Vikramaditya');
    expect(trace.pathNodes[1].nodeCode).toBe('FAT-NAP-01');
  });

  it('Phase 5: Ingest Optical Power Telemetry & Detect Anomaly Trajectory', async () => {
    // Normal reading
    const normalEval = await OpticalMonitoringService.evaluateOpticalTelemetry(device._id.toString(), -21.4);
    expect(normalEval.trajectory).toBe('OPTIMAL');

    // Sudden drop of 7.5 dB
    const dropEval = await OpticalMonitoringService.evaluateOpticalTelemetry(device._id.toString(), -28.9);
    expect(dropEval.trajectory).toBe('SUDDEN_DROP');
    expect(dropEval.alertTriggered).toBe(true);
  });

  it('Phase 8: AI Tool Registry Executes Safe Discovery & Intercepts Privileged Action in Approval Policy', async () => {
    // 1. Safe discovery tool
    const telemetryTool = await AIToolRegistry.executeTool({
      tenantId: tenant._id.toString(),
      toolName: 'getDeviceTelemetry',
      args: { deviceId: device._id.toString() },
      user: { id: 'usr_op', role: 'noc_operator', email: 'noc@masterisp.com' },
    });
    expect(telemetryTool.success).toBe(true);
    expect(telemetryTool.data.serialNumber).toBe('HWTCE2E001');

    // 2. Privileged action proposal
    const remediationTool = await AIToolRegistry.executeTool({
      tenantId: tenant._id.toString(),
      toolName: 'proposeRemediation',
      args: {
        actionType: 'REBOOT_DEVICE',
        targetId: device._id.toString(),
        targetResource: 'Device',
        targetIdentifier: device.serialNumber,
        reason: 'Signal recovery reboot after splice clean',
      },
      user: { id: 'usr_op', role: 'noc_operator', email: 'noc@masterisp.com' },
    });

    expect(remediationTool.success).toBe(true);
    expect(remediationTool.requiresHumanApproval).toBe(true);
    expect(remediationTool.data.approvalRequestId).toBeDefined();

    // 3. Admin authorizes the intercepted approval request
    const decideRes = await request(app)
      .post(`/api/v1/operator/approvals/${remediationTool.data.approvalRequestId}/decide`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .set('x-tenant-slug', 'masterisp')
      .send({
        decision: 'approved',
        notes: 'Approved by NOC Lead.',
      });

    expect(decideRes.status).toBe(200);
    expect(decideRes.body.request.status).toBe('approved');
  });

  it('Phase 9 & 10: Multi-Channel Messaging & Observability Metrics Verification', async () => {
    // Dispatch WhatsApp Notification
    const notif = await MessagingService.dispatchNotification({
      tenantId: tenant._id.toString(),
      recipient: {
        identifier: customer.phone,
        name: customer.fullName,
        type: 'CUSTOMER',
      },
      channel: 'WHATSAPP',
      templateCode: 'WIFI_CHANGED',
      variables: { customerName: customer.fullName },
    });

    expect(notif.status).toBe('delivered');
    expect(notif.contentRenderedSanitized).toContain('Vikramaditya');

    // Verify Prometheus Metrics
    MetricsService.recordHttpRequest(200);
    MetricsService.recordTelemetryIngest(5);
    const metricsText = MetricsService.getPrometheusText();
    expect(metricsText).toContain('http_requests_total');
    expect(metricsText).toContain('telemetry_samples_ingested_total');

    // Health Snapshot (Protected by Bearer Auth)
    const healthRes = await request(app)
      .get('/api/v1/health')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('UP');
    expect(healthRes.body.metrics.httpRequestsTotal).toBeGreaterThan(0);
  });
});
