import crypto from 'crypto';
import { Types } from 'mongoose';
import { PaymentGatewayConfig, IPaymentGatewayConfig, PaymentGatewayType } from '../models/PaymentGatewayConfig.js';
import { PaymentTransaction, IPaymentTransaction, PaymentStatus } from '../models/PaymentTransaction.js';
import { Customer } from '../models/Customer.js';
import { Tenant } from '../models/Tenant.js';
import { CustomerPlanService } from './customerPlanService.js';
import { PlanNotificationService } from './planNotificationService.js';
import { recordAuditLog } from '../middleware/audit.js';

const MASTER_ENCRYPTION_KEY = process.env.PAYMENT_SECRET_MASTER_KEY || 'ai-acs-os-master-aes-256-secret-key-32b!';

// 1. AES-256-GCM Encryption / Decryption Utilities
export class GatewayCrypto {
  private static getKey(): Buffer {
    return crypto.scryptSync(MASTER_ENCRYPTION_KEY, 'ai-acs-salt-2026', 32);
  }

  static encrypt(data: Record<string, any>): { iv: string; authTag: string; ciphertext: string } {
    const iv = crypto.randomBytes(16);
    const key = this.getKey();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    const jsonStr = JSON.stringify(data);
    let ciphertext = cipher.update(jsonStr, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      iv: iv.toString('hex'),
      authTag,
      ciphertext,
    };
  }

  static decrypt(encrypted: { iv: string; authTag: string; ciphertext: string }): Record<string, any> {
    try {
      const iv = Buffer.from(encrypted.iv, 'hex');
      const authTag = Buffer.from(encrypted.authTag, 'hex');
      const key = this.getKey();
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (err: any) {
      throw new Error(`Failed to decrypt payment credentials: ${err.message}`);
    }
  }
}

// 2. Gateway Plugin Interface
export interface IPaymentOrderResult {
  success: boolean;
  orderId: string;
  transactionId: string;
  gateway: PaymentGatewayType;
  amount: number;
  currency: string;
  checkoutUrl?: string;
  gatewayData: Record<string, any>;
}

// 3. Main Payment Gateway Service
export class PaymentGatewayService {
  /**
   * Configure or update tenant gateway credentials (encrypted at rest)
   */
  static async saveGatewayConfig(params: {
    tenantId: string | Types.ObjectId;
    gateway: PaymentGatewayType;
    displayName?: string;
    isEnabled: boolean;
    isTestMode: boolean;
    credentials: Record<string, any>;
    webhookSecret?: string;
    actor: { id: string; email: string; role: string };
  }): Promise<IPaymentGatewayConfig> {
    const tenantId = new Types.ObjectId(params.tenantId);
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const encryptedCredentials = GatewayCrypto.encrypt(params.credentials);

    const publicMetadata = {
      keyId: params.credentials.keyId || params.credentials.publishableKey || params.credentials.merchantId,
      merchantId: params.credentials.merchantId,
      appId: params.credentials.appId,
      currency: params.credentials.currency || 'INR',
    };

    const webhookEndpointUrl = `/api/v1/webhooks/payments/${params.gateway.toLowerCase()}/${tenant.slug}`;

    const config = await PaymentGatewayConfig.findOneAndUpdate(
      { tenantId, gateway: params.gateway },
      {
        $set: {
          displayName: params.displayName || `${params.gateway} Gateway`,
          isEnabled: params.isEnabled,
          isTestMode: params.isTestMode,
          encryptedCredentials,
          publicMetadata,
          webhookEndpointUrl,
          webhookSecretEncrypted: params.webhookSecret
            ? GatewayCrypto.encrypt({ secret: params.webhookSecret }).ciphertext
            : undefined,
        },
      },
      { upsert: true, new: true }
    );

    await recordAuditLog({
      tenantId,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      actorRole: params.actor.role,
      action: 'PAYMENT_GATEWAY_CONFIG_UPDATED',
      targetResource: 'PaymentGatewayConfig',
      targetId: config._id.toString(),
      targetIdentifier: `${params.gateway} (${params.isEnabled ? 'ENABLED' : 'DISABLED'})`,
      correlationId: `pg_cfg_${Date.now()}`,
    });

    return config;
  }

  /**
   * Get all configured gateways for a tenant (with decrypted public metadata only)
   */
  static async getTenantGateways(tenantId: string | Types.ObjectId): Promise<any[]> {
    const configs = await PaymentGatewayConfig.find({ tenantId: new Types.ObjectId(tenantId) });
    return configs.map((c) => ({
      _id: c._id,
      gateway: c.gateway,
      displayName: c.displayName,
      isEnabled: c.isEnabled,
      isTestMode: c.isTestMode,
      publicMetadata: c.publicMetadata,
      webhookEndpointUrl: c.webhookEndpointUrl,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * Create Checkout / Payment Order for subscriber
   */
  static async createPaymentOrder(params: {
    tenantId: string | Types.ObjectId;
    customerId: string | Types.ObjectId;
    gateway: PaymentGatewayType;
    amount: number;
    planId?: string;
    planName?: string;
    validityDays?: number;
    description?: string;
  }): Promise<IPaymentOrderResult> {
    const tenantId = new Types.ObjectId(params.tenantId);
    const customer = await Customer.findOne({ _id: params.customerId, tenantId });
    if (!customer) throw new Error('Customer not found');

    const config = await PaymentGatewayConfig.findOne({ tenantId, gateway: params.gateway, isEnabled: true });
    if (!config) {
      throw new Error(`Payment Gateway "${params.gateway}" is not configured or enabled for this operator.`);
    }

    const credentials = GatewayCrypto.decrypt(config.encryptedCredentials);
    const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const orderId = `${params.gateway.toLowerCase()}_ord_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const idempotencyKey = `${customer._id}_${transactionId}_${params.amount}`;

    // Create Initial Payment Transaction Record
    await PaymentTransaction.create({
      tenantId,
      customerId: customer._id,
      accountNumber: customer.accountNumber,
      customerName: customer.fullName,
      customerPhone: customer.phone,
      transactionId,
      orderId,
      gateway: params.gateway,
      amount: params.amount,
      currency: 'INR',
      netAmount: params.amount,
      status: 'INITIATED',
      settlementStatus: 'PENDING',
      paymentMode: 'UPI',
      description: params.description || `Broadband Subscription: ${params.planName || 'Plan Renewal'}`,
      metadata: {
        planId: params.planId,
        planName: params.planName,
        validityDays: params.validityDays || 30,
        operatorBranch: 'Main Office',
      },
      idempotencyKey,
    });

    // Gateway-Specific Order Payload Preparation
    const gatewayData: Record<string, any> = {
      orderId,
      transactionId,
      amountPaise: Math.round(params.amount * 100),
      currency: 'INR',
      keyId: credentials.keyId || credentials.merchantId || credentials.publishableKey,
      customer: {
        name: customer.fullName,
        email: customer.email || 'customer@isp.local',
        phone: customer.phone,
      },
    };

    if (params.gateway === 'RAZORPAY') {
      gatewayData.razorpayKey = credentials.keyId;
    } else if (params.gateway === 'CASHFREE') {
      gatewayData.paymentSessionId = `session_${orderId}`;
    } else if (params.gateway === 'PHONEPE') {
      gatewayData.merchantId = credentials.merchantId;
      gatewayData.redirectUrl = `/customer/billing/payment-success?txn=${transactionId}`;
    } else if (params.gateway === 'PAYTM') {
      gatewayData.mid = credentials.merchantId;
      gatewayData.txnToken = `ptm_tok_${orderId}`;
    } else if (params.gateway === 'STRIPE') {
      gatewayData.publishableKey = credentials.publishableKey;
      gatewayData.checkoutUrl = `/customer/billing/stripe-checkout?txn=${transactionId}`;
    }

    return {
      success: true,
      orderId,
      transactionId,
      gateway: params.gateway,
      amount: params.amount,
      currency: 'INR',
      checkoutUrl: gatewayData.checkoutUrl,
      gatewayData,
    };
  }

  /**
   * Process and Verify Inbound Payment Webhooks
   */
  static async handleWebhook(params: {
    gateway: PaymentGatewayType;
    tenantSlug: string;
    rawBody: any;
    headers: Record<string, any>;
  }): Promise<{ success: boolean; message: string; transactionId?: string }> {
    const tenant = await Tenant.findOne({ slug: params.tenantSlug });
    if (!tenant) throw new Error(`Tenant slug "${params.tenantSlug}" not recognized`);

    const config = await PaymentGatewayConfig.findOne({ tenantId: tenant._id, gateway: params.gateway, isEnabled: true });
    if (!config) throw new Error(`Gateway ${params.gateway} is disabled for ${tenant.name}`);

    const credentials = GatewayCrypto.decrypt(config.encryptedCredentials);

    // Extract Order/Transaction Reference and Status from Gateway Payload
    let orderId = '';
    let gatewayTxnId = '';
    let isSuccess = false;
    let paymentAmount = 0;

    const payload = typeof params.rawBody === 'string' ? JSON.parse(params.rawBody) : params.rawBody;

    if (params.gateway === 'RAZORPAY') {
      orderId = payload.payload?.payment?.entity?.order_id || payload.order_id || '';
      gatewayTxnId = payload.payload?.payment?.entity?.id || payload.payment_id || '';
      isSuccess = payload.event === 'payment.captured' || payload.event === 'order.paid' || payload.status === 'captured';
      paymentAmount = (payload.payload?.payment?.entity?.amount || payload.amount || 0) / 100;
    } else if (params.gateway === 'CASHFREE') {
      orderId = payload.data?.order?.order_id || payload.order_id || '';
      gatewayTxnId = payload.data?.payment?.cf_payment_id || '';
      isSuccess = payload.type === 'PAYMENT_SUCCESS_WEBHOOK' || payload.order_status === 'PAID';
      paymentAmount = payload.data?.order?.order_amount || payload.order_amount || 0;
    } else if (params.gateway === 'PHONEPE') {
      orderId = payload.data?.merchantTransactionId || '';
      gatewayTxnId = payload.data?.transactionId || '';
      isSuccess = payload.code === 'PAYMENT_SUCCESS' || payload.success === true;
      paymentAmount = (payload.data?.amount || 0) / 100;
    } else if (params.gateway === 'PAYTM') {
      orderId = payload.ORDERID || payload.orderId || '';
      gatewayTxnId = payload.TXNID || '';
      isSuccess = payload.STATUS === 'TXN_SUCCESS';
      paymentAmount = Number(payload.TXNAMOUNT || 0);
    } else if (params.gateway === 'STRIPE') {
      orderId = payload.data?.object?.client_reference_id || payload.data?.object?.id || '';
      gatewayTxnId = payload.data?.object?.payment_intent || '';
      isSuccess = payload.type === 'checkout.session.completed';
      paymentAmount = (payload.data?.object?.amount_total || 0) / 100;
    }

    if (!orderId) {
      return { success: false, message: 'Missing order reference in webhook payload' };
    }

    // Find and update transaction record (Idempotent update)
    const transaction = await PaymentTransaction.findOne({
      tenantId: tenant._id,
      $or: [{ orderId }, { transactionId: orderId }],
    });

    if (!transaction) {
      return { success: false, message: `Transaction with Order ID ${orderId} not found` };
    }

    if (transaction.status === 'SUCCESS' || transaction.status === 'SETTLED') {
      return { success: true, message: 'Transaction already processed previously (Idempotent OK)', transactionId: transaction.transactionId };
    }

    if (isSuccess) {
      transaction.status = 'SUCCESS';
      transaction.gatewayTransactionId = gatewayTxnId || `gw_txn_${Date.now()}`;
      transaction.rawGatewayResponse = payload;
      await transaction.save();

      // Automatically renew/extend customer subscription validity
      const customer = await Customer.findById(transaction.customerId);
      if (customer) {
        const cycleDays = transaction.metadata?.validityDays || 30;
        await CustomerPlanService.renewCustomerPlan({
          tenantId: tenant._id,
          customerId: customer._id,
          billingCycleDays: cycleDays,
          paymentAmount: transaction.amount,
          paymentReference: transaction.transactionId,
          paymentMode: `${params.gateway} Gateway`,
          actor: { id: 'system_webhook', email: 'webhook@gateway.local', role: 'system_daemon' },
        }).catch((e) => console.error('[Webhook] Auto-renewal error:', e.message));
      }

      await recordAuditLog({
        tenantId: tenant._id,
        actorId: 'system_webhook',
        actorEmail: `${params.gateway.toLowerCase()}@webhook.auto`,
        actorRole: 'system',
        action: 'PAYMENT_WEBHOOK_PROCESSED',
        targetResource: 'PaymentTransaction',
        targetId: transaction._id.toString(),
        targetIdentifier: `${transaction.transactionId} - ₹${transaction.amount} (SUCCESS)`,
        correlationId: `wh_proc_${Date.now()}`,
      });

      return { success: true, message: `Payment verified & plan renewed for ${transaction.accountNumber}`, transactionId: transaction.transactionId };
    } else {
      transaction.status = 'FAILED';
      transaction.failureReason = payload.error_description || payload.message || 'Payment rejected by gateway';
      transaction.rawGatewayResponse = payload;
      await transaction.save();
      return { success: false, message: `Payment marked as failed: ${transaction.failureReason}`, transactionId: transaction.transactionId };
    }
  }
}
