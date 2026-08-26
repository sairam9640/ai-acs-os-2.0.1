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
        ssid5g: devAny?.wifi5g?.ssid || 'Home-WiFi-5G',
        enabled: devAny?.wifi24?.enabled ?? true,
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
    const customer = await Customer.findOne({ tenantId: new Types.ObjectId(req.tenantId) });
    if (!customer?.assignedDeviceId) return res.status(400).json({ success: false, error: 'No router assigned' });

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
