import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  PhoneCall,
  User,
  Radio,
  Wifi,
  MapPin,
  CalendarClock,
  CreditCard,
  MessageSquare,
  Ticket,
  Wrench,
  Shield,
  RefreshCw,
  Power,
  RotateCcw,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  EyeOff,
  Send,
  Plus,
  ArrowRight,
  Sparkles,
  Server,
  Layers,
  ChevronRight,
  TrendingUp,
  FileText,
  Camera,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  Laptop,
  Smartphone,
  Globe,
  Network,
  HardDrive,
} from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../services/api.js';

export const Customer360: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'cockpit' | 'fiber' | 'optical' | 'assets' | 'documents' | 'timeline' | 'whatsapp' | 'tickets' | 'billing' | 'reports'
  >('cockpit');

  // Security & PII Unmasking
  const [isUnmasked, setIsUnmasked] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals State
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({ title: '', category: 'NO_INTERNET', priority: 'high', description: '' });

  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [renewForm, setRenewForm] = useState({ validityDays: 30, paymentAmount: 699, paymentMode: 'CASH', paymentReference: '' });

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppForm, setWhatsAppForm] = useState({ eventType: 'PAYMENT_RECEIVED', message: '' });

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState({
    name: 'Customer Premise ONT Installation',
    category: 'INSTALLATION_PHOTO',
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=60',
  });

  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetForm, setAssetForm] = useState({
    category: 'ONT',
    serialNumber: '',
    brand: 'Genexis',
    modelName: 'Titanium-2122A',
  });

  // Timeline Filter
  const [timelineFilter, setTimelineFilter] = useState('ALL');

  // Document Lightbox
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Action Loading
  const [actionLoading, setActionLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [isRefreshingOnt, setIsRefreshingOnt] = useState(false);

  const handleRefreshOntLive = async () => {
    if (!data?.device?._id) return;
    setIsRefreshingOnt(true);
    try {
      await api.post(`/operator/devices/${data.device._id}/poll-live`);
      setFeedback({ type: 'success', message: 'Requested real-time telemetry and connected devices from ONT via TR-069.' });
      setTimeout(async () => {
        await fetch360Data();
        setIsRefreshingOnt(false);
      }, 2500);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to dispatch live ONT poll' });
      setIsRefreshingOnt(false);
    }
  };

  const fetch360Data = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await api.getCustomer360(id);
      setIsLoading(false);
      if (res.success && res.data) {
        setData(res.data);
        if (res.data.customer?.servicePlan?.price) {
          setRenewForm((prev) => ({ ...prev, paymentAmount: res.data.customer.servicePlan.price }));
        }
      } else {
        setError(res.error || 'Failed to load customer details');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Error fetching customer data');
    }
  };

  useEffect(() => {
    fetch360Data();
  }, [id]);

  // Actions
  const handleToggleUnmask = async () => {
    if (!isUnmasked && id) {
      try {
        await api.logCustomerUnmaskAudit(id, 'PPPOE_PASSWORD_AND_DOCUMENTS');
      } catch {}
    }
    setIsUnmasked(!isUnmasked);
  };

  const handleSummonOnt = async () => {
    if (!data?.device?._id) return alert('No ONT bound to this customer.');
    setActionLoading(true);
    try {
      await api.summonDevice(data.device._id);
      setFeedback({ type: 'success', message: 'TR-069 Connection Request dispatched to ONT successfully!' });
      fetch360Data();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to poll ONT' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRebootOnt = async () => {
    if (!data?.device?._id) return alert('No ONT bound to this customer.');
    if (!confirm(`Are you sure you want to reboot ONT ${data.device.serialNumber}?`)) return;
    setActionLoading(true);
    try {
      await api.rebootDevice(data.device._id);
      setFeedback({ type: 'success', message: `Reboot command sent to ONT ${data.device.serialNumber}` });
      fetch360Data();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to reboot ONT' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await api.createOperatorCustomerTicket(id, ticketForm);
      setIsTicketModalOpen(false);
      setFeedback({ type: 'success', message: 'Support ticket logged and assigned successfully!' });
      fetch360Data();
    } catch (err: any) {
      alert('Error creating ticket: ' + err.message);
    }
  };

  const handleRenewPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await api.renewCustomerPlan(id, renewForm);
      setIsRenewModalOpen(false);
      setFeedback({ type: 'success', message: 'Plan renewed and payment recorded successfully!' });
      fetch360Data();
    } catch (err: any) {
      alert('Error renewing plan: ' + err.message);
    }
  };

  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await api.retriggerPlanNotification(id, whatsAppForm.eventType);
      setIsWhatsAppModalOpen(false);
      setFeedback({ type: 'success', message: `WhatsApp alert (${whatsAppForm.eventType}) dispatched!` });
      fetch360Data();
    } catch (err: any) {
      alert('Error dispatching WhatsApp: ' + err.message);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await api.uploadCustomerDocument(id, docForm);
      setIsDocModalOpen(false);
      setFeedback({ type: 'success', message: 'Document uploaded to subscriber vault successfully!' });
      fetch360Data();
    } catch (err: any) {
      alert('Upload error: ' + err.message);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!id || !confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.deleteCustomerDocument(id, docId);
      setFeedback({ type: 'success', message: 'Document deleted successfully.' });
      fetch360Data();
    } catch (err: any) {
      alert('Delete error: ' + err.message);
    }
  };

  const handleAssignAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await api.assignCustomerAsset(id, assetForm);
      setIsAssetModalOpen(false);
      setFeedback({ type: 'success', message: 'Hardware asset assigned to subscriber successfully!' });
      fetch360Data();
    } catch (err: any) {
      alert('Asset assign error: ' + err.message);
    }
  };

  const customer = data?.customer;
  const device = data?.device;
  const plan = customer?.servicePlan;
  const reports = data?.operationalReports;
  const assets = data?.assignedAssets;

  // Expiry Calculations
  let remainingDays = 0;
  let isExpired = false;
  if (plan?.endDate) {
    const end = new Date(plan.endDate).getTime();
    remainingDays = Math.ceil((end - Date.now()) / 86400000);
    isExpired = remainingDays <= 0;
  }

  // Optical Signal Gauge Color
  const rxPower = device?.currentRxPowerDbm != null ? Number(device.currentRxPowerDbm) : null;
  const opticalColor =
    rxPower == null ? 'text-slate-400' : rxPower >= -20 ? 'text-emerald-600' : rxPower >= -24 ? 'text-sky-600' : rxPower >= -27 ? 'text-amber-600' : 'text-rose-600';

  const filteredTimeline = (data?.timeline || []).filter((item: any) => {
    if (timelineFilter === 'ALL') return true;
    return item.type === timelineFilter;
  });

  return (
    <Shell
      portalType="operator"
      title="Customer Operations Workspace"
      breadcrumbs={[{ label: 'Customers', href: '/operator/customers' }, { label: customer?.fullName || 'Customer Profile' }]}
    >
      <StateWrapper isLoading={isLoading} error={error} onRetry={fetch360Data}>
        <div className="space-y-5 max-w-7xl mx-auto pb-16 font-sans">
          {/* TOP QUICK ACTION TOOLBAR */}
          <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Support Cockpit</span>
                <span className="text-xs font-black text-slate-900">{customer?.fullName} ({customer?.accountNumber})</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSummonOnt}
                disabled={actionLoading || !device}
                className="h-7 text-xs font-bold text-sky-700 bg-sky-50 border-sky-200 hover:bg-sky-100"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Poll ONT
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleRebootOnt}
                disabled={actionLoading || !device}
                className="h-7 text-xs font-bold text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reboot ONT
              </Button>

              <Button
                size="sm"
                onClick={() => setIsRenewModalOpen(true)}
                className="h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <CreditCard className="w-3 h-3 mr-1" />
                Renew Plan
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsWhatsAppModalOpen(true)}
                className="h-7 text-xs font-bold text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                WhatsApp Ping
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsTicketModalOpen(true)}
                className="h-7 text-xs font-bold text-amber-800 bg-amber-50 border-amber-200 hover:bg-amber-100"
              >
                <Ticket className="w-3 h-3 mr-1" />
                Log Ticket
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsDocModalOpen(true)}
                className="h-7 text-xs font-bold text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
              >
                <Camera className="w-3 h-3 mr-1" />
                Add Photo/Doc
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleUnmask}
                className="h-7 text-xs font-bold text-slate-700 bg-slate-100 border-slate-300 hover:bg-slate-200"
              >
                {isUnmasked ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                {isUnmasked ? 'Mask PII' : 'Unmask PII'}
              </Button>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl flex items-center justify-between border text-xs ${
                feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                <span className="font-medium">{feedback.message}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="underline font-mono text-[11px]">Dismiss</button>
            </div>
          )}

          {/* TOP VITALS SUMMARY CARD */}
          <Card className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Subscriber Info */}
              <div className="space-y-1 md:border-r border-slate-800 pr-3">
                <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Subscriber Identity</span>
                <h2 className="text-lg font-black text-white truncate">{customer?.fullName}</h2>
                <div className="text-xs font-mono text-slate-300 space-y-0.5">
                  <p>Acc #: {customer?.accountNumber}</p>
                  <p>Phone: {customer?.phone}</p>
                  <p className="truncate">Area: {customer?.address?.area}, {customer?.address?.city}</p>
                </div>
              </div>

              {/* Plan & Expiry */}
              <div className="space-y-1 md:border-r border-slate-800 pr-3">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Subscribed Plan</span>
                <h3 className="text-sm font-black text-white truncate">{plan?.name}</h3>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-black font-mono text-emerald-400">₹{plan?.price || plan?.monthlyFee}</span>
                  <span className="text-xs text-slate-400">/mo</span>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <Badge variant={isExpired ? 'danger' : remainingDays <= 3 ? 'warning' : 'success'} className="text-[10px]">
                    {isExpired ? `Expired (${Math.abs(remainingDays)}d ago)` : `${remainingDays} Days Left`}
                  </Badge>
                  <span className="text-slate-400 text-[11px]">
                    Exp: {plan?.endDate ? new Date(plan.endDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Live Optical Signal */}
              <div className="space-y-1 md:border-r border-slate-800 pr-3">
                <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Live Optical Power</span>
                <div className="flex items-baseline space-x-2">
                  <span className={`text-2xl font-black font-mono ${opticalColor}`}>
                    {rxPower != null ? `${rxPower.toFixed(2)} dBm` : 'N/A'}
                  </span>
                  <Badge variant={device?.status === 'online' ? 'success' : 'neutral'} className="text-[10px]">
                    {device?.status === 'online' ? 'TR-069 Online' : 'Offline'}
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-400 font-mono space-y-0.5">
                  <p>TX Power: {device?.currentTxPowerDbm != null ? `${device.currentTxPowerDbm} dBm` : '2.14 dBm'}</p>
                  <p>Serial: {device?.serialNumber || 'No ONT Bound'}</p>
                </div>
              </div>

              {/* WAN & PPPoE */}
              {(() => {
                const customerInternetWan = (device?.wanProfiles || []).find((p: any) =>
                  p.bearerService === 'INTERNET' || p.serviceType === 'INTERNET' || p.connectionType === 'PPPoE' || /INTERNET|PPP/i.test(p.name || '')
                ) || (device?.wanProfiles || []).find((p: any) => !p.isProtected && p.serviceType !== 'TR069') || device?.wanProfiles?.[0];

                return (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">WAN & IP Session</span>
                    <p className="text-xs font-mono font-bold text-slate-200 truncate">
                      {customerInternetWan?.pppoeUsername || customerInternetWan?.username || device?.pppoeUsername || customer?.wanConfig?.pppoeUsername || `${customer?.accountNumber?.toLowerCase()}@isp`}
                    </p>
                    <div className="text-[11px] text-slate-300 font-mono space-y-0.5">
                      <p>PPPoE Pass: {isUnmasked ? (customer?.wanConfig?.pppoePassword || customerInternetWan?.password || '••••••••') : '••••••••'}</p>
                      <p>VLAN: {customerInternetWan?.vlanId || device?.wanVlan || customer?.wanConfig?.vlanId || 100} • IP: {customerInternetWan?.ipAddress || device?.externalIpAddress || 'No IP Assigned'}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </Card>

          {/* 10 NAVIGATION TABS */}
          <div className="flex items-center space-x-1 border-b border-slate-200 overflow-x-auto pb-0.5 scrollbar-thin text-xs">
            {[
              { id: 'cockpit', label: 'Call Cockpit', icon: PhoneCall },
              { id: 'fiber', label: 'Fiber GIS Route', icon: MapPin },
              { id: 'optical', label: 'Optical & WAN', icon: Radio },
              { id: 'assets', label: `Assigned Assets (${assets?.warehouseItems?.length || 0})`, icon: Layers },
              { id: 'documents', label: `Documents (${data?.documents?.length || 0})`, icon: FileText },
              { id: 'timeline', label: `Timeline (${data?.timeline?.length || 0})`, icon: Clock },
              { id: 'whatsapp', label: `WhatsApp Logs (${data?.messageHistory?.length || 0})`, icon: MessageSquare },
              { id: 'tickets', label: `Tickets (${data?.openTickets?.length || 0})`, icon: Ticket },
              { id: 'billing', label: `Invoices (${data?.billingHistory?.length || 0})`, icon: CreditCard },
              { id: 'reports', label: 'Subscriber Reports', icon: TrendingUp },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-t-xl font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-white border-t-2 border-sky-600 text-sky-700 shadow-xs border-x border-slate-200 -mb-px'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: CALL COCKPIT */}
          {activeTab === 'cockpit' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* AI Diagnostic Brief */}
              <Card className="p-5 bg-gradient-to-br from-sky-50 to-blue-50/50 border border-sky-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase text-sky-900 tracking-wider flex items-center">
                    <Sparkles className="w-4 h-4 mr-1.5 text-sky-600" />
                    AI Support Diagnostics
                  </h3>
                  <Badge variant={data?.aiDiagnosticBrief?.healthScore >= 80 ? 'success' : 'warning'}>
                    Score: {data?.aiDiagnosticBrief?.healthScore || 100}/100
                  </Badge>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-800">Root Cause Analysis:</p>
                  <ul className="space-y-1.5">
                    {(data?.aiDiagnosticBrief?.insights || []).map((ins: string, idx: number) => (
                      <li key={idx} className="text-xs text-slate-700 flex items-start space-x-2 bg-white/80 p-2 rounded-lg border border-sky-100">
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                        <span>{ins}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 pt-1">
                  <p className="text-xs font-bold text-slate-800">Recommended Support Steps:</p>
                  <ul className="space-y-1.5">
                    {(data?.aiDiagnosticBrief?.suggestedActions || []).map((act: string, idx: number) => (
                      <li key={idx} className="text-xs text-slate-800 font-semibold flex items-start space-x-2 bg-white p-2 rounded-lg border border-sky-200">
                        <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              {/* Live Device Telemetry */}
              <Card className="p-5 border border-slate-200 bg-white rounded-2xl shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider flex items-center">
                  <Radio className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
                  CPE Hardware Diagnostics
                </h3>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 font-sans">Device Model:</span>
                    <span className="font-bold text-slate-900">{`${device?.vendor || ''} ${device?.modelName || ''}`.trim() || 'No ONT Bound'}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 font-sans">Serial Number:</span>
                    <span className="font-bold text-slate-900">{device?.serialNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 font-sans">MAC Address:</span>
                    <span className="font-bold text-slate-900">{device?.macAddress || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 font-sans">Firmware Version:</span>
                    <span className="font-bold text-slate-900">{device?.softwareVersion || 'N/A'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-sans">Wi-Fi 2.4 GHz:</span>
                      <span className="font-bold text-slate-900">
                        {device?.wifi24?.ssid || 'N/A'} {device?.wifi24?.channel ? `(Ch ${device.wifi24.channel})` : ''} {device?.wifi24?.enabled !== false ? '• Active' : '• Disabled'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-600">
                      <span className="text-slate-400 font-sans">2.4G Key:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {isUnmasked ? (device?.wifi24?.password || '••••••••') : '••••••••'}
                      </span>
                    </div>
                  </div>

                  {(device?.wifi5g || device?.wifi5g?.ssid) && (
                    <div className="p-2.5 bg-slate-50 rounded-lg space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-sans">Wi-Fi 5 GHz:</span>
                        <span className="font-bold text-slate-900">
                          {device?.wifi5g?.ssid || 'N/A'} {device?.wifi5g?.channel ? `(Ch ${device.wifi5g.channel})` : ''} {device?.wifi5g?.enabled !== false ? '• Active' : '• Disabled'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-600">
                        <span className="text-slate-400 font-sans">5G Key:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {isUnmasked ? (device?.wifi5g?.password || '••••••••') : '••••••••'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 font-sans">Connected Clients:</span>
                    <span className="font-bold text-slate-900">
                      {device?.connectedClients?.filter((c: any) => c.connected !== false).length || device?.lanHostCount || 0} Devices Active
                    </span>
                  </div>
                </div>
              </Card>

              {/* Quick Customer Snapshot */}
              <Card className="p-5 border border-slate-200 bg-white rounded-2xl shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider flex items-center">
                  <User className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                  Subscriber Profile & Installation
                </h3>

                <div className="space-y-2 text-xs font-sans">
                  <div className="p-2.5 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold font-mono">Physical Installation Address</span>
                    <p className="font-semibold text-slate-800">
                      {customer?.address?.street}, {customer?.address?.area}, {customer?.address?.city} - {customer?.address?.pincode}
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl space-y-1 font-mono text-[11px]">
                    <span className="text-[10px] text-slate-400 uppercase font-bold font-sans">Fiber Path Terminal</span>
                    <p className="text-slate-800 font-bold">{assets?.fiberTermination?.fatBoxName} (Port #{assets?.fiberTermination?.fatPortNumber})</p>
                    <p className="text-slate-500">Drop Cable: {assets?.fiberTermination?.dropCableLengthMeters}m to Premise</p>
                  </div>

                  <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase font-mono">Lifetime Billing</span>
                      <p className="font-black font-mono text-emerald-900 text-sm">₹{reports?.lifetimeValue?.toLocaleString() || 699}</p>
                    </div>
                    <Badge variant="success">Good Standing</Badge>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: FIBER GIS ROUTE */}
          {activeTab === 'fiber' && (
            <Card className="p-5 border border-slate-200 bg-white rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Passive Optical Network (PON) Fiber Path</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Carrier-grade optical signal path from Central OLT to Customer ONT</p>
                </div>
                <Badge variant="info" className="font-mono text-xs">
                  Total Optical Loss: {data?.fiberRoute?.totalOpticalLossDb?.toFixed(2) || '17.40'} dB
                </Badge>
              </div>

              <div className="relative border-l-2 border-sky-300 ml-4 pl-6 space-y-6 py-2">
                {(data?.fiberRoute?.breakdown || [
                  { step: 1, type: 'OLT', name: 'OLT-CORE-01', port: 'PON 0/1', power: '+3.5 dBm' },
                  { step: 2, type: 'FEEDER_CABLE', name: 'Feeder F-101', distance: '1.2 km', power: '+2.8 dBm' },
                  { step: 3, type: 'PRIMARY_SPLITTER', name: 'Splitter-1:8 (MH-04)', ratio: '1:8 (-10.2 dB)', power: '-7.4 dBm' },
                  { step: 4, type: 'DISTRIBUTION_CABLE', name: 'Dist Cable D-22', distance: '450m', power: '-8.1 dBm' },
                  { step: 5, type: 'FAT_SPLITTER', name: assets?.fiberTermination?.fatBoxName || 'FAT-KORAMANGALA-01', port: `Port #${assets?.fiberTermination?.fatPortNumber || 3}`, power: '-19.5 dBm' },
                  { step: 6, type: 'DROP_CABLE', name: '2-Core Armored Drop', distance: `${assets?.fiberTermination?.dropCableLengthMeters || 45}m`, power: '-19.8 dBm' },
                  { step: 7, type: 'ONT', name: device?.serialNumber || 'Subscriber ONT', power: `${rxPower || -19.8} dBm (Healthy)` },
                ]).map((node: any, idx: number) => (
                  <div key={idx} className="relative flex items-start justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full bg-sky-600 border-2 border-white shadow-xs"></div>
                    <div>
                      <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider font-mono">
                        Step {idx + 1}: {node.type}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs mt-0.5">{node.name}</h4>
                      <p className="text-[11px] text-slate-500 font-mono">{node.port || node.distance || node.ratio || ''}</p>
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-800 bg-white px-2 py-1 rounded border border-slate-200">
                      {node.power || node.powerDbm || '-19.8 dBm'}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* TAB 3: OPTICAL, WAN & CONNECTED DEVICES */}
          {activeTab === 'optical' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Optical Telemetry */}
                <Card className="p-5 border border-slate-200 bg-white rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider flex items-center">
                      <Radio className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
                      Optical Transceiver Telemetry
                    </h3>
                    <Badge variant={rxPower != null ? 'info' : 'neutral'} className="text-[10px] font-mono">
                      {rxPower != null ? 'TR-069 Live PON' : 'Ethernet / Router Mode'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-sans">RX Optical Power</span>
                      <p className={`text-xl font-black ${opticalColor}`}>{rxPower != null ? `${rxPower.toFixed(2)} dBm` : 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-sans">TX Optical Power</span>
                      <p className="text-xl font-black text-slate-800">{device?.currentTxPowerDbm != null ? `${device.currentTxPowerDbm.toFixed(2)} dBm` : 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-sans">Laser Bias Current</span>
                      <p className="text-lg font-black text-slate-800">{device?.biasCurrentMa != null ? `${device.biasCurrentMa} mA` : 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-sans">ONT Temperature</span>
                      <p className="text-lg font-black text-slate-800">{device?.temperatureC != null ? `${device.temperatureC} °C` : 'N/A'}</p>
                    </div>
                  </div>
                </Card>

                {/* PPPoE WAN Interface */}
                {(() => {
                  const customerInternetWan = (device?.wanProfiles || []).find((p: any) =>
                    p.bearerService === 'INTERNET' || p.serviceType === 'INTERNET' || p.connectionType === 'PPPoE' || /INTERNET|PPP/i.test(p.name || '')
                  ) || (device?.wanProfiles || []).find((p: any) => !p.isProtected && p.serviceType !== 'TR069') || device?.wanProfiles?.[0];

                  return (
                    <Card className="p-5 border border-slate-200 bg-white rounded-2xl shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider flex items-center">
                          <Server className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                          PPPoE & WAN Network Interface
                        </h3>
                        <Badge variant={customerInternetWan?.status === 'Connected' || device?.status === 'online' ? 'success' : 'warning'}>
                          {customerInternetWan?.status || (device?.status === 'online' ? 'Connected' : 'Disconnected')}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                          <span className="text-slate-500 font-sans">PPPoE Username:</span>
                          <span className="font-bold text-slate-900">{customerInternetWan?.pppoeUsername || device?.pppoeUsername || customer?.wanConfig?.pppoeUsername || 'Not Configured'}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                          <span className="text-slate-500 font-sans">Assigned External IP:</span>
                          <span className="font-bold text-slate-900">{customerInternetWan?.ipAddress || device?.externalIpAddress || 'No IP Assigned'}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                          <span className="text-slate-500 font-sans">VLAN Tag:</span>
                          <span className="font-bold text-slate-900">{customerInternetWan?.vlanId || device?.wanVlan || customer?.wanConfig?.vlanId || 'Untagged'}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                          <span className="text-slate-500 font-sans">Primary DNS:</span>
                          <span className="font-bold text-slate-900">{customerInternetWan?.primaryDns || customer?.wanConfig?.dnsPrimary || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                          <span className="text-slate-500 font-sans">Secondary DNS:</span>
                          <span className="font-bold text-slate-900">{customerInternetWan?.secondaryDns || customer?.wanConfig?.dnsSecondary || 'N/A'}</span>
                        </div>
                      </div>
                    </Card>
                  );
                })()}
              </div>

              {/* LIVE CONNECTED WI-FI & LAN CLIENTS TABLE */}
              <Card className="overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-xs">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                  <div className="flex items-center space-x-2">
                    <Network className="w-4 h-4 text-sky-600" />
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        Live Connected Devices & Wi-Fi Clients
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-sky-100 text-sky-800 font-mono">
                          {device?.connectedClients?.length || 0} Registered
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Real-time LAN Host table & active Wi-Fi associations direct from router via TR-069</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search Host / IP / MAC..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 w-48 sm:w-60 font-sans"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleRefreshOntLive}
                      disabled={isRefreshingOnt || !device?._id}
                      className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshingOnt ? 'animate-spin' : ''}`} />
                      {isRefreshingOnt ? 'Querying ONT...' : 'Refresh Live from ONT'}
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Device Hostname</th>
                        <th className="py-3 px-4">Connection Interface</th>
                        <th className="py-3 px-4">Assigned IP</th>
                        <th className="py-3 px-4">MAC Address</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Last Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {(() => {
                        const allClients = (device?.connectedClients || []).filter((c: any) => {
                          if (!clientSearch) return true;
                          const q = clientSearch.toLowerCase();
                          return (
                            (c.hostname && c.hostname.toLowerCase().includes(q)) ||
                            (c.ip && c.ip.toLowerCase().includes(q)) ||
                            (c.mac && c.mac.toLowerCase().includes(q))
                          );
                        });

                        if (allClients.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                                <Network className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                <p className="font-semibold text-slate-600">No active client devices detected on LAN/Wi-Fi</p>
                                <p className="text-xs text-slate-400 mt-1">Click "Refresh Live from ONT" to summon real-time host table from router</p>
                              </td>
                            </tr>
                          );
                        }

                        return allClients.map((client: any, idx: number) => {
                          const isWifi5G = client.interfaceType === '5GHz';
                          const isEthernet = client.interfaceType === 'Ethernet';
                          const isOnline = client.connected !== false;

                          const DeviceIcon = client.hostname?.match(/iphone|android|phone|galaxy|redmi|poco|pixel/i)
                            ? Smartphone
                            : client.hostname?.match(/desktop|pc|laptop|macbook|dell|lenovo|hp|thinkpad/i)
                            ? Laptop
                            : client.hostname?.match(/tv|smart|roku|firestick|cast/i)
                            ? HardDrive
                            : Globe;

                          return (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-sans font-bold text-slate-900 flex items-center space-x-2">
                                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                                  <DeviceIcon className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                                    {client.hostname || `Device (${client.mac?.slice(-5) || idx + 1})`}
                                  </p>
                                  <span className="text-[10px] font-mono text-slate-400 font-normal">
                                    {client.isBlocked ? 'Blocked' : 'Authorized Client'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-sans">
                                <Badge
                                  variant={isWifi5G ? 'info' : isEthernet ? 'warning' : 'neutral'}
                                  className="text-[10px]"
                                >
                                  {isWifi5G ? '5 GHz Wi-Fi' : isEthernet ? 'Ethernet LAN' : '2.4 GHz Wi-Fi'}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-800">
                                {client.ip || 'DHCP Dynamic'}
                              </td>
                              <td className="py-3 px-4 text-slate-600 font-semibold">
                                {client.mac || 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-sans ${
                                  isOnline
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                  {isOnline ? 'Connected' : 'Offline'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right text-slate-400 text-[11px] font-sans">
                                {client.lastSeen ? new Date(client.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: ASSIGNED HARDWARE ASSETS */}
          {activeTab === 'assets' && (
            <Card className="overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Physical Hardware Assets Assigned to Subscriber</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Track serial numbers, warranties, and warehouse stock records</p>
                </div>
                <Button size="sm" onClick={() => setIsAssetModalOpen(true)} className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Assign Stock Item
                </Button>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* ONT Card */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sky-700">OPTICAL NETWORK TERMINAL (ONT)</span>
                    <Badge variant={device?.status === 'online' ? 'success' : 'neutral'}>
                      {device?.status === 'online' ? 'Online' : 'Active'}
                    </Badge>
                  </div>
                  <p className="font-bold text-slate-900 text-sm">{assets?.ont?.brand || device?.vendor || ''} {assets?.ont?.model || device?.modelName || 'Premise ONT'}</p>
                  <p className="font-mono text-slate-600">Serial: {assets?.ont?.serialNumber || device?.serialNumber || 'N/A'}</p>
                  <p className="font-mono text-slate-600">MAC: {assets?.ont?.macAddress || device?.macAddress || 'N/A'}</p>
                  <p className="font-mono text-[11px] text-slate-500">Warranty Exp: {assets?.ont?.warrantyExpiry ? new Date(assets.ont.warrantyExpiry).toLocaleDateString() : 'Active'}</p>
                </div>

                {/* Secondary Router Card */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-purple-700">SECONDARY ROUTER / MESH</span>
                    <Badge variant={assets?.secondaryRouter ? 'success' : 'neutral'}>
                      {assets?.secondaryRouter ? 'Assigned' : 'None'}
                    </Badge>
                  </div>
                  <p className="font-bold text-slate-900 text-sm">{assets?.secondaryRouter ? `${assets?.secondaryRouter?.brand} ${assets?.secondaryRouter?.model}` : 'Not Assigned'}</p>
                  <p className="font-mono text-slate-600">Serial: {assets?.secondaryRouter?.serialNumber || 'None'}</p>
                  <p className="font-mono text-[11px] text-slate-500">Status: {assets?.secondaryRouter ? 'Active' : 'Optional'}</p>
                </div>

                {/* SFP Transceiver & Fiber Drop */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-700">SFP PON & FIBER DROP</span>
                    <Badge variant="info">Carrier Grade</Badge>
                  </div>
                  <p className="font-bold text-slate-900 text-sm">Class B+ GPON Optical SFP</p>
                  <p className="font-mono text-slate-600">FAT Terminal: {assets?.fiberTermination?.fatBoxName}</p>
                  <p className="font-mono text-slate-600">Splitter Port: #{assets?.fiberTermination?.fatPortNumber}</p>
                  <p className="font-mono text-[11px] text-slate-500">Drop Cable: {assets?.fiberTermination?.dropCableLengthMeters} meters</p>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 5: CUSTOMER DOCUMENTS & PHOTOS */}
          {activeTab === 'documents' && (
            <Card className="p-5 border border-slate-200 bg-white rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Subscriber Document Vault & Photos</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Aadhaar, CAF forms, and premise installation photo proofs</p>
                </div>
                <Button size="sm" onClick={() => setIsDocModalOpen(true)} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Upload Document / Photo
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {(data?.documents || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic col-span-3 py-6 text-center">No documents or photos uploaded yet.</p>
                ) : (
                  data.documents.map((doc: any) => (
                    <div key={doc.documentId} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 space-y-2 group">
                      <div
                        className="h-36 bg-slate-200 overflow-hidden cursor-pointer relative flex items-center justify-center"
                        onClick={() => setSelectedPhoto(doc.url)}
                      >
                        <img src={doc.url} alt={doc.name} className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-white text-xs font-bold">
                          <Eye className="w-4 h-4 mr-1" /> View Lightbox
                        </div>
                      </div>
                      <div className="p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Badge variant="neutral" className="text-[10px] font-mono">{doc.category}</Badge>
                          <button
                            onClick={() => handleDeleteDocument(doc.documentId)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                            title="Delete Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs truncate">{doc.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {new Date(doc.uploadedAt).toLocaleDateString()} • Verified
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {/* TAB 6: UNIFIED CUSTOMER TIMELINE */}
          {activeTab === 'timeline' && (
            <Card className="p-5 border border-slate-200 bg-white rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Unified 360° Chronological Customer Timeline</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Stream combining billing, WhatsApp, tickets, field jobs, TR-069, and security events</p>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {['ALL', 'BILLING', 'WHATSAPP', 'TICKET', 'FIELD_JOB', 'TR069_COMMAND', 'SECURITY_AUDIT'].map((flt) => (
                    <button
                      key={flt}
                      onClick={() => setTimelineFilter(flt)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all ${
                        timelineFilter === flt ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {flt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-5 py-2">
                {filteredTimeline.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-6 text-center">No timeline events found for this filter.</p>
                ) : (
                  filteredTimeline.map((evt: any) => (
                    <div key={evt.id} className="relative bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-start justify-between">
                      <div className="absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full bg-slate-400 border-2 border-white shadow-xs"></div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant={evt.severity || 'info'} className="text-[10px] font-mono">
                            {evt.type}
                          </Badge>
                          <span className="font-bold text-slate-900 text-xs">{evt.title}</span>
                        </div>
                        <p className="text-xs text-slate-600 font-sans">{evt.subtitle}</p>
                        <span className="text-[10px] text-slate-400 font-mono block">Actor: {evt.actor || 'System'}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                        {new Date(evt.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {/* TAB 7: WHATSAPP DISPATCHES */}
          {activeTab === 'whatsapp' && (
            <Card className="overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Outbound WhatsApp Notification Dispatches</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Receipts, expiry reminders, and payment confirmations</p>
                </div>
                <Button size="sm" onClick={() => setIsWhatsAppModalOpen(true)} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  <Send className="w-3.5 h-3.5 mr-1" />
                  Retrigger WhatsApp
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                      <th className="py-3 px-4">Template / Event</th>
                      <th className="py-3 px-4">Recipient Phone</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Dispatched Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {(data?.messageHistory || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400 italic">No WhatsApp notifications dispatched yet.</td>
                      </tr>
                    ) : (
                      data.messageHistory.map((msg: any) => (
                        <tr key={msg._id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{msg.templateName || msg.type || 'NOTIFICATION'}</td>
                          <td className="py-3 px-4 font-mono text-slate-700">{msg.recipient?.identifier || customer?.phone}</td>
                          <td className="py-3 px-4">
                            <Badge variant={msg.status === 'DELIVERED' || msg.status === 'SENT' ? 'success' : 'danger'}>
                              {msg.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                            {new Date(msg.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 8: TICKETS & COMPLAINTS */}
          {activeTab === 'tickets' && (
            <Card className="overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Subscriber Complaints & Support Tickets</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Active incident timeline and resolution SLAs</p>
                </div>
                <Button size="sm" onClick={() => setIsTicketModalOpen(true)} className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Log New Ticket
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                      <th className="py-3 px-4">Ticket Reference</th>
                      <th className="py-3 px-4">Subject & Category</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Assigned Staff</th>
                      <th className="py-3 px-4">Created Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {(data?.openTickets || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 italic">No support tickets recorded for this customer.</td>
                      </tr>
                    ) : (
                      data.openTickets.map((t: any) => (
                        <tr key={t._id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{t.ticketNumber || t._id.slice(-6)}</td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-800">{t.title || t.subject}</p>
                            <span className="text-[11px] text-slate-400 font-mono">{t.category}</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-rose-700">{t.priority}</td>
                          <td className="py-3 px-4">
                            <Badge variant={t.status === 'resolved' || t.status === 'closed' ? 'success' : 'warning'}>
                              {t.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{t.assignedToUserId?.fullName || 'NOC Queue'}</td>
                          <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 9: BILLING & INVOICES */}
          {activeTab === 'billing' && (
            <Card className="overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Tax Invoices & Payment Ledger</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Official GST receipts and subscription payments</p>
                </div>
                <Button size="sm" onClick={() => setIsRenewModalOpen(true)} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  <CreditCard className="w-3.5 h-3.5 mr-1" />
                  Record Payment
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                      <th className="py-3 px-4">Reference #</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Payment Mode</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {(data?.billingHistory || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400 italic">No payment invoices recorded.</td>
                      </tr>
                    ) : (
                      data.billingHistory.map((b: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.referenceNumber}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{b.description}</td>
                          <td className="py-3 px-4 font-mono font-black text-emerald-700">₹{b.amount}</td>
                          <td className="py-3 px-4 text-slate-600 font-mono">{b.paymentMode}</td>
                          <td className="py-3 px-4">
                            <Badge variant="success">Paid</Badge>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                            {new Date(b.date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <a
                              href={b.receiptUrl || `/api/v1/customer/invoices/${b.referenceNumber}/download`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-xs font-bold text-sky-700 hover:underline"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Print
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 10: SUBSCRIBER REPORTS & AUDIT */}
          {activeTab === 'reports' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card className="p-5 border border-slate-200 bg-white rounded-2xl shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider flex items-center">
                  <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Subscriber Lifetime Value & SLA Performance
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-sans">Customer Lifetime Value (LTV)</span>
                    <p className="text-xl font-black text-emerald-700">₹{reports?.lifetimeValue?.toLocaleString() || 699}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-sans">Average Monthly Spend</span>
                    <p className="text-xl font-black text-slate-800">₹{reports?.averageMonthlyRevenue || 699}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-sans">Total Lifetime Complaints</span>
                    <p className="text-lg font-black text-slate-800">{reports?.totalTicketsCount || 0}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-sans">Average MTTR Resolution</span>
                    <p className="text-lg font-black text-sky-700">{reports?.averageResolutionHours || 2.8} hrs</p>
                  </div>
                </div>
              </Card>

              <Card className="p-5 border border-slate-200 bg-white rounded-2xl shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider flex items-center">
                  <Shield className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                  Security & Audit Trails
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto font-sans">
                  {(data?.auditHistory || []).map((a: any) => (
                    <div key={a._id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 font-mono">{a.action}</span>
                        <span className="text-[10px] text-slate-500 block">By {a.actor?.email || a.actor?.role}</span>
                      </div>
                      <span className="font-mono text-slate-400 text-[10px]">{new Date(a.timestamp).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </StateWrapper>

      {/* MODAL: RENEW PLAN */}
      <Modal
        isOpen={isRenewModalOpen}
        onClose={() => setIsRenewModalOpen(false)}
        title={`Renew Plan for ${customer?.fullName}`}
        subtitle="Extends validity by 30 days and logs formal payment receipt."
      >
        <form onSubmit={handleRenewPlan} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <span className="text-slate-500">Active Plan:</span>
            <p className="font-bold text-slate-900 text-sm">{plan?.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Validity Extension</label>
              <select
                value={renewForm.validityDays}
                onChange={(e) => setRenewForm({ ...renewForm, validityDays: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
              >
                <option value={30}>30 Days (1 Month)</option>
                <option value={90}>90 Days (Quarterly)</option>
                <option value={180}>180 Days (Half-Yearly)</option>
                <option value={365}>365 Days (Annual)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Collected Amount (₹)</label>
              <input
                type="number"
                required
                value={renewForm.paymentAmount}
                onChange={(e) => setRenewForm({ ...renewForm, paymentAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={renewForm.paymentMode}
                onChange={(e) => setRenewForm({ ...renewForm, paymentMode: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
              >
                <option value="CASH">Cash In Hand</option>
                <option value="UPI_DIRECT">Direct UPI (GPay / PhonePe)</option>
                <option value="RAZORPAY">Razorpay</option>
                <option value="CASHFREE">Cashfree</option>
                <option value="PHONEPE">PhonePe PG</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reference / Txn ID</label>
              <input
                type="text"
                placeholder="e.g. UPI-9920199"
                value={renewForm.paymentReference}
                onChange={(e) => setRenewForm({ ...renewForm, paymentReference: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsRenewModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Confirm Plan Renewal
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: LOG TICKET */}
      <Modal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        title="Log Support Complaint Ticket"
        subtitle="Dispatches ticket to NOC queue and field technicians."
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Subject / Summary</label>
            <input
              type="text"
              required
              placeholder="e.g. Optical Loss / Red LOS light on ONT"
              value={ticketForm.title}
              onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={ticketForm.category}
                onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
              >
                <option value="NO_INTERNET">No Internet / LOS Red</option>
                <option value="SLOW_SPEED">Slow Speed / Latency</option>
                <option value="WIFI_COVERAGE">Wi-Fi Range Issue</option>
                <option value="BILLING_DISPUTE">Billing Dispute</option>
                <option value="RELOCATION">Fiber Relocation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
              <select
                value={ticketForm.priority}
                onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical (SLA 2h)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description / Call Notes</label>
            <textarea
              rows={3}
              placeholder="Caller reported connection dropout since morning..."
              value={ticketForm.description}
              onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsTicketModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold">
              Create & Assign Ticket
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: UPLOAD DOCUMENT / PHOTO */}
      <Modal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        title="Upload Subscriber Document / Photo"
        subtitle="Attach KYC proofs, CAF forms, or installation site photos."
      >
        <form onSubmit={handleUploadDocument} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Document Label</label>
            <input
              type="text"
              required
              value={docForm.name}
              onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
            <select
              value={docForm.category}
              onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
            >
              <option value="INSTALLATION_PHOTO">Premise ONT Installation Photo</option>
              <option value="OPTICAL_TERMINATION">FAT Box Splice / Termination Photo</option>
              <option value="AADHAAR_FRONT">Aadhaar Front Card</option>
              <option value="AADHAAR_BACK">Aadhaar Back Card</option>
              <option value="PAN_CARD">PAN Card Document</option>
              <option value="CAF_FORM">Signed CAF Application Form</option>
              <option value="OTHER">Other Document</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Photo / Document URL</label>
            <input
              type="url"
              required
              value={docForm.url}
              onChange={(e) => setDocForm({ ...docForm, url: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsDocModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              Save to Subscriber Vault
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ASSIGN STOCK ASSET */}
      <Modal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        title="Assign Hardware Stock Item"
        subtitle="Binds an inventory item to this customer profile."
      >
        <form onSubmit={handleAssignAsset} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Asset Category</label>
              <select
                value={assetForm.category}
                onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
              >
                <option value="ONT">ONT Terminal</option>
                <option value="ROUTER">Wi-Fi 6 Router</option>
                <option value="SFP_TRANSCEIVER">SFP Optical Module</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Serial Number</label>
              <input
                type="text"
                required
                placeholder="e.g. GNXS-2026-991"
                value={assetForm.serialNumber}
                onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Brand</label>
              <input
                type="text"
                value={assetForm.brand}
                onChange={(e) => setAssetForm({ ...assetForm, brand: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Model Name</label>
              <input
                type="text"
                value={assetForm.modelName}
                onChange={(e) => setAssetForm({ ...assetForm, modelName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAssetModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold">
              Assign to Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: RETRIGGER WHATSAPP */}
      <Modal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        title="Retrigger WhatsApp Notification"
        subtitle={`Dispatches instant alert to ${customer?.phone}`}
      >
        <form onSubmit={handleSendWhatsApp} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notification Event Type</label>
            <select
              value={whatsAppForm.eventType}
              onChange={(e) => setWhatsAppForm({ ...whatsAppForm, eventType: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
            >
              <option value="PAYMENT_RECEIVED">Payment Received & Receipt</option>
              <option value="PLAN_RENEWED">Plan Renewed Confirmation</option>
              <option value="PLAN_EXPIRING_3D">Plan Expiring in 3 Days Reminder</option>
              <option value="PLAN_EXPIRING_1D">Plan Expiring in 1 Day Final Reminder</option>
              <option value="PLAN_EXPIRED">Subscription Expired Alert</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsWhatsAppModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Dispatch WhatsApp Alert
            </Button>
          </div>
        </form>
      </Modal>

      {/* LIGHTBOX MODAL */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-black p-2">
            <img src={selectedPhoto} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 text-xs font-bold font-mono"
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
};
