import { Types } from 'mongoose';
import { Customer } from '../models/Customer.js';
import { Device } from '../models/Device.js';
import { EventBusService } from './eventBusService.js';

export type WorkOrderStatus =
  | 'READY'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'SCHEDULED'
  | 'EN_ROUTE'
  | 'ON_SITE'
  | 'IN_PROGRESS'
  | 'EVIDENCE_SUBMITTED'
  | 'VERIFICATION'
  | 'COMPLETED'
  | 'CANCELLED';

export interface WorkOrderRecord {
  workOrderId: string;
  orderNumber: string;
  tenantId: string;
  customerId: string;
  jobType: 'NEW_INSTALLATION' | 'FIBER_FAULT_REPAIR' | 'ONT_REPLACEMENT' | 'PREVENTIVE_MAINTENANCE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: WorkOrderStatus;
  assignedTechnicianId?: string;
  scheduledWindow?: {
    date: Date;
    slot: 'MORNING' | 'AFTERNOON' | 'EVENING';
  };
  requiredSkills: string[];
  materialsReserved: {
    itemCode: string;
    description: string;
    quantity: number;
  }[];
  materialsConsumed?: {
    itemCode: string;
    quantity: number;
  }[];
  evidence?: {
    measuredRxPowerDbm?: number;
    photoUrls?: string[];
    customerSignOff?: boolean;
  };
  createdAt: Date;
  completedAt?: Date;
}

export class WorkOrderService {
  private static workOrders: Map<string, WorkOrderRecord> = new Map();

  /**
   * Creates a new field work order
   */
  static async createWorkOrder({
    tenantId,
    customerId,
    jobType = 'NEW_INSTALLATION',
    priority = 'MEDIUM',
    requiredSkills = ['FIBER_SPLICING', 'ONT_PROVISIONING'],
    materialsReserved = [
      { itemCode: 'DROP-CABLE-50M', description: '50m FTTH Drop Cable', quantity: 1 },
      { itemCode: 'SC-APC-CONN', description: 'Fast SC/APC Connector', quantity: 2 },
    ],
  }: {
    tenantId: Types.ObjectId | string;
    customerId: Types.ObjectId | string;
    jobType?: 'NEW_INSTALLATION' | 'FIBER_FAULT_REPAIR' | 'ONT_REPLACEMENT' | 'PREVENTIVE_MAINTENANCE';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    requiredSkills?: string[];
    materialsReserved?: { itemCode: string; description: string; quantity: number }[];
  }): Promise<WorkOrderRecord> {
    const tId = new Types.ObjectId(tenantId);
    const cId = new Types.ObjectId(customerId);

    const customer = await Customer.findOne({ _id: cId, tenantId: tId });
    if (!customer) {
      throw new Error('Customer not found within tenant context');
    }

    const workOrderId = `wo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const orderNumber = `WO-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const workOrder: WorkOrderRecord = {
      workOrderId,
      orderNumber,
      tenantId: tId.toString(),
      customerId: cId.toString(),
      jobType,
      priority,
      status: 'READY',
      requiredSkills,
      materialsReserved,
      createdAt: new Date(),
    };

    this.workOrders.set(workOrderId, workOrder);

    await EventBusService.publish({
      eventType: 'CommandCompleted',
      tenantId: tId.toString(),
      correlationId: `wo_create_${workOrderId}`,
      payload: { workOrderId, orderNumber, status: 'READY', jobType },
    });

    return workOrder;
  }

  /**
   * Transitions work order status along the authorized state machine
   */
  static async transitionStatus({
    tenantId,
    workOrderId,
    newStatus,
    assignedTechnicianId,
  }: {
    tenantId: Types.ObjectId | string;
    workOrderId: string;
    newStatus: WorkOrderStatus;
    assignedTechnicianId?: string;
  }): Promise<WorkOrderRecord> {
    const wo = this.workOrders.get(workOrderId);
    if (!wo || wo.tenantId !== tenantId.toString()) {
      throw new Error('Work order not found within tenant context');
    }

    wo.status = newStatus;
    if (assignedTechnicianId) {
      wo.assignedTechnicianId = assignedTechnicianId;
    }

    await EventBusService.publish({
      eventType: 'CommandCompleted',
      tenantId: tenantId.toString(),
      correlationId: `wo_trans_${workOrderId}`,
      payload: { workOrderId, status: newStatus },
    });

    return wo;
  }

  /**
   * Submits field evidence and executes optical power verification gate
   */
  static async submitEvidenceAndVerify({
    tenantId,
    workOrderId,
    measuredRxPowerDbm,
    photoUrls = [],
    customerSignOff = true,
    materialsConsumed = [],
  }: {
    tenantId: Types.ObjectId | string;
    workOrderId: string;
    measuredRxPowerDbm: number;
    photoUrls?: string[];
    customerSignOff?: boolean;
    materialsConsumed?: { itemCode: string; quantity: number }[];
  }): Promise<WorkOrderRecord> {
    const wo = this.workOrders.get(workOrderId);
    if (!wo || wo.tenantId !== tenantId.toString()) {
      throw new Error('Work order not found within tenant context');
    }

    wo.evidence = {
      measuredRxPowerDbm,
      photoUrls,
      customerSignOff,
    };
    wo.materialsConsumed = materialsConsumed;

    // Optical Verification Gate
    if (measuredRxPowerDbm > -12.0 || measuredRxPowerDbm < -27.0) {
      wo.status = 'VERIFICATION';
      throw new Error(`Optical RX power ${measuredRxPowerDbm} dBm is outside acceptable range (-12.0 to -27.0 dBm)`);
    }

    wo.status = 'COMPLETED';
    wo.completedAt = new Date();

    // Auto-activate Customer & Device
    const customer = await Customer.findOne({ _id: new Types.ObjectId(wo.customerId), tenantId: new Types.ObjectId(tenantId) });
    if (customer) {
      customer.status = 'active';
      await customer.save();
      if (customer.assignedDeviceId) {
        await Device.findByIdAndUpdate(customer.assignedDeviceId, {
          status: 'online',
          currentRxPowerDbm: measuredRxPowerDbm,
        });
      }
    }

    await EventBusService.publish({
      eventType: 'CommandCompleted',
      tenantId: tenantId.toString(),
      correlationId: `wo_comp_${workOrderId}`,
      payload: { workOrderId, status: 'COMPLETED', measuredRxPowerDbm },
    });

    return wo;
  }
}
