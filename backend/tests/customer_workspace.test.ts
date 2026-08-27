import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { Customer } from '../src/models/Customer.js';
import { CustomerPlan } from '../src/models/CustomerPlan.js';
import { Device } from '../src/models/Device.js';
import { Ticket } from '../src/models/Ticket.js';
import { TechnicianJob } from '../src/models/TechnicianJob.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { NotificationLog } from '../src/models/NotificationLog.js';
import { WarehouseStockItem } from '../src/models/WarehouseStockItem.js';
import { PaymentTransaction } from '../src/models/PaymentTransaction.js';
import { CustomerService } from '../src/services/customerService.js';

describe('AI ACS OS — Customer Operations Workspace Tests', () => {
  let testTenant: any;
  let testCustomer: any;
  let testPlan: any;
  let testDevice: any;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    testTenant = await Tenant.create({
      name: 'Workspace Test Networks',
      displayName: 'Workspace Telecom Ltd',
      slug: `ws_net_${Date.now()}`,
      subdomain: `ws_net_${Date.now()}.ai-ispos.com`,
      operatorKey: `opk_ws_${Date.now()}`,
      owner: { name: 'WS Admin', email: `ws_${Date.now()}@test.com`, phone: '9845011223' },
      isActive: true,
    });

    testPlan = await CustomerPlan.create({
      tenantId: testTenant._id,
      name: 'SuperFast 200M Unlimited',
      code: `WS_200M_${Date.now()}`,
      price: 799,
      billingCycleDays: 30,
      downloadSpeedMbps: 200,
      uploadSpeedMbps: 200,
      isActive: true,
    });

    testDevice = await Device.create({
      tenantId: testTenant._id,
      serialNumber: `GNXS-WS-${Date.now().toString().slice(-4)}`,
      manufacturer: 'Genexis',
      modelName: 'Titanium-2122A',
      macAddress: '3C:90:66:11:22:33',
      status: 'online',
      opticalStatus: 'normal',
      currentRxPowerDbm: -19.45,
      currentTxPowerDbm: 2.15,
      softwareVersion: 'V2.1.04-P1',
      hardwareVersion: 'V2.1',
      ipAddress: '10.20.44.112',
    });

    testCustomer = await Customer.create({
      tenantId: testTenant._id,
      accountNumber: `WS-${Date.now().toString().slice(-5)}`,
      serviceId: `SRV-WS-${Date.now().toString().slice(-4)}`,
      fullName: 'Srinivas Reddy',
      phone: '9845077665',
      email: 'srinivas.reddy@workspace.in',
      assignedDeviceId: testDevice._id,
      address: {
        door: 'Flat 402',
        building: 'Green Woods',
        street: '80 Feet Road',
        area: 'Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
        coordinates: { lat: 12.9716, lng: 77.5946 },
      },
      servicePlan: {
        name: testPlan.name,
        price: testPlan.price,
        startDate: new Date(Date.now() - 15 * 86400000),
        endDate: new Date(Date.now() + 15 * 86400000),
        renewalDate: new Date(Date.now() + 15 * 86400000),
        billingStatus: 'paid',
        status: 'active',
        lastPaymentAmount: 799,
        lastPaymentDate: new Date(Date.now() - 15 * 86400000),
        paymentReference: 'TXN-WS-INIT-01',
      },
      wanConfig: {
        connectionType: 'PPPoE',
        pppoeUsername: 'srinivas@wsnet',
        pppoePassword: 'securePassword2026',
        vlanId: 100,
        dnsPrimary: '8.8.8.8',
        dnsSecondary: '1.1.1.1',
      },
      kyc: {
        documentType: 'aadhaar',
        documentNumber: 'XXXX-XXXX-1234',
        idProofFrontUrl: 'https://images.unsplash.com/photo-aadhaar-front',
        idProofBackUrl: 'https://images.unsplash.com/photo-aadhaar-back',
        customerPhotoUrl: 'https://images.unsplash.com/photo-cust-selfie',
        status: 'verified',
      },
    });

    testDevice.customerId = testCustomer._id;
    await testDevice.save();

    // Create a payment transaction
    await PaymentTransaction.create({
      tenantId: testTenant._id,
      customerId: testCustomer._id,
      accountNumber: testCustomer.accountNumber,
      customerName: testCustomer.fullName,
      customerPhone: testCustomer.phone,
      transactionId: 'TXN-WS-10099',
      gateway: 'RAZORPAY',
      amount: 799,
      currency: 'INR',
      fee: 14.38,
      tax: 2.58,
      netAmount: 782.04,
      status: 'SUCCESS',
      settlementStatus: 'SETTLED',
      paymentMode: 'UPI',
      description: 'SuperFast 200M Subscription Renewal',
      idempotencyKey: `idemp_ws_${Date.now()}`,
    });

    // Create a support ticket
    await Ticket.create({
      tenantId: testTenant._id,
      customerId: testCustomer._id,
      ticketNumber: `TCK-WS-01`,
      subject: 'Wi-Fi 5GHz Channel Optimization',
      description: 'Customer requested 5GHz channel optimization for streaming.',
      category: 'WIFI_ISSUE',
      priority: 'low',
      status: 'resolved',
    });

    // Create a technician job
    await TechnicianJob.create({
      tenantId: testTenant._id,
      customerId: testCustomer._id,
      title: 'Initial FTTH Premise Installation',
      type: 'NEW_INSTALLATION',
      priority: 'medium',
      status: 'completed',
      scheduledDate: new Date(Date.now() - 15 * 86400000),
      slaDeadline: new Date(Date.now() - 14 * 86400000),
      slaBreached: false,
      location: {
        lat: 12.9716,
        lng: 77.5946,
        address: 'Indiranagar, Bengaluru',
        area: 'Indiranagar',
      },
      completedAt: new Date(Date.now() - 15 * 86400000 + 3600000),
    });

    // Create a notification log
    await NotificationLog.create({
      tenantId: testTenant._id,
      recipient: { identifier: testCustomer.phone, name: testCustomer.fullName, type: 'CUSTOMER' },
      channel: 'WHATSAPP',
      templateCode: 'PLAN_RENEWED',
      contentRenderedSanitized: 'Your plan has been renewed successfully.',
      status: 'delivered',
      correlationId: testCustomer._id.toString(),
    });
  });

  afterAll(async () => {
    if (testTenant) {
      await Tenant.deleteMany({ _id: testTenant._id });
      await Customer.deleteMany({ tenantId: testTenant._id });
      await CustomerPlan.deleteMany({ tenantId: testTenant._id });
      await Device.deleteMany({ tenantId: testTenant._id });
      await Ticket.deleteMany({ tenantId: testTenant._id });
      await TechnicianJob.deleteMany({ tenantId: testTenant._id });
      await NotificationLog.deleteMany({ tenantId: testTenant._id });
      await AuditLog.deleteMany({ tenantId: testTenant._id });
      await PaymentTransaction.deleteMany({ tenantId: testTenant._id });
      await WarehouseStockItem.deleteMany({ tenantId: testTenant._id });
    }
  });

  it('1. Customer 360 Workspace Aggregator: should load comprehensive subscriber operations view', async () => {
    const view = await CustomerService.getCustomer360(testCustomer._id.toString());
    expect(view).toBeDefined();
    expect(view.customer._id.toString()).toBe(testCustomer._id.toString());
    expect(view.device?.serialNumber).toBe(testDevice.serialNumber);
    expect(view.aiDiagnosticBrief.healthScore).toBeGreaterThan(80);
    expect(view.aiDiagnosticBrief.opticalHealth).toBe('normal');
    expect(view.operationalReports.lifetimeValue).toBeGreaterThan(0);
  });

  it('2. Assigned Physical Assets: should link ONT, SFP, and Splitter termination to customer', async () => {
    const view = await CustomerService.getCustomer360(testCustomer._id.toString());
    expect(view.assignedAssets).toBeDefined();
    expect(view.assignedAssets.ont?.serialNumber).toBe(testDevice.serialNumber);
    expect(view.assignedAssets.ont?.brand).toBe('Genexis');
    expect(view.assignedAssets.fiberTermination.fatBoxName).toContain('FAT-');
  });

  it('3. Customer Documents Vault: should upload, retrieve, and delete KYC & premise photos', async () => {
    const doc = await CustomerService.addCustomerDocument(
      testCustomer._id.toString(),
      {
        name: 'Premise FAT Box Splice Proof',
        category: 'OPTICAL_TERMINATION',
        url: 'https://images.unsplash.com/photo-splice-proof',
        fileSizeBytes: 204800,
      },
      { id: 'admin_1', email: 'admin@wsnet.in', role: 'operator_admin' }
    );

    expect(doc.documentId).toBeDefined();
    expect(doc.category).toBe('OPTICAL_TERMINATION');

    let updatedView = await CustomerService.getCustomer360(testCustomer._id.toString());
    const found = updatedView.documents.find((d) => d.documentId === doc.documentId);
    expect(found).toBeDefined();

    // Delete document
    const delRes = await CustomerService.removeCustomerDocument(
      testCustomer._id.toString(),
      doc.documentId,
      { id: 'admin_1', email: 'admin@wsnet.in', role: 'operator_admin' }
    );
    expect(delRes.success).toBe(true);

    updatedView = await CustomerService.getCustomer360(testCustomer._id.toString());
    const deleted = updatedView.documents.find((d) => d.documentId === doc.documentId);
    expect(deleted).toBeUndefined();
  });

  it('4. Hardware Stock Assignment: should assign warehouse spare stock item to subscriber', async () => {
    const asset = await CustomerService.assignCustomerAsset(
      testCustomer._id.toString(),
      {
        category: 'ROUTER',
        serialNumber: `SN-RTR-${Date.now().toString().slice(-4)}`,
        brand: 'TP-Link',
        modelName: 'Archer AX12 Wi-Fi 6',
      },
      { id: 'admin_1', email: 'admin@wsnet.in', role: 'operator_admin' }
    );

    expect(asset).toBeDefined();
    expect(asset.status).toBe('DEPLOYED');
    expect(asset.assignedTo.targetIdentifier).toBe(testCustomer.accountNumber);

    const view = await CustomerService.getCustomer360(testCustomer._id.toString());
    expect(view.assignedAssets.secondaryRouter?.serialNumber).toBe(asset.serialNumber);
  });

  it('5. Unified 360 Customer Timeline: should aggregate events across billing, WhatsApp, tickets, jobs, and audit streams', async () => {
    const view = await CustomerService.getCustomer360(testCustomer._id.toString());
    expect(view.timeline.length).toBeGreaterThanOrEqual(4);

    const types = view.timeline.map((t) => t.type);
    expect(types).toContain('BILLING');
    expect(types).toContain('WHATSAPP');
    expect(types).toContain('TICKET');
    expect(types).toContain('FIELD_JOB');

    // Ensure chronological sorting (newest first)
    for (let i = 0; i < view.timeline.length - 1; i++) {
      expect(view.timeline[i].timestamp.getTime()).toBeGreaterThanOrEqual(view.timeline[i + 1].timestamp.getTime());
    }
  });

  it('6. Security & Audit Logging: should log PII unmask event with client IP and operator identity', async () => {
    const result = await CustomerService.logUnmaskAudit(
      testCustomer._id.toString(),
      'PPPOE_PASSWORD',
      { id: 'admin_1', email: 'admin@wsnet.in', role: 'operator_admin' },
      '192.168.1.50'
    );
    expect(result.success).toBe(true);

    const audit = await AuditLog.findOne({
      tenantId: testTenant._id,
      action: 'CUSTOMER_PII_UNMASKED',
      targetId: testCustomer._id.toString(),
    });

    expect(audit).toBeDefined();
    expect(audit?.actorEmail).toBe('admin@wsnet.in');
    expect(audit?.ipAddress).toBe('192.168.1.50');
  });
});
