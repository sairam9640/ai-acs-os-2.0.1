import { Types } from 'mongoose';
import { Customer } from '../models/Customer.js';
import { Device } from '../models/Device.js';
import { Incident } from '../models/Incident.js';
import { Ticket } from '../models/Ticket.js';
import { TechnicianJob } from '../models/TechnicianJob.js';
import { ApprovalRequest } from '../models/ApprovalPolicy.js';

export interface OperationsCenterKpis {
  tenantId: string;
  calculatedAt: Date;
  subscribers: {
    total: number;
    active: number;
    suspended: number;
  };
  deviceFleet: {
    total: number;
    online: number;
    offline: number;
    onlinePercentage: number;
  };
  opticalHealth: {
    optimal: number;
    degraded: number;
    critical: number;
  };
  incidents: {
    activeCount: number;
    criticalCount: number;
    totalImpactedSubscribers: number;
  };
  support: {
    openTickets: number;
    slaBreachRiskCount: number;
  };
  technicians: {
    activeDispatches: number;
    completedToday: number;
  };
  aiGovernance: {
    pendingApprovalsCount: number;
  };
}

export class OperationsCenterService {
  /**
   * Aggregates real-time multi-domain operational KPIs for the command center
   */
  static async getOperationsKpis(tenantId: Types.ObjectId | string): Promise<OperationsCenterKpis> {
    const tId = new Types.ObjectId(tenantId);

    const [
      totalCust,
      activeCust,
      devices,
      activeIncidents,
      openTickets,
      techJobs,
      pendingApprovals,
    ] = await Promise.all([
      Customer.countDocuments({ tenantId: tId }),
      Customer.countDocuments({ tenantId: tId, status: 'active' }),
      Device.find({ tenantId: tId }),
      Incident.find({ tenantId: tId, status: { $in: ['open', 'in_progress'] } }),
      Ticket.find({ tenantId: tId, status: { $in: ['open', 'assigned', 'in_progress'] } }),
      TechnicianJob.find({ tenantId: tId }),
      ApprovalRequest.countDocuments({ tenantId: tId, status: 'PENDING' }),
    ]);

    // Compute device fleet and optical metrics
    let onlineDev = 0;
    let optOptimal = 0;
    let optDegraded = 0;
    let optCritical = 0;

    for (const dev of devices) {
      if (dev.status === 'online') onlineDev++;

      const rx = dev.currentRxPowerDbm || -20.0;
      if (rx >= -24.0 && rx <= -14.0) {
        optOptimal++;
      } else if (rx < -24.0 && rx >= -27.0) {
        optDegraded++;
      } else if (rx < -27.0) {
        optCritical++;
      }
    }

    const onlinePercentage = devices.length > 0 ? Number(((onlineDev / devices.length) * 100).toFixed(1)) : 100;

    // Compute incident impact
    let criticalInc = 0;
    let impactedSubscribers = 0;
    for (const inc of activeIncidents) {
      if (inc.severity === 'critical') criticalInc++;
      impactedSubscribers += inc.affectedCustomersCount || 0;
    }

    // Compute SLA breach risk (tickets open > 2 hours)
    let slaBreachRisk = 0;
    const now = Date.now();
    for (const tick of openTickets) {
      const ageHours = (now - new Date(tick.createdAt).getTime()) / (1000 * 3600);
      if (ageHours > 2) slaBreachRisk++;
    }

    // Compute technician stats
    let activeTechJobs = 0;
    let completedTechJobs = 0;
    for (const job of techJobs) {
      if (['assigned', 'accepted', 'in_progress'].includes(job.status)) activeTechJobs++;
      if (job.status === 'completed') completedTechJobs++;
    }

    return {
      tenantId: tId.toString(),
      calculatedAt: new Date(),
      subscribers: {
        total: totalCust,
        active: activeCust,
        suspended: totalCust - activeCust,
      },
      deviceFleet: {
        total: devices.length,
        online: onlineDev,
        offline: devices.length - onlineDev,
        onlinePercentage,
      },
      opticalHealth: {
        optimal: optOptimal,
        degraded: optDegraded,
        critical: optCritical,
      },
      incidents: {
        activeCount: activeIncidents.length,
        criticalCount: criticalInc,
        totalImpactedSubscribers: impactedSubscribers,
      },
      support: {
        openTickets: openTickets.length,
        slaBreachRiskCount: slaBreachRisk,
      },
      technicians: {
        activeDispatches: activeTechJobs,
        completedToday: completedTechJobs,
      },
      aiGovernance: {
        pendingApprovalsCount: pendingApprovals,
      },
    };
  }
}
