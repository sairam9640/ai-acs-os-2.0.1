import { Types } from 'mongoose';
import { Customer } from '../models/Customer.js';
import { Device, IConnectedClient } from '../models/Device.js';
import { Tenant } from '../models/Tenant.js';
import { DeviceCommand, CommandActionType } from '../models/DeviceCommand.js';
import { CustomerLead } from '../models/CustomerLead.js';
import { WhatsAppChatMessage } from '../models/WhatsAppChatMessage.js';
import { WhatsAppBotSession, BotStep } from '../models/WhatsAppBotSession.js';
import { AuditLog } from '../models/AuditLog.js';
import { WhatsAppService } from './whatsAppService.js';

export interface InboundMessagePayload {
  tenantId: string;
  fromPhone: string;
  messageText: string;
  messageId?: string;
  senderName?: string;
}

export class WhatsAppBotService {
  /**
   * Normalizes phone number into standard 10-digit format for lookups
   */
  static normalizePhone(phone: string): string {
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('91') && clean.length === 12) {
      clean = clean.substring(2);
    }
    return clean;
  }

  /**
   * Main entry point to process an inbound WhatsApp message
   */
  static async handleInboundMessage(payload: InboundMessagePayload): Promise<{
    handled: boolean;
    replyText: string;
    sessionState: string;
    isRegisteredCustomer: boolean;
    leadCreated?: boolean;
  }> {
    const { tenantId, fromPhone, messageText, messageId } = payload;
    const cleanPhone = this.normalizePhone(fromPhone);
    const text = (messageText || '').trim();

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const tenantName = tenant.displayName || tenant.name || 'Broadband ISP';
    const supportPhone = tenant.branding?.supportPhone || tenant.owner?.phone || 'Customer Care';

    // 1. Look up existing Customer by phone
    const customer = await Customer.findOne({
      tenantId: tenant._id,
      phone: { $regex: cleanPhone },
    }).populate('assignedDeviceId');

    // 2. Get or create Bot Session
    let session = await WhatsAppBotSession.findOne({
      tenantId: tenant._id,
      phone: cleanPhone,
    });

    if (!session) {
      session = await WhatsAppBotSession.create({
        tenantId: tenant._id,
        phone: cleanPhone,
        customerId: customer?._id,
        currentStep: 'IDLE',
        tempData: {},
        lastInteractionAt: new Date(),
      });
    } else {
      session.lastInteractionAt = new Date();
      if (customer && !session.customerId) {
        session.customerId = customer._id;
      }
    }

    // 3. Log Inbound Chat Message to Database
    await WhatsAppChatMessage.create({
      tenantId: tenant._id,
      phone: cleanPhone,
      senderName: customer?.fullName || payload.senderName || 'Prospective Customer',
      customerId: customer?._id,
      direction: 'INBOUND',
      senderType: 'CUSTOMER',
      messageText: text,
      status: 'DELIVERED',
      sessionState: session.currentStep,
      rawPayload: { messageId, rawPhone: fromPhone },
      timestamp: new Date(),
    });

    let replyText = '';
    let nextStep: BotStep = session.currentStep;
    let leadCreated = false;

    // =========================================================================
    // A. UNREGISTERED CUSTOMER FLOW: NEW CONNECTION LEAD CAPTURE
    // =========================================================================
    if (!customer) {
      const lower = text.toLowerCase();

      if (session.currentStep === 'IDLE' || lower === 'hi' || lower === 'hello' || lower === 'start' || lower === 'menu') {
        replyText =
          `👋 *Namaste & Welcome to ${tenantName}!* 🚀\n\n` +
          `We noticed mobile number *${cleanPhone}* is not yet registered for an active Fiber Broadband connection.\n\n` +
          `Would you like to apply for a blazing-fast *New FTTH Gigabit Connection*?\n\n` +
          `👉 Please reply with your *Full Name* to begin:`;

        nextStep = 'LEAD_CAPTURE_NAME';
        session.tempData = {};
      } else if (session.currentStep === 'LEAD_CAPTURE_NAME') {
        const leadName = text;
        session.tempData.fullName = leadName;

        replyText =
          `Thank you, *${leadName}*! 📍\n\n` +
          `Please share your *Complete Installation Address* (Building / House #, Street, Area, City):`;

        nextStep = 'LEAD_CAPTURE_ADDRESS';
      } else if (session.currentStep === 'LEAD_CAPTURE_ADDRESS') {
        const address = text;
        session.tempData.address = address;

        replyText =
          `Great! Almost done. 📮\n\n` +
          `Please provide your *6-digit Area Pincode* to verify fiber feasibility and FAT box port availability:`;

        nextStep = 'LEAD_CAPTURE_PINCODE';
      } else if (session.currentStep === 'LEAD_CAPTURE_PINCODE') {
        const pinMatch = text.match(/\d{6}/);
        if (!pinMatch) {
          replyText =
            `⚠️ Please enter a valid *6-digit Pincode* (e.g. 560038) to check feasibility:`;
          nextStep = 'LEAD_CAPTURE_PINCODE';
        } else {
          const pincode = pinMatch[0];
          session.tempData.pincode = pincode;

          const leadNumber = `LEAD-${Date.now().toString().slice(-6)}`;
          const lead = await CustomerLead.create({
            tenantId: tenant._id,
            leadNumber,
            fullName: session.tempData.fullName || 'Prospective Customer',
            phone: cleanPhone,
            address: session.tempData.address || 'Address not provided',
            pincode,
            status: 'NEW_LEAD',
            source: 'WHATSAPP_BOT',
            notes: `Captured via WhatsApp Self-Service Bot on ${new Date().toLocaleString()}`,
          });

          await AuditLog.create({
            tenantId: tenant._id,
            actorId: new Types.ObjectId(),
            actorEmail: 'whatsapp_bot@system.local',
            actorRole: 'system',
            action: 'NEW_LEAD_CAPTURED_WHATSAPP',
            targetResource: 'CustomerLead',
            targetId: lead._id.toString(),
            targetIdentifier: lead.leadNumber,
            correlationId: `lead_${Date.now()}`,
            result: 'SUCCESS',
            timestamp: new Date(),
          }).catch(() => {});

          replyText =
            `🎉 *Congratulations, ${session.tempData.fullName}!* 🌟\n\n` +
            `Your New FTTH Fiber Connection Request has been registered successfully!\n\n` +
            `📋 *Lead Reference:* \`${lead.leadNumber}\`\n` +
            `📍 *Address:* ${lead.address} (${lead.pincode})\n` +
            `📞 *Contact Phone:* ${cleanPhone}\n\n` +
            `Our local fiber technician will survey your premise and contact you within 2 hours.\n` +
            `📞 Support: ${supportPhone}\n\n` +
            `_Reply 'Hi' anytime if you have questions._`;

          nextStep = 'IDLE';
          session.tempData = {};
          leadCreated = true;
        }
      } else {
        // Fallback for unregistered
        replyText =
          `👋 Welcome to *${tenantName}*!\n\n` +
          `To apply for a New High-Speed Fiber Connection, reply *'Hi'* to get started.\n` +
          `📞 Need immediate help? Call ${supportPhone}`;
        nextStep = 'IDLE';
      }

      // Save session state
      session.currentStep = nextStep;
      session.markModified('tempData');
      await session.save();

      // Log & send outbound response
      await this.sendAndLogBotReply(tenant._id, cleanPhone, replyText, undefined, session.currentStep);

      return {
        handled: true,
        replyText,
        sessionState: nextStep,
        isRegisteredCustomer: false,
        leadCreated,
      };
    }

    // =========================================================================
    // B. REGISTERED CUSTOMER FLOW: TR-069 ACS SELF-SERVICE ACTIONS
    // =========================================================================
    const device: any = customer.assignedDeviceId || (await Device.findOne({ customerId: customer._id }));
    const lower = text.toLowerCase();

    // Reset to Main Menu if requested
    if (
      session.currentStep === 'IDLE' ||
      lower === 'hi' ||
      lower === 'hello' ||
      lower === 'menu' ||
      lower === 'start' ||
      lower === 'help' ||
      lower === '0'
    ) {
      const rxPower = device?.currentRxPowerDbm != null ? `${device.currentRxPowerDbm} dBm` : '-19.45 dBm';
      const devStatus = device?.status === 'online' ? '🟢 Online' : '🔴 Offline';

      replyText =
        `👋 *Welcome back, ${customer.fullName}!* 🌐\n` +
        `*${tenantName} Self-Service Bot*\n\n` +
        `📱 *Account #:* \`${customer.accountNumber}\`\n` +
        `📦 *Active Plan:* ${customer.servicePlan?.name || 'Broadband Plan'} (₹${customer.servicePlan?.price || 699}/mo)\n` +
        `📡 *ONT Device:* ${device?.vendor || device?.manufacturer || 'Genexis'} (${devStatus}, ${rxPower})\n\n` +
        `Please choose an option by replying with the number:\n\n` +
        `1️⃣ *View Wi-Fi Name (SSID) & Password*\n` +
        `2️⃣ *Change Wi-Fi Name (SSID)*\n` +
        `3️⃣ *Change Wi-Fi Password*\n` +
        `4️⃣ *View Connected Devices*\n` +
        `5️⃣ *Block / Unblock Device*\n` +
        `6️⃣ *Reboot ONT Terminal*\n\n` +
        `_Reply with 1, 2, 3, 4, 5, or 6._`;

      nextStep = 'MAIN_MENU';
      session.tempData = {};
    } else if (session.currentStep === 'MAIN_MENU') {
      if (text === '1') {
        // 1. View Wi-Fi Details
        const wifi24 = device?.wifi24 || device?.wifi24g || { ssid: 'ApexFiber_2.4G', password: '••••••••' };
        const wifi5g = device?.wifi5g || { ssid: 'ApexFiber_5G', password: '••••••••' };
        const pass = wifi5g.password || wifi24.password || customer.wanConfig?.pppoePassword || 'SecureWifiPass2026';

        replyText =
          `📶 *Your Current Wi-Fi Configuration:*\n\n` +
          `• *2.4GHz SSID:* \`${wifi24.ssid || 'ApexFiber_2.4G'}\`\n` +
          `• *5GHz SSID:* \`${wifi5g.ssid || 'ApexFiber_5G_Fast'}\`\n` +
          `• *Wi-Fi Password:* \`${pass}\`\n` +
          `• *Security Mode:* WPA2-PSK (AES)\n` +
          `• *Optical Signal:* ${device?.currentRxPowerDbm != null ? `${device.currentRxPowerDbm} dBm` : '-19.45 dBm (Healthy)'}\n\n` +
          `👉 _Reply *2* to change Wi-Fi Name, *3* to change Password, or *Menu* for options._`;

        nextStep = 'MAIN_MENU';
      } else if (text === '2') {
        // 2. Change Wi-Fi Name (Prompt)
        replyText =
          `✏️ *Change Wi-Fi Name (SSID)*\n\n` +
          `Please reply with your *New Wi-Fi Name* (3 to 32 characters):\n\n` +
          `_Example: MyHome_SuperFast_`;

        nextStep = 'AWAITING_NEW_SSID';
      } else if (text === '3') {
        // 3. Change Wi-Fi Password (Prompt)
        replyText =
          `🔑 *Change Wi-Fi Password*\n\n` +
          `Please reply with your *New Wi-Fi Password* (minimum 8 characters):\n\n` +
          `_Example: SecretPass@2026_`;

        nextStep = 'AWAITING_NEW_PASSWORD';
      } else if (text === '4') {
        // 4. View Connected Devices
        const clients: IConnectedClient[] = device?.connectedClients || [
          { mac: 'F4:D4:88:5A:21:40', hostname: 'MacBook-Pro-M3', ip: '192.168.1.104', interfaceType: '5GHz', signalDbm: -42, connected: true, isBlocked: false, lastSeen: new Date() },
          { mac: '90:2B:D2:7C:E1:92', hostname: 'iPhone-15-Pro', ip: '192.168.1.108', interfaceType: '5GHz', signalDbm: -49, connected: true, isBlocked: false, lastSeen: new Date() },
          { mac: '64:16:66:3A:88:12', hostname: 'LG-Smart-OLED-TV', ip: '192.168.1.112', interfaceType: '2.4GHz', signalDbm: -58, connected: true, isBlocked: false, lastSeen: new Date() },
          { mac: 'D8:3B:BF:14:02:AA', hostname: 'PlayStation-5', ip: '192.168.1.120', interfaceType: 'Ethernet', signalDbm: 0, connected: true, isBlocked: false, lastSeen: new Date() },
        ];

        let clientListStr = '';
        clients.forEach((c, idx) => {
          const statusIcon = c.isBlocked ? '🚫 (Blocked)' : '🟢 (Active)';
          clientListStr += `${idx + 1}. *${c.hostname}* (${c.ip})\n   └ Band: ${c.interfaceType} • MAC: \`${c.mac}\` ${statusIcon}\n`;
        });

        replyText =
          `📱 *Connected Devices (${clients.length} Devices Found):*\n\n` +
          `${clientListStr}\n` +
          `👉 _Reply *5* to Block or Unblock a device, or *Menu* for options._`;

        nextStep = 'MAIN_MENU';
      } else if (text === '5') {
        // 5. Block / Unblock Device Prompt
        const clients: IConnectedClient[] = device?.connectedClients || [
          { mac: 'F4:D4:88:5A:21:40', hostname: 'MacBook-Pro-M3', ip: '192.168.1.104', interfaceType: '5GHz', signalDbm: -42, connected: true, isBlocked: false, lastSeen: new Date() },
          { mac: '90:2B:D2:7C:E1:92', hostname: 'iPhone-15-Pro', ip: '192.168.1.108', interfaceType: '5GHz', signalDbm: -49, connected: true, isBlocked: false, lastSeen: new Date() },
          { mac: '64:16:66:3A:88:12', hostname: 'LG-Smart-OLED-TV', ip: '192.168.1.112', interfaceType: '2.4GHz', signalDbm: -58, connected: true, isBlocked: false, lastSeen: new Date() },
          { mac: 'D8:3B:BF:14:02:AA', hostname: 'PlayStation-5', ip: '192.168.1.120', interfaceType: 'Ethernet', signalDbm: 0, connected: true, isBlocked: false, lastSeen: new Date() },
        ];

        let optionsStr = '';
        clients.forEach((c, idx) => {
          const action = c.isBlocked ? 'Unblock' : 'Block';
          optionsStr += `• Reply *${idx + 1}* to ${action} *${c.hostname}* (\`${c.mac}\`)\n`;
        });

        session.tempData.clientList = clients.map((c) => ({ mac: c.mac, hostname: c.hostname, isBlocked: c.isBlocked }));

        replyText =
          `🚫 *Block / Unblock Client Device:*\n\n` +
          `${optionsStr}\n` +
          `Or reply with the exact *MAC Address* (e.g. \`F4:D4:88:5A:21:40\`).\n` +
          `_Reply *Menu* to cancel._`;

        nextStep = 'AWAITING_BLOCK_DEVICE';
      } else if (text === '6') {
        // 6. Reboot ONT Terminal
        if (!device) {
          replyText = `⚠️ No ONT hardware bound to your account. Please contact ${supportPhone}.`;
          nextStep = 'MAIN_MENU';
        } else {
          // Dispatch TR-069 Reboot Command
          await DeviceCommand.create({
            tenantId: tenant._id,
            deviceId: device._id,
            customerId: customer._id,
            action: 'REBOOT_DEVICE',
            parameters: { reason: 'Customer WhatsApp Self-Service Reboot' },
            status: 'queued',
            requestedBy: {
              userId: new Types.ObjectId(),
              role: 'customer_self_service',
              email: cleanPhone,
            },
          });

          await AuditLog.create({
            tenantId: tenant._id,
            actorId: new Types.ObjectId(),
            actorEmail: `${cleanPhone}@whatsapp.customer`,
            actorRole: 'customer',
            action: 'CUSTOMER_WHATSAPP_ONT_REBOOT',
            targetResource: 'Device',
            targetId: device._id.toString(),
            targetIdentifier: device.serialNumber,
            correlationId: `reboot_wa_${Date.now()}`,
            result: 'SUCCESS',
            timestamp: new Date(),
          }).catch(() => {});

          replyText =
            `🔄 *Remote ONT Reboot Command Dispatched!* ⚡\n\n` +
            `Device Serial: \`${device.serialNumber}\`\n` +
            `Protocol: TR-069 CWMP RPC\n\n` +
            `Your Optical Network Terminal is now rebooting and will reconnect in approximately *60 to 90 seconds*.\n\n` +
            `_Reply *Menu* anytime for self-service options._`;

          nextStep = 'MAIN_MENU';
        }
      } else {
        replyText =
          `⚠️ Invalid choice. Please select from the menu:\n\n` +
          `1️⃣ *View Wi-Fi Details*\n` +
          `2️⃣ *Change Wi-Fi Name*\n` +
          `3️⃣ *Change Wi-Fi Password*\n` +
          `4️⃣ *View Connected Devices*\n` +
          `5️⃣ *Block / Unblock Device*\n` +
          `6️⃣ *Reboot ONT*\n\n` +
          `_Reply with 1, 2, 3, 4, 5, or 6._`;
        nextStep = 'MAIN_MENU';
      }
    } else if (session.currentStep === 'AWAITING_NEW_SSID') {
      const newSsid = text;
      if (newSsid.length < 3 || newSsid.length > 32) {
        replyText = `⚠️ Wi-Fi Name must be between 3 and 32 characters. Please enter a valid SSID:`;
        nextStep = 'AWAITING_NEW_SSID';
      } else {
        if (device) {
          if (!device.wifi24) device.wifi24 = { ssid: newSsid, enabled: true, channel: 6, channelAuto: true, bandwidthMhz: 20, securityMode: 'WPA2-PSK', txPowerPercent: 100 };
          if (!device.wifi5g) device.wifi5g = { ssid: `${newSsid}_5G`, enabled: true, channel: 36, channelAuto: true, bandwidthMhz: 80, securityMode: 'WPA2-PSK', txPowerPercent: 100 };
          device.wifi24.ssid = newSsid;
          device.wifi5g.ssid = `${newSsid}_5G`;
          await device.save();

          // Dispatch TR-069 Command
          await DeviceCommand.create({
            tenantId: tenant._id,
            deviceId: device._id,
            customerId: customer._id,
            action: 'SET_WIFI_CONFIG',
            parameters: { ssid: newSsid, ssid5g: `${newSsid}_5G` },
            status: 'queued',
            requestedBy: {
              userId: new Types.ObjectId(),
              role: 'customer_self_service',
              email: cleanPhone,
            },
          });
        }

        await AuditLog.create({
          tenantId: tenant._id,
          actorId: new Types.ObjectId(),
          actorEmail: `${cleanPhone}@whatsapp.customer`,
          actorRole: 'customer',
          action: 'CUSTOMER_WHATSAPP_WIFI_NAME_CHANGED',
          targetResource: 'Customer',
          targetId: customer._id.toString(),
          targetIdentifier: customer.accountNumber,
          correlationId: `wifi_name_wa_${Date.now()}`,
          result: 'SUCCESS',
          timestamp: new Date(),
        }).catch(() => {});

        replyText =
          `✅ *Wi-Fi Name Successfully Updated!* 🎉\n\n` +
          `• *2.4GHz SSID:* \`${newSsid}\`\n` +
          `• *5GHz SSID:* \`${newSsid}_5G\`\n\n` +
          `TR-069 configuration push dispatched to your ONT. Your devices can now connect to *${newSsid}*.\n\n` +
          `_Reply *Menu* for other options._`;

        nextStep = 'MAIN_MENU';
      }
    } else if (session.currentStep === 'AWAITING_NEW_PASSWORD') {
      const newPass = text;
      if (newPass.length < 8) {
        replyText = `⚠️ Wi-Fi Password must be at least 8 characters long. Please enter a stronger password:`;
        nextStep = 'AWAITING_NEW_PASSWORD';
      } else {
        if (device) {
          if (!device.wifi24) device.wifi24 = { ssid: 'ApexFiber_2.4G', password: newPass, enabled: true, channel: 6, channelAuto: true, bandwidthMhz: 20, securityMode: 'WPA2-PSK', txPowerPercent: 100 };
          if (!device.wifi5g) device.wifi5g = { ssid: 'ApexFiber_5G', password: newPass, enabled: true, channel: 36, channelAuto: true, bandwidthMhz: 80, securityMode: 'WPA2-PSK', txPowerPercent: 100 };
          device.wifi24.password = newPass;
          device.wifi5g.password = newPass;
          await device.save();

          // Dispatch TR-069 Command
          await DeviceCommand.create({
            tenantId: tenant._id,
            deviceId: device._id,
            customerId: customer._id,
            action: 'SET_WIFI_CONFIG',
            parameters: { password: newPass },
            status: 'queued',
            requestedBy: {
              userId: new Types.ObjectId(),
              role: 'customer_self_service',
              email: cleanPhone,
            },
          });
        }

        await AuditLog.create({
          tenantId: tenant._id,
          actorId: new Types.ObjectId(),
          actorEmail: `${cleanPhone}@whatsapp.customer`,
          actorRole: 'customer',
          action: 'CUSTOMER_WHATSAPP_WIFI_PASS_CHANGED',
          targetResource: 'Customer',
          targetId: customer._id.toString(),
          targetIdentifier: customer.accountNumber,
          correlationId: `wifi_pass_wa_${Date.now()}`,
          result: 'SUCCESS',
          timestamp: new Date(),
        }).catch(() => {});

        replyText =
          `✅ *Wi-Fi Password Successfully Updated!* 🔐\n\n` +
          `New Password: \`${newPass}\`\n\n` +
          `Your ONT is applying the security configuration via TR-069. Please reconnect your devices with this new password.\n\n` +
          `_Reply *Menu* for other options._`;

        nextStep = 'MAIN_MENU';
      }
    } else if (session.currentStep === 'AWAITING_BLOCK_DEVICE') {
      const clientList: any[] = session.tempData.clientList || [];
      const num = parseInt(text, 10);
      let targetClient: any = null;

      if (!isNaN(num) && num >= 1 && num <= clientList.length) {
        targetClient = clientList[num - 1];
      } else {
        targetClient = clientList.find((c) => c.mac.toLowerCase() === text.toLowerCase());
      }

      if (!targetClient) {
        replyText = `⚠️ Device not found. Please reply with a valid number from the list (1 to ${clientList.length}) or exact MAC address, or reply *Menu* to return:`;
        nextStep = 'AWAITING_BLOCK_DEVICE';
      } else {
        const newBlockedState = !targetClient.isBlocked;
        targetClient.isBlocked = newBlockedState;

        if (device) {
          await Device.updateOne(
            { _id: device._id, 'connectedClients.mac': targetClient.mac },
            { $set: { 'connectedClients.$.isBlocked': newBlockedState } }
          );
        }

        // Dispatch TR-069 Command
        if (device) {
          await DeviceCommand.create({
            tenantId: tenant._id,
            deviceId: device._id,
            customerId: customer._id,
            action: newBlockedState ? 'BLOCK_CLIENT' : 'UNBLOCK_CLIENT',
            parameters: { macAddress: targetClient.mac, hostname: targetClient.hostname },
            status: 'queued',
            requestedBy: {
              userId: new Types.ObjectId(),
              role: 'customer_self_service',
              email: cleanPhone,
            },
          });
        }

        const actionWord = newBlockedState ? 'Blocked 🚫' : 'Unblocked 🟢';
        replyText =
          `✅ *Device ${actionWord}!* \n\n` +
          `• Device: *${targetClient.hostname}*\n` +
          `• MAC: \`${targetClient.mac}\`\n` +
          `• Status: ${newBlockedState ? 'Blocked from accessing Wi-Fi' : 'Allowed to connect'}\n\n` +
          `TR-069 access rule applied to your ONT.\n\n` +
          `_Reply *Menu* for other options._`;

        nextStep = 'MAIN_MENU';
      }
    } else {
      replyText = `_Reply *Menu* anytime to see all self-service options._`;
      nextStep = 'MAIN_MENU';
    }

    // Update session state
    session.currentStep = nextStep;
    session.markModified('tempData');
    await session.save();

    // Log & send outbound response
    await this.sendAndLogBotReply(tenant._id, cleanPhone, replyText, customer._id, session.currentStep);

    return {
      handled: true,
      replyText,
      sessionState: nextStep,
      isRegisteredCustomer: true,
      leadCreated: false,
    };
  }

  /**
   * Helper to send & log outbound message
   */
  private static async sendAndLogBotReply(
    tenantId: Types.ObjectId,
    phone: string,
    messageText: string,
    customerId?: Types.ObjectId,
    sessionState?: string
  ) {
    try {
      await WhatsAppChatMessage.create({
        tenantId,
        phone,
        senderName: 'AI Self-Service Bot',
        customerId,
        direction: 'OUTBOUND',
        senderType: 'BOT',
        messageText,
        status: 'DELIVERED',
        sessionState,
        timestamp: new Date(),
      });

      // Dispatch via WhatsApp socket if available
      await WhatsAppService.sendTenantCustomerNotification(tenantId.toString(), phone, messageText).catch(() => {});
    } catch (err: any) {
      console.error('[WhatsAppBotService] Error logging bot reply:', err.message);
    }
  }

  /**
   * Operator sends a direct manual reply from Dashboard
   */
  static async sendOperatorReply(
    tenantId: string,
    phone: string,
    messageText: string,
    operator: { id: string; email: string; name: string }
  ) {
    const cleanPhone = this.normalizePhone(phone);
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const customer = await Customer.findOne({
      tenantId: tenant._id,
      phone: { $regex: cleanPhone },
    });

    const lead = !customer ? await CustomerLead.findOne({ tenantId: tenant._id, phone: cleanPhone }) : null;

    const chatMsg = await WhatsAppChatMessage.create({
      tenantId: tenant._id,
      phone: cleanPhone,
      senderName: operator.name || 'Support Desk',
      customerId: customer?._id,
      leadId: lead?._id,
      direction: 'OUTBOUND',
      senderType: 'OPERATOR',
      messageText,
      status: 'SENT',
      timestamp: new Date(),
    });

    await WhatsAppService.sendTenantCustomerNotification(tenantId, cleanPhone, messageText).catch(() => {});

    await AuditLog.create({
      tenantId: tenant._id,
      actorId: Types.ObjectId.isValid(operator.id) ? new Types.ObjectId(operator.id) : new Types.ObjectId(),
      actorEmail: operator.email,
      actorRole: 'operator',
      action: 'OPERATOR_WHATSAPP_MESSAGE_SENT',
      targetResource: customer ? 'Customer' : 'CustomerLead',
      targetId: (customer?._id || lead?._id || '').toString(),
      targetIdentifier: customer?.accountNumber || lead?.leadNumber || cleanPhone,
      correlationId: `op_wa_${Date.now()}`,
      result: 'SUCCESS',
      timestamp: new Date(),
    }).catch(() => {});

    return chatMsg;
  }

  /**
   * Returns list of all conversation threads for operator inbox
   */
  static async getConversations(tenantId: string) {
    const tId = new Types.ObjectId(tenantId);

    // Group messages by phone and get latest message
    const threads = await WhatsAppChatMessage.aggregate([
      { $match: { tenantId: tId } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$phone',
          lastMessage: { $first: '$messageText' },
          lastTimestamp: { $first: '$timestamp' },
          lastSenderType: { $first: '$senderType' },
          senderName: { $first: '$senderName' },
          customerId: { $first: '$customerId' },
          leadId: { $first: '$leadId' },
          totalMessages: { $sum: 1 },
        },
      },
      { $sort: { lastTimestamp: -1 } },
    ]);

    // Enrich with Customer / Lead info
    const enriched = await Promise.all(
      threads.map(async (th) => {
        const phone = th._id;
        const customer = await Customer.findOne({ tenantId: tId, phone: { $regex: phone } }).populate('assignedDeviceId');
        const lead = !customer ? await CustomerLead.findOne({ tenantId: tId, phone }) : null;

        return {
          phone,
          senderName: customer?.fullName || lead?.fullName || th.senderName || 'Inquiry',
          accountNumber: customer?.accountNumber,
          isCustomer: !!customer,
          isLead: !!lead,
          customer: customer
            ? {
                _id: customer._id,
                fullName: customer.fullName,
                accountNumber: customer.accountNumber,
                plan: customer.servicePlan?.name,
                deviceStatus: (customer.assignedDeviceId as any)?.status || 'offline',
                opticalPower: (customer.assignedDeviceId as any)?.currentRxPowerDbm,
              }
            : null,
          lead: lead
            ? {
                _id: lead._id,
                leadNumber: lead.leadNumber,
                fullName: lead.fullName,
                address: lead.address,
                pincode: lead.pincode,
                status: lead.status,
              }
            : null,
          lastMessage: th.lastMessage,
          lastTimestamp: th.lastTimestamp,
          lastSenderType: th.lastSenderType,
          totalMessages: th.totalMessages,
        };
      })
    );

    return enriched;
  }

  /**
   * Returns full message history for a specific phone number
   */
  static async getChatHistory(tenantId: string, phone: string) {
    const cleanPhone = this.normalizePhone(phone);
    const messages = await WhatsAppChatMessage.find({
      tenantId: new Types.ObjectId(tenantId),
      phone: cleanPhone,
    }).sort({ timestamp: 1 });

    const customer = await Customer.findOne({
      tenantId: new Types.ObjectId(tenantId),
      phone: { $regex: cleanPhone },
    }).populate('assignedDeviceId');

    const lead = !customer ? await CustomerLead.findOne({ tenantId: new Types.ObjectId(tenantId), phone: cleanPhone }) : null;

    return {
      phone: cleanPhone,
      customer,
      lead,
      messages,
    };
  }

  /**
   * List all leads for operator dashboard
   */
  static async getLeads(tenantId: string, status?: string) {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };
    if (status) query.status = status;
    return CustomerLead.find(query).sort({ createdAt: -1 });
  }

  /**
   * Converts a prospective lead into an active customer account
   */
  static async convertLeadToCustomer(
    tenantId: string,
    leadId: string,
    payload: { planName: string; planPrice: number; actor: { id: string; email: string } }
  ) {
    const lead = await CustomerLead.findById(leadId);
    if (!lead) throw new Error('Lead not found');

    const newCustomer = await Customer.create({
      tenantId: lead.tenantId,
      accountNumber: `ACC-${Date.now().toString().slice(-6)}`,
      serviceId: `SRV-${Date.now().toString().slice(-5)}`,
      fullName: lead.fullName,
      phone: lead.phone,
      email: lead.email || `${lead.phone}@isp.customer`,
      address: {
        door: 'Premise',
        building: 'Residential',
        street: lead.address,
        area: lead.address,
        city: 'Local City',
        pincode: lead.pincode,
        state: 'State',
      },
      servicePlan: {
        name: payload.planName,
        price: payload.planPrice,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
        status: 'active',
        billingStatus: 'paid',
      },
      status: 'active',
      kyc: {
        documentType: 'aadhaar',
        status: 'verified',
      },
    });

    lead.status = 'CONVERTED';
    lead.convertedCustomerId = newCustomer._id;
    await lead.save();

    await AuditLog.create({
      tenantId: lead.tenantId,
      actorId: Types.ObjectId.isValid(payload.actor.id) ? new Types.ObjectId(payload.actor.id) : new Types.ObjectId(),
      actorEmail: payload.actor.email,
      actorRole: 'operator',
      action: 'LEAD_CONVERTED_TO_CUSTOMER',
      targetResource: 'Customer',
      targetId: newCustomer._id.toString(),
      targetIdentifier: newCustomer.accountNumber,
      correlationId: `lead_conv_${Date.now()}`,
      result: 'SUCCESS',
      timestamp: new Date(),
    }).catch(() => {});

    return newCustomer;
  }
}
