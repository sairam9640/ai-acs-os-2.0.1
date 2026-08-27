import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  Radio,
  Wifi,
  Smartphone,
  MapPin,
  Ticket,
  Wrench,
  History,
  Bot,
  RefreshCw,
  Signal,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Power,
  Play,
  Shield,
  Layers,
  Eye,
  EyeOff,
  Cpu,
  Phone,
  Mail,
  Calendar,
  CalendarClock,
  CreditCard,
  MessageSquare,
  Send,
  Plus,
  ArrowRight,
  ChevronRight,
  Clock,
  Sparkles,
  Zap,
  Activity,
  DollarSign,
  FileText,
  Copy,
  ExternalLink,
  ShieldCheck,
  Flame,
  Check,
  AlertCircle,
  Hash,
  Share2,
} from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Tabs, TabItem } from '../../components/ui/Tabs.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button, Input } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../services/api.js';

export const Customer360: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [pendingCommand, setPendingCommand] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Visibility toggles
  const [showPppoePass, setShowPppoePass] = useState(false);
  const [showWifi24Pass, setShowWifi24Pass] = useState(false);
  const [showWifi5gPass, setShowWifi5gPass] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modals
  const [isWifiModalOpen, setIsWifiModalOpen] = useState(false);
  const [wifiForm, setWifiForm] = useState({
    ssid5g: '',
    pass5g: '',
    ssid24: '',
    pass24: '',
  });

  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [renewForm, setRenewForm] = useState({
    billingCycleDays: 30,
    paymentAmount: 699,
    paymentReference: '',
    paymentMode: 'Cash / UPI',
  });

  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    description: '',
    category: 'NO_INTERNET',
    priority: 'high',
  });

  const [isRetriggerModalOpen, setIsRetriggerModalOpen] = useState(false);
  const [retriggerEventType, setRetriggerEventType] = useState('PLAN_EXPIRING_3D');

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fetchCustomer360 = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getCustomer360(id);
      setIsLoading(false);
      if (res.success && res.data) {
        setData(res.data);
        if (res.data.device) {
          setWifiForm({
            ssid5g: res.data.device.wifi5g?.ssid || '',
            pass5g: res.data.device.wifi5g?.password || '',
            ssid24: res.data.device.wifi24?.ssid || '',
            pass24: res.data.device.wifi24?.password || '',
          });
        }
        if (res.data.customer?.servicePlan) {
          setRenewForm({
            billingCycleDays: 30,
            paymentAmount: res.data.customer.servicePlan.price || 699,
            paymentReference: `PAY_${Date.now().toString().slice(-6)}`,
            paymentMode: 'Cash / UPI',
          });
        }
      } else {
        setError(res.error || 'Failed to load Customer 360 profile');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Error fetching customer profile');
    }
  };

  useEffect(() => {
    fetchCustomer360();
  }, [id]);

  const customer = data?.customer;
  const device = data?.device;
  const capabilities = data?.capabilities || {};
  const fiberRoute = data?.fiberRoute;
  const aiBrief = data?.aiDiagnosticBrief || {};
  const messageHistory = data?.messageHistory || [];
  const billingHistory = data?.billingHistory || [];
  const tickets = data?.openTickets || [];
  const pastJobs = data?.pastJobs || [];
  const commands = data?.commandHistory || [];

  // Live Refresh / Summon ONT Telemetry
  const handleSummonLivePoll = async () => {
    if (!device) return;
    try {
      setActionLoading(true);
      const res: any = await api.summonDevice(device._id);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Live telemetry poll triggered! CPE ${device.serialNumber} contacted via TR-069.`,
        });
        fetchCustomer360();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to summon device' });
    } finally {
      setActionLoading(false);
    }
  };

  // Remote Reboot
  const handleRebootDevice = async () => {
    if (!device || !confirm(`Dispatch remote TR-069 reboot command to ONT ${device.serialNumber}?`)) return;
    try {
      setActionLoading(true);
      const res = await api.rebootDevice(device._id);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Reboot command sent to ONT.' });
        fetchCustomer360();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Reboot failed' });
    } finally {
      setActionLoading(false);
    }
  };

  // Wi-Fi Config
  const handleApplyWifi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device) return;
    try {
      setActionLoading(true);
      const res = await api.updateDeviceWifi(device._id, {
        wifi5g: { ssid: wifiForm.ssid5g, password: wifiForm.pass5g },
        wifi24: { ssid: wifiForm.ssid24, password: wifiForm.pass24 },
      });
      if (res.success) {
        setFeedback({ type: 'success', message: 'Wi-Fi configuration pushed via TR-069!' });
        setIsWifiModalOpen(false);
        fetchCustomer360();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Wi-Fi update failed' });
    } finally {
      setActionLoading(false);
    }
  };

  // Create Quick Support Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    try {
      setActionLoading(true);
      const res: any = await api.createOperatorCustomerTicket(customer._id, ticketForm);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Support ticket ${res.ticket?.ticketNumber || 'created'} logged successfully!`,
        });
        setIsTicketModalOpen(false);
        fetchCustomer360();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create ticket' });
    } finally {
      setActionLoading(false);
    }
  };

  // Renew Plan
  const handleRenewPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    try {
      setActionLoading(true);
      const res: any = await api.renewCustomerPlan(customer._id, renewForm);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Plan renewed for ${customer.fullName}! WhatsApp receipts and events emitted.`,
        });
        setIsRenewModalOpen(false);
        fetchCustomer360();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to renew plan' });
    } finally {
      setActionLoading(false);
    }
  };

  // Retrigger Notification
  const handleRetriggerNotification = async () => {
    if (!customer) return;
    try {
      setActionLoading(true);
      const res: any = await api.retriggerPlanNotification(customer._id, retriggerEventType);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `WhatsApp notification [${retriggerEventType}] re-emitted to ${customer.phone}!`,
        });
        setIsRetriggerModalOpen(false);
        fetchCustomer360();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to retrigger notification' });
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate Remaining Days and Status Badges
  const plan = customer?.servicePlan;
  let remainingDays = 30;
  let isExpired = false;
  let isExpiringSoon = false;
  if (plan?.endDate) {
    const end = new Date(plan.endDate).getTime();
    const now = Date.now();
    remainingDays = Math.ceil((end - now) / 86400000);
    isExpired = remainingDays <= 0;
    isExpiringSoon = remainingDays > 0 && remainingDays <= 3;
  }

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Call Cockpit', icon: Activity },
    { id: 'fiber', label: 'Fiber GIS Route', icon: MapPin },
    { id: 'optical', label: 'Live Optical Power', icon: Signal },
    { id: 'plan', label: 'Active Plan & Expiry', icon: CalendarClock },
    { id: 'billing', label: 'Billing History', icon: CreditCard, count: billingHistory.length },
    { id: 'messages', label: 'WhatsApp History', icon: MessageSquare, count: messageHistory.length },
    { id: 'tickets', label: 'Tickets & Complaints', icon: Ticket, count: tickets.length },
    { id: 'wifi', label: 'Wi-Fi & LAN Clients', icon: Wifi, count: device?.connectedClients?.length || 0 },
  ];

  return (
    <Shell
      portalType="operator"
      title={customer ? `Customer 360° — ${customer.fullName}` : 'Customer 360°'}
      breadcrumbs={[
        { label: 'Customer Directory', href: '/operator/customers' },
        { label: customer?.accountNumber || 'Subscriber 360°' },
      ]}
      primaryAction={
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={() => setIsTicketModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs flex items-center space-x-1"
          >
            <Ticket className="w-3.5 h-3.5 mr-1" />
            <span>Open Complaint</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setIsRenewModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center space-x-1"
          >
            <CreditCard className="w-3.5 h-3.5 mr-1" />
            <span>Renew Plan</span>
          </Button>
          {device && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSummonLivePoll}
              disabled={actionLoading}
              className="text-xs text-sky-700 border-sky-300 hover:bg-sky-50 flex items-center space-x-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${actionLoading ? 'animate-spin' : ''}`} />
              <span>Poll Live ONT</span>
            </Button>
          )}
        </div>
      }
    >
      <StateWrapper
        isLoading={isLoading}
        error={error}
        onRetry={fetchCustomer360}
        pendingCommand={pendingCommand}
      >
        {customer && (
          <div className="space-y-5 max-w-7xl mx-auto pb-12">
            {/* Feedback Alert */}
            {feedback && (
              <div
                className={`p-3.5 rounded-xl flex items-center justify-between border text-xs shadow-xs ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span className="font-medium">{feedback.message}</span>
                </div>
                <button
                  onClick={() => setFeedback(null)}
                  className="text-[11px] underline font-mono ml-4"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* TOP CALL COCKPIT SUMMARY CARD (DESIGNED FOR LIVE CALL SUPPORT) */}
            <Card className="p-5 bg-white border border-slate-200 shadow-sm rounded-2xl">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                {/* Customer Identity */}
                <div className="flex items-center space-x-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-white flex items-center justify-center text-xl font-black shadow-sm">
                    {customer.fullName?.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl font-black text-slate-900">{customer.fullName}</h2>
                      <Badge variant={customer.status === 'active' ? 'success' : 'danger'}>
                        {customer.status?.toUpperCase()}
                      </Badge>
                      {isExpired && (
                        <span className="bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          SUBSCRIPTION EXPIRED
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1 font-mono">
                      <span className="text-sky-600 font-bold bg-sky-50 px-1.5 py-0.5 rounded">
                        {customer.accountNumber}
                      </span>
                      <span>•</span>
                      <span className="text-slate-700">{customer.serviceId}</span>
                      <span>•</span>
                      <a
                        href={`tel:${customer.phone}`}
                        className="flex items-center text-emerald-700 font-semibold hover:underline"
                      >
                        <Phone className="w-3 h-3 mr-1" />
                        {customer.phone}
                      </a>
                      {customer.email && (
                        <>
                          <span>•</span>
                          <span className="text-slate-600">{customer.email}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Diagnostic Gauges */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Optical Power Quick Gauge */}
                  <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center min-w-[110px]">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">RX Optical</span>
                    <span
                      className={`text-base font-black font-mono ${
                        device?.currentRxPowerDbm
                          ? device.currentRxPowerDbm < -27
                            ? 'text-red-600'
                            : device.currentRxPowerDbm < -24
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {device?.currentRxPowerDbm ? `${device.currentRxPowerDbm} dBm` : '-21.4 dBm'}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-sans">
                      {device?.currentRxPowerDbm && device.currentRxPowerDbm < -27 ? 'Critical Loss' : 'Healthy Range'}
                    </span>
                  </div>

                  {/* Active Plan & Expiry Gauge */}
                  <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center min-w-[130px]">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Plan Validity</span>
                    <span
                      className={`text-base font-black font-mono ${
                        isExpired
                          ? 'text-red-600'
                          : isExpiringSoon
                          ? 'text-amber-600'
                          : 'text-sky-700'
                      }`}
                    >
                      {isExpired ? '0 Days (Expired)' : `${remainingDays} Days Left`}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate max-w-[120px]">
                      {plan?.name || 'Broadband 100M'}
                    </span>
                  </div>

                  {/* AI Health Score Gauge */}
                  <div className="px-3.5 py-2 bg-sky-50 border border-sky-200 rounded-xl text-center min-w-[110px]">
                    <span className="text-[10px] font-bold text-sky-800 uppercase flex items-center justify-center">
                      <Bot className="w-3 h-3 mr-1 text-sky-600" />
                      AI Score
                    </span>
                    <span className="text-base font-black text-sky-700 font-mono">
                      {aiBrief.healthScore || 90}/100
                    </span>
                    <span className="text-[10px] text-sky-600 font-semibold block">
                      {aiBrief.connectionState || 'Healthy'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Secondary Details Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-3 text-xs text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Service Address</span>
                  <p className="font-medium text-slate-800 truncate" title={`${customer.address?.street || ''}, ${customer.address?.area || ''}`}>
                    {customer.address?.street || 'Plot 45'}, {customer.address?.area || 'Jubilee Hills'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">PPPoE Username</span>
                  <div className="flex items-center space-x-1">
                    <p className="font-mono font-bold text-slate-900">{customer.wanConfig?.pppoeUsername || 'bsnl_user01'}</p>
                    <button
                      onClick={() => copyToClipboard(customer.wanConfig?.pppoeUsername || 'bsnl_user01', 'pppoeUser')}
                      className="text-slate-400 hover:text-slate-700"
                      title="Copy PPPoE Username"
                    >
                      {copiedField === 'pppoeUser' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">ONT Serial Number</span>
                  <p className="font-mono font-bold text-slate-900">
                    {device?.serialNumber || <span className="text-amber-600 font-sans">Unassigned</span>}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">VLAN Tagging</span>
                  <p className="font-mono font-medium text-slate-800">
                    {customer.wanConfig?.vlanEnabled && customer.wanConfig?.vlanId ? `VID ${customer.wanConfig.vlanId} (Tagged)` : 'Untagged'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Live Call Action</span>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsRetriggerModalOpen(true)}
                      className="h-6 px-2 text-[11px] text-sky-700 border-sky-300 hover:bg-sky-50"
                    >
                      <Send className="w-2.5 h-2.5 mr-1" />
                      <span>WhatsApp Ping</span>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* AI Call Assistant Guidance Banner */}
            <div className="p-3.5 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-sky-900">AI Call Support Insight:</span>
                  <p className="text-sky-800 mt-0.5">
                    {(aiBrief.insights && aiBrief.insights[0]) || 'Optical signal and TR-069 session are normal. Recommended next action: verify Wi-Fi signal quality with subscriber.'}
                  </p>
                </div>
              </div>

              {aiBrief.suggestedActions && aiBrief.suggestedActions.length > 0 && (
                <div className="shrink-0">
                  <Badge variant="purple" className="font-medium text-[11px]">
                    Action: {aiBrief.suggestedActions[0]}
                  </Badge>
                </div>
              )}
            </div>

            {/* Tab Navigation */}
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            {/* TAB 1: CALL COCKPIT (ALL-IN-ONE OVERVIEW) */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Column 1: Live ONT & Wi-Fi */}
                <div className="space-y-4">
                  <Card className="p-4 border border-slate-200 bg-white shadow-xs rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center">
                        <Radio className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
                        Live ONT Telemetry
                      </h3>
                      <Badge variant={device?.status === 'online' ? 'success' : 'neutral'}>
                        {device?.status === 'online' ? 'Online' : 'Offline'}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Model & Vendor</span>
                        <span className="font-semibold text-slate-800">{device?.manufacturer || 'Genexis'} {device?.modelName || 'Titanium-2122A'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Firmware Version</span>
                        <span className="font-mono text-slate-800">{device?.softwareVersion || 'V5R019'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">WAN IP Address</span>
                        <span className="font-mono font-bold text-slate-900">{device?.ipAddress || '100.64.45.12'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">MAC Address</span>
                        <span className="font-mono text-slate-800">{device?.macAddress || '00:E0:4C:11:22:33'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">ONT Uptime</span>
                        <span className="font-mono text-slate-800">{Math.round((device?.uptimeSeconds || 86400) / 3600)} Hours</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsWifiModalOpen(true)}
                        className="w-full text-xs"
                      >
                        <Wifi className="w-3 h-3 mr-1 text-sky-600" />
                        <span>Wi-Fi Setup</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRebootDevice}
                        className="w-full text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                      >
                        <Power className="w-3 h-3 mr-1" />
                        <span>Reboot</span>
                      </Button>
                    </div>
                  </Card>

                  {/* Active Wi-Fi Radios Preview */}
                  <Card className="p-4 border border-slate-200 bg-white shadow-xs rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center">
                        <Wifi className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                        Wi-Fi Credentials
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">Dual-Band</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {/* 2.4G */}
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                        <div className="flex items-center justify-between font-semibold text-slate-800">
                          <span>2.4 GHz: {device?.wifi24?.ssid || 'ApexFiber_2.4G'}</span>
                          <Badge variant="success" className="text-[10px]">Active</Badge>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>Password: {showWifi24Pass ? (device?.wifi24?.password || 'Apex@2026') : '••••••••'}</span>
                          <button
                            onClick={() => setShowWifi24Pass(!showWifi24Pass)}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            {showWifi24Pass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* 5G */}
                      <div className="p-2.5 bg-purple-50/50 rounded-lg border border-purple-100 space-y-1">
                        <div className="flex items-center justify-between font-semibold text-slate-800">
                          <span>5 GHz: {device?.wifi5g?.ssid || 'ApexFiber_5G_HighSpeed'}</span>
                          <Badge variant="purple" className="text-[10px]">Active</Badge>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>Password: {showWifi5gPass ? (device?.wifi5g?.password || 'Apex@5GPass') : '••••••••'}</span>
                          <button
                            onClick={() => setShowWifi5gPass(!showWifi5gPass)}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            {showWifi5gPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Column 2: Physical Fiber Path & Optical Health */}
                <div className="space-y-4">
                  <Card className="p-4 border border-slate-200 bg-white shadow-xs rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                        Physical Fiber Route
                      </h3>
                      <Badge variant="info">
                        Loss: {fiberRoute?.estimatedTotalLossDb || 2.1} dB
                      </Badge>
                    </div>

                    <div className="space-y-2 pt-1">
                      {(fiberRoute?.pathNodes || [
                        { step: 1, name: 'Main Central OLT-01 (Port 1/1)', nodeCode: 'OLT-HYD-01', nodeType: 'OLT', status: 'healthy' },
                        { step: 2, name: 'Primary Fiber Splice Closure 04', nodeCode: 'FJC-SEC-04', nodeType: 'CLOSURE', status: 'healthy' },
                        { step: 3, name: 'FAT Box 12 (1:8 Splitter)', nodeCode: 'FAT-ST-12', nodeType: 'FAT_BOX', status: 'healthy' },
                        { step: 4, name: 'Subscriber Drop ONT', nodeCode: device?.serialNumber || 'ONT-CUST', nodeType: 'ONT', status: 'healthy' },
                      ]).map((node: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center space-x-2.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900">{node.name}</p>
                              <span className="font-mono text-[10px] text-slate-500">{node.nodeCode} ({node.nodeType})</span>
                            </div>
                          </div>
                          <Badge variant="success" className="text-[10px]">{node.status || 'healthy'}</Badge>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTab('fiber')}
                        className="text-xs text-sky-700"
                      >
                        <span>Inspect Full GIS Trace →</span>
                      </Button>
                    </div>
                  </Card>

                  {/* Optical Historical Trend */}
                  <Card className="p-4 border border-slate-200 bg-white shadow-xs rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center">
                        <Signal className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                        Optical Stability
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">Last 20 Changes</span>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto text-xs">
                      {(device?.rxPowerHistory || [
                        { valueDbm: device?.currentRxPowerDbm || -21.4, timestamp: new Date() },
                      ]).slice(0, 5).map((rx: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 text-[11px]">
                          <div className="flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span className="font-mono font-bold text-slate-800">{rx.valueDbm} dBm</span>
                          </div>
                          <span className="text-slate-400 font-mono">{new Date(rx.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Column 3: Tickets, Messages & Billing */}
                <div className="space-y-4">
                  {/* Recent Support Tickets */}
                  <Card className="p-4 border border-slate-200 bg-white shadow-xs rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center">
                        <Ticket className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                        Complaints & Tickets ({tickets.length})
                      </h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsTicketModalOpen(true)}
                        className="h-6 px-2 text-[11px] text-amber-700 border-amber-300"
                      >
                        <Plus className="w-2.5 h-2.5 mr-0.5" />
                        New
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {tickets.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2 text-center">No active complaints or tickets logged.</p>
                      ) : (
                        tickets.map((t: any) => (
                          <div key={t._id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-sky-700">{t.ticketNumber}</span>
                              <Badge variant={t.status === 'resolved' || t.status === 'closed' ? 'success' : 'warning'} className="text-[10px]">
                                {t.status}
                              </Badge>
                            </div>
                            <p className="font-medium text-slate-900 text-[11px]">{t.subject}</p>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {new Date(t.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                  {/* Recent WhatsApp Dispatches */}
                  <Card className="p-4 border border-slate-200 bg-white shadow-xs rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center">
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                        Dispatched WhatsApp Alerts
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">{messageHistory.length} Sent</span>
                    </div>

                    <div className="space-y-2 max-h-44 overflow-y-auto text-xs">
                      {messageHistory.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2 text-center">No recent WhatsApp notification records.</p>
                      ) : (
                        messageHistory.slice(0, 4).map((msg: any) => (
                          <div key={msg._id} className="p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-[10px] bg-slate-200 text-slate-700 px-1 py-0.2 rounded">
                                {msg.templateCode}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(msg.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-700 truncate font-mono mt-0.5">
                              {msg.contentRenderedSanitized}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* TAB 2: PHYSICAL FIBER GIS ROUTE */}
            {activeTab === 'fiber' && (
              <div className="space-y-4">
                <Card className="p-5 border border-slate-200 bg-white shadow-xs rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-emerald-600" />
                        End-to-End Fiber Network Topology & Attenuation Route
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Physical fiber core tracing from OLT chassis port to subscriber ONT.
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="info">
                        Total Distance: {fiberRoute?.totalDistanceMeters || 450} meters
                      </Badge>
                      <Badge variant="success">
                        Calculated Optical Loss: {fiberRoute?.estimatedTotalLossDb || 2.1} dB
                      </Badge>
                    </div>
                  </div>

                  {/* Path Visual Flow */}
                  <div className="space-y-3">
                    {(fiberRoute?.pathNodes || [
                      { step: 1, name: 'Main Central OLT-01 (Port 1/1)', nodeCode: 'OLT-HYD-01', nodeType: 'OLT', status: 'healthy', location: { lat: 17.4399, lng: 78.3980 }, lossDb: 0.1 },
                      { step: 2, name: 'Primary Fiber Splice Closure 04', nodeCode: 'FJC-SEC-04', nodeType: 'CLOSURE', status: 'healthy', location: { lat: 17.4410, lng: 78.3995 }, lossDb: 0.3 },
                      { step: 3, name: 'FAT Box 12 (1:8 PLC Splitter)', nodeCode: 'FAT-ST-12', nodeType: 'FAT_BOX', status: 'healthy', location: { lat: 17.4425, lng: 78.4010 }, lossDb: 1.2 },
                      { step: 4, name: 'Subscriber Drop Cable & ONT', nodeCode: device?.serialNumber || 'ONT-CUST', nodeType: 'ONT', status: 'healthy', location: { lat: 17.4430, lng: 78.4015 }, lossDb: 0.5 },
                    ]).map((node: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                            {node.step || idx + 1}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{node.name}</h4>
                            <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono mt-0.5">
                              <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold">{node.nodeCode}</span>
                              <span>•</span>
                              <span>Type: {node.nodeType}</span>
                              {node.location?.lat && (
                                <>
                                  <span>•</span>
                                  <span>GPS: {node.location.lat.toFixed(4)}, {node.location.lng.toFixed(4)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-mono font-semibold text-slate-700">
                            Loss: +{node.lossDb || 0.2} dB
                          </span>
                          <Badge variant="success">{node.status || 'healthy'}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 3: LIVE OPTICAL POWER */}
            {activeTab === 'optical' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">RX Optical Power</span>
                    <p className="text-3xl font-black text-emerald-700 font-mono">
                      {device?.currentRxPowerDbm || -21.4} dBm
                    </p>
                    <p className="text-[11px] text-slate-400">Carrier Threshold: -27.0 dBm</p>
                  </Card>

                  <Card className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">TX Optical Power</span>
                    <p className="text-3xl font-black text-sky-700 font-mono">
                      {device?.currentTxPowerDbm || 2.2} dBm
                    </p>
                    <p className="text-[11px] text-slate-400">Standard (+0.5 to +5.0 dBm)</p>
                  </Card>

                  <Card className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">Optical Voltage / Current</span>
                    <p className="text-2xl font-black text-slate-800 font-mono">
                      {device?.opticalVoltageV || 3.3} V / {device?.biasCurrentMa || 14.2} mA
                    </p>
                    <p className="text-[11px] text-slate-400">Transceiver Health: Optimal</p>
                  </Card>

                  <Card className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">Hardware Temperature</span>
                    <p className="text-2xl font-black text-slate-800 font-mono">
                      {device?.temperatureC || 44}°C
                    </p>
                    <p className="text-[11px] text-slate-400">CPU / RAM: {device?.cpuUsagePercent || 15}% / {device?.memoryUsagePercent || 40}%</p>
                  </Card>
                </div>

                {/* 20-Point Optical Delta History Table */}
                <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs rounded-xl">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Historical RX Optical Power Readings (Last 20 Significant Changes)
                    </h3>
                    <Badge variant="info">Delta Deduplication Active</Badge>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                          <th className="py-2.5 px-4">#</th>
                          <th className="py-2.5 px-4">RX Power (dBm)</th>
                          <th className="py-2.5 px-4">Optical Status</th>
                          <th className="py-2.5 px-4">Recorded Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {(device?.rxPowerHistory || [
                          { valueDbm: device?.currentRxPowerDbm || -21.4, timestamp: new Date() },
                        ]).map((rx: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-4 font-bold text-emerald-700">{rx.valueDbm} dBm</td>
                            <td className="py-2.5 px-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-sans font-semibold bg-emerald-100 text-emerald-800">
                                Healthy
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">{new Date(rx.timestamp).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 4: ACTIVE PLAN & EXPIRY */}
            {activeTab === 'plan' && (
              <div className="space-y-4">
                <Card className="p-6 border border-slate-200 bg-white shadow-xs rounded-xl space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subscribed Broadband Package</span>
                      <h3 className="text-xl font-black text-slate-900 mt-1">{plan?.name || 'GigaFast 100M Unlimited'}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {plan?.downloadSpeedMbps || 100} Mbps Download / {plan?.uploadSpeedMbps || 100} Mbps Upload
                      </p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className="text-2xl font-black text-emerald-700 font-mono">₹{plan?.price || 699}</span>
                        <span className="text-xs text-slate-400 block">per month</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setIsRenewModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1" />
                        <span>Renew Now</span>
                      </Button>
                    </div>
                  </div>

                  {/* Expiry Window Progress */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-semibold uppercase text-[10px]">Start Date</span>
                      <p className="font-bold text-slate-900 font-mono text-sm mt-1">
                        {plan?.startDate ? new Date(plan.startDate).toISOString().split('T')[0] : '2026-08-01'}
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-semibold uppercase text-[10px]">Expiry Date</span>
                      <p className="font-bold text-sky-900 font-mono text-sm mt-1">
                        {plan?.endDate ? new Date(plan.endDate).toISOString().split('T')[0] : '2026-09-01'}
                      </p>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${isExpired ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                      <span className={`font-semibold uppercase text-[10px] ${isExpired ? 'text-red-700' : 'text-emerald-700'}`}>Remaining Validity</span>
                      <p className={`font-black font-mono text-sm mt-1 ${isExpired ? 'text-red-700' : 'text-emerald-700'}`}>
                        {isExpired ? 'EXPIRED' : `${remainingDays} Days Remaining`}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 5: BILLING HISTORY */}
            {activeTab === 'billing' && (
              <div className="space-y-4">
                <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs rounded-xl">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Subscriber Billing & Payment Records
                    </h3>
                    <Button
                      size="sm"
                      onClick={() => setIsRenewModalOpen(true)}
                      className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Record Payment
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                          <th className="py-2.5 px-4">Date</th>
                          <th className="py-2.5 px-4">Description</th>
                          <th className="py-2.5 px-4">Amount</th>
                          <th className="py-2.5 px-4">Payment Mode</th>
                          <th className="py-2.5 px-4">Receipt / Ref #</th>
                          <th className="py-2.5 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {billingHistory.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                              No billing transactions recorded yet.
                            </td>
                          </tr>
                        ) : (
                          billingHistory.map((b: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 font-mono text-slate-600">
                                {new Date(b.date).toLocaleDateString()}
                              </td>
                              <td className="py-2.5 px-4 font-semibold text-slate-900">{b.description}</td>
                              <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">₹{b.amount}</td>
                              <td className="py-2.5 px-4 text-slate-700">{b.paymentMode}</td>
                              <td className="py-2.5 px-4 font-mono text-slate-600">{b.referenceNumber}</td>
                              <td className="py-2.5 px-4">
                                <Badge variant="success">Paid</Badge>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 6: WHATSAPP MESSAGE HISTORY */}
            {activeTab === 'messages' && (
              <div className="space-y-4">
                <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs rounded-xl">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Dispatched WhatsApp Notifications
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Log of carrier WhatsApp events dispatched to {customer.phone}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsRetriggerModalOpen(true)}
                      className="h-7 text-xs text-sky-700 border-sky-300 hover:bg-sky-50"
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Retrigger Notification
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                          <th className="py-2.5 px-4">Event Type</th>
                          <th className="py-2.5 px-4">Rendered Message Preview</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4">Sent At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {messageHistory.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                              No WhatsApp messages logged for this customer.
                            </td>
                          </tr>
                        ) : (
                          messageHistory.map((m: any) => (
                            <tr key={m._id} className="hover:bg-slate-50">
                              <td className="py-3 px-4">
                                <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                                  {m.templateCode}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-800 max-w-md truncate">
                                {m.contentRenderedSanitized}
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant={m.status === 'sent' || m.status === 'delivered' ? 'success' : 'warning'}>
                                  {m.status}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                                {new Date(m.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 7: TICKETS & COMPLAINTS */}
            {activeTab === 'tickets' && (
              <div className="space-y-4">
                <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs rounded-xl">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Support Complaints & Trouble Tickets Timeline
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Historical incidents, complaints, and resolution logs
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setIsTicketModalOpen(true)}
                      className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Log Complaint
                    </Button>
                  </div>

                  <div className="p-4 space-y-3">
                    {tickets.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-6 text-center">
                        No support tickets or complaints recorded for this customer.
                      </p>
                    ) : (
                      tickets.map((t: any) => (
                        <div key={t._id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded text-xs">
                                {t.ticketNumber}
                              </span>
                              <h4 className="font-bold text-slate-900 text-sm">{t.subject}</h4>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={t.priority === 'urgent' ? 'danger' : t.priority === 'high' ? 'warning' : 'neutral'}>
                                {t.priority?.toUpperCase()}
                              </Badge>
                              <Badge variant={t.status === 'resolved' || t.status === 'closed' ? 'success' : 'warning'}>
                                {t.status?.toUpperCase()}
                              </Badge>
                            </div>
                          </div>

                          <p className="text-xs text-slate-700 leading-relaxed">{t.description}</p>

                          <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-200 text-[11px] text-slate-500 font-mono">
                            <span>Category: <strong>{t.category}</strong></span>
                            <span>Created: {new Date(t.createdAt).toLocaleString()}</span>
                            {t.assignedToUserId && <span>Assigned: <strong>{t.assignedToUserId.fullName}</strong></span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 8: WI-FI & CLIENTS */}
            {activeTab === 'wifi' && device && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 2.4 GHz */}
                  <Card className="p-5 border border-slate-200 bg-white shadow-xs rounded-xl space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h3 className="font-bold text-slate-900 text-xs uppercase">2.4 GHz Wi-Fi Radio</h3>
                      <Badge variant={device.wifi24?.enabled ? 'success' : 'neutral'}>
                        {device.wifi24?.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">SSID Name</span>
                        <span className="font-bold text-slate-900">{device.wifi24?.ssid || 'ApexFiber_2.4G'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Channel / Bandwidth</span>
                        <span className="font-mono text-slate-800">Channel {device.wifi24?.channel || 6} (20 MHz)</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Security</span>
                        <span className="font-medium text-slate-800">{device.wifi24?.securityMode || 'WPA2-PSK'}</span>
                      </div>
                    </div>
                  </Card>

                  {/* 5 GHz */}
                  <Card className="p-5 border border-slate-200 bg-white shadow-xs rounded-xl space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h3 className="font-bold text-slate-900 text-xs uppercase">5 GHz AC/AX Wi-Fi Radio</h3>
                      <Badge variant={device.wifi5g?.enabled ? 'purple' : 'neutral'}>
                        {device.wifi5g?.enabled ? 'High-Speed Active' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">SSID Name</span>
                        <span className="font-bold text-slate-900">{device.wifi5g?.ssid || 'ApexFiber_5G'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Channel / Bandwidth</span>
                        <span className="font-mono text-slate-800">Channel {device.wifi5g?.channel || 44} (80 MHz)</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Security</span>
                        <span className="font-medium text-slate-800">{device.wifi5g?.securityMode || 'WPA2-PSK'}</span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Connected Clients */}
                <Card className="p-5 border border-slate-200 bg-white shadow-xs rounded-xl space-y-3">
                  <h3 className="font-bold text-slate-900 text-xs uppercase">Connected LAN & WLAN Devices</h3>
                  <div className="space-y-2">
                    {(device.connectedClients || [
                      { hostname: 'Vikram-iPhone15', mac: 'BC:D0:74:11:22:33', ip: '192.168.1.101', interfaceType: '5GHz Wi-Fi', isBlocked: false },
                      { hostname: 'Samsung-SmartTV', mac: '00:1A:7D:AA:BB:CC', ip: '192.168.1.102', interfaceType: 'Ethernet LAN1', isBlocked: false },
                    ]).map((client: any) => (
                      <div key={client.mac} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-3">
                          <Smartphone className="w-4 h-4 text-sky-600" />
                          <div>
                            <p className="font-bold text-slate-900">{client.hostname || 'Client Device'}</p>
                            <span className="font-mono text-[11px] text-slate-500">{client.mac} • {client.ip} • {client.interfaceType}</span>
                          </div>
                        </div>
                        <Badge variant="success">Active</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
      </StateWrapper>

      {/* MODAL: CREATE QUICK COMPLAINT / SUPPORT TICKET */}
      <Modal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        title={`Log Support Complaint — ${customer?.fullName || 'Subscriber'}`}
        subtitle="Log customer complaint during live call and assign severity."
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Issue Subject *</label>
            <input
              type="text"
              required
              placeholder="e.g. Optical signal red light / Frequent Wi-Fi disconnect"
              value={ticketForm.subject}
              onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={ticketForm.category}
                onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="NO_INTERNET">NO_INTERNET (LOS / Red Light)</option>
                <option value="SLOW_SPEED">SLOW_SPEED (Speed Degradation)</option>
                <option value="WIFI_ISSUE">WIFI_ISSUE (Range / Disconnect)</option>
                <option value="BILLING">BILLING (Payment / Plan Issue)</option>
                <option value="RELOCATION">RELOCATION (Address Shift)</option>
                <option value="GENERAL">GENERAL (Other Inquiry)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority Severity</label>
              <select
                value={ticketForm.priority}
                onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
              >
                <option value="urgent">URGENT (Service Complete Down)</option>
                <option value="high">HIGH (Severe Intermittent)</option>
                <option value="medium">MEDIUM (Normal Support)</option>
                <option value="low">LOW (General Inquiry)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Description & Notes</label>
            <textarea
              rows={3}
              placeholder="Provide caller observations, troubleshooting performed, etc."
              value={ticketForm.description}
              onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsTicketModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading} className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold">
              Submit Ticket
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: RENEW PLAN & COLLECT PAYMENT */}
      <Modal
        isOpen={isRenewModalOpen}
        onClose={() => setIsRenewModalOpen(false)}
        title={`Renew Plan — ${customer?.fullName || 'Subscriber'}`}
        subtitle="Extend validity and record payment receipt."
      >
        <form onSubmit={handleRenewPlan} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Amount Paid (₹) *</label>
              <input
                type="number"
                required
                min={0}
                value={renewForm.paymentAmount}
                onChange={(e) => setRenewForm({ ...renewForm, paymentAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold text-emerald-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Extension Period (Days) *</label>
              <input
                type="number"
                required
                min={1}
                value={renewForm.billingCycleDays}
                onChange={(e) => setRenewForm({ ...renewForm, billingCycleDays: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={renewForm.paymentMode}
                onChange={(e) => setRenewForm({ ...renewForm, paymentMode: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="Cash / UPI">Cash / UPI</option>
                <option value="Online Payment Gateway">Online Gateway</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Ref / Receipt #</label>
              <input
                type="text"
                value={renewForm.paymentReference}
                onChange={(e) => setRenewForm({ ...renewForm, paymentReference: e.target.value })}
                placeholder="e.g. UPI-998822"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs text-emerald-800">
            <div className="flex items-center space-x-1 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Instant WhatsApp Receipt:</span>
            </div>
            <p className="mt-0.5 text-[11px] text-emerald-700">
              Dispatches <strong>PLAN_RENEWED</strong> & <strong>PAYMENT_RECEIVED</strong> WhatsApp receipts automatically.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsRenewModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Confirm & Renew
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: WI-FI RECONFIGURATION */}
      <Modal
        isOpen={isWifiModalOpen}
        onClose={() => setIsWifiModalOpen(false)}
        title="Reconfigure Subscriber Wi-Fi"
        subtitle="Pushes changes via TR-069 session."
      >
        <form onSubmit={handleApplyWifi} className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800">5 GHz Wi-Fi Settings</h4>
            <Input
              label="5 GHz SSID Name"
              value={wifiForm.ssid5g}
              onChange={(e) => setWifiForm({ ...wifiForm, ssid5g: e.target.value })}
            />
            <Input
              label="5 GHz Password"
              type="text"
              value={wifiForm.pass5g}
              onChange={(e) => setWifiForm({ ...wifiForm, pass5g: e.target.value })}
            />
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-800">2.4 GHz Wi-Fi Settings</h4>
            <Input
              label="2.4 GHz SSID Name"
              value={wifiForm.ssid24}
              onChange={(e) => setWifiForm({ ...wifiForm, ssid24: e.target.value })}
            />
            <Input
              label="2.4 GHz Password"
              type="text"
              value={wifiForm.pass24}
              onChange={(e) => setWifiForm({ ...wifiForm, pass24: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsWifiModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading} className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold">
              Apply via TR-069
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: RETRIGGER WHATSAPP NOTIFICATION */}
      <Modal
        isOpen={isRetriggerModalOpen}
        onClose={() => setIsRetriggerModalOpen(false)}
        title="Retrigger WhatsApp Notification"
        subtitle={`Dispatch notification event to ${customer?.phone}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Event Type</label>
            <select
              value={retriggerEventType}
              onChange={(e) => setRetriggerEventType(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold"
            >
              <option value="PLAN_EXPIRING_1D">PLAN_EXPIRING_1D (1 Day / Tomorrow Notice)</option>
              <option value="PLAN_EXPIRING_3D">PLAN_EXPIRING_3D (3 Days Notice)</option>
              <option value="PLAN_EXPIRING_7D">PLAN_EXPIRING_7D (7 Days Notice)</option>
              <option value="PLAN_EXPIRED">PLAN_EXPIRED (Lapsed Notice)</option>
              <option value="PLAN_ACTIVATED">PLAN_ACTIVATED (Welcome Notice)</option>
              <option value="PLAN_RENEWED">PLAN_RENEWED (Renewal Confirmation)</option>
              <option value="PAYMENT_RECEIVED">PAYMENT_RECEIVED (Payment Receipt)</option>
            </select>
          </div>

          <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-900">
            <p className="text-[11px]">
              This explicit trigger overrides deduplication rules and sends the WhatsApp message to <strong>{customer?.phone}</strong> immediately.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsRetriggerModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={handleRetriggerNotification}
              disabled={actionLoading}
              className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold flex items-center space-x-1"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              <span>Retrigger Now</span>
            </Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
};
