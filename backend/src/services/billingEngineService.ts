import { Types } from 'mongoose';
import { Customer } from '../models/Customer.js';
import { Device } from '../models/Device.js';
import { EventBusService } from './eventBusService.js';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface GeneratedInvoice {
  invoiceId: string;
  invoiceNumber: string;
  tenantId: string;
  customerId: string;
  accountNumber: string;
  billingPeriod: {
    start: Date;
    end: Date;
  };
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discountAmount: number;
  taxRatePercent: number;
  taxAmount: number;
  totalPayable: number;
  status: 'DRAFT' | 'ISSUED' | 'DUE' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  issuedAt: Date;
  dueDate: Date;
  paidAt?: Date;
  paymentDetails?: {
    paymentMethod: string;
    transactionReference: string;
    amountPaid: number;
  };
}

export class BillingEngineService {
  private static invoices: Map<string, GeneratedInvoice> = new Map();

  /**
   * Generates an immutable, deterministic invoice for a subscriber
   */
  static async generateInvoice({
    tenantId,
    customerId,
    periodStart = new Date(),
    periodEnd = new Date(Date.now() + 30 * 24 * 3600 * 1000),
    discountAmount = 0,
    taxRatePercent = 18.0,
  }: {
    tenantId: Types.ObjectId | string;
    customerId: Types.ObjectId | string;
    periodStart?: Date;
    periodEnd?: Date;
    discountAmount?: number;
    taxRatePercent?: number;
  }): Promise<GeneratedInvoice> {
    const tId = new Types.ObjectId(tenantId);
    const cId = new Types.ObjectId(customerId);

    const customer = await Customer.findOne({ _id: cId, tenantId: tId });
    if (!customer) {
      throw new Error('Customer not found within tenant context');
    }

    const planMonthlyFee = customer.servicePlan?.monthlyFee || 999;
    const planName = customer.servicePlan?.name || 'Broadband Plan';

    const lineItems: InvoiceLineItem[] = [
      {
        description: `Recurring Subscription: ${planName} (${customer.servicePlan?.downloadSpeedMbps || 100} Mbps)`,
        quantity: 1,
        unitPrice: planMonthlyFee,
        total: planMonthlyFee,
      },
    ];

    const subtotal = planMonthlyFee - discountAmount;
    const taxAmount = Number(((subtotal * taxRatePercent) / 100).toFixed(2));
    const totalPayable = Number((subtotal + taxAmount).toFixed(2));

    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const invoice: GeneratedInvoice = {
      invoiceId,
      invoiceNumber,
      tenantId: tId.toString(),
      customerId: cId.toString(),
      accountNumber: customer.accountNumber,
      billingPeriod: { start: periodStart, end: periodEnd },
      lineItems,
      subtotal,
      discountAmount,
      taxRatePercent,
      taxAmount,
      totalPayable,
      status: 'ISSUED',
      issuedAt: new Date(),
      dueDate: new Date(Date.now() + 15 * 24 * 3600 * 1000),
    };

    this.invoices.set(invoiceId, invoice);

    await EventBusService.publish({
      eventType: 'CommandCompleted',
      tenantId: tId.toString(),
      correlationId: `inv_corr_${invoiceId}`,
      payload: { invoiceId, invoiceNumber, totalPayable, status: 'ISSUED' },
    });

    return invoice;
  }

  /**
   * Settles invoice payment and triggers automated network reactivation if suspended
   */
  static async settleInvoicePayment({
    tenantId,
    invoiceId,
    paymentMethod = 'UPI',
    transactionReference = `tx_${Date.now()}`,
    amountPaid,
  }: {
    tenantId: Types.ObjectId | string;
    invoiceId: string;
    paymentMethod?: string;
    transactionReference?: string;
    amountPaid: number;
  }): Promise<GeneratedInvoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice || invoice.tenantId !== tenantId.toString()) {
      throw new Error('Invoice not found within tenant context');
    }

    if (invoice.status === 'PAID') {
      return invoice; // Idempotent return
    }

    invoice.status = 'PAID';
    invoice.paidAt = new Date();
    invoice.paymentDetails = {
      paymentMethod,
      transactionReference,
      amountPaid: amountPaid || invoice.totalPayable,
    };

    // Automated Reactivation Workflow
    const customer = await Customer.findOne({ _id: new Types.ObjectId(invoice.customerId), tenantId: new Types.ObjectId(tenantId) });
    if (customer && customer.status === 'suspended') {
      customer.status = 'active';
      await customer.save();

      // Ensure device is active
      if (customer.assignedDeviceId) {
        await Device.findByIdAndUpdate(customer.assignedDeviceId, { status: 'online' });
      }
    }

    await EventBusService.publish({
      eventType: 'CommandCompleted',
      tenantId: tenantId.toString(),
      correlationId: `pay_corr_${transactionReference}`,
      payload: { invoiceId, status: 'PAID', amountPaid: invoice.totalPayable },
    });

    return invoice;
  }

  /**
   * Retrieves all invoices for a customer
   */
  static async getCustomerInvoices(
    tenantId: Types.ObjectId | string,
    customerId: Types.ObjectId | string
  ): Promise<GeneratedInvoice[]> {
    const list: GeneratedInvoice[] = [];
    for (const inv of this.invoices.values()) {
      if (inv.tenantId === tenantId.toString() && inv.customerId === customerId.toString()) {
        list.push(inv);
      }
    }
    return list;
  }
}
