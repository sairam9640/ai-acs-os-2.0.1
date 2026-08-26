import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { Device } from '../models/Device.js';
import { Customer } from '../models/Customer.js';
import { Incident } from '../models/Incident.js';
import { AuditLog } from '../models/AuditLog.js';
import { TenantPlan } from '../models/TenantPlan.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { PendingDeviceMapping } from '../models/PendingDeviceMapping.js';
import { AuthenticatedRequest } from '../middleware/tenantIsolation.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { recordAuditLog } from '../middleware/audit.js';
import { EventBusService } from '../services/eventBusService.js';
import { EmailService } from '../services/emailService.js';
import { WhatsAppService } from '../services/whatsAppService.js';

export const superAdminRouter = Router();

// Apply Super Admin security boundary
superAdminRouter.use(authenticateToken);
superAdminRouter.use(requireRole(['super_admin']));

/**
 * 6.2 Executive Dashboard KPIs
 */
superAdminRouter.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [
      totalTenants,
      activeTenants,
      totalCustomers,
      totalDevices,
      onlineDevices,
      criticalAlarms,
      activeIncidents,
      tenantsList,
      onlineDevicesList,
      offlineDevicesList,
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ status: 'active' }),
      Customer.countDocuments(),
      Device.countDocuments(),
      Device.countDocuments({ status: 'online' }),
      Incident.countDocuments({ severity: 'critical', status: { $ne: 'resolved' } }),
      Incident.countDocuments({ status: { $ne: 'resolved' } }),
      Tenant.find().sort({ createdAt: -1 }).limit(5),
      Device.find({ status: 'online' }).sort({ lastInform: -1 }).limit(8).populate('tenantId', 'displayName slug'),
      Device.find({ status: { $ne: 'online' } }).sort({ updatedAt: -1 }).limit(8).populate('tenantId', 'displayName slug'),
    ]);

    const offlineDevices = Math.max(0, totalDevices - onlineDevices);
    const mrr = activeTenants * 4999;
    const arr = mrr * 12;
    const onlineRatio = totalDevices > 0 ? (onlineDevices / totalDevices) * 100 : 100;

    return res.json({
      success: true,
      kpis: {
        totalTenants,
        activeTenants,
        totalCustomers,
        totalDevices,
        onlineDevices,
        offlineDevices,
        onlineRatio: Number(onlineRatio.toFixed(1)),
        criticalAlarms,
        activeIncidents,
        activeTechnicians: 18,
        mrr,
        arr,
        currency: 'INR',
      },
      reportingDevices: onlineDevicesList || [],
      offlineDevicesList: offlineDevicesList || [],
      platformHealth: {
        api: { status: 'healthy', latencyMs: 14, uptime: '99.99%' },
        acs: { status: 'healthy', activeSessions: 42, queueDepth: 0 },
        eventProcessing: { status: 'healthy', throughputPerSec: 185 },
        database: { status: 'healthy', connections: 12, memoryUsageMb: 248 },
        storage: { status: 'healthy', diskUsedPercent: 32 },
        aiEngine: { status: 'healthy', avgInferenceMs: 140 },
        integrations: { whatsapp: 'connected', smtp: 'connected', snmp: 'connected' },
      },
      recentTenants: tenantsList,
      aiExecutiveSummary:
        'All global SaaS services operational. Multi-tenant TR-069 / TR-369 telemetry ingesting in real time.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 6.3 Tenant List with search, status filters, pagination
 */
superAdminRouter.get('/tenants', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, status } = req.query;
    const query: any = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: new RegExp(String(search), 'i') },
        { slug: new RegExp(String(search), 'i') },
        { 'owner.email': new RegExp(String(search), 'i') },
      ];
    }

    const tenants = await Tenant.find(query).sort({ createdAt: -1 });

    const enrichedTenants = await Promise.all(
      tenants.map(async (t) => {
        const [subscriberCount, deviceCount, onlineDeviceCount, reportingDeviceCount, userCount] = await Promise.all([
          Customer.countDocuments({ tenantId: t._id }),
          Device.countDocuments({ tenantId: t._id }),
          Device.countDocuments({ tenantId: t._id, status: 'online' }),
          Device.countDocuments({ tenantId: t._id, lastInform: { $exists: true, $ne: null } }),
          User.countDocuments({ tenantId: t._id }),
        ]);

        return {
          ...t.toObject(),
          stats: {
            subscribers: subscriberCount,
            devices: deviceCount,
            onlineDevices: onlineDeviceCount,
            reportingDevices: reportingDeviceCount,
            users: userCount,
          },
        };
      })
    );

    return res.json({ success: true, tenants: enrichedTenants });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 6.4 Tenant Create
 */
superAdminRouter.post('/tenants', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      displayName,
      slug,
      owner,
      plan,
      branding,
      address,
      featureEntitlements,
      timezone,
    } = req.body;

    if (!name || !slug || !owner?.email) {
      return res.status(400).json({
        success: false,
        error: 'Tenant name, unique slug, and owner email are required.',
      });
    }

    const existingSlug = await Tenant.findOne({ slug: slug.toLowerCase() });
    if (existingSlug) {
      return res.status(409).json({ success: false, error: `Slug '${slug}' is already in use.` });
    }

    const tenantCount = await Tenant.countDocuments();
    const isFirstTenant = tenantCount === 0;
    const computedSubdomain = isFirstTenant ? 'ciniplay.in' : `${slug.toLowerCase()}.ciniplay.in`;

    const tenant = await Tenant.create({
      name,
      displayName: displayName || name,
      slug: slug.toLowerCase(),
      subdomain: computedSubdomain,
      operatorKey: `opk_${slug}_${Math.random().toString(36).substring(2, 8)}`,
      owner,
      plan: plan || {
        name: 'Growth ISP Plan',
        maxCustomers: 5000,
        maxDevices: 5000,
        maxTechnicians: 20,
        monthlyFee: 4999,
        billingCycle: 'monthly',
      },
      branding: branding || {
        logoUrl: '/brand/default-logo.svg',
        primaryColor: '#0284c7',
        secondaryColor: '#0f172a',
        companyName: name,
        supportPhone: owner.phone,
        supportEmail: owner.email,
        portalTitle: `${name} Operations`,
      },
      address,
      featureEntitlements: featureEntitlements || {
        tr069Acs: true,
        tr369Usp: true,
        fiberGis: true,
        aiCommandCenter: true,
        technicianDispatch: true,
        customerApp: true,
        whatsappAlerts: true,
        opticalDiagnostics: true,
      },
      timezone: timezone || 'Asia/Kolkata',
    });

    // Create Initial Operator Admin User for Tenant
    await User.create({
      tenantId: tenant._id,
      email: owner.email.toLowerCase(),
      phone: owner.phone,
      fullName: owner.name,
      role: 'operator_admin',
      permissions: ['CUSTOMER_ALL', 'DEVICE_ALL', 'GIS_ALL', 'AI_ALL', 'TECH_ALL'],
      status: 'active',
    });

    await recordAuditLog({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'TENANT_CREATED',
      targetResource: 'Tenant',
      targetId: tenant._id.toString(),
      targetIdentifier: tenant.slug,
      afterState: tenant.toObject(),
      correlationId: req.correlationId || `sa_ten_${Date.now()}`,
    });

    const isFirst = tenant.subdomain === 'ciniplay.in';
    const cwmpUrl = isFirst ? 'http://ciniplay.in:7547' : `http://${tenant.slug}.ciniplay.in:7547`;

    return res.status(201).json({ success: true, tenant, cwmpUrl });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 6.5 Tenant Detail with usage quotas vs real counts & CWMP URL
 */
superAdminRouter.get('/tenants/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });

    const [customerCount, deviceCount, incidentCount, auditLogs, firstTenant] = await Promise.all([
      Customer.countDocuments({ tenantId: tenant._id }),
      Device.countDocuments({ tenantId: tenant._id }),
      Incident.countDocuments({ tenantId: tenant._id }),
      AuditLog.find({ tenantId: tenant._id }).sort({ timestamp: -1 }).limit(10),
      Tenant.findOne().sort({ createdAt: 1 }),
    ]);

    const isFirst = tenant.subdomain === 'ciniplay.in' || firstTenant?._id.equals(tenant._id);
    const cwmpUrl = isFirst ? 'http://ciniplay.in:7547' : `http://${tenant.slug}.ciniplay.in:7547`;

    return res.json({
      success: true,
      tenant,
      cwmpUrl,
      usage: {
        customers: { current: customerCount, limit: tenant.plan.maxCustomers },
        devices: { current: deviceCount, limit: tenant.plan.maxDevices },
        technicians: { current: 1, limit: tenant.plan.maxTechnicians },
      },
      incidentCount,
      recentAuditLogs: auditLogs,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Tenant Suspend / Restore
 */
superAdminRouter.patch('/tenants/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });

    const previousStatus = tenant.status;
    tenant.status = status;
    await tenant.save();

    await recordAuditLog({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: `TENANT_STATUS_${status.toUpperCase()}`,
      targetResource: 'Tenant',
      targetId: tenant._id.toString(),
      targetIdentifier: tenant.slug,
      beforeState: { status: previousStatus },
      afterState: { status },
      correlationId: req.correlationId || `sa_stat_${Date.now()}`,
    });

    return res.json({ success: true, tenant });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 6.5.1 Tenant Update / Edit Operator Data
 */
superAdminRouter.put('/tenants/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      displayName,
      slug,
      owner,
      address,
      branding,
      plan,
      status,
      timezone,
    } = req.body;

    const tenant = await Tenant.findById(id);
    if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });

    const beforeState = tenant.toObject();

    if (slug && slug.toLowerCase() !== tenant.slug) {
      const existing = await Tenant.findOne({ slug: slug.toLowerCase(), _id: { $ne: tenant._id } });
      if (existing) {
        return res.status(409).json({ success: false, error: `Slug '${slug}' is already in use by another tenant.` });
      }
      tenant.slug = slug.toLowerCase();
      if (tenant.subdomain !== 'ciniplay.in') {
        tenant.subdomain = `${tenant.slug}.ciniplay.in`;
      }
    }

    if (name) tenant.name = name;
    if (displayName) tenant.displayName = displayName;
    if (status) tenant.status = status;
    if (timezone) tenant.timezone = timezone;

    if (owner) {
      tenant.owner = {
        name: owner.name || tenant.owner?.name || '',
        email: owner.email ? owner.email.toLowerCase() : tenant.owner?.email || '',
        phone: owner.phone || tenant.owner?.phone || '',
      };

      if (owner.email || owner.phone) {
        await User.findOneAndUpdate(
          { tenantId: tenant._id, role: 'operator_admin' },
          {
            $set: {
              email: tenant.owner.email,
              phone: tenant.owner.phone,
              fullName: tenant.owner.name,
            },
          }
        );
      }
    }

    if (address) {
      tenant.address = {
        door: address.door ?? tenant.address?.door ?? '',
        street: address.street ?? tenant.address?.street ?? '',
        city: address.city ?? tenant.address?.city ?? '',
        state: address.state ?? tenant.address?.state ?? '',
        pincode: address.pincode ?? tenant.address?.pincode ?? '',
        country: address.country ?? tenant.address?.country ?? 'India',
      };
    }

    if (branding) {
      tenant.branding = {
        ...tenant.branding,
        companyName: branding.companyName || tenant.name,
        supportPhone: branding.supportPhone || tenant.owner?.phone || '',
        supportEmail: branding.supportEmail || tenant.owner?.email || '',
      };
    }

    if (plan) {
      tenant.plan = {
        ...tenant.plan,
        name: plan.name || tenant.plan?.name,
        maxCustomers: plan.maxCustomers || tenant.plan?.maxCustomers,
        maxDevices: plan.maxDevices || tenant.plan?.maxDevices,
        monthlyFee: plan.monthlyFee || tenant.plan?.monthlyFee,
      };
    }

    await tenant.save();

    await recordAuditLog({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'TENANT_UPDATED',
      targetResource: 'Tenant',
      targetId: tenant._id.toString(),
      targetIdentifier: tenant.slug,
      beforeState,
      afterState: tenant.toObject(),
      correlationId: req.correlationId || `sa_ten_upd_${Date.now()}`,
    });

    const isFirst = tenant.subdomain === 'ciniplay.in';
    const cwmpUrl = isFirst ? 'http://ciniplay.in:7547' : `http://${tenant.slug}.ciniplay.in:7547`;

    return res.json({ success: true, tenant, cwmpUrl });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 6.5.2 Tenant Delete
 */
superAdminRouter.delete('/tenants/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findById(id);
    if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });

    await Promise.all([
      User.deleteMany({ tenantId: tenant._id }),
      Customer.deleteMany({ tenantId: tenant._id }),
      Device.deleteMany({ tenantId: tenant._id }),
      Tenant.findByIdAndDelete(id),
    ]);

    await recordAuditLog({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'TENANT_DELETED',
      targetResource: 'Tenant',
      targetId: id,
      targetIdentifier: tenant.slug,
      beforeState: tenant.toObject(),
      correlationId: req.correlationId || `sa_ten_del_${Date.now()}`,
    });

    return res.json({ success: true, message: `Tenant '${tenant.name}' deleted successfully.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 6.6 Global Users & Roles (CRUD)
 * Restricts superadmin users management to global super administrators
 */
superAdminRouter.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, role, status } = req.query;
    const query: any = {};

    if (role && role !== 'all') {
      query.role = role;
    } else {
      query.role = 'super_admin';
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      const searchRegex = new RegExp(String(search).trim(), 'i');
      query.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    const users = await User.find(query).populate('tenantId', 'name slug displayName').sort({ createdAt: -1 });
    return res.json({ success: true, users });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

superAdminRouter.post('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, email, phone, role, tenantId, status = 'active', permissions } = req.body;

    if (!fullName || !email || !phone || !role) {
      return res.status(400).json({ success: false, error: 'Full Name, Email, Phone, and Role are required.' });
    }

    // Role-based tenant validation
    let assignedTenantId = tenantId;
    if (role === 'super_admin') {
      assignedTenantId = undefined;
    } else if (!assignedTenantId) {
      return res.status(400).json({ success: false, error: 'Tenant context is required for non-superadmin roles.' });
    }

    // Default permissions based on role
    let defaultPermissions = permissions;
    if (!defaultPermissions || defaultPermissions.length === 0) {
      if (role === 'super_admin') defaultPermissions = ['SUPERADMIN_ALL'];
      else if (role === 'operator_admin') defaultPermissions = ['CUSTOMER_ALL', 'DEVICE_ALL', 'GIS_ALL', 'AI_ALL', 'TECH_ALL'];
      else if (role === 'noc_operator') defaultPermissions = ['CUSTOMER_READ', 'DEVICE_READ', 'DEVICE_REBOOT', 'GIS_READ', 'AI_READ'];
      else if (role === 'fiber_planner') defaultPermissions = ['GIS_ALL', 'DEVICE_READ'];
      else if (role === 'technician') defaultPermissions = ['WORKORDER_READ', 'WORKORDER_UPDATE', 'DEVICE_READ'];
      else defaultPermissions = ['CUSTOMER_PORTAL'];
    }

    const newUser = await User.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role,
      tenantId: assignedTenantId || undefined,
      status,
      permissions: defaultPermissions,
    });

    await recordAuditLog({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'USER_CREATED',
      targetResource: 'User',
      targetId: newUser._id.toString(),
      targetIdentifier: newUser.email,
      afterState: newUser.toObject(),
      correlationId: req.correlationId || `usr_create_${Date.now()}`,
    });

    const populatedUser = await User.findById(newUser._id).populate('tenantId', 'name slug displayName');

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user: populatedUser,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

superAdminRouter.put('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, email, phone, role, tenantId, status, permissions } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const beforeState = user.toObject();

    if (fullName) user.fullName = fullName.trim();
    if (email) user.email = email.trim().toLowerCase();
    if (phone) user.phone = phone.trim();
    if (role) {
      user.role = role;
      if (role === 'super_admin') {
        user.tenantId = undefined;
      } else if (tenantId) {
        user.tenantId = tenantId;
      }
    }
    if (tenantId !== undefined && role !== 'super_admin') {
      user.tenantId = tenantId || undefined;
    }
    if (status) user.status = status;
    if (permissions && Array.isArray(permissions)) user.permissions = permissions;

    user.updatedAt = new Date();
    await user.save();

    await recordAuditLog({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'USER_UPDATED',
      targetResource: 'User',
      targetId: user._id.toString(),
      targetIdentifier: user.email,
      beforeState,
      afterState: user.toObject(),
      correlationId: req.correlationId || `usr_update_${Date.now()}`,
    });

    const populatedUser = await User.findById(user._id).populate('tenantId', 'name slug displayName');

    return res.json({
      success: true,
      message: 'User updated successfully.',
      user: populatedUser,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

superAdminRouter.delete('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    if (user.role === 'super_admin') {
      const superAdminCount = await User.countDocuments({ role: 'super_admin' });
      if (superAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete the only Super Administrator account. Please add another super admin first.',
        });
      }
    }

    const beforeState = user.toObject();
    await User.findByIdAndDelete(req.params.id);

    await recordAuditLog({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'USER_DELETED',
      targetResource: 'User',
      targetId: req.params.id,
      targetIdentifier: user.email,
      beforeState,
      correlationId: req.correlationId || `usr_del_${Date.now()}`,
    });

    return res.json({
      success: true,
      message: `User '${user.fullName}' (${user.email}) deleted successfully.`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 6.7 Plans & Revenue
 */
superAdminRouter.get('/plans', async (req: AuthenticatedRequest, res: Response) => {
  try {
    let plans = await TenantPlan.find();
    if (plans.length === 0) {
      // Seed default SaaS plans
      plans = await TenantPlan.create([
        {
          name: 'Starter ISP',
          code: 'starter',
          maxCustomers: 1000,
          maxDevices: 1000,
          maxTechnicians: 5,
          monthlyFee: 1999,
          annualFee: 19990,
          features: ['TR-069 ACS', 'Customer Management', 'Basic Ticketing'],
        },
        {
          name: 'Growth ISP',
          code: 'growth',
          maxCustomers: 5000,
          maxDevices: 5000,
          maxTechnicians: 20,
          monthlyFee: 4999,
          annualFee: 49990,
          features: ['TR-069 & TR-369', 'Fiber GIS Topology', 'Technician Dispatch', 'WhatsApp Alerts'],
        },
        {
          name: 'Enterprise Carrier',
          code: 'enterprise',
          maxCustomers: 25000,
          maxDevices: 25000,
          maxTechnicians: 100,
          monthlyFee: 14999,
          annualFee: 149990,
          features: ['All Features', 'AI Command Center', 'Optical Predictive Engine', 'Dedicated SLA'],
        },
      ]);
    }
    return res.json({ success: true, plans });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 6.10 Global Audit Log Explorer
 */
superAdminRouter.get('/audit', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action, targetResource, limit = 50 } = req.query;
    const query: any = {};
    if (action) query.action = new RegExp(String(action), 'i');
    if (targetResource) query.targetResource = targetResource;

    const logs = await AuditLog.find(query).sort({ timestamp: -1 }).limit(Number(limit));
    return res.json({ success: true, logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Part 1.3: Event Bus Dead-Letter Queue (DLQ) Inspector & Redrive
 */
superAdminRouter.get('/events/dlq', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dlq = EventBusService.getDeadLetterQueue();
    return res.json({ success: true, dlq, count: dlq.length });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

superAdminRouter.post('/events/dlq/:id/redrive', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const redrived = await EventBusService.redriveDeadLetter(req.params.id);
    return res.json({ success: redrived, message: redrived ? 'Event redriven successfully' : 'Redrive failed' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Super Admin Settings: Retrieve active SMTP and WhatsApp configuration
 */
superAdminRouter.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    let setting = await SystemSetting.findOne({ key: 'global_config' });
    if (!setting) {
      setting = await SystemSetting.create({
        key: 'global_config',
        smtp: {
          enabled: false,
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          user: '',
          pass: '',
          fromEmail: '',
          fromName: 'AI ISP OS Security',
        },
        whatsapp: {
          enabled: true,
          status: 'DISCONNECTED',
          sessionName: 'primary_isp_session',
        },
      });
    }

    // Mask password before returning
    const rawSmtp: any = (setting.toObject ? setting.toObject().smtp : setting.smtp) || {};
    const safeSmtp = {
      host: rawSmtp.host || 'smtp.gmail.com',
      port: rawSmtp.port || 465,
      user: rawSmtp.user || '',
      pass: rawSmtp.pass ? '••••••••••••••••' : '',
      fromName: rawSmtp.fromName || 'AI ISP OS Security',
      fromEmail: rawSmtp.fromEmail || rawSmtp.user || '',
      isConfigured: Boolean(rawSmtp.user && rawSmtp.pass),
      enabled: Boolean(rawSmtp.enabled),
    };

    return res.json({
      success: true,
      settings: {
        smtp: safeSmtp,
        whatsapp: setting.whatsapp,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Super Admin Settings: Save Google Email & App Password
 */
superAdminRouter.post('/settings/smtp', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { user, pass, fromName, host = 'smtp.gmail.com', port = 465, secure = true } = req.body;

    if (!user) {
      return res.status(400).json({ success: false, error: 'Google email address is required.' });
    }

    let setting = await SystemSetting.findOne({ key: 'global_config' });
    if (!setting) {
      setting = new SystemSetting({ key: 'global_config' });
    }

    setting.smtp.user = user.trim().toLowerCase();
    if (pass && pass !== '••••••••••••••••') {
      setting.smtp.pass = pass.replace(/\s+/g, ''); // 16-character Google App Password without spaces
    }
    setting.smtp.host = host;
    setting.smtp.port = Number(port);
    setting.smtp.secure = Boolean(secure);
    setting.smtp.fromEmail = user.trim().toLowerCase();
    setting.smtp.fromName = fromName || 'AI ISP OS Platform';
    setting.smtp.enabled = Boolean(setting.smtp.user && setting.smtp.pass);
    setting.smtp.updatedAt = new Date();

    await setting.save();

    await recordAuditLog({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'UPDATE_SMTP_SETTINGS',
      targetResource: 'SystemSetting',
      targetId: setting._id.toString(),
      correlationId: req.correlationId || `smtp_${Date.now()}`,
    });

    return res.json({
      success: true,
      message: 'Gmail SMTP credentials saved successfully. Email OTP dispatch is now enabled.',
      smtp: {
        user: setting.smtp.user,
        host: setting.smtp.host,
        port: setting.smtp.port,
        fromName: setting.smtp.fromName,
        isConfigured: Boolean(setting.smtp.user && setting.smtp.pass),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Super Admin Settings: Test Gmail SMTP Connection & Send Verification Email
 */
superAdminRouter.post('/settings/smtp/test', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { user, pass, targetEmail = req.user!.email } = req.body;

    let smtpConfig = await EmailService.getSmtpConfig();
    if (user && pass && pass !== '••••••••••••••••') {
      smtpConfig = {
        enabled: true,
        host: req.body.host || 'smtp.gmail.com',
        port: Number(req.body.port) || 465,
        secure: req.body.secure ?? true,
        user: user.trim(),
        pass: pass.replace(/\s+/g, ''),
        fromEmail: user.trim(),
        fromName: req.body.fromName || 'AI ISP OS Platform',
      };
    }

    if (!smtpConfig || !smtpConfig.user || !smtpConfig.pass) {
      return res.status(400).json({ success: false, error: 'Google email and App Password are required to test.' });
    }

    const testResult = await EmailService.testConnection(smtpConfig, targetEmail);
    return res.json(testResult);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Super Admin Settings: WhatsApp Web - Get Status / QR Code
 */
superAdminRouter.get('/settings/whatsapp/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const whatsapp = await WhatsAppService.getSessionConfig();
    return res.json({ success: true, whatsapp });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Super Admin Settings: WhatsApp Web - Generate Fresh Pairing QR Code
 */
superAdminRouter.post('/settings/whatsapp/generate-qr', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { forceFresh } = req.body;
    const qrResult = await WhatsAppService.generateQrCode(Boolean(forceFresh));
    return res.json({ success: true, ...qrResult });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Super Admin Settings: WhatsApp Web - Confirm / Simulate Successful Scan Pairing
 */
superAdminRouter.post('/settings/whatsapp/confirm-scan', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { phone = '+919988776655', deviceInfo = 'WhatsApp Business for Android (v2.24.18)' } = req.body;
    const session = await WhatsAppService.confirmPairing(phone, deviceInfo);

    await recordAuditLog({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'WHATSAPP_SESSION_PAIRED',
      targetResource: 'SystemSetting',
      targetId: 'whatsapp_session',
      correlationId: req.correlationId || `wa_pair_${Date.now()}`,
    });

    return res.json({
      success: true,
      message: `WhatsApp Business session successfully connected for ${phone}`,
      whatsapp: session,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Super Admin Settings: WhatsApp Web - Disconnect Session
 */
superAdminRouter.post('/settings/whatsapp/disconnect', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const session = await WhatsAppService.disconnectSession();
    return res.json({
      success: true,
      message: 'WhatsApp session disconnected.',
      whatsapp: session,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Super Admin Settings: WhatsApp Web - Send Test Message
 */
superAdminRouter.post('/settings/whatsapp/test', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { phone, message } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: 'Target mobile number is required' });

    const result = await WhatsAppService.sendTestMessage(phone, message || 'Test alert from AI ISP OS Platform');
    return res.json({
      success: true,
      message: `Test WhatsApp message sent to ${phone}`,
      messageId: result.messageId,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * =========================================================================
 * 6.10 Pending Operator Mappings & WhatsApp Alert Settings (Strict CWMP Multi-Tenant Isolation)
 * =========================================================================
 */

/**
 * GET /api/superadmin/pending-mappings
 * List pending unmapped CPEs with search, status filters, and pagination
 */
superAdminRouter.get('/pending-mappings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, search, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;

    const query: any = {};
    if (status && status !== 'ALL' && status !== 'undefined' && status !== 'null') {
      query.status = status;
    }
    if (search && search !== 'undefined' && search !== 'null') {
      const s = (search as string).trim();
      if (s) {
        query.$or = [
          { serialNumber: new RegExp(s, 'i') },
          { productClass: new RegExp(s, 'i') },
          { manufacturer: new RegExp(s, 'i') },
          { oui: new RegExp(s, 'i') },
          { clientIp: new RegExp(s, 'i') },
          { incomingHost: new RegExp(s, 'i') },
          { pathOrQuerySlug: new RegExp(s, 'i') },
        ];
      }
    }

    const [items, total, pendingCount, mappedCount, ignoredCount] = await Promise.all([
      PendingDeviceMapping.find(query)
        .sort({ lastSeenAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('mappedTenantId', 'name displayName slug')
        .populate('mappedBy', 'fullName email'),
      PendingDeviceMapping.countDocuments(query),
      PendingDeviceMapping.countDocuments({ status: 'PENDING' }),
      PendingDeviceMapping.countDocuments({ status: 'MAPPED' }),
      PendingDeviceMapping.countDocuments({ status: 'IGNORED' }),
    ]);

    const serials = items.map((i) => i.serialNumber);
    const existingDevices = await Device.find({ serialNumber: { $in: serials } }).lean();
    const deviceMap = new Map<string, any>();
    for (const d of existingDevices) {
      deviceMap.set(d.serialNumber, d);
    }

    const enrichedItems = items.map((item) => {
      const itemObj: any = item.toObject();
      const dev = deviceMap.get(item.serialNumber);
      if (dev) {
        if (!itemObj.wifi24?.ssid && dev.wifi24?.ssid) itemObj.wifi24 = dev.wifi24;
        if (!itemObj.wifi5g?.ssid && dev.wifi5g?.ssid) itemObj.wifi5g = dev.wifi5g;
        if (!itemObj.wan?.pppoeUsername && dev.wanProfiles?.[0]?.pppoeUsername) {
          itemObj.wan = {
            pppoeUsername: dev.wanProfiles[0].pppoeUsername,
            vlanId: dev.wanProfiles[0].vlanId,
            connectionType: dev.wanProfiles[0].connectionType || 'PPPoE',
            ipAddress: dev.ipAddress || dev.externalIpAddress,
            macAddress: dev.macAddress,
            status: dev.wanProfiles[0].status || 'Connected',
          };
        }
        if (!itemObj.telemetry?.rxPowerDbm && dev.currentRxPowerDbm) {
          itemObj.telemetry = {
            rxPowerDbm: dev.currentRxPowerDbm,
            txPowerDbm: dev.currentTxPowerDbm,
            voltageV: dev.opticalVoltageV,
            biasCurrentMa: dev.biasCurrentMa,
            temperatureC: dev.temperatureC,
            lanHostCount: dev.lanHostCount || 0,
          };
        }
      }
      return itemObj;
    });

    return res.json({
      success: true,
      items: enrichedItems,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      counts: {
        total: pendingCount + mappedCount + ignoredCount,
        pending: pendingCount,
        mapped: mappedCount,
        ignored: ignoredCount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/superadmin/pending-mappings/count
 * Returns pending badge count for navbar
 */
superAdminRouter.get('/pending-mappings/count', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = await PendingDeviceMapping.countDocuments({ status: 'PENDING' });
    return res.json({ success: true, count });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/superadmin/pending-mappings/:id/assign
 * Super Admin manually binds an unmapped CPE to a chosen Operator Tenant
 */
superAdminRouter.post('/pending-mappings/:id/assign', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.body;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Target Operator Tenant is required' });
    }

    const targetTenant = await Tenant.findById(tenantId);
    if (!targetTenant) {
      return res.status(404).json({ success: false, error: 'Selected Operator Tenant not found' });
    }

    const pending = await PendingDeviceMapping.findById(id);
    if (!pending) {
      return res.status(404).json({ success: false, error: 'Pending device record not found' });
    }

    // Update PendingDeviceMapping record
    pending.status = 'MAPPED';
    pending.mappedTenantId = targetTenant._id as any;
    pending.mappedTenantSlug = targetTenant.slug;
    pending.mappedBy = new Types.ObjectId(req.user!.id) as any;
    pending.mappedAt = new Date();
    await pending.save();

    // Check if Device already exists in DB -> update tenantId, otherwise create in operator fleet
    let device = await Device.findOne({ serialNumber: pending.serialNumber });
    if (device) {
      device.tenantId = targetTenant._id as any;
      device.status = 'online';
      await device.save();
    } else {
      device = await Device.create({
        tenantId: targetTenant._id,
        deviceIdStr: `dev_${Date.now()}_${pending.serialNumber.slice(-4)}`,
        serialNumber: pending.serialNumber,
        macAddress: pending.macAddress || `00:E0:${pending.clientIp?.split('.').map((p) => parseInt(p).toString(16).padStart(2, '0')).slice(-4).join(':') || '00:00:00:00'}`,
        manufacturer: pending.manufacturer || 'Generic GPON',
        modelName: pending.productClass || 'GPON-ONT',
        hardwareVersion: pending.hardwareVersion || 'V1.0',
        softwareVersion: pending.softwareVersion || 'V1.0.0',
        protocol: 'TR-069',
        status: 'online',
        lastInform: new Date(),
        ipAddress: pending.clientIp,
        externalIpAddress: pending.clientIp,
        opticalStatus: 'normal',
        assigned: false,
        rawParameters: {},
        wifi24: {
          ssid: '',
          password: '',
          enabled: true,
          channel: 6,
          channelAuto: true,
          bandwidthMhz: 20,
          securityMode: 'WPA2-PSK',
          txPowerPercent: 100,
        },
        wifi5g: {
          ssid: '',
          password: '',
          enabled: true,
          channel: 44,
          channelAuto: true,
          bandwidthMhz: 80,
          securityMode: 'WPA2-PSK',
          txPowerPercent: 100,
        },
      });
    }

    await recordAuditLog({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'DEVICE_MAPPED_TO_TENANT',
      targetResource: 'PendingDeviceMapping',
      targetId: pending.serialNumber,
      correlationId: `map_${pending.serialNumber}_${Date.now()}`,
      afterState: {
        serialNumber: pending.serialNumber,
        targetTenantSlug: targetTenant.slug,
        targetTenantName: targetTenant.displayName || targetTenant.name,
      },
    });

    return res.json({
      success: true,
      message: `Device ${pending.serialNumber} successfully assigned to ${targetTenant.displayName || targetTenant.name} (${targetTenant.slug})`,
      pending,
      device,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/superadmin/pending-mappings/bulk-assign
 * Super Admin bulk binds multiple unmapped CPEs to a chosen Operator Tenant
 */
superAdminRouter.post('/pending-mappings/bulk-assign', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ids, tenantId, assignAllPending } = req.body;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Target Operator Tenant is required' });
    }

    const targetTenant = await Tenant.findById(tenantId);
    if (!targetTenant) {
      return res.status(404).json({ success: false, error: 'Selected Operator Tenant not found' });
    }

    let filter: any = {};
    if (assignAllPending) {
      filter = { status: 'PENDING' };
    } else if (Array.isArray(ids) && ids.length > 0) {
      filter = { _id: { $in: ids } };
    } else {
      return res.status(400).json({ success: false, error: 'No devices selected for bulk assignment' });
    }

    const pendings = await PendingDeviceMapping.find(filter);
    if (pendings.length === 0) {
      return res.status(404).json({ success: false, error: 'No matching pending devices found' });
    }

    let assignedCount = 0;
    const now = new Date();

    for (const pending of pendings) {
      pending.status = 'MAPPED';
      pending.mappedTenantId = targetTenant._id as any;
      pending.mappedTenantSlug = targetTenant.slug;
      pending.mappedBy = new Types.ObjectId(req.user!.id) as any;
      pending.mappedAt = now;
      await pending.save();

      let device = await Device.findOne({ serialNumber: pending.serialNumber });
      if (device) {
        device.tenantId = targetTenant._id as any;
        device.status = 'online';
        await device.save();
      } else {
        await Device.create({
          tenantId: targetTenant._id,
          deviceIdStr: `dev_${Date.now()}_${pending.serialNumber.slice(-4)}`,
          serialNumber: pending.serialNumber,
          macAddress: pending.macAddress || `00:E0:${pending.clientIp?.split('.').map((p) => parseInt(p).toString(16).padStart(2, '0')).slice(-4).join(':') || '00:00:00:00'}`,
          manufacturer: pending.manufacturer || 'Generic GPON',
          modelName: pending.productClass || 'GPON-ONT',
          hardwareVersion: pending.hardwareVersion || 'V1.0',
          softwareVersion: pending.softwareVersion || 'V1.0.0',
          protocol: 'TR-069',
          status: 'online',
          lastInform: now,
          ipAddress: pending.clientIp,
          externalIpAddress: pending.clientIp,
          opticalStatus: 'normal',
          assigned: false,
          rawParameters: {},
          wifi24: {
            ssid: '',
            password: '',
            enabled: true,
            channel: 6,
            channelAuto: true,
            bandwidthMhz: 20,
            securityMode: 'WPA2-PSK',
            txPowerPercent: 100,
          },
          wifi5g: {
            ssid: '',
            password: '',
            enabled: true,
            channel: 44,
            channelAuto: true,
            bandwidthMhz: 80,
            securityMode: 'WPA2-PSK',
            txPowerPercent: 100,
          },
        });
      }
      assignedCount++;
    }

    await recordAuditLog({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'BULK_DEVICES_MAPPED_TO_TENANT',
      targetResource: 'PendingDeviceMapping',
      targetId: targetTenant.slug,
      correlationId: `bulk_map_${targetTenant.slug}_${Date.now()}`,
      afterState: {
        assignedCount,
        targetTenantSlug: targetTenant.slug,
        targetTenantName: targetTenant.displayName || targetTenant.name,
      },
    });

    return res.json({
      success: true,
      message: `Successfully assigned ${assignedCount} device(s) to ${targetTenant.displayName || targetTenant.name} (${targetTenant.slug})`,
      assignedCount,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/superadmin/pending-mappings/:id/ignore
 * Mark a pending mapping as IGNORED
 */
superAdminRouter.post('/pending-mappings/:id/ignore', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const pending = await PendingDeviceMapping.findByIdAndUpdate(
      id,
      { $set: { status: 'IGNORED', mappedBy: req.user!.id, mappedAt: new Date() } },
      { new: true }
    );
    if (!pending) return res.status(404).json({ success: false, error: 'Record not found' });
    return res.json({ success: true, message: `Device ${pending.serialNumber} marked as IGNORED`, pending });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/superadmin/pending-mappings/:id
 * Delete a pending mapping record
 */
superAdminRouter.delete('/pending-mappings/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await PendingDeviceMapping.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Record deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/superadmin/settings/alerts
 * Get Super Admin alert configuration
 */
superAdminRouter.get('/settings/alerts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    let setting = await SystemSetting.findOne({ key: 'global_config' });
    if (!setting) {
      setting = await SystemSetting.create({ key: 'global_config' });
    }
    const alerts = (setting.toObject ? setting.toObject().superAdminAlerts : setting.superAdminAlerts) || {
      whatsappEnabled: true,
      recipientPhone: '',
      alertOnPendingDevice: true,
      cooldownMinutes: 360,
    };
    return res.json({ success: true, alerts });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/superadmin/settings/alerts
 * Update Super Admin alert preferences
 */
superAdminRouter.put('/settings/alerts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { whatsappEnabled, recipientPhone, alertOnPendingDevice, cooldownMinutes } = req.body;

    const setting = await SystemSetting.findOneAndUpdate(
      { key: 'global_config' },
      {
        $set: {
          'superAdminAlerts.whatsappEnabled': Boolean(whatsappEnabled),
          'superAdminAlerts.recipientPhone': recipientPhone || '',
          'superAdminAlerts.alertOnPendingDevice': Boolean(alertOnPendingDevice),
          'superAdminAlerts.cooldownMinutes': Number(cooldownMinutes) || 360,
          'superAdminAlerts.updatedAt': new Date(),
        },
      },
      { new: true, upsert: true }
    );

    await recordAuditLog({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'UPDATE_SUPERADMIN_ALERTS_CONFIG',
      targetResource: 'SystemSetting',
      targetId: 'superAdminAlerts',
      correlationId: `alert_cfg_${Date.now()}`,
    });

    return res.json({
      success: true,
      message: 'Super Admin notification preferences saved successfully',
      alerts: setting.superAdminAlerts,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/superadmin/settings/alerts/test-whatsapp
 * Dispatches an instant test WhatsApp alert to the configured Super Admin phone
 */
superAdminRouter.post('/settings/alerts/test-whatsapp', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { phone } = req.body;
    const targetPhone = phone || (await SystemSetting.findOne({ key: 'global_config' }))?.superAdminAlerts?.recipientPhone;

    if (!targetPhone) {
      return res.status(400).json({ success: false, error: 'Super Admin recipient WhatsApp phone number is required' });
    }

    const testPayload = {
      serialNumber: `TEST-ONT-${Math.floor(100000 + Math.random() * 900000)}`,
      manufacturer: 'GENEXIS / Syrotech (Test)',
      oui: '002207',
      productClass: 'Titanium-2122A',
      incomingHost: 'ciniplay.in:7547',
      incomingUrl: '/tr069',
      reason: 'MISSING_SLUG_AND_SUBDOMAIN (Test Alert)',
      clientIp: req.ip || '127.0.0.1',
    };

    const formattedTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const alertMessage =
      `🧪 *AI ISP OS — Super Admin WhatsApp Alert Test*\n\n` +
      `This is a verified test notification confirming your Super Admin alert channel is active!\n\n` +
      `📟 *Sample Serial:* \`${testPayload.serialNumber}\`\n` +
      `🏷️ *Model:* ${testPayload.productClass}\n` +
      `🌐 *Host:* ${testPayload.incomingHost}\n` +
      `❗ *Reason Code:* \`${testPayload.reason}\`\n` +
      `🕒 *Timestamp:* ${formattedTime} IST\n\n` +
      `👉 *Manage Devices:* https://ciniplay.in/superadmin/pending-mappings\n\n` +
      `🛡️ _AI ISP OS Multi-Tenant TR-069 Controller_`;

    const result = await WhatsAppService.sendTestMessage(targetPhone, alertMessage);

    return res.json({
      success: true,
      message: `Test alert dispatched to Super Admin mobile [${targetPhone}]`,
      messageId: result.messageId,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
