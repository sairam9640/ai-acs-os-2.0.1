import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { User } from '../src/models/User.js';
import { Customer } from '../src/models/Customer.js';
import { Device } from '../src/models/Device.js';
import { FiberNode } from '../src/models/FiberTopology.js';
import { DiagnosticsService } from '../src/services/diagnosticsService.js';
import { OpticalBudgetService } from '../src/services/opticalBudgetService.js';
import { WorkOrderService } from '../src/services/workOrderService.js';
import { BillingEngineService } from '../src/services/billingEngineService.js';
import { CustomerPortalService } from '../src/services/customerPortalService.js';
import { OperationsCenterService } from '../src/services/operationsCenterService.js';

describe('AI ISP OS Part 3.6 — Master Production Hardening & Full Lifecycle Test Suite', () => {
  let tenant: any;
  let operator: any;
  let customer: any;
  let device: any;
  let centralOfficeNode: any;
  let fatNode: any;
  let workOrder: any;
  let invoice: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    const rand = Date.now();
    // 1. Super Admin creates tenant
    tenant = await Tenant.create({
      name: `Apex Enterprise Fiber ${rand}`,
      slug: `apexenterprise_${rand}`,
      subdomain: `apexenterprise_${rand}.ai-ispos.com`,
      operatorKey: `opk_apex_prod_${rand}`,
      owner: { name: 'Super Admin', email: `admin_${rand}@apexenterprise.com`, phone: '123' },
    });

    // 2. Operator User
    operator = await User.create({
      tenantId: tenant._id,
      fullName: 'NOC Lead Engineer',
      email: `lead_${rand}@apexenterprise.com`,
      phone: '+919988112233',
      passwordHash: 'argon2_hashed_secret',
      role: 'noc_operator',
      permissions: ['ALL'],
      status: 'active',
    });

    // 3. Central Office & FAT GIS Nodes
    centralOfficeNode = await FiberNode.create({
      tenantId: tenant._id,
      nodeCode: 'CO-PROD-99',
      name: 'Apex Primary Central Office',
      nodeType: 'CENTRAL_OFFICE',
      coordinates: { lat: 12.9716, lng: 77.5946 },
    });

    fatNode = await FiberNode.create({
      tenantId: tenant._id,
      nodeCode: 'FAT-PROD-99',
      name: 'Indiranagar 100ft Road FAT',
      nodeType: 'FAT_NAP_BOX',
      upstreamNodeId: centralOfficeNode._id,
      coordinates: { lat: 12.9725, lng: 77.5958 },
    });

    // 4. Hardware ONT Device
    device = await Device.create({
      tenantId: tenant._id,
      deviceIdStr: `ONT-PROD-${rand}`,
      serialNumber: `HWTC-PROD-${rand}`,
      macAddress: `FF:EE:DD:CC:${(rand % 90 + 10)}:${(rand % 80 + 10)}`,
      status: 'online',
      currentRxPowerDbm: -21.4,
      currentTxPowerDbm: 2.1,
      uptimeSeconds: 120000,
    });

    // 5. Customer Record
    customer = await Customer.create({
      tenantId: tenant._id,
      accountNumber: `ACC-PROD-${rand}`,
      serviceId: `SRV-PROD-${rand}`,
      fullName: 'Anita Roy',
      phone: `+9199880${rand.toString().substring(8)}`,
      address: { street: '100ft Road', area: 'Indiranagar', city: 'Bengaluru', pincode: '560038' },
      servicePlan: { name: 'Gigabit Fiber 1G', downloadSpeedMbps: 1000, monthlyFee: 1999 },
      assignedDeviceId: device._id,
      fiberDropInfo: { fatBoxNodeId: fatNode._id, portNumber: 4, dropCableLengthMeters: 30 },
      status: 'active',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('Stage 1: Health Probes & Multi-Tenancy Scoping', async () => {
    expect(tenant._id).toBeDefined();
    expect(operator.role).toBe('noc_operator');
    expect(mongoose.connection.readyState).toBe(1);
  });

  it('Stage 2: Diagnostics & Optical Link Budget Calculation', async () => {
    const diag = await DiagnosticsService.runDiagnostic({
      tenantId: tenant._id,
      deviceId: device._id,
      diagnosticType: 'PING',
      parameters: { host: '8.8.8.8', count: 4 },
    });
    expect(diag.status).toBe('COMPLETED');
    expect(diag.data.packetsReceived).toBe(4);

    const budget = await OpticalBudgetService.calculateCustomerOpticalBudget(tenant._id, customer._id);
    expect(budget.expectedRxPowerDbm).toBeLessThan(0);
    expect(['OPTIMAL', 'DEGRADED']).toContain(budget.opticalHealthStatus);
  });

  it('Stage 3: Field Work Order Dispatch & Optical Verification Gate', async () => {
    workOrder = await WorkOrderService.createWorkOrder({
      tenantId: tenant._id,
      customerId: customer._id,
      jobType: 'NEW_INSTALLATION',
      priority: 'HIGH',
      requiredSkills: ['FIBER_SPLICING', 'ONT_PROVISIONING'],
    });
    expect(workOrder.status).toBe('READY');

    const completedWo = await WorkOrderService.submitEvidenceAndVerify({
      tenantId: tenant._id,
      workOrderId: workOrder.workOrderId,
      measuredRxPowerDbm: -21.2,
      photoUrls: ['https://storage.isp.com/evidence/site.jpg'],
      customerSignOff: true,
    });
    expect(completedWo.status).toBe('COMPLETED');
    expect(completedWo.completedAt).toBeDefined();
  });

  it('Stage 4: Deterministic Subscription Billing & Payment Settlement', async () => {
    invoice = await BillingEngineService.generateInvoice({
      tenantId: tenant._id,
      customerId: customer._id,
      discountAmount: 0,
      taxRatePercent: 18.0,
    });
    expect(invoice.subtotal).toBe(1999);
    expect(invoice.taxAmount).toBe(359.82);
    expect(invoice.totalPayable).toBe(2358.82);

    const paidInvoice = await BillingEngineService.settleInvoicePayment({
      tenantId: tenant._id,
      invoiceId: invoice.invoiceId,
      paymentMethod: 'UPI',
      transactionReference: 'upi_tx_master_999',
      amountPaid: 2358.82,
    });
    expect(paidInvoice.status).toBe('PAID');
  });

  it('Stage 5: Customer Self-Service Portal & Operations Center Aggregation', async () => {
    const custDash = await CustomerPortalService.getCustomerDashboard(tenant._id, customer._id);
    expect(custDash.serviceStatus).toBe('ONLINE');
    expect(custDash.plan.downloadSpeedMbps).toBe(1000);
    expect(custDash.invoices.length).toBeGreaterThanOrEqual(1);

    const kpis = await OperationsCenterService.getOperationsKpis(tenant._id);
    expect(kpis.subscribers.total).toBe(1);
    expect(kpis.subscribers.active).toBe(1);
    expect(kpis.deviceFleet.onlinePercentage).toBe(100.0);
  });
});
