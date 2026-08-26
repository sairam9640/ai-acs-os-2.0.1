import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radio,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Signal,
  Shield,
  Power,
  UserPlus,
  Wifi,
  Globe,
  Zap,
  Cpu,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Server,
  UserCheck,
  Edit3,
  Sliders,
  Activity,
  Layers,
  Monitor,
  History,
  Lock,
  ArrowRight,
  Info,
  AlertTriangle,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button, Input } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../services/api.js';

export const ONTList: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [now, setNow] = useState(Date.now());

  // 30-second smooth ticker to calculate elapsed times without UI re-render lag
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Modals
  const [inspectDevice, setInspectDevice] = useState<any | null>(null);
  const [inspectData, setInspectData] = useState<any | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Edit Configuration Modal State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configSubmitting, setConfigSubmitting] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState({
    wifi24Ssid: '',
    wifi24Password: '',
    wifi24Channel: 6,
    wifi24Enabled: true,
    wifi5gSsid: '',
    wifi5gPassword: '',
    wifi5gChannel: 44,
    wifi5gEnabled: true,
    pppoeUsername: '',
    pppoePassword: '',
    vlanId: 100,
  });

  // Assign Subscriber Modal State
  const [assigningDevice, setAssigningDevice] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Bulk Delete State
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [summonSuccessToast, setSummonSuccessToast] = useState<string | null>(null);

  // Delete Device Confirmation Modal
  const [deviceToDelete, setDeviceToDelete] = useState<any | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedDeviceIds(devices.map((d) => d._id));
    } else {
      setSelectedDeviceIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedDeviceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedDeviceIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await Promise.all(selectedDeviceIds.map((id) => api.deleteDevice(id)));
      setSelectedDeviceIds([]);
      setIsBulkDeleteOpen(false);
      fetchDevices();
    } catch (_) {}
    setIsBulkDeleting(false);
  };

  const [isSummoningAll, setIsSummoningAll] = useState(false);

  const handleSummonAll = async () => {
    setIsSummoningAll(true);
    const start = performance.now();
    try {
      const res = await api.summonAllDevices();
      const elapsedMs = Math.round(performance.now() - start);
      const elapsedSec = (elapsedMs / 1000).toFixed(2);
      if (res.success) {
        setSummonSuccessToast(`Fleet Summon Dispatched! Polling ${res.dispatchedCount || devices.length} ONTs across network in ${elapsedSec}s`);
        setTimeout(() => {
          fetchDevices();
        }, 1500);
        setTimeout(() => setSummonSuccessToast(null), 6000);
      }
    } catch (err: any) {
      setSummonSuccessToast(`Fleet Summon Error: ${err.message}`);
    } finally {
      setIsSummoningAll(false);
    }
  };

  const [isSyncingFleet, setIsSyncingFleet] = useState(false);

  const handleSyncFleet = async () => {
    setIsSyncingFleet(true);
    try {
      const res = await api.syncFleetDiscovery();
      if (res.success) {
        setSummonSuccessToast(res.message || 'Fleet Discovery Reconciliation Completed!');
        fetchDevices();
        setTimeout(() => setSummonSuccessToast(null), 5000);
      }
    } catch (err: any) {
      setSummonSuccessToast(`Sync Error: ${err.message}`);
    } finally {
      setIsSyncingFleet(false);
    }
  };

  const handleRowSummon = async (d: any) => {
    const start = performance.now();
    try {
      const res = await api.summonDevice(d._id);
      const elapsedMs = Math.round(performance.now() - start);
      const elapsedSec = (elapsedMs / 1000).toFixed(2);
      if (res.success) {
        setSummonSuccessToast(`Summoned & Polled ${d.serialNumber} in ${elapsedSec}s (${elapsedMs} ms)`);
        fetchDevices();
        setTimeout(() => setSummonSuccessToast(null), 4000);
      }
    } catch (err: any) {
      setSummonSuccessToast(`Summon Error: ${err.message}`);
    }
  };

  const handleOpenDeleteModal = (d: any) => {
    setDeviceToDelete(d);
  };

  const handleConfirmDelete = async () => {
    if (!deviceToDelete) return;
    setDeleteSubmitting(true);
    try {
      await api.deleteDevice(deviceToDelete._id);
      setSelectedDeviceIds((prev) => prev.filter((id) => id !== deviceToDelete._id));
      setDeviceToDelete(null);
      fetchDevices();
    } catch (_) {}
    setDeleteSubmitting(false);
  };

  const handleOpenInspect = async (d: any) => {
    setInspectDevice(d);
    setInspectData(null);
    setInspectLoading(true);
    try {
      const res = await api.get(`/operator/devices/${d._id}/inspect`);
      if (res.success) setInspectData(res.inspect);
    } catch (_) {}
    setInspectLoading(false);
  };

  const handleRefreshTelemetry = async () => {
    if (!inspectDevice) return;
    setIsRefreshing(true);
    try {
      await api.post(`/operator/devices/${inspectDevice._id}/refresh-telemetry`);
      const res = await api.get(`/operator/devices/${inspectDevice._id}/inspect`);
      if (res.success) setInspectData(res.inspect);
    } catch (_) {}
    setIsRefreshing(false);
  };

  const handleOpenEditConfig = () => {
    if (!inspectData) return;
    setConfigError(null);
    setConfigSuccess(null);
    setConfigForm({
      wifi24Ssid: inspectData.wifi?.band24?.ssid || '',
      wifi24Password: '',
      wifi24Channel: inspectData.wifi?.band24?.channel || 6,
      wifi24Enabled: inspectData.wifi?.band24?.enabled ?? true,
      wifi5gSsid: inspectData.wifi?.band5g?.ssid || '',
      wifi5gPassword: '',
      wifi5gChannel: inspectData.wifi?.band5g?.channel || 44,
      wifi5gEnabled: inspectData.wifi?.band5g?.enabled ?? true,
      pppoeUsername: inspectData.wan?.pppoeUsername || '',
      pppoePassword: '',
      vlanId: inspectData.wan?.vlanId ?? 100,
    });
    setIsConfigOpen(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectDevice) return;
    setConfigSubmitting(true);
    setConfigError(null);
    setConfigSuccess(null);

    try {
      const payload: any = {
        wifi24: {
          ssid: configForm.wifi24Ssid,
          channel: Number(configForm.wifi24Channel),
          enabled: Boolean(configForm.wifi24Enabled),
        },
        wifi5g: {
          ssid: configForm.wifi5gSsid,
          channel: Number(configForm.wifi5gChannel),
          enabled: Boolean(configForm.wifi5gEnabled),
        },
        wan: {
          pppoeUsername: configForm.pppoeUsername,
          vlanId: Number(configForm.vlanId),
        },
      };

      if (configForm.wifi24Password) payload.wifi24.password = configForm.wifi24Password;
      if (configForm.wifi5gPassword) payload.wifi5g.password = configForm.wifi5gPassword;
      if (configForm.pppoePassword) payload.wan.pppoePassword = configForm.pppoePassword;

      const res = await api.put(`/operator/devices/${inspectDevice._id}/configuration`, payload);

      if (res.success) {
        setConfigSuccess('Parameters updated and verified on device.');
        setTimeout(async () => {
          setIsConfigOpen(false);
          const inspectRes = await api.get(`/operator/devices/${inspectDevice._id}/inspect`);
          if (inspectRes.success) setInspectData(inspectRes.inspect);
          fetchDevices();
        }, 1200);
      } else {
        setConfigError(res.error || 'Failed to apply configuration change.');
      }
    } catch (err: any) {
      setConfigError(err.message || 'Network error saving configuration.');
    } finally {
      setConfigSubmitting(false);
    }
  };

  // Assign Subscriber Form State
  const [subscriberForm, setSubscriberForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    door: '',
    street: '',
    area: '',
    city: 'Hyderabad',
    pincode: '500081',
    planName: 'Fiber Express 100 Mbps Unlimited',
    downloadSpeedMbps: 100,
    uploadSpeedMbps: 100,
    monthlyFee: 699,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    pppoeUsername: '',
    pppoePassword: '',
    vlanId: 100,
  });

  const fetchDevices = async () => {
    setIsLoading(true);
    setError(null);
    const res = await api.getDevices({ search, status: statusFilter });
    setIsLoading(false);
    if (res.success) {
      setDevices(res.devices || []);
    } else {
      setError(res.error || 'Failed to fetch ONT fleet');
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [statusFilter]);

  const handleOpenAssignModal = (d: any) => {
    setAssigningDevice(d);
    setFormError(null);
    setFormSuccess(null);
    const defaultUser = `user_${d.serialNumber.slice(-6).toLowerCase()}`;
    setSubscriberForm({
      fullName: '',
      phone: '',
      email: '',
      door: 'Flat 101',
      street: 'Main Road',
      area: 'Cluster 1',
      city: 'Hyderabad',
      pincode: '500081',
      planName: 'Fiber Express 100 Mbps Unlimited',
      downloadSpeedMbps: 100,
      uploadSpeedMbps: 100,
      monthlyFee: 699,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      pppoeUsername: `${defaultUser}@isp.net`,
      pppoePassword: '',
      vlanId: 100,
    });
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningDevice) return;
    if (!subscriberForm.fullName.trim() || !subscriberForm.phone.trim()) {
      setFormError('Please enter Customer Full Name and Mobile Number.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        fullName: subscriberForm.fullName,
        phone: subscriberForm.phone,
        email: subscriberForm.email,
        address: {
          door: subscriberForm.door,
          street: subscriberForm.street,
          area: subscriberForm.area,
          city: subscriberForm.city,
          pincode: subscriberForm.pincode,
        },
        planName: subscriberForm.planName,
        downloadSpeedMbps: Number(subscriberForm.downloadSpeedMbps),
        uploadSpeedMbps: Number(subscriberForm.uploadSpeedMbps),
        monthlyFee: Number(subscriberForm.monthlyFee),
        startDate: subscriberForm.startDate,
        endDate: subscriberForm.endDate,
        pppoeUsername: subscriberForm.pppoeUsername,
        pppoePassword: subscriberForm.pppoePassword,
        vlanId: Number(subscriberForm.vlanId),
      };

      const res = await api.assignDeviceToSubscriber(assigningDevice._id, payload);
      if (res.success) {
        setFormSuccess('Subscriber onboarded and assigned to ONT successfully!');
        setTimeout(() => {
          setAssigningDevice(null);
          fetchDevices();
        }, 1500);
      } else {
        setFormError(res.error || 'Failed to assign subscriber.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error occurred while assigning subscriber.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<any>[] = [
    {
      header: (
        <input
          type="checkbox"
          checked={devices.length > 0 && selectedDeviceIds.length === devices.length}
          onChange={handleSelectAll}
          className="w-4 h-4 rounded text-sky-600 border-[#CBD5E1] cursor-pointer"
        />
      ),
      accessor: (d) => (
        <input
          type="checkbox"
          checked={selectedDeviceIds.includes(d._id)}
          onChange={(e) => {
            e.stopPropagation();
            handleToggleSelect(d._id);
          }}
          className="w-4 h-4 rounded text-sky-600 border-[#CBD5E1] cursor-pointer"
        />
      ),
    },
    {
      header: 'Hardware / Serial #',
      accessor: (d) => (
        <div className="flex items-center space-x-3">
          <Radio className={`w-4 h-4 ${d.status === 'online' ? 'text-[#047857] animate-pulse' : 'text-[#94A3B8]'}`} />
          <div>
            <p className="font-semibold text-[#0F172A] font-mono text-sm">{d.serialNumber}</p>
            <p className="text-xs text-[#64748B]">{d.manufacturer} {d.modelName || 'GPON ONT'}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Protocol / IP',
      accessor: (d) => (
        <div>
          <Badge variant={d.protocol === 'TR-369' ? 'purple' : 'info'}>{d.protocol || 'TR-069'}</Badge>
          <div className="mt-1">
            {d.ipAddress ? (
              <p className="text-xs font-mono text-[#64748B]">{d.ipAddress}</p>
            ) : (
              <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                Unassigned
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Subscriber Assignment',
      accessor: (d) => (
        <div>
          {d.customerId ? (
            <div>
              <p className="text-xs font-semibold text-[#1D4ED8]">{d.customerId?.fullName}</p>
              <p className="text-[11px] font-mono text-[#64748B]">{d.customerId?.phone || d.customerId?.accountNumber}</p>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-[#B45309]/90 font-medium px-2 py-0.5 bg-[#FFFBEB] border border-[#FDE68A] rounded">
                Unassigned Pool
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAssignModal(d);
                }}
                className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-[11px] text-white font-medium flex items-center space-x-1 transition"
              >
                <UserPlus className="w-3 h-3" />
                <span>Assign</span>
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'RX Optical Power',
      accessor: (d) => {
        const pwr = d.opticalRxPower !== undefined && d.opticalRxPower !== null
          ? d.opticalRxPower
          : (d.opticalPowerDbm !== undefined && d.opticalPowerDbm !== null
            ? d.opticalPowerDbm
            : d.currentRxPowerDbm);

        if (pwr === undefined || pwr === null) {
          return (
            <span className="text-xs text-[#94A3B8] italic">
              Unavailable
            </span>
          );
        }
        let variant: 'success' | 'warning' | 'danger' = 'success';
        if (pwr < -27) variant = 'danger';
        else if (pwr < -24.5) variant = 'warning';
        return (
          <Badge variant={variant} dot>
            {pwr} dBm
          </Badge>
        );
      },
    },
    {
      header: 'Online State & Last Report',
      accessor: (d) => {
        const lastInformTime = d.lastInform ? new Date(d.lastInform).getTime() : 0;
        const elapsedSec = lastInformTime > 0 ? Math.max(0, Math.floor((now - lastInformTime) / 1000)) : null;
        const isOnline = d.status === 'online' || (elapsedSec !== null && elapsedSec < 360);

        let elapsedLabel = 'Never reported';
        if (elapsedSec !== null) {
          if (elapsedSec < 60) elapsedLabel = `${elapsedSec}s ago`;
          else if (elapsedSec < 3600) elapsedLabel = `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s ago`;
          else elapsedLabel = `${Math.floor(elapsedSec / 3600)}h ${Math.floor((elapsedSec % 3600) / 60)}m ago`;
        }

        return (
          <div>
            <div className="flex items-center space-x-1.5">
              <Badge variant={isOnline ? 'success' : 'danger'} dot>
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
              {elapsedSec !== null && (
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  elapsedSec < 120 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                  elapsedSec < 360 ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                  'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {elapsedLabel}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#64748B] font-mono mt-1 flex items-center space-x-1">
              <Clock className="w-3 h-3 inline text-slate-400 shrink-0" />
              <span>{d.lastInform ? new Date(d.lastInform).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Never reported'}</span>
            </p>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      accessor: (d) => (
        <div className="flex items-center space-x-1.5">
          <Button
            size="sm"
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/operator/devices/${d._id}`);
            }}
            title="Full Workspace Console"
          >
            <Sliders className="w-3.5 h-3.5 mr-1" />
            <span>Manage</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleRowSummon(d);
            }}
            title="Summon & Poll Live Device"
          >
            <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" />
            <span>Summon</span>
          </Button>

          <Button
            size="sm"
            variant="danger"
            className="px-2"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDeleteModal(d);
            }}
            title="Delete ONT from Fleet"
          >
            <Power className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Shell
      portalType="operator"
      title="ONT & CPE Fleet Inventory"
      breadcrumbs={[{ label: 'ONT Fleet' }]}
      primaryAction={
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/operator/pending-mappings')}
            className="flex items-center space-x-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pending Map ONTs</span>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleSyncFleet}
            isLoading={isSyncingFleet}
            className="flex items-center space-x-1.5"
            title="Auto-reconcile all network-wide CPEs into fleet"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Sync Fleet Discovery</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {summonSuccessToast && (
          <div className="p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-[#065F46] text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{summonSuccessToast}</span>
          </div>
        )}

        {/* Fleet Inventory Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 border border-[#CBD5E1] rounded-2xl shadow-xs">
          <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
            <span className="text-[11px] text-[#64748B] block font-semibold">Total ONTs in Fleet</span>
            <span className="text-xl font-mono font-bold text-[#0F172A]">{devices.length}</span>
          </div>
          <div className="p-3 bg-[#ECFDF5] rounded-xl border border-[#A7F3D0]">
            <span className="text-[11px] text-[#047857] block font-semibold">Online Fleet</span>
            <span className="text-xl font-mono font-bold text-[#047857]">
              {devices.filter((d) => d.status === 'online').length}
            </span>
          </div>
          <div className="p-3 bg-[#FEF2F2] rounded-xl border border-[#FECACA]">
            <span className="text-[11px] text-[#B91C1C] block font-semibold">Offline Fleet</span>
            <span className="text-xl font-mono font-bold text-[#B91C1C]">
              {devices.filter((d) => d.status !== 'online').length}
            </span>
          </div>
          <div className="p-3 bg-[#EFF6FF] rounded-xl border border-[#BFDBFE] flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#1677FF] block font-semibold">Selected</span>
              <span className="text-xl font-mono font-bold text-[#1677FF]">{selectedDeviceIds.length}</span>
            </div>
            {selectedDeviceIds.length > 0 && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => setIsBulkDeleteOpen(true)}
                className="font-bold"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                <span>Delete Selected</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 border border-[#CBD5E1] rounded-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchDevices();
            }}
            className="w-full sm:w-80"
          >
            <Input
              placeholder="Search serial, MAC, IP, model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />
          </form>

          <div className="flex items-center space-x-2">
            {['all', 'online', 'offline'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                  statusFilter === st ? 'bg-sky-600 text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                {st}
              </button>
            ))}
            <Button
              size="sm"
              variant="primary"
              onClick={handleSummonAll}
              isLoading={isSummoningAll}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
              title="Trigger live TR-069 poll across all ONTs in fleet"
            >
              <Zap className="w-3.5 h-3.5 mr-1" />
              <span>Summon All ONTs</span>
            </Button>
            <Button size="sm" variant="outline" onClick={fetchDevices}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        <StateWrapper isLoading={isLoading} error={error} onRetry={fetchDevices}>
          <DataTable columns={columns} data={devices} keyExtractor={(d) => d._id} />
        </StateWrapper>
      </div>

      {/* Complete 13-Section ONT Inspection Modal */}
      <Modal
        isOpen={!!inspectDevice}
        onClose={() => { setInspectDevice(null); setInspectData(null); }}
        title={`ONT Device Inspection — ${inspectDevice?.serialNumber || ''}`}
        subtitle={`${inspectDevice?.manufacturer || 'Generic'} ${inspectDevice?.modelName || 'GPON ONT'} | Protocol: ${inspectData?.hardware?.protocol || inspectDevice?.protocol || 'TR-069'}`}
        maxWidth="2xl"
      >
        {inspectDevice && (
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
            {inspectLoading && (
              <div className="flex items-center justify-center py-12 text-[#64748B] text-sm">
                <RefreshCw className="w-5 h-5 mr-2 animate-spin text-[#1677FF]" />
                Querying live telemetry from {inspectDevice?.protocol || 'TR-069'} ACS parameter tree...
              </div>
            )}

            {!inspectLoading && inspectData && (
              <>
                {/* Action Bar: Edit Configuration & Refresh Telemetry */}
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#E2E8F0]">
                  <div className="flex items-center space-x-2">
                    <Badge variant={inspectData.hardware?.protocol === 'TR-369' ? 'purple' : 'info'}>
                      {inspectData.hardware?.protocol || 'TR-069'}
                    </Badge>
                    <span className="text-xs text-[#64748B]">
                      Last Updated: <span className="text-[#1E293B] font-mono">{inspectData.telemetry?.lastUpdated ? new Date(inspectData.telemetry.lastUpdated).toLocaleTimeString() : 'Just now'}</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" onClick={handleRefreshTelemetry} isLoading={isRefreshing}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      <span>Refresh Telemetry</span>
                    </Button>
                    <Button size="sm" variant="primary" onClick={handleOpenEditConfig}>
                      <Edit3 className="w-3.5 h-3.5 mr-1" />
                      <span>Edit Configuration</span>
                    </Button>
                  </div>
                </div>

                {/* 1. Device Identity & Hardware Grid */}
                <div>
                  <h4 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <Server className="w-3.5 h-3.5 text-[#1677FF]" />
                    <span>1. Device Identity & Hardware</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] block font-semibold uppercase">Status</span>
                      <Badge variant={inspectData.deviceStatus === 'online' ? 'success' : 'danger'} dot className="mt-1">
                        {inspectData.deviceStatus === 'online' ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] block font-semibold uppercase">Manufacturer</span>
                      <span className="text-xs font-semibold text-[#1E293B] mt-1 block">
                        {inspectData.hardware?.manufacturer ?? <span className="text-[#94A3B8] italic">Not available</span>}
                      </span>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] block font-semibold uppercase">MAC Address</span>
                      <span className="text-xs font-mono text-[#1E293B] mt-1 block">
                        {inspectData.hardware?.macAddress ?? <span className="text-[#94A3B8] italic">Not available</span>}
                      </span>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] block font-semibold uppercase">Firmware / Software</span>
                      <span className="text-xs font-mono text-[#1E293B] mt-1 block">
                        {inspectData.hardware?.firmwareVersion ?? <span className="text-[#94A3B8] italic">Not available</span>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Optical Telemetry (Authoritative Real-Time Data) */}
                <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <div className="flex items-center space-x-2">
                      <Signal className="w-4 h-4 text-[#047857]" />
                      <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">2. Live Optical Telemetry</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-[#64748B]">
                        Source: <span className="text-[#1677FF] font-mono font-semibold">{inspectData.telemetry?.source}</span>
                      </span>
                      {inspectData.telemetry?.rxPowerDbm != null ? (
                        <Badge
                          variant={
                            inspectData.telemetry.rxPowerDbm < -27 ? 'danger'
                            : inspectData.telemetry.rxPowerDbm < -24.5 ? 'warning'
                            : 'success'
                          }
                          dot
                        >
                          {inspectData.telemetry.rxPowerDbm < -27 ? 'Critical Signal'
                            : inspectData.telemetry.rxPowerDbm < -24.5 ? 'Optical Warning'
                            : 'Optimal Signal'}
                        </Badge>
                      ) : (
                        <Badge variant="neutral">Telemetry Unavailable</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {[
                      { label: 'RX Optical Power', value: inspectData.telemetry?.rxPowerDbm, unit: 'dBm', color: 'text-[#047857]' },
                      { label: 'TX Optical Power', value: inspectData.telemetry?.txPowerDbm, unit: 'dBm', color: 'text-[#1677FF]' },
                      { label: 'Bias Current', value: inspectData.telemetry?.biasCurrentMa, unit: 'mA', color: 'text-[#B45309]' },
                      { label: 'Optical Voltage', value: inspectData.telemetry?.opticalVoltageV, unit: 'V', color: 'text-[#5B21B6]' },
                    ].map(({ label, value, unit, color }) => (
                      <div key={label} className="p-3 bg-white rounded-lg border border-[#E2E8F0]">
                        <span className="text-[11px] text-[#64748B] block font-medium">{label}:</span>
                        {value !== null && value !== undefined ? (
                          <div className="mt-0.5">
                            <span className={`text-base font-mono font-bold ${color}`}>{value}</span>
                            <span className="text-xs text-[#64748B] ml-1">{unit}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#94A3B8] italic mt-1 block">Not available</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div className="p-2.5 bg-white rounded-lg border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] block">Temperature:</span>
                      {inspectData.telemetry?.temperatureC != null ? (
                        <span className="text-sm font-mono font-bold text-[#1E293B]">{inspectData.telemetry.temperatureC} °C</span>
                      ) : (
                        <span className="text-xs text-[#94A3B8] italic">Not available</span>
                      )}
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] block">LOS Status:</span>
                      <span className={`text-xs font-mono font-bold ${inspectData.telemetry?.losStatus === 'NORMAL' ? 'text-[#047857]' : 'text-[#B91C1C]'}`}>
                        {inspectData.telemetry?.losStatus || 'NORMAL'}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] block">Optical Alarm:</span>
                      <span className="text-xs font-mono text-[#334155]">
                        {inspectData.telemetry?.opticalAlarm || 'NONE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. System Health */}
                <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center space-x-2 mb-1">
                    <Activity className="w-4 h-4 text-[#6D28D9]" />
                    <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">3. System Resources & Health</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-2.5 bg-white rounded-lg border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] block">CPU Utilization:</span>
                      {inspectData.system?.cpuUsagePercent != null ? (
                        <span className="text-sm font-mono font-bold text-[#1677FF]">{inspectData.system.cpuUsagePercent}%</span>
                      ) : (
                        <span className="text-xs text-[#94A3B8] italic">Not available</span>
                      )}
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] block">Memory (RAM) Usage:</span>
                      {inspectData.system?.memoryUsagePercent != null ? (
                        <span className="text-sm font-mono font-bold text-[#6D28D9]">{inspectData.system.memoryUsagePercent}%</span>
                      ) : (
                        <span className="text-xs text-[#94A3B8] italic">Not available</span>
                      )}
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] block">Uptime:</span>
                      <span className="text-xs font-mono text-[#334155]">
                        {inspectData.system?.uptimeSeconds ? `${Math.floor(inspectData.system.uptimeSeconds / 3600)}h ${Math.floor((inspectData.system.uptimeSeconds % 3600) / 60)}m` : 'Active'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4 & 5. Wi-Fi Dual Band Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 2.4 GHz */}
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Wifi className="w-4 h-4 text-[#047857]" />
                        <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">4. Wi-Fi 2.4 GHz Band</h4>
                      </div>
                      <Badge variant={inspectData.wifi?.band24?.enabled ? 'success' : 'neutral'}>
                        {inspectData.wifi?.band24?.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 bg-white rounded-lg border border-[#E2E8F0] flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-[#64748B] block font-semibold">2.4 GHz SSID:</span>
                          <span className="font-mono text-[#1E293B] font-bold">{inspectData.wifi?.band24?.ssid || <span className="text-[#94A3B8] italic">Not configured</span>}</span>
                        </div>
                        <Badge variant="info">Ch {inspectData.wifi?.band24?.channel || 6}</Badge>
                      </div>
                      <div className="p-2 bg-white rounded text-[11px] text-[#64748B] flex justify-between">
                        <span>Security: {inspectData.wifi?.band24?.securityMode || 'WPA2-PSK'}</span>
                        <span>Width: {inspectData.wifi?.band24?.bandwidthMhz || 20} MHz</span>
                      </div>
                    </div>
                  </div>

                  {/* 5.0 GHz */}
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Wifi className="w-4 h-4 text-[#6D28D9]" />
                        <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">5. Wi-Fi 5.0 GHz Band</h4>
                      </div>
                      <Badge variant={inspectData.wifi?.band5g?.enabled ? 'purple' : 'neutral'}>
                        {inspectData.wifi?.band5g?.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 bg-white rounded-lg border border-[#E2E8F0] flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-[#64748B] block font-semibold">5.0 GHz SSID:</span>
                          <span className="font-mono text-[#1E293B] font-bold">{inspectData.wifi?.band5g?.ssid || <span className="text-[#94A3B8] italic">Not configured</span>}</span>
                        </div>
                        <Badge variant="purple">Ch {inspectData.wifi?.band5g?.channel || 44}</Badge>
                      </div>
                      <div className="p-2 bg-white rounded text-[11px] text-[#64748B] flex justify-between">
                        <span>Security: {inspectData.wifi?.band5g?.securityMode || 'WPA2-PSK'}</span>
                        <span>Width: {inspectData.wifi?.band5g?.bandwidthMhz || 80} MHz</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6 & 7. WAN, PPPoE & VLAN Profile */}
                <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-3">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-[#1677FF]" />
                    <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">6 & 7. WAN, PPPoE & VLAN Profile</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] block font-semibold">WAN IP:</span>
                      <span className="font-mono text-[#1677FF] font-bold block mt-0.5">
                        {inspectData.wan?.wanIp || <span className="text-[#94A3B8] italic">Not available</span>}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] block font-semibold">PPPoE Username:</span>
                      <span className="font-mono text-[#1E293B] font-bold block mt-0.5">
                        {inspectData.wan?.pppoeUsername || <span className="text-[#94A3B8] italic">Not available</span>}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] block font-semibold">VLAN ID:</span>
                      <span className="font-mono text-[#1E293B] font-bold block mt-0.5">
                        {inspectData.wan?.vlanId != null ? inspectData.wan.vlanId : <span className="text-[#94A3B8] italic">Not available</span>}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] block font-semibold">WAN Connection:</span>
                      <Badge variant={inspectData.wan?.connectionStatus === 'Connected' ? 'success' : 'warning'} dot className="mt-1">
                        {inspectData.wan?.connectionStatus || 'Connecting'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* 8. Connected LAN Clients */}
                <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <Monitor className="w-4 h-4 text-[#B45309]" />
                      <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">8. Connected LAN Devices</h4>
                    </div>
                    <Badge variant="neutral">Count: {inspectData.lan?.hostCount || 0}</Badge>
                  </div>
                  {inspectData.lan?.connectedClients && inspectData.lan.connectedClients.length > 0 ? (
                    <div className="space-y-1.5">
                      {inspectData.lan.connectedClients.map((cl: any, idx: number) => (
                        <div key={idx} className="p-2 bg-white rounded-lg border border-[#E2E8F0] flex justify-between text-xs font-mono">
                          <span className="text-[#1E293B]">{cl.hostname || 'Client Device'} ({cl.ip})</span>
                          <span className="text-[#64748B]">{cl.mac} | {cl.interfaceType}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-white rounded-lg text-center text-xs text-[#94A3B8] italic">
                      {inspectData.lan?.hostCount ? `${inspectData.lan.hostCount} LAN client(s) online via DHCP` : 'No active LAN clients connected'}
                    </div>
                  )}
                </div>

                {/* 9. Subscriber Profile */}
                <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between">
                  {inspectData.subscriber ? (
                    <div className="space-y-1">
                      <span className="text-[10px] text-[#64748B] block font-semibold uppercase">Assigned Subscriber:</span>
                      <div className="flex items-center space-x-2">
                        <UserCheck className="w-4 h-4 text-[#047857]" />
                        <span className="text-sm font-bold text-[#0F172A]">{inspectData.subscriber.fullName}</span>
                        <span className="text-xs text-[#64748B] font-mono">({inspectData.subscriber.phoneMasked})</span>
                      </div>
                      <p className="text-xs text-[#64748B]">Account: <span className="font-mono text-[#1677FF]">{inspectData.subscriber.accountNumber}</span></p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-[10px] text-[#B45309] block font-semibold uppercase">Unassigned Device:</span>
                      <p className="text-xs text-[#334155]">This ONT is currently in the unassigned hardware pool.</p>
                    </div>
                  )}

                  <div>
                    {inspectData.subscriber ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          const custId = inspectData.subscriber.id;
                          setInspectDevice(null);
                          setInspectData(null);
                          navigate(`/operator/customers/${custId}`);
                        }}
                      >
                        <span>View Customer 360</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          const d = inspectDevice;
                          setInspectDevice(null);
                          setInspectData(null);
                          handleOpenAssignModal(d);
                        }}
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1" />
                        <span>Assign Subscriber</span>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                  <span className="text-[11px] text-[#94A3B8]">
                    TR-069 / TR-369 Parameter Isolation Enforced
                  </span>
                  <Button variant="outline" onClick={() => { setInspectDevice(null); setInspectData(null); }}>
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Configuration Modal */}
      <Modal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        title={`Edit ONT Configuration — ${inspectDevice?.serialNumber || ''}`}
        subtitle="Live CPE TR-069 / TR-369 Parameter Write"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveConfig} className="space-y-4">
          {configError && (
            <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{configError}</span>
            </div>
          )}

          {configSuccess && (
            <div className="p-3 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{configSuccess}</span>
            </div>
          )}

          {/* Wi-Fi 2.4 GHz Section */}
          <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-3">
            <h4 className="text-xs font-bold text-[#047857] uppercase tracking-wider">Wi-Fi 2.4 GHz Configuration</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="2.4 GHz SSID"
                value={configForm.wifi24Ssid}
                onChange={(e) => setConfigForm({ ...configForm, wifi24Ssid: e.target.value })}
                required
              />
              <Input
                label="New Wi-Fi Password (leave empty to keep)"
                type="password"
                placeholder="••••••••"
                value={configForm.wifi24Password}
                onChange={(e) => setConfigForm({ ...configForm, wifi24Password: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#334155] block mb-1">Channel</label>
                <select
                  value={configForm.wifi24Channel}
                  onChange={(e) => setConfigForm({ ...configForm, wifi24Channel: Number(e.target.value) })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-[#0F172A]"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((ch) => (
                    <option key={ch} value={ch}>Channel {ch}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#334155] block mb-1">State</label>
                <select
                  value={configForm.wifi24Enabled ? 'true' : 'false'}
                  onChange={(e) => setConfigForm({ ...configForm, wifi24Enabled: e.target.value === 'true' })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-[#0F172A]"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Wi-Fi 5.0 GHz Section */}
          <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-3">
            <h4 className="text-xs font-bold text-[#6D28D9] uppercase tracking-wider">Wi-Fi 5.0 GHz Configuration</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="5.0 GHz SSID"
                value={configForm.wifi5gSsid}
                onChange={(e) => setConfigForm({ ...configForm, wifi5gSsid: e.target.value })}
                required
              />
              <Input
                label="New 5G Password (leave empty to keep)"
                type="password"
                placeholder="••••••••"
                value={configForm.wifi5gPassword}
                onChange={(e) => setConfigForm({ ...configForm, wifi5gPassword: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#334155] block mb-1">Channel</label>
                <select
                  value={configForm.wifi5gChannel}
                  onChange={(e) => setConfigForm({ ...configForm, wifi5gChannel: Number(e.target.value) })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-[#0F172A]"
                >
                  {[36, 40, 44, 48, 149, 153, 157, 161].map((ch) => (
                    <option key={ch} value={ch}>Channel {ch}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#334155] block mb-1">State</label>
                <select
                  value={configForm.wifi5gEnabled ? 'true' : 'false'}
                  onChange={(e) => setConfigForm({ ...configForm, wifi5gEnabled: e.target.value === 'true' })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-[#0F172A]"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
            </div>
          </div>

          {/* WAN PPPoE & VLAN */}
          <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-3">
            <h4 className="text-xs font-bold text-[#1677FF] uppercase tracking-wider">WAN & PPPoE Settings</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="PPPoE Username"
                value={configForm.pppoeUsername}
                onChange={(e) => setConfigForm({ ...configForm, pppoeUsername: e.target.value })}
                required
              />
              <Input
                label="New PPPoE Password (leave empty to keep)"
                type="password"
                placeholder="••••••••"
                value={configForm.pppoePassword}
                onChange={(e) => setConfigForm({ ...configForm, pppoePassword: e.target.value })}
              />
            </div>
            <div>
              <Input
                label="VLAN ID"
                type="number"
                min={1}
                max={4094}
                value={configForm.vlanId}
                onChange={(e) => setConfigForm({ ...configForm, vlanId: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-[#E2E8F0]">
            <Button type="button" variant="outline" onClick={() => setIsConfigOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={configSubmitting}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              <span>Apply & Save Configuration</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Subscriber Modal */}
      <Modal
        isOpen={!!assigningDevice}
        onClose={() => setAssigningDevice(null)}
        title={`Assign Subscriber — ${assigningDevice?.serialNumber || ''}`}
        subtitle="Bind ONT to a new broadband subscriber with automatic PPPoE & TR-069 provisioning"
        maxWidth="xl"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Customer Full Name"
              placeholder="e.g. Ramesh Kumar"
              value={subscriberForm.fullName}
              onChange={(e) => setSubscriberForm({ ...subscriberForm, fullName: e.target.value })}
              required
            />
            <Input
              label="Mobile Number"
              placeholder="10-digit mobile"
              value={subscriberForm.phone}
              onChange={(e) => setSubscriberForm({ ...subscriberForm, phone: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Email Address"
              type="email"
              placeholder="customer@email.com"
              value={subscriberForm.email}
              onChange={(e) => setSubscriberForm({ ...subscriberForm, email: e.target.value })}
            />
            <Input
              label="Plan Name"
              value={subscriberForm.planName}
              onChange={(e) => setSubscriberForm({ ...subscriberForm, planName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Flat / Door #"
              value={subscriberForm.door}
              onChange={(e) => setSubscriberForm({ ...subscriberForm, door: e.target.value })}
            />
            <Input
              label="Street / Area"
              value={subscriberForm.street}
              onChange={(e) => setSubscriberForm({ ...subscriberForm, street: e.target.value })}
            />
            <Input
              label="City"
              value={subscriberForm.city}
              onChange={(e) => setSubscriberForm({ ...subscriberForm, city: e.target.value })}
            />
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-3">
            <h4 className="text-xs font-bold text-[#1677FF] uppercase tracking-wider">PPPoE & VLAN Configuration</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="PPPoE Username"
                value={subscriberForm.pppoeUsername}
                onChange={(e) => setSubscriberForm({ ...subscriberForm, pppoeUsername: e.target.value })}
                required
              />
              <Input
                label="PPPoE Password"
                type="password"
                value={subscriberForm.pppoePassword}
                onChange={(e) => setSubscriberForm({ ...subscriberForm, pppoePassword: e.target.value })}
                required
              />
              <Input
                label="VLAN ID"
                type="number"
                value={subscriberForm.vlanId}
                onChange={(e) => setSubscriberForm({ ...subscriberForm, vlanId: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-[#E2E8F0]">
            <Button type="button" variant="outline" onClick={() => setAssigningDevice(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              <span>Complete Assignment</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Device Modal */}
      <Modal
        isOpen={Boolean(deviceToDelete)}
        onClose={() => setDeviceToDelete(null)}
        title="Delete ONT from Network Fleet"
        subtitle={`Serial: ${deviceToDelete?.serialNumber || ''}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#0F172A]">Permanently Remove ONT Device?</p>
              <p className="text-xs text-[#64748B] mt-1">
                This will delete device <code className="font-bold text-[#B91C1C] font-mono">{deviceToDelete?.serialNumber}</code> from your fleet and unbind it from any subscriber. Real TR-069 Inform logs and history will be cleared.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-[#E2E8F0]">
            <Button variant="outline" onClick={() => setDeviceToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={deleteSubmitting} onClick={handleConfirmDelete}>
              <Power className="w-4 h-4 mr-1.5" />
              <span>Confirm & Delete ONT</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Devices Modal */}
      <Modal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        title="Bulk Delete Selected ONTs"
        subtitle={`Deleting ${selectedDeviceIds.length} selected devices from fleet inventory`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#0F172A]">Permanently Delete {selectedDeviceIds.length} ONTs?</p>
              <p className="text-xs text-[#64748B] mt-1">
                This will purge all selected devices from this operator tenant fleet, unbind any linked subscribers, and remove cached telemetry data. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-[#E2E8F0]">
            <Button variant="outline" onClick={() => setIsBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={isBulkDeleting} onClick={handleBulkDelete} className="font-bold">
              <Trash2 className="w-4 h-4 mr-1.5" />
              <span>Delete {selectedDeviceIds.length} Devices</span>
            </Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
};
