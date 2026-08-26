import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { Customer } from '../src/models/Customer.js';
import { Device } from '../src/models/Device.js';
import { BillingEngineService } from '../src/services/billingEngineService.js';

describe('AI ISP OS Part 3.3 — Customer Lifecycle, Billing & Subscriptions Tests', () => {
  let tenant: any;
  let customer: any;
  let device: any;
  let generatedInvoice: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    tenant = await Tenant.create({
      name: 'Billing Test ISP',
      slug: 'billingtest',
      subdomain: 'billingtest.ai-ispos.com',
      operatorKey: 'opk_billing_test',
      owner: { name: 'Billing Lead', email: 'bill@test.com', phone: '123' },
    });

    device = await Device.create({
      tenantId: tenant._id,
      deviceIdStr: 'ONT-BILL-01',
      serialNumber: 'HWTC-BILL-01',
      macAddress: 'AA:55:66:77:88:99',
      status: 'offline', // Suspended state
    });

    customer = await Customer.create({
      tenantId: tenant._id,
      accountNumber: 'ACC-BILL-001',
      serviceId: 'SRV-BILL-001',
      fullName: 'Vikram Mehta',
      phone: '+919988443322',
      address: { street: '12th Main', area: 'Koramangala', city: 'Bengaluru', pincode: '560034' },
      servicePlan: { name: 'Ultra Fiber 300M', downloadSpeedMbps: 300, monthlyFee: 1000 },
      assignedDeviceId: device._id,
      status: 'suspended', // Suspended for non-payment
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('BillingEngineService should generate deterministic invoice with correct GST tax calculation', async () => {
    generatedInvoice = await BillingEngineService.generateInvoice({
      tenantId: tenant._id,
      customerId: customer._id,
      discountAmount: 100, // 1000 - 100 = 900
      taxRatePercent: 18.0, // 18% of 900 = 162
    });

    expect(generatedInvoice.invoiceId).toBeDefined();
    expect(generatedInvoice.subtotal).toBe(900);
    expect(generatedInvoice.taxAmount).toBe(162);
    expect(generatedInvoice.totalPayable).toBe(1062);
    expect(generatedInvoice.status).toBe('ISSUED');
  });

  it('BillingEngineService should settle payment and automatically reactivate suspended customer and ONT', async () => {
    const paidInvoice = await BillingEngineService.settleInvoicePayment({
      tenantId: tenant._id,
      invoiceId: generatedInvoice.invoiceId,
      paymentMethod: 'UPI',
      transactionReference: 'upi_tx_998877',
      amountPaid: 1062,
    });

    expect(paidInvoice.status).toBe('PAID');
    expect(paidInvoice.paidAt).toBeDefined();

    // Verify Customer Reactivation
    const updatedCustomer = await Customer.findById(customer._id);
    expect(updatedCustomer?.status).toBe('active');

    // Verify Device Online Status
    const updatedDevice = await Device.findById(device._id);
    expect(updatedDevice?.status).toBe('online');
  });

  it('BillingEngineService should retrieve customer invoice history', async () => {
    const history = await BillingEngineService.getCustomerInvoices(tenant._id, customer._id);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].invoiceId).toBe(generatedInvoice.invoiceId);
  });
});
