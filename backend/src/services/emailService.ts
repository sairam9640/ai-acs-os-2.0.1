import nodemailer from 'nodemailer';
import { SystemSetting, ISmtpSettings } from '../models/SystemSetting.js';

export class EmailService {
  /**
   * Retrieves active SMTP configuration from database or env fallback
   */
  static async getSmtpConfig(): Promise<ISmtpSettings | null> {
    try {
      const setting = await SystemSetting.findOne({ key: 'global_config' });
      if (setting && setting.smtp && setting.smtp.user && setting.smtp.pass) {
        return setting.smtp;
      }
    } catch (e) {
      console.warn('[EmailService] Could not fetch SystemSetting from DB, checking environment.');
    }

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      return {
        enabled: true,
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE !== 'false',
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        fromEmail: process.env.SMTP_FROM || process.env.SMTP_USER,
        fromName: process.env.SMTP_FROM_NAME || 'AI ISP OS Platform',
      };
    }

    return null;
  }

  /**
   * Creates a nodemailer transporter instance based on active configuration
   */
  static createTransporter(config: ISmtpSettings) {
    return nodemailer.createTransport({
      host: config.host || 'smtp.gmail.com',
      port: config.port || 465,
      secure: config.secure ?? (config.port === 465),
      auth: {
        user: config.user.trim(),
        pass: config.pass.replace(/\s+/g, ''), // Strip spaces from 16-char Google App Password
      },
    });
  }

  /**
   * Sends a high-security Dynamic 6-digit OTP email to Super Admin
   */
  static async sendOtpEmail(toEmail: string, otpCode: string, recipientName = 'Super Administrator'): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const config = await this.getSmtpConfig();
    if (!config || !config.user || !config.pass) {
      console.warn(`[EmailService] SMTP not configured. OTP [${otpCode}] for [${toEmail}] logged to server console.`);
      return {
        success: false,
        error: 'Gmail SMTP credentials not configured. Please configure Google Email and App Password in Super Admin Settings.',
      };
    }

    try {
      const transporter = this.createTransporter(config);
      const fromAddress = `"${config.fromName || 'AI ISP OS Security'}" <${config.fromEmail || config.user}>`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
            .container { max-width: 520px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
            .header { text-align: center; margin-bottom: 24px; }
            .badge { display: inline-block; background-color: rgba(14, 165, 233, 0.15); border: 1px solid rgba(14, 165, 233, 0.3); color: #38bdf8; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; }
            .title { font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 12px; margin-bottom: 4px; }
            .subtitle { font-size: 13px; color: #94a3b8; margin: 0; }
            .otp-box { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border: 2px dashed #0284c7; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; text-shadow: 0 0 12px rgba(56, 189, 248, 0.4); margin: 0; }
            .warning { font-size: 12px; color: #cbd5e1; line-height: 1.6; background-color: rgba(244, 63, 94, 0.1); border-left: 3px solid #f43f5e; padding: 10px 14px; border-radius: 4px; margin-bottom: 20px; }
            .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 24px; border-top: 1px solid #334155; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="badge">AI ISP OS Control Plane</span>
              <h1 class="title">Super Admin One-Time Password</h1>
              <p class="subtitle">Requested by ${recipientName}</p>
            </div>
            
            <p style="font-size: 14px; color: #e2e8f0; line-height: 1.5;">
              Use the following authorized 6-digit verification code to complete your secure Super Admin login to the AI ISP OS SaaS Platform:
            </p>

            <div class="otp-box">
              <p class="otp-code">${otpCode}</p>
            </div>

            <div class="warning">
              <strong>Security Notice:</strong> This code is valid for <strong>10 minutes</strong>. Never disclose this code to anyone. If you did not initiate this login request, please inspect your global security logs immediately.
            </div>

            <div class="footer">
              AI ISP OS Autonomous Telecommunications Engine • Automated System Notification
            </div>
          </div>
        </body>
        </html>
      `;

      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `[AI ISP OS] Your Super Admin Login OTP: ${otpCode}`,
        text: `Your AI ISP OS Super Admin Login Verification Code is: ${otpCode}. Valid for 10 minutes.`,
        html: htmlContent,
      });

      console.log(`[EmailService] OTP email successfully sent to ${toEmail}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error(`[EmailService] Failed to send email to ${toEmail}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Tests SMTP connectivity and dispatches a test email
   */
  static async testConnection(config: ISmtpSettings, targetEmail: string): Promise<{ success: boolean; message: string }> {
    try {
      const transporter = this.createTransporter(config);
      await transporter.verify();

      const testInfo = await transporter.sendMail({
        from: `"${config.fromName || 'AI ISP OS Platform'}" <${config.fromEmail || config.user}>`,
        to: targetEmail,
        subject: '✓ [AI ISP OS] Gmail SMTP Integration Test Successful',
        text: 'Congratulations! Your Google Email and App Password have been successfully verified on AI ISP OS. Super Admin dynamic OTP dispatch is now live.',
        html: `
          <div style="font-family: sans-serif; background-color: #0f172a; color: #fff; padding: 24px; border-radius: 12px;">
            <h2 style="color: #38bdf8;">✓ Google SMTP Connection Verified</h2>
            <p>Your Gmail credentials (<strong>${config.user}</strong>) are functioning properly.</p>
            <p>All subsequent Super Admin login attempts will receive authorized OTP codes directly via this email address.</p>
          </div>
        `,
      });

      return {
        success: true,
        message: `SMTP Connection verified and test email delivered to ${targetEmail} (ID: ${testInfo.messageId})`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to authenticate with SMTP server. Check email and App Password.',
      };
    }
  }
}
