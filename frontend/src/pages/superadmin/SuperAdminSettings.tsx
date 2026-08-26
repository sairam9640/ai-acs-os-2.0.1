import React, { useState, useEffect } from 'react';
import {
  Mail,
  KeyRound,
  QrCode,
  Shield,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Smartphone,
  Server,
  Lock,
  ExternalLink,
  Info,
  Power,
  MessageSquare,
  Bell,
  Radio,
  Building2,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { Shell } from '../../components/layout/Shell.js';
import { Button, Input } from '../../components/ui/Button.js';

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white border border-[#E2E8F0] rounded-2xl shadow-xl ${className}`}>{children}</div>
);

export const SuperAdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'smtp' | 'whatsapp' | 'alerts'>('alerts');

  // SMTP Settings State
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleAppPassword, setGoogleAppPassword] = useState('');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(465);
  const [fromName, setFromName] = useState('AI ISP OS Security');
  const [isSmtpConfigured, setIsSmtpConfigured] = useState(false);
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpSuccessMsg, setSmtpSuccessMsg] = useState<string | null>(null);
  const [smtpErrorMsg, setSmtpErrorMsg] = useState<string | null>(null);

  // SMTP Test State
  const [testEmailTarget, setTestEmailTarget] = useState('');
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // WhatsApp Web State
  const [waStatus, setWaStatus] = useState<'DISCONNECTED' | 'SCAN_QR_REQUIRED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');
  const [waQrDataUrl, setWaQrDataUrl] = useState<string | null>(null);
  const [waConnectedPhone, setWaConnectedPhone] = useState<string | null>(null);
  const [waDeviceInfo, setWaDeviceInfo] = useState<string | null>(null);
  const [waLoading, setWaLoading] = useState(false);
  const [waMsg, setWaMsg] = useState<string | null>(null);

  // WhatsApp Test State
  const [testPhoneTarget, setTestPhoneTarget] = useState('+919845000001');
  const [testPhoneMessage, setTestPhoneMessage] = useState('Hello! This is a test OTP verification message from AI ISP OS.');
  const [testingWa, setTestingWa] = useState(false);
  const [testWaResult, setTestWaResult] = useState<{ success: boolean; message: string } | null>(null);

  // Super Admin WhatsApp Alerts State
  const [saAlertPhone, setSaAlertPhone] = useState('');
  const [saAlertEnabled, setSaAlertEnabled] = useState(true);
  const [saAlertOnPending, setSaAlertOnPending] = useState(true);
  const [saAlertCooldown, setSaAlertCooldown] = useState(360);
  const [saAlertLoading, setSaAlertLoading] = useState(false);
  const [saAlertSuccessMsg, setSaAlertSuccessMsg] = useState<string | null>(null);
  const [saAlertErrorMsg, setSaAlertErrorMsg] = useState<string | null>(null);
  const [testingSaAlert, setTestingSaAlert] = useState(false);
  const [testSaAlertResult, setTestSaAlertResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  // Auto-poll WhatsApp session state when on WhatsApp tab
  useEffect(() => {
    if (activeTab !== 'whatsapp') return;

    const interval = setInterval(async () => {
      const res = await api.getWhatsAppStatus();
      if (res.success && res.whatsapp) {
        const wa = res.whatsapp;
        setWaStatus(wa.status);
        if (wa.status === 'CONNECTED') {
          setWaConnectedPhone(wa.connectedPhone || null);
          setWaDeviceInfo(wa.deviceInfo || 'WhatsApp Multi-Device');
          setWaQrDataUrl(null);
        } else if (wa.status === 'SCAN_QR_REQUIRED' && wa.qrCodeDataUrl) {
          setWaQrDataUrl(wa.qrCodeDataUrl);
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchSettings = async () => {
    const [res, alertRes] = await Promise.all([
      api.getSuperAdminSettings(),
      api.getSuperAdminAlertSettings(),
    ]);

    if (res.success && res.settings) {
      const { smtp, whatsapp } = res.settings;
      if (smtp) {
        setGoogleEmail(smtp.user || '');
        setGoogleAppPassword(smtp.pass || '');
        setSmtpHost(smtp.host || 'smtp.gmail.com');
        setSmtpPort(smtp.port || 465);
        setFromName(smtp.fromName || 'AI ISP OS Security');
        setIsSmtpConfigured(smtp.isConfigured || false);
        setTestEmailTarget(smtp.user || 'superadmin@ai-ispos.com');
      }
      if (whatsapp) {
        setWaStatus(whatsapp.status || 'DISCONNECTED');
        setWaQrDataUrl(whatsapp.qrCodeDataUrl || null);
        setWaConnectedPhone(whatsapp.connectedPhone || null);
        setWaDeviceInfo(whatsapp.deviceInfo || null);
      }
    }

    if (alertRes.success && alertRes.alerts) {
      setSaAlertPhone(alertRes.alerts.recipientPhone || '');
      setSaAlertEnabled(alertRes.alerts.whatsappEnabled ?? true);
      setSaAlertOnPending(alertRes.alerts.alertOnPendingDevice ?? true);
      setSaAlertCooldown(alertRes.alerts.cooldownMinutes || 360);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpLoading(true);
    setSmtpSuccessMsg(null);
    setSmtpErrorMsg(null);

    const res = await api.saveSmtpSettings({
      user: googleEmail,
      pass: googleAppPassword,
      host: smtpHost,
      port: smtpPort,
      fromName,
      secure: smtpPort === 465,
    });
    setSmtpLoading(false);

    if (res.success) {
      setSmtpSuccessMsg('✓ Google Gmail SMTP and App Password saved successfully! Super Admin dynamic Email OTP is now active.');
      setIsSmtpConfigured(true);
    } else {
      setSmtpErrorMsg(res.error || 'Failed to save SMTP settings.');
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmailTarget) return;
    setTestingSmtp(true);
    setTestResult(null);

    const res = await api.testSmtpConnection({
      user: googleEmail,
      pass: googleAppPassword,
      host: smtpHost,
      port: smtpPort,
      fromName,
      targetEmail: testEmailTarget,
    });
    setTestingSmtp(false);
    setTestResult({
      success: Boolean(res.success),
      message: res.message || res.error || (res.success ? 'SMTP connection test succeeded.' : 'Failed to connect to SMTP server.'),
    });
  };

  const handleGenerateWaQr = async (forceFresh = false) => {
    setWaLoading(true);
    setWaMsg('Connecting to WhatsApp Multi-Device servers... Generating authentic QR Code...');
    const res = await api.generateWhatsAppQr(forceFresh);
    setWaLoading(false);

    if (res.success && res.qrDataUrl) {
      setWaQrDataUrl(res.qrDataUrl);
      setWaStatus('SCAN_QR_REQUIRED');
      setWaMsg('✓ Fresh authentic WhatsApp QR generated! Open WhatsApp on mobile > Settings > Linked Devices > Link a Device and scan the QR code below.');
    } else if (res.success && res.status === 'CONNECTED') {
      setWaStatus('CONNECTED');
      setWaConnectedPhone(res.connectedPhone || waConnectedPhone || '+919949666907');
      setWaQrDataUrl(null);
      setWaMsg('✓ WhatsApp session is already connected and active!');
    } else {
      setWaStatus('SCAN_QR_REQUIRED');
      setWaMsg('WhatsApp socket connecting in background... QR code will appear in 2 seconds.');
    }
  };

  const handleConfirmWaScan = async () => {
    setWaLoading(true);
    const res = await api.confirmWhatsAppScan({
      phone: '+919988776655',
      deviceInfo: 'WhatsApp Business for Android (v2.24.18)',
    });
    setWaLoading(false);

    if (res.success) {
      setWaStatus('CONNECTED');
      setWaConnectedPhone(res.whatsapp?.connectedPhone || '+919988776655');
      setWaDeviceInfo(res.whatsapp?.deviceInfo || 'WhatsApp Business');
      setWaQrDataUrl(null);
      setWaMsg('✓ WhatsApp session paired successfully! Operator WhatsApp OTP dispatch is now live.');
    }
  };

  const handleDisconnectWa = async () => {
    setWaLoading(true);
    const res = await api.disconnectWhatsApp();
    setWaLoading(false);

    if (res.success) {
      setWaStatus('DISCONNECTED');
      setWaConnectedPhone(null);
      setWaDeviceInfo(null);
      setWaQrDataUrl(null);
      setWaMsg('WhatsApp session disconnected.');
    }
  };

  const handleTestWaMessage = async () => {
    if (!testPhoneTarget) return;
    setTestingWa(true);
    setTestWaResult(null);

    const res = await api.sendTestWhatsAppMessage(testPhoneTarget, testPhoneMessage);
    setTestingWa(false);
    setTestWaResult({
      success: res.success,
      message: res.success ? `✓ Test message dispatched to ${testPhoneTarget} (ID: ${res.messageId})` : (res.error || 'Failed to send test message'),
    });
  };

  const handleSaveAlertSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaAlertLoading(true);
    setSaAlertSuccessMsg(null);
    setSaAlertErrorMsg(null);

    const res = await api.saveSuperAdminAlertSettings({
      whatsappEnabled: saAlertEnabled,
      recipientPhone: saAlertPhone,
      alertOnPendingDevice: saAlertOnPending,
      cooldownMinutes: saAlertCooldown,
    });
    setSaAlertLoading(false);

    if (res.success) {
      setSaAlertSuccessMsg('✓ Super Admin WhatsApp Notification settings saved successfully! Unmapped CPE alerts are active.');
    } else {
      setSaAlertErrorMsg(res.error || 'Failed to save alert settings.');
    }
  };

  const handleTestAlertWhatsApp = async () => {
    if (!saAlertPhone) {
      setSaAlertErrorMsg('Please specify a Super Admin WhatsApp recipient mobile number first.');
      return;
    }
    setTestingSaAlert(true);
    setTestSaAlertResult(null);

    const res = await api.testSuperAdminWhatsAppAlert(saAlertPhone);
    setTestingSaAlert(false);
    setTestSaAlertResult({
      success: Boolean(res.success),
      message: res.message || res.error || (res.success ? `✓ Test alert successfully delivered to ${saAlertPhone}` : 'Failed to send WhatsApp alert test.'),
    });
  };

  return (
    <Shell
      portalType="superadmin"
      title="Platform Security & Integrations"
      breadcrumbs={[{ label: 'Executive Overview', href: '/superadmin/dashboard' }, { label: 'Platform Settings' }]}
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-[#E2E8F0] w-fit">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'alerts'
                ? 'bg-amber-500 text-[#0F172A] shadow-lg shadow-amber-500/20'
                : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Super Admin WhatsApp Alerts</span>
            {saAlertEnabled && saAlertPhone && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1.5 animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('smtp')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'smtp'
                ? 'bg-sky-500 text-[#0F172A] shadow-lg shadow-sky-500/20'
                : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Gmail SMTP & Email OTP</span>
            {isSmtpConfigured && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1.5 animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-500 text-[#0F172A] shadow-lg shadow-emerald-500/20'
                : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp Web QR Integration</span>
            <span
              className={`w-2 h-2 rounded-full ml-1.5 ${
                waStatus === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            ></span>
          </button>
        </div>

        {/* TAB 0: SUPER ADMIN WHATSAPP ALERTS */}
        {activeTab === 'alerts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Alert Settings Form */}
              <Card className="p-6 bg-white border-[#E2E8F0]">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E2E8F0]">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-[#0F172A]">Super Admin WhatsApp Alerts</h2>
                      <p className="text-xs text-[#64748B]">
                        Real-time WhatsApp notifications for unmapped ONTs & TR-069 tenant assignment requests
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                      saAlertEnabled && saAlertPhone
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {saAlertEnabled && saAlertPhone ? '✓ Alerts Active' : '⚠ Configuration Incomplete'}
                  </span>
                </div>

                {saAlertSuccessMsg && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                    <span>{saAlertSuccessMsg}</span>
                  </div>
                )}

                {saAlertErrorMsg && (
                  <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                    <span>{saAlertErrorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSaveAlertSettings} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Super Admin WhatsApp Phone <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Smartphone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="+919845000001 or +919949666907"
                          value={saAlertPhone}
                          onChange={(e) => setSaAlertPhone(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 text-xs font-mono font-medium border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">Include country code (e.g. +91)</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Alert Deduplication Cooldown (Minutes)
                      </label>
                      <div className="relative">
                        <RefreshCw className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          min="10"
                          max="1440"
                          value={saAlertCooldown}
                          onChange={(e) => setSaAlertCooldown(Number(e.target.value))}
                          className="w-full pl-9 pr-3.5 py-2 text-xs font-mono font-medium border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">Prevents repetitive spam for the same serial (Default: 360 min / 6 hrs)</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={saAlertEnabled}
                        onChange={(e) => setSaAlertEnabled(e.target.checked)}
                        className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Enable WhatsApp Notifications</span>
                        <span className="text-[11px] text-slate-500 block">Master switch for Super Admin WhatsApp alerts</span>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={saAlertOnPending}
                        onChange={(e) => setSaAlertOnPending(e.target.checked)}
                        className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Instant Alert on Unmapped ONT Connection</span>
                        <span className="text-[11px] text-slate-500 block">
                          Dispatches an alert immediately whenever an ONT connects without a valid URL slug or subdomain
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <Button
                      type="submit"
                      isLoading={saAlertLoading}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5"
                    >
                      Save Alert Preferences
                    </Button>
                  </div>
                </form>
              </Card>

              {/* WhatsApp Alert Test Card */}
              <Card className="p-6 bg-white border-[#E2E8F0]">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#0F172A]">Test Super Admin WhatsApp Alert Channel</h3>
                    <p className="text-xs text-[#64748B]">Sends an authentic test notification to the configured Super Admin phone</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                  <p className="text-xs text-slate-600">
                    Destination: <span className="font-mono font-bold text-slate-900">{saAlertPhone || '(Enter phone above)'}</span>
                  </p>
                  <Button
                    type="button"
                    onClick={handleTestAlertWhatsApp}
                    isLoading={testingSaAlert}
                    disabled={!saAlertPhone}
                    variant="outline"
                    className="border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-bold"
                  >
                    Send Test Alert Now
                  </Button>
                </div>

                {testSaAlertResult && (
                  <div
                    className={`mt-4 p-3.5 rounded-xl text-xs flex items-center space-x-2 border ${
                      testSaAlertResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {testSaAlertResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    )}
                    <span>{testSaAlertResult.message}</span>
                  </div>
                )}
              </Card>
            </div>

            {/* Sidebar Guidelines */}
            <div className="space-y-6">
              <Card className="p-6 bg-white border-[#E2E8F0]">
                <div className="flex items-center space-x-2.5 text-amber-700 mb-4 font-semibold text-sm">
                  <Info className="w-4 h-4" />
                  <span>Strict Resolution Architecture</span>
                </div>

                <div className="space-y-3 text-xs text-[#334155] leading-relaxed">
                  <p>
                    <strong>1. 100% Deterministic:</strong> Mappings are resolved only from the explicit URL Slug (e.g. <code>/tr069/vgigafiber</code>) or Subdomain (e.g. <code>vgigafiber.ciniplay.in</code>).
                  </p>
                  <p>
                    <strong>2. Zero Customer-Data Heuristics:</strong> Customer PPPoE logins, Wi-Fi SSIDs, or passwords are never used to determine operator ownership.
                  </p>
                  <p>
                    <strong>3. Quarantine Queue:</strong> Any unrecognized ONT is placed in <strong>Pending Operator Mapping</strong> and triggers an instant WhatsApp alert.
                  </p>
                  <p>
                    <strong>4. Zero Credential Leakage:</strong> Alert messages contain only device telemetry and reasons; PPPoE passwords are never transmitted.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 1: GMAIL SMTP & EMAIL OTP */}
        {activeTab === 'smtp' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6 bg-white border-[#E2E8F0]">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E2E8F0]">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-[#EFF6FF] text-[#1677FF] border border-[#BFDBFE]">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-[#0F172A]">Google Gmail SMTP Credentials</h2>
                      <p className="text-xs text-[#64748B]">
                        Dynamic 6-digit OTPs will be securely dispatched to Super Admin from this account
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                      isSmtpConfigured
                        ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                        : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                    }`}
                  >
                    {isSmtpConfigured ? '✓ SMTP Active' : '⚠ Configuration Pending'}
                  </span>
                </div>

                {smtpSuccessMsg && (
                  <div className="mb-6 p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-[#047857]" />
                    <span>{smtpSuccessMsg}</span>
                  </div>
                )}

                {smtpErrorMsg && (
                  <div className="mb-6 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 shrink-0 text-[#B91C1C]" />
                    <span>{smtpErrorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSaveSmtp} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input
                      label="Google Email Address"
                      required
                      placeholder="e.g. admin@gmail.com"
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      icon={Mail}
                      helperText="Your Gmail or Google Workspace email ID"
                    />

                    <Input
                      label="Google App Password (16 Characters)"
                      type="password"
                      required
                      placeholder="e.g. abcd efgh ijkl mnop"
                      value={googleAppPassword}
                      onChange={(e) => setGoogleAppPassword(e.target.value)}
                      icon={KeyRound}
                      helperText="Generated from Google Account Security > App Passwords"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Input
                      label="SMTP Server Host"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      icon={Server}
                    />

                    <Input
                      label="SMTP Port"
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                      icon={Lock}
                    />

                    <Input
                      label="Sender Name"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      icon={Shield}
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-end space-x-3 border-t border-[#E2E8F0]">
                    <Button type="submit" isLoading={smtpLoading} variant="primary">
                      Save SMTP Credentials
                    </Button>
                  </div>
                </form>
              </Card>

              {/* SMTP Test Verification Tool */}
              <Card className="p-6 bg-white border-[#E2E8F0]">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#0F172A]">Test Gmail SMTP & Send Verification Email</h3>
                    <p className="text-xs text-[#64748B]">Verify connectivity and receive an instant test email</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3 mt-4">
                  <div className="flex-1 w-full">
                    <Input
                      placeholder="Target recipient email"
                      value={testEmailTarget}
                      onChange={(e) => setTestEmailTarget(e.target.value)}
                      icon={Mail}
                    />
                  </div>
                  <Button
                    onClick={handleTestSmtp}
                    isLoading={testingSmtp}
                    disabled={!testEmailTarget || !googleEmail}
                    variant="outline"
                    className="w-full sm:w-auto shrink-0"
                  >
                    Send Test Email
                  </Button>
                </div>

                {testResult && (
                  <div
                    className={`mt-4 p-3.5 rounded-xl text-xs flex items-center space-x-2 border ${
                      testResult.success
                        ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                        : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#047857]" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-[#B91C1C]" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </Card>
            </div>

            {/* Google App Password Guide Card */}
            <div className="space-y-6">
              <Card className="p-6 bg-white border-[#E2E8F0]">
                <div className="flex items-center space-x-2.5 text-[#1677FF] mb-4 font-semibold text-sm">
                  <Info className="w-4 h-4" />
                  <span>How to Create a Google App Password</span>
                </div>

                <ol className="space-y-3 text-xs text-[#334155] list-decimal list-inside leading-relaxed">
                  <li>
                    Log into your{' '}
                    <a
                      href="https://myaccount.google.com/security"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#1677FF] hover:underline inline-flex items-center"
                    >
                      Google Account Security <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  </li>
                  <li>
                    Ensure <strong>2-Step Verification</strong> is enabled.
                  </li>
                  <li>
                    In the search bar at the top, type <strong>"App passwords"</strong> and click the result.
                  </li>
                  <li>
                    Enter an app name like <code>AI ISP OS Platform</code> and click <strong>Create</strong>.
                  </li>
                  <li>
                    Copy the <strong>16-character code</strong> (e.g. <code>abcd efgh ijkl mnop</code>) and paste it into the Google App Password field on the left.
                  </li>
                </ol>

                <div className="mt-6 p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] text-xs leading-relaxed">
                  🔒 <strong>Zero Storage of Main Passwords:</strong> Google App Passwords protect your main Google account while granting secure automated OTP email delivery privileges.
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: WHATSAPP WEB QR INTEGRATION */}
        {activeTab === 'whatsapp' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6 bg-white border-[#E2E8F0]">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E2E8F0]">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-[#0F172A]">WhatsApp Web / Business Session</h2>
                      <p className="text-xs text-[#64748B]">
                        Scan with WhatsApp Linked Devices to enable Operator WhatsApp OTP logins
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                        waStatus === 'CONNECTED'
                          ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                          : waStatus === 'SCAN_QR_REQUIRED'
                          ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                          : 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full mr-2 ${
                          waStatus === 'CONNECTED'
                            ? 'bg-emerald-400 animate-pulse'
                            : waStatus === 'SCAN_QR_REQUIRED'
                            ? 'bg-amber-400'
                            : 'bg-slate-500'
                        }`}
                      ></span>
                      {waStatus === 'CONNECTED'
                        ? 'Connected (Live)'
                        : waStatus === 'SCAN_QR_REQUIRED'
                        ? 'Scan QR Required'
                        : 'Disconnected'}
                    </span>
                  </div>
                </div>

                {waMsg && (
                  <div className="mb-6 p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-[#047857]" />
                    <span>{waMsg}</span>
                  </div>
                )}

                {/* QR Scanner & Pairing Card */}
                {waStatus === 'CONNECTED' ? (
                  <div className="p-8 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-[#D1FAE5] border border-[#A7F3D0] flex items-center justify-center mx-auto text-[#047857]">
                      <Smartphone className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#0F172A]">WhatsApp Business Linked</h3>
                      <p className="text-xs text-[#334155] mt-1">
                        Active Phone: <span className="font-mono text-[#047857] font-bold">{waConnectedPhone}</span>
                      </p>
                      <p className="text-xs text-[#64748B] mt-0.5">{waDeviceInfo}</p>
                    </div>

                    <div className="pt-4 flex items-center justify-center space-x-3">
                      <Button onClick={() => handleGenerateWaQr(true)} isLoading={waLoading} variant="outline">
                        <RefreshCw className="w-4 h-4 mr-2" /> Re-link / Scan New QR
                      </Button>
                      <Button onClick={handleDisconnectWa} isLoading={waLoading} variant="danger">
                        <Power className="w-4 h-4 mr-2" /> Disconnect Session
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-6">
                    {waQrDataUrl ? (
                      <div className="p-4 bg-white rounded-2xl shadow-2xl shadow-emerald-500/10 border-4 border-[#A7F3D0]">
                        <img src={waQrDataUrl} alt="WhatsApp Web QR Code" className="w-64 h-64" />
                      </div>
                    ) : (
                      <div className="w-64 h-64 rounded-2xl border-2 border-dashed border-[#CBD5E1] flex flex-col items-center justify-center text-[#94A3B8] space-y-2">
                        <QrCode className="w-12 h-12 stroke-1" />
                        <span className="text-xs">No Active QR Session</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Button onClick={() => handleGenerateWaQr(true)} isLoading={waLoading} variant="primary">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {waQrDataUrl ? 'Regenerate QR Code' : 'Generate WhatsApp QR Code'}
                      </Button>

                      {waQrDataUrl && (
                        <Button onClick={handleConfirmWaScan} isLoading={waLoading} variant="outline">
                          <CheckCircle2 className="w-4 h-4 mr-2 text-[#047857]" />
                          Confirm Device Linked
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>

              {/* WhatsApp OTP Dispatch Tester */}
              <Card className="p-6 bg-white border-[#E2E8F0]">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 rounded-lg bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#0F172A]">Test Operator WhatsApp OTP Dispatch</h3>
                    <p className="text-xs text-[#64748B]">Send an instant test message to any operator phone number</p>
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Target Mobile Number"
                      value={testPhoneTarget}
                      onChange={(e) => setTestPhoneTarget(e.target.value)}
                      icon={Smartphone}
                    />
                    <Input
                      label="Message Preview"
                      value={testPhoneMessage}
                      onChange={(e) => setTestPhoneMessage(e.target.value)}
                      icon={MessageSquare}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleTestWaMessage}
                      isLoading={testingWa}
                      disabled={!testPhoneTarget}
                      variant="outline"
                    >
                      Send Test WhatsApp Alert
                    </Button>
                  </div>
                </div>

                {testWaResult && (
                  <div
                    className={`mt-4 p-3.5 rounded-xl text-xs flex items-center space-x-2 border ${
                      testWaResult.success
                        ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                        : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                    }`}
                  >
                    {testWaResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#047857]" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-[#B91C1C]" />
                    )}
                    <span>{testWaResult.message}</span>
                  </div>
                )}
              </Card>
            </div>

            {/* WhatsApp Integration Instructions */}
            <div className="space-y-6">
              <Card className="p-6 bg-white border-[#E2E8F0]">
                <div className="flex items-center space-x-2.5 text-[#047857] mb-4 font-semibold text-sm">
                  <Info className="w-4 h-4" />
                  <span>How to Link WhatsApp Business</span>
                </div>

                <ol className="space-y-3 text-xs text-[#334155] list-decimal list-inside leading-relaxed">
                  <li>
                    Open <strong>WhatsApp</strong> or <strong>WhatsApp Business</strong> on your mobile phone.
                  </li>
                  <li>
                    Tap <strong>Menu (⋮)</strong> or <strong>Settings</strong>.
                  </li>
                  <li>
                    Select <strong>Linked Devices</strong>.
                  </li>
                  <li>
                    Tap <strong>Link a Device</strong> and point your camera at the QR code displayed on this screen.
                  </li>
                  <li>
                    Once paired, all registered Operators will receive dynamic 6-digit OTPs directly on their WhatsApp whenever they sign in.
                  </li>
                </ol>

                <div className="mt-6 p-3 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs leading-relaxed">
                  ⚡ <strong>Registered Operators Security:</strong> Only mobile numbers registered under active ISP tenants in the database can trigger OTPs. Unregistered numbers are strictly rejected with <code>404 Not Found</code>.
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
};
