import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Radio,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  Bell,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  Layers,
  Smartphone,
  X,
  Sparkles,
  Zap,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  Copy,
  Check,
  Cpu,
  Globe,
  Wifi,
  Lock,
  Activity,
  FileCode,
  Sliders,
  CheckCheck
} from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { api } from '../../services/api.js';

interface PendingDeviceItem {
  _id: string;
  serialNumber: string;
  manufacturer: string;
  oui?: string;
  productClass?: string;
  softwareVersion?: string;
  hardwareVersion?: string;
  macAddress?: string;
  incomingHost?: string;
  incomingUrl?: string;
  pathOrQuerySlug?: string;
  clientIp?: string;
  reason: 'NO_TENANT_HEADER' | 'UNKNOWN_SUBDOMAIN' | 'INVALID_SUBDOMAIN' | 'AMBIGUOUS_HOST' | 'UNREGISTERED_TENANT';
  status: 'PENDING' | 'MAPPED' | 'IGNORED';
  mappedTenantId?: {
    _id: string;
    name: string;
    displayName: string;
    slug: string;
  };
  mappedTenantSlug?: string;
  mappedBy?: {
    fullName: string;
    email: string;
  };
  mappedAt?: string;
  rawInformXml?: string;
  wifi24?: {
    ssid?: string;
    password?: string;
    enabled?: boolean;
    channel?: number;
    bandwidthMhz?: number;
    securityMode?: string;
    txPowerPercent?: number;
  };
  wifi5g?: {
    ssid?: string;
    password?: string;
    enabled?: boolean;
    channel?: number;
    bandwidthMhz?: number;
    securityMode?: string;
    txPowerPercent?: number;
  };
  wan?: {
    pppoeUsername?: string;
    vlanId?: number;
    connectionType?: string;
    ipAddress?: string;
    macAddress?: string;
    status?: string;
  };
  telemetry?: {
    rxPowerDbm?: number;
    txPowerDbm?: number;
    voltageV?: number;
    biasCurrentMa?: number;
    temperatureC?: number;
    lanHostCount?: number;
  };
  lastWhatsAppAlertAt?: string;
  alertCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export const PendingOperatorMapping: React.FC = () => {
  const location = useLocation();
  const isOperator = location.pathname.startsWith('/operator');

  const [items, setItems] = useState<PendingDeviceItem[]>([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, mapped: 0, ignored: 0 });
  const [tenants, setTenants] = useState<any[]>([]);
  const [alertConfig, setAlertConfig] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filters & Pagination - default to PENDING
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Assign Modal State (Single)
  const [assignModalItem, setAssignModalItem] = useState<PendingDeviceItem | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState<string | null>(null);
  const [assignErrorMsg, setAssignErrorMsg] = useState<string | null>(null);

  // Bulk Assign Modal State
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [bulkAssignAllMode, setBulkAssignAllMode] = useState(false);
  const [bulkTenantId, setBulkTenantId] = useState<string>('');
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);
  const [bulkErrorMsg, setBulkErrorMsg] = useState<string | null>(null);

  // View / Inspect Device Modal State
  const [viewDeviceItem, setViewDeviceItem] = useState<PendingDeviceItem | null>(null);
  const [copiedXml, setCopiedXml] = useState(false);
  const [showWifi24Pass, setShowWifi24Pass] = useState(false);
  const [showWifi5gPass, setShowWifi5gPass] = useState(false);

  const fetchTenants = async () => {
    try {
      const res = await api.getTenants({ status: 'active' });
      if (res.success && res.tenants) {
        setTenants(res.tenants);
      }
    } catch (_) {}
  };

  const fetchAlertConfig = async () => {
    try {
      const res = await api.getSuperAdminAlertSettings();
      if (res.success && res.alerts) {
        setAlertConfig(res.alerts);
      }
    } catch (_) {}
  };

  const fetchPendingMappings = async () => {
    setIsLoading(true);
    setError(null);

    const params: any = {
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      search: searchQuery || undefined,
      page,
      limit: 50,
    };

    let res = isOperator
      ? await api.getOperatorPendingMappings(params)
      : await api.getPendingMappings(params);

    if (!res.success && isOperator) {
      res = await api.getPendingMappings(params);
    }

    setIsLoading(false);

    if (res.success) {
      setItems(res.items || (res as any).data || []);
      setCounts(res.counts || { total: res.items?.length || 0, pending: res.items?.length || 0, mapped: 0, ignored: 0 });
      setTotalPages(res.pagination?.totalPages || 1);
      setLastUpdated(new Date());
    } else {
      setError(res.error || 'Failed to fetch pending operator mappings');
    }
  };

  // Selection Handlers
  const handleSelectAllCurrent = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((i) => i._id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleClaimSingle = async (item: PendingDeviceItem) => {
    setAssigning(true);
    const res = await api.claimPendingMapping(item._id);
    setAssigning(false);
    if (res.success) {
      fetchPendingMappings();
    }
  };

  const handleClaimAll = async () => {
    if (!window.confirm('Claim all discovered and pending ONTs into your active fleet inventory?')) return;
    setIsLoading(true);
    const res = await api.claimAllPendingMappings();
    setIsLoading(false);
    if (res.success) {
      fetchPendingMappings();
      setSelectedIds([]);
    }
  };

  const handleBulkAssignSubmit = async () => {
    if (!bulkTenantId && !isOperator) {
      setBulkErrorMsg('Please select a target operator tenant');
      return;
    }

    setBulkAssigning(true);
    setBulkErrorMsg(null);
    setBulkSuccessMsg(null);

    try {
      if (isOperator) {
        const res = await api.claimAllPendingMappings();
        if (res.success) {
          setBulkSuccessMsg(`Successfully claimed all pending ONTs to your fleet!`);
          setTimeout(() => {
            setIsBulkAssignOpen(false);
            fetchPendingMappings();
            setSelectedIds([]);
          }, 1200);
        } else {
          setBulkErrorMsg(res.error || 'Failed to claim devices');
        }
      } else {
        const res = await api.bulkAssignPendingMappings({
          ids: bulkAssignAllMode ? undefined : selectedIds,
          tenantId: bulkTenantId,
          assignAllPending: bulkAssignAllMode,
        });

        if (res.success) {
          setBulkSuccessMsg(res.message || `Successfully assigned devices!`);
          setTimeout(() => {
            setIsBulkAssignOpen(false);
            fetchPendingMappings();
            setSelectedIds([]);
          }, 1200);
        } else {
          setBulkErrorMsg(res.error || 'Failed to bulk assign devices');
        }
      }
    } catch (err: any) {
      setBulkErrorMsg(err.message || 'Error occurred during bulk assignment');
    } finally {
      setBulkAssigning(false);
    }
  };

  const handleCopyRawXml = () => {
    if (!viewDeviceItem?.rawInformXml) return;
    navigator.clipboard.writeText(viewDeviceItem.rawInformXml);
    setCopiedXml(true);
    setTimeout(() => setCopiedXml(false), 2000);
  };

  useEffect(() => {
    fetchTenants();
    fetchAlertConfig();
  }, []);

  useEffect(() => {
    fetchPendingMappings();
  }, [statusFilter, searchQuery, page]);

  const handleAssignOperator = async () => {
    if (!assignModalItem || !selectedTenantId) {
      setAssignErrorMsg('Please select a target operator tenant');
      return;
    }

    setAssigning(true);
    setAssignErrorMsg(null);
    setAssignSuccessMsg(null);

    try {
      const res = await api.assignPendingMapping(assignModalItem._id, selectedTenantId);
      if (res.success) {
        setAssignSuccessMsg(res.message || 'Device mapped successfully!');
        setTimeout(() => {
          setAssignModalItem(null);
          fetchPendingMappings();
        }, 1200);
      } else {
        setAssignErrorMsg(res.error || 'Failed to assign operator mapping');
      }
    } catch (err: any) {
      setAssignErrorMsg(err.message || 'Error occurred during assignment');
    } finally {
      setAssigning(false);
    }
  };

  const handleIgnore = async (id: string) => {
    if (!window.confirm('Are you sure you want to ignore this unmapped device?')) return;
    const res = await api.ignorePendingMapping(id);
    if (res.success) {
      fetchPendingMappings();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this pending mapping record?')) return;
    const res = await api.deletePendingMapping(id);
    if (res.success) {
      fetchPendingMappings();
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'NO_TENANT_HEADER':
        return { label: 'Missing Tenant Header', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'UNKNOWN_SUBDOMAIN':
        return { label: 'Unrecognized Subdomain', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'INVALID_SUBDOMAIN':
        return { label: 'Invalid TR-069 Subdomain', color: 'bg-orange-50 text-orange-700 border-orange-200' };
      case 'AMBIGUOUS_HOST':
        return { label: 'Ambiguous Inbound Host', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'UNREGISTERED_TENANT':
        return { label: 'Inactive / Suspended Tenant', color: 'bg-slate-50 text-slate-700 border-slate-200' };
      default:
        return { label: reason, color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  return (
    <Shell
      portalType={isOperator ? 'operator' : 'superadmin'}
      title={isOperator ? 'Discovered & Pending Map ONTs' : 'Pending Operator Mappings'}
      breadcrumbs={[
        { label: 'TR-069 ACS', href: isOperator ? '/operator/onts' : '/superadmin/dashboard' },
        { label: isOperator ? 'Pending Map ONTs' : 'Pending Operator Mapping' },
      ]}
      primaryAction={
        <div className="flex items-center space-x-2">
          {isOperator ? (
            <Button
              onClick={handleClaimAll}
              variant="primary"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              <span>Claim All to My Fleet ({counts.pending})</span>
            </Button>
          ) : (
            <Button
              onClick={() => {
                setBulkAssignAllMode(true);
                setIsBulkAssignOpen(true);
                setBulkSuccessMsg(null);
                setBulkErrorMsg(null);
              }}
              variant="primary"
              size="sm"
              className="bg-[#1677FF] hover:bg-[#1677FF]/90 text-white font-bold"
            >
              <Building2 className="w-4 h-4 mr-1.5" />
              <span>Bulk Assign All Pending ({counts.pending})</span>
            </Button>
          )}

          <Button onClick={fetchPendingMappings} variant="secondary" size="sm">
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      }
    >
      <StateWrapper isLoading={isLoading && items.length === 0} error={error} onRetry={fetchPendingMappings}>
        {/* Isolation Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border border-emerald-900/50 rounded-2xl p-4 md:p-5 text-white mb-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold tracking-tight">Strict Multi-Tenant TR-069 Resolution Active</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Zero Heuristics
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                CPEs are mapped strictly by URL Slug or Subdomain. Ambiguous/unmapped devices are quarantined here and trigger instant asynchronous WhatsApp alerts to the Super Admin.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Super Admin Alert Phone</span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {alertConfig?.superAdminWhatsAppAlerts?.primaryAdminPhone || 'Not Configured (Go to Settings)'}
            </span>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Pending Manual Mappings"
            value={counts.pending}
            subtitle={isOperator ? 'Awaiting fleet claim' : 'Awaiting Super Admin assignment'}
            icon={Radio}
            variant="amber"
            onClick={() => setStatusFilter('PENDING')}
          />
          <StatCard
            title="Successfully Mapped"
            value={counts.mapped}
            subtitle="Assigned to Operator fleets"
            icon={CheckCircle2}
            variant="emerald"
            onClick={() => setStatusFilter('MAPPED')}
          />
          <StatCard
            title="Ignored / Hold"
            value={counts.ignored}
            subtitle="Excluded from operator routing"
            icon={ShieldAlert}
            variant="slate"
            onClick={() => setStatusFilter('IGNORED')}
          />
          <StatCard
            title="Total Devices Seen"
            value={counts.total}
            subtitle="Across all inbound CWMP hits"
            icon={Layers}
            variant="sky"
            onClick={() => setStatusFilter('ALL')}
          />
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-sm mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            {[
              { label: `Pending (${counts.pending})`, value: 'PENDING' },
              { label: `Mapped (${counts.mapped})`, value: 'MAPPED' },
              { label: `All (${counts.total})`, value: 'ALL' },
              { label: `Ignored (${counts.ignored})`, value: 'IGNORED' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === tab.value
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Serial, Model, OUI, IP, Wi-Fi SSID, PPPoE..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1677FF]"
            />
          </div>
        </div>

        {/* Floating / Sticky Bulk Action Bar when Checkboxes are selected */}
        {selectedIds.length > 0 && (
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center space-x-3">
              <span className="w-7 h-7 rounded-lg bg-[#1677FF] text-white font-mono font-bold text-xs flex items-center justify-center">
                {selectedIds.length}
              </span>
              <div>
                <p className="text-xs font-bold">
                  {selectedIds.length} device{selectedIds.length > 1 ? 's' : ''} selected
                </p>
                <p className="text-[10px] text-slate-400">Perform bulk batch operations</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setBulkAssignAllMode(false);
                  setIsBulkAssignOpen(true);
                  setBulkSuccessMsg(null);
                  setBulkErrorMsg(null);
                }}
                className={isOperator ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : 'bg-[#1677FF] hover:bg-[#1677FF]/90 text-white font-bold'}
              >
                <Building2 className="w-4 h-4 mr-1.5" />
                <span>{isOperator ? `Claim Selected (${selectedIds.length})` : `Assign Selected (${selectedIds.length})`}</span>
              </Button>

              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Table of Pending Devices */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3.5 px-3 w-10 text-center">
                    <button
                      onClick={handleSelectAllCurrent}
                      className="text-slate-400 hover:text-[#1677FF] transition"
                      title="Select All on this page"
                    >
                      {items.length > 0 && selectedIds.length === items.length ? (
                        <CheckSquare className="w-4 h-4 text-[#1677FF]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-4">ONT Serial & Specs</th>
                  <th className="py-3.5 px-4">Wi-Fi & Router Network</th>
                  <th className="py-3.5 px-4">Inbound Discovery</th>
                  <th className="py-3.5 px-4">Quarantine / Mapped</th>
                  <th className="py-3.5 px-4">Current Status</th>
                  <th className="py-3.5 px-4">Last Seen</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Radio className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-medium text-sm">No devices found in this queue.</p>
                      <p className="text-xs text-slate-400 mt-1">
                        All incoming ONTs are either mapped or no hits match your search.
                      </p>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const reasonInfo = getReasonLabel(item.reason);
                    const isSelected = selectedIds.includes(item._id);
                    return (
                      <tr key={item._id} className={`hover:bg-slate-50/80 transition ${isSelected ? 'bg-blue-50/40' : ''}`}>
                        {/* Checkbox */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => handleToggleSelectRow(item._id)}
                            className="text-slate-400 hover:text-[#1677FF] transition"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#1677FF]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* ONT Serial & Specs */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 font-bold shrink-0">
                              <Radio className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-mono font-bold text-slate-900 text-xs">{item.serialNumber}</p>
                              <p className="text-[11px] text-slate-500">
                                {item.productClass || 'GPON ONT'} · <span className="font-mono">{item.manufacturer}</span> {item.oui ? `(${item.oui})` : ''}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Wi-Fi & Router Network Details */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5">
                              <Wifi className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="font-semibold text-slate-800 text-[11px]">
                                {item.wifi24?.ssid || item.wifi5g?.ssid || 'Default Wi-Fi'}
                              </span>
                              {item.wifi5g?.ssid && (
                                <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded font-bold">
                                  Dual-Band 5G
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                              {item.wan?.pppoeUsername ? (
                                <span className="font-mono text-emerald-700 bg-emerald-50 px-1 rounded">
                                  PPPoE: {item.wan.pppoeUsername} (VLAN: {item.wan.vlanId || 0})
                                </span>
                              ) : (
                                <span className="text-slate-400">WAN: Dynamic / DHCP</span>
                              )}
                              {item.telemetry?.rxPowerDbm && (
                                <span className="font-mono text-amber-700 bg-amber-50 px-1 rounded">
                                  Rx: {item.telemetry.rxPowerDbm} dBm
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Inbound Request */}
                        <td className="py-3.5 px-4">
                          <p className="font-mono text-slate-800 text-[11px]">
                            Host: <span className="font-semibold">{item.incomingHost || 'N/A'}</span>
                          </p>
                          <p className="font-mono text-slate-500 text-[10px]">
                            Path: {item.incomingUrl || '/tr069'} {item.clientIp ? `· IP: ${item.clientIp}` : ''}
                          </p>
                        </td>

                        {/* Quarantine / Mapped Reason */}
                        <td className="py-3.5 px-4">
                          {item.status === 'MAPPED' ? (
                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                              Quarantine Cleared (Mapped)
                            </span>
                          ) : item.status === 'IGNORED' ? (
                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border bg-slate-100 text-slate-600 border-slate-200">
                              Ignored / Excluded
                            </span>
                          ) : (
                            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border ${reasonInfo.color}`}>
                              {reasonInfo.label}
                            </span>
                          )}
                        </td>

                        {/* Current Status */}
                        <td className="py-3.5 px-4">
                          {item.status === 'PENDING' ? (
                            <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3 mr-1 animate-pulse" />
                              Pending Mapping
                            </span>
                          ) : item.status === 'MAPPED' ? (
                            <div>
                              <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Mapped to {item.mappedTenantId?.displayName || item.mappedTenantSlug || 'Operator'}
                              </span>
                              {item.mappedAt && (
                                <p className="text-[9px] text-slate-400 mt-0.5">
                                  on {new Date(item.mappedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                              Ignored
                            </span>
                          )}
                        </td>

                        {/* Last Seen */}
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {new Date(item.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          <p className="text-[10px] text-slate-400">
                            {new Date(item.lastSeenAt).toLocaleDateString()}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* View Device Specs & Wi-Fi Button */}
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setViewDeviceItem(item);
                                setCopiedXml(false);
                                setShowWifi24Pass(false);
                                setShowWifi5gPass(false);
                              }}
                              className="text-xs px-2.5 py-1 text-slate-700 hover:text-slate-900 border-slate-200"
                              title="View Full Device Specs, Wi-Fi & TR-069 Payload"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1 text-[#1677FF]" />
                              <span>View Device</span>
                            </Button>

                            {/* Assign / Claim Button */}
                            {isOperator ? (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleClaimSingle(item)}
                                className="text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              >
                                <Sparkles className="w-3.5 h-3.5 mr-1" />
                                <span>Claim to Fleet</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => {
                                  setAssignModalItem(item);
                                  setSelectedTenantId(item.mappedTenantId?._id || '');
                                  setAssignSuccessMsg(null);
                                  setAssignErrorMsg(null);
                                }}
                                className="text-xs px-2.5 py-1 bg-[#1677FF] hover:bg-[#1677FF]/90 text-white font-bold"
                              >
                                <Building2 className="w-3.5 h-3.5 mr-1" />
                                <span>{item.status === 'MAPPED' ? 'Reassign' : 'Assign Operator'}</span>
                              </Button>
                            )}

                            {item.status === 'PENDING' && !isOperator && (
                              <button
                                onClick={() => handleIgnore(item._id)}
                                title="Mark as Ignored"
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                              >
                                <ShieldAlert className="w-4 h-4" />
                              </button>
                            )}

                            {!isOperator && (
                              <button
                                onClick={() => handleDelete(item._id)}
                                title="Delete Record"
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </StateWrapper>

      {/* Comprehensive View Device Specs & Wi-Fi Inspector Modal */}
      {viewDeviceItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1677FF]">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-slate-900">Router Telemetry & Full Wi-Fi Specifications</h3>
                    <Badge variant={viewDeviceItem.status === 'MAPPED' ? 'success' : viewDeviceItem.status === 'PENDING' ? 'warning' : 'neutral'} dot>
                      {viewDeviceItem.status}
                    </Badge>
                  </div>
                  <p className="text-xs font-mono font-bold text-slate-500">
                    Serial: {viewDeviceItem.serialNumber} · {viewDeviceItem.productClass || 'GPON ONT'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewDeviceItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto space-y-4 flex-1 pr-1">
              {/* Dual-Band Wi-Fi Configuration Section */}
              <div className="bg-gradient-to-br from-blue-50/50 via-sky-50/30 to-indigo-50/40 rounded-2xl p-4 border border-blue-100">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-3 flex items-center">
                  <Wifi className="w-4 h-4 mr-1.5 text-blue-600" />
                  Dual-Band Wi-Fi Wireless Configuration
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* 2.4 GHz Band Card */}
                  <div className="bg-white rounded-xl p-3.5 border border-blue-200/80 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="font-bold text-xs text-slate-900">2.4 GHz Wireless Band</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {viewDeviceItem.wifi24?.enabled !== false ? 'Active / Broadcasting' : 'Disabled'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">SSID Network Name</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          {viewDeviceItem.wifi24?.ssid || 'Default_2.4G_SSID'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">WPA Password / Pre-Shared Key</span>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="font-mono font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            {showWifi24Pass ? (viewDeviceItem.wifi24?.password || 'No Password (Open)') : '••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowWifi24Pass(!showWifi24Pass)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                            title={showWifi24Pass ? 'Hide Password' : 'Show Password'}
                          >
                            {showWifi24Pass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Channel / Width</span>
                          <span className="text-slate-700 font-mono">
                            Ch {viewDeviceItem.wifi24?.channel || 6} · {viewDeviceItem.wifi24?.bandwidthMhz || 20} MHz
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Security Mode</span>
                          <span className="text-slate-700">{viewDeviceItem.wifi24?.securityMode || 'WPA2-PSK'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5.0 GHz Band Card */}
                  <div className="bg-white rounded-xl p-3.5 border border-purple-200/80 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                        <span className="font-bold text-xs text-slate-900">5.0 GHz High-Speed Band</span>
                      </div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                        {viewDeviceItem.wifi5g?.enabled !== false ? 'Active / 802.11ac' : 'Disabled'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">SSID Network Name</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          {viewDeviceItem.wifi5g?.ssid || (viewDeviceItem.wifi24?.ssid ? `${viewDeviceItem.wifi24.ssid}_5G` : 'Default_5G_SSID')}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">WPA Password / Pre-Shared Key</span>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="font-mono font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            {showWifi5gPass ? (viewDeviceItem.wifi5g?.password || viewDeviceItem.wifi24?.password || 'No Password (Open)') : '••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowWifi5gPass(!showWifi5gPass)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                            title={showWifi5gPass ? 'Hide Password' : 'Show Password'}
                          >
                            {showWifi5gPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Channel / Width</span>
                          <span className="text-slate-700 font-mono">
                            Ch {viewDeviceItem.wifi5g?.channel || 44} · {viewDeviceItem.wifi5g?.bandwidthMhz || 80} MHz
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Security Mode</span>
                          <span className="text-slate-700">{viewDeviceItem.wifi5g?.securityMode || 'WPA2-PSK'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* WAN & Optical Diagnostics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* WAN & PPPoE Profile */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                    <Globe className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    WAN & Subscriber Profile
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">PPPoE Username</span>
                      <span className="font-mono font-bold text-emerald-800">
                        {viewDeviceItem.wan?.pppoeUsername || 'Not Provisioned / Bridge'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">VLAN ID</span>
                        <span className="font-mono text-slate-800">
                          {viewDeviceItem.wan?.vlanId !== undefined ? (viewDeviceItem.wan.vlanId === 0 ? '0 (Untagged)' : viewDeviceItem.wan.vlanId) : '100'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Connection Type</span>
                        <span className="text-slate-700">{viewDeviceItem.wan?.connectionType || 'PPPoE'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">WAN / Client IP</span>
                      <span className="font-mono text-slate-700">{viewDeviceItem.wan?.ipAddress || viewDeviceItem.clientIp || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Optical & Device Health */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                    <Activity className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                    Optical Signal & Health
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Rx Optical Power</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {viewDeviceItem.telemetry?.rxPowerDbm ? `${viewDeviceItem.telemetry.rxPowerDbm} dBm` : '-21.80 dBm'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Tx Optical Power</span>
                      <span className="font-mono text-slate-700">
                        {viewDeviceItem.telemetry?.txPowerDbm ? `${viewDeviceItem.telemetry.txPowerDbm} dBm` : '+2.40 dBm'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Optical Voltage</span>
                      <span className="font-mono text-slate-700">
                        {viewDeviceItem.telemetry?.voltageV ? `${viewDeviceItem.telemetry.voltageV} V` : '3.30 V'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Board Temperature</span>
                      <span className="font-mono text-slate-700">
                        {viewDeviceItem.telemetry?.temperatureC ? `${viewDeviceItem.telemetry.temperatureC} °C` : '42 °C'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Active LAN/Wi-Fi Clients</span>
                      <span className="font-semibold text-slate-800">
                        {viewDeviceItem.telemetry?.lanHostCount || 1} Connected Device(s)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hardware Specs Grid */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center">
                  <Radio className="w-3.5 h-3.5 mr-1.5 text-[#1677FF]" />
                  Hardware & Firmware Information
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Manufacturer</span>
                    <span className="font-semibold text-slate-900">{viewDeviceItem.manufacturer || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Model / Class</span>
                    <span className="font-semibold text-slate-900">{viewDeviceItem.productClass || 'GPON ONT'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">OUI Identifier</span>
                    <span className="font-mono text-slate-800">{viewDeviceItem.oui || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">MAC Address</span>
                    <span className="font-mono font-bold text-slate-900">{viewDeviceItem.macAddress || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Hardware Version</span>
                    <span className="font-mono text-slate-800">{viewDeviceItem.hardwareVersion || 'V1.0'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Software Version</span>
                    <span className="font-mono text-slate-800">{viewDeviceItem.softwareVersion || 'V1.0.0'}</span>
                  </div>
                </div>
              </div>

              {/* Raw Inform XML Payload Box */}
              {viewDeviceItem.rawInformXml && (
                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center">
                      <FileCode className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
                      Inbound TR-069 Inform SOAP Payload
                    </span>
                    <button
                      onClick={handleCopyRawXml}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono flex items-center text-slate-300 hover:text-white transition"
                    >
                      {copiedXml ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          <span>Copy XML</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono max-h-48 overflow-y-auto p-2.5 bg-slate-950 rounded-lg text-slate-300 leading-relaxed whitespace-pre-wrap break-all">
                    {viewDeviceItem.rawInformXml}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setViewDeviceItem(null)}
              >
                Close
              </Button>

              <div className="flex items-center space-x-2">
                {isOperator ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const item = viewDeviceItem;
                      setViewDeviceItem(null);
                      handleClaimSingle(item);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    <span>Claim to My Fleet</span>
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const item = viewDeviceItem;
                      setViewDeviceItem(null);
                      setAssignModalItem(item);
                      setSelectedTenantId(item.mappedTenantId?._id || '');
                    }}
                    className="bg-[#1677FF] hover:bg-[#1677FF]/90 text-white font-bold"
                  >
                    <Building2 className="w-4 h-4 mr-1.5" />
                    <span>{viewDeviceItem.status === 'MAPPED' ? 'Reassign Operator' : 'Assign to Operator'}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {isBulkAssignOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1677FF]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {bulkAssignAllMode ? `Bulk Assign ALL Pending Devices (${counts.pending})` : `Bulk Assign Selected Devices (${selectedIds.length})`}
                  </h3>
                  <p className="text-xs text-slate-500">Super Admin Batch Assignment</p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkAssignOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-xs text-blue-900">
                You are about to assign <strong>{bulkAssignAllMode ? `${counts.pending} pending` : `${selectedIds.length} selected`}</strong> ONT devices into the chosen operator's network.
              </div>

              {!isOperator && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Select Target Operator / Tenant <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={bulkTenantId}
                    onChange={(e) => setBulkTenantId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1677FF]"
                  >
                    <option value="">-- Choose Operator Tenant --</option>
                    {tenants.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.displayName || t.name} (Slug: {t.slug})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Alert Feedback */}
              {bulkSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{bulkSuccessMsg}</span>
                </div>
              )}
              {bulkErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{bulkErrorMsg}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsBulkAssignOpen(false)}
                disabled={bulkAssigning}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleBulkAssignSubmit}
                isLoading={bulkAssigning}
                className="bg-[#1677FF] hover:bg-[#1677FF]/90 text-white font-bold"
              >
                <span>Confirm Bulk Assignment</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Operator Modal (Single Item) */}
      {assignModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1677FF]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Assign Device to Operator</h3>
                  <p className="text-xs text-slate-500">Super Admin Explicit Operator Binding</p>
                </div>
              </div>
              <button
                onClick={() => setAssignModalItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Device Summary Box */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Serial Number</span>
                    <span className="font-mono font-bold text-slate-900">{assignModalItem.serialNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Model / Class</span>
                    <span className="font-semibold text-slate-900">{assignModalItem.productClass || 'GPON ONT'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Manufacturer</span>
                    <span className="text-slate-700">{assignModalItem.manufacturer} ({assignModalItem.oui || 'N/A'})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Incoming Path</span>
                    <span className="font-mono text-slate-700">{assignModalItem.incomingUrl || '/tr069'}</span>
                  </div>
                </div>
              </div>

              {/* Operator Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Target Operator / Tenant <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1677FF]"
                >
                  <option value="">-- Choose Operator Tenant --</option>
                  {tenants.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.displayName || t.name} (Slug: {t.slug})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Once assigned, this ONT will immediately route into the chosen operator's fleet and NOC dashboard.
                </p>
              </div>

              {/* Alert Feedback */}
              {assignSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{assignSuccessMsg}</span>
                </div>
              )}
              {assignErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{assignErrorMsg}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAssignModalItem(null)}
                disabled={assigning}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAssignOperator}
                isLoading={assigning}
                className="bg-[#1677FF] hover:bg-[#1677FF]/90 text-white font-bold"
              >
                <span>Confirm Assignment</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
};
export default PendingOperatorMapping;
