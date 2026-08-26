import { Types } from 'mongoose';
import { Customer, ICustomer } from '../models/Customer.js';
import { CustomerPlan, ICustomerPlan } from '../models/CustomerPlan.js';
import { Tenant } from '../models/Tenant.js';
import { PlanNotificationEventType } from '../models/PlanNotificationTemplate.js';
import { PlanNotificationService } from './planNotificationService.js';
import { recordAuditLog } from '../middleware/audit.js';

export interface IExpiringPlanItem {
  customerId: string;
  accountNumber: string;
  serviceId: string;
  customerName: string;
  phone: string;
  email: string;
  planName: string;
  price: number;
  startDate: string;
  endDate: string;
  remainingDays: number;
  status: 'active' | 'expiring_soon' | 'expired' | 'suspended';
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  lastNotifiedEvent?: string;
  lastNotifiedAt?: string;
}

export interface IExpiringPlansSummary {
  totalCustomers: number;
  count1d: number;
  count3d: number;
  count7d: number;
  countExpired: number;
  countActive: number;
  customers: IExpiringPlanItem[];
}

export class CustomerPlanService {
  /**
   * Calculates remaining days until plan expiration
   */
  static calculateRemainingDays(endDate?: Date | string | null): number {
    if (!endDate) return 0;
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Retrieves and categorizes customer subscriptions by expiration window (1d, 3d, 7d, expired, all)
   */
  static async getExpiringPlans(
    tenantId: string | Types.ObjectId,
    window: '1d' | '3d' | '7d' | 'all' | 'expired' = 'all',
    search?: string
  ): Promise<IExpiringPlansSummary> {
    const tId = new Types.ObjectId(tenantId);
    const query: any = { tenantId: tId };

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { fullName: new RegExp(s, 'i') },
        { accountNumber: new RegExp(s, 'i') },
        { serviceId: new RegExp(s, 'i') },
        { phone: new RegExp(s, 'i') },
        { 'servicePlan.name': new RegExp(s, 'i') },
      ];
    }

    const customers = await Customer.find(query).sort({ 'servicePlan.endDate': 1, 'servicePlan.renewalDate': 1 });

    let count1d = 0;
    let count3d = 0;
    let count7d = 0;
    let countExpired = 0;
    let countActive = 0;

    const mappedItems: IExpiringPlanItem[] = [];

    for (const c of customers) {
      const effectiveEndDate = c.servicePlan?.endDate || c.servicePlan?.renewalDate || new Date();
      const remainingDays = this.calculateRemainingDays(effectiveEndDate);

      let computedStatus: 'active' | 'expiring_soon' | 'expired' | 'suspended' = 'active';
      if (c.status === 'suspended') {
        computedStatus = 'suspended';
      } else if (remainingDays <= 0) {
        computedStatus = 'expired';
        countExpired++;
      } else if (remainingDays <= 7) {
        computedStatus = 'expiring_soon';
        if (remainingDays <= 1) count1d++;
        if (remainingDays <= 3) count3d++;
        count7d++;
      } else {
        countActive++;
      }

      const lastNotification = c.servicePlan?.notificationHistory?.length
        ? c.servicePlan.notificationHistory[c.servicePlan.notificationHistory.length - 1]
        : undefined;

      const item: IExpiringPlanItem = {
        customerId: c._id.toString(),
        accountNumber: c.accountNumber,
        serviceId: c.serviceId,
        customerName: c.fullName,
        phone: c.phone,
        email: c.email,
        planName: c.servicePlan?.name || 'Standard Fiber Plan',
        price: c.servicePlan?.price ?? c.servicePlan?.monthlyFee ?? 699,
        startDate: (c.servicePlan?.startDate || c.createdAt).toISOString().split('T')[0],
        endDate: new Date(effectiveEndDate).toISOString().split('T')[0],
        remainingDays,
        status: computedStatus,
        lastPaymentDate: c.servicePlan?.lastPaymentDate ? new Date(c.servicePlan.lastPaymentDate).toISOString().split('T')[0] : undefined,
        lastPaymentAmount: c.servicePlan?.lastPaymentAmount,
        lastNotifiedEvent: lastNotification?.eventType,
        lastNotifiedAt: lastNotification?.emittedAt ? new Date(lastNotification.emittedAt).toISOString() : undefined,
      };

      // Filter based on requested window
      if (window === '1d' && remainingDays <= 1 && remainingDays >= 0) {
        mappedItems.push(item);
      } else if (window === '3d' && remainingDays <= 3 && remainingDays >= 0) {
        mappedItems.push(item);
      } else if (window === '7d' && remainingDays <= 7 && remainingDays >= 0) {
        mappedItems.push(item);
      } else if (window === 'expired' && remainingDays < 0) {
        mappedItems.push(item);
      } else if (window === 'all') {
        mappedItems.push(item);
      }
    }

    return {
      totalCustomers: customers.length,
      count1d,
      count3d,
      count7d,
      countExpired,
      countActive,
      customers: mappedItems,
    };
  }

  /**
   * Activates a new plan for a customer and emits PLAN_ACTIVATED event
   */
  static async activateCustomerPlan(params: {
    tenantId: string | Types.ObjectId;
    customerId: string | Types.ObjectId;
    planId?: string | Types.ObjectId;
    planName?: string;
    price?: number;
    billingCycleDays?: number;
    downloadSpeedMbps?: number;
    uploadSpeedMbps?: number;
    dataLimitGb?: number;
    actor?: { id: string; email: string; role: string };
  }) {
    const tId = new Types.ObjectId(params.tenantId);
    const cId = new Types.ObjectId(params.customerId);

    const customer = await Customer.findOne({ _id: cId, tenantId: tId });
    if (!customer) throw new Error('Customer not found');

    let planName = params.planName;
    let price = params.price;
    let cycleDays = params.billingCycleDays || 30;
    let downSpeed = params.downloadSpeedMbps;
    let upSpeed = params.uploadSpeedMbps;
    let quota = params.dataLimitGb;

    if (params.planId) {
      const catalogPlan = await CustomerPlan.findOne({ _id: new Types.ObjectId(params.planId), tenantId: tId });
      if (catalogPlan) {
        planName = catalogPlan.name;
        price = catalogPlan.price;
        cycleDays = catalogPlan.billingCycleDays || 30;
        downSpeed = catalogPlan.downloadSpeedMbps;
        upSpeed = catalogPlan.uploadSpeedMbps;
        quota = catalogPlan.dataLimitGb;
        await CustomerPlan.updateOne({ _id: catalogPlan._id }, { $inc: { activeSubscribersCount: 1 } });
      }
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + cycleDays * 24 * 60 * 60 * 1000);

    customer.servicePlan = {
      planId: params.planId?.toString(),
      name: planName || 'GigaFiber 100 Mbps',
      price: price ?? 699,
      monthlyFee: price ?? 699,
      downloadSpeedMbps: downSpeed ?? 100,
      uploadSpeedMbps: upSpeed ?? 100,
      dataLimitGb: quota ?? 0,
      currentCycleUsageGb: 0,
      billingStatus: 'paid',
      startDate,
      endDate,
      renewalDate: endDate,
      status: 'active',
      lastPaymentDate: new Date(),
      lastPaymentAmount: price ?? 699,
      paymentReference: `ACT_${Date.now()}`,
      notificationHistory: customer.servicePlan?.notificationHistory || [],
    };
    customer.status = 'active';

    await customer.save();

    const remainingDays = this.calculateRemainingDays(endDate);
    const expiryDateStr = endDate.toISOString().split('T')[0];

    // Emit PLAN_ACTIVATED event
    await PlanNotificationService.emitPlanNotificationEvent({
      tenantId: tId,
      customerId: cId,
      accountNumber: customer.accountNumber,
      customerName: customer.fullName,
      mobileNumber: customer.phone,
      planName: customer.servicePlan.name,
      price: customer.servicePlan.price || 699,
      expiryDate: expiryDateStr,
      remainingDays,
      eventType: 'PLAN_ACTIVATED',
      actorId: params.actor?.id,
      actorEmail: params.actor?.email,
      actorRole: params.actor?.role,
    });

    // Record Audit Log
    await recordAuditLog({
      tenantId: tId,
      actorId: params.actor?.id || 'operator',
      actorEmail: params.actor?.email || 'operator@ai-ispos.com',
      actorRole: params.actor?.role || 'OPERATOR',
      action: 'CUSTOMER_PLAN_ACTIVATED',
      targetResource: 'CustomerPlan',
      targetId: customer._id.toString(),
      targetIdentifier: `${customer.accountNumber} -> ${customer.servicePlan.name}`,
      correlationId: `plan_act_${Date.now()}`,
    });

    return { success: true, customer, message: `Plan ${customer.servicePlan.name} activated successfully.` };
  }

  /**
   * Renews customer plan, records payment, extends validity, and emits PLAN_RENEWED & PAYMENT_RECEIVED
   */
  static async renewCustomerPlan(params: {
    tenantId: string | Types.ObjectId;
    customerId: string | Types.ObjectId;
    planId?: string | Types.ObjectId;
    billingCycleDays?: number;
    paymentAmount?: number;
    paymentReference?: string;
    paymentMode?: string;
    actor?: { id: string; email: string; role: string };
  }) {
    const tId = new Types.ObjectId(params.tenantId);
    const cId = new Types.ObjectId(params.customerId);

    const customer = await Customer.findOne({ _id: cId, tenantId: tId });
    if (!customer) throw new Error('Customer not found');

    let cycleDays = params.billingCycleDays || 30;
    let price = params.paymentAmount ?? customer.servicePlan?.price ?? 699;
    let planName = customer.servicePlan?.name || 'Broadband Plan';

    if (params.planId) {
      const catalogPlan = await CustomerPlan.findOne({ _id: new Types.ObjectId(params.planId), tenantId: tId });
      if (catalogPlan) {
        planName = catalogPlan.name;
        price = params.paymentAmount ?? catalogPlan.price;
        cycleDays = params.billingCycleDays || catalogPlan.billingCycleDays || 30;
      }
    }

    const currentEnd = customer.servicePlan?.endDate ? new Date(customer.servicePlan.endDate).getTime() : Date.now();
    const baseTime = currentEnd > Date.now() ? currentEnd : Date.now();
    const newEndDate = new Date(baseTime + cycleDays * 24 * 60 * 60 * 1000);

    customer.servicePlan.name = planName;
    customer.servicePlan.price = price;
    customer.servicePlan.monthlyFee = price;
    customer.servicePlan.endDate = newEndDate;
    customer.servicePlan.renewalDate = newEndDate;
    customer.servicePlan.status = 'active';
    customer.servicePlan.billingStatus = 'paid';
    customer.servicePlan.lastPaymentDate = new Date();
    customer.servicePlan.lastPaymentAmount = price;
    customer.servicePlan.paymentReference = params.paymentReference || `REN_${Date.now()}`;
    customer.status = 'active';

    await customer.save();

    const remainingDays = this.calculateRemainingDays(newEndDate);
    const expiryDateStr = newEndDate.toISOString().split('T')[0];

    // Emit PLAN_RENEWED event
    await PlanNotificationService.emitPlanNotificationEvent({
      tenantId: tId,
      customerId: cId,
      accountNumber: customer.accountNumber,
      customerName: customer.fullName,
      mobileNumber: customer.phone,
      planName: customer.servicePlan.name,
      price,
      expiryDate: expiryDateStr,
      remainingDays,
      eventType: 'PLAN_RENEWED',
      actorId: params.actor?.id,
      actorEmail: params.actor?.email,
      actorRole: params.actor?.role,
    });

    // Emit PAYMENT_RECEIVED event
    await PlanNotificationService.emitPlanNotificationEvent({
      tenantId: tId,
      customerId: cId,
      accountNumber: customer.accountNumber,
      customerName: customer.fullName,
      mobileNumber: customer.phone,
      planName: customer.servicePlan.name,
      price,
      expiryDate: expiryDateStr,
      remainingDays,
      eventType: 'PAYMENT_RECEIVED',
      actorId: params.actor?.id,
      actorEmail: params.actor?.email,
      actorRole: params.actor?.role,
    });

    // Record Audit Log
    await recordAuditLog({
      tenantId: tId,
      actorId: params.actor?.id || 'operator',
      actorEmail: params.actor?.email || 'operator@ai-ispos.com',
      actorRole: params.actor?.role || 'OPERATOR',
      action: 'CUSTOMER_PLAN_RENEWED',
      targetResource: 'CustomerPlan',
      targetId: customer._id.toString(),
      targetIdentifier: `${customer.accountNumber} (Amount: ₹${price}, Mode: ${params.paymentMode || 'Cash/Online'})`,
      correlationId: customer.servicePlan.paymentReference,
    });

    return { success: true, customer, message: `Plan renewed until ${expiryDateStr} successfully.` };
  }

  /**
   * Explicitly retriggers a notification event for a customer, bypassing duplicate prevention
   */
  static async retriggerNotification(params: {
    tenantId: string | Types.ObjectId;
    customerId: string | Types.ObjectId;
    eventType: PlanNotificationEventType;
    actor?: { id: string; email: string; role: string };
  }) {
    const tId = new Types.ObjectId(params.tenantId);
    const cId = new Types.ObjectId(params.customerId);

    const customer = await Customer.findOne({ _id: cId, tenantId: tId });
    if (!customer) throw new Error('Customer not found');

    const effectiveEndDate = customer.servicePlan?.endDate || customer.servicePlan?.renewalDate || new Date();
    const remainingDays = this.calculateRemainingDays(effectiveEndDate);
    const expiryDateStr = new Date(effectiveEndDate).toISOString().split('T')[0];

    const result = await PlanNotificationService.emitPlanNotificationEvent(
      {
        tenantId: tId,
        customerId: cId,
        accountNumber: customer.accountNumber,
        customerName: customer.fullName,
        mobileNumber: customer.phone,
        planName: customer.servicePlan?.name || 'Broadband Plan',
        price: customer.servicePlan?.price ?? customer.servicePlan?.monthlyFee ?? 699,
        expiryDate: expiryDateStr,
        remainingDays,
        eventType: params.eventType,
        actorId: params.actor?.id,
        actorEmail: params.actor?.email,
        actorRole: params.actor?.role,
      },
      { forceRetrigger: true }
    );

    // Record Audit Log
    await recordAuditLog({
      tenantId: tId,
      actorId: params.actor?.id || 'operator',
      actorEmail: params.actor?.email || 'operator@ai-ispos.com',
      actorRole: params.actor?.role || 'OPERATOR',
      action: `CUSTOMER_PLAN_NOTIFICATION_RETRIGGERED_${params.eventType}`,
      targetResource: 'CustomerPlanNotification',
      targetId: customer._id.toString(),
      targetIdentifier: `${customer.accountNumber} -> ${params.eventType}`,
      correlationId: result.messageId || `retrig_${Date.now()}`,
    });

    return result;
  }

  /**
   * Automated cron scanner: Inspects customer expiration windows (7d, 3d, 1d, expired) and emits notifications
   */
  static async runAutomatedExpiryScanner(tenantIdFilter?: string | Types.ObjectId) {
    const query: any = {};
    if (tenantIdFilter) query.tenantId = new Types.ObjectId(tenantIdFilter);

    const customers = await Customer.find(query);

    let scannedCount = 0;
    let emittedCount = 0;
    let skippedDuplicates = 0;
    let expiredCount = 0;

    for (const c of customers) {
      scannedCount++;
      const effectiveEndDate = c.servicePlan?.endDate || c.servicePlan?.renewalDate;
      if (!effectiveEndDate) continue;

      const remainingDays = this.calculateRemainingDays(effectiveEndDate);
      const expiryDateStr = new Date(effectiveEndDate).toISOString().split('T')[0];

      let targetEvent: PlanNotificationEventType | null = null;

      if (remainingDays === 7) {
        targetEvent = 'PLAN_EXPIRING_7D';
      } else if (remainingDays === 3) {
        targetEvent = 'PLAN_EXPIRING_3D';
      } else if (remainingDays === 1) {
        targetEvent = 'PLAN_EXPIRING_1D';
      } else if (remainingDays <= 0 && c.servicePlan?.status !== 'expired') {
        targetEvent = 'PLAN_EXPIRED';
        expiredCount++;
        await Customer.updateOne(
          { _id: c._id },
          { $set: { 'servicePlan.status': 'expired', 'servicePlan.billingStatus': 'overdue' } }
        );
      }

      if (targetEvent) {
        const emitRes = await PlanNotificationService.emitPlanNotificationEvent({
          tenantId: c.tenantId,
          customerId: c._id,
          accountNumber: c.accountNumber,
          customerName: c.fullName,
          mobileNumber: c.phone,
          planName: c.servicePlan?.name || 'Broadband Plan',
          price: c.servicePlan?.price ?? c.servicePlan?.monthlyFee ?? 699,
          expiryDate: expiryDateStr,
          remainingDays,
          eventType: targetEvent,
        });

        if (emitRes.duplicatePrevented) {
          skippedDuplicates++;
        } else if (emitRes.success) {
          emittedCount++;
        }
      }
    }

    return {
      scannedCount,
      emittedCount,
      skippedDuplicates,
      expiredCount,
    };
  }
}
