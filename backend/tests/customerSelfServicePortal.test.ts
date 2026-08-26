import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { Customer } from '../src/models/Customer.js';
import { Device } from '../src/models/Device.js';
import { CustomerPortalService } from '../src/services/customerPortalService.js';

describe('AI ISP OS Part 3.5 — Customer Self-Service Portal & Knowledge Base Tests', () => {
  let tenant: any;
  let customer: any;
  let device: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    const rand = Date.now();
    tenant = await Tenant.create({
      name: `Customer Portal Test ISP ${rand}`,
      slug: `custportaltest_${rand}`,
      subdomain: `portal_${rand}.ai-ispos.com`,
      operatorKey: `opk_portal_test_${rand}`,
      owner: { name: 'Portal Admin', email: `portal_${rand}@test.com`, phone: '123' },
    });

    device = await Device.create({
      tenantId: tenant._id,
      deviceIdStr: `ONT-PORTAL-${rand}`,
      serialNumber: `HWTC-PORTAL-${rand}`,
      macAddress: `DD:11:22:${(rand % 90 + 10)}:44:55`,
      status: 'online',
      currentRxPowerDbm: -20.8,
    });

    customer = await Customer.create({
      tenantId: tenant._id,
      accountNumber: `ACC-PORTAL-${rand}`,
      serviceId: `SRV-PORTAL-${rand}`,
      fullName: 'Sunita Menon',
      phone: `+9199885${rand.toString().substring(8)}`,
      address: { street: '7th Main', area: 'Whitefield', city: 'Bengaluru', pincode: '560066' },
      servicePlan: { name: 'Gigabit Fiber 1G', downloadSpeedMbps: 1000, monthlyFee: 1999 },
      assignedDeviceId: device._id,
      status: 'active',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('CustomerPortalService should aggregate subscriber dashboard summary', async () => {
    const summary = await CustomerPortalService.getCustomerDashboard(tenant._id, customer._id);

    expect(summary.accountNumber).toContain('ACC-PORTAL');
    expect(summary.fullName).toBe('Sunita Menon');
    expect(summary.serviceStatus).toBe('ONLINE');
    expect(summary.plan.downloadSpeedMbps).toBe(1000);
    expect(summary.device.currentRxPowerDbm).toBe(-20.8);
  });

  it('CustomerPortalService should update Wi-Fi credentials with validation', async () => {
    const res = await CustomerPortalService.updateWifiCredentials(
      tenant._id,
      customer._id,
      'Sunita_Home_5G',
      'UltraSecurePass99!'
    );

    expect(res.success).toBe(true);
    expect(res.ssid).toBe('Sunita_Home_5G');
    expect(res.verified).toBe(true);
  });

  it('CustomerPortalService should search customer knowledge base articles', () => {
    const wifiArticles = CustomerPortalService.searchKnowledgeBase('wifi');
    expect(wifiArticles.length).toBeGreaterThanOrEqual(1);
    expect(wifiArticles[0].title).toContain('Wi-Fi');

    const allArticles = CustomerPortalService.searchKnowledgeBase();
    expect(allArticles.length).toBeGreaterThanOrEqual(3);
  });
});
