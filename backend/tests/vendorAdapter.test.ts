import { describe, it, expect } from 'vitest';
import { VendorAdapterService } from '../src/services/vendorAdapterService.js';

describe('AI ISP OS Part 1.2 — Vendor Parameter Adapter Normalization Tests', () => {
  it('Should correctly map Huawei Wi-Fi parameters to Huawei TR-069 path', () => {
    const params = VendorAdapterService.buildWifiSetParameters('Huawei', {
      wifi24: { ssid: 'Huawei_2.4G', password: 'pass', channel: 6 },
      wifi5g: { ssid: 'Huawei_5G', password: 'pass', channel: 36 },
    });

    const ssid24Param = params.find((p) => p.name.includes('LANDevice.1.WLANConfiguration.1.SSID'));
    const ssid5gParam = params.find((p) => p.name.includes('LANDevice.1.WLANConfiguration.5.SSID'));

    expect(ssid24Param).toBeDefined();
    expect(ssid24Param?.value).toBe('Huawei_2.4G');
    expect(ssid5gParam).toBeDefined();
    expect(ssid5gParam?.value).toBe('Huawei_5G');
  });

  it('Should correctly map ZTE Wi-Fi parameters to ZTE TR-069 path', () => {
    const params = VendorAdapterService.buildWifiSetParameters('ZTE', {
      wifi5g: { ssid: 'ZTE_5G', password: 'pass', channel: 40 },
    });

    const ssid5gParam = params.find((p) => p.name.includes('LANDevice.1.WLANConfiguration.2.SSID'));
    expect(ssid5gParam).toBeDefined();
    expect(ssid5gParam?.value).toBe('ZTE_5G');
  });

  it('Should correctly map WAN parameters for Huawei and ZTE VLAN tags', () => {
    const hwParams = VendorAdapterService.buildWanSetParameters('Huawei', { vlanId: 100, pppoeUsername: 'user1' });
    const zteParams = VendorAdapterService.buildWanSetParameters('ZTE', { vlanId: 200, pppoeUsername: 'user2' });

    expect(hwParams.find((p) => p.name.includes('X_HW_VLAN'))?.value).toBe(100);
    expect(zteParams.find((p) => p.name.includes('VLANID'))?.value).toBe(200);
  });
});
