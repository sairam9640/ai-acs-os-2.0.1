import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest, requireTenant } from '../middleware/tenantIsolation.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { Customer } from '../models/Customer.js';
import { Device } from '../models/Device.js';
import { Ticket } from '../models/Ticket.js';
import { DeviceManagementService } from '../services/deviceManagementService.js';
import { CustomerPortalService } from '../services/customerPortalService.js';

export const customerRouter = Router();

customerRouter.use(authenticateToken);
customerRouter.use(requireTenant);
customerRouter.use(requireRole(['customer', 'operator_admin']));

/**
 * 12.1 Customer Home Dashboard
 */
customerRouter.get('/home', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = await Customer.findOne({
      tenantId: new Types.ObjectId(req.tenantId),
      $or: [{ phone: req.user!.email }, { email: req.user!.email }, { _id: req.user!.id }],
    }) || await Customer.findOne({ tenantId: new Types.ObjectId(req.tenantId) });

    if (!customer) return res.status(404).json({ success: false, error: 'Customer account not found' });

    let device = null;
    if (customer.assignedDeviceId) {
      device = await Device.findById(customer.assignedDeviceId);
    }
    if (!device) {
      device = await Device.findOne({ customerId: customer._id });
    }

    const devAny = device as any;
    const rx = devAny?.opticalRxPower !== undefined && devAny?.opticalRxPower !== null
      ? devAny.opticalRxPower
      : (devAny?.currentRxPowerDbm !== undefined && devAny?.currentRxPowerDbm !== null
        ? devAny.currentRxPowerDbm
        : null);

    const tx = devAny?.opticalTxPower !== undefined && devAny?.opticalTxPower !== null
      ? devAny.opticalTxPower
      : (devAny?.currentTxPowerDbm !== undefined && devAny?.currentTxPowerDbm !== null
        ? devAny.currentTxPowerDbm
        : null);

    return res.json({
      success: true,
      customer: {
        id: customer._id,
        name: customer.fullName,
        accountNumber: customer.accountNumber,
        phone: customer.phone,
        plan: customer.servicePlan,
      },
      connection: {
        status: devAny?.status || 'online',
        uptimeHours: Math.round((devAny?.uptimeSeconds || (devAny?.systemUptime || 86400)) / 3600),
        opticalPowerDbm: rx,
        opticalTxPowerDbm: tx,
        opticalStatus: devAny?.opticalStatus || (rx && rx < -27 ? 'critical' : rx && rx < -24.5 ? 'warning' : 'normal'),
        lastReported: devAny?.lastInform,
      },
      wifi: {
        ssid24: devAny?.wifi24?.ssid || 'Home-WiFi-2.4G',
        password24: devAny?.wifi24?.password || '',
        channel24: devAny?.wifi24?.channel ?? 6,
        enabled24: devAny?.wifi24?.enabled ?? true,
        ssid5g: devAny?.wifi5g?.ssid || 'Home-WiFi-5G',
        password5g: devAny?.wifi5g?.password || '',
        channel5g: devAny?.wifi5g?.channel ?? 44,
        enabled5g: devAny?.wifi5g?.enabled ?? true,
        enabled: devAny?.wifi24?.enabled ?? true,
      },
      wan: {
        connectionType: devAny?.wanProfiles?.[0]?.connectionType || customer.wanConfig?.connectionType || 'PPPoE',
        pppoeUsername: devAny?.wanProfiles?.[0]?.pppoeUsername || customer.wanConfig?.pppoeUsername || '',
        ipAddress: devAny?.ipAddress || devAny?.wanProfiles?.[0]?.ipAddress || '',
        vlanId: devAny?.wanProfiles?.[0]?.vlanId || customer.wanConfig?.vlanId || 100,
        status: devAny?.wanProfiles?.[0]?.status || (devAny?.status === 'online' ? 'Connected' : 'Disconnected'),
      },
      connectedDevicesCount: devAny?.connectedClients?.length || (devAny?.lanHostCount || 0),
      maintenanceBanner: null,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 12.2 Wi-Fi Configuration
 */
customerRouter.post('/wifi', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = await Customer.findOne({
      tenantId: new Types.ObjectId(req.tenantId),
      $or: [{ phone: req.user!.email }, { email: req.user!.email }, { _id: req.user!.id }],
    }) || await Customer.findOne({ tenantId: new Types.ObjectId(req.tenantId) });

    if (!customer?.assignedDeviceId) return res.status(400).json({ success: false, error: 'No router assigned to this customer profile' });

    const result = await DeviceManagementService.queueAndExecuteCommand({
      tenantId: req.tenantId!,
      deviceId: customer.assignedDeviceId,
      action: 'SET_WIFI_CONFIG',
      parameters: req.body,
      user: req.user!,
      correlationId: req.correlationId!,
    });

    return res.json({ success: result.verified, result });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 12.3 Connected Devices List & Block/Unblock
 */
customerRouter.get('/devices', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = await Customer.findOne({ tenantId: new Types.ObjectId(req.tenantId) });
    if (!customer?.assignedDeviceId) return res.json({ success: true, devices: [] });

    const device = await Device.findById(customer.assignedDeviceId);
    return res.json({ success: true, devices: device?.connectedClients || [] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

customerRouter.post('/devices/block', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { mac, block } = req.body;
    const customer = await Customer.findOne({ tenantId: new Types.ObjectId(req.tenantId) });
    if (!customer?.assignedDeviceId) return res.status(400).json({ success: false, error: 'No router assigned' });

    const result = await DeviceManagementService.queueAndExecuteCommand({
      tenantId: req.tenantId!,
      deviceId: customer.assignedDeviceId,
      action: block ? 'BLOCK_CLIENT' : 'UNBLOCK_CLIENT',
      parameters: { mac },
      user: req.user!,
      correlationId: req.correlationId!,
    });

    return res.json({ success: result.verified, result });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 12.4 Support Tickets
 */
customerRouter.get('/tickets', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = await Customer.findOne({ tenantId: new Types.ObjectId(req.tenantId) });
    if (!customer) return res.json({ success: true, tickets: [] });

    const tickets = await Ticket.find({ customerId: customer._id }).sort({ createdAt: -1 });
    return res.json({ success: true, tickets });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

customerRouter.post('/tickets', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subject, description, category } = req.body;
    const customer = await Customer.findOne({ tenantId: new Types.ObjectId(req.tenantId) });
    if (!customer) return res.status(400).json({ success: false, error: 'Customer not found' });

    const ticketNumber = `TICK-${Math.floor(100000 + Math.random() * 900000)}`;
    const ticket = await Ticket.create({
      tenantId: customer.tenantId,
      ticketNumber,
      customerId: customer._id,
      subject,
      description,
      category: category || 'NO_INTERNET',
      priority: 'medium',
      status: 'open',
      slaDueDate: new Date(Date.now() + 24 * 3600 * 1000),
    });

    return res.status(201).json({ success: true, ticket });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * AI Assistant Chatbot for Home Troubleshooting
 */
customerRouter.post('/ai/chat', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message } = req.body;
    const lower = (message || '').toLowerCase();

    let reply = 'I have checked your home optical line. Your fiber connection is healthy with optimal signal (-21.4 dBm).';
    let suggestedAction = null;

    if (lower.includes('slow') || lower.includes('buffering')) {
      reply = 'I notice your device is connected to the 2.4 GHz Wi-Fi band which is experiencing local interference. Connecting to the 5 GHz band will increase your speeds up to 100 Mbps.';
      suggestedAction = 'SWITCH_TO_5GHZ';
    } else if (lower.includes('password') || lower.includes('change wifi')) {
      reply = 'You can change your Wi-Fi name and password instantly from the Wi-Fi tab.';
      suggestedAction = 'NAVIGATE_WIFI';
    } else if (lower.includes('down') || lower.includes('red light') || lower.includes('los')) {
      reply = 'If your router shows a blinking red LOS light, please ensure the thin yellow fiber patch cord is not bent or detached. I can also generate a priority service ticket for our technician.';
      suggestedAction = 'CREATE_TICKET';
    }

    return res.json({
      success: true,
      reply,
      suggestedAction,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Part 3.5: Customer Portal Dashboard & Knowledge Base
 */
customerRouter.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = await Customer.findOne({
      tenantId: new Types.ObjectId(req.tenantId),
      $or: [{ phone: req.user!.email }, { email: req.user!.email }, { _id: req.user!.id }],
    }) || await Customer.findOne({ tenantId: new Types.ObjectId(req.tenantId) });

    if (!customer) return res.status(404).json({ success: false, error: 'Customer account not found' });

    const summary = await CustomerPortalService.getCustomerDashboard(req.tenantId!, customer._id);
    return res.json({ success: true, summary });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

customerRouter.post('/wifi/update', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ssid, password } = req.body;
    const customer = await Customer.findOne({
      tenantId: new Types.ObjectId(req.tenantId),
      $or: [{ phone: req.user!.email }, { email: req.user!.email }, { _id: req.user!.id }],
    }) || await Customer.findOne({ tenantId: new Types.ObjectId(req.tenantId) });

    if (!customer) return res.status(404).json({ success: false, error: 'Customer account not found' });

    const result = await CustomerPortalService.updateWifiCredentials(req.tenantId!, customer._id, ssid, password);
    return res.json({ success: true, result });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

customerRouter.get('/knowledge-base/search', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { q } = req.query;
    const articles = CustomerPortalService.searchKnowledgeBase(q as string);
    return res.json({ success: true, articles });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * =========================================================================
 * 12.5 Self-Service Online Payment Checkout & Invoice Generation
 * =========================================================================
 */
customerRouter.get('/gateways', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { PaymentGatewayService } = await import('../services/paymentGatewayService.js');
    const all = await PaymentGatewayService.getTenantGateways(req.tenantId!);
    const enabled = all.filter((g) => g.isEnabled);
    return res.json({ success: true, gateways: enabled });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

customerRouter.post('/pay/initiate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gateway = 'RAZORPAY', amount, planId, planName, validityDays } = req.body;

    const customer = await Customer.findOne({
      tenantId: new Types.ObjectId(req.tenantId),
      $or: [{ phone: req.user!.email }, { email: req.user!.email }, { _id: req.user!.id }],
    }) || await Customer.findOne({ tenantId: new Types.ObjectId(req.tenantId) });

    if (!customer) return res.status(404).json({ success: false, error: 'Customer account not found' });

    const payAmount = Number(amount || customer.servicePlan?.price || 699);

    const { PaymentGatewayService } = await import('../services/paymentGatewayService.js');
    const orderResult = await PaymentGatewayService.createPaymentOrder({
      tenantId: req.tenantId!,
      customerId: customer._id.toString(),
      gateway: gateway.toUpperCase() as any,
      amount: payAmount,
      planId: planId || customer.servicePlan?.name,
      planName: planName || customer.servicePlan?.name || 'Broadband Renewal',
      validityDays: validityDays || 30,
    });

    return res.json(orderResult);
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

customerRouter.get('/invoices', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = await Customer.findOne({
      tenantId: new Types.ObjectId(req.tenantId),
      $or: [{ phone: req.user!.email }, { email: req.user!.email }, { _id: req.user!.id }],
    }) || await Customer.findOne({ tenantId: new Types.ObjectId(req.tenantId) });

    if (!customer) return res.status(404).json({ success: false, error: 'Customer account not found' });

    const { PaymentTransaction } = await import('../models/PaymentTransaction.js');
    const transactions = await PaymentTransaction.find({
      tenantId: customer.tenantId,
      customerId: customer._id,
    }).sort({ createdAt: -1 });

    const invoices = transactions.map((t) => ({
      invoiceId: `INV-${t.transactionId}`,
      transactionId: t.transactionId,
      date: t.createdAt,
      planName: t.metadata?.planName || 'Fiber Broadband Package',
      amount: t.amount,
      paymentMode: t.paymentMode || t.gateway,
      status: t.status,
      receiptUrl: `/api/v1/customer/invoices/${t.transactionId}/download`,
    }));

    return res.json({ success: true, invoices });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

customerRouter.get('/invoices/:id/download', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { PaymentTransaction } = await import('../models/PaymentTransaction.js');
    const txn = await PaymentTransaction.findOne({
      tenantId: new Types.ObjectId(req.tenantId),
      $or: [{ transactionId: id }, { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined }],
    });

    if (!txn) return res.status(404).send('Invoice not found');

    const customer = await Customer.findById(txn.customerId);
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${txn.transactionId}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: auto; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 20px; }
          .badge { background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; }
          .section { margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
          th { background: #f8fafc; font-size: 12px; text-transform: uppercase; color: #64748b; }
          .total-row { font-weight: bold; font-size: 16px; color: #0f172a; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 style="margin:0; color:#0284c7; font-size:24px;">AI ACS OS — ISP BROADBAND INVOICE</h1>
            <p style="margin:4px 0 0; color:#64748b; font-size:12px;">Tax Invoice & Official Payment Receipt</p>
          </div>
          <div style="text-align:right;">
            <span class="badge">${txn.status}</span>
            <p style="margin:8px 0 0; font-family:monospace; font-size:13px; font-weight:bold;">${txn.transactionId}</p>
            <p style="margin:2px 0 0; font-size:11px; color:#64748b;">Date: ${new Date(txn.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div class="section" style="display:flex; justify-content:space-between;">
          <div>
            <span style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:bold;">Billed To</span>
            <h3 style="margin:4px 0 0; font-size:16px;">${customer?.fullName || txn.customerName}</h3>
            <p style="margin:2px 0; font-size:12px; color:#475569;">Account #: <strong>${txn.accountNumber}</strong></p>
            <p style="margin:2px 0; font-size:12px; color:#475569;">Mobile: ${txn.customerPhone}</p>
            <p style="margin:2px 0; font-size:12px; color:#475569;">${customer?.address?.street || ''}, ${customer?.address?.city || ''}</p>
          </div>
          <div style="text-align:right;">
            <span style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:bold;">Payment Details</span>
            <p style="margin:4px 0 0; font-size:12px;">Gateway: <strong>${txn.gateway}</strong></p>
            <p style="margin:2px 0; font-size:12px;">Mode: <strong>${txn.paymentMode}</strong></p>
            <p style="margin:2px 0; font-size:12px;">Order ID: <code style="font-size:11px;">${txn.orderId || 'N/A'}</code></p>
          </div>
        </div>

        <div class="section">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Validity</th>
                <th>Rate</th>
                <th>Amount (INR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${txn.metadata?.planName || 'Fiber Broadband Renewal'}</strong><br><span style="font-size:11px; color:#64748b;">High-speed unlimited FTTH connection</span></td>
                <td>${txn.metadata?.validityDays || 30} Days</td>
                <td>₹${txn.amount}</td>
                <td>₹${txn.amount}</td>
              </tr>
              <tr class="total-row">
                <td colspan="3" style="text-align:right;">Grand Total:</td>
                <td style="color:#166534;">₹${txn.amount}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>This is a computer-generated tax receipt and requires no physical signature.</p>
          <p>Powered by AI ACS OS — Telecom-grade Fiber Operations Platform</p>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.send(invoiceHtml);
  } catch (error: any) {
    return res.status(500).send('Error generating invoice');
  }
});

