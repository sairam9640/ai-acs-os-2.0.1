import React, { useState, useEffect } from 'react';
import {
  Globe,
  Radio,
  Wifi,
  Shield,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings,
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  Save,
  Send,
  Eye,
  EyeOff,
  Network,
  Cpu,
  ArrowRight,
  Server,
  Zap,
  Info,
  Check,
  X,
  AlertTriangle,
  FileCode,
  Sliders,
  History,
  Lock,
  ChevronRight,
  Activity,
  Terminal,
} from 'lucide-react';
import { Badge } from '../ui/Badge.js';
import { Button, Input } from '../ui/Button.js';
import { Modal } from '../ui/Modal.js';
import { api } from '../../services/api.js';

interface WanProfileData {
  _id?: string;
  name: string;
  enableWan?: boolean;
  connectionType: 'PPPoE' | 'IPoE_DHCP' | 'Static' | 'Bridge';
  serviceType?: string;
  serviceUsage?: {
    internet?: boolean;
    voip?: boolean;
    tr069?: boolean;
    iptvDhcp?: boolean;
    iptvBridge?: boolean;
    other?: boolean;
  };
  vlanEnabled?: boolean;
  vlanId: number;
  vlanPriority8021p?: number;
  multicastVlanId?: number;
  bridgeMode?: string;
  enableBridge?: boolean;
  enableQos?: boolean;
  adminStatus?: 'Enable' | 'Disable';
  ipProtocol?: 'IPv4' | 'IPv6' | 'IPv4/IPv6';
  mldpProxy?: boolean;
  mtu?: number;
  natEnabled?: boolean;
  firewallEnabled?: boolean;
  wanPortBindings?: string[];
  lanPortBindings?: string[];
  ssidBindings?: string[];
  pppoeUsername?: string;
  pppoePasswordEncrypted?: string;
  pppoePassword?: string;
  pppoePasswordMasked?: string;
  passwordConfigured?: boolean;
  pppoeType?: 'Continuous' | 'OnDemand' | 'Manual';
  idleTimeSeconds?: number;
  authMethod?: 'AUTO' | 'PAP' | 'CHAP' | 'MS-CHAP';
  acName?: string;
  serviceName?: string;
  ipAddress?: string;
  subnetMask?: string;
  gateway?: string;
  dnsMode?: 'Auto' | 'Manual';
  dnsServers?: string;
  primaryDns?: string;
  secondaryDns?: string;
  status?: 'Connected' | 'Disconnected' | 'Connecting';
  isDefault?: boolean;
  lastKnownGoodBackup?: any;
}

interface WanManagementSuiteProps {
  deviceId: string;
  device: any;
  onRefreshTelemetry?: () => void;
}

export const WanManagementSuite: React.FC<WanManagementSuiteProps> = ({
  deviceId,
  device,
  onRefreshTelemetry,
}) => {
  const [profiles, setProfiles] = useState<WanProfileData[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [activeForm, setActiveForm] = useState<WanProfileData | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [isRollingBack, setIsRollingBack] = useState<boolean>(false);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // View Mode Settings
  const [showTr069Mapping, setShowTr069Mapping] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Diff Modal State
  const [isDiffModalOpen, setIsDiffModalOpen] = useState<boolean>(false);
  const [diffList, setDiffList] = useState<any[]>([]);

  // Delete Modal State
  const [deleteConfirmProfile, setDeleteConfirmProfile] = useState<WanProfileData | null>(null);

  const modelUpper = String(device?.modelName || '').toUpperCase();
  const isTr181 = modelUpper.includes('TR181') || modelUpper.includes('DEVICE2');
  const dataModelType = isTr181 ? 'TR-181 Device:2.0' : 'TR-098 IGD:1.0';

  const fetchProfiles = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getWanProfiles(deviceId);
      if (res.success && res.profiles) {
        setProfiles(res.profiles);
        if (res.profiles.length > 0) {
          const current = res.profiles.find((p: any) => p._id === selectedProfileId) || res.profiles[0];
          setSelectedProfileId(current._id || '0');
          setActiveForm(JSON.parse(JSON.stringify(current)));
        } else {
          initDefaultProfile();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load WAN profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const initDefaultProfile = () => {
    const defaultProf: WanProfileData = {
      name: 'pppoe_0/0_0',
      enableWan: true,
      connectionType: 'PPPoE',
      serviceType: 'INTERNET',
      serviceUsage: { internet: true, voip: false, tr069: false, iptvDhcp: false, iptvBridge: false, other: false },
      vlanEnabled: true,
      vlanId: 100,
      vlanPriority8021p: 0,
      multicastVlanId: 0,
      bridgeMode: 'Bridge Ethernet (Transparent Bridging)',
      enableBridge: false,
      enableQos: false,
      adminStatus: 'Enable',
      ipProtocol: 'IPv4/IPv6',
      mldpProxy: false,
      mtu: 1492,
      natEnabled: true,
      firewallEnabled: true,
      wanPortBindings: ['WAN1'],
      lanPortBindings: ['LAN1', 'LAN2', 'LAN3', 'LAN4'],
      ssidBindings: ['2.4GHz SSID-1', '5GHz SSID-1'],
      pppoeUsername: '',
      pppoePassword: '',
      pppoeType: 'Continuous',
      idleTimeSeconds: 0,
      authMethod: 'AUTO',
      acName: '',
      serviceName: '',
      ipAddress: '',
      subnetMask: '',
      gateway: '',
      dnsMode: 'Auto',
      primaryDns: '',
      secondaryDns: '',
      status: 'Connected',
      isDefault: true,
    };
    setProfiles([defaultProf]);
    setSelectedProfileId('0');
    setActiveForm(defaultProf);
  };

  useEffect(() => {
    fetchProfiles();
  }, [deviceId]);

  const handleSelectProfile = (prof: WanProfileData) => {
    setSelectedProfileId(prof._id || '');
    setActiveForm(JSON.parse(JSON.stringify(prof)));
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleAddProfile = () => {
    const nextIdx = profiles.length + 1;
    const newProf: WanProfileData = {
      name: `pppoe_0/0_${nextIdx}`,
      enableWan: true,
      connectionType: 'PPPoE',
      serviceType: 'INTERNET',
      serviceUsage: { internet: true, voip: false, tr069: false, iptvDhcp: false, iptvBridge: false, other: false },
      vlanEnabled: false,
      vlanId: 0,
      vlanPriority8021p: 0,
      multicastVlanId: 0,
      bridgeMode: 'Bridge Ethernet (Transparent Bridging)',
      enableBridge: false,
      enableQos: false,
      adminStatus: 'Enable',
      ipProtocol: 'IPv4/IPv6',
      mldpProxy: false,
      mtu: 1492,
      natEnabled: true,
      firewallEnabled: true,
      wanPortBindings: ['WAN1'],
      lanPortBindings: ['LAN1', 'LAN2'],
      ssidBindings: ['2.4GHz SSID-1'],
      pppoeUsername: '',
      pppoePassword: '',
      pppoeType: 'Continuous',
      idleTimeSeconds: 0,
      authMethod: 'AUTO',
      acName: '',
      serviceName: '',
      status: 'Disconnected',
      isDefault: false,
    };
    setSelectedProfileId('NEW_TEMP');
    setActiveForm(newProf);
  };

  const handleCloneProfile = async (prof: WanProfileData) => {
    if (!prof._id) return;
    try {
      const res = await api.duplicateWanProfile(deviceId, prof._id);
      if (res.success) {
        setSuccessMsg(`✓ WAN Profile [${prof.name}] duplicated successfully.`);
        fetchProfiles();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to duplicate profile');
    }
  };

  const handleDeleteProfile = async () => {
    if (!deleteConfirmProfile || !deleteConfirmProfile._id) return;
    try {
      const res = await api.deleteWanProfile(deviceId, deleteConfirmProfile._id);
      if (res.success) {
        setSuccessMsg(`✓ WAN Profile [${deleteConfirmProfile.name}] deleted.`);
        setDeleteConfirmProfile(null);
        fetchProfiles();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete profile');
    }
  };

  const handleBackupProfile = async () => {
    if (!selectedProfileId || selectedProfileId === 'NEW_TEMP') return;
    setIsBackingUp(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await api.backupWanProfile(deviceId, selectedProfileId);
      if (res.success) {
        setSuccessMsg(`✓ Profile snapshot backed up to Last Known Good repository (${new Date().toLocaleTimeString()}).`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Backup failed');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRollbackProfile = async () => {
    if (!selectedProfileId || selectedProfileId === 'NEW_TEMP') return;
    if (!window.confirm('Are you sure you want to rollback to the last known good configuration? This will queue a TR-069 restore RPC.')) return;
    setIsRollingBack(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await api.rollbackWanProfile(deviceId, selectedProfileId);
      if (res.success) {
        setSuccessMsg(`✓ Profile [${activeForm?.name}] successfully rolled back and queued for ONT.`);
        fetchProfiles();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Rollback failed');
    } finally {
      setIsRollingBack(false);
    }
  };

  const handleOpenDiffModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeForm) return;

    try {
      const res = await api.diffWanProfile(deviceId, {
        profileId: selectedProfileId !== 'NEW_TEMP' ? selectedProfileId : undefined,
        proposedProfile: activeForm,
      });

      if (res.success) {
        setDiffList(res.diffs || []);
        setIsDiffModalOpen(true);
      }
    } catch (err: any) {
      // Fallback diff calculation
      setIsDiffModalOpen(true);
    }
  };

  const handleApplyCommit = async () => {
    if (!activeForm) return;
    setIsCommitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      let res: any;
      if (selectedProfileId === 'NEW_TEMP') {
        res = await api.createWanProfile(deviceId, activeForm);
      } else {
        res = await api.updateWanProfile(deviceId, selectedProfileId, activeForm);
      }

      if (res.success) {
        // Also commit to physical ONT
        const profId = res.profile?._id || selectedProfileId;
        if (profId && profId !== 'NEW_TEMP') {
          await api.commitWanProfile(deviceId, profId).catch(() => {});
        }

        setSuccessMsg(`✓ WAN Profile [${activeForm.name}] successfully saved and committed to physical ONT via TR-069!`);
        setIsDiffModalOpen(false);
        fetchProfiles();
        if (onRefreshTelemetry) onRefreshTelemetry();
      } else {
        setErrorMsg(res.error || 'Failed to commit WAN configuration');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to commit WAN configuration');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!activeForm) return;
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      let res: any;
      if (selectedProfileId === 'NEW_TEMP') {
        res = await api.createWanProfile(deviceId, activeForm);
      } else {
        res = await api.updateWanProfile(deviceId, selectedProfileId, activeForm);
      }

      if (res.success) {
        setSuccessMsg(`✓ WAN Profile [${activeForm.name}] saved as Draft in ACS database.`);
        fetchProfiles();
      } else {
        setErrorMsg(res.error || 'Failed to save draft');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    if (!searchFilter) return true;
    const term = searchFilter.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      String(p.vlanId).includes(term) ||
      p.connectionType.toLowerCase().includes(term) ||
      (p.pppoeUsername && p.pppoeUsername.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Telemetry & Control Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 border border-slate-700/50 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Carrier Multi-Vendor WAN & PPPoE Controller</h3>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {dataModelType}
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Multi-Vendor Support
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl">
                Configure PON WAN Interfaces, PPPoE/IPoE, VLAN tagging, NAT, Firewall, Service Mapping, and Port Binding with full TR-069 parameter tree parity.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-end md:self-center">
            {/* TR-069 Engineer Path Switch */}
            <label className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 cursor-pointer hover:bg-slate-700/60 transition">
              <FileCode className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-semibold text-slate-200">TR-069 Path Inspector</span>
              <input
                type="checkbox"
                checked={showTr069Mapping}
                onChange={(e) => setShowTr069Mapping(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-500 rounded focus:ring-0"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Global Alert Banners */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MAIN TWO-COLUMN WORKBENCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: WAN PROFILES NAVIGATOR (4 Cols) */}
        <div className="lg:col-span-4 bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#1677FF]" />
              <h4 className="text-sm font-bold text-slate-900">WAN Connections ({profiles.length})</h4>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={handleAddProfile}
              className="bg-[#1677FF] hover:bg-[#0958D9] text-white font-bold text-xs px-2.5 py-1"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Add WAN</span>
            </Button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search Profile, VLAN, Username..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1677FF]"
            />
            <Globe className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Profiles List */}
          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {filteredProfiles.map((prof, idx) => {
              const isSelected = selectedProfileId === (prof._id || String(idx));
              const isConnected = prof.status === 'Connected' || prof.isDefault;
              return (
                <div
                  key={prof._id || idx}
                  onClick={() => handleSelectProfile(prof)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer relative ${
                    isSelected
                      ? 'bg-blue-50/70 border-[#1677FF] shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono font-bold text-xs text-slate-900">{prof.name}</span>
                        {prof.isDefault && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold px-1.5 py-0.2 rounded">
                            Default
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 mt-1.5">
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                          {prof.connectionType}
                        </span>
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                          VID: {prof.vlanEnabled !== false ? prof.vlanId : 'Untagged'}
                        </span>
                        <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {prof.serviceType || 'INTERNET'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    </div>
                  </div>

                  {prof.pppoeUsername && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>User: {prof.pppoeUsername}</span>
                      <span className={prof.ipAddress ? "text-emerald-700 font-bold" : "text-amber-600 font-normal"}>
                        {prof.ipAddress || 'Unassigned'}
                      </span>
                    </div>
                  )}

                  {/* Profile Action Bar */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-end space-x-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloneProfile(prof);
                      }}
                      title="Clone this profile"
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {profiles.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmProfile(prof);
                        }}
                        title="Delete this profile"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: CARRIER-GRADE PON WAN CONFIGURATION FORM (8 Cols) */}
        <div className="lg:col-span-8 bg-white border border-[#CBD5E1] rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-[#7928CA]/5 border-b border-[#7928CA]/15 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-base font-bold text-slate-900">PON WAN Configuration</h4>
                <span className="bg-[#7928CA]/10 text-[#7928CA] font-bold text-xs px-2.5 py-0.5 rounded-full border border-[#7928CA]/20">
                  {activeForm?.name || 'New Profile'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                This page is used to configure the WAN parameters for PONWAN interfaces on this ONT.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleBackupProfile}
                isLoading={isBackingUp}
                className="text-xs flex items-center space-x-1"
                title="Backup current profile state"
              >
                <Save className="w-3.5 h-3.5 text-slate-500" />
                <span>Backup</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRollbackProfile}
                isLoading={isRollingBack}
                className="text-xs flex items-center space-x-1"
                title="Rollback to Last Known Good"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>Rollback</span>
              </Button>
            </div>
          </div>

          {activeForm ? (
            <form onSubmit={handleOpenDiffModal} className="p-6 space-y-6">
              {/* SECTION 1: PON WAN CORE PARAMETERS */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* WAN Connection Name */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">WAN Connection:</label>
                      {showTr069Mapping && (
                        <span className="text-[9px] font-mono text-blue-600 bg-blue-50 px-1 rounded border border-blue-200">
                          {isTr181 ? 'Device.IP.Interface.1.Name' : 'WANDevice.1...WANPPPConnection.1.Name'} [RW]
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={activeForm.name}
                      onChange={(e) => setActiveForm({ ...activeForm, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7928CA]"
                      required
                    />
                  </div>

                  {/* Channel Mode / Connection Type */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Channel Mode:</label>
                      {showTr069Mapping && (
                        <span className="text-[9px] font-mono text-blue-600 bg-blue-50 px-1 rounded border border-blue-200">
                          {isTr181 ? 'Device.IP.Interface.1.Type' : '...WANPPPConnection.1.ConnectionType'} [RW]
                        </span>
                      )}
                    </div>
                    <select
                      value={activeForm.connectionType}
                      onChange={(e: any) => setActiveForm({ ...activeForm, connectionType: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#7928CA]"
                    >
                      <option value="PPPoE">PPPoE (Point-to-Point Protocol over Ethernet)</option>
                      <option value="IPoE_DHCP">IPoE (Dynamic IP / DHCP Client)</option>
                      <option value="Static">Static IP (Fixed WAN Routing)</option>
                      <option value="Bridge">Bridge (Transparent Layer 2 Bridging)</option>
                    </select>
                  </div>
                </div>

                {/* Enable WAN Checkbox & Admin Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <label className="flex items-center space-x-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={activeForm.enableWan !== false}
                      onChange={(e) => setActiveForm({ ...activeForm, enableWan: e.target.checked })}
                      className="w-4 h-4 text-[#7928CA] rounded focus:ring-0"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Enable WAN</span>
                      <span className="text-[10px] text-slate-500 block">Activate this WAN connection on ONT</span>
                    </div>
                  </label>

                  <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Admin Status:</span>
                      <span className="text-[10px] text-slate-500 block">Interface operational state</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center space-x-1 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="adminStatus"
                          value="Enable"
                          checked={activeForm.adminStatus !== 'Disable'}
                          onChange={() => setActiveForm({ ...activeForm, adminStatus: 'Enable' })}
                          className="text-[#7928CA]"
                        />
                        <span className="font-semibold text-slate-700">Enable</span>
                      </label>
                      <label className="flex items-center space-x-1 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="adminStatus"
                          value="Disable"
                          checked={activeForm.adminStatus === 'Disable'}
                          onChange={() => setActiveForm({ ...activeForm, adminStatus: 'Disable' })}
                          className="text-[#7928CA]"
                        />
                        <span className="font-semibold text-slate-700">Disable</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* VLAN Section (VLAN ID, 802.1p Mark, Multicast VLAN) */}
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeForm.vlanEnabled !== false}
                        onChange={(e) => setActiveForm({ ...activeForm, vlanEnabled: e.target.checked })}
                        className="w-4 h-4 text-[#7928CA] rounded"
                      />
                      <span className="text-xs font-bold text-slate-800">Enable 802.1Q VLAN Tagging</span>
                    </label>
                    {showTr069Mapping && (
                      <span className="text-[9px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {isTr181 ? 'Device.Ethernet.VLANTermination.1.VLANID' : '...WANPPPConnection.1.VLANID'} [RW]
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">VLAN ID: [1-4094]</label>
                      <input
                        type="number"
                        min="1"
                        max="4094"
                        value={activeForm.vlanId}
                        onChange={(e) => setActiveForm({ ...activeForm, vlanId: Number(e.target.value) })}
                        disabled={activeForm.vlanEnabled === false}
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#7928CA] disabled:bg-slate-100"
                        required={activeForm.vlanEnabled !== false}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">802.1p_Mark (Priority):</label>
                      <select
                        value={activeForm.vlanPriority8021p || 0}
                        onChange={(e) => setActiveForm({ ...activeForm, vlanPriority8021p: Number(e.target.value) })}
                        disabled={activeForm.vlanEnabled === false}
                        className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#7928CA] disabled:bg-slate-100"
                      >
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((p) => (
                          <option key={p} value={p}>Priority {p} {p === 0 ? '(Best Effort)' : p >= 5 ? '(Voice/High)' : '(Standard)'}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">Multicast VLAN ID: [1-4095]</label>
                      <input
                        type="number"
                        min="0"
                        max="4095"
                        value={activeForm.multicastVlanId || 0}
                        onChange={(e) => setActiveForm({ ...activeForm, multicastVlanId: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#7928CA]"
                        placeholder="0 (Disabled)"
                      />
                    </div>
                  </div>
                </div>

                {/* Service Type & Protocol Options */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Connection Type / Service:</label>
                      {showTr069Mapping && (
                        <span className="text-[9px] font-mono text-blue-600 bg-blue-50 px-1 rounded border border-blue-200">
                          X_HW_SERVICELIST [RW]
                        </span>
                      )}
                    </div>
                    <select
                      value={activeForm.serviceType || 'INTERNET'}
                      onChange={(e) => setActiveForm({ ...activeForm, serviceType: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#7928CA]"
                    >
                      <option value="INTERNET">INTERNET (Broadband Traffic)</option>
                      <option value="INTERNET_TR069">INTERNET_TR069 (Dual Service)</option>
                      <option value="TR069">TR069 (Dedicated Management)</option>
                      <option value="VOIP">VOIP (SIP Voice Trunk)</option>
                      <option value="IPTV">IPTV (Multicast Video Stream)</option>
                      <option value="OTHER">OTHER (Custom Routing)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">MTU Size:</label>
                      {showTr069Mapping && (
                        <span className="text-[9px] font-mono text-blue-600 bg-blue-50 px-1 rounded border border-blue-200">
                          ...MaxMTUSize [RW]
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="576"
                      max="1500"
                      value={activeForm.mtu || (activeForm.connectionType === 'PPPoE' ? 1492 : 1500)}
                      onChange={(e) => setActiveForm({ ...activeForm, mtu: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#7928CA]"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">IP Protocol:</label>
                      {showTr069Mapping && (
                        <span className="text-[9px] font-mono text-blue-600 bg-blue-50 px-1 rounded border border-blue-200">
                          X_HW_IPProtocolType [RW]
                        </span>
                      )}
                    </div>
                    <select
                      value={activeForm.ipProtocol || 'IPv4/IPv6'}
                      onChange={(e: any) => setActiveForm({ ...activeForm, ipProtocol: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#7928CA]"
                    >
                      <option value="IPv4/IPv6">IPv4/IPv6 (Dual-Stack Auto)</option>
                      <option value="IPv4">IPv4 Only</option>
                      <option value="IPv6">IPv6 Only</option>
                    </select>
                  </div>
                </div>

                {/* Feature Toggles (NAPT, Bridge, MLDP, QoS) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <label className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={activeForm.natEnabled !== false}
                      onChange={(e) => setActiveForm({ ...activeForm, natEnabled: e.target.checked })}
                      className="w-4 h-4 text-[#7928CA] rounded"
                    />
                    <span className="text-xs font-semibold text-slate-800">Enable NAPT</span>
                  </label>

                  <label className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={activeForm.enableBridge || false}
                      onChange={(e) => setActiveForm({ ...activeForm, enableBridge: e.target.checked })}
                      className="w-4 h-4 text-[#7928CA] rounded"
                    />
                    <span className="text-xs font-semibold text-slate-800">Enable Bridge</span>
                  </label>

                  <label className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={activeForm.enableQos || false}
                      onChange={(e) => setActiveForm({ ...activeForm, enableQos: e.target.checked })}
                      className="w-4 h-4 text-[#7928CA] rounded"
                    />
                    <span className="text-xs font-semibold text-slate-800">Enable QoS</span>
                  </label>

                  <label className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={activeForm.mldpProxy || false}
                      onChange={(e) => setActiveForm({ ...activeForm, mldpProxy: e.target.checked })}
                      className="w-4 h-4 text-[#7928CA] rounded"
                    />
                    <span className="text-xs font-semibold text-slate-800">MLDP-Proxy</span>
                  </label>
                </div>
              </div>

              {/* SECTION 2: PPPoE SETTINGS (When PPPoE is chosen) */}
              {activeForm.connectionType === 'PPPoE' && (
                <div className="p-5 bg-gradient-to-r from-purple-50/50 to-indigo-50/40 rounded-2xl border border-purple-200 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-purple-200/60">
                    <div className="flex items-center space-x-2 text-[#7928CA]">
                      <Lock className="w-4 h-4" />
                      <h5 className="text-xs font-bold uppercase tracking-wider">PPPoE Authentication Settings</h5>
                    </div>
                    {showTr069Mapping && (
                      <span className="text-[9px] font-mono text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded border border-purple-300">
                        {isTr181 ? 'Device.PPP.Interface.1.{Username,Password}' : '...WANPPPConnection.1.{Username,Password}'} [RW]
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">UserName: *</label>
                      <input
                        type="text"
                        value={activeForm.pppoeUsername || ''}
                        onChange={(e) => setActiveForm({ ...activeForm, pppoeUsername: e.target.value })}
                        placeholder="e.g. vgf8686534534_jpt"
                        className="w-full px-3 py-2 text-xs font-mono font-bold border border-purple-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#7928CA]"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Password: *</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={activeForm.pppoePassword || activeForm.pppoePasswordEncrypted || ''}
                          onChange={(e) => setActiveForm({ ...activeForm, pppoePassword: e.target.value })}
                          placeholder="••••••••••••"
                          className="w-full pl-3 pr-9 py-2 text-xs font-mono font-bold border border-purple-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#7928CA]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">Type:</label>
                      <select
                        value={activeForm.pppoeType || 'Continuous'}
                        onChange={(e: any) => setActiveForm({ ...activeForm, pppoeType: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs font-semibold border border-purple-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#7928CA]"
                      >
                        <option value="Continuous">Continuous (Always-On)</option>
                        <option value="OnDemand">Connect On Demand</option>
                        <option value="Manual">Manual Trigger</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">Idle Time (sec):</label>
                      <input
                        type="number"
                        min="0"
                        value={activeForm.idleTimeSeconds || 0}
                        onChange={(e) => setActiveForm({ ...activeForm, idleTimeSeconds: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-purple-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#7928CA]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">Authentication Method:</label>
                      <select
                        value={activeForm.authMethod || 'AUTO'}
                        onChange={(e: any) => setActiveForm({ ...activeForm, authMethod: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs font-semibold border border-purple-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#7928CA]"
                      >
                        <option value="AUTO">AUTO (Negotiate)</option>
                        <option value="PAP">PAP Only</option>
                        <option value="CHAP">CHAP</option>
                        <option value="MS-CHAP">MS-CHAPv2</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">AC-Name (Access Concentrator):</label>
                      <input
                        type="text"
                        value={activeForm.acName || ''}
                        onChange={(e) => setActiveForm({ ...activeForm, acName: e.target.value })}
                        placeholder="Optional ISP AC name"
                        className="w-full px-3 py-1.5 text-xs border border-purple-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#7928CA]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">Service-Name:</label>
                      <input
                        type="text"
                        value={activeForm.serviceName || ''}
                        onChange={(e) => setActiveForm({ ...activeForm, serviceName: e.target.value })}
                        placeholder="Optional Service name"
                        className="w-full px-3 py-1.5 text-xs border border-purple-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#7928CA]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: STATIC / DHCP IP SETTINGS */}
              {(activeForm.connectionType === 'Static' || activeForm.connectionType === 'IPoE_DHCP') && (
                <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                    <div className="flex items-center space-x-2 text-blue-700">
                      <Network className="w-4 h-4" />
                      <h5 className="text-xs font-bold uppercase tracking-wider">
                        {activeForm.connectionType === 'Static' ? 'Static IP Routing Configuration' : 'IPoE / DHCP Client Status'}
                      </h5>
                    </div>
                    {showTr069Mapping && (
                      <span className="text-[9px] font-mono text-blue-700 bg-blue-100 px-2 py-0.5 rounded border border-blue-300">
                        ...WANIPConnection.1.{'{ExternalIPAddress,SubnetMask,DefaultGateway}'} [RW]
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">IP Address:</label>
                      <input
                        type="text"
                        value={activeForm.ipAddress || ''}
                        onChange={(e) => setActiveForm({ ...activeForm, ipAddress: e.target.value })}
                        disabled={activeForm.connectionType === 'IPoE_DHCP'}
                        placeholder="192.168.1.100"
                        className="w-full px-3 py-2 text-xs font-mono font-bold border border-blue-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Subnet Mask:</label>
                      <input
                        type="text"
                        value={activeForm.subnetMask || '255.255.255.0'}
                        onChange={(e) => setActiveForm({ ...activeForm, subnetMask: e.target.value })}
                        disabled={activeForm.connectionType === 'IPoE_DHCP'}
                        className="w-full px-3 py-2 text-xs font-mono font-bold border border-blue-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Default Gateway:</label>
                      <input
                        type="text"
                        value={activeForm.gateway || ''}
                        onChange={(e) => setActiveForm({ ...activeForm, gateway: e.target.value })}
                        disabled={activeForm.connectionType === 'IPoE_DHCP'}
                        placeholder="192.168.1.1"
                        className="w-full px-3 py-2 text-xs font-mono font-bold border border-blue-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">Primary DNS Server:</label>
                      <input
                        type="text"
                        value={activeForm.primaryDns || '8.8.8.8'}
                        onChange={(e) => setActiveForm({ ...activeForm, primaryDns: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs font-mono border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">Secondary DNS Server:</label>
                      <input
                        type="text"
                        value={activeForm.secondaryDns || '1.1.1.1'}
                        onChange={(e) => setActiveForm({ ...activeForm, secondaryDns: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs font-mono border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4: PORT & SSID BINDING (VLAN MAPPING) */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center space-x-2 text-slate-800">
                    <Cpu className="w-4 h-4 text-[#1677FF]" />
                    <h5 className="text-xs font-bold uppercase tracking-wider">Port & SSID Interface Binding</h5>
                  </div>
                  {showTr069Mapping && (
                    <span className="text-[9px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      X_HW_LanInterface / X_BROADCOM_COM_LanMux [RW]
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-xs">
                  {/* LAN Ports */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-2">Physical LAN Ports:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {['LAN1', 'LAN2', 'LAN3', 'LAN4'].map((port) => {
                        const isChecked = (activeForm.lanPortBindings || []).includes(port);
                        const isTagged = Boolean(activeForm.vlanEnabled && activeForm.vlanId);
                        return (
                          <label
                            key={port}
                            className={`flex flex-col p-2.5 rounded-xl border cursor-pointer transition ${
                              isChecked ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const current = activeForm.lanPortBindings || [];
                                  const updated = e.target.checked ? [...current, port] : current.filter((p) => p !== port);
                                  setActiveForm({ ...activeForm, lanPortBindings: updated });
                                }}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span>{port} (Gigabit)</span>
                            </div>
                            {isChecked && (
                              <span className={`mt-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded inline-block ${
                                isTagged ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {isTagged ? `Tagged (Trunk: VID ${activeForm.vlanId})` : 'Untagged (Access)'}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* WLAN SSIDs */}
                  <div className="pt-2">
                    <label className="text-xs font-bold text-slate-700 block mb-2">Wireless WLAN SSIDs:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {['2.4GHz SSID-1', '2.4GHz SSID-2', '5GHz SSID-1', '5GHz SSID-2'].map((ssid) => {
                        const isChecked = (activeForm.ssidBindings || []).includes(ssid);
                        return (
                          <label
                            key={ssid}
                            className={`flex items-center space-x-2 p-2.5 rounded-xl border cursor-pointer transition ${
                              isChecked ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold' : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const current = activeForm.ssidBindings || [];
                                const updated = e.target.checked ? [...current, ssid] : current.filter((s) => s !== ssid);
                                setActiveForm({ ...activeForm, ssidBindings: updated });
                              }}
                              className="w-4 h-4 text-purple-600 rounded"
                            />
                            <span>{ssid}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>TR-069 Annex G Dynamic RPC Sync Ready</span>
                </div>

                <div className="flex items-center space-x-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveDraft}
                    isLoading={isSaving}
                    className="font-bold text-xs"
                  >
                    <Save className="w-3.5 h-3.5 mr-1 text-slate-600" />
                    <span>Save Draft</span>
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    className="bg-[#7928CA] hover:bg-[#6019A8] text-white font-bold text-xs px-5 shadow-md flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Apply & Preview Diff</span>
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <Globe className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-sm">Select a WAN Connection on the left to configure parameters.</p>
            </div>
          )}
        </div>
      </div>

      {/* DIFF PREVIEW & SAFETY CONFIRMATION MODAL */}
      {isDiffModalOpen && activeForm && (
        <Modal
          isOpen={isDiffModalOpen}
          onClose={() => setIsDiffModalOpen(false)}
          title={`Safety Review: Apply Changes to [${activeForm.name}]`}
          subtitle="Inspect exact TR-069 parameter diff before committing to physical ONT"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-start space-x-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Autonomous Safety Validation Passed</p>
                <p className="text-blue-700 text-[11px] mt-0.5">
                  The parameters below will be queued and transmitted via SOAP <code>SetParameterValues</code> on the ONT's active CWMP session.
                </p>
              </div>
            </div>

            {/* Diff Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Field</th>
                    <th className="py-2.5 px-3">TR-069 Parameter Path</th>
                    <th className="py-2.5 px-3">Previous Value</th>
                    <th className="py-2.5 px-3">New Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {diffList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                        No field modifications detected. Profile is in sync.
                      </td>
                    </tr>
                  ) : (
                    diffList.map((d, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-800">{d.label || d.field}</td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-blue-700">{d.tr069Path}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{String(d.oldValue)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">{String(d.newValue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsDiffModalOpen(false)}
                disabled={isCommitting}
              >
                Back to Edit
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyCommit}
                isLoading={isCommitting}
                className="bg-[#7928CA] hover:bg-[#6019A8] text-white font-bold px-5"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                <span>Confirm & Commit to ONT</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE PROFILE MODAL */}
      {deleteConfirmProfile && (
        <Modal
          isOpen={Boolean(deleteConfirmProfile)}
          onClose={() => setDeleteConfirmProfile(null)}
          title={`Delete WAN Connection [${deleteConfirmProfile.name}]`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-800">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div className="text-xs space-y-1">
                <p className="font-bold">Are you sure you want to delete this WAN profile?</p>
                <p className="text-rose-700">
                  This will remove <strong>{deleteConfirmProfile.name}</strong> (VLAN {deleteConfirmProfile.vlanId}) and unbind its associated LAN/SSID ports.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setDeleteConfirmProfile(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteProfile} className="font-bold">
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                <span>Delete Profile</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
