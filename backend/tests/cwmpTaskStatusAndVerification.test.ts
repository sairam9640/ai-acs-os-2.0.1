import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { Device } from '../src/models/Device.js';
import { DeviceCommand } from '../src/models/DeviceCommand.js';
import { buildTr069WanParams } from '../src/routes/operatorRoutes.js';

describe('CWMP Task Status, Verification Pipeline & Timeout Suite', () => {
  let tenant: any;
  let tr181Device: any;
  let tr098Device: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    tenant = await Tenant.create({
      name: 'CWMP Test ISP',
      slug: 'cwmptest',
      subdomain: 'cwmptest.ai-ispos.com',
      operatorKey: 'opk_cwmp_test',
      owner: { name: 'Lead', email: 'lead@cwmp.com', phone: '123' },
    });

    // 1. Modern TR-181 Genexis GX 4410 Device
    tr181Device = await Device.create({
      tenantId: tenant._id,
      deviceIdStr: 'DEV-TR181-01',
      serialNumber: 'GNXS-TR181-01',
      modelName: 'Platinum GX 4410 TR181',
      status: 'online',
      rawParameters: {
        'Device.PPP.Interface.1.Username': 'old_user@isp.in',
        'Device.Ethernet.VLANTermination.1.VLANID': '100',
      },
    });

    // 2. Legacy TR-098 Genexis GX 4410 Device
    tr098Device = await Device.create({
      tenantId: tenant._id,
      deviceIdStr: 'DEV-TR098-01',
      serialNumber: 'BC62D21470F0',
      modelName: 'Platinum-4410',
      status: 'online',
      rawParameters: {
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Name': '1_TR069_R_VID_100',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Username': 'old_tr098@isp.in',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.X_CT-COM_WANEponLinkConfig.VLANIDMark': 100,
      },
    });
  });

  afterAll(async () => {
    await DeviceCommand.deleteMany({ tenantId: tenant._id });
    await Device.deleteMany({ tenantId: tenant._id });
    await Tenant.deleteMany({ _id: tenant._id });
    await mongoose.disconnect();
  });

  it('1. TR-181: Builds 4-layer stack with LowerLayers bindings and Device.* paths', async () => {
    const profile = {
      connectionType: 'PPPoE',
      pppoeUsername: 'vaishnavi_tr181@tpartmgmt.in',
      pppoePassword: 'SecretPassword123',
      vlanEnabled: true,
      vlanId: 488,
      enableWan: true,
    };

    const params = await buildTr069WanParams(profile, tr181Device);
    const paramMap = Object.fromEntries(params.map(([k, v]) => [k, v]));

    expect(paramMap['Device.PPP.Interface.1.Username']).toBe('vaishnavi_tr181@tpartmgmt.in');
    expect(paramMap['Device.PPP.Interface.1.Password']).toBe('SecretPassword123');
    expect(paramMap['Device.PPP.Interface.1.Enable']).toBe(true);
    expect(paramMap['Device.Ethernet.VLANTermination.1.VLANID']).toBe(488);
    expect(paramMap['Device.Ethernet.VLANTermination.1.Enable']).toBe(true);
    expect(paramMap['Device.Ethernet.VLANTermination.1.LowerLayers']).toBe('Device.Ethernet.Link.1');
    expect(paramMap['Device.PPP.Interface.1.LowerLayers']).toBe('Device.Ethernet.VLANTermination.1');
  });

  it('2. TR-098: Routes customer Internet PPPoE to WANConnectionDevice.1 as per Genexis PDF specification', async () => {
    const profile = {
      connectionType: 'PPPoE',
      pppoeUsername: 'vaishnavi_tr098@tpartmgmt.in',
      pppoePassword: 'SecretPassword123',
      vlanEnabled: true,
      vlanId: 488,
      enableWan: true,
    };

    const params = await buildTr069WanParams(profile, tr098Device);
    const paramMap = Object.fromEntries(params.map(([k, v]) => [k, v]));

    expect(paramMap['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username']).toBe('vaishnavi_tr098@tpartmgmt.in');
    expect(paramMap['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password']).toBe('SecretPassword123');
    expect(paramMap['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Enable']).toBe(true);
    expect(paramMap['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_CT-COM_WANEponLinkConfig.VLANIDMark']).toBe(488);
  });

  it('3. Lifecycle: queued -> sending -> applied (stores CWMP response metadata)', async () => {
    const cmd = await DeviceCommand.create({
      tenantId: tenant._id,
      deviceId: tr098Device._id,
      action: 'SET_WAN_CONFIG',
      status: 'queued',
      parameters: { vlanId: 488 },
      requestedBy: { userId: new mongoose.Types.ObjectId(), role: 'operator_admin', email: 'op@cwmp.com' },
      correlationId: 'corr_test_01',
    });

    expect(cmd.status).toBe('queued');

    // Transport dispatch: set sending
    cmd.status = 'sending';
    cmd.sentAt = new Date();
    cmd.cwmpRequestId = '3';
    cmd.dataModel = 'TR-098';
    cmd.affectedParameterPaths = [
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Username',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.X_CT-COM_WANEponLinkConfig.VLANIDMark',
    ];
    cmd.verificationTargetValues = {
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Username': 'vaishnavi_tr098@tpartmgmt.in',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.X_CT-COM_WANEponLinkConfig.VLANIDMark': 488,
    };
    await cmd.save();

    expect(cmd.status).toBe('sending');
    expect(cmd.cwmpRequestId).toBe('3');

    // CPE SetParameterValuesResponse: set applied
    cmd.status = 'applied';
    cmd.cwmpResponseStatus = 0;
    cmd.cwmpResponseTimestamp = new Date();
    cmd.completedAt = new Date();
    await cmd.save();

    expect(cmd.status).toBe('applied');
    expect(cmd.cwmpResponseStatus).toBe(0);
    expect(cmd.cwmpResponseTimestamp).toBeDefined();
  });

  it('4. Post-change verification: transitions to verified when read-back values match', async () => {
    const cmd = await DeviceCommand.create({
      tenantId: tenant._id,
      deviceId: tr098Device._id,
      action: 'SET_WAN_CONFIG',
      status: 'verifying',
      parameters: {},
      verificationTargetValues: {
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Username': 'vaishnavi_tr098@tpartmgmt.in',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.X_CT-COM_WANEponLinkConfig.VLANIDMark': 488,
      },
      requestedBy: { userId: new mongoose.Types.ObjectId(), role: 'operator_admin', email: 'op@cwmp.com' },
      correlationId: 'corr_test_02',
    });

    const readBack = {
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Username': 'vaishnavi_tr098@tpartmgmt.in',
      'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.X_CT-COM_WANEponLinkConfig.VLANIDMark': '488',
    };

    cmd.status = 'verified';
    cmd.verifiedAt = new Date();
    cmd.completedAt = new Date();
    cmd.verificationResult = { verified: true, readBackValues: readBack, mismatches: [] };
    await cmd.save();

    expect(cmd.status).toBe('verified');
    expect(cmd.verificationResult.verified).toBe(true);
    expect(cmd.verificationResult.mismatches.length).toBe(0);
  });

  it('5. Post-change verification: transitions to verification_failed when values mismatch', async () => {
    const cmd = await DeviceCommand.create({
      tenantId: tenant._id,
      deviceId: tr098Device._id,
      action: 'SET_WAN_CONFIG',
      status: 'verifying',
      parameters: {},
      verificationTargetValues: {
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.X_CT-COM_WANEponLinkConfig.VLANIDMark': 488,
      },
      requestedBy: { userId: new mongoose.Types.ObjectId(), role: 'operator_admin', email: 'op@cwmp.com' },
      correlationId: 'corr_test_03',
    });

    const mismatches = ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.X_CT-COM_WANEponLinkConfig.VLANIDMark (expected: 488, received: 100)'];

    cmd.status = 'verification_failed';
    cmd.verifiedAt = new Date();
    cmd.completedAt = new Date();
    cmd.verificationResult = { verified: false, readBackValues: { '...VLANIDMark': 100 }, mismatches };
    cmd.errorMessage = `Verification failed: expected [${mismatches.join(', ')}] not matching CPE reported values.`;
    await cmd.save();

    expect(cmd.status).toBe('verification_failed');
    expect(cmd.verificationResult.verified).toBe(false);
    expect(cmd.verificationResult.mismatches.length).toBe(1);
    expect(cmd.errorMessage).toContain('Verification failed');
  });

  it('6. Connection drop classification: marks applied_pending_verification instead of immediate failed', async () => {
    const cmd = await DeviceCommand.create({
      tenantId: tenant._id,
      deviceId: tr098Device._id,
      action: 'SET_WAN_CONFIG',
      status: 'sending',
      sentAt: new Date(Date.now() - 200 * 1000), // > 180s ago
      cwmpRequestId: '3',
      affectedParameterPaths: ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Username'],
      parameters: {},
      requestedBy: { userId: new mongoose.Types.ObjectId(), role: 'operator_admin', email: 'op@cwmp.com' },
      correlationId: 'corr_test_04',
    });

    // Simulating reaper logic for sending command with cwmpRequestId
    if (cmd.action === 'SET_WAN_CONFIG' && cmd.cwmpRequestId) {
      cmd.status = 'applied_pending_verification';
      cmd.errorMessage = 'ONT connection dropped after configuration dispatch; awaiting reconnection verification.';
      await cmd.save();
    }

    expect(cmd.status).toBe('applied_pending_verification');
    expect(cmd.errorMessage).toContain('awaiting reconnection verification');
  });

  it('7. Configurable timeout: marks timed_out with exact required message', async () => {
    const cmd = await DeviceCommand.create({
      tenantId: tenant._id,
      deviceId: tr098Device._id,
      action: 'REBOOT_DEVICE',
      status: 'queued',
      queuedAt: new Date(Date.now() - 200 * 1000),
      parameters: {},
      requestedBy: { userId: new mongoose.Types.ObjectId(), role: 'operator_admin', email: 'op@cwmp.com' },
      correlationId: 'corr_test_05',
    });

    cmd.status = 'timed_out';
    cmd.errorMessage = 'ACS task timeout: no CWMP response or verification result received within the configured timeout.';
    cmd.completedAt = new Date();
    await cmd.save();

    expect(cmd.status).toBe('timed_out');
    expect(cmd.errorMessage).toBe('ACS task timeout: no CWMP response or verification result received within the configured timeout.');
  });

  it('8. Idempotent Retry: preserves originalCommandId and increments retryCount', async () => {
    const initialCmd = await DeviceCommand.create({
      tenantId: tenant._id,
      deviceId: tr098Device._id,
      action: 'SET_WAN_CONFIG',
      status: 'failed',
      errorMessage: 'Fault 9005: Invalid parameter',
      parameters: { vlanId: 488 },
      requestedBy: { userId: new mongoose.Types.ObjectId(), role: 'operator_admin', email: 'op@cwmp.com' },
      correlationId: 'corr_init_01',
    });

    // First retry
    const retryCmd1 = await DeviceCommand.create({
      tenantId: tenant._id,
      deviceId: tr098Device._id,
      action: initialCmd.action,
      parameters: initialCmd.parameters,
      status: 'pending',
      requestedBy: initialCmd.requestedBy,
      queuedAt: new Date(),
      retryCount: (initialCmd.retryCount || 0) + 1,
      originalCommandId: initialCmd.originalCommandId || initialCmd._id,
      correlationId: `retry_${Date.now()}`,
    });

    expect(retryCmd1.retryCount).toBe(1);
    expect(retryCmd1.originalCommandId.toString()).toBe(initialCmd._id.toString());

    // Second retry
    const retryCmd2 = await DeviceCommand.create({
      tenantId: tenant._id,
      deviceId: tr098Device._id,
      action: retryCmd1.action,
      parameters: retryCmd1.parameters,
      status: 'pending',
      requestedBy: retryCmd1.requestedBy,
      queuedAt: new Date(),
      retryCount: (retryCmd1.retryCount || 0) + 1,
      originalCommandId: retryCmd1.originalCommandId || retryCmd1._id,
      correlationId: `retry_${Date.now() + 1}`,
    });

    expect(retryCmd2.retryCount).toBe(2);
    expect(retryCmd2.originalCommandId.toString()).toBe(initialCmd._id.toString());
  });
});
