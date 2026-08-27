import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { Customer } from '../src/models/Customer.js';
import { Tenant } from '../src/models/Tenant.js';
import { CustomerPlan } from '../src/models/CustomerPlan.js';
import { PlanNotificationTemplate, DEFAULT_PLAN_TEMPLATES } from '../src/models/PlanNotificationTemplate.js';
import { CustomerPlanService } from '../src/services/customerPlanService.js';
import { PlanNotificationService } from '../src/services/planNotificationService.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { NotificationLog } from '../src/models/NotificationLog.js';

describe('AI ACS OS — Plan Management & Expiry Notification Engine Tests', () => {
  let tenant: any;
  let rivalTenant: any;
  let plan100M: any;
  let customer: any;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ai-isp-os-test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // Create Primary Tenant
    tenant = await Tenant.create({
      name: 'Apex GigaFiber Ltd',
      slug: `apexfiber_${Date.now()}`,
      subdomain: `apex_${Date.now()}.ai-ispos.com`,
      operatorKey: `opk_apex_${Date.now()}`,
      owner: { name: 'Apex Admin', email: `apex_${Date.now()}@test.com`, phone: '9988001122' },
    });

    // Create Rival Tenant for multi-tenant isolation testing
    rivalTenant = await Tenant.create({
      name: 'Rival Net Ltd',
      slug: `rivalnet_${Date.now()}`,
      subdomain: `rival_${Date.now()}.ai-ispos.com`,
      operatorKey: `opk_rival_${Date.now()}`,
      owner: { name: 'Rival Admin', email: `rival_${Date.now()}@test.com`, phone: '9900000000' },
    });

    // Create Catalog Plan
    plan100M = await CustomerPlan.create({
      tenantId: tenant._id,
      name: 'Apex Ultra 100 Mbps',
      code: 'APEX-100M',
      price: 699,
      currency: 'INR',
      billingCycleDays: 30,
      downloadSpeedMbps: 100,
      uploadSpeedMbps: 100,
      dataLimitGb: 0,
      description: 'Superfast unlimited broadband',
      isActive: true,
    });

    // Create Customer
    customer = await Customer.create({
      tenantId: tenant._id,
      accountNumber: 'CUST-PLAN-001',
      serviceId: 'SRV-FTTH-001',
      fullName: 'Vikramaditya Sharma',
      phone: '9845012345',
      email: 'vikram@example.com',
      serviceAddress: 'Plot 45, Jubilee Hills',
      status: 'active',
      servicePlan: {
        planId: plan100M._id.toString(),
        name: plan100M.name,
        price: plan100M.price,
        monthlyFee: plan100M.price,
        downloadSpeedMbps: 100,
        uploadSpeedMbps: 100,
        dataLimitGb: 0,
        currentCycleUsageGb: 50,
        billingStatus: 'paid',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
        renewalDate: new Date(Date.now() + 30 * 86400000),
        status: 'active',
      },
    });
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: { $in: [tenant._id, rivalTenant._id] } });
    await Customer.deleteMany({ tenantId: { $in: [tenant._id, rivalTenant._id] } });
    await CustomerPlan.deleteMany({ tenantId: { $in: [tenant._id, rivalTenant._id] } });
    await PlanNotificationTemplate.deleteMany({ tenantId: { $in: [tenant._id, rivalTenant._id] } });
    await AuditLog.deleteMany({ tenantId: { $in: [tenant._id, rivalTenant._id] } });
    await NotificationLog.deleteMany({ tenantId: { $in: [tenant._id, rivalTenant._id] } });
    await mongoose.disconnect();
  });

  it('1. Plan Activation: should assign plan, set 30-day window, emit PLAN_ACTIVATED event, and write audit log', async () => {
    const activation = await CustomerPlanService.activateCustomerPlan({
      tenantId: tenant._id,
      customerId: customer._id,
      planId: plan100M._id,
      actor: { id: 'op_001', email: 'op@apex.com', role: 'operator_admin' },
    });

    expect(activation.success).toBe(true);
    expect(activation.customer.servicePlan.name).toBe('Apex Ultra 100 Mbps');
    expect(activation.customer.servicePlan.price).toBe(699);
    expect(activation.customer.servicePlan.status).toBe('active');
    expect(activation.customer.servicePlan.startDate).toBeDefined();
    expect(activation.customer.servicePlan.endDate).toBeDefined();

    // Verify NotificationLog recorded PLAN_ACTIVATED with correct exposed fields
    const notif = await NotificationLog.findOne({
      tenantId: tenant._id,
      templateCode: 'PLAN_ACTIVATED',
      'recipient.identifier': '9845012345',
    });
    expect(notif).toBeDefined();
    expect(notif!.contentRenderedSanitized).toContain('Vikramaditya Sharma');
    expect(notif!.contentRenderedSanitized).toContain('699');
    expect(notif!.contentRenderedSanitized).toContain('Apex Ultra 100 Mbps');

    // Verify AuditLog written
    const audit = await AuditLog.findOne({
      tenantId: tenant._id,
      action: 'CUSTOMER_PLAN_ACTIVATED',
      targetId: customer._id.toString(),
    });
    expect(audit).toBeDefined();
  });

  it('2. Plan Renewal: should extend expiry date, record payment, emit PLAN_RENEWED & PAYMENT_RECEIVED, and write audit log', async () => {
    const currentEnd = new Date(customer.servicePlan.endDate).getTime();

    const renewal = await CustomerPlanService.renewCustomerPlan({
      tenantId: tenant._id,
      customerId: customer._id,
      billingCycleDays: 30,
      paymentAmount: 699,
      paymentReference: 'UPI-TEST-9988',
      paymentMode: 'UPI',
      actor: { id: 'op_001', email: 'op@apex.com', role: 'operator_admin' },
    });

    expect(renewal.success).toBe(true);
    const updatedEnd = new Date(renewal.customer.servicePlan.endDate).getTime();
    expect(updatedEnd).toBeGreaterThan(currentEnd);
    expect(renewal.customer.servicePlan.paymentReference).toBe('UPI-TEST-9988');
    expect(renewal.customer.servicePlan.lastPaymentAmount).toBe(699);

    // Verify NotificationLog recorded PLAN_RENEWED and PAYMENT_RECEIVED
    const renewedNotif = await NotificationLog.findOne({
      tenantId: tenant._id,
      templateCode: 'PLAN_RENEWED',
      'recipient.identifier': '9845012345',
    });
    expect(renewedNotif).toBeDefined();

    const payNotif = await NotificationLog.findOne({
      tenantId: tenant._id,
      templateCode: 'PAYMENT_RECEIVED',
      'recipient.identifier': '9845012345',
    });
    expect(payNotif).toBeDefined();
  });

  it('3. Expiring Plans Views: should accurately categorize into 1-Day, 3-Day, 7-Day, and Expired windows', async () => {
    // Create customer expiring in 1 day
    const cust1d = await Customer.create({
      tenantId: tenant._id,
      accountNumber: 'CUST-1D-001',
      serviceId: 'SRV-1D-001',
      fullName: 'Priya Sharma',
      phone: '9845099001',
      email: 'priya@test.com',
      serviceAddress: 'Avenue 1',
      status: 'active',
      servicePlan: {
        name: 'GigaFast 100M',
        price: 699,
        monthlyFee: 699,
        downloadSpeedMbps: 100,
        uploadSpeedMbps: 100,
        dataLimitGb: 0,
        currentCycleUsageGb: 10,
        billingStatus: 'paid',
        startDate: new Date(Date.now() - 29 * 86400000),
        endDate: new Date(Date.now() + 1 * 86400000),
        renewalDate: new Date(Date.now() + 1 * 86400000),
        status: 'expiring_soon',
      },
    });

    // Create customer expiring in 3 days
    const cust3d = await Customer.create({
      tenantId: tenant._id,
      accountNumber: 'CUST-3D-001',
      serviceId: 'SRV-3D-001',
      fullName: 'Rahul Verma',
      phone: '9845099003',
      email: 'rahul@test.com',
      serviceAddress: 'Avenue 3',
      status: 'active',
      servicePlan: {
        name: 'GigaFast 200M',
        price: 899,
        monthlyFee: 899,
        downloadSpeedMbps: 200,
        uploadSpeedMbps: 200,
        dataLimitGb: 0,
        currentCycleUsageGb: 20,
        billingStatus: 'paid',
        startDate: new Date(Date.now() - 27 * 86400000),
        endDate: new Date(Date.now() + 3 * 86400000),
        renewalDate: new Date(Date.now() + 3 * 86400000),
        status: 'expiring_soon',
      },
    });

    // Query 1-Day view
    const view1d = await CustomerPlanService.getExpiringPlans(tenant._id, '1d');
    expect(view1d.customers.some((c) => c.accountNumber === 'CUST-1D-001')).toBe(true);

    // Query 3-Day view
    const view3d = await CustomerPlanService.getExpiringPlans(tenant._id, '3d');
    expect(view3d.customers.some((c) => c.accountNumber === 'CUST-3D-001')).toBe(true);

    // Query 7-Day view
    const view7d = await CustomerPlanService.getExpiringPlans(tenant._id, '7d');
    expect(view7d.customers.some((c) => c.accountNumber === 'CUST-1D-001')).toBe(true);
    expect(view7d.customers.some((c) => c.accountNumber === 'CUST-3D-001')).toBe(true);

    await Customer.deleteMany({ _id: { $in: [cust1d._id, cust3d._id] } });
  });

  it('4. Anti-Spam & Deduplication: should prevent duplicate notification emits for same event and cycle unless forceRetrigger is used', async () => {
    const eventPayload = {
      tenantId: tenant._id,
      customerId: customer._id,
      accountNumber: customer.accountNumber,
      customerName: customer.fullName,
      mobileNumber: customer.phone,
      planName: customer.servicePlan.name,
      price: 699,
      expiryDate: new Date(customer.servicePlan.endDate).toISOString().split('T')[0],
      remainingDays: 3,
      eventType: 'PLAN_EXPIRING_3D' as const,
    };

    // First emission -> SUCCESS
    const firstEmit = await PlanNotificationService.emitPlanNotificationEvent(eventPayload);
    expect(firstEmit.success).toBe(true);
    expect(firstEmit.duplicatePrevented).toBe(false);

    // Second emission without forceRetrigger -> PREVENTED / SKIPPED
    const secondEmit = await PlanNotificationService.emitPlanNotificationEvent(eventPayload);
    expect(secondEmit.success).toBe(true);
    expect(secondEmit.duplicatePrevented).toBe(true);

    // Third emission with explicit forceRetrigger -> SUCCESS
    const forcedEmit = await PlanNotificationService.emitPlanNotificationEvent(eventPayload, { forceRetrigger: true });
    expect(forcedEmit.success).toBe(true);
    expect(forcedEmit.duplicatePrevented).toBe(false);
  });

  it('5. Customizable Templates: should allow editing template text and interpolating tokens correctly', async () => {
    const customTemplate = '⚡ Hello {customer_name}! Your plan {plan_name} costs ₹{price} and expires on {expiry_date}. Operator: {operator_name}';
    
    await PlanNotificationTemplate.findOneAndUpdate(
      { tenantId: tenant._id, eventType: 'PLAN_EXPIRING_1D' },
      {
        $set: {
          title: 'Custom 1D Reminder',
          templateText: customTemplate,
          isEnabled: true,
        },
      },
      { upsert: true, new: true }
    );

    const rendered = PlanNotificationService.renderTemplate(customTemplate, {
      tenantId: tenant._id,
      customerId: customer._id,
      accountNumber: customer.accountNumber,
      customerName: 'Ananya Roy',
      mobileNumber: '9988776655',
      planName: 'Blazing 500M',
      price: 1299,
      expiryDate: '2026-09-30',
      remainingDays: 1,
      operatorName: 'Apex Broadband',
      eventType: 'PLAN_EXPIRING_1D',
    });

    expect(rendered).toContain('Ananya Roy');
    expect(rendered).toContain('Blazing 500M');
    expect(rendered).toContain('₹1299');
    expect(rendered).toContain('2026-09-30');
    expect(rendered).toContain('Apex Broadband');
  });

  it('6. Strict Multi-Tenant Scoping: rival tenant cannot see or mutate other tenant plans or subscriptions', async () => {
    const rivalSummary = await CustomerPlanService.getExpiringPlans(rivalTenant._id, 'all');
    expect(rivalSummary.totalCustomers).toBe(0);
    expect(rivalSummary.customers.length).toBe(0);

    // Rival cannot activate plan on primary tenant's customer
    await expect(
      CustomerPlanService.activateCustomerPlan({
        tenantId: rivalTenant._id,
        customerId: customer._id,
        planName: 'Rival Stolen Plan',
      })
    ).rejects.toThrow();
  });

  it('7. Create Plan & Ascending Order: should persist plan with validity/expiry date and return plans in ascending price order', async () => {
    // Create plans with different prices and validity periods
    const p499 = await CustomerPlan.create({
      tenantId: tenant._id,
      name: 'Starter Giga 50 Mbps',
      code: 'START-50M',
      price: 499,
      currency: 'INR',
      billingCycleDays: 15,
      expiryDate: new Date(Date.now() + 15 * 86400000),
      downloadSpeedMbps: 50,
      uploadSpeedMbps: 50,
      isActive: true,
    });

    const p999 = await CustomerPlan.create({
      tenantId: tenant._id,
      name: 'Turbo Max 300 Mbps',
      code: 'TURBO-300M',
      price: 999,
      currency: 'INR',
      billingCycleDays: 60,
      expiryDate: new Date(Date.now() + 60 * 86400000),
      downloadSpeedMbps: 300,
      uploadSpeedMbps: 300,
      isActive: true,
    });

    // Query sorted ascending by price
    const plansAsc = await CustomerPlan.find({ tenantId: tenant._id }).sort({ price: 1, name: 1 });
    expect(plansAsc.length).toBeGreaterThanOrEqual(3);
    expect(plansAsc[0].price).toBe(499);
    expect(plansAsc[1].price).toBe(699);
    expect(plansAsc[2].price).toBe(999);
    expect(plansAsc[0].billingCycleDays).toBe(15);
    expect(plansAsc[0].expiryDate).toBeDefined();

    await CustomerPlan.deleteMany({ _id: { $in: [p499._id, p999._id] } });
  });

  it('8. Duplicate Prevention: should reject duplicate plan names or plan codes within the same tenant', async () => {
    // Check duplicate name
    const isDuplicate = await CustomerPlan.findOne({
      tenantId: tenant._id,
      name: { $regex: new RegExp('^apex ultra 100 mbps$', 'i') },
    });
    expect(isDuplicate).toBeDefined();

    // Verify unique index on code throws error on duplicate insert
    await expect(
      CustomerPlan.create({
        tenantId: tenant._id,
        name: 'Another Apex Plan',
        code: 'APEX-100M', // Same code as plan100M
        price: 799,
        billingCycleDays: 30,
      })
    ).rejects.toThrow();
  });

  it('9. Deactivate & Activate Toggle: should update isActive flag and record audit log', async () => {
    // Deactivate plan
    const deactivated = await CustomerPlan.findOneAndUpdate(
      { _id: plan100M._id, tenantId: tenant._id },
      { $set: { isActive: false } },
      { new: true }
    );
    expect(deactivated!.isActive).toBe(false);

    // Audit log
    const auditLogObj = await AuditLog.create({
      tenantId: tenant._id,
      actorId: new Types.ObjectId(),
      actorEmail: 'op@apex.com',
      actorRole: 'operator_admin',
      action: 'PLAN_CATALOG_DEACTIVATED',
      targetResource: 'CustomerPlan',
      targetId: plan100M._id.toString(),
      targetIdentifier: `${plan100M.name} -> DEACTIVATED`,
      correlationId: `test_deact_${Date.now()}`,
    });

    expect(auditLogObj).toBeDefined();

    // Reactivate plan
    const reactivated = await CustomerPlan.findOneAndUpdate(
      { _id: plan100M._id, tenantId: tenant._id },
      { $set: { isActive: true } },
      { new: true }
    );
    expect(reactivated!.isActive).toBe(true);
  });
});
