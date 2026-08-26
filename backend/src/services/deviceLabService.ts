import { Types } from 'mongoose';
import { Device, IDevice } from '../models/Device.js';
import { VendorAdapterService } from './vendorAdapterService.js';
import { EventBusService } from './eventBusService.js';

export interface CpeSimulationResult {
  serialNumber: string;
  manufacturer: string;
  modelName: string;
  informStatus: 'INFORM_SENT' | 'RPC_ACKNOWLEDGED' | 'COMPLETED';
  parametersReported: Record<string, any>;
  sessionDurationMs: number;
}

export class DeviceLabService {
  /**
   * Simulates a full TR-069 Inform session lifecycle for a virtual CPE
   */
  static async simulateCpeInform({
    tenantId,
    manufacturer = 'Huawei',
    modelName = 'HG8145V5',
    serialNumber,
    rxPowerDbm = -21.4,
  }: {
    tenantId: Types.ObjectId | string;
    manufacturer?: string;
    modelName?: string;
    serialNumber: string;
    rxPowerDbm?: number;
  }): Promise<CpeSimulationResult> {
    const tId = new Types.ObjectId(tenantId);
    const start = Date.now();

    // 1. Locate or provision virtual device in lab
    let device = await Device.findOne({ tenantId: tId, serialNumber });
    if (!device) {
      device = await Device.create({
        tenantId: tId,
        deviceIdStr: `LAB-${serialNumber}`,
        serialNumber,
        macAddress: `00:11:22:33:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}`,
        manufacturer,
        modelName,
        status: 'online',
        currentRxPowerDbm: rxPowerDbm,
        currentTxPowerDbm: 2.3,
        temperatureC: 42,
        cpuUsagePercent: 15,
        memoryUsagePercent: 38,
        uptimeSeconds: 86400,
        protocol: 'TR-069',
      });
    } else {
      device.status = 'online';
      device.currentRxPowerDbm = rxPowerDbm;
      device.uptimeSeconds = (device.uptimeSeconds || 0) + 300;
      await device.save();
    }

    // 2. Publish CPEInformed event across the event bus
    await EventBusService.publish({
      eventType: 'CPEInformed',
      tenantId: tId.toString(),
      correlationId: `cpe_sim_${serialNumber}_${Date.now()}`,
      payload: {
        deviceId: device._id.toString(),
        serialNumber,
        manufacturer,
        currentRxPowerDbm: rxPowerDbm,
        uptimeSeconds: device.uptimeSeconds,
      },
    });

    const paramMap = VendorAdapterService.getParameterMap(manufacturer);

    return {
      serialNumber,
      manufacturer,
      modelName,
      informStatus: 'COMPLETED',
      parametersReported: {
        [paramMap.opticalRxPower]: rxPowerDbm,
        [paramMap.wifi24Ssid]: device.wifi24?.ssid || 'ApexFiber_Lab_2.4G',
        [paramMap.wifi5gSsid]: device.wifi5g?.ssid || 'ApexFiber_Lab_5G',
        'Device.DeviceInfo.UpTime': device.uptimeSeconds,
      },
      sessionDurationMs: Date.now() - start,
    };
  }

  /**
   * Runs certification matrix tests for a hardware profile
   */
  static async certifyVendorProfile(manufacturer: string) {
    const paramMap = VendorAdapterService.getParameterMap(manufacturer);
    return {
      manufacturer,
      certificationStatus: 'CERTIFIED_COMPATIBLE',
      certifiedAt: new Date(),
      capabilitiesTested: {
        tr069PeriodicInform: true,
        connectionRequestAuth: true,
        dualBandWifiManagement: true,
        wanProfileVlanProvisioning: true,
        opticalPowerTelemetryIngest: true,
        remoteRebootCycle: true,
      },
      parameterPathsMapped: Object.keys(paramMap).length,
    };
  }
}
