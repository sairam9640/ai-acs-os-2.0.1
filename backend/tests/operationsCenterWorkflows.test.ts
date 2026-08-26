import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { Customer } from '../src/models/Customer.js';
import { Device } from '../src/models/Device.js';
import { Incident } from '../src/models/Incident.js';
import { Ticket } from '../src/models/Ticket.js';
import { TechnicianJob } from '../src/models/TechnicianJob.js';
import { ApprovalRequest } from '../src/models/ApprovalPolicy.js';
import { OperationsCenterService } from '../src/services/operationsCenterService.js';

describe('AI ISP OS Part 3.2 — Operations Center & Cross-Module Workflow Tests', () => {
  let tenant: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    tenant = await Tenant.create({
      name: 'Operations Center Test ISP',
      slug: 'opscenter',
      subdomain: 'opscenter.ai-ispos.com',
      operatorKey: 'opk_ops_center',
      owner: { name: 'Ops Lead', email: 'ops@test.com', phone: '123' },
    });

    // Create Customers
    await Customer.create([
      {
        tenantId: tenant._id,
        accountNumber: 'ACC-OPS-01',
        serviceId: 'SRV-OPS-01',
        fullName: 'Active Subscriber 1',
        phone: '+919988771122',
        address: { street: '1st Ave', area: 'Central', city: 'Bengaluru', pincode: '560001' },
        status: 'active',
      },
      {
        tenantId: tenant._id,
        accountNumber: 'ACC-OPS-02',
        serviceId: 'SRV-OPS-02',
        fullName: 'Suspended Subscriber 2',
        phone: '+919988771133',
        address: { street: '2nd Ave', area: 'Central', city: 'Bengaluru', pincode: '560001' },
        status: 'suspended',
      },
    ]);

    // Create Devices
    await Device.create([
      {
        tenantId: tenant._id,
        deviceIdStr: 'ONT-OPS-01',
        serialNumber: 'HWTC-OPS-01',
        macAddress: 'EE:11:22:33:44:55',
        status: 'online',
        currentRxPowerDbm: -21.5,
      },
      {
        tenantId: tenant._id,
        deviceIdStr: 'ONT-OPS-02',
        serialNumber: 'HWTC-OPS-02',
        macAddress: 'EE:11:22:33:44:66',
        status: 'offline',
        currentRxPowerDbm: -28.0,
      },
    ]);

    // Create Incident
    await Incident.create({
      tenantId: tenant._id,
      title: 'Fiber Cut on Feeder 01',
      description: 'Major backbone cut',
      severity: 'critical',
      status: 'open',
      affectedCustomersCount: 14,
    });

    // Create Support Ticket
    await Ticket.create({
      tenantId: tenant._id,
      ticketNumber: 'TCK-OPS-001',
      title: 'Loss of optical connectivity',
      description: 'ONT red LOS light',
      priority: 'urgent',
      status: 'open',
      createdAt: new Date(Date.now() - 3 * 3600 * 1000), // Created 3 hours ago -> SLA risk
    });

    // Create Technician Job
    await TechnicianJob.create({
      tenantId: tenant._id,
      jobNumber: 'JOB-OPS-001',
      title: 'Splice repair at FAT-01',
      jobType: 'FAULT_REPAIR',
      status: 'in_progress',
    });

    // Create Pending Approval
    await ApprovalRequest.create({
      tenantId: tenant._id,
      policyId: new mongoose.Types.ObjectId(),
      targetResource: { resourceType: 'DEVICE', resourceId: 'ONT-OPS-02', identifier: 'HWTC-OPS-02' },
      action: 'REBOOT_DEVICE',
      riskLevel: 'HIGH',
      status: 'PENDING',
      requestedBy: { userId: new mongoose.Types.ObjectId(), name: 'Operator', email: 'op@test.com', role: 'noc_operator' },
      expiresAt: new Date(Date.now() + 3600000),
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('OperationsCenterService should aggregate accurate multi-domain KPIs', async () => {
    const kpis = await OperationsCenterService.getOperationsKpis(tenant._id);

    // 1. Subscribers
    expect(kpis.subscribers.total).toBe(2);
    expect(kpis.subscribers.active).toBe(1);
    expect(kpis.subscribers.suspended).toBe(1);

    // 2. Device Fleet
    expect(kpis.deviceFleet.total).toBe(2);
    expect(kpis.deviceFleet.online).toBe(1);
    expect(kpis.deviceFleet.offline).toBe(1);
    expect(kpis.deviceFleet.onlinePercentage).toBe(50.0);

    // 3. Optical Health Distribution
    expect(kpis.opticalHealth.optimal).toBe(1);
    expect(kpis.opticalHealth.critical).toBe(1);

    // 4. Incidents & Impact
    expect(kpis.incidents.activeCount).toBe(1);
    expect(kpis.incidents.criticalCount).toBe(1);
    expect(kpis.incidents.totalImpactedSubscribers).toBe(14);

    // 5. Support & SLA Risk
    expect(kpis.support.openTickets).toBe(1);
    expect(kpis.support.slaBreachRiskCount).toBe(1);

    // 6. Technician Workload & AI Governance
    expect(kpis.technicians.activeDispatches).toBe(1);
    expect(kpis.aiGovernance.pendingApprovalsCount).toBe(1);
  });
});
