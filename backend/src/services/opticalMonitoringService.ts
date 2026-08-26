import { Types } from 'mongoose';
import { Device, IDevice } from '../models/Device.js';
import { IncidentService } from './incidentService.js';

export interface OpticalAnalysisResult {
  deviceId: string;
  serialNumber: string;
  currentRxPowerDbm: number;
  baselineDbm: number;
  deltaFromBaselineDb: number;
  trajectory: 'OPTIMAL' | 'GRADUAL_DEGRADATION' | 'SUDDEN_DROP' | 'LOSS_OF_SIGNAL';
  alertTriggered: boolean;
}

export class OpticalMonitoringService {
  /**
   * Evaluates optical telemetry against historical baseline and detects degradation anomalies
   */
  static async evaluateOpticalTelemetry(
    deviceId: string,
    newRxPowerDbm: number
  ): Promise<OpticalAnalysisResult> {
    const device = await Device.findById(deviceId);
    if (!device) throw new Error('Device not found');

    const history = device.rxPowerHistory || [];
    const baseline =
      history.length > 0
        ? history.reduce((sum, r) => sum + r.valueDbm, 0) / history.length
        : newRxPowerDbm;

    const delta = newRxPowerDbm - baseline;
    let trajectory: 'OPTIMAL' | 'GRADUAL_DEGRADATION' | 'SUDDEN_DROP' | 'LOSS_OF_SIGNAL' = 'OPTIMAL';
    let alertTriggered = false;

    if (newRxPowerDbm <= -32 || newRxPowerDbm === 0) {
      trajectory = 'LOSS_OF_SIGNAL';
      alertTriggered = true;
      device.opticalStatus = 'loss_of_signal';
    } else if (delta <= -6.0) {
      // Sudden drop of more than 6 dB indicates a physical bend or dirty connector
      trajectory = 'SUDDEN_DROP';
      alertTriggered = true;
      device.opticalStatus = 'critical';
    } else if (newRxPowerDbm <= -27.0) {
      trajectory = 'GRADUAL_DEGRADATION';
      alertTriggered = true;
      device.opticalStatus = 'warning';
    } else {
      device.opticalStatus = 'normal';
    }

    device.currentRxPowerDbm = newRxPowerDbm;
    device.rxPowerHistory.unshift({
      valueDbm: newRxPowerDbm,
      timestamp: new Date(),
    });
    if (device.rxPowerHistory.length > 20) device.rxPowerHistory.pop();
    await device.save();

    if (alertTriggered) {
      await IncidentService.ingestAlert({
        tenantId: device.tenantId.toString(),
        severity: trajectory === 'LOSS_OF_SIGNAL' || trajectory === 'SUDDEN_DROP' ? 'critical' : 'warning',
        sourceType: 'ONT_OPTICAL',
        sourceId: device._id.toString(),
        sourceName: `${device.manufacturer} ONT (${device.serialNumber})`,
        message: `Optical ${trajectory}: Current RX Power is ${newRxPowerDbm} dBm (Baseline: ${baseline.toFixed(1)} dBm)`,
        valueRecorded: newRxPowerDbm,
        thresholdDbm: -27.0,
      });
    }

    return {
      deviceId: device._id.toString(),
      serialNumber: device.serialNumber,
      currentRxPowerDbm: newRxPowerDbm,
      baselineDbm: Number(baseline.toFixed(1)),
      deltaFromBaselineDb: Number(delta.toFixed(1)),
      trajectory,
      alertTriggered,
    };
  }
}
