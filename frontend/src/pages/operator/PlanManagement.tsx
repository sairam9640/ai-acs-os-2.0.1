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
  Power,
  ArrowUpDown,
  Check,
  ChevronRight,
  HelpCircle,
  Calendar,
  Eye,
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
  expiryDate?: string;
  downloadSpeedMbps: number;
  uploadSpeedMbps: number;
  dataLimitGb: number;
  description: string;
  isActive: boolean;
  activeSubscribersCount: number;
  createdAt?: string;
}

interface ITemplateItem {
  _id: string;
  eventType: string;
  title: string;
  templateText: string;
  isEnabled: boolean;
}

export const PlanManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'expiring' | 'templates'>('catalog');
  const [expiryWindow, setExpiryWindow] = useState<'all' | '1d' | '3d' | '7d' | 'expired'>('all');
  
  // Catalog Filters & Sorting
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogSortBy, setCatalogSortBy] = useState('price_asc');
  const [catalogStatusFilter, setCatalogStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');
  
  const [expiringSearchQuery, setExpiringSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Data States
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

  // Create / Edit Plan Wizard State
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [modalStep, setModalStep] = useState<'form' | 'confirmation'>('form');
  const [editingPlan, setEditingPlan] = useState<IPlanCatalogItem | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [planForm, setPlanForm] = useState({
    name: '',
    code: '',
    price: 699,
    currency: 'INR',
    validityDays: 30,
    expiryDate: '',
    downloadSpeedMbps: 100,
    uploadSpeedMbps: 100,
    dataLimitGb: 0,
    description: '',
    isActive: true,
  });

  // Deactivate Confirmation Modal State
  const [deactivateConfirmModal, setDeactivateConfirmModal] = useState<{
    isOpen: boolean;
    plan: IPlanCatalogItem | null;
    targetStatus: boolean;
  }>({ isOpen: false, plan: null, targetStatus: false });

  // Renewal & Retrigger Modals
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

  // Helper: compute preview expiry date from validity days
  const computeExpiryDateFromDays = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + Number(days || 30));
    return d.toISOString().split('T')[0];
  };

  // Helper: compute days between today and expiry date
  const computeDaysFromExpiryDate = (dateStr: string): number => {
    if (!dateStr) return 30;
    const exp = new Date(dateStr).getTime();
    const now = new Date().setHours(0, 0, 0, 0);
    const diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  };

  // Fetch Catalog Plans (Ascending order by default)
  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const res: any = await api.getPlanCatalog({
        sortBy: catalogSortBy,
        status: catalogStatusFilter !== 'all' ? catalogStatusFilter : undefined,
        search: catalogSearch || undefined,
      });
      if (res.success && res.plans) {
        setCatalogPlans(res.plans);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to fetch plan catalog' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Expiring Subscriptions
  const fetchExpiringPlans = async () => {
    try {
      const res: any = await api.getExpiringPlans(expiryWindow, expiringSearchQuery);
      if (res.success && res.summary) {
        setSummary(res.summary);
      }
    } catch (_) {}
  };

  // Fetch Templates
  const fetchTemplates = async () => {
    try {
      const res: any = await api.getPlanNotificationTemplates();
      if (res.success && res.templates) {
        setTemplates(res.templates);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchCatalog();
  }, [catalogSortBy, catalogStatusFilter]);

  useEffect(() => {
    fetchExpiringPlans();
  }, [expiryWindow]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setModalStep('form');
    setValidationErrors({});
    const defaultDays = 30;
    setPlanForm({
      name: '',
      code: '',
      price: 699,
      currency: 'INR',
      validityDays: defaultDays,
      expiryDate: computeExpiryDateFromDays(defaultDays),
      downloadSpeedMbps: 100,
      uploadSpeedMbps: 100,
      dataLimitGb: 0,
      description: '',
      isActive: true,
    });
    setShowPlanModal(true);
  };

  const handleOpenEditPlan = (plan: IPlanCatalogItem) => {
    setEditingPlan(plan);
    setModalStep('form');
    setValidationErrors({});
    const days = plan.billingCycleDays || 30;
    const exp = plan.expiryDate
      ? new Date(plan.expiryDate).toISOString().split('T')[0]
      : computeExpiryDateFromDays(days);

    setPlanForm({
      name: plan.name,
      code: plan.code,
      price: plan.price,
      currency: plan.currency || 'INR',
      validityDays: days,
      expiryDate: exp,
      downloadSpeedMbps: plan.downloadSpeedMbps || 100,
      uploadSpeedMbps: plan.uploadSpeedMbps || 100,
      dataLimitGb: plan.dataLimitGb || 0,
      description: plan.description || '',
      isActive: plan.isActive,
    });
    setShowPlanModal(true);
  };

  // Validate Plan Form before moving to Confirmation Step
  const handleProceedToConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    const cleanName = planForm.name.trim();
    if (!cleanName) {
      errors.name = 'Plan Name is required';
    } else {
      // Check duplicate name against loaded catalog (excluding currently editing plan)
      const isDuplicateName = catalogPlans.some(
        (p) =>
          p.name.trim().toLowerCase() === cleanName.toLowerCase() &&
          (!editingPlan || p._id !== editingPlan._id)
      );
      if (isDuplicateName) {
        errors.name = `A plan with name "${cleanName}" already exists in your catalog.`;
      }
    }

    if (planForm.price === undefined || planForm.price < 0 || isNaN(Number(planForm.price))) {
      errors.price = 'Price must be a valid non-negative amount (₹)';
    }

    if (!planForm.validityDays || planForm.validityDays < 1 || isNaN(Number(planForm.validityDays))) {
      errors.validityDays = 'Validity period must be at least 1 day';
    }

    if (!planForm.expiryDate) {
      errors.expiryDate = 'Expiry Date is required';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setModalStep('confirmation');
  };

  // Execute Save Plan (POST or PUT) after confirmation
  const handleConfirmSavePlan = async () => {
    try {
      setActionLoading(true);
      const payload = {
        name: planForm.name.trim(),
        code: planForm.code.trim() || undefined,
        price: Number(planForm.price),
        currency: planForm.currency,
        billingCycleDays: Number(planForm.validityDays),
        validityDays: Number(planForm.validityDays),
        expiryDate: planForm.expiryDate,
        downloadSpeedMbps: Number(planForm.downloadSpeedMbps || 100),
        uploadSpeedMbps: Number(planForm.uploadSpeedMbps || 100),
        dataLimitGb: Number(planForm.dataLimitGb || 0),
        description: planForm.description.trim(),
        isActive: planForm.isActive,
      };

      if (editingPlan) {
        await api.updatePlanCatalog(editingPlan._id, payload);
        setFeedback({
          type: 'success',
          message: `Plan "${payload.name}" updated successfully.`,
        });
      } else {
        await api.createPlanCatalog(payload);
        setFeedback({
          type: 'success',
          message: `New plan "${payload.name}" created and added to catalog successfully.`,
        });
      }

      setShowPlanModal(false);
      setEditingPlan(null);
      fetchCatalog();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save plan' });
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Plan Status (Deactivate / Activate)
  const handleExecuteToggleStatus = async () => {
    if (!deactivateConfirmModal.plan) return;
    try {
      setActionLoading(true);
      const res: any = await api.togglePlanStatus(
        deactivateConfirmModal.plan._id,
        deactivateConfirmModal.targetStatus
      );
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Plan "${deactivateConfirmModal.plan.name}" has been ${
            deactivateConfirmModal.targetStatus ? 'activated' : 'deactivated'
          } successfully.`,
        });
        setDeactivateConfirmModal({ isOpen: false, plan: null, targetStatus: false });
        fetchCatalog();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to toggle plan status' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePlan = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete plan "${name}"?`)) return;
    try {
      await api.deletePlanCatalog(id);
      setFeedback({ type: 'success', message: `Plan "${name}" removed from catalog.` });
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
          message: `Subscription for ${selectedCustomerForRenew.customerName} renewed successfully! WhatsApp receipt & events dispatched.`,
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
          message: `WhatsApp notification [${retriggerEventType}] re-emitted to ${selectedCustomerForRetrigger.phone} (${selectedCustomerForRetrigger.customerName})!`,
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
            size="sm"
            onClick={handleOpenCreatePlan}
            className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-700 text-white shadow-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Plan</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Top Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between border text-sm transition-all shadow-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs underline hover:opacity-75 ml-4 font-mono font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Navigation Controls */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center space-x-2 ${
                activeTab === 'catalog'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Plan Catalog ({catalogPlans.length})</span>
            </button>

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
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center space-x-2 ${
                activeTab === 'templates'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Templates</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </button>
          </div>
        </div>

        {/* TAB 1: PLAN CATALOG (ORDERED ASCENDING WITH EDIT & DEACTIVATE) */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            {/* Filter & Sort Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-semibold text-slate-500">Status:</span>
                  {(['all', 'active', 'deactivated'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setCatalogStatusFilter(st)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                        catalogStatusFilter === st
                          ? 'bg-slate-800 text-white font-semibold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st === 'all' ? 'All Plans' : st === 'active' ? 'Active' : 'Deactivated'}
                    </button>
                  ))}
                </div>

                <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                <div className="flex items-center space-x-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500">Sort:</span>
                  <select
                    value={catalogSortBy}
                    onChange={(e) => setCatalogSortBy(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 font-medium text-slate-700"
                  >
                    <option value="price_asc">Price: Low to High (Ascending)</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="name_asc">Plan Name (A-Z)</option>
                    <option value="validity_asc">Validity: Shortest to Longest</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-72">
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchCatalog()}
                    placeholder="Search plan name, code..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={fetchCatalog} className="px-2.5 text-xs">
                  Search
                </Button>
              </div>
            </div>

            {/* Catalog Grid Table with Clear Labels */}
            <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Plan Name & Code</th>
                      <th className="py-3 px-4">Price (₹)</th>
                      <th className="py-3 px-4">Validity Period</th>
                      <th className="py-3 px-4">Calculated Expiry Date</th>
                      <th className="py-3 px-4">Bandwidth & Speeds</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 font-mono">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-500" />
                          Loading plan catalog in ascending order...
                        </td>
                      </tr>
                    ) : catalogPlans.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-medium text-slate-600">No broadband plans found in catalog.</p>
                          <Button size="sm" onClick={handleOpenCreatePlan} className="mt-3 bg-sky-600 text-white text-xs">
                            <Plus className="w-3.5 h-3.5 mr-1" /> Create First Plan
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      catalogPlans.map((plan) => {
                        const calculatedExpiry = plan.expiryDate
                          ? new Date(plan.expiryDate).toISOString().split('T')[0]
                          : computeExpiryDateFromDays(plan.billingCycleDays || 30);

                        return (
                          <tr key={plan._id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 text-sm">{plan.name}</div>
                              <div className="flex items-center space-x-2 mt-0.5">
                                <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold uppercase">
                                  {plan.code}
                                </span>
                                {plan.description && (
                                  <span className="text-[11px] text-slate-400 truncate max-w-xs">{plan.description}</span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 font-mono">
                              <span className="text-base font-extrabold text-emerald-700">₹{plan.price}</span>
                              <span className="text-[10px] text-slate-400 block font-sans">per cycle</span>
                            </td>

                            <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200">
                                <Calendar className="w-3 h-3 mr-1 text-sky-600" />
                                {plan.billingCycleDays} Days
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-mono text-slate-700">
                              <div className="font-semibold text-slate-900">{calculatedExpiry}</div>
                              <span className="text-[10px] text-slate-400 block">from today</span>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-medium text-slate-800">
                                {plan.downloadSpeedMbps} ↓ / {plan.uploadSpeedMbps} ↑ Mbps
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {plan.dataLimitGb === 0 ? 'Unlimited Fiber' : `${plan.dataLimitGb} GB Quota`}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              {plan.isActive ? (
                                <Badge variant="success" className="font-semibold">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="neutral" className="font-semibold text-slate-500 bg-slate-100">
                                  Deactivated
                                </Badge>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                {/* Edit Plan Button */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenEditPlan(plan)}
                                  className="h-7 px-2.5 text-xs text-slate-700 hover:bg-slate-100"
                                  title="Edit Plan"
                                >
                                  <Edit2 className="w-3 h-3 mr-1 text-slate-500" />
                                  <span>Edit</span>
                                </Button>

                                {/* Deactivate / Activate Button */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setDeactivateConfirmModal({
                                      isOpen: true,
                                      plan,
                                      targetStatus: !plan.isActive,
                                    })
                                  }
                                  className={`h-7 px-2.5 text-xs ${
                                    plan.isActive
                                      ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                      : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                  }`}
                                  title={plan.isActive ? 'Deactivate Plan' : 'Activate Plan'}
                                >
                                  <Power className="w-3 h-3 mr-1" />
                                  <span>{plan.isActive ? 'Deactivate' : 'Activate'}</span>
                                </Button>

                                {/* Delete Button */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeletePlan(plan._id, plan.name)}
                                  className="h-7 px-2 text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
                                  title="Delete Plan"
                                >
                                  <Trash2 className="w-3 h-3" />
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

        {/* TAB 2: EXPIRING SUBSCRIPTIONS VIEW (1D, 3D, 7D, EXPIRED) */}
        {activeTab === 'expiring' && (
          <div className="space-y-4">
            {/* Real-Time Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Card className="p-4 bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subscribers</span>
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-2xl font-bold text-slate-800 mt-2 font-mono">{summary.totalCustomers}</p>
                <span className="text-[11px] text-slate-500 font-medium">Total registered</span>
              </Card>

              <Card
                onClick={() => setExpiryWindow('1d')}
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
                onClick={() => setExpiryWindow('3d')}
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
                onClick={() => setExpiryWindow('7d')}
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
                onClick={() => setExpiryWindow('expired')}
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
                onClick={() => setExpiryWindow('all')}
                className={`p-4 border transition-all cursor-pointer shadow-xs ${
                  expiryWindow === 'all' ? 'ring-2 ring-emerald-500 bg-emerald-50/40 border-emerald-300' : 'bg-white border-slate-200 hover:border-emerald-300'
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

            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
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

              <div className="flex items-center space-x-2 w-full sm:w-80">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={expiringSearchQuery}
                    onChange={(e) => setExpiringSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchExpiringPlans()}
                    placeholder="Search name, account, mobile..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={fetchExpiringPlans} className="px-3 text-xs">
                  Filter
                </Button>
              </div>
            </div>

            {/* Expiring Customers Table */}
            <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Subscriber & Account</th>
                      <th className="py-3 px-4">Current Plan</th>
                      <th className="py-3 px-4">Validity Window</th>
                      <th className="py-3 px-4">Remaining Days</th>
                      <th className="py-3 px-4">Last Notification</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {summary.customers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-medium text-slate-600">No subscriptions found in this expiry view.</p>
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
                                <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                                  {c.lastNotifiedEvent}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">None</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenRenewModal(c)}
                                  className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
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

        {/* TAB 3: CUSTOMIZABLE WHATSAPP TEMPLATES */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <Card className="p-4 bg-sky-50 border border-sky-200 text-xs text-sky-900 rounded-xl">
              <div className="flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">WhatsApp Template Interpolation Tokens:</h4>
                  <p className="mt-1 text-sky-800">
                    Use these dynamic tokens in your template text. When an event triggers, they are replaced automatically:
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
                            <span>Enable this template</span>
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

        {/* MODAL: CREATE / EDIT PLAN WIZARD WITH CONFIRMATION STEP */}
        {showPlanModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingPlan ? 'Edit Broadband Plan' : 'Create New Broadband Plan'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modalStep === 'form'
                      ? 'Specify plan name, price, validity period, and expiry date.'
                      : 'Please review all details before confirming and saving.'}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      modalStep === 'form' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    1
                  </span>
                  <span className="w-3 h-0.5 bg-slate-300"></span>
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      modalStep === 'confirmation' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    2
                  </span>
                </div>
              </div>

              {/* STEP 1: PLAN CONFIGURATION FORM */}
              {modalStep === 'form' && (
                <form onSubmit={handleProceedToConfirmation} className="space-y-4">
                  {/* Plan Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Plan Name * <span className="text-[10px] text-slate-400 font-normal">(e.g. GigaFiber 300M Unlimited)</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter unique plan name..."
                      value={planForm.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPlanForm({
                          ...planForm,
                          name: val,
                          code: planForm.code || val.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().slice(0, 16),
                        });
                        if (validationErrors.name) setValidationErrors({ ...validationErrors, name: '' });
                      }}
                      className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                        validationErrors.name ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                      }`}
                    />
                    {validationErrors.name && (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {validationErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Price & Validity Days */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Price (₹) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">₹</span>
                        <input
                          type="number"
                          required
                          min={0}
                          value={planForm.price}
                          onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                          className="w-full pl-7 pr-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                        />
                      </div>
                      {validationErrors.price && (
                        <p className="text-[11px] text-rose-600 mt-1">{validationErrors.price}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Validity Period (Days) *
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={planForm.validityDays}
                        onChange={(e) => {
                          const d = Number(e.target.value);
                          setPlanForm({
                            ...planForm,
                            validityDays: d,
                            expiryDate: computeExpiryDateFromDays(d),
                          });
                        }}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-semibold text-slate-900"
                      />
                      {validationErrors.validityDays && (
                        <p className="text-[11px] text-rose-600 mt-1">{validationErrors.validityDays}</p>
                      )}
                    </div>
                  </div>

                  {/* Quick Validity Presets */}
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Quick Validity Presets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[30, 60, 90, 180, 365].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() =>
                            setPlanForm({
                              ...planForm,
                              validityDays: d,
                              expiryDate: computeExpiryDateFromDays(d),
                            })
                          }
                          className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                            planForm.validityDays === d
                              ? 'bg-sky-600 text-white font-semibold shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {d === 365 ? '1 Year (365d)' : `${d} Days`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calculated / Custom Expiry Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Effective Expiry Date * <span className="text-[10px] text-slate-400 font-normal">(Calculated from validity or customized)</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="date"
                        required
                        value={planForm.expiryDate}
                        onChange={(e) => {
                          const exp = e.target.value;
                          const calculatedDays = computeDaysFromExpiryDate(exp);
                          setPlanForm({
                            ...planForm,
                            expiryDate: exp,
                            validityDays: calculatedDays,
                          });
                        }}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-semibold text-slate-900"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      🗓️ Valid for <strong>{planForm.validityDays} days</strong> starting from activation date.
                    </span>
                  </div>

                  {/* Plan Code & Speeds */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Plan Code</label>
                      <input
                        type="text"
                        placeholder="e.g. PLAN-300M"
                        value={planForm.code}
                        onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toUpperCase() })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Download (Mbps)</label>
                      <input
                        type="number"
                        min={1}
                        value={planForm.downloadSpeedMbps}
                        onChange={(e) => setPlanForm({ ...planForm, downloadSpeedMbps: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Upload (Mbps)</label>
                      <input
                        type="number"
                        min={1}
                        value={planForm.uploadSpeedMbps}
                        onChange={(e) => setPlanForm({ ...planForm, uploadSpeedMbps: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md font-mono"
                      />
                    </div>
                  </div>

                  {/* Optional Description */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Description / Notes</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Recommended plan for commercial fiber connections."
                      value={planForm.description}
                      onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                      className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPlanModal(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-semibold flex items-center space-x-1"
                    >
                      <span>Review Details</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              )}

              {/* STEP 2: CONFIRMATION REVIEW BEFORE SAVING */}
              {modalStep === 'confirmation' && (
                <div className="space-y-4">
                  <div className="p-4 bg-sky-50/60 border border-sky-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-sky-200/70 pb-2">
                      <span className="text-xs font-bold text-sky-900 uppercase">Plan Confirmation Summary</span>
                      <Badge variant="success">Ready to Save</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Plan Name</span>
                        <p className="font-bold text-slate-900 text-sm mt-0.5">{planForm.name}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Price (₹)</span>
                        <p className="font-extrabold text-emerald-700 text-base font-mono mt-0.5">
                          ₹{planForm.price} <span className="text-[10px] text-slate-400 font-sans">/ cycle</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-sky-200/50">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Validity Period</span>
                        <p className="font-bold text-slate-900 font-mono mt-0.5">{planForm.validityDays} Days</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Effective Expiry Date</span>
                        <p className="font-bold text-sky-900 font-mono mt-0.5">{planForm.expiryDate}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-sky-200/50">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Bandwidth Speed</span>
                        <p className="font-medium text-slate-800 mt-0.5">
                          {planForm.downloadSpeedMbps} ↓ / {planForm.uploadSpeedMbps} ↑ Mbps
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Plan Code</span>
                        <p className="font-mono text-slate-700 mt-0.5">{planForm.code || 'Auto-generated'}</p>
                      </div>
                    </div>

                    {planForm.description && (
                      <div className="text-xs pt-1 border-t border-sky-200/50">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Description</span>
                        <p className="text-slate-700 mt-0.5">{planForm.description}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setModalStep('form')}
                      className="text-xs flex items-center space-x-1"
                    >
                      <span>← Back to Edit</span>
                    </Button>

                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowPlanModal(false)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleConfirmSavePlan}
                        disabled={actionLoading}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center space-x-1 shadow-xs"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        <span>Confirm & Save Plan</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: DEACTIVATE / ACTIVATE CONFIRMATION DIALOG */}
        {deactivateConfirmModal.isOpen && deactivateConfirmModal.plan && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center space-x-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    deactivateConfirmModal.targetStatus ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  <Power className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {deactivateConfirmModal.targetStatus ? 'Activate Plan Package?' : 'Deactivate Plan Package?'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {deactivateConfirmModal.plan.name} ({deactivateConfirmModal.plan.code})
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {deactivateConfirmModal.targetStatus ? (
                  <p>
                    Activating this plan will make it immediately available for new subscriber subscriptions and automated renewals.
                  </p>
                ) : (
                  <p>
                    Deactivating this plan will hide it from new customer activations. <strong>Existing active subscribers</strong> on this plan will not be affected and will retain their validity until expiration.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 mt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeactivateConfirmModal({ isOpen: false, plan: null, targetStatus: false })}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleExecuteToggleStatus}
                  disabled={actionLoading}
                  className={`text-xs text-white font-bold ${
                    deactivateConfirmModal.targetStatus
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {deactivateConfirmModal.targetStatus ? 'Yes, Activate Plan' : 'Yes, Deactivate Plan'}
                </Button>
              </div>
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
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="">Keep Existing Plan ({selectedCustomerForRenew.planName})</option>
                    {catalogPlans.filter(p => p.isActive).map((p) => (
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
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-semibold"
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
                    Executing renewal will extend validity and automatically emit <strong>PLAN_RENEWED</strong> and <strong>PAYMENT_RECEIVED</strong> WhatsApp events.
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
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
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
                    className="text-xs bg-sky-600 hover:bg-sky-700 text-white flex items-center space-x-1 font-semibold"
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
