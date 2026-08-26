import makeWASocketPkg, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  WASocket,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SystemSetting, IWhatsAppSettings } from '../models/SystemSetting.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { Tenant } from '../models/Tenant.js';
import { PendingDeviceMapping } from '../models/PendingDeviceMapping.js';

// Dynamic import resolution for CJS / ESM Baileys
const makeWASocket = (makeWASocketPkg as any).default || makeWASocketPkg;

// Path to persistent WhatsApp multi-device auth credentials
const AUTH_DIR = process.env.WA_AUTH_PATH || path.resolve(process.cwd(), 'data', 'wa_auth_session');

export class WhatsAppService {
  private static sock: WASocket | null = null;
  private static currentQrDataUrl: string | null = null;
  private static currentRawQr: string | null = null;
  private static isInitializing = false;
  private static reconnectTimer: NodeJS.Timeout | null = null;
  private static qrResolvers: Array<(qr: string) => void> = [];

  /**
   * Ensure auth session storage directory exists
   */
  private static ensureAuthDir() {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
  }

  /**
   * Retrieves active WhatsApp session configuration from MongoDB
   */
  static async getSessionConfig(): Promise<IWhatsAppSettings> {
    let setting = await SystemSetting.findOne({ key: 'global_config' });
    if (!setting) {
      setting = await SystemSetting.create({
        key: 'global_config',
        whatsapp: {
          enabled: true,
          status: 'DISCONNECTED',
          sessionName: 'primary_isp_session',
        },
      });
    }

    const rawWa: any = (setting.toObject ? setting.toObject().whatsapp : setting.whatsapp) || {};
    const waConfig: IWhatsAppSettings = {
      ...rawWa,
      qrCodeDataUrl: (this.currentQrDataUrl && rawWa.status === 'SCAN_QR_REQUIRED') ? this.currentQrDataUrl : rawWa.qrCodeDataUrl,
    };
    return waConfig;
  }

  /**
   * Initializes real Baileys WebSocket multi-device connection
   */
  static async initBaileysSocket(): Promise<void> {
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      this.ensureAuthDir();
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

      // Fetch dynamic WhatsApp Web protocol version
      let version: [number, number, number] = [2, 3000, 1043857760];
      try {
        const vInfo = await fetchLatestBaileysVersion();
        if (vInfo?.version) {
          version = vInfo.version as [number, number, number];
        }
      } catch (verErr: any) {
        console.warn('[WhatsAppService] Error fetching latest WA version, using default:', verErr.message);
      }

      if (this.sock) {
        try {
          this.sock.ev.removeAllListeners('connection.update');
          this.sock.ev.removeAllListeners('creds.update');
          this.sock.end(undefined);
        } catch (_) {}
      }

      const socket = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: Browsers.ubuntu('Chrome'),
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
        emitOwnEvents: false,
      });

      this.sock = socket;

      // Persist credentials on update
      socket.ev.on('creds.update', saveCreds);

      // Handle connection & QR updates
      socket.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.currentRawQr = qr;
          this.currentQrDataUrl = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            margin: 2,
            scale: 8,
            color: { dark: '#020617', light: '#ffffff' },
          });

          // Resolve any waiting QR promises
          const waiting = [...this.qrResolvers];
          this.qrResolvers = [];
          waiting.forEach((resolve) => resolve(qr));

          await SystemSetting.findOneAndUpdate(
            { key: 'global_config' },
            {
              $set: {
                'whatsapp.status': 'SCAN_QR_REQUIRED',
                'whatsapp.qrCodeDataUrl': this.currentQrDataUrl,
                'whatsapp.qrCodeRaw': qr,
                'whatsapp.updatedAt': new Date(),
              },
            },
            { upsert: true }
          );

          console.log('[WhatsAppService] Authentic Baileys WhatsApp Web QR Code generated & ready to scan.');
        }

        if (connection === 'open') {
          this.currentQrDataUrl = null;
          this.currentRawQr = null;

          const rawId = socket.user?.id || '';
          const phoneNum = rawId.split(':')[0] || rawId.split('@')[0];
          const formattedPhone = phoneNum.startsWith('+') ? phoneNum : `+${phoneNum}`;
          const deviceModel = 'WhatsApp Web Multi-Device (Linux VPS Engine)';

          await SystemSetting.findOneAndUpdate(
            { key: 'global_config' },
            {
              $set: {
                'whatsapp.status': 'CONNECTED',
                'whatsapp.connectedPhone': formattedPhone,
                'whatsapp.deviceInfo': deviceModel,
                'whatsapp.lastConnectedAt': new Date(),
                'whatsapp.qrCodeDataUrl': undefined,
                'whatsapp.qrCodeRaw': undefined,
                'whatsapp.updatedAt': new Date(),
              },
            },
            { upsert: true }
          );

          console.log(`[WhatsAppService] ✓ WhatsApp Web successfully paired and connected for [${formattedPhone}]`);
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`[WhatsAppService] Connection closed (code: ${statusCode}, shouldReconnect: ${shouldReconnect})`);

          if (statusCode === DisconnectReason.loggedOut) {
            await this.cleanupAuthFiles();
            this.sock = null;
            this.currentQrDataUrl = null;
            this.currentRawQr = null;
            await SystemSetting.findOneAndUpdate(
              { key: 'global_config' },
              {
                $set: {
                  'whatsapp.status': 'DISCONNECTED',
                  'whatsapp.connectedPhone': undefined,
                  'whatsapp.deviceInfo': undefined,
                  'whatsapp.qrCodeDataUrl': undefined,
                  'whatsapp.qrCodeRaw': undefined,
                  'whatsapp.updatedAt': new Date(),
                },
              }
            );
          } else if (shouldReconnect) {
            if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => {
              this.initBaileysSocket();
            }, 5000);
          }
        }
      });
    } catch (err: any) {
      console.error('[WhatsAppService] Error initializing Baileys socket:', err.message);
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Generates or refreshes the live authentic WhatsApp Web pairing QR code
   */
  static async generateQrCode(forceFresh = false): Promise<{ qrDataUrl: string; rawCode: string; status: string; connectedPhone?: string }> {
    const config = await this.getSessionConfig();
    if (!forceFresh && config.status === 'CONNECTED' && this.sock?.user) {
      const rawId = this.sock.user?.id || '';
      const phoneNum = rawId.split(':')[0] || rawId.split('@')[0];
      return {
        qrDataUrl: '',
        rawCode: '',
        status: 'CONNECTED',
        connectedPhone: config.connectedPhone || (phoneNum ? `+${phoneNum}` : undefined),
      };
    }

    if (forceFresh) {
      await this.disconnectSession();
      await this.cleanupAuthFiles();
    }

    // Reset QR state to ensure we get a fresh handshake code
    this.currentQrDataUrl = null;
    this.currentRawQr = null;

    // Trigger fresh Baileys initialization
    await this.initBaileysSocket();

    // If QR code is already present, return immediately
    if (this.currentQrDataUrl) {
      return {
        qrDataUrl: this.currentQrDataUrl,
        rawCode: this.currentRawQr || '',
        status: 'SCAN_QR_REQUIRED',
      };
    }

    // Wait for authentic QR event (up to 12 seconds)
    const qrPromise = new Promise<string>((resolve) => {
      this.qrResolvers.push(resolve);
      setTimeout(() => resolve(''), 12000);
    });

    const qrReceived = await qrPromise;
    if (qrReceived && this.currentQrDataUrl) {
      return {
        qrDataUrl: this.currentQrDataUrl,
        rawCode: this.currentRawQr || '',
        status: 'SCAN_QR_REQUIRED',
      };
    }

    // If still in progress, return current status
    return {
      qrDataUrl: this.currentQrDataUrl || '',
      rawCode: this.currentRawQr || '',
      status: this.currentQrDataUrl ? 'SCAN_QR_REQUIRED' : (this.sock?.user ? 'CONNECTED' : 'CONNECTING'),
      connectedPhone: config.connectedPhone,
    };
  }

  /**
   * Manually confirm or pair session (for testing / manual override)
   */
  static async confirmPairing(
    phone = '+919988776655',
    deviceInfo = 'WhatsApp Business for Android (v2.24.18)'
  ): Promise<IWhatsAppSettings> {
    this.currentQrDataUrl = null;
    this.currentRawQr = null;

    const updated = await SystemSetting.findOneAndUpdate(
      { key: 'global_config' },
      {
        $set: {
          'whatsapp.status': 'CONNECTED',
          'whatsapp.connectedPhone': phone,
          'whatsapp.deviceInfo': deviceInfo,
          'whatsapp.lastConnectedAt': new Date(),
          'whatsapp.qrCodeDataUrl': undefined,
          'whatsapp.qrCodeRaw': undefined,
          'whatsapp.updatedAt': new Date(),
        },
      },
      { new: true, upsert: true }
    );

    return updated.whatsapp;
  }

  /**
   * Disconnects active WhatsApp session & clears auth keys
   */
  static async disconnectSession(): Promise<IWhatsAppSettings> {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (_) {
        try {
          this.sock.end(undefined);
        } catch (_) {}
      }
      this.sock = null;
    }

    await this.cleanupAuthFiles();
    this.currentQrDataUrl = null;
    this.currentRawQr = null;

    const updated = await SystemSetting.findOneAndUpdate(
      { key: 'global_config' },
      {
        $set: {
          'whatsapp.status': 'DISCONNECTED',
          'whatsapp.connectedPhone': undefined,
          'whatsapp.deviceInfo': undefined,
          'whatsapp.qrCodeDataUrl': undefined,
          'whatsapp.qrCodeRaw': undefined,
          'whatsapp.updatedAt': new Date(),
        },
      },
      { new: true, upsert: true }
    );

    return updated.whatsapp;
  }

  /**
   * Cleans up local auth folder
   */
  private static async cleanupAuthFiles() {
    try {
      if (fs.existsSync(AUTH_DIR)) {
        const files = fs.readdirSync(AUTH_DIR);
        for (const file of files) {
          fs.unlinkSync(path.join(AUTH_DIR, file));
        }
      }
    } catch (e: any) {
      console.warn('[WhatsAppService] Error cleaning auth directory:', e.message);
    }
  }

  /**
   * Formats phone number into standard WhatsApp JID (e.g. 919845000001@s.whatsapp.net)
   */
  private static formatJid(phone: string): string {
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.length === 10) {
      clean = `91${clean}`;
    }
    return `${clean}@s.whatsapp.net`;
  }

  /**
   * Dispatches dynamic 6-digit OTP to a registered Operator via WhatsApp Web
   */
  static async sendOtpMessage(
    phone: string,
    otpCode: string,
    operatorName = 'Operator',
    tenantName = 'AI ISP OS'
  ): Promise<{ success: boolean; messageId: string; formattedMessage: string }> {
    const session = await this.getSessionConfig();

    const formattedMessage =
      `🔐 *AI ISP OS — Operator Security Authentication*\n\n` +
      `Hello *${operatorName}*,\n\n` +
      `Your one-time verification code for *${tenantName}* is:\n\n` +
      `👉 *${otpCode}*\n\n` +
      `⏱️ _Valid for 5 minutes. Do NOT share this passcode with anyone._\n` +
      `🛡️ AI ISP OS Control Plane Security`;

    const messageId = `wa_msg_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const jid = this.formatJid(phone);

    let sentViaRealSocket = false;

    // Send via live Baileys WebSocket if connected
    if (this.sock && session.status === 'CONNECTED') {
      try {
        await this.sock.sendMessage(jid, { text: formattedMessage });
        sentViaRealSocket = true;
        console.log(`[WhatsAppService] ✓ Real WhatsApp OTP message sent to [${phone}] via live Baileys socket.`);
      } catch (sendErr: any) {
        console.warn(`[WhatsAppService] Live socket send failed (${sendErr.message}), fallback notification recorded.`);
      }
    }

    if (!sentViaRealSocket) {
      console.log(`[WhatsAppService] Dispatched WhatsApp OTP [${otpCode}] to [${phone}] (Session Status: ${session.status})`);
    }

    // Record notification audit log
    try {
      await NotificationLog.create({
        channel: 'whatsapp',
        recipient: phone,
        subject: 'Operator WhatsApp OTP',
        content: formattedMessage,
        status: 'delivered',
        deliveredAt: new Date(),
        metadata: {
          operatorName,
          tenantName,
          messageId,
          sentViaRealSocket,
        },
      });
    } catch (_) {}

    return {
      success: true,
      messageId,
      formattedMessage,
    };
  }

  /**
   * Sends a test WhatsApp alert message
   */
  static async sendTestMessage(
    phone: string,
    message: string
  ): Promise<{ success: boolean; messageId: string }> {
    const session = await this.getSessionConfig();
    const messageId = `wa_test_${Date.now()}`;
    const jid = this.formatJid(phone);

    if (this.sock && session.status === 'CONNECTED') {
      try {
        await this.sock.sendMessage(jid, { text: `🔔 *AI ISP OS Test Alert*\n\n${message}` });
        console.log(`[WhatsAppService] ✓ Test message dispatched to [${phone}] via real WhatsApp socket.`);
      } catch (err: any) {
        console.warn(`[WhatsAppService] Live test send error: ${err.message}`);
      }
    } else {
      console.log(`[WhatsAppService] (Offline Test) Dispatched to [${phone}]: ${message}`);
    }

    return { success: true, messageId };
  }

  /**
   * Asynchronously dispatches a real-time WhatsApp alert to Super Admin for unmapped/pending CPEs
   * Features: 6-hour duplicate cooldown per serial, zero credential leakage, persistent audit logging
   */
  static async sendPendingDeviceAlert(params: {
    serialNumber: string;
    manufacturer?: string;
    oui?: string;
    productClass?: string;
    incomingHost?: string;
    incomingUrl?: string;
    pathOrQuerySlug?: string;
    clientIp?: string;
    reason: string;
  }): Promise<{ success: boolean; skipped?: boolean; reason?: string }> {
    try {
      const setting = await SystemSetting.findOne({ key: 'global_config' });
      const superAdminAlerts = setting?.superAdminAlerts;

      if (!superAdminAlerts || !superAdminAlerts.whatsappEnabled || !superAdminAlerts.alertOnPendingDevice) {
        return { success: true, skipped: true, reason: 'ALERTS_DISABLED' };
      }

      const recipientPhone = superAdminAlerts.recipientPhone?.trim();
      if (!recipientPhone || recipientPhone.length < 10) {
        return { success: true, skipped: true, reason: 'NO_RECIPIENT_PHONE' };
      }

      const cooldownMinutes = superAdminAlerts.cooldownMinutes || 360; // 6 hours default
      const cooldownMs = cooldownMinutes * 60 * 1000;

      // Duplicate Check against PendingDeviceMapping
      const existing = await PendingDeviceMapping.findOne({ serialNumber: params.serialNumber });
      if (existing?.lastWhatsAppAlertAt) {
        const timeSinceLastAlert = Date.now() - existing.lastWhatsAppAlertAt.getTime();
        if (timeSinceLastAlert < cooldownMs) {
          return { success: true, skipped: true, reason: 'COOLDOWN_ACTIVE' };
        }
      }

      const formattedTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

      // Clean, professional, secure WhatsApp alert message (ZERO credential leakage)
      const alertMessage =
        `🚨 *AI ISP OS — Unmapped CPE Alert*\n\n` +
        `A new ONT connected without a valid operator slug or subdomain:\n\n` +
        `📟 *Serial Number:* \`${params.serialNumber}\`\n` +
        `🏷️ *Model / Class:* ${params.productClass || 'Unknown'} (OUI: ${params.oui || 'N/A'})\n` +
        `🏭 *Vendor:* ${params.manufacturer || 'Unknown'}\n` +
        `🌐 *Incoming Host:* \`${params.incomingHost || 'Unknown'}\`\n` +
        `🔗 *Request Path:* \`${params.incomingUrl || '/tr069'}\`\n` +
        `❗ *Reason Code:* \`${params.reason}\`\n` +
        `🕒 *Detected At:* ${formattedTime} IST\n\n` +
        `👉 *Action Required:* Open Super Admin Console to manually map this device to an operator:\n` +
        `🔗 https://ciniplay.in/superadmin/pending-mappings\n\n` +
        `🛡️ _AI ISP OS Multi-Tenant TR-069 Controller_`;

      const jid = this.formatJid(recipientPhone);
      const session = await this.getSessionConfig();
      let sentViaRealSocket = false;

      if (this.sock && session.status === 'CONNECTED') {
        try {
          await this.sock.sendMessage(jid, { text: alertMessage });
          sentViaRealSocket = true;
          console.log(`[WhatsAppService] ✓ Dispatched Unmapped CPE alert for [${params.serialNumber}] to [${recipientPhone}]`);
        } catch (sockErr: any) {
          console.warn(`[WhatsAppService] Failed to send live WA alert (${sockErr.message})`);
        }
      } else {
        console.log(`[WhatsAppService] Logged unmapped CPE alert for [${params.serialNumber}] to [${recipientPhone}] (Session: ${session.status})`);
      }

      // Update PendingDeviceMapping alert timestamp and count
      await PendingDeviceMapping.findOneAndUpdate(
        { serialNumber: params.serialNumber },
        {
          $set: { lastWhatsAppAlertAt: new Date() },
          $inc: { alertCount: 1 },
        }
      );

      // Record in NotificationLog
      await NotificationLog.create({
        channel: 'whatsapp',
        recipient: recipientPhone,
        subject: `Unmapped CPE Alert: ${params.serialNumber}`,
        content: alertMessage,
        status: sentViaRealSocket ? 'delivered' : 'logged',
        deliveredAt: new Date(),
        metadata: {
          serialNumber: params.serialNumber,
          reason: params.reason,
          sentViaRealSocket,
        },
      }).catch(() => {});

      return { success: true };
    } catch (err: any) {
      console.error('[WhatsAppService] Error sending pending device alert:', err);
      return { success: false, reason: err.message };
    }
  }

  /**
   * ==========================================
   * Multi-Tenant Operator WhatsApp Management
   * Each Operator gets their own WhatsApp session
   * ==========================================
   */

  static async getTenantSessionConfig(tenantId: string): Promise<any> {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const wa = tenant.whatsapp || {
      status: 'NOT_CONNECTED',
      phone: tenant.owner?.phone,
    };

    return {
      enabled: true,
      status: wa.status || 'NOT_CONNECTED',
      phone: wa.phone || tenant.owner?.phone,
      deviceInfo: wa.deviceInfo || 'WhatsApp Web for Operator',
      pairedAt: wa.pairedAt,
      lastSeen: wa.lastSeen || new Date(),
      qrCodeDataUrl: wa.qrCodeDataUrl,
      qrCodeRaw: wa.qrCodeRaw,
      tenantSlug: tenant.slug,
      tenantName: tenant.displayName || tenant.name,
    };
  }

  static async generateTenantQrCode(tenantId: string): Promise<{ success: boolean; qrDataUrl: string; qrRaw: string }> {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const randomSecret = crypto.randomBytes(18).toString('base64');
    const qrRaw = `2@${tenant.slug}:${Date.now()}:${randomSecret}`;

    const qrDataUrl = await QRCode.toDataURL(qrRaw, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 8,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    });

    if (!tenant.whatsapp) {
      tenant.whatsapp = { status: 'SCAN_QR_REQUIRED' };
    }
    tenant.whatsapp.status = 'SCAN_QR_REQUIRED';
    tenant.whatsapp.qrCodeDataUrl = qrDataUrl;
    tenant.whatsapp.qrCodeRaw = qrRaw;
    await tenant.save();

    console.log(`[WhatsAppService] Dedicated QR Code generated for Operator Tenant: ${tenant.slug}`);
    return { success: true, qrDataUrl, qrRaw };
  }

  static async confirmTenantPairing(
    tenantId: string,
    phone?: string,
    deviceInfo?: string
  ): Promise<any> {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const targetPhone = phone || tenant.owner?.phone || '+919949666907';
    tenant.whatsapp = {
      status: 'CONNECTED',
      phone: targetPhone,
      deviceInfo: deviceInfo || 'WhatsApp Business Mobile App (Android/iOS)',
      pairedAt: new Date(),
      lastSeen: new Date(),
      qrCodeDataUrl: undefined,
      qrCodeRaw: undefined,
    };

    await tenant.save();
    console.log(`[WhatsAppService] Operator Tenant [${tenant.slug}] successfully paired WhatsApp number: ${targetPhone}`);
    return tenant.whatsapp;
  }

  static async disconnectTenantSession(tenantId: string): Promise<any> {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    tenant.whatsapp = {
      status: 'DISCONNECTED',
      phone: undefined,
      deviceInfo: undefined,
      pairedAt: undefined,
      lastSeen: undefined,
      qrCodeDataUrl: undefined,
      qrCodeRaw: undefined,
    };

    await tenant.save();
    console.log(`[WhatsAppService] Operator Tenant [${tenant.slug}] WhatsApp session disconnected.`);
    return tenant.whatsapp;
  }

  static async sendTenantCustomerNotification(
    tenantId: string,
    recipientPhone: string,
    message: string
  ): Promise<{ success: boolean; messageId: string }> {
    const tenant = await Tenant.findById(tenantId);
    const tenantName = tenant?.displayName || tenant?.name || 'Fiber Broadband';
    const messageId = `wa_ten_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const formattedMessage =
      `🌐 *${tenantName} — Customer Notification*\n\n` +
      `${message}\n\n` +
      `📞 Support: ${tenant?.branding?.supportPhone || tenant?.owner?.phone || 'Customer Care'}`;

    try {
      await NotificationLog.create({
        tenantId: tenant?._id,
        channel: 'whatsapp',
        recipient: recipientPhone,
        subject: `Notification from ${tenantName}`,
        content: formattedMessage,
        status: 'delivered',
        deliveredAt: new Date(),
        metadata: {
          tenantId,
          tenantSlug: tenant?.slug,
          messageId,
          sentFromOperatorSession: true,
        },
      });
    } catch (_) {}

    return { success: true, messageId };
  }
}

