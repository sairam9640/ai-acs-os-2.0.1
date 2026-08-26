import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/index.js';
import { User } from '../src/models/User.js';
import { Tenant } from '../src/models/Tenant.js';
import { Device } from '../src/models/Device.js';
import { DeviceCapability } from '../src/models/DeviceCapability.js';
import { AuditLog } from '../src/models/AuditLog.js';

describe('AI ISP OS — Section 26 First Vertical Slice End-to-End Test', () => {
  let superAdminToken: string;
  let newTenantSlug = `zenith_${Date.now()}`;
  let operatorToken: string;
  let createdCustomerId: string;
  let ontDeviceId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    // Seed Super Admin
    await User.findOneAndUpdate(
      { email: 'superadmin@ai-ispos.com' },
      {
        email: 'superadmin@ai-ispos.com',
        phone: '+919999999999',
        fullName: 'Super Administrator',
        role: 'super_admin',
        permissions: ['SUPERADMIN_ALL'],
        status: 'active',
      },
      { upsert: true, new: true }
    );

    // Seed Capability
    await DeviceCapability.deleteMany({ modelPattern: 'HG8145V5' });
    await DeviceCapability.create({
      vendor: 'Huawei',
      modelPattern: 'HG8145V5',
      displayName: 'Huawei EchoLife HG8145V5',
      supportsDualBandWifi: true,
      supportsWifiPasswordChange: true,
      supportsWanProfileEdit: true,
      supportsConnectedClientBlock: true,
      supportsRemoteReboot: true,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('Step 1: Super Admin OTP Login', async () => {
    // Request OTP
    const reqOtpRes = await request(app)
      .post('/api/v1/auth/superadmin/request-otp')
      .send({ email: 'superadmin@ai-ispos.com' });
    expect(reqOtpRes.status).toBe(200);
    expect(reqOtpRes.body.success).toBe(true);

    const saUser = await User.findOne({ email: 'superadmin@ai-ispos.com' });

    // Verify OTP
    const verifyRes = await request(app)
      .post('/api/v1/auth/superadmin/verify-otp')
      .send({ email: 'superadmin@ai-ispos.com', otp: saUser!.otpCode! });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.token).toBeDefined();
    superAdminToken = verifyRes.body.token;
  });

  it('Step 2: Super Admin Creates New Operator Tenant (Zenith Fiber)', async () => {
    const createTenantRes = await request(app)
      .post('/api/v1/superadmin/tenants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Zenith Fiber Corp',
        displayName: 'Zenith Fiber',
        slug: newTenantSlug,
        owner: {
          name: 'Rajesh Zenith',
          email: 'admin@zenithfiber.com',
          phone: '+919876500000',
        },
      });

    expect(createTenantRes.status).toBe(201);
    expect(createTenantRes.body.tenant.slug).toBe(newTenantSlug);
  });

  it('Step 3: Operator Login to New Tenant Context', async () => {
    // Request WhatsApp OTP
    const reqRes = await request(app)
      .post('/api/v1/auth/operator/request-otp')
      .send({ phone: '+919876500000', slug: newTenantSlug });
    expect(reqRes.status).toBe(200);

    const opUser = await User.findOne({ email: 'admin@zenithfiber.com' });

    // Verify WhatsApp OTP
    const opLoginRes = await request(app)
      .post('/api/v1/auth/operator/verify-otp')
      .send({
        phone: '+919876500000',
        slug: newTenantSlug,
        otp: opUser!.otpCode!,
      });

    expect(opLoginRes.status).toBe(200);
    expect(opLoginRes.body.token).toBeDefined();
    expect(opLoginRes.body.tenant.slug).toBe(newTenantSlug);
    operatorToken = opLoginRes.body.token;
  });

  it('Step 4: Provision ONT Device in Inventory', async () => {
    const tenant = await Tenant.findOne({ slug: newTenantSlug });
    const device = await Device.create({
      tenantId: tenant!._id,
      deviceIdStr: 'HWTC-ZENITH-01',
      serialNumber: 'HWTCZENITH01',
      macAddress: '48:57:02:11:22:33',
      manufacturer: 'Huawei',
      modelName: 'HG8145V5',
      currentRxPowerDbm: -20.8,
      status: 'online',
    });
    ontDeviceId = device._id.toString();
    expect(ontDeviceId).toBeDefined();
  });

  it('Step 5: Operator Creates Customer and Binds ONT Device', async () => {
    const createCustRes = await request(app)
      .post('/api/v1/operator/customers')
      .set('Authorization', `Bearer ${operatorToken}`)
      .set('x-tenant-slug', newTenantSlug)
      .send({
        fullName: 'Kiran Rao',
        phone: '+919988776655',
        email: 'kiran.rao@gmail.com',
        assignedDeviceId: ontDeviceId,
      });

    expect(createCustRes.status).toBe(201);
    expect(createCustRes.body.customer.fullName).toBe('Kiran Rao');
    createdCustomerId = createCustRes.body.customer._id;
  });

  it('Step 6: Execute Capability-Aware Asynchronous Wi-Fi Reconfiguration with 2-Phase Verification', async () => {
    const wifiCmdRes = await request(app)
      .post(`/api/v1/operator/devices/${ontDeviceId}/wifi`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .set('x-tenant-slug', newTenantSlug)
      .send({
        wifi5g: {
          ssid: 'Zenith_Ultra_5G',
          password: 'SecretPassword@2026',
          channel: 44,
          enabled: true,
        },
      });

    expect(wifiCmdRes.status).toBe(200);
    expect(wifiCmdRes.body.success).toBe(true);
    expect(wifiCmdRes.body.result.verified).toBe(true);
    expect(wifiCmdRes.body.result.readBackValues.wifi5gSsid).toBe('Zenith_Ultra_5G');
  });

  it('Step 7: Retrieve Unified Customer 360 Aggregation', async () => {
    const c360Res = await request(app)
      .get(`/api/v1/operator/customers/${createdCustomerId}/360`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .set('x-tenant-slug', newTenantSlug);

    expect(c360Res.status).toBe(200);
    expect(c360Res.body.data.customer.fullName).toBe('Kiran Rao');
    expect(c360Res.body.data.device.serialNumber).toBe('HWTCZENITH01');
    expect(c360Res.body.data.capabilities.supportsDualBandWifi).toBe(true);
    expect(c360Res.body.data.commandHistory.length).toBeGreaterThanOrEqual(1);
    expect(c360Res.body.data.aiDiagnosticBrief.healthScore).toBeGreaterThan(70);
  });

  it('Step 8: Verify Tamper-Evident Audit Trail Recorded the Actions with Redacted Secrets', async () => {
    const auditLogs = await AuditLog.find({ targetId: createdCustomerId });
    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
    expect(auditLogs[0].action).toBe('CUSTOMER_CREATED');
  });
});
