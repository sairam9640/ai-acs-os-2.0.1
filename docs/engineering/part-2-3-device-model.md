# AI ISP OS — Part 2.3 Normalized Device Model & Capability Profiles

**Document Version:** 1.0  
**Specification:** Part 2.3 — Network Management Implementation Specification  
**Date:** 2026-08-23  

---

## 1. Normalized Device Schema (Section 3)

The canonical `Device` entity encapsulates:
- **Identity:** `serialNumber` (unique per tenant), `macAddress`, `manufacturer`, `modelName`, `firmwareVersion`, `protocol` (`TR-069` / `TR-369`).
- **Hierarchy:** `tenantId`, `customerId`, `oltId`, `ponPortId`.
- **Telemetry State:** `currentRxPowerDbm`, `currentTxPowerDbm`, `temperatureC`, `uptimeSeconds`, `status` (`online`/`offline`/`degraded`).
- **Configuration:** `wifi24`, `wifi5g`, `wanProfiles`, `connectedClients`.

---

## 2. Certified Capability Profiles Matrix (Section 4 & 22)

```typescript
export interface DeviceProfile {
  vendor: string;
  models: string[];
  protocol: 'TR-069' | 'TR-369';
  parameterMap: Record<string, string>;
  supportedOperations: string[];
  verificationKeys: Record<string, string>;
}

export const CertifiedProfiles: Record<string, DeviceProfile> = {
  Huawei: {
    vendor: 'Huawei',
    models: ['HG8145V5', 'EG8145V5', 'HG8245H'],
    protocol: 'TR-069',
    parameterMap: {
      wifi24Ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
      wifi24Key: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.PreSharedKey',
      wifi5gSsid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID',
      wifi5gKey: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.PreSharedKey',
      opticalRxPower: 'InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalRxPower',
      reboot: 'InternetGatewayDevice.DeviceInfo.Reboot',
    },
    supportedOperations: ['wifi.read', 'wifi.write', 'wan.read', 'wan.write', 'device.reboot', 'diagnostics.ping', 'clients.block'],
    verificationKeys: {
      wifi24Ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
      uptime: 'InternetGatewayDevice.DeviceInfo.UpTime',
    },
  },
  ZTE: {
    vendor: 'ZTE',
    models: ['F670L', 'F660', 'F609'],
    protocol: 'TR-069',
    parameterMap: {
      wifi24Ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
      wifi5gSsid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID',
      opticalRxPower: 'InternetGatewayDevice.WANDevice.1.X_ZTE_DEBUG.SMP.ONT.RxPower',
      reboot: 'InternetGatewayDevice.DeviceInfo.Reboot',
    },
    supportedOperations: ['wifi.read', 'wifi.write', 'device.reboot', 'diagnostics.ping'],
    verificationKeys: {
      wifi24Ssid: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
    },
  },
};
```
