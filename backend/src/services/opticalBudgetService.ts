import { Types } from 'mongoose';
import { Customer } from '../models/Customer.js';
import { Device } from '../models/Device.js';
import { FiberGisService } from './fiberGisService.js';

export interface OpticalLossBreakdown {
  fiberDistanceKm: number;
  fiberAttenuationDb: number;
  splitterLossDb: number;
  connectorSpliceLossDb: number;
  safetyMarginDb: number;
  totalTheoreticalLossDb: number;
  expectedRxPowerDbm: number;
  observedRxPowerDbm?: number;
  deltaDb?: number;
  opticalHealthStatus: 'OPTIMAL' | 'DEGRADED' | 'EXCESSIVE_LOSS';
}

export class OpticalBudgetService {
  /**
   * Calculates the theoretical optical link budget along a customer route
   */
  static async calculateCustomerOpticalBudget(
    tenantId: Types.ObjectId | string,
    customerId: Types.ObjectId | string,
    oltLaunchPowerDbm = 2.5
  ): Promise<OpticalLossBreakdown> {
    const tId = new Types.ObjectId(tenantId);
    const cId = new Types.ObjectId(customerId);

    const customer = await Customer.findOne({ _id: cId, tenantId: tId });
    if (!customer) {
      throw new Error('Customer not found within tenant context');
    }

    // 1. Trace Route to determine cumulative distance
    const trace = await FiberGisService.traceCustomerRoute(cId.toString());
    const distanceMeters = trace.totalDistanceMeters || 1200;
    const distanceKm = distanceMeters / 1000;

    // 2. Telecommunications Optical Budget Model:
    // Attenuation at 1310/1490nm: ~0.35 dB/km
    const fiberAttenuationDb = Number((distanceKm * 0.35).toFixed(2));

    // Standard 1:8 Splitter Insertion Loss: ~10.5 dB
    const splitterLossDb = 10.5;

    // 4 Fusion Splices (0.05 dB each) + 2 SC/APC Connectors (0.25 dB each): ~0.70 dB
    const connectorSpliceLossDb = 0.70;

    // Engineering Safety Margin
    const safetyMarginDb = 1.5;

    const totalTheoreticalLossDb = Number(
      (fiberAttenuationDb + splitterLossDb + connectorSpliceLossDb + safetyMarginDb).toFixed(2)
    );

    const expectedRxPowerDbm = Number((oltLaunchPowerDbm - totalTheoreticalLossDb).toFixed(2));

    // Fetch observed device telemetry if available
    let observedRxPowerDbm: number | undefined;
    let deltaDb: number | undefined;
    let opticalHealthStatus: 'OPTIMAL' | 'DEGRADED' | 'EXCESSIVE_LOSS' = 'OPTIMAL';

    if (customer.assignedDeviceId) {
      const dev = await Device.findById(customer.assignedDeviceId);
      if (dev && dev.currentRxPowerDbm) {
        observedRxPowerDbm = dev.currentRxPowerDbm;
        deltaDb = Number((observedRxPowerDbm - expectedRxPowerDbm).toFixed(2));

        if (Math.abs(deltaDb) <= 3.0 || observedRxPowerDbm >= -24.0) {
          opticalHealthStatus = 'OPTIMAL';
        } else if (observedRxPowerDbm >= -27.0) {
          opticalHealthStatus = 'DEGRADED';
        } else {
          opticalHealthStatus = 'EXCESSIVE_LOSS';
        }
      }
    }

    return {
      fiberDistanceKm: Number(distanceKm.toFixed(3)),
      fiberAttenuationDb,
      splitterLossDb,
      connectorSpliceLossDb,
      safetyMarginDb,
      totalTheoreticalLossDb,
      expectedRxPowerDbm,
      observedRxPowerDbm,
      deltaDb,
      opticalHealthStatus,
    };
  }
}
