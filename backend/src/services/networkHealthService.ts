import { Types } from 'mongoose';
import { Device } from '../models/Device.js';
import { Incident } from '../models/Incident.js';

export interface HealthFactor {
  factor: string;
  weight: number;
  score: number;
  description: string;
}

export interface NetworkHealthScore {
  deviceId: string;
  serialNumber: string;
  compositeScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  calculatedAt: Date;
  factors: HealthFactor[];
}

export class NetworkHealthService {
  /**
   * Calculates a transparent multi-factor network health score for a device
   */
  static async calculateDeviceHealth(
    tenantId: Types.ObjectId | string,
    deviceId: Types.ObjectId | string
  ): Promise<NetworkHealthScore> {
    const tId = new Types.ObjectId(tenantId);
    const dId = new Types.ObjectId(deviceId);

    const device = await Device.findOne({ _id: dId, tenantId: tId });
    if (!device) {
      throw new Error('Device not found within tenant context');
    }

    const factors: HealthFactor[] = [];

    // 1. Optical RX Power Factor (Weight: 35%)
    let opticalScore = 100;
    const rx = device.currentRxPowerDbm || -21.0;
    if (rx >= -24.0 && rx <= -14.0) {
      opticalScore = 100;
    } else if (rx < -24.0 && rx >= -27.0) {
      opticalScore = 75;
    } else if (rx < -27.0) {
      opticalScore = 30;
    }
    factors.push({
      factor: 'Optical Power',
      weight: 0.35,
      score: opticalScore,
      description: `RX Power is ${rx.toFixed(1)} dBm (Optimal: -14 to -24 dBm)`,
    });

    // 2. Device Uptime Factor (Weight: 25%)
    let uptimeScore = 100;
    const uptime = device.uptimeSeconds || 86400;
    if (uptime < 3600) {
      uptimeScore = 50; // Rebooted recently
    } else if (uptime < 86400) {
      uptimeScore = 80;
    }
    factors.push({
      factor: 'Device Uptime',
      weight: 0.25,
      score: uptimeScore,
      description: `Uptime: ${(uptime / 3600).toFixed(1)} hours`,
    });

    // 3. Online Status Factor (Weight: 25%)
    const isOnline = device.status === 'online';
    const statusScore = isOnline ? 100 : 0;
    factors.push({
      factor: 'Connectivity Status',
      weight: 0.25,
      score: statusScore,
      description: `Device is currently ${device.status}`,
    });

    // 4. Hardware Resources Factor (Weight: 15%)
    const temp = device.temperatureC || 42;
    const tempScore = temp < 55 ? 100 : temp < 70 ? 70 : 30;
    factors.push({
      factor: 'Thermal & CPU Health',
      weight: 0.15,
      score: tempScore,
      description: `Operating Temperature: ${temp}°C`,
    });

    // Compute composite weighted score
    const compositeScore = Math.round(
      factors.reduce((acc, curr) => acc + curr.score * curr.weight, 0)
    );

    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
    if (compositeScore >= 90) grade = 'A';
    else if (compositeScore >= 80) grade = 'B';
    else if (compositeScore >= 70) grade = 'C';
    else if (compositeScore >= 60) grade = 'D';
    else grade = 'F';

    return {
      deviceId: dId.toString(),
      serialNumber: device.serialNumber,
      compositeScore,
      grade,
      calculatedAt: new Date(),
      factors,
    };
  }
}
