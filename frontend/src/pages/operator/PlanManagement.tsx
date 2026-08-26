import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  CreditCard,
  MessageSquare,
  FileText,
  DollarSign,
  User,
  Phone,
  ShieldCheck,
  Zap,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { api } from '../../services/api.js';

interface IExpiringItem {
  customerId: string;
  accountNumber: string;
  serviceId: string;
  customerName: string;
  phone: string;
  email: string;
  planName: string;
  price: number;
  startDate: string;
  endDate: string;
  remainingDays: number;
  status: 'active' | 'expiring_soon' | 'expired' | 'suspended';
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  lastNotifiedEvent?: string;
  lastNotifiedAt?: string;
}

interface IPlanCatalogItem {
  _id: string;
  name: string;
  code: string;
  price: number;
  currency: string;
  billingCycleDays: number;
  downloadSpeedMbps: number;
  uploadSpeedMbps: number;
  dataLimitGb: number;
  description: string;
  isActive: boolean;
  activeSubscribersCount: number;
}

interface ITemplateItem {
  _id: string;
  eventType: string;
  title: string;
  templateText: string;
  isEnabled: boolean;
}

export const PlanManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'expiring' | 'catalog' | 'templates'>('expiring');
  const [expiryWindow, setExpiryWindow] = useState<'all' | '1d' | '3d' | '7d' | 'expired'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [summary, setSummary] = useState<{
    totalCustomers: number;
    count1d: number;
    count3d: number;
    count7d: number;
    countExpired: number;
    countActive: number;
    customers: IExpiringItem[];
  }>({
    totalCustomers: 0,
    count1d: 0,
    count3d: 0,
    count7d: 0,
    countExpired: 0,
    countActive: 0,
    customers: [],
  });

  const [catalogPlans, setCatalogPlans] = useState<IPlanCatalogItem[]>([]);
  const [templates, setTemplates] = useState<ITemplateItem[]>([]);
  const [defaultTokens, setDefaultTokens] = useState<string[]>([]);

  // Modals
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<IPlanCatalogItem | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    code: '',
    price: 699,
    currency: 'INR',
    billingCycleDays: 30,
    downloadSpeedMbps: 100,
    uploadSpeedMbps: 100,
    dataLimitGb: 0,
    description: '',
    isActive: true,
  });

  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedCustomerForRenew, setSelectedCustomerForRenew] = useState<IExpiringItem | null>(null);
  const [renewForm, setRenewForm] = useState({
    planId: '',
    billingCycleDays: 30,
    paymentAmount: 699,
    paymentReference: '',
    paymentMode: 'Cash / UPI',
  });

  const [showRetriggerModal, setShowRetriggerModal] = useState(false);
  const [selectedCustomerForRetrigger, setSelectedCustomerForRetrigger] = useState<IExpiringItem | null>(null);
  const [retriggerEventType, setRetriggerEventType] = useState<string>('PLAN_EXPIRING_3D');

  const [editingTemplate, setEditingTemplate] = useState<ITemplateItem | null>(null);

  const fetchExpiringPlans = async () => {
    try {
      setLoading(true);
      const res: any = await api.getExpiringPlans(expiryWindow, searchQuery);
      if (res.success && res.summary) {
        setSummary(res.summary);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to fetch expiring subscriptions' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalog = async () => {
    try {
      const res: any = await api.getPlanCatalog();
      if (res.success && res.plans) {
        setCatalogPlans(res.plans);
      }
    } catch (_) {}
  };

  const fetchTemplates = async () => {
    try {
      const res: any = await api.getPlanNotificationTemplates();
      if (res.success && res.templates) {
        setTemplates(res.templates);
        if (res.defaultTokens) setDefaultTokens(res.defaultTokens);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchExpiringPlans();
    fetchCatalog();
    fetchTemplates();
  }, [expiryWindow]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExpiringPlans();
  };

  const handleRunExpiryScan = async () => {
    try {
      setActionLoading(true);
      const res: any = await api.triggerPlanExpiryCheck();
      if (res.success) {
        const s = res.scanResult;
        setFeedback({
          type: 'success',
          message: `Expiry Scan Completed: ${s.scannedCount} subscribers scanned, ${s.emittedCount} notifications dispatched, ${s.skippedDuplicates} duplicates prevented.`,
        });
        fetchExpiringPlans();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to trigger scan' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePlanCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      if (editingPlan) {
        await api.updatePlanCatalog(editingPlan._id, planForm);
        setFeedback({ type: 'success', message: `Plan ${planForm.name} updated successfully.` });
      } else {
        await api.createPlanCatalog(planForm);
        setFeedback({ type: 'success', message: `Plan ${planForm.name} added to catalog.` });
      }
      setShowCatalogModal(false);
      setEditingPlan(null);
      fetchCatalog();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save plan' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePlan = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete plan "${name}" from catalog?`)) return;
    try {
      await api.deletePlanCatalog(id);
      setFeedback({ type: 'success', message: `Plan "${name}" deleted.` });
      fetchCatalog();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete plan' });
    }
  };

  const handleOpenRenewModal = (cust: IExpiringItem) => {
    setSelectedCustomerForRenew(cust);
    setRenewForm({
      planId: '',
      billingCycleDays: 30,
      paymentAmount: cust.price || 699,
      paymentReference: `PAY_${Date.now().toString().slice(-6)}`,
      paymentMode: 'Cash / UPI',
    });
    setShowRenewModal(true);
  };

  const handleExecuteRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForRenew) return;
    try {
      setActionLoading(true);
      const res: any = await api.renewCustomerPlan(selectedCustomerForRenew.customerId, renewForm);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Subscription for ${selectedCustomerForRenew.customerName} renewed successfully! WhatsApp confirmation & receipt emitted.`,
        });
        setShowRenewModal(false);
        fetchExpiringPlans();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to renew plan' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRetrigger = (cust: IExpiringItem) => {
    setSelectedCustomerForRetrigger(cust);
    let defaultEvt = 'PLAN_EXPIRING_3D';
    if (cust.remainingDays <= 0) defaultEvt = 'PLAN_EXPIRED';
    else if (cust.remainingDays === 1) defaultEvt = 'PLAN_EXPIRING_1D';
    else if (cust.remainingDays <= 3) defaultEvt = 'PLAN_EXPIRING_3D';
    else if (cust.remainingDays <= 7) defaultEvt = 'PLAN_EXPIRING_7D';
    setRetriggerEventType(defaultEvt);
    setShowRetriggerModal(true);
  };

  const handleExecuteRetrigger = async () => {
    if (!selectedCustomerForRetrigger) return;
    try {
      setActionLoading(true);
      const res: any = await api.retriggerPlanNotification(
        selectedCustomerForRetrigger.customerId,
        retriggerEventType
      );
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Explicit WhatsApp notification [${retriggerEventType}] re-emitted to ${selectedCustomerForRetrigger.phone} (${selectedCustomerForRetrigger.customerName}) with duplicate bypass!`,
        });
        setShowRetriggerModal(false);
        fetchExpiringPlans();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to retrigger notification' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveTemplate = async (template: ITemplateItem) => {
    try {
      setActionLoading(true);
      await api.updatePlanNotificationTemplate(template.eventType, {
        title: template.title,
        templateText: template.templateText,
        isEnabled: template.isEnabled,
      });
      setFeedback({ type: 'success', message: `Template for [${template.eventType}] updated successfully.` });
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update template' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Shell
      portalType="operator"
      title="Plan Management & Expiry Hub"
      breadcrumbs={[
        { label: 'NOC Dashboard', href: '/operator/dashboard' },
        { label: 'Plan & Expiry Hub' },
      ]}
      primaryAction={
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunExpiryScan}
            disabled={actionLoading}
            className="flex items-center space-x-1 border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
            <span>Run Expiry Scan</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingPlan(null);
              setPlanForm({
                name: '',
                code: '',
                price: 699,
                currency: 'INR',
                billingCycleDays: 30,
                downloadSpeedMbps: 100,
                uploadSpeedMbps: 100,
                dataLimitGb: 0,
                description: '',
                isActive: true,
              });
              setShowCatalogModal(true);
            }}
            className="flex items-center space-x-1 bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Plan Package</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {feedback && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between border text-sm transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs underline hover:opacity-75 ml-4 font-mono"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Real-Time Subscription Expiry Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-4 bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subscribers</span>
              <User className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-800 mt-2 font-mono">{summary.totalCustomers}</p>
            <span className="text-[11px] text-slate-500 font-medium">Total registered</span>
          </Card>

          <Card
            onClick={() => {
              setExpiryWindow('1d');
              setActiveTab('expiring');
            }}
            className={`p-4 border transition-all cursor-pointer shadow-xs ${
              expiryWindow === '1d' ? 'ring-2 ring-rose-500 bg-rose-50/40 border-rose-300' : 'bg-white border-slate-200 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">1 Day Left</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            </div>
            <p className="text-2xl font-bold text-rose-600 mt-2 font-mono">{summary.count1d}</p>
            <span className="text-[11px] text-rose-600/80 font-medium">Expires Tomorrow</span>
          </Card>

          <Card
            onClick={() => {
              setExpiryWindow('3d');
              setActiveTab('expiring');
            }}
            className={`p-4 border transition-all cursor-pointer shadow-xs ${
              expiryWindow === '3d' ? 'ring-2 ring-amber-500 bg-amber-50/40 border-amber-300' : 'bg-white border-slate-200 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">3 Days Left</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-2 font-mono">{summary.count3d}</p>
            <span className="text-[11px] text-amber-600/80 font-medium">Expiring Soon</span>
          </Card>

          <Card
            onClick={() => {
              setExpiryWindow('7d');
              setActiveTab('expiring');
            }}
            className={`p-4 border transition-all cursor-pointer shadow-xs ${
              expiryWindow === '7d' ? 'ring-2 ring-purple-500 bg-purple-50/40 border-purple-300' : 'bg-white border-slate-200 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">7 Days Left</span>
              <CalendarClock className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-600 mt-2 font-mono">{summary.count7d}</p>
            <span className="text-[11px] text-purple-600/80 font-medium">This Week</span>
          </Card>

          <Card
            onClick={() => {
              setExpiryWindow('expired');
              setActiveTab('expiring');
            }}
            className={`p-4 border transition-all cursor-pointer shadow-xs ${
              expiryWindow === 'expired' ? 'ring-2 ring-red-600 bg-red-50/40 border-red-300' : 'bg-white border-slate-200 hover:border-red-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">Expired</span>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-700 mt-2 font-mono">{summary.countExpired}</p>
            <span className="text-[11px] text-red-700/80 font-medium">Service Inactive</span>
          </Card>

          <Card
            onClick={() => {
              setExpiryWindow('all');
              setActiveTab('expiring');
            }}
            className={`p-4 border transition-all cursor-pointer shadow-xs ${
              expiryWindow === 'all' && activeTab === 'expiring'
                ? 'ring-2 ring-emerald-500 bg-emerald-50/40 border-emerald-300'
                : 'bg-white border-slate-200 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 mt-2 font-mono">{summary.countActive}</p>
            <span className="text-[11px] text-emerald-600/80 font-medium">Healthy Validity</span>
          </Card>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('expiring')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center space-x-2 ${
                activeTab === 'expiring'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <CalendarClock className="w-4 h-4" />
              <span>Expiring Subscriptions</span>
              <Badge variant="neutral" className={`ml-1.5 ${activeTab === 'expiring' ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-100'}`}>
                {summary.customers.length}
              </Badge>
            </button>

            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center space-x-2 ${
                activeTab === 'catalog'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Plan Catalog</span>
              <Badge variant="neutral" className={`ml-1.5 ${activeTab === 'catalog' ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-100'}`}>
                {catalogPlans.length}
              </Badge>
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center space-x-2 ${
                activeTab === 'templates'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Notification Templates</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </button>
          </div>
        </div>

        {/* TAB 1: EXPIRING SUBSCRIPTIONS VIEW */}
        {activeTab === 'expiring' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center">
                  <Filter className="w-3 h-3 mr-1" /> View:
                </span>
                {(['all', '1d', '3d', '7d', 'expired'] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => setExpiryWindow(w)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all whitespace-nowrap ${
                      expiryWindow === w
                        ? w === '1d'
                          ? 'bg-rose-600 text-white font-semibold'
                          : w === '3d'
                          ? 'bg-amber-500 text-white font-semibold'
                          : w === '7d'
                          ? 'bg-purple-600 text-white font-semibold'
                          : w === 'expired'
                          ? 'bg-red-700 text-white font-semibold'
                          : 'bg-slate-800 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {w === 'all' && `All Subscribers (${summary.totalCustomers})`}
                    {w === '1d' && `🚨 1 Day Left (${summary.count1d})`}
                    {w === '3d' && `⏳ 3 Days Left (${summary.count3d})`}
                    {w === '7d' && `📅 7 Days Left (${summary.count7d})`}
                    {w === 'expired' && `🛑 Expired (${summary.countExpired})`}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 w-full sm:w-80">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, account, mobile..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <Button type="submit" size="sm" variant="outline" className="px-3 text-xs">
                  Filter
                </Button>
              </form>
            </div>

            <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Subscriber & Account</th>
                      <th className="py-3 px-4">Current Plan</th>
                      <th className="py-3 px-4">Validity Period</th>
                      <th className="py-3 px-4">Remaining Days</th>
                      <th className="py-3 px-4">Last Notification</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 font-mono">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-500" />
                          Loading subscription and expiry records...
                        </td>
                      </tr>
                    ) : summary.customers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-medium text-slate-600">No subscriptions found in this expiry view.</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {expiryWindow === '1d' && 'No plans expiring in 1 day.'}
                            {expiryWindow === '3d' && 'No plans expiring in 3 days.'}
                            {expiryWindow === '7d' && 'No plans expiring in 7 days.'}
                            {expiryWindow === 'expired' && 'Zero expired plans.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      summary.customers.map((c) => {
                        const isExpired = c.remainingDays <= 0;
                        const is1d = c.remainingDays === 1;
                        const is3d = c.remainingDays > 1 && c.remainingDays <= 3;
                        const is7d = c.remainingDays > 3 && c.remainingDays <= 7;

                        return (
                          <tr key={c.customerId} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-900">{c.customerName}</div>
                              <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                  {c.accountNumber}
                                </span>
                                <span className="flex items-center text-slate-600">
                                  <Phone className="w-3 h-3 mr-0.5 text-slate-400" />
                                  {c.phone}
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-medium text-slate-800">{c.planName}</div>
                              <div className="text-[11px] font-mono text-emerald-700 font-semibold mt-0.5">
                                ₹{c.price} / month
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="text-slate-700 font-mono text-[11px]">
                                {c.startDate} <span className="text-slate-400">→</span>{' '}
                                <span className="font-semibold text-slate-900">{c.endDate}</span>
                              </div>
                              {c.lastPaymentDate && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Paid ₹{c.lastPaymentAmount} on {c.lastPaymentDate}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              {isExpired ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                                  🛑 EXPIRED ({Math.abs(c.remainingDays)}d ago)
                                </span>
                              ) : is1d ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                                  🚨 1 DAY LEFT
                                </span>
                              ) : is3d ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  ⏳ {c.remainingDays} DAYS LEFT
                                </span>
                              ) : is7d ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                                  📅 {c.remainingDays} DAYS LEFT
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  🟢 {c.remainingDays} DAYS LEFT
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              {c.lastNotifiedEvent ? (
                                <div>
                                  <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                                    {c.lastNotifiedEvent}
                                  </span>
                                  {c.lastNotifiedAt && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      {new Date(c.lastNotifiedAt).toLocaleString('en-IN', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">No events emitted yet</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenRenewModal(c)}
                                  className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs"
                                >
                                  <CreditCard className="w-3.5 h-3.5 mr-1" />
                                  <span>Renew</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenRetrigger(c)}
                                  className="h-7 px-2 text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
                                  title="Explicitly Retrigger WhatsApp Notification"
                                >
                                  <Send className="w-3.5 h-3.5 text-sky-600 mr-1" />
                                  <span>Retrigger</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: PLAN CATALOG MANAGER */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogPlans.map((plan) => (
                <Card
                  key={plan._id}
                  className="p-5 border border-slate-200 bg-white shadow-xs hover:shadow-md transition-all relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded uppercase">
                        {plan.code}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1.5">{plan.name}</h3>
                    </div>
                    <Badge variant={plan.isActive ? 'success' : 'neutral'} className="text-[10px]">
                      {plan.isActive ? 'Active' : 'Archived'}
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-baseline space-x-1">
                    <span className="text-3xl font-extrabold text-slate-900 font-mono">₹{plan.price}</span>
                    <span className="text-xs text-slate-500 font-medium">/ {plan.billingCycleDays} days</span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Speed</span>
                      <div className="font-bold text-slate-800">
                        {plan.downloadSpeedMbps} ↓ / {plan.uploadSpeedMbps} ↑ Mbps
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Quota</span>
                      <div className="font-bold text-slate-800">
                        {plan.dataLimitGb === 0 ? 'Unlimited Fiber' : `${plan.dataLimitGb} GB`}
                      </div>
                    </div>
                  </div>

                  {plan.description && (
                    <p className="mt-3 text-xs text-slate-600 line-clamp-2">{plan.description}</p>
                  )}

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      👥 <strong className="text-slate-800 font-mono">{plan.activeSubscribersCount || 0}</strong> subscribers
                    </span>

                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingPlan(plan);
                          setPlanForm({
                            name: plan.name,
                            code: plan.code,
                            price: plan.price,
                            currency: plan.currency || 'INR',
                            billingCycleDays: plan.billingCycleDays || 30,
                            downloadSpeedMbps: plan.downloadSpeedMbps || 100,
                            uploadSpeedMbps: plan.uploadSpeedMbps || 100,
                            dataLimitGb: plan.dataLimitGb || 0,
                            description: plan.description || '',
                            isActive: plan.isActive,
                          });
                          setShowCatalogModal(true);
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        <Edit2 className="w-3 h-3 text-slate-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeletePlan(plan._id, plan.name)}
                        className="h-7 px-2 text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOMIZABLE WHATSAPP NOTIFICATION TEMPLATES */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <Card className="p-4 bg-sky-50 border border-sky-200 text-xs text-sky-900 rounded-xl">
              <div className="flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">WhatsApp Template Interpolation Tokens:</h4>
                  <p className="mt-1 text-sky-800">
                    Use these dynamic tokens anywhere in your template text. When an event triggers, they are automatically replaced with verified subscriber and plan values:
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2 font-mono text-[11px]">
                    {[
                      '{customer_name}',
                      '{customer_id}',
                      '{account_number}',
                      '{mobile_number}',
                      '{plan_name}',
                      '{price}',
                      '{expiry_date}',
                      '{remaining_days}',
                      '{operator_name}',
                      '{tenant_id}',
                    ].map((t) => (
                      <span key={t} className="px-2 py-0.5 bg-white border border-sky-200 text-sky-800 rounded font-semibold">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tmpl) => {
                const isEditing = editingTemplate?.eventType === tmpl.eventType;

                return (
                  <Card key={tmpl.eventType} className="p-5 border border-slate-200 bg-white shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {tmpl.eventType}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">{tmpl.title}</h4>
                      </div>
                      <Badge variant={tmpl.isEnabled ? 'success' : 'neutral'}>
                        {tmpl.isEnabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>

                    {isEditing ? (
                      <div className="mt-3 space-y-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Title</label>
                          <input
                            type="text"
                            value={editingTemplate.title}
                            onChange={(e) =>
                              setEditingTemplate({ ...editingTemplate, title: e.target.value })
                            }
                            className="w-full px-3 py-1.5 text-xs border rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Template Text (WhatsApp Markdown)
                          </label>
                          <textarea
                            rows={6}
                            value={editingTemplate.templateText}
                            onChange={(e) =>
                              setEditingTemplate({ ...editingTemplate, templateText: e.target.value })
                            }
                            className="w-full p-2.5 text-xs font-mono border rounded-md bg-slate-50"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingTemplate.isEnabled}
                              onChange={(e) =>
                                setEditingTemplate({ ...editingTemplate, isEnabled: e.target.checked })
                              }
                              className="rounded text-sky-600"
                            />
                            <span>Enable this notification template</span>
                          </label>

                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingTemplate(null)}
                              className="text-xs"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveTemplate(editingTemplate)}
                              disabled={actionLoading}
                              className="text-xs bg-sky-600 hover:bg-sky-700 text-white"
                            >
                              Save Template
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                          {tmpl.templateText}
                        </div>

                        <div className="flex justify-end pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingTemplate({ ...tmpl })}
                            className="text-xs flex items-center space-x-1"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" />
                            <span>Edit Template</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* MODAL: ADD / EDIT PLAN CATALOG */}
        {showCatalogModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                {editingPlan ? 'Edit Plan Package' : 'Add New Broadband Plan Package'}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Define broadband speeds, billing cycle duration, price, and bandwidth quota.
              </p>

              <form onSubmit={handleSavePlanCatalog} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GigaFiber 200M"
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PLAN-200M"
                      value={planForm.code}
                      onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={planForm.price}
                      onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Validity (Days) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={planForm.billingCycleDays}
                      onChange={(e) => setPlanForm({ ...planForm, billingCycleDays: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Download (Mbps)</label>
                    <input
                      type="number"
                      min={1}
                      value={planForm.downloadSpeedMbps}
                      onChange={(e) => setPlanForm({ ...planForm, downloadSpeedMbps: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Upload (Mbps)</label>
                    <input
                      type="number"
                      min={1}
                      value={planForm.uploadSpeedMbps}
                      onChange={(e) => setPlanForm({ ...planForm, uploadSpeedMbps: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Quota (GB, 0=Unlim)</label>
                    <input
                      type="number"
                      min={0}
                      value={planForm.dataLimitGb}
                      onChange={(e) => setPlanForm({ ...planForm, dataLimitGb: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Ultra high speed unlimited fiber for home streaming."
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCatalogModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="text-xs bg-sky-600 hover:bg-sky-700 text-white"
                  >
                    {editingPlan ? 'Update Plan' : 'Create Plan Package'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: RENEW PLAN & PAYMENT COLLECTION */}
        {showRenewModal && selectedCustomerForRenew && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Renew Plan — {selectedCustomerForRenew.customerName}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Account: <strong className="font-mono text-slate-800">{selectedCustomerForRenew.accountNumber}</strong> | Current Plan: <strong className="text-slate-800">{selectedCustomerForRenew.planName}</strong>
              </p>

              <form onSubmit={handleExecuteRenew} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Catalog Plan (Optional)</label>
                  <select
                    value={renewForm.planId}
                    onChange={(e) => {
                      const sel = catalogPlans.find((p) => p._id === e.target.value);
                      setRenewForm({
                        ...renewForm,
                        planId: e.target.value,
                        paymentAmount: sel ? sel.price : renewForm.paymentAmount,
                        billingCycleDays: sel ? sel.billingCycleDays : renewForm.billingCycleDays,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Keep Existing Plan ({selectedCustomerForRenew.planName})</option>
                    {catalogPlans.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} — ₹{p.price} / {p.billingCycleDays}d
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Amount Paid (₹) *</label>
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Extension (Days) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={renewForm.billingCycleDays}
                      onChange={(e) => setRenewForm({ ...renewForm, billingCycleDays: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
                    <select
                      value={renewForm.paymentMode}
                      onChange={(e) => setRenewForm({ ...renewForm, paymentMode: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Cash / UPI">Cash / UPI</option>
                      <option value="Online Payment Gateway">Online Gateway</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt / Ref #</label>
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
                  <div className="flex items-center space-x-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Instant WhatsApp Event Dispatch:</span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-700">
                    Executing renewal will extend validity and automatically emit <strong>PLAN_RENEWED</strong> and <strong>PAYMENT_RECEIVED</strong> WhatsApp events to {selectedCustomerForRenew.phone}.
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRenewModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Confirm & Renew Subscription
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EXPLICIT WHATSAPP RETRIGGER */}
        {showRetriggerModal && selectedCustomerForRetrigger && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Explicit WhatsApp Event Retrigger
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Force-retransmit notification to <strong className="text-slate-800">{selectedCustomerForRetrigger.customerName}</strong> ({selectedCustomerForRetrigger.phone}) with anti-spam duplicate bypass.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Event Type to Emit</label>
                  <select
                    value={retriggerEventType}
                    onChange={(e) => setRetriggerEventType(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-medium text-slate-800"
                  >
                    <option value="PLAN_EXPIRING_1D">PLAN_EXPIRING_1D (1 Day / Tomorrow Notice)</option>
                    <option value="PLAN_EXPIRING_3D">PLAN_EXPIRING_3D (3 Days Urgent Reminder)</option>
                    <option value="PLAN_EXPIRING_7D">PLAN_EXPIRING_7D (7 Days Expiry Notice)</option>
                    <option value="PLAN_EXPIRED">PLAN_EXPIRED (Service Inactive Notice)</option>
                    <option value="PLAN_ACTIVATED">PLAN_ACTIVATED (New Plan Welcome)</option>
                    <option value="PLAN_RENEWED">PLAN_RENEWED (Renewal Confirmation)</option>
                    <option value="PAYMENT_RECEIVED">PAYMENT_RECEIVED (Receipt Acknowledgment)</option>
                  </select>
                </div>

                <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-900 space-y-1">
                  <div className="font-bold flex items-center">
                    <ShieldCheck className="w-4 h-4 text-sky-600 mr-1.5" />
                    Bypass Duplicate Prevention:
                  </div>
                  <p className="text-[11px] text-sky-800">
                    This explicit action overrides deduplication rules and dispatches the compiled template to WhatsApp while logging an audit trail event.
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRetriggerModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleExecuteRetrigger}
                    disabled={actionLoading}
                    className="text-xs bg-sky-600 hover:bg-sky-700 text-white flex items-center space-x-1"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    <span>Retrigger Notification Now</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
};
