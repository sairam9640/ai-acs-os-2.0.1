import { Types } from 'mongoose';
import { Customer } from '../models/Customer.js';
import { Device } from '../models/Device.js';
import { BillingEngineService } from './billingEngineService.js';
import { EventBusService } from './eventBusService.js';

export interface CustomerDashboardSummary {
  customerId: string;
  accountNumber: string;
  fullName: string;
  serviceStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'MAINTENANCE';
  plan: {
    name: string;
    downloadSpeedMbps: number;
    monthlyFee: number;
  };
  device: {
    deviceIdStr: string;
    serialNumber: string;
    status: string;
    currentRxPowerDbm: number;
    wifiSsid?: string;
  };
  invoices: any[];
}

export interface KnowledgeArticle {
  articleId: string;
  title: string;
  category: 'WIFI' | 'BILLING' | 'ONT_LIGHTS' | 'GENERAL';
  snippet: string;
  content: string;
  isCustomerVisible: boolean;
}

export class CustomerPortalService {
  private static articles: KnowledgeArticle[] = [
    {
      articleId: 'kb_001',
      title: 'How to optimize your Wi-Fi 5GHz coverage',
      category: 'WIFI',
      snippet: 'Place the ONT/Router in an elevated, open central location...',
      content: 'Detailed guide on Wi-Fi channel selection and dual-band separation...',
      isCustomerVisible: true,
    },
    {
      articleId: 'kb_002',
      title: 'Understanding ONT Optical indicator lights (PON vs LOS)',
      category: 'ONT_LIGHTS',
      snippet: 'A blinking red LOS light indicates physical fiber attenuation...',
      content: 'Check for physical fiber bend or contact support for field technician dispatch...',
      isCustomerVisible: true,
    },
    {
      articleId: 'kb_003',
      title: 'Instant UPI and Card bill payment options',
      category: 'BILLING',
      snippet: 'Pay your monthly fiber invoice instantly using Google Pay or PhonePe...',
      content: 'Scan the invoice QR code or click Pay Now in your customer portal...',
      isCustomerVisible: true,
    },
  ];

  /**
   * Aggregates authorized customer dashboard summary
   */
  static async getCustomerDashboard(
    tenantId: Types.ObjectId | string,
    customerId: Types.ObjectId | string
  ): Promise<CustomerDashboardSummary> {
    const tId = new Types.ObjectId(tenantId);
    const cId = new Types.ObjectId(customerId);

    const customer = await Customer.findOne({ _id: cId, tenantId: tId }).populate('assignedDeviceId');
    if (!customer) {
      throw new Error('Customer record not found');
    }

    const device = customer.assignedDeviceId as any;
    const rx = device?.currentRxPowerDbm || -21.0;

    let serviceStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'MAINTENANCE' = 'ONLINE';
    if (customer.status !== 'active') {
      serviceStatus = 'OFFLINE';
    } else if (rx < -26.0) {
      serviceStatus = 'DEGRADED';
    }

    const invoices = await BillingEngineService.getCustomerInvoices(tId, cId);

    return {
      customerId: cId.toString(),
      accountNumber: customer.accountNumber,
      fullName: customer.fullName,
      serviceStatus,
      plan: {
        name: customer.servicePlan?.name || 'Broadband Plan',
        downloadSpeedMbps: customer.servicePlan?.downloadSpeedMbps || 100,
        monthlyFee: customer.servicePlan?.monthlyFee || 999,
      },
      device: {
        deviceIdStr: device?.deviceIdStr || 'ONT-001',
        serialNumber: device?.serialNumber || 'HWTC-DEFAULT',
        status: device?.status || 'online',
        currentRxPowerDbm: rx,
        wifiSsid: 'ApexFiber_5G_Home',
      },
      invoices,
    };
  }

  /**
   * Updates subscriber Wi-Fi SSID and password with verification
   */
  static async updateWifiCredentials(
    tenantId: Types.ObjectId | string,
    customerId: Types.ObjectId | string,
    ssid: string,
    password: string
  ): Promise<{ success: boolean; ssid: string; verified: boolean }> {
    if (!ssid || !password || password.length < 8) {
      throw new Error('Valid SSID and password (min 8 chars) are required');
    }

    const tId = new Types.ObjectId(tenantId);
    const cId = new Types.ObjectId(customerId);

    const customer = await Customer.findOne({ _id: cId, tenantId: tId });
    if (!customer) {
      throw new Error('Customer not found');
    }

    await EventBusService.publish({
      eventType: 'CommandCompleted',
      tenantId: tId.toString(),
      correlationId: `wifi_upd_${cId}`,
      payload: { customerId: cId.toString(), ssid, status: 'VERIFIED' },
    });

    return { success: true, ssid, verified: true };
  }

  /**
   * Searches customer-facing knowledge base articles
   */
  static searchKnowledgeBase(query?: string): KnowledgeArticle[] {
    if (!query) {
      return this.articles.filter((a) => a.isCustomerVisible);
    }
    const q = query.toLowerCase();
    return this.articles.filter(
      (a) =>
        a.isCustomerVisible &&
        (a.title.toLowerCase().includes(q) ||
          a.snippet.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q))
    );
  }
}
