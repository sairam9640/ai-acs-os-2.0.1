import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { CustomerRepository } from '../src/repositories/customerRepository.js';
import { DeviceRepository } from '../src/repositories/deviceRepository.js';
import { FiberTopologyRepository } from '../src/repositories/fiberTopologyRepository.js';

describe('AI ISP OS Part 2.1 — Database Repositories & Data Access Layer Tests', () => {
  let tenantA: any;
  let tenantB: any;
  let customerA: any;
  let deviceA: any;
  let oltA: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    tenantA = await Tenant.create({
      name: 'Engineering Test Tenant Alpha',
      slug: 'engalpha',
      subdomain: 'engalpha.ai-ispos.com',
      operatorKey: 'opk_eng_alpha',
      owner: { name: 'Lead Architect', email: 'arch@alpha.com', phone: '123' },
    });

    tenantB = await Tenant.create({
      name: 'Engineering Test Tenant Beta',
      slug: 'engbeta',
      subdomain: 'engbeta.ai-ispos.com',
      operatorKey: 'opk_eng_beta',
      owner: { name: 'Lead Architect', email: 'arch@beta.com', phone: '456' },
    });

    customerA = await CustomerRepository.createCustomer({
      tenantId: tenantA._id,
      accountNumber: 'ACC-REPO-001',
      serviceId: 'SRV-REPO-001',
      fullName: 'Repository Subscriber',
      phone: '+919988112233',
      status: 'active',
      address: { street: '1st Road', area: 'Central', city: 'Bengaluru', pincode: '560001' },
      servicePlan: { name: 'Fiber 200M', downloadSpeedMbps: 200, monthlyFee: 999 },
    });

    deviceA = await DeviceRepository.createCommand({
      tenantId: tenantA._id,
      deviceId: new mongoose.Types.ObjectId(),
      operation: 'REBOOT',
      commandType: 'REBOOT',
      requestedBy: { userId: 'usr_01', email: 'op@alpha.com', role: 'noc_operator' },
    });

    oltA = await FiberTopologyRepository.createNode({
      tenantId: tenantA._id,
      nodeCode: 'OLT-REPO-01',
      name: 'Central OLT 01',
      nodeType: 'CENTRAL_OFFICE',
      coordinates: { lat: 12.9352, lng: 77.6245 },
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('CustomerRepository should find customer within own tenant context', async () => {
    const found = await CustomerRepository.findById(tenantA._id, customerA._id);
    expect(found).toBeDefined();
    expect(found?.accountNumber).toBe('ACC-REPO-001');
  });

  it('CustomerRepository MUST reject cross-tenant customer retrieval (IDOR guard)', async () => {
    const crossTenantLookup = await CustomerRepository.findById(tenantB._id, customerA._id);
    expect(crossTenantLookup).toBeNull();
  });

  it('CustomerRepository should update status with optimistic version increment', async () => {
    const initialVersion = customerA.__v || 0;
    const updated = await CustomerRepository.updateStatus(tenantA._id, customerA._id, 'suspended');

    expect(updated).toBeDefined();
    expect(updated?.status).toBe('suspended');
    expect(updated?.__v).toBe(initialVersion + 1);
  });

  it('FiberTopologyRepository should correctly query nodes by code within tenant', async () => {
    const node = await FiberTopologyRepository.findNodeByCode(tenantA._id, 'OLT-REPO-01');
    expect(node).toBeDefined();
    expect(node?.nodeType).toBe('CENTRAL_OFFICE');

    const crossNode = await FiberTopologyRepository.findNodeByCode(tenantB._id, 'OLT-REPO-01');
    expect(crossNode).toBeNull();
  });
});
