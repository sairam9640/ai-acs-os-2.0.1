import { Types } from 'mongoose';
import { Customer, ICustomer } from '../models/Customer.js';
import { Device, IDevice } from '../models/Device.js';
import { DeviceCommand } from '../models/DeviceCommand.js';
import { Ticket } from '../models/Ticket.js';
import { TechnicianJob } from '../models/TechnicianJob.js';
import { AuditLog } from '../models/AuditLog.js';
import { FiberGisService } from './fiberGisService.js';
import { DeviceManagementService } from './deviceManagementService.js';

export interface ICustomer360View {
  customer: ICustomer;
  device: IDevice | null;
  capabilities: any;
  fiberRoute: any;
  openTickets: any[];
  pastJobs: any[];
  commandHistory: any[];
  auditHistory: any[];
  aiDiagnosticBrief: {
    healthScore: number; // 0 - 100
    connectionState: string;
    opticalHealth: string;
    wifiHealth: string;
    insights: string[];
    suggestedActions: string[];
  };
}

export class CustomerService {
  /**
   * Aggregates the complete 10-point Customer 360 experience
   */
  static async getCustomer360(customerId: string): Promise<ICustomer360View> {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new Error(`Customer not found with ID ${customerId}`);
    }

    const device = customer.assignedDeviceId ? await Device.findById(customer.assignedDeviceId) : null;
    const capabilities = device ? await DeviceManagementService.getDeviceCapabilities(device) : null;

    // Concurrently fetch related records
    const [fiberRoute, openTickets, pastJobs, commands, auditLogs] = await Promise.all([
      FiberGisService.traceCustomerRoute(customer._id.toString()).catch(() => null),
      Ticket.find({ customerId: customer._id }).sort({ createdAt: -1 }).limit(10),
      TechnicianJob.find({ customerId: customer._id }).sort({ createdAt: -1 }).limit(10),
      DeviceCommand.find({ customerId: customer._id }).sort({ queuedAt: -1 }).limit(15),
      AuditLog.find({ targetId: customer._id.toString() }).sort({ timestamp: -1 }).limit(15),
    ]);

    // Calculate AI Diagnostic Brief
    let healthScore = 100;
    const insights: string[] = [];
    const suggestedActions: string[] = [];

    if (!device) {
      healthScore = 0;
      insights.push('No ONT device currently associated with this subscriber.');
      suggestedActions.push('Provision and bind an ONT from the inventory.');
    } else {
      if (device.status === 'offline') {
        healthScore -= 50;
        insights.push('ONT is currently OFFLINE or unpowered.');
        suggestedActions.push('Verify customer power supply and drop cable continuity.');
      }

      if (device.currentRxPowerDbm) {
        if (device.currentRxPowerDbm < -27) {
          healthScore -= 30;
          insights.push(`Optical RX power is severely attenuated (${device.currentRxPowerDbm} dBm). High risk of packet loss.`);
          suggestedActions.push('Dispatch field technician to inspect splice or clean SC-APC connector at FAT Box.');
        } else if (device.currentRxPowerDbm < -24) {
          healthScore -= 10;
          insights.push(`Optical RX power is slightly degraded (${device.currentRxPowerDbm} dBm).`);
        } else {
          insights.push(`Optical signal is within optimal range (${device.currentRxPowerDbm} dBm).`);
        }
      }

      if (device.connectedClients && device.connectedClients.length > 0) {
        const blockedCount = device.connectedClients.filter((c) => c.isBlocked).length;
        insights.push(`${device.connectedClients.length} connected LAN/WLAN devices (${blockedCount} blocked).`);
      }
    }

    if (customer.servicePlan?.billingStatus === 'overdue') {
      healthScore -= 15;
      insights.push('Billing account is overdue renewal.');
      suggestedActions.push('Send payment reminder via WhatsApp / SMS.');
    }

    return {
      customer,
      device,
      capabilities,
      fiberRoute,
      openTickets,
      pastJobs,
      commandHistory: commands,
      auditHistory: auditLogs,
      aiDiagnosticBrief: {
        healthScore: Math.max(0, healthScore),
        connectionState: device?.status === 'online' ? 'Connected' : 'Disconnected',
        opticalHealth: device?.opticalStatus || 'unknown',
        wifiHealth: device?.wifi5g?.enabled ? 'Dual-Band Active' : 'Single-Band / Inactive',
        insights,
        suggestedActions,
      },
    };
  }
}
