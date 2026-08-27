import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { Customer } from '../src/models/Customer.js';
import { CustomerPlan } from '../src/models/CustomerPlan.js';
import { PaymentGatewayConfig } from '../src/models/PaymentGatewayConfig.js';
import { PaymentTransaction } from '../src/models/PaymentTransaction.js';
import { WarehouseStockItem } from '../src/models/WarehouseStockItem.js';
import { Vendor } from '../src/models/Vendor.js';
import { GatewayCrypto, PaymentGatewayService } from '../src/services/paymentGatewayService.js';
import { ReconciliationService } from '../src/services/reconciliationService.js';
import { WarehouseInventoryService } from '../src/services/warehouseInventoryService.js';
import { AnalyticsReportService } from '../src/services/analyticsReportService.js';

describe('AI ACS OS — Enterprise Architecture & ISP Operations Platform Tests', () => {
  let testTenant: any;
  let testCustomer: any;
  let testPlan: any;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    testTenant = await Tenant.create({
      name: 'Enterprise Apex Networks',
      displayName: 'Apex Telecom Enterprise',
      slug: `apex_ent_${Date.now()}`,
      subdomain: `apex_ent_${Date.now()}.ai-ispos.com`,
      operatorKey: `opk_apex_${Date.now()}`,
      owner: { name: 'Apex Admin', email: `apex_${Date.now()}@test.com`, phone: '9845012345' },
      isActive: true,
      operatorWhatsApp: {
        configured: true,
        phoneNumber: '+919845012345',
        status: 'CONNECTED',
      },
    });

    testPlan = await CustomerPlan.create({
      tenantId: testTenant._id,
      name: 'Ultra Giga 300M Combo',
      code: `COMBO_300M_${Date.now()}`,
      price: 999,
      billingCycleDays: 30,
      downloadSpeedMbps: 300,
      uploadSpeedMbps: 300,
      isActive: true,
      comboAddons: {
        ottApps: ['Disney+ Hotstar', 'SonyLIV', 'Zee5'],
        iptvChannelsCount: 350,
        voipMinutes: 1000,
      },
    });

    testCustomer = await Customer.create({
      tenantId: testTenant._id,
      accountNumber: `APEX-${Date.now().toString().slice(-5)}`,
      serviceId: `SRV-FTTH-${Date.now().toString().slice(-4)}`,
      fullName: 'Ravi Teja Varma',
      phone: '9845099881',
      email: 'raviteja@apexnet.in',
      status: 'active',
      servicePlan: {
        name: testPlan.name,
        price: testPlan.price,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
        status: 'active',
      },
    });
  });

  afterAll(async () => {
    if (testTenant) {
      await Tenant.deleteMany({ _id: testTenant._id });
      await Customer.deleteMany({ tenantId: testTenant._id });
      await CustomerPlan.deleteMany({ tenantId: testTenant._id });
      await PaymentGatewayConfig.deleteMany({ tenantId: testTenant._id });
      await PaymentTransaction.deleteMany({ tenantId: testTenant._id });
      await WarehouseStockItem.deleteMany({ tenantId: testTenant._id });
      await Vendor.deleteMany({ tenantId: testTenant._id });
    }
  });

  it('1. Cryptographic Security: should encrypt merchant credentials at rest with AES-256-GCM and decrypt in memory', () => {
    const rawCredentials = {
      keyId: 'rzp_live_ApexNoc998',
      keySecret: 'SuperSecretKey9988!!',
      merchantId: 'M_APEX_CORP',
    };

    const encrypted = GatewayCrypto.encrypt(rawCredentials);
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.authTag).toBeDefined();
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.ciphertext).not.toContain('rzp_live_ApexNoc998');

    const decrypted = GatewayCrypto.decrypt(encrypted);
    expect(decrypted.keyId).toBe(rawCredentials.keyId);
    expect(decrypted.keySecret).toBe(rawCredentials.keySecret);
    expect(decrypted.merchantId).toBe(rawCredentials.merchantId);
  });

  it('2. Payment Gateway Management: should configure and save tenant gateway with public metadata extraction', async () => {
    const config = await PaymentGatewayService.saveGatewayConfig({
      tenantId: testTenant._id,
      gateway: 'RAZORPAY',
      displayName: 'Apex Primary Razorpay Gateway',
      isEnabled: true,
      isTestMode: false,
      credentials: {
        keyId: 'rzp_live_APEX12345',
        keySecret: 'RzpSecretKey12345',
        merchantId: 'APEX_MERCHANT_01',
      },
      webhookSecret: 'whsec_apex_rzp_99',
      actor: { id: 'admin_1', email: 'admin@apexnet.in', role: 'operator_admin' },
    });

    expect(config.isEnabled).toBe(true);
    expect(config.publicMetadata.keyId).toBe('rzp_live_APEX12345');
    expect(config.webhookEndpointUrl).toBe(`/api/v1/webhooks/payments/razorpay/${testTenant.slug}`);

    const tenantGateways = await PaymentGatewayService.getTenantGateways(testTenant._id);
    expect(tenantGateways.length).toBe(1);
    expect(tenantGateways[0].gateway).toBe('RAZORPAY');
    // Ensure raw secret is not returned in public list
    expect(tenantGateways[0].encryptedCredentials).toBeUndefined();
  });

  it('3. Checkout Order Generation: should create payment order and initialize PaymentTransaction', async () => {
    const orderResult = await PaymentGatewayService.createPaymentOrder({
      tenantId: testTenant._id,
      customerId: testCustomer._id,
      gateway: 'RAZORPAY',
      amount: 999,
      planName: testPlan.name,
      validityDays: 30,
    });

    expect(orderResult.success).toBe(true);
    expect(orderResult.orderId).toContain('razorpay_ord_');
    expect(orderResult.transactionId).toContain('TXN-');
    expect(orderResult.amount).toBe(999);

    const txn = await PaymentTransaction.findOne({ transactionId: orderResult.transactionId });
    expect(txn).toBeDefined();
    expect(txn?.status).toBe('INITIATED');
    expect(txn?.accountNumber).toBe(testCustomer.accountNumber);
  });

  it('4. Inbound Webhook & Auto-Renewal: should verify webhook, mark transaction SUCCESS, and extend subscriber plan', async () => {
    const orderResult = await PaymentGatewayService.createPaymentOrder({
      tenantId: testTenant._id,
      customerId: testCustomer._id,
      gateway: 'RAZORPAY',
      amount: 999,
      planName: testPlan.name,
      validityDays: 30,
    });

    const mockWebhookBody = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_ApexVerified123',
            order_id: orderResult.orderId,
            amount: 99900, // in paise
            status: 'captured',
          },
        },
      },
    };

    const webhookResult = await PaymentGatewayService.handleWebhook({
      gateway: 'RAZORPAY',
      tenantSlug: testTenant.slug,
      rawBody: mockWebhookBody,
      headers: {},
    });

    expect(webhookResult.success).toBe(true);

    const updatedTxn = await PaymentTransaction.findOne({ transactionId: orderResult.transactionId });
    expect(updatedTxn?.status).toBe('SUCCESS');
    expect(updatedTxn?.gatewayTransactionId).toBe('pay_ApexVerified123');

    // Test Idempotency: second webhook with same order should not fail or duplicate
    const secondWebhookResult = await PaymentGatewayService.handleWebhook({
      gateway: 'RAZORPAY',
      tenantSlug: testTenant.slug,
      rawBody: mockWebhookBody,
      headers: {},
    });
    expect(secondWebhookResult.success).toBe(true);
    expect(secondWebhookResult.message).toContain('Idempotent OK');
  });

  it('5. Payment Reconciliation: should aggregate daily collections, net settlement, and branch report', async () => {
    const summary = await ReconciliationService.getDailyCollectionsSummary(testTenant._id);
    expect(summary.totalCollected).toBeGreaterThan(0);
    expect(summary.successfulCount).toBeGreaterThan(0);
    expect(summary.gatewayBreakdown.length).toBeGreaterThan(0);

    const branchReport = await ReconciliationService.getBranchRevenueReport(testTenant._id);
    expect(branchReport.length).toBeGreaterThan(0);
    expect(branchReport[0].totalRevenue).toBeGreaterThan(0);
  });

  it('6. Network Inventory & Spares: should stock in hardware items, track serials, and check low stock threshold', async () => {
    const stockItems = await WarehouseInventoryService.stockIn({
      tenantId: testTenant._id,
      category: 'ONT',
      modelName: 'Titanium-2122A',
      brand: 'Genexis',
      quantity: 3,
      purchaseOrderNumber: 'PO-APEX-001',
      purchasePrice: 1600,
      warrantyMonths: 24,
      actor: { id: 'admin_1', email: 'admin@apexnet.in', role: 'operator_admin' },
    });

    expect(stockItems.length).toBe(3);
    expect(stockItems[0].status).toBe('IN_STOCK');
    expect(stockItems[0].serialNumber).toBeDefined();

    // Dispatch one item to subscriber
    const dispatched = await WarehouseInventoryService.stockOut({
      tenantId: testTenant._id,
      itemId: stockItems[0]._id.toString(),
      destinationType: 'CUSTOMER',
      targetIdentifier: testCustomer.accountNumber,
      actor: { id: 'admin_1', email: 'admin@apexnet.in', role: 'operator_admin' },
    });

    expect(dispatched.status).toBe('DEPLOYED');
    expect(dispatched.assignedTo?.targetIdentifier).toBe(testCustomer.accountNumber);

    const lowStockAlerts = await WarehouseInventoryService.getLowStockAlerts(testTenant._id);
    expect(Array.isArray(lowStockAlerts)).toBe(true);
  });

  it('7. Executive Analytics: should calculate MRR, ARPU, Churn rate, and area-wise complaints', async () => {
    const revenueMetrics = await AnalyticsReportService.getRevenueMetrics(testTenant._id);
    expect(revenueMetrics.mrr).toBeDefined();
    expect(revenueMetrics.totalActiveSubscribers).toBeGreaterThan(0);
    expect(revenueMetrics.monthlyTrends.length).toBe(6);

    const churnMetrics = await AnalyticsReportService.getChurnAnalysis(testTenant._id);
    expect(churnMetrics.totalSubscribers).toBeGreaterThan(0);
    expect(churnMetrics.retentionRatePercent).toBeDefined();

    const areaComplaints = await AnalyticsReportService.getAreaWiseComplaints(testTenant._id);
    expect(Array.isArray(areaComplaints)).toBe(true);
  });
});
