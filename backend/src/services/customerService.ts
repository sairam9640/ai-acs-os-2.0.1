import { Types } from 'mongoose';
import { Customer, ICustomer } from '../models/Customer.js';
import { Device, IDevice } from '../models/Device.js';
import { DeviceCommand } from '../models/DeviceCommand.js';
import { Ticket } from '../models/Ticket.js';
import { TechnicianJob } from '../models/TechnicianJob.js';
import { AuditLog } from '../models/AuditLog.js';
import { NotificationLog } from '../models/NotificationLog.js';
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
  messageHistory: any[];
  billingHistory: any[];
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
   * Aggregates the complete Customer 360 experience for live support calls
   */
  static async getCustomer360(customerId: string): Promise<ICustomer360View> {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new Error(`Customer not found with ID ${customerId}`);
    }

    const device = customer.assignedDeviceId
      ? await Device.findById(customer.assignedDeviceId)
      : await Device.findOne({ customerId: customer._id });

    const capabilities = device ? await DeviceManagementService.getDeviceCapabilities(device) : null;

    const phoneClean = customer.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
    const phoneFilter = phoneClean.length >= 10 ? new RegExp(phoneClean.slice(-10), 'i') : customer.phone;

    // Concurrently fetch all related datasets
    const [fiberRoute, openTickets, pastJobs, commands, auditLogs, messageLogs] = await Promise.all([
      FiberGisService.traceCustomerRoute(customer._id.toString()).catch(() => null),
      Ticket.find({ customerId: customer._id })
        .populate('assignedToUserId', 'fullName email phone')
        .sort({ createdAt: -1 })
        .limit(20),
      TechnicianJob.find({ customerId: customer._id }).sort({ createdAt: -1 }).limit(10),
      DeviceCommand.find({ customerId: customer._id }).sort({ queuedAt: -1 }).limit(20),
      AuditLog.find({
        $or: [
          { targetId: customer._id.toString() },
          ...(device ? [{ targetId: device._id.toString() }] : []),
        ],
      })
        .sort({ timestamp: -1 })
        .limit(25),
      NotificationLog.find({
        tenantId: customer.tenantId,
        $or: [
          ...(phoneFilter ? [{ 'recipient.identifier': phoneFilter }] : []),
          ...(customer.email ? [{ 'recipient.identifier': new RegExp(customer.email, 'i') }] : []),
          { correlationId: new RegExp(customer._id.toString(), 'i') },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(30),
    ]);

    // Build Billing History from customer servicePlan, payment records, and notifications
    const billingHistory: any[] = [];
    if (customer.servicePlan) {
      if (customer.servicePlan.lastPaymentDate || customer.servicePlan.lastPaymentAmount) {
        billingHistory.push({
          date: customer.servicePlan.lastPaymentDate || customer.servicePlan.startDate || customer.createdAt,
          description: `Plan Renewal: ${customer.servicePlan.name}`,
          amount: customer.servicePlan.lastPaymentAmount || customer.servicePlan.price || customer.servicePlan.monthlyFee,
          status: customer.servicePlan.billingStatus || 'paid',
          paymentMode: customer.servicePlan.paymentReference ? 'Online / UPI' : 'Cash / UPI',
          referenceNumber: customer.servicePlan.paymentReference || `REC-${customer.accountNumber}-01`,
        });
      }

      // Add activation entry if start date exists
      if (customer.servicePlan.startDate) {
        billingHistory.push({
          date: customer.servicePlan.startDate,
          description: `Initial Activation: ${customer.servicePlan.name}`,
          amount: customer.servicePlan.price || customer.servicePlan.monthlyFee,
          status: 'paid',
          paymentMode: 'Activation Receipt',
          referenceNumber: `ACT-${customer.accountNumber}`,
        });
      }
    }

    // Calculate AI Diagnostic Brief
    let healthScore = 100;
    const insights: string[] = [];
    const suggestedActions: string[] = [];

    if (!device) {
      healthScore = 0;
      insights.push('No ONT device is currently bound to this customer profile.');
      suggestedActions.push('Assign an ONT from the Hardware Fleet to establish TR-069 session.');
    } else {
      if (device.status === 'offline') {
        healthScore -= 50;
        insights.push(`ONT ${device.serialNumber} is currently OFFLINE / unpowered.`);
        suggestedActions.push('Verify customer ONT power adapter and check drop cable continuity.');
      } else {
        insights.push(`ONT ${device.serialNumber} is ONLINE with stable TR-069 session.`);
      }

      if (device.currentRxPowerDbm != null) {
        const rx = Number(device.currentRxPowerDbm);
        if (rx < -27) {
          healthScore -= 35;
          insights.push(`Critical Optical Power: RX is severely attenuated at ${rx} dBm (Threshold: -27.0 dBm).`);
          suggestedActions.push('Dispatch field technician to inspect splice, clean SC-APC connector at FAT Box, or re-terminate drop cable.');
        } else if (rx < -24) {
          healthScore -= 15;
          insights.push(`Marginal Optical Signal: RX power is ${rx} dBm.`);
          suggestedActions.push('Monitor optical power history and inspect fiber bend radius.');
        } else {
          insights.push(`Healthy Optical Power: RX is ${rx} dBm within optimal carrier specification.`);
        }
      }

      if (device.connectedClients && device.connectedClients.length > 0) {
        const blockedCount = device.connectedClients.filter((c) => c.isBlocked).length;
        insights.push(`${device.connectedClients.length} active client devices connected (${blockedCount} blocked).`);
      }
    }

    // Expiry and Billing check
    if (customer.servicePlan?.endDate) {
      const now = Date.now();
      const end = new Date(customer.servicePlan.endDate).getTime();
      const remDays = Math.ceil((end - now) / 86400000);
      if (remDays <= 0) {
        healthScore -= 20;
        insights.push(`Subscription has EXPIRED (${Math.abs(remDays)} days ago).`);
        suggestedActions.push('Collect renewal payment and execute one-click plan renewal.');
      } else if (remDays <= 3) {
        insights.push(`Subscription is expiring soon (${remDays} days remaining).`);
        suggestedActions.push('Send WhatsApp expiry reminder notification.');
      }
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
      messageHistory: messageLogs,
      billingHistory,
      aiDiagnosticBrief: {
        healthScore: Math.max(0, Math.min(100, healthScore)),
        connectionState: device?.status === 'online' ? 'Connected' : 'Disconnected',
        opticalHealth: device?.opticalStatus || 'unknown',
        wifiHealth: device?.wifi5g?.enabled ? 'Dual-Band Active' : 'Single-Band Active',
        insights,
        suggestedActions,
      },
    };
  }
}
