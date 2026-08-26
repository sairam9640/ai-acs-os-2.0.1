import { Types } from 'mongoose';
import { Device } from '../models/Device.js';
import { Customer } from '../models/Customer.js';

export interface ReconciliationMismatch {
  category: 'DEVICE_INVENTORY' | 'BILLING_SUBSCRIPTION' | 'OPTICAL_DRIFT';
  resourceId: string;
  resourceIdentifier: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  internalState: any;
  externalState: any;
  suggestedAction: string;
}

export interface FullAuditReport {
  tenantId: string;
  auditedAt: Date;
  totalDevicesAudited: number;
  totalCustomersAudited: number;
  mismatchesDetected: number;
  mismatches: ReconciliationMismatch[];
}

export class ReconciliationEngineService {
  /**
   * Executes a three-way reconciliation scan across inventory, customer subscriptions, and optical baselines
   */
  static async runFullAudit(tenantId: Types.ObjectId | string): Promise<FullAuditReport> {
    const tId = new Types.ObjectId(tenantId);
    const mismatches: ReconciliationMismatch[] = [];

    // 1. Audit Devices for Orphaned / Missing Customer Bindings
    const devices = await Device.find({ tenantId: tId });
    for (const dev of devices) {
      if (!dev.customerId && dev.status === 'online') {
        mismatches.push({
          category: 'DEVICE_INVENTORY',
          resourceId: dev._id.toString(),
          resourceIdentifier: dev.serialNumber,
          severity: 'HIGH',
          internalState: { status: dev.status, customerId: null },
          externalState: { acsSession: 'ACTIVE' },
          suggestedAction: 'Unassigned ONT is transmitting active session. Assign to subscriber or revoke WAN credentials.',
        });
      }

      // Check Optical Power Drift (> -27 dBm)
      if (dev.currentRxPowerDbm && dev.currentRxPowerDbm < -27.0) {
        mismatches.push({
          category: 'OPTICAL_DRIFT',
          resourceId: dev._id.toString(),
          resourceIdentifier: dev.serialNumber,
          severity: 'MEDIUM',
          internalState: { rxPowerDbm: dev.currentRxPowerDbm },
          externalState: { thresholdBaseline: -24.0 },
          suggestedAction: 'Severe optical signal attenuation. Schedule technician inspection for fiber cleaning/splicing.',
        });
      }
    }

    // 2. Audit Customer Subscriptions for Billing Mismatches
    const customers = await Customer.find({ tenantId: tId });
    for (const cust of customers) {
      if (cust.status === 'active' && cust.servicePlan?.billingStatus === 'overdue') {
        mismatches.push({
          category: 'BILLING_SUBSCRIPTION',
          resourceId: cust._id.toString(),
          resourceIdentifier: cust.accountNumber,
          severity: 'MEDIUM',
          internalState: { serviceStatus: cust.status, billingStatus: 'overdue' },
          externalState: { gatewayInvoiceStatus: 'UNPAID' },
          suggestedAction: 'Active fiber service with overdue invoice. Trigger automated billing reminder or graceful bandwidth throttle.',
        });
      }
    }

    return {
      tenantId: tId.toString(),
      auditedAt: new Date(),
      totalDevicesAudited: devices.length,
      totalCustomersAudited: customers.length,
      mismatchesDetected: mismatches.length,
      mismatches,
    };
  }
}
