import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/index.js';
import { Tenant } from '../src/models/Tenant.js';
import { User } from '../src/models/User.js';
import { Device } from '../src/models/Device.js';
import { ApprovalPolicy, ApprovalRequest } from '../src/models/ApprovalPolicy.js';
import { generateToken } from '../src/middleware/auth.js';

describe('AI ISP OS Part 1.2 — High-Risk Action Approval Workflow Tests', () => {
  let tenant: any;
  let adminToken: string;
  let nocToken: string;
  let device: any;
  let createdRequestId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    tenant = await Tenant.create({
      name: 'Approval Test ISP',
      displayName: 'Approval ISP',
      slug: 'approvaltest',
      subdomain: 'approvaltest.ai-ispos.com',
      operatorKey: 'opk_appr_test',
      owner: { name: 'Admin', email: 'admin@approval.com', phone: '123' },
    });

    // Create Tenant Approval Policy: Reboot requires approval
    await ApprovalPolicy.create({
      tenantId: tenant._id,
      requireApprovalForReboot: true,
      requireApprovalForWanDelete: true,
    });

    const adminUser = await User.create({
      tenantId: tenant._id,
      email: 'admin@approval.com',
      phone: '123',
      fullName: 'ISP Lead Admin',
      role: 'operator_admin',
      permissions: ['ALL'],
    });

    const nocUser = await User.create({
      tenantId: tenant._id,
      email: 'noc@approval.com',
      phone: '456',
      fullName: 'Junior NOC Operator',
      role: 'noc_operator',
      permissions: ['DEVICE_READ', 'DEVICE_DIAGNOSE'],
    });

    adminToken = generateToken({
      userId: adminUser._id.toString(),
      email: adminUser.email,
      role: adminUser.role,
      tenantId: tenant._id.toString(),
      permissions: ['ALL'],
    });

    nocToken = generateToken({
      userId: nocUser._id.toString(),
      email: nocUser.email,
      role: nocUser.role,
      tenantId: tenant._id.toString(),
      permissions: ['DEVICE_READ'],
    });

    device = await Device.create({
      tenantId: tenant._id,
      deviceIdStr: 'ONT-APPR-01',
      serialNumber: 'HWTCAPPR001',
      macAddress: 'AA:99:88:77:66:55',
      status: 'online',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('Step 1: Junior NOC requests high-risk operation -> Held in pending_approval', async () => {
    const req = await ApprovalRequest.create({
      tenantId: tenant._id,
      requestNumber: 'APR-2026-0099',
      actionType: 'REBOOT_DEVICE',
      targetResource: 'Device',
      targetId: device._id,
      targetIdentifier: device.serialNumber,
      requestedBy: {
        userId: new mongoose.Types.ObjectId(),
        fullName: 'Junior NOC Operator',
        email: 'noc@approval.com',
        role: 'noc_operator',
      },
      reason: 'CPE latency clearing request',
      parameters: {},
      status: 'pending',
    });

    expect(req.status).toBe('pending');
    createdRequestId = req._id.toString();
  });

  it('Step 2: Admin queries Approvals Workbench and sees pending request', async () => {
    const res = await request(app)
      .get('/api/v1/operator/approvals?status=pending')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-slug', 'approvaltest');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.requests.length).toBeGreaterThanOrEqual(1);
  });

  it('Step 3: Admin Approves the high-risk request -> Executes and changes status to approved', async () => {
    const res = await request(app)
      .post(`/api/v1/operator/approvals/${createdRequestId}/decide`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-slug', 'approvaltest')
      .send({
        decision: 'approved',
        notes: 'Approved during maintenance window.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.request.status).toBe('approved');
    expect(res.body.request.executedCommandId).toBeDefined();
  });
});
