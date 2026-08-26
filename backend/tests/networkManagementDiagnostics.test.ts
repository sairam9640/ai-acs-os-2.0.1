import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { Device } from '../src/models/Device.js';
import { DiagnosticsService } from '../src/services/diagnosticsService.js';
import { NetworkHealthService } from '../src/services/networkHealthService.js';

describe('AI ISP OS Part 2.3 — Network Management, Diagnostics & Health Tests', () => {
  let tenant: any;
  let deviceOptimal: any;
  let deviceDegraded: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    tenant = await Tenant.create({
      name: 'Network Mgmt Test ISP',
      slug: 'nettest',
      subdomain: 'nettest.ai-ispos.com',
      operatorKey: 'opk_net_test',
      owner: { name: 'Net Lead', email: 'net@test.com', phone: '123' },
    });

    deviceOptimal = await Device.create({
      tenantId: tenant._id,
      deviceIdStr: 'ONT-NET-01',
      serialNumber: 'HWTC-NET-01',
      macAddress: 'AA:BB:CC:11:22:33',
      status: 'online',
      currentRxPowerDbm: -20.5,
      currentTxPowerDbm: 2.3,
      temperatureC: 41,
      uptimeSeconds: 120000,
      wifi24: { channel: 6, ssid: 'Test_24G' },
      wifi5g: { channel: 36, ssid: 'Test_5G' },
    });

    deviceDegraded = await Device.create({
      tenantId: tenant._id,
      deviceIdStr: 'ONT-NET-02',
      serialNumber: 'HWTC-NET-02',
      macAddress: 'AA:BB:CC:11:22:44',
      status: 'degraded',
      currentRxPowerDbm: -28.5,
      currentTxPowerDbm: 2.1,
      temperatureC: 68,
      uptimeSeconds: 1200,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('Should execute structured PING diagnostic and return normalized latency data', async () => {
    const res = await DiagnosticsService.runDiagnostic({
      tenantId: tenant._id,
      deviceId: deviceOptimal._id,
      diagnosticType: 'PING',
      parameters: { host: '8.8.8.8', count: 4 },
    });

    expect(res.status).toBe('COMPLETED');
    expect(res.data.packetsReceived).toBe(4);
    expect(res.data.packetLossPercent).toBe(0.0);
    expect(res.data.avgRttMs).toBeGreaterThan(0);
  });

  it('Should execute OPTICAL_READ diagnostic and reflect current power status', async () => {
    const res = await DiagnosticsService.runDiagnostic({
      tenantId: tenant._id,
      deviceId: deviceOptimal._id,
      diagnosticType: 'OPTICAL_READ',
    });

    expect(res.status).toBe('COMPLETED');
    expect(res.data.rxPowerDbm).toBe(-20.5);
    expect(res.data.status).toBe('OPTIMAL');
  });

  it('Should execute WIFI_SURVEY diagnostic and return channel utilization', async () => {
    const res = await DiagnosticsService.runDiagnostic({
      tenantId: tenant._id,
      deviceId: deviceOptimal._id,
      diagnosticType: 'WIFI_SURVEY',
    });

    expect(res.status).toBe('COMPLETED');
    expect(res.data.band24G.channel).toBe(6);
    expect(res.data.band5G.channel).toBe(36);
  });

  it('NetworkHealthService should assign Grade A to healthy optimal device', async () => {
    const health = await NetworkHealthService.calculateDeviceHealth(tenant._id, deviceOptimal._id);
    expect(health.compositeScore).toBeGreaterThanOrEqual(85);
    expect(health.grade).toBe('A');
    expect(health.factors.length).toBe(4);
  });

  it('NetworkHealthService should assign Grade D or F to degraded high-attenuation device', async () => {
    const health = await NetworkHealthService.calculateDeviceHealth(tenant._id, deviceDegraded._id);
    expect(health.compositeScore).toBeLessThan(70);
    expect(['C', 'D', 'F']).toContain(health.grade);
  });
});
