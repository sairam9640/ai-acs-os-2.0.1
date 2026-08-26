import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { Device } from '../src/models/Device.js';
import { OpticalMonitoringService } from '../src/services/opticalMonitoringService.js';

describe('AI ISP OS Part 1.2 — Optical Baseline & Anomaly Trajectory Tests', () => {
  let tenant: any;
  let device: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    tenant = await Tenant.create({
      name: 'Optics Test ISP',
      displayName: 'Optics ISP',
      slug: 'optictest',
      subdomain: 'optictest.ai-ispos.com',
      operatorKey: 'opk_opt_test',
      owner: { name: 'Optics Lead', email: 'opt@test.com', phone: '123' },
    });

    device = await Device.create({
      tenantId: tenant._id,
      deviceIdStr: 'ONT-OPT-01',
      serialNumber: 'HWTC-OPT-01',
      macAddress: 'AA:11:22:99:88:77',
      currentRxPowerDbm: -20.5,
      rxPowerHistory: [
        { valueDbm: -20.4, timestamp: new Date(Date.now() - 3600000) },
        { valueDbm: -20.5, timestamp: new Date(Date.now() - 7200000) },
        { valueDbm: -20.6, timestamp: new Date(Date.now() - 10800000) },
      ],
      status: 'online',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('Healthy telemetry within 1.5 dB delta should be classified as OPTIMAL', async () => {
    const result = await OpticalMonitoringService.evaluateOpticalTelemetry(device._id.toString(), -21.0);
    expect(result.trajectory).toBe('OPTIMAL');
    expect(result.alertTriggered).toBe(false);
  });

  it('Sudden optical drop (> 6 dB drop from baseline) should be classified as SUDDEN_DROP with alert triggered', async () => {
    const result = await OpticalMonitoringService.evaluateOpticalTelemetry(device._id.toString(), -28.5);
    expect(result.trajectory).toBe('SUDDEN_DROP');
    expect(result.alertTriggered).toBe(true);
    expect(result.deltaFromBaselineDb).toBeLessThanOrEqual(-6.0);
  });

  it('Signal below -32 dBm should be classified as LOSS_OF_SIGNAL', async () => {
    const result = await OpticalMonitoringService.evaluateOpticalTelemetry(device._id.toString(), -34.0);
    expect(result.trajectory).toBe('LOSS_OF_SIGNAL');
    expect(result.alertTriggered).toBe(true);
  });
});
