import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { app } from '../src/index.js';
import { User } from '../src/models/User.js';
import { Tenant } from '../src/models/Tenant.js';
import { Device } from '../src/models/Device.js';
import { Customer } from '../src/models/Customer.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { generateToken } from '../src/middleware/auth.js';

describe('AI ISP OS — Final Role, Telemetry & Security Audit Test Suite', () => {
  let superAdminToken: string;
  let tenantA: any;
  let tenantB: any;
  let operatorAToken: string;
  let operatorBToken: string;
  let unassignedDeviceTenantA: any;
  let unassignedDeviceTenantB: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    // 1. Seed Super Admin User
    const superAdminUser = await User.findOneAndUpdate(
      { email: 'audit_superadmin@ai-ispos.com' },
      {
        email: 'audit_superadmin@ai-ispos.com',
        phone: '+919999999901',
        fullName: 'Audit Super Administrator',
        role: 'super_admin',
        permissions: ['SUPERADMIN_ALL'],
        status: 'active',
      },
      { upsert: true, new: true }
    );
    superAdminToken = generateToken({
      userId: superAdminUser._id.toString(),
      email: superAdminUser.email,
      role: 'super_admin',
      permissions: ['SUPERADMIN_ALL'],
    });

    // 2. Create Tenant A & Tenant B
    const slugA = `tenanta_${Date.now()}`;
    const slugB = `tenantb_${Date.now()}`;

    tenantA = await Tenant.create({
      name: 'Tenant Alpha ISP',
      displayName: 'Tenant Alpha',
      slug: slugA,
      subdomain: `${slugA}.ciniplay.in`,
      operatorKey: `opk_${slugA}`,
      owner: { name: 'Alpha Owner', email: 'owner@alpha.com', phone: '+919876540001' },
      status: 'active',
    });

    tenantB = await Tenant.create({
      name: 'Tenant Beta ISP',
      displayName: 'Tenant Beta',
      slug: slugB,
      subdomain: `${slugB}.ciniplay.in`,
      operatorKey: `opk_${slugB}`,
      owner: { name: 'Beta Owner', email: 'owner@beta.com', phone: '+919876540002' },
      status: 'active',
    });

    // 3. Create Operator Users for Tenant A and Tenant B
    const opUserA = await User.create({
      tenantId: tenantA._id,
      email: 'operator@alpha.com',
      phone: '+919876540001',
      fullName: 'Alpha Operator',
      role: 'operator_admin',
      permissions: ['CUSTOMER_ALL', 'DEVICE_ALL', 'GIS_ALL', 'AI_ALL', 'TECH_ALL'],
      status: 'active',
    });
    operatorAToken = generateToken({
      userId: opUserA._id.toString(),
      email: opUserA.email,
      role: 'operator_admin',
      tenantId: tenantA._id.toString(),
      permissions: ['CUSTOMER_ALL', 'DEVICE_ALL', 'GIS_ALL', 'AI_ALL', 'TECH_ALL'],
    });

    const opUserB = await User.create({
      tenantId: tenantB._id,
      email: 'operator@beta.com',
      phone: '+919876540002',
      fullName: 'Beta Operator',
      role: 'operator_admin',
      permissions: ['CUSTOMER_ALL', 'DEVICE_ALL', 'GIS_ALL', 'AI_ALL', 'TECH_ALL'],
      status: 'active',
    });
    operatorBToken = generateToken({
      userId: opUserB._id.toString(),
      email: opUserB.email,
      role: 'operator_admin',
      tenantId: tenantB._id.toString(),
      permissions: ['CUSTOMER_ALL', 'DEVICE_ALL', 'GIS_ALL', 'AI_ALL', 'TECH_ALL'],
    });

    // 4. Create Unassigned Devices for Tenant A and Tenant B
    unassignedDeviceTenantA = await Device.create({
      tenantId: tenantA._id,
      deviceIdStr: `dev_alpha_${Date.now()}`,
      serialNumber: `HWTC_ALPHA_${Date.now().toString().slice(-6)}`,
      macAddress: '00:E0:4C:11:22:33',
      manufacturer: 'Huawei',
      modelName: 'HG8145V5',
      protocol: 'TR-069',
      status: 'online',
      assigned: false,
      currentRxPowerDbm: -19.4,
      currentTxPowerDbm: 2.3,
      opticalStatus: 'normal',
      lastInform: new Date(),
    });

    unassignedDeviceTenantB = await Device.create({
      tenantId: tenantB._id,
      deviceIdStr: `dev_beta_${Date.now()}`,
      serialNumber: `HWTC_BETA_${Date.now().toString().slice(-6)}`,
      macAddress: '00:E0:4C:44:55:66',
      manufacturer: 'ZTE',
      modelName: 'F670L',
      protocol: 'TR-069',
      status: 'online',
      assigned: false,
      currentRxPowerDbm: -28.2, // Optical alert threshold test
      currentTxPowerDbm: 2.1,
      opticalStatus: 'warning',
      lastInform: new Date(),
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('1. SUPER ADMIN USER MANAGEMENT: /superadmin/users must display ONLY Super Administrators', async () => {
    const res = await request(app)
      .get('/api/v1/superadmin/users')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.users)).toBe(true);

    // Assert that every returned user has role === 'super_admin'
    for (const u of res.body.users) {
      expect(u.role).toBe('super_admin');
    }
  });

  it('2. TENANT MANAGEMENT: /superadmin/tenants returns authoritative subscriber, online, and reporting counts', async () => {
    const res = await request(app)
      .get('/api/v1/superadmin/tenants')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const tenantItem = res.body.tenants.find((t: any) => t._id === tenantA._id.toString());
    expect(tenantItem).toBeDefined();
    expect(tenantItem.stats).toBeDefined();
    expect(tenantItem.stats.subscribers).toBe(0);
    expect(tenantItem.stats.devices).toBeGreaterThanOrEqual(1);
    expect(tenantItem.stats.onlineDevices).toBeGreaterThanOrEqual(1);
    expect(tenantItem.stats.reportingDevices).toBeGreaterThanOrEqual(1);
  });

  it('3. OPERATOR DASHBOARD: /operator/dashboard/summary displays tenant-scoped authoritative metrics without fabrication', async () => {
    const res = await request(app)
      .get('/api/v1/operator/dashboard/summary')
      .set('Authorization', `Bearer ${operatorAToken}`)
      .set('x-tenant-slug', tenantA.slug);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.totalCustomers).toBe(0);
    expect(res.body.summary.totalDevices).toBe(1);
    expect(res.body.summary.onlineDevices).toBe(1);
    expect(res.body.summary.unassignedDevices).toBe(1);
    expect(res.body.summary.opticalWarnings).toBe(0); // -19.4 dBm is healthy
  });

  it('4. UNASSIGNED ONT WORKFLOW: Operator assigns unassigned ONT to new subscriber with full binding', async () => {
    const assignPayload = {
      fullName: 'Kiran Kumar Reddy',
      phone: '+919876543210',
      email: 'kiran@gmail.com',
      door: 'Flat 302',
      street: 'Hitech City Main Road',
      city: 'Hyderabad',
      pincode: '500081',
      planName: 'Fiber Ultra 100 Mbps Unlimited',
      downloadSpeedMbps: 100,
      uploadSpeedMbps: 100,
      monthlyFee: 699,
      startDate: '2026-08-23',
      endDate: '2026-09-22',
      pppoeUsername: 'kiran.reddy@alpha',
      pppoePassword: 'SecretPppoePassword123!',
      vlanId: 100,
    };

    const res = await request(app)
      .post(`/api/v1/operator/devices/${unassignedDeviceTenantA._id}/assign-subscriber`)
      .set('Authorization', `Bearer ${operatorAToken}`)
      .set('x-tenant-slug', tenantA.slug)
      .send(assignPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.customer.fullName).toBe('Kiran Kumar Reddy');
    expect(res.body.device.assigned).toBe(true);
    expect(res.body.device.customerId).toBe(res.body.customer._id);

    // Verify raw PPPoE password is NOT leaked in the response
    expect(res.body.customer.wanConfig.pppoePassword).toBeUndefined();
    expect(res.body.customer.wanConfig.pppoePasswordEncrypted).toBeUndefined();
    expect(res.body.customer.wanConfig.passwordConfigured).toBe(true);
    expect(res.body.customer.wanConfig.pppoePasswordMasked).toBe('••••••••');
  });

  it('5. SECURITY: Prevent duplicate ONT assignment (re-assigning already assigned device returns 409)', async () => {
    const res = await request(app)
      .post(`/api/v1/operator/devices/${unassignedDeviceTenantA._id}/assign-subscriber`)
      .set('Authorization', `Bearer ${operatorAToken}`)
      .set('x-tenant-slug', tenantA.slug)
      .send({
        fullName: 'Another Customer',
        phone: '+919998887776',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('already assigned');
  });

  it('6. TENANT ISOLATION: Operator A attempting to assign Tenant B device returns 403 Forbidden', async () => {
    const res = await request(app)
      .post(`/api/v1/operator/devices/${unassignedDeviceTenantB._id}/assign-subscriber`)
      .set('Authorization', `Bearer ${operatorAToken}`)
      .set('x-tenant-slug', tenantA.slug)
      .send({
        fullName: 'Cross Tenant Attacker',
        phone: '+919111222333',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Cross-tenant');
  });

  it('7. TENANT ISOLATION: Operator A attempting to inspect Tenant B device returns 404 (not in tenant context)', async () => {
    const res = await request(app)
      .get(`/api/v1/operator/devices/${unassignedDeviceTenantB._id}`)
      .set('Authorization', `Bearer ${operatorAToken}`)
      .set('x-tenant-slug', tenantA.slug);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('8. ONT INSPECTION: /operator/devices/:id redacts passwords and returns sanitized telemetry', async () => {
    const res = await request(app)
      .get(`/api/v1/operator/devices/${unassignedDeviceTenantA._id}`)
      .set('Authorization', `Bearer ${operatorAToken}`)
      .set('x-tenant-slug', tenantA.slug);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.device.serialNumber).toBe(unassignedDeviceTenantA.serialNumber);

    // Verify password sanitization
    expect(res.body.device.cwmpPassword).toBeUndefined();
    if (res.body.device.wanProfiles && res.body.device.wanProfiles[0]) {
      expect(res.body.device.wanProfiles[0].pppoePassword).toBeUndefined();
      expect(res.body.device.wanProfiles[0].pppoePasswordEncrypted).toBeUndefined();
      expect(res.body.device.wanProfiles[0].pppoePasswordMasked).toBe('••••••••');
    }
  });

  it('9. AUDIT LOGGING: All critical events create tamper-evident audit records', async () => {
    const auditLogs = await AuditLog.find({
      tenantId: tenantA._id,
      targetId: unassignedDeviceTenantA._id.toString(),
    });

    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
    const assignedLog = auditLogs.find((l) => l.action === 'ONT_ASSIGNED_TO_SUBSCRIBER');
    expect(assignedLog).toBeDefined();
    expect(assignedLog!.actorEmail).toBe('operator@alpha.com');
    expect(assignedLog!.actorRole).toBe('operator_admin');
    expect(assignedLog!.targetResource).toBe('Device');
  });

  it('10. OPTICAL ALERT THRESHOLDS: Operator B dashboard correctly detects optical threshold alert (< -27 dBm)', async () => {
    const res = await request(app)
      .get('/api/v1/operator/dashboard/summary')
      .set('Authorization', `Bearer ${operatorBToken}`)
      .set('x-tenant-slug', tenantB.slug);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.opticalWarnings).toBe(1); // Device B is -28.2 dBm
  });
});
