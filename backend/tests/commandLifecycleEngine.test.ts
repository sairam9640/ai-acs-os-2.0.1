import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { Device } from '../src/models/Device.js';
import { DeviceCommand } from '../src/models/DeviceCommand.js';
import { WorkerQueueService } from '../src/services/workerQueueService.js';
import { enforceRiskTier } from '../src/middleware/riskTierMiddleware.js';

describe('AI ISP OS Part 2.2 — Command Lifecycle & Queue Engine Tests', () => {
  let tenant: any;
  let device: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    tenant = await Tenant.create({
      name: 'Lifecycle Test ISP',
      slug: 'lifetest',
      subdomain: 'lifetest.ai-ispos.com',
      operatorKey: 'opk_life_test',
      owner: { name: 'Lead', email: 'lead@life.com', phone: '123' },
    });

    device = await Device.create({
      tenantId: tenant._id,
      deviceIdStr: 'ONT-LIFE-01',
      serialNumber: 'HWTC-LIFE-01',
      macAddress: 'AA:11:22:33:44:55',
      status: 'online',
      currentRxPowerDbm: -21.5,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('Should progress command record through 8-state lifecycle stages', async () => {
    // 1. Created
    const cmd = await DeviceCommand.create({
      tenantId: tenant._id,
      deviceId: device._id,
      action: 'REBOOT_DEVICE',
      status: 'created',
      parameters: {},
      requestedBy: { userId: new mongoose.Types.ObjectId(), role: 'noc_operator', email: 'noc@life.com' },
      correlationId: 'corr_life_01',
    });
    expect(cmd.status).toBe('created');

    // 2. Authorized & Queued
    cmd.status = 'queued';
    cmd.queuedAt = new Date();
    await cmd.save();
    expect(cmd.status).toBe('queued');

    // 3. Dispatching -> Sent
    cmd.status = 'sent';
    cmd.sentAt = new Date();
    await cmd.save();
    expect(cmd.status).toBe('sent');

    // 4. Acknowledged -> Verifying -> Verified
    cmd.status = 'verifying';
    await cmd.save();

    cmd.status = 'verified';
    cmd.completedAt = new Date();
    cmd.verificationResult = { verified: true, readBackValues: { uptime: 15 }, mismatches: [] };
    await cmd.save();

    expect(cmd.status).toBe('verified');
    expect(cmd.verificationResult.verified).toBe(true);
  });

  it('Should process background job via WorkerQueueService', async () => {
    let processedJob: any = null;

    WorkerQueueService.registerWorker('device-commands', async (job) => {
      processedJob = job;
    });

    const job = await WorkerQueueService.enqueue({
      queue: 'device-commands',
      tenantId: tenant._id.toString(),
      data: { commandId: 'CMD-TEST-01', action: 'REBOOT' },
    });

    expect(job.status).toBe('QUEUED');

    // Wait for background worker
    await new Promise((r) => setTimeout(r, 50));
    expect(processedJob).toBeDefined();
    expect(processedJob.data.commandId).toBe('CMD-TEST-01');
  });

  it('Risk tier middleware should require confirmation header on HIGH risk actions', async () => {
    const app = express();
    app.use(express.json());

    // Fake Auth middleware
    app.use((req: any, res, next) => {
      req.user = { id: 'usr_01', role: 'noc_operator', permissions: ['device.reboot'] };
      next();
    });

    app.post(
      '/test/high-risk-reboot',
      enforceRiskTier({ riskLevel: 'HIGH', requiredPermission: 'device.reboot', requireConfirmation: true }),
      (req, res) => {
        res.json({ success: true, executed: true });
      }
    );

    // 1. Unconfirmed request -> Rejected
    const unconfirmedRes = await request(app).post('/test/high-risk-reboot');
    expect(unconfirmedRes.status).toBe(400);
    expect(unconfirmedRes.body.error.code).toBe('VALIDATION_ERROR');

    // 2. Confirmed request with header -> Approved
    const confirmedRes = await request(app).post('/test/high-risk-reboot').set('x-confirm-action', 'true');
    expect(confirmedRes.status).toBe(200);
    expect(confirmedRes.body.executed).toBe(true);
  });
});
