import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { Customer } from '../src/models/Customer.js';
import { CustomerPlan } from '../src/models/CustomerPlan.js';
import { Device } from '../src/models/Device.js';
import { DeviceCommand } from '../src/models/DeviceCommand.js';
import { CustomerLead } from '../src/models/CustomerLead.js';
import { WhatsAppChatMessage } from '../src/models/WhatsAppChatMessage.js';
import { WhatsAppBotSession } from '../src/models/WhatsAppBotSession.js';
import { WhatsAppBotService } from '../src/services/whatsAppBotService.js';

describe('AI ACS OS — WhatsApp Customer Self-Service & Lead Capture Bot Tests', () => {
  let testTenant: any;
  let testCustomer: any;
  let testPlan: any;
  let testDevice: any;
  const registeredPhone = '9845011999';
  const unregisteredPhone = '9900112233';

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    testTenant = await Tenant.create({
      name: 'WhatsApp Bot Test Networks',
      displayName: 'FastNet Telecom',
      slug: `wa_bot_${Date.now()}`,
      subdomain: `wa_bot_${Date.now()}.ai-ispos.com`,
      operatorKey: `opk_wa_${Date.now()}`,
      owner: { name: 'Bot Admin', email: `wa_${Date.now()}@test.com`, phone: '9845000111' },
      branding: { supportPhone: '1800-425-9999' },
      isActive: true,
    });

    testPlan = await CustomerPlan.create({
      tenantId: testTenant._id,
      name: 'GigaSpeed 300M Unlimited',
      code: `WA_300M_${Date.now()}`,
      price: 899,
      billingCycleDays: 30,
      downloadSpeedMbps: 300,
      uploadSpeedMbps: 300,
      isActive: true,
    });

    testDevice = await Device.create({
      tenantId: testTenant._id,
      serialNumber: `GNXS-BOT-${Date.now().toString().slice(-4)}`,
      manufacturer: 'Genexis',
      modelName: 'Titanium-2122A',
      macAddress: '3C:90:66:AA:BB:CC',
      status: 'online',
      opticalStatus: 'normal',
      currentRxPowerDbm: -19.2,
      currentTxPowerDbm: 2.1,
      wifi24: {
        ssid: 'FastNet_2.4G',
        password: 'InitialPassword123',
        enabled: true,
        channel: 6,
        channelAuto: true,
        bandwidthMhz: 20,
        securityMode: 'WPA2-PSK',
        txPowerPercent: 100,
      },
      wifi5g: {
        ssid: 'FastNet_5G',
        password: 'InitialPassword123',
        enabled: true,
        channel: 36,
        channelAuto: true,
        bandwidthMhz: 80,
        securityMode: 'WPA2-PSK',
        txPowerPercent: 100,
      },
      connectedClients: [
        { mac: 'F4:D4:88:5A:21:40', hostname: 'MacBook-Pro', ip: '192.168.1.104', interfaceType: '5GHz', signalDbm: -42, connected: true, isBlocked: false, lastSeen: new Date() },
        { mac: '90:2B:D2:7C:E1:92', hostname: 'iPhone-15', ip: '192.168.1.108', interfaceType: '5GHz', signalDbm: -49, connected: true, isBlocked: false, lastSeen: new Date() },
      ],
    });

    testCustomer = await Customer.create({
      tenantId: testTenant._id,
      accountNumber: `ACC-BOT-${Date.now().toString().slice(-4)}`,
      serviceId: `SRV-BOT-${Date.now().toString().slice(-4)}`,
      fullName: 'Vikramaditya Sharma',
      phone: registeredPhone,
      email: 'vikram@fastnet.in',
      assignedDeviceId: testDevice._id,
      servicePlan: {
        name: testPlan.name,
        price: testPlan.price,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
        status: 'active',
        billingStatus: 'paid',
      },
    });

    testDevice.customerId = testCustomer._id;
    await testDevice.save();
  });

  afterAll(async () => {
    if (testTenant) {
      await Tenant.deleteMany({ _id: testTenant._id });
      await Customer.deleteMany({ tenantId: testTenant._id });
      await CustomerPlan.deleteMany({ tenantId: testTenant._id });
      await Device.deleteMany({ tenantId: testTenant._id });
      await DeviceCommand.deleteMany({ tenantId: testTenant._id });
      await CustomerLead.deleteMany({ tenantId: testTenant._id });
      await WhatsAppChatMessage.deleteMany({ tenantId: testTenant._id });
      await WhatsAppBotSession.deleteMany({ tenantId: testTenant._id });
    }
  });

  // =========================================================================
  // 1. UNREGISTERED FLOW: NEW CONNECTION LEAD CAPTURE
  // =========================================================================
  it('1. Unregistered Phone: should trigger multi-step Lead Capture conversation and create CustomerLead', async () => {
    // Step 1: Initial greeting
    const step1 = await WhatsAppBotService.handleInboundMessage({
      tenantId: testTenant._id.toString(),
      fromPhone: unregisteredPhone,
      messageText: 'Hi',
    });
    expect(step1.handled).toBe(true);
    expect(step1.isRegisteredCustomer).toBe(false);
    expect(step1.sessionState).toBe('LEAD_CAPTURE_NAME');
    expect(step1.replyText).toContain('Namaste');
    expect(step1.replyText).toContain('Full Name');

    // Step 2: Customer gives name
    const step2 = await WhatsAppBotService.handleInboundMessage({
      tenantId: testTenant._id.toString(),
      fromPhone: unregisteredPhone,
      messageText: 'Ananya Deshmukh',
    });
    expect(step2.sessionState).toBe('LEAD_CAPTURE_ADDRESS');
    expect(step2.replyText).toContain('Ananya Deshmukh');
    expect(step2.replyText).toContain('Installation Address');

    // Step 3: Customer gives address
    const step3 = await WhatsAppBotService.handleInboundMessage({
      tenantId: testTenant._id.toString(),
      fromPhone: unregisteredPhone,
      messageText: 'Villa 14, Palm Meadows, Whitefield, Bengaluru',
    });
    expect(step3.sessionState).toBe('LEAD_CAPTURE_PINCODE');
    expect(step3.replyText).toContain('Pincode');

    // Step 4: Customer gives 6-digit Pincode
    const step4 = await WhatsAppBotService.handleInboundMessage({
      tenantId: testTenant._id.toString(),
      fromPhone: unregisteredPhone,
      messageText: '560066',
    });
    expect(step4.leadCreated).toBe(true);
    expect(step4.replyText).toContain('Congratulations');
    expect(step4.replyText).toContain('Lead Reference');

    // Verify lead in MongoDB
    const lead = await CustomerLead.findOne({
      tenantId: testTenant._id,
      phone: unregisteredPhone,
    });
    expect(lead).toBeDefined();
    expect(lead?.fullName).toBe('Ananya Deshmukh');
    expect(lead?.pincode).toBe('560066');
    expect(lead?.status).toBe('NEW_LEAD');
  });

  // =========================================================================
  // 2. REGISTERED CUSTOMER SELF-SERVICE MENU
  // =========================================================================
  it('2. Registered Customer: should greet customer with name and render 6 self-service menu options', async () => {
    const res = await WhatsAppBotService.handleInboundMessage({
      tenantId: testTenant._id.toString(),
      fromPhone: registeredPhone,
      messageText: 'Hi',
    });

    expect(res.handled).toBe(true);
    expect(res.isRegisteredCustomer).toBe(true);
    expect(res.sessionState).toBe('MAIN_MENU');
    expect(res.replyText).toContain('Vikramaditya Sharma');
    expect(res.replyText).toContain('1️⃣ *View Wi-Fi Name');
    expect(res.replyText).toContain('6️⃣ *Reboot ONT Terminal');
  });

  it('3. Self-Service Option 1: should return current Wi-Fi configuration and optical signal', async () => {
    const res = await WhatsAppBotService.handleInboundMessage({
      tenantId: testTenant._id.toString(),
      fromPhone: registeredPhone,
      messageText: '1',
    });

    expect(res.handled).toBe(true);
    expect(res.replyText).toContain('FastNet_2.4G');
    expect(res.replyText).toContain('FastNet_5G');
    expect(res.replyText).toContain('InitialPassword123');
    expect(res.replyText).toContain('-19.2 dBm');
  });

  it('4. Self-Service Option 2: should update Wi-Fi Name (SSID) and dispatch TR-069 command to ONT', async () => {
    // Prompt for new SSID
    const prompt = await WhatsAppBotService.handleInboundMessage({
      tenantId: testTenant._id.toString(),
      fromPhone: registeredPhone,
      messageText: '2',
    });
    expect(prompt.sessionState).toBe('AWAITING_NEW_SSID');
    expect(prompt.replyText).toContain('New Wi-Fi Name');

    // Send new SSID
    const updated = await WhatsAppBotService.handleInboundMessage({
      tenantId: testTenant._id.toString(),
      fromPhone: registeredPhone,
      messageText: 'Vikram_Fiber_Ultra',
    });
    expect(updated.sessionState).toBe('MAIN_MENU');
    expect(updated.replyText).toContain('Wi-Fi Name Successfully Updated');
    expect(updated.replyText).toContain('Vikram_Fiber_Ultra');

    // Verify Device & TR-069 Command
    const dev = await Device.findById(testDevice._id);
    expect(dev?.wifi24.ssid).toBe('Vikram_Fiber_Ultra');
    expect(dev?.wifi5g.ssid).toBe('Vikram_Fiber_Ultra_5G');

    const cmd = await DeviceCommand.findOne({
      tenantId: testTenant._id,
      deviceId: testDevice._id,
      action: 'SET_WIFI_CONFIG',
    });
    expect(cmd).toBeDefined();
    expect(cmd?.parameters?.ssid).toBe('Vikram_Fiber_Ultra');
  });

  it('5. Self-Service Option 3: should update Wi-Fi Password and dispatch TR-069 command to ONT', async () => {
    // Prompt for new password
    const prompt = await WhatsAppBotService.handleInboundMessage({
      tenantId: testTenant._id.toString(),
      fromPhone: registeredPhone,
      messageText: '3',
    });
    expect(prompt.sessionState).toBe('AWAITING_NEW_PASSWORD');

    // Send new password (>= 8 chars)
    const updated = await WhatsAppBotService.handleInboundMessage({
      tenantId: testTenant._id.toString(),
      fromPhone: registeredPhone,
      messageText: 'SuperSecret@2026',
    });
    expect(updated.sessionState).toBe('MAIN_MENU');
    expect(updated.replyText).toContain('Wi-Fi Password Successfully Updated');

    const dev = await Device.findById(testDevice._id);
    expect(dev?.wifi24.password).toBe('SuperSecret@2026');
    expect(dev?.wifi5g.password).toBe('SuperSecret@2026');
  });

  it('6. Self-Service Option 4: should list connected devices from TR-069 host table', async () => {
    const res = await WhatsAppBotService.handleInboundMessage({
      tenantId: testTenant._id.toString(),
      fromPhone: registeredPhone,
      messageText: '4',
    });

    expect(res.replyText).toContain('Connected Devices');
    expect(res.replyText).toContain('MacBook-Pro');
    expect(res.replyText).toContain('iPhone-15');
  });

  it('7. Self-Service Option 5: should block/unblock a client device via TR-069 access rule', async () => {
    // Prompt for block
    const prompt = await WhatsAppBotService.handleInboundMessage({
      tenantId: testTenant._id.toString(),
      fromPhone: registeredPhone,
      messageText: '5',
    });
    expect(prompt.sessionState).toBe('AWAITING_BLOCK_DEVICE');

    // Block device #1 (MacBook-Pro)
    const blocked = await WhatsAppBotService.handleInboundMessage({
      tenantId: testTenant._id.toString(),
      fromPhone: registeredPhone,
      messageText: '1',
    });
    expect(blocked.sessionState).toBe('MAIN_MENU');
    expect(blocked.replyText).toContain('Blocked 🚫');
    expect(blocked.replyText).toContain('MacBook-Pro');

    const dev = await Device.findById(testDevice._id);
    expect(dev?.connectedClients[0]?.isBlocked).toBe(true);

    const cmd = await DeviceCommand.findOne({
      tenantId: testTenant._id,
      deviceId: testDevice._id,
      action: 'BLOCK_CLIENT',
    });
    expect(cmd).toBeDefined();
    expect(cmd?.parameters?.macAddress).toBe('F4:D4:88:5A:21:40');
  });

  it('8. Self-Service Option 6: should dispatch TR-069 Remote ONT Reboot command', async () => {
    const res = await WhatsAppBotService.handleInboundMessage({
      tenantId: testTenant._id.toString(),
      fromPhone: registeredPhone,
      messageText: '6',
    });

    expect(res.replyText).toContain('Remote ONT Reboot Command Dispatched');
    expect(res.replyText).toContain(testDevice.serialNumber);

    const rebootCmd = await DeviceCommand.findOne({
      tenantId: testTenant._id,
      deviceId: testDevice._id,
      action: 'REBOOT_DEVICE',
    });
    expect(rebootCmd).toBeDefined();
    expect(rebootCmd?.status).toBe('queued');
  });

  // =========================================================================
  // 3. OPERATOR TWO-WAY CHAT & LEAD CONVERSION
  // =========================================================================
  it('9. Operator Live Chat: should list conversation threads and support direct manual operator reply', async () => {
    const threads = await WhatsAppBotService.getConversations(testTenant._id.toString());
    expect(threads.length).toBeGreaterThanOrEqual(2);

    const regThread = threads.find((t) => t.phone === registeredPhone);
    expect(regThread).toBeDefined();
    expect(regThread?.isCustomer).toBe(true);
    expect(regThread?.senderName).toBe('Vikramaditya Sharma');

    // Operator sends reply
    const reply = await WhatsAppBotService.sendOperatorReply(
      testTenant._id.toString(),
      registeredPhone,
      'Hello Vikram! Our senior NOC engineer has reviewed your fiber signal.',
      { id: 'op_1', email: 'noc@fastnet.in', name: 'NOC Lead' }
    );
    expect(reply._id).toBeDefined();
    expect(reply.senderType).toBe('OPERATOR');

    const history = await WhatsAppBotService.getChatHistory(testTenant._id.toString(), registeredPhone);
    const lastMsg = history.messages[history.messages.length - 1];
    expect(lastMsg.messageText).toContain('senior NOC engineer');
  });

  it('10. Lead Conversion: should convert captured lead into an active Customer Account', async () => {
    const lead = await CustomerLead.findOne({
      tenantId: testTenant._id,
      phone: unregisteredPhone,
    });
    expect(lead).toBeDefined();

    const newCustomer = await WhatsAppBotService.convertLeadToCustomer(
      testTenant._id.toString(),
      lead!._id.toString(),
      {
        planName: 'GigaSpeed 300M Unlimited',
        planPrice: 899,
        actor: { id: 'op_1', email: 'sales@fastnet.in' },
      }
    );

    expect(newCustomer._id).toBeDefined();
    expect(newCustomer.fullName).toBe('Ananya Deshmukh');
    expect(newCustomer.phone).toBe(unregisteredPhone);

    const updatedLead = await CustomerLead.findById(lead!._id);
    expect(updatedLead?.status).toBe('CONVERTED');
    expect(updatedLead?.convertedCustomerId?.toString()).toBe(newCustomer._id.toString());
  });
});
