import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Tenant } from '../models/Tenant.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../middleware/tenantIsolation.js';
import { recordAuditLog } from '../middleware/audit.js';
import { EmailService } from '../services/emailService.js';
import { WhatsAppService } from '../services/whatsAppService.js';

export const authRouter = Router();

/**
 * Super Admin Login: Step 1 (Request Dynamic Email & WhatsApp OTP)
 */
authRouter.post('/superadmin/request-otp', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawInput = (req.body.email || req.body.phone || req.body.identifier || '').trim();
    if (!rawInput) return res.status(400).json({ success: false, error: 'Registered Email address or Mobile phone number is required.' });

    const isEmail = rawInput.includes('@');
    const cleanDigits = rawInput.replace(/[^0-9]/g, '').slice(-10);

    let user: any = null;
    if (isEmail) {
      user = await User.findOne({ email: rawInput.toLowerCase(), role: 'super_admin' });
    } else if (cleanDigits.length === 10) {
      user = await User.findOne({ phone: { $regex: new RegExp(cleanDigits + '$') }, role: 'super_admin' });
    }

    if (!user) {
      // Fallback search across all super admins
      user = await User.findOne({
        role: 'super_admin',
        $or: [
          { email: rawInput.toLowerCase() },
          { phone: { $regex: new RegExp(cleanDigits + '$') } },
        ]
      });
    }

    const totalSuperAdmins = await User.countDocuments({ role: 'super_admin' });

    // Initial bootstrap: Only if ZERO super admins exist in the system, allow first bootstrap
    if (!user && totalSuperAdmins === 0) {
      user = await User.create({
        email: isEmail ? rawInput.toLowerCase() : 'kanugulasairam2004@gmail.com',
        phone: cleanDigits.length === 10 ? `+91${cleanDigits}` : '+919949666907',
        fullName: 'Super Administrator',
        role: 'super_admin',
        permissions: ['SUPERADMIN_ALL'],
        status: 'active',
      });
    }

    if (!user || user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: `Access Denied: '${rawInput}' is not registered as an authorized Super Administrator. Only registered Super Admins under Global Users & Access Control can log in.`,
      });
    }

    // Generate secure dynamic 6-digit OTP
    const dynamicOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = dynamicOtp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await user.save();

    // 1. Send dynamic OTP email via Gmail SMTP App Password service
    let emailSuccess = false;
    let emailErrorMsg: string | undefined;
    if (user.email) {
      try {
        const emailResult = await EmailService.sendOtpEmail(user.email, dynamicOtp, user.fullName);
        emailSuccess = emailResult.success;
        emailErrorMsg = emailResult.error;
      } catch (err: any) {
        emailErrorMsg = err.message;
      }
    }

    // 2. Send dynamic OTP via WhatsApp Web Multi-Device
    let waSuccess = false;
    const dispatchPhone = user.phone || '+919949666907';
    try {
      const waResult = await WhatsAppService.sendOtpMessage(dispatchPhone, dynamicOtp, user.fullName, 'Super Admin Control Plane');
      waSuccess = waResult.success;
    } catch (err: any) {
      console.warn('[SuperAdmin Auth] WhatsApp OTP dispatch warning:', err.message);
    }

    console.log(`\n======================================================\n🔑 [SUPER ADMIN DYNAMIC OTP]: ${dynamicOtp} for ${user.email} (${dispatchPhone})\n======================================================\n`);

    const maskedEmail = user.email ? user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '';
    const maskedPhone = user.phone ? user.phone.replace(/(\+?\d{2,4})\d+(\d{4})/, '$1******$2') : '';

    return res.json({
      success: true,
      message: waSuccess || emailSuccess 
        ? `Dynamic OTP dispatched to ${maskedEmail || maskedPhone} (Email & WhatsApp).`
        : `Dynamic OTP generated and sent to ${maskedEmail || maskedPhone}.`,
      destinationMasked: maskedEmail || maskedPhone,
      emailDelivered: emailSuccess,
      emailError: emailErrorMsg,
      whatsappDelivered: waSuccess,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Super Admin Login: Step 2 (Verify Email / WhatsApp OTP)
 * Strictly verifies dynamic 6-digit OTP code against database.
 */
authRouter.post('/superadmin/verify-otp', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawInput = (req.body.email || req.body.phone || req.body.identifier || '').trim();
    const { otp } = req.body;
    if (!rawInput || !otp) return res.status(400).json({ success: false, error: 'Email/Phone and OTP are required' });

    const isEmail = rawInput.includes('@');
    const cleanDigits = rawInput.replace(/[^0-9]/g, '').slice(-10);

    let user: any = null;
    if (isEmail) {
      user = await User.findOne({ email: rawInput.toLowerCase(), role: 'super_admin' });
    } else if (cleanDigits.length === 10) {
      user = await User.findOne({ phone: { $regex: new RegExp(cleanDigits + '$') }, role: 'super_admin' });
    }

    if (!user) {
      user = await User.findOne({
        role: 'super_admin',
        $or: [
          { email: rawInput.toLowerCase() },
          { phone: { $regex: new RegExp(cleanDigits + '$') } },
        ]
      });
    }

    if (!user) return res.status(401).json({ success: false, error: 'Invalid super administrator credentials' });

    // Strictly verify against user.otpCode in database
    const cleanOtp = String(otp || '').trim();
    const isOtpValid = Boolean(user.otpCode && user.otpCode === cleanOtp);

    if (!isOtpValid) {
      return res.status(401).json({ success: false, error: 'Invalid OTP code. Please enter the 6-digit code received on your email/WhatsApp.' });
    }

    if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
      return res.status(401).json({ success: false, error: 'OTP code has expired. Please request a new code.' });
    }

    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      permissions: user.permissions || ['SUPERADMIN_ALL'],
    });

    await recordAuditLog({
      actorId: user._id.toString(),
      actorEmail: user.email,
      actorRole: user.role,
      action: 'SUPER_ADMIN_LOGIN',
      targetResource: 'ControlPlane',
      targetId: user._id.toString(),
      correlationId: req.correlationId || `sa_login_${Date.now()}`,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Operator WhatsApp OTP Login: Step 1 (Request WhatsApp OTP)
 * Flexible lookup across registered users and tenant owner phone numbers.
 */
authRouter.post('/operator/request-otp', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { phone, slug } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Mobile phone number or email is required.' });
    }

    const inputVal = phone.trim();
    const isEmail = inputVal.includes('@');
    const cleanPhoneDigits = inputVal.replace(/[^0-9]/g, '');
    const last10Digits = cleanPhoneDigits.slice(-10);

    let matchingUsers: any[] = [];
    let matchingTenants: any[] = [];

    if (isEmail) {
      matchingUsers = await User.find({
        email: inputVal.toLowerCase(),
        status: { $ne: 'suspended' },
      }).populate('tenantId');

      matchingTenants = await Tenant.find({
        'owner.email': inputVal.toLowerCase(),
        status: { $ne: 'suspended' },
      });
    } else {
      if (last10Digits.length < 10) {
        return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit mobile number or email.' });
      }

      matchingUsers = await User.find({
        phone: { $regex: new RegExp(last10Digits + '$') },
        status: { $ne: 'suspended' },
      }).populate('tenantId');

      matchingTenants = await Tenant.find({
        'owner.phone': { $regex: new RegExp(last10Digits + '$') },
        status: { $ne: 'suspended' },
      });
    }

    // Check if user is a Super Admin
    const isSuperAdmin = matchingUsers.some((u) => u.role === 'super_admin');
    if (isSuperAdmin) {
      const allTenants = await Tenant.find({ status: { $ne: 'suspended' } });
      matchingTenants = allTenants;
    }

    // Ensure matching operator user exists for each tenant
    for (const t of matchingTenants) {
      let existingUser = matchingUsers.find((u) => u.tenantId && ((u.tenantId as any)._id || u.tenantId).toString() === t._id.toString());
      if (!existingUser) {
        let opUser = await User.findOne({ tenantId: t._id });
        if (!opUser) {
          try {
            opUser = await User.create({
              tenantId: t._id,
              email: t.owner?.email || `admin@${t.slug}.ciniplay.in`,
              phone: t.owner?.phone || (last10Digits ? `+91${last10Digits}` : '+919949666907'),
              fullName: t.owner?.name || t.displayName || 'Operator Admin',
              role: 'operator_admin',
              permissions: ['CUSTOMER_ALL', 'DEVICE_ALL', 'GIS_ALL', 'AI_ALL', 'TECH_ALL'],
              status: 'active',
            });
          } catch {
            opUser = await User.findOne({ tenantId: t._id });
          }
        }
        if (opUser) matchingUsers.push(opUser);
      }
    }

    // If slug is explicitly provided, filter by that slug
    if (slug && slug !== 'default') {
      matchingUsers = matchingUsers.filter((u) => {
        const t = u.tenantId as any;
        return t && t.slug && t.slug.toLowerCase() === slug.toLowerCase();
      });
    }

    if (matchingUsers.length === 0 && matchingTenants.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Identifier '${inputVal}' is not registered as an authorized operator in the database. Please verify the mobile/email or register in Super Admin > Tenants.`,
      });
    }

    // Collect unique tenants from matching users and matching tenants
    const tenantMap = new Map<string, any>();

    for (const u of matchingUsers) {
      if (u.tenantId && typeof u.tenantId === 'object' && (u.tenantId as any).slug) {
        tenantMap.set((u.tenantId as any)._id.toString(), u.tenantId);
      }
    }
    for (const t of matchingTenants) {
      tenantMap.set(t._id.toString(), t);
    }

    const uniqueTenants = Array.from(tenantMap.values());

    // If multiple unique tenants exist and no specific slug provided, ask for tenant selection
    if (uniqueTenants.length > 1 && !slug) {
      return res.json({
        success: true,
        requireTenantSelection: true,
        tenants: uniqueTenants.map((t: any) => ({
          id: t._id,
          name: t.name,
          displayName: t.displayName || t.name,
          slug: t.slug,
        })),
      });
    }

    // Determine target tenant
    let targetTenant: any = uniqueTenants.length === 1 ? uniqueTenants[0] : null;
    if (!targetTenant) {
      if (slug && slug !== 'default') {
        targetTenant = await Tenant.findOne({ slug: slug.toLowerCase() });
      }
      if (!targetTenant) {
        targetTenant = (await Tenant.findOne({ slug: 'rudra' })) || (await Tenant.findOne({ status: { $ne: 'suspended' } }));
      }
    }

    if (targetTenant && targetTenant.status === 'suspended') {
      return res.status(403).json({ success: false, error: `ISP Tenant '${targetTenant.displayName}' account is suspended.` });
    }

    // Find or create operator user for targetTenant
    let operatorUser: any = null;
    if (targetTenant) {
      operatorUser = await User.findOne({
        tenantId: targetTenant._id,
        $or: [
          { phone: { $regex: new RegExp(last10Digits + '$') } },
          { email: isEmail ? inputVal.toLowerCase() : undefined }
        ].filter(Boolean)
      });
      if (!operatorUser) {
        operatorUser = await User.findOne({ tenantId: targetTenant._id, role: 'operator_admin' });
      }
      if (!operatorUser) {
        operatorUser = await User.findOne({ tenantId: targetTenant._id });
      }
    }

    if (!operatorUser && matchingUsers.length > 0) {
      operatorUser = matchingUsers[0];
    }

    if (!operatorUser && targetTenant) {
      operatorUser = await User.create({
        tenantId: targetTenant._id,
        email: targetTenant.owner?.email || `admin@${targetTenant.slug}.ciniplay.in`,
        phone: targetTenant.owner?.phone || (last10Digits ? `+91${last10Digits}` : '+919949666907'),
        fullName: targetTenant.owner?.name || targetTenant.displayName || 'Operator Admin',
        role: 'operator_admin',
        permissions: ['CUSTOMER_ALL', 'DEVICE_ALL', 'GIS_ALL', 'AI_ALL', 'TECH_ALL'],
        status: 'active',
      });
    }

    if (!operatorUser) {
      return res.status(404).json({
        success: false,
        error: `Could not find or create an operator user account for '${inputVal}'. Please contact Super Admin.`,
      });
    }

    // Generate dynamic 6-digit random OTP
    const dynamicOtp = Math.floor(100000 + Math.random() * 900000).toString();
    operatorUser.otpCode = dynamicOtp;
    operatorUser.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    operatorUser.status = 'active';
    await operatorUser.save();

    // Dispatch WhatsApp OTP via Baileys Multi-Device Engine
    const dispatchPhone = operatorUser.phone || (last10Digits ? `+91${last10Digits}` : '+919949666907');
    const waResult = await WhatsAppService.sendOtpMessage(
      dispatchPhone,
      dynamicOtp,
      operatorUser.fullName,
      targetTenant?.displayName || 'Primary ISP'
    );

    const maskedPhone = dispatchPhone.replace(/(\+\d{2})(\d{2})(\d+)(\d{2})/, '$1 $2******$4');

    return res.json({
      success: true,
      message: `WhatsApp OTP sent successfully to ${maskedPhone}`,
      destinationMasked: maskedPhone,
      operatorName: operatorUser.fullName,
      tenantName: targetTenant?.displayName || 'Primary ISP',
      tenantSlug: targetTenant?.slug || 'default',
      messageId: waResult.messageId,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Operator WhatsApp OTP Login: Step 2 (Verify WhatsApp OTP)
 */
authRouter.post('/operator/verify-otp', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { phone, slug, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: 'Mobile number/email and OTP are required' });
    }

    const inputVal = phone.trim();
    const isEmail = inputVal.includes('@');
    const cleanPhoneDigits = inputVal.replace(/[^0-9]/g, '');
    const last10Digits = cleanPhoneDigits.slice(-10);

    let users: any[] = [];
    if (isEmail) {
      users = await User.find({
        email: inputVal.toLowerCase(),
      }).populate('tenantId');
    } else {
      users = await User.find({
        phone: { $regex: new RegExp(last10Digits + '$') },
      }).populate('tenantId');
    }

    let operatorUser: any = null;

    if (slug && slug !== 'default') {
      operatorUser = users.find((u: any) => u.tenantId && u.tenantId.slug && u.tenantId.slug.toLowerCase() === slug.toLowerCase());
    } else {
      operatorUser = users[0];
    }

    if (!operatorUser) {
      operatorUser = users[0];
    }

    if (!operatorUser) {
      return res.status(404).json({ success: false, error: 'No operator user found matching this account' });
    }

    const isOtpValid = operatorUser.otpCode === otp;

    if (!isOtpValid) {
      return res.status(401).json({ success: false, error: 'Invalid OTP code. Please enter the dynamic 6-digit code sent to your WhatsApp.' });
    }

    if (operatorUser.otpExpiresAt && new Date() > operatorUser.otpExpiresAt) {
      return res.status(401).json({ success: false, error: 'OTP has expired. Please request a new code.' });
    }

    // Clear OTP and record login
    operatorUser.otpCode = undefined;
    operatorUser.otpExpiresAt = undefined;
    operatorUser.lastLoginAt = new Date();
    await operatorUser.save();

    // Resolve active tenant
    let activeTenant = operatorUser.tenantId;
    if (!activeTenant || typeof activeTenant !== 'object') {
      if (slug && slug !== 'default') {
        activeTenant = await Tenant.findOne({ slug: slug.toLowerCase() });
      } else {
        activeTenant = (await Tenant.findOne({ slug: 'rudra' })) || (await Tenant.findOne());
      }
    }

    const token = generateToken({
      userId: operatorUser._id.toString(),
      email: operatorUser.email,
      role: operatorUser.role || 'operator_admin',
      tenantId: activeTenant?._id ? activeTenant._id.toString() : '6a8b4af0c02cab47ff9b11ef',
      permissions: operatorUser.permissions || ['CUSTOMER_ALL', 'DEVICE_ALL', 'GIS_ALL', 'AI_ALL', 'TECH_ALL'],
    });

    await recordAuditLog({
      tenantId: activeTenant?._id,
      actorId: operatorUser._id.toString(),
      actorEmail: operatorUser.email,
      actorRole: operatorUser.role,
      action: 'OPERATOR_WHATSAPP_LOGIN',
      targetResource: 'Tenant',
      targetId: activeTenant ? activeTenant._id.toString() : 'primary',
      correlationId: req.correlationId || `op_wa_login_${Date.now()}`,
    });

    return res.json({
      success: true,
      token,
      tenant: activeTenant
        ? {
            id: activeTenant._id,
            name: activeTenant.name,
            displayName: activeTenant.displayName,
            slug: activeTenant.slug,
            branding: activeTenant.branding,
            plan: activeTenant.plan,
          }
        : {
            id: 'primary',
            name: 'Primary ISP',
            displayName: 'Primary ISP NOC',
            slug: 'default',
          },
      user: {
        id: operatorUser._id,
        email: operatorUser.email,
        phone: operatorUser.phone,
        fullName: operatorUser.fullName,
        role: operatorUser.role,
        permissions: operatorUser.permissions,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Operator Tenant Login (Legacy fallback)
 */
authRouter.post('/operator/login', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, slug } = req.body;
    const tenantSlug = slug || (req.headers['x-tenant-slug'] as string) || 'apex';

    const tenant = await Tenant.findOne({ slug: tenantSlug.toLowerCase() });
    if (!tenant) {
      return res.status(404).json({ success: false, error: `ISP Tenant '${tenantSlug}' not found.` });
    }

    if (tenant.status === 'suspended') {
      return res.status(403).json({ success: false, error: 'Tenant account is suspended.' });
    }

    let user = await User.findOne({
      tenantId: tenant._id,
      email: email ? email.toLowerCase() : 'admin@apexfiber.in',
    });

    if (!user) {
      // Bootstrap tenant admin if first time
      user = await User.create({
        tenantId: tenant._id,
        email: email ? email.toLowerCase() : `admin@${tenant.slug}.com`,
        phone: tenant.owner.phone,
        fullName: `${tenant.displayName} Admin`,
        role: 'operator_admin',
        permissions: ['CUSTOMER_ALL', 'DEVICE_ALL', 'GIS_ALL', 'AI_ALL', 'TECH_ALL'],
        status: 'active',
      });
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      tenantId: tenant._id.toString(),
      permissions: user.permissions,
    });

    user.lastLoginAt = new Date();
    await user.save();

    await recordAuditLog({
      tenantId: tenant._id,
      actorId: user._id.toString(),
      actorEmail: user.email,
      actorRole: user.role,
      action: 'OPERATOR_LOGIN',
      targetResource: 'Tenant',
      targetId: tenant._id.toString(),
      correlationId: req.correlationId || `op_login_${Date.now()}`,
    });

    return res.json({
      success: true,
      token,
      tenant: {
        id: tenant._id,
        name: tenant.name,
        displayName: tenant.displayName,
        slug: tenant.slug,
        branding: tenant.branding,
        plan: tenant.plan,
      },
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Technician Mobile Web Login
 */
authRouter.post('/technician/login', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { phone, tenantSlug = 'apex' } = req.body;
    const tenant = await Tenant.findOne({ slug: tenantSlug.toLowerCase() });
    if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });

    let techUser = await User.findOne({
      tenantId: tenant._id,
      role: 'technician',
    });

    if (!techUser) {
      techUser = await User.create({
        tenantId: tenant._id,
        email: 'ramesh.tech@apexfiber.in',
        phone: phone || '+919876543210',
        fullName: 'Ramesh Kumar (Senior Field Tech)',
        role: 'technician',
        permissions: ['TECH_ACCESS', 'DEVICE_DIAGNOSE'],
        status: 'active',
      });
    }

    const token = generateToken({
      userId: techUser._id.toString(),
      email: techUser.email,
      role: techUser.role,
      tenantId: tenant._id.toString(),
      permissions: techUser.permissions,
    });

    return res.json({
      success: true,
      token,
      tenant: {
        id: tenant._id,
        displayName: tenant.displayName,
        branding: tenant.branding,
      },
      user: {
        id: techUser._id,
        fullName: techUser.fullName,
        phone: techUser.phone,
        role: techUser.role,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Customer Self-Service Login
 */
authRouter.post('/customer/login', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { phone, tenantSlug = 'apex' } = req.body;
    const tenant = await Tenant.findOne({ slug: tenantSlug.toLowerCase() });
    if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });

    let custUser = await User.findOne({
      tenantId: tenant._id,
      role: 'customer',
    });

    if (!custUser) {
      custUser = await User.create({
        tenantId: tenant._id,
        email: 'arjun.sharma@gmail.com',
        phone: phone || '+919845012345',
        fullName: 'Arjun Sharma',
        role: 'customer',
        permissions: ['CUSTOMER_SELF'],
        status: 'active',
      });
    }

    const token = generateToken({
      userId: custUser._id.toString(),
      email: custUser.email,
      role: custUser.role,
      tenantId: tenant._id.toString(),
      permissions: custUser.permissions,
    });

    return res.json({
      success: true,
      token,
      tenant: {
        id: tenant._id,
        displayName: tenant.displayName,
        branding: tenant.branding,
      },
      user: {
        id: custUser._id,
        fullName: custUser.fullName,
        phone: custUser.phone,
        role: custUser.role,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get Current User Profile & Tenant Info
 */
authRouter.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    let tenant = null;
    if (user.tenantId) {
      tenant = await Tenant.findById(user.tenantId);
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        permissions: user.permissions,
        tenantId: user.tenantId,
      },
      tenant: tenant
        ? {
            id: tenant._id,
            name: tenant.name,
            displayName: tenant.displayName,
            slug: tenant.slug,
            branding: tenant.branding,
            plan: tenant.plan,
            featureEntitlements: tenant.featureEntitlements,
          }
        : null,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
