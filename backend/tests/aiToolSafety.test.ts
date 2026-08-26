import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { Device } from '../src/models/Device.js';
import { AIToolRegistry } from '../src/services/aiToolRegistry.js';

describe('AI ISP OS Part 1.3 — AI Tool Registry & Safety Boundary Tests', () => {
  let tenantA: any;
  let tenantB: any;
  let deviceA: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    tenantA = await Tenant.create({
      name: 'Tenant Alpha',
      slug: 'alpha',
      subdomain: 'alpha.ai-ispos.com',
      operatorKey: 'opk_alpha',
      owner: { name: 'Alpha', email: 'alpha@test.com', phone: '1' },
    });

    tenantB = await Tenant.create({
      name: 'Tenant Beta',
      slug: 'beta',
      subdomain: 'beta.ai-ispos.com',
      operatorKey: 'opk_beta',
      owner: { name: 'Beta', email: 'beta@test.com', phone: '2' },
    });

    deviceA = await Device.create({
      tenantId: tenantA._id,
      deviceIdStr: 'ONT-AI-SAFE-01',
      serialNumber: 'HWTC-AI-01',
      macAddress: 'CC:DD:EE:11:22:33',
      currentRxPowerDbm: -21.4,
      status: 'online',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('Safe discovery tool should succeed when requested inside valid tenant context', async () => {
    const res = await AIToolRegistry.executeTool({
      tenantId: tenantA._id.toString(),
      toolName: 'getDeviceTelemetry',
      args: { deviceId: deviceA._id.toString() },
      user: { id: 'usr_01', role: 'noc_operator', email: 'noc@alpha.com' },
    });

    expect(res.success).toBe(true);
    expect(res.data.serialNumber).toBe('HWTC-AI-01');
    expect(res.data.currentRxPowerDbm).toBe(-21.4);
  });

  it('Safe discovery tool MUST reject cross-tenant data access (IDOR guard)', async () => {
    const res = await AIToolRegistry.executeTool({
      tenantId: tenantB._id.toString(), // Tenant B trying to query Tenant A's device
      toolName: 'getDeviceTelemetry',
      args: { deviceId: deviceA._id.toString() },
      user: { id: 'usr_02', role: 'noc_operator', email: 'noc@beta.com' },
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('Device not found in tenant context');
  });

  it('Privileged remediation proposal MUST be intercepted and sent for human approval', async () => {
    const res = await AIToolRegistry.executeTool({
      tenantId: tenantA._id.toString(),
      toolName: 'proposeRemediation',
      args: {
        actionType: 'REBOOT_DEVICE',
        targetId: deviceA._id.toString(),
        targetResource: 'Device',
        targetIdentifier: deviceA.serialNumber,
        reason: 'Optical power recovery reboot proposal',
      },
      user: { id: 'usr_01', role: 'noc_operator', email: 'noc@alpha.com' },
    });

    expect(res.success).toBe(true);
    expect(res.requiresHumanApproval).toBe(true);
    expect(res.data.approvalRequestId).toBeDefined();
    expect(res.data.status).toBe('pending');
  });
});
