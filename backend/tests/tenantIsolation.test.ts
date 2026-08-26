import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/index.js';
import { Tenant } from '../src/models/Tenant.js';
import { User } from '../src/models/User.js';
import { Customer } from '../src/models/Customer.js';
import { Device } from '../src/models/Device.js';
import { generateToken } from '../src/middleware/auth.js';

describe('AI ISP OS — Tenant Isolation Security Tests', () => {
  let tenantA: any;
  let tenantB: any;
  let tokenA: string;
  let tokenB: string;
  let customerA: any;
  let deviceA: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    // Clean up
    await Promise.all([
      Tenant.deleteMany({}),
      User.deleteMany({}),
      Customer.deleteMany({}),
      Device.deleteMany({}),
    ]);

    // Create Tenant A (Apex)
    tenantA = await Tenant.create({
      name: 'Apex Fiber',
      displayName: 'Apex Fiber',
      slug: 'apex',
      subdomain: 'apex.ai-ispos.com',
      operatorKey: 'opk_apex_111',
      owner: { name: 'Admin A', email: 'admin@apex.com', phone: '111' },
      status: 'active',
    });

    // Create Tenant B (Rudra)
    tenantB = await Tenant.create({
      name: 'Rudra Fiber',
      displayName: 'Rudra Fiber',
      slug: 'rudra',
      subdomain: 'rudra.ai-ispos.com',
      operatorKey: 'opk_rudra_222',
      owner: { name: 'Admin B', email: 'admin@rudra.com', phone: '222' },
      status: 'active',
    });

    const userA = await User.create({
      tenantId: tenantA._id,
      email: 'admin@apex.com',
      phone: '111',
      fullName: 'Apex Admin',
      role: 'operator_admin',
      permissions: ['CUSTOMER_ALL', 'DEVICE_ALL'],
    });

    const userB = await User.create({
      tenantId: tenantB._id,
      email: 'admin@rudra.com',
      phone: '222',
      fullName: 'Rudra Admin',
      role: 'operator_admin',
      permissions: ['CUSTOMER_ALL', 'DEVICE_ALL'],
    });

    tokenA = generateToken({
      userId: userA._id.toString(),
      email: userA.email,
      role: userA.role,
      tenantId: tenantA._id.toString(),
      permissions: userA.permissions,
    });

    tokenB = generateToken({
      userId: userB._id.toString(),
      email: userB.email,
      role: userB.role,
      tenantId: tenantB._id.toString(),
      permissions: userB.permissions,
    });

    // Create Customer & Device in Tenant A
    deviceA = await Device.create({
      tenantId: tenantA._id,
      deviceIdStr: 'HWTC-A1',
      serialNumber: 'HWTC-A1-SERIAL',
      macAddress: 'AA:BB:CC:11:22:33',
      manufacturer: 'Huawei',
      modelName: 'HG8145V5',
      status: 'online',
    });

    customerA = await Customer.create({
      tenantId: tenantA._id,
      accountNumber: 'CUST-A-001',
      serviceId: 'SRV-A-001',
      fullName: 'Customer Alpha',
      phone: '+919999000001',
      email: 'alpha@apex.com',
      assignedDeviceId: deviceA._id,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('Tenant A should successfully list its own customers', async () => {
    const res = await request(app)
      .get('/api/v1/operator/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-tenant-slug', 'apex');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.customers.length).toBe(1);
    expect(res.body.customers[0].accountNumber).toBe('CUST-A-001');
  });

  it('Tenant B should NOT see Tenant A customers (Zero Cross-Tenant Leakage)', async () => {
    const res = await request(app)
      .get('/api/v1/operator/customers')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-tenant-slug', 'rudra');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.customers.length).toBe(0);
  });

  it('Tenant B should be FORBIDDEN when attempting IDOR access to Tenant A resource by spoofing header', async () => {
    const res = await request(app)
      .get('/api/v1/operator/customers')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-tenant-slug', 'apex'); // Token B tries to access Tenant A slug

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Forbidden');
  });
});
