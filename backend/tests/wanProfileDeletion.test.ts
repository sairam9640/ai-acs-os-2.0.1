import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import request from 'supertest';
import { app } from '../src/index.js';
import { Tenant } from '../src/models/Tenant.js';
import { User } from '../src/models/User.js';
import { Device } from '../src/models/Device.js';
import { DeviceCommand } from '../src/models/DeviceCommand.js';
import { generateToken } from '../src/middleware/auth.js';

describe('WAN Profile Deletion & TR-069 Command Queueing Suite', () => {
  let tenant: any;
  let testDevice: any;
  let operatorUser: any;
  let operatorToken: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    tenant = await Tenant.create({
      name: 'WAN Delete Test ISP',
      slug: 'wandeletetest',
      subdomain: 'wandeletetest.ai-ispos.com',
      operatorKey: 'opk_wan_delete_test',
      owner: { name: 'Admin', email: 'admin@wandelete.com', phone: '9998887776' },
      status: 'active',
    });

    operatorUser = await User.create({
      tenantId: tenant._id,
      email: 'operator@wandelete.com',
      phone: '9998887776',
      fullName: 'Operator WAN Admin',
      role: 'operator_admin',
      permissions: ['CUSTOMER_ALL', 'DEVICE_ALL'],
    });

    operatorToken = generateToken({
      userId: operatorUser._id.toString(),
      email: operatorUser.email,
      role: operatorUser.role,
      tenantId: tenant._id.toString(),
      permissions: operatorUser.permissions,
    });

    // Create a device with Slot 1 (Management) and Slot 13 (Customer Internet PPPoE)
    testDevice = await Device.create({
      tenantId: tenant._id,
      deviceIdStr: 'DEV-WAN-DEL-13',
      serialNumber: 'TEST-ONT-SLOT-13',
      modelName: 'Genexis Platinum-4410',
      status: 'online',
      rawParameters: {
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Name': '1_TR069_R_VID_100',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.X_CT-COM_ServiceList': 'TR069',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_CT-COM_WANEponLinkConfig.VLANIDMark': 100,
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.13.WANPPPConnection.1.Name': '13_INTERNET_R_VID_480',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.13.WANPPPConnection.1.Username': 'cust_slot13@isp.in',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.13.WANPPPConnection.1.ConnectionStatus': 'Connected',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.13.WANPPPConnection.1.ExternalIPAddress': '192.168.22.170',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.13.X_CT-COM_WANEponLinkConfig.VLANIDMark': 480,
      },
      wanProfiles: [
        {
          _id: new Types.ObjectId(),
          name: '1_TR069_R_VID_100',
          serviceType: 'TR069',
          bearerService: 'TR069',
          connectionType: 'IP_Routed',
          vlanId: 100,
          isProtected: true,
          cpeObjectPath: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.',
        },
        {
          _id: new Types.ObjectId(),
          name: '13_INTERNET_R_VID_480',
          serviceType: 'INTERNET',
          bearerService: 'INTERNET',
          connectionType: 'PPPoE',
          vlanId: 480,
          pppoeUsername: 'cust_slot13@isp.in',
          isProtected: false,
          cpeObjectPath: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.13.WANPPPConnection.1.',
        },
      ],
    });
  });

  afterAll(async () => {
    if (tenant) {
      await DeviceCommand.deleteMany({ tenantId: tenant._id });
      await Device.deleteMany({ tenantId: tenant._id });
      await User.deleteMany({ tenantId: tenant._id });
      await Tenant.deleteMany({ _id: tenant._id });
    }
    await mongoose.disconnect();
  });

  it('1. GET /api/v1/operator/devices/:id/wan/profiles should retrieve both profiles with correct slot 13 path', async () => {
    const res = await request(app)
      .get(`/api/v1/operator/devices/${testDevice._id}/wan/profiles`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .set('x-tenant-slug', 'wandeletetest');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profiles.length).toBe(2);

    const slot13Prof = res.body.profiles.find((p: any) => p.name === '13_INTERNET_R_VID_480' || p.vlanId === 480);
    expect(slot13Prof).toBeDefined();
    expect(slot13Prof.cpeObjectPath).toContain('WANConnectionDevice.13.');
    expect(slot13Prof.pppoeUsername).toBe('cust_slot13@isp.in');
  });

  it('2. DELETE on protected TR-069 Management profile should be REJECTED (400)', async () => {
    const res = await request(app)
      .delete(`/api/v1/operator/devices/${testDevice._id}/wan/profiles/1_TR069_R_VID_100`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .set('x-tenant-slug', 'wandeletetest');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Cannot delete protected TR-069');
  });

  it('3. DELETE on Customer Slot 13 WAN Profile by Name should successfully queue DeleteObject and purge DB state', async () => {
    const res = await request(app)
      .delete(`/api/v1/operator/devices/${testDevice._id}/wan/profiles/13_INTERNET_R_VID_480`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .set('x-tenant-slug', 'wandeletetest');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('QUEUED_FOR_DELETE');
    expect(res.body.commandId).toBeDefined();

    // Verify DeviceCommand was created with exact target slot 13 and ObjectName
    const cmd = await DeviceCommand.findById(res.body.commandId);
    expect(cmd).toBeDefined();
    expect(cmd?.action).toBe('DELETE_WAN_CONFIG');
    expect(cmd?.status).toBe('queued');
    expect((cmd?.parameters as any).targetSlot).toBe('13');
    expect((cmd?.parameters as any).targetObjectName).toBe('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.13.WANPPPConnection.1.');

    // Verify DB device rawParameters purged slot 13 keys
    const updatedDevice = await Device.findById(testDevice._id);
    expect(updatedDevice?.rawParameters['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.13.WANPPPConnection.1.Name']).toBeUndefined();
    expect(updatedDevice?.rawParameters['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.13.WANPPPConnection.1.Username']).toBeUndefined();

    // Verify local device wanProfiles removed slot 13
    expect(updatedDevice?.wanProfiles.length).toBe(1);
    expect(updatedDevice?.wanProfiles[0].name).toBe('1_TR069_R_VID_100');
  });

  it('4. Subsequent GET /api/v1/operator/devices/:id/wan/profiles should NOT resurrect the deleted slot 13 profile', async () => {
    const res = await request(app)
      .get(`/api/v1/operator/devices/${testDevice._id}/wan/profiles`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .set('x-tenant-slug', 'wandeletetest');

    expect(res.status).toBe(200);
    expect(res.body.profiles.length).toBe(1);
    expect(res.body.profiles[0].name).toBe('1_TR069_R_VID_100');
  });
});
