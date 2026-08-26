import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/index.js';
import { User } from '../src/models/User.js';
import { Tenant } from '../src/models/Tenant.js';
import { SystemSetting } from '../src/models/SystemSetting.js';
import { EmailService } from '../src/services/emailService.js';
import { WhatsAppService } from '../src/services/whatsAppService.js';

describe('AI ISP OS — Gmail SMTP Email OTP & WhatsApp Operator Auth Tests', () => {
  let superAdminToken: string;
  let superAdminUser: any;
  let tenant: any;
  let operatorUser: any;

  beforeAll(async () => {
    // Clean up test records
    await Tenant.deleteMany({ slug: 'apex-auth-test' });
    await User.deleteMany({ email: { $in: ['superadmin.test@ai-ispos.com', 'operator.auth@apex-test.in', 'crud.user@apex.in', 'updated.user@apex.in'] } });

    // Setup test tenant
    tenant = await Tenant.create({
      name: 'Apex Fiber Tests',
      displayName: 'Apex Fiber',
      slug: 'apex-auth-test',
      subdomain: 'apex-auth-test.ciniplay.in',
      operatorKey: 'opk_apex_test',
      status: 'active',
      owner: { name: 'Vikram NOC', email: 'admin@apex-test.in', phone: '+919845000001' },
    });

    // Setup Super Admin User
    superAdminUser = await User.create({
      email: 'superadmin.test@ai-ispos.com',
      phone: '+919999999999',
      fullName: 'Global Super Admin',
      role: 'super_admin',
      permissions: ['SUPERADMIN_ALL'],
      status: 'active',
    });

    // Setup Registered Operator User
    operatorUser = await User.create({
      tenantId: tenant._id,
      email: 'operator.auth@apex-test.in',
      phone: '+919845000001',
      fullName: 'Vikram Malhotra',
      role: 'operator_admin',
      permissions: ['CUSTOMER_ALL', 'DEVICE_ALL'],
      status: 'active',
    });
  });

  afterAll(async () => {
    await Tenant.deleteMany({ slug: 'apex-auth-test' });
    await User.deleteMany({ email: { $in: ['superadmin.test@ai-ispos.com', 'operator.auth@apex-test.in', 'crud.user@apex.in', 'updated.user@apex.in'] } });
    await mongoose.disconnect();
  });

  describe('1. Super Admin Gmail SMTP Email OTP Authentication', () => {
    it('Should request dynamic OTP for Super Admin and generate OTP in DB', async () => {
      const res = await request(app)
        .post('/api/v1/auth/superadmin/request-otp')
        .send({ email: 'superadmin.test@ai-ispos.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.destinationMasked).toBeDefined();

      // Verify OTP is generated in DB
      const updatedUser = await User.findById(superAdminUser._id);
      expect(updatedUser?.otpCode).toBeDefined();
      expect(updatedUser?.otpCode?.length).toBe(6);
    });

    it('Should reject invalid OTP for Super Admin', async () => {
      const res = await request(app)
        .post('/api/v1/auth/superadmin/verify-otp')
        .send({ email: 'superadmin.test@ai-ispos.com', otp: '000000' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Should successfully verify dynamic OTP and issue JWT for Super Admin', async () => {
      const dbUser = await User.findById(superAdminUser._id);
      const validOtp = dbUser!.otpCode!;

      const res = await request(app)
        .post('/api/v1/auth/superadmin/verify-otp')
        .send({ email: 'superadmin.test@ai-ispos.com', otp: validOtp });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('super_admin');

      superAdminToken = res.body.token;
    });
  });

  describe('2. Registered Operator WhatsApp OTP Authentication', () => {
    it('Should REJECT WhatsApp OTP request for unregistered phone number (404)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/operator/request-otp')
        .send({ phone: '+919111111111', slug: 'apex-auth-test' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not registered');
    });

    it('Should ACCEPT WhatsApp OTP request for registered operator and send OTP', async () => {
      const res = await request(app)
        .post('/api/v1/auth/operator/request-otp')
        .send({ phone: '+919845000001', slug: 'apex-auth-test' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.operatorName).toBe('Vikram Malhotra');
      expect(res.body.destinationMasked).toBeDefined();

      const dbOp = await User.findById(operatorUser._id);
      expect(dbOp?.otpCode).toBeDefined();
      expect(dbOp?.otpCode?.length).toBe(6);
    });

    it('Should ACCEPT WhatsApp OTP request without slug (auto-resolves tenant from phone)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/operator/request-otp')
        .send({ phone: '+919845000001' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.operatorName).toBe('Vikram Malhotra');
      expect(res.body.tenantSlug).toBe('apex-auth-test');
    });

    it('Should REJECT wrong WhatsApp OTP code (401)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/operator/verify-otp')
        .send({ phone: '+919845000001', otp: '999999' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid WhatsApp OTP');
    });

    it('Should verify dynamic WhatsApp OTP without slug and log into Operator Dashboard', async () => {
      const dbOp = await User.findById(operatorUser._id);
      const validOtp = dbOp!.otpCode!;

      const res = await request(app)
        .post('/api/v1/auth/operator/verify-otp')
        .send({ phone: '+919845000001', otp: validOtp });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.tenant.slug).toBe('apex-auth-test');
      expect(res.body.user.role).toBe('operator_admin');
    });
  });

  describe('3. Super Admin Settings: Gmail SMTP & WhatsApp Web Management', () => {
    it('Should save Google Email and App Password in Super Admin Settings', async () => {
      const res = await request(app)
        .post('/api/v1/superadmin/settings/smtp')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          user: 'mycompany.admin@gmail.com',
          pass: 'abcd efgh ijkl mnop',
          fromName: 'Zenith Security Gate',
          host: 'smtp.gmail.com',
          port: 465,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.smtp.user).toBe('mycompany.admin@gmail.com');
      expect(res.body.smtp.isConfigured).toBe(true);
    });

    it('Should retrieve masked settings via GET /api/v1/superadmin/settings', async () => {
      const res = await request(app)
        .get('/api/v1/superadmin/settings')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.settings.smtp.user).toBe('mycompany.admin@gmail.com');
      expect(res.body.settings.smtp.pass).toBe('••••••••••••••••');
      expect(res.body.settings.whatsapp).toBeDefined();
    });

    it('Should generate WhatsApp pairing QR code via POST /api/v1/superadmin/settings/whatsapp/generate-qr', async () => {
      const res = await request(app)
        .post('/api/v1/superadmin/settings/whatsapp/generate-qr')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.qrDataUrl).toContain('data:image/png;base64');
      expect(res.body.status).toBe('SCAN_QR_REQUIRED');
    });

    it('Should confirm WhatsApp pairing and transition status to CONNECTED', async () => {
      const res = await request(app)
        .post('/api/v1/superadmin/settings/whatsapp/confirm-scan')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ phone: '+919988776655', deviceInfo: 'WhatsApp Business 2.24' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.whatsapp.status).toBe('CONNECTED');
      expect(res.body.whatsapp.connectedPhone).toBe('+919988776655');
    });
  });

  describe('4. Global Users & Access Control CRUD', () => {
    let createdUserId: string;

    it('Should create a new operator user via POST /api/v1/superadmin/users', async () => {
      const res = await request(app)
        .post('/api/v1/superadmin/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          fullName: 'Ananya NOC Engineer',
          email: 'ananya.noc@apex-test.in',
          phone: '+919845099999',
          role: 'noc_operator',
          tenantId: tenant._id.toString(),
          status: 'active',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.fullName).toBe('Ananya NOC Engineer');
      expect(res.body.user.phone).toBe('+919845099999');

      createdUserId = res.body.user._id;
    });

    it('Should filter and list users via GET /api/v1/superadmin/users', async () => {
      const res = await request(app)
        .get('/api/v1/superadmin/users?role=noc_operator')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.users.some((u: any) => u._id === createdUserId)).toBe(true);
    });

    it('Should edit/update user details via PUT /api/v1/superadmin/users/:id', async () => {
      const res = await request(app)
        .put(`/api/v1/superadmin/users/${createdUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          fullName: 'Ananya Sharma',
          phone: '+919845088888',
          status: 'active',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.fullName).toBe('Ananya Sharma');
      expect(res.body.user.phone).toBe('+919845088888');
    });

    it('Should delete user via DELETE /api/v1/superadmin/users/:id', async () => {
      const res = await request(app)
        .delete(`/api/v1/superadmin/users/${createdUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await User.findById(createdUserId);
      expect(check).toBeNull();
    });
  });
});
