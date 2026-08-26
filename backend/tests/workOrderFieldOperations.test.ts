import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { Customer } from '../src/models/Customer.js';
import { Device } from '../src/models/Device.js';
import { WorkOrderService } from '../src/services/workOrderService.js';

describe('AI ISP OS Part 3.4 — Field Operations & Work Orders Tests', () => {
  let tenant: any;
  let customer: any;
  let device: any;
  let workOrder: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    tenant = await Tenant.create({
      name: 'Field Ops Test ISP',
      slug: 'fieldopstest',
      subdomain: 'fieldopstest.ai-ispos.com',
      operatorKey: 'opk_field_ops',
      owner: { name: 'Field Lead', email: 'field@test.com', phone: '123' },
    });

    device = await Device.create({
      tenantId: tenant._id,
      deviceIdStr: 'ONT-FIELD-01',
      serialNumber: 'HWTC-FIELD-01',
      macAddress: 'CC:11:22:33:44:55',
      status: 'offline',
    });

    customer = await Customer.create({
      tenantId: tenant._id,
      accountNumber: 'ACC-FIELD-001',
      serviceId: 'SRV-FIELD-001',
      fullName: 'Anita Roy',
      phone: '+919988112233',
      address: { street: '5th Cross', area: 'Indiranagar', city: 'Bengaluru', pincode: '560038' },
      assignedDeviceId: device._id,
      status: 'pending_installation',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('WorkOrderService should create work order with materials reserved and required skills', async () => {
    workOrder = await WorkOrderService.createWorkOrder({
      tenantId: tenant._id,
      customerId: customer._id,
      jobType: 'NEW_INSTALLATION',
      priority: 'HIGH',
      requiredSkills: ['FIBER_SPLICING', 'ONT_PROVISIONING'],
      materialsReserved: [
        { itemCode: 'DROP-CABLE-50M', description: '50m FTTH Drop Cable', quantity: 1 },
        { itemCode: 'SC-APC-CONN', description: 'Fast SC/APC Connector', quantity: 2 },
      ],
    });

    expect(workOrder.workOrderId).toBeDefined();
    expect(workOrder.status).toBe('READY');
    expect(workOrder.materialsReserved.length).toBe(2);
    expect(workOrder.requiredSkills).toContain('FIBER_SPLICING');
  });

  it('WorkOrderService should transition work order status through field lifecycle', async () => {
    const assignedWo = await WorkOrderService.transitionStatus({
      tenantId: tenant._id,
      workOrderId: workOrder.workOrderId,
      newStatus: 'ASSIGNED',
      assignedTechnicianId: 'tech_rajesh_kumar',
    });
    expect(assignedWo.status).toBe('ASSIGNED');
    expect(assignedWo.assignedTechnicianId).toBe('tech_rajesh_kumar');

    const onSiteWo = await WorkOrderService.transitionStatus({
      tenantId: tenant._id,
      workOrderId: workOrder.workOrderId,
      newStatus: 'ON_SITE',
    });
    expect(onSiteWo.status).toBe('ON_SITE');
  });

  it('WorkOrderService should verify optical power gate and complete work order', async () => {
    const completedWo = await WorkOrderService.submitEvidenceAndVerify({
      tenantId: tenant._id,
      workOrderId: workOrder.workOrderId,
      measuredRxPowerDbm: -21.4, // Optimal range
      photoUrls: ['https://storage.isp.com/evidence/fat_01.jpg', 'https://storage.isp.com/evidence/ont_install.jpg'],
      customerSignOff: true,
      materialsConsumed: [
        { itemCode: 'DROP-CABLE-50M', quantity: 1 },
        { itemCode: 'SC-APC-CONN', quantity: 2 },
      ],
    });

    expect(completedWo.status).toBe('COMPLETED');
    expect(completedWo.completedAt).toBeDefined();
    expect(completedWo.evidence?.measuredRxPowerDbm).toBe(-21.4);

    // Verify Customer is now Active
    const updatedCustomer = await Customer.findById(customer._id);
    expect(updatedCustomer?.status).toBe('active');

    // Verify Device is now Online
    const updatedDevice = await Device.findById(device._id);
    expect(updatedDevice?.status).toBe('online');
    expect(updatedDevice?.currentRxPowerDbm).toBe(-21.4);
  });
});
