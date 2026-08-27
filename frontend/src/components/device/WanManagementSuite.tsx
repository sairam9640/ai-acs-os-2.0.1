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
  HelpCircle,
} from 'lucide-react';
import { Badge } from '../ui/Badge.js';
import { Button, Input } from '../ui/Button.js';
import { Modal } from '../ui/Modal.js';
import { api } from '../../services/api.js';

export interface WanProfileData {
  _id?: string;
  name: string;
  transMode?: 'PON' | 'Ethernet';
  mode?: 'Route' | 'Bridge';
  enableWan?: boolean;
  bearerService?: 'INTERNET' | 'TR069' | 'VOIP' | 'OTHER';
  linkMode?: 'PPP' | 'IP';
  ipProtocol?: 'IPv4' | 'IPv6' | 'IPv4/IPv6';
  ipAssignment?: 'DHCP' | 'Static';
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
  vlanMode?: 'TAG' | 'UNTAG' | 'TRANSPARENT';
  vlanEnabled?: boolean;
  vlanId: number;
  vlanPriority8021p?: number;
  multicastVlanId?: number;
  enableDhcpServer?: boolean;
  mtu?: number;
  natEnabled?: boolean;
  firewallEnabled?: boolean;
  dnsStatus?: 'Enable' | 'Disable';
  primaryDns?: string;
  secondaryDns?: string;
  wanPortBindings?: string[];
  lanPortBindings?: string[];
  ssidBindings?: string[];
  pppoeUsername?: string;
  pppoePasswordEncrypted?: string;
  pppoePassword?: string;
  pppoePasswordMasked?: string;
  passwordConfigured?: boolean;
  serviceName?: string;
  enablePppoeBridgeMode?: boolean;
  acsUrl?: string;
  acsUsername?: string;
  acsPassword?: string;
  periodicInformEnable?: boolean;
  periodicInformInterval?: number;
  voipSipServer?: string;
  voipSipPort?: number;
  voipAccount?: string;
  voipPassword?: string;
  ipAddress?: string;
  subnetMask?: string;
  gateway?: string;
  status?: 'Connected' | 'Disconnected' | 'Connecting';
  isDefault?: boolean;
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

  const [showTr069Mapping, setShowTr069Mapping] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showAcsPassword, setShowAcsPassword] = useState<boolean>(false);
  const [showVoipPassword, setShowVoipPassword] = useState<boolean>(false);

  // Diff Modal State
  const [isDiffModalOpen, setIsDiffModalOpen] = useState<boolean>(false);
  const [diffList, setDiffList] = useState<any[]>([]);

  // Delete Modal State
  const [deleteConfirmProfile, setDeleteConfirmProfile] = useState<WanProfileData | null>(null);

  const modelUpper = String(device?.modelName || '').toUpperCase();
  const is2PortModel = /4410|PLATINUM[-_ ]?4410|GX[-_ ]?4410|EARTH|1010|1001/i.test(modelUpper);
  const supportsVoip = /2122|4420|VOIP|VOICE|FXS|HGU|G-140W|G-240W|F670/i.test(modelUpper);

  // Available LAN ports & SSIDs based on hardware model
  const availableLanPorts = is2PortModel
    ? [
        { id: 'FE', label: 'FE (Fast Ethernet)' },
        { id: 'GE', label: 'GE (Gigabit Ethernet)' },
      ]
    : [
        { id: 'LAN1', label: 'LAN 1 (GE)' },
        { id: 'LAN2', label: 'LAN 2 (FE)' },
        { id: 'LAN3', label: 'LAN 3' },
        { id: 'LAN4', label: 'LAN 4' },
      ];

  const availableSsids = [
    { id: 'SSID1', label: 'SSID 1 (Primary)' },
    { id: 'SSID2', label: 'SSID 2 (Guest)' },
    { id: 'SSID3', label: 'SSID 3 (IoT)' },
    { id: 'SSID4', label: 'SSID 4 (Secondary)' },
  ];

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
      name: '2_TR069_R_VID_100',
      transMode: 'PON',
      mode: 'Route',
      enableWan: true,
      bearerService: 'INTERNET',
      linkMode: 'PPP',
      ipProtocol: 'IPv4',
      ipAssignment: 'DHCP',
      connectionType: 'PPPoE',
      serviceType: 'INTERNET',
      vlanMode: 'TAG',
      vlanEnabled: true,
      vlanId: 100,
      vlanPriority8021p: 0,
      multicastVlanId: 0,
      enableDhcpServer: true,
      mtu: 1492,
      natEnabled: true,
      dnsStatus: 'Disable',
      primaryDns: '',
      secondaryDns: '',
      wanPortBindings: ['WAN1'],
      lanPortBindings: is2PortModel ? ['FE', 'GE'] : ['LAN1', 'LAN2'],
      ssidBindings: ['SSID1'],
      pppoeUsername: '',
      pppoePassword: '',
      serviceName: '',
      enablePppoeBridgeMode: false,
      ipAddress: '',
      subnetMask: '',
      gateway: '',
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

  const handleAddNewWanConnection = () => {
    const nextIdx = profiles.length + 1;
    const newProf: WanProfileData = {
      name: `New WAN Connection`,
      transMode: 'PON',
      mode: 'Route',
      enableWan: true,
      bearerService: 'INTERNET',
      linkMode: 'PPP',
      ipProtocol: 'IPv4',
      ipAssignment: 'DHCP',
      connectionType: 'PPPoE',
      serviceType: 'INTERNET',
      vlanMode: 'TAG',
      vlanEnabled: true,
      vlanId: 100,
      vlanPriority8021p: 0,
      multicastVlanId: 0,
      enableDhcpServer: true,
      mtu: 1492,
      natEnabled: true,
      dnsStatus: 'Disable',
      primaryDns: '',
      secondaryDns: '',
      wanPortBindings: ['WAN1'],
      lanPortBindings: is2PortModel ? ['FE', 'GE'] : ['LAN1', 'LAN2'],
      ssidBindings: ['SSID1'],
      pppoeUsername: '',
      pppoePassword: '',
      serviceName: '',
      enablePppoeBridgeMode: false,
      ipAddress: '',
      subnetMask: '',
      gateway: '',
      status: 'Disconnected',
      isDefault: false,
    };
    setSelectedProfileId('NEW_TEMP');
    setActiveForm(newProf);
  };

  const handleCloneProfile = async (prof: WanProfileData) => {
    if (!prof._id) return;
    try {
      setIsSaving(true);
      const res = await api.duplicateWanProfile(deviceId, prof._id);
      if (res.success) {
        setSuccessMsg(`Cloned WAN Profile "${prof.name}" successfully.`);
        await fetchProfiles();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to clone profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!deleteConfirmProfile || !deleteConfirmProfile._id) return;
    try {
      setIsSaving(true);
      const res = await api.deleteWanProfile(deviceId, deleteConfirmProfile._id);
      if (res.success) {
        setSuccessMsg(`Profile "${deleteConfirmProfile.name}" deleted successfully.`);
        setDeleteConfirmProfile(null);
        await fetchProfiles();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleBinding = (type: 'lan' | 'ssid', id: string) => {
    if (!activeForm) return;
    if (type === 'lan') {
      const current = activeForm.lanPortBindings || [];
      const updated = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      setActiveForm({ ...activeForm, lanPortBindings: updated });
    } else {
      const current = activeForm.ssidBindings || [];
      const updated = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      setActiveForm({ ...activeForm, ssidBindings: updated });
    }
  };

  const handleOpenDiffModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeForm) return;

    // Synchronize legacy connectionType based on Mode & Link Mode & IP Assignment
    const finalConnectionType: 'PPPoE' | 'IPoE_DHCP' | 'Static' | 'Bridge' =
      activeForm.mode === 'Bridge'
        ? 'Bridge'
        : activeForm.linkMode === 'PPP'
        ? 'PPPoE'
        : activeForm.ipAssignment === 'Static'
        ? 'Static'
        : 'IPoE_DHCP';

    const isVoipOrTr069 = activeForm.bearerService === 'VOIP' || activeForm.bearerService === 'TR069';
    const stagedForm: WanProfileData = {
      ...activeForm,
      connectionType: finalConnectionType,
      serviceType: activeForm.bearerService || 'INTERNET',
      vlanEnabled: activeForm.vlanMode === 'TAG',
      lanPortBindings: isVoipOrTr069 ? [] : activeForm.lanPortBindings,
      ssidBindings: isVoipOrTr069 ? [] : activeForm.ssidBindings,
      enableDhcpServer: isVoipOrTr069 ? false : activeForm.enableDhcpServer,
      enablePppoeBridgeMode: isVoipOrTr069 ? false : activeForm.enablePppoeBridgeMode,
      pppoeUsername: isVoipOrTr069 || activeForm.linkMode === 'IP' ? '' : activeForm.pppoeUsername,
      pppoePassword: isVoipOrTr069 || activeForm.linkMode === 'IP' ? '' : activeForm.pppoePassword,
      serviceName: isVoipOrTr069 || activeForm.linkMode === 'IP' ? '' : activeForm.serviceName,
    };

    const original = profiles.find((p) => p._id === selectedProfileId) || {};
    const diffs: any[] = [];

    const isVoip = stagedForm.bearerService === 'VOIP';
    const isTr069 = stagedForm.bearerService === 'TR069';
    const isPpp = stagedForm.linkMode === 'PPP';
    const isStatic = stagedForm.linkMode === 'IP' && stagedForm.ipAssignment === 'Static';

    const allKeys = [
      { key: 'name', label: 'Connection Name', show: true },
      { key: 'mode', label: 'Mode (Route/Bridge)', show: true },
      { key: 'bearerService', label: 'Bearer Service', show: true },
      { key: 'linkMode', label: 'Link Mode', show: true },
      { key: 'ipProtocol', label: 'IP Protocol Version', show: true },
      { key: 'ipAssignment', label: 'IP Assignment', show: !isPpp },
      { key: 'vlanMode', label: 'VLAN Mode', show: true },
      { key: 'vlanId', label: 'VLAN ID', show: stagedForm.vlanMode !== 'UNTAG' && stagedForm.vlanMode !== 'TRANSPARENT' },
      { key: 'vlanPriority8021p', label: '802.1p Priority', show: stagedForm.vlanMode !== 'UNTAG' && stagedForm.vlanMode !== 'TRANSPARENT' },
      { key: 'multicastVlanId', label: 'Multicast VLAN ID', show: Boolean(stagedForm.multicastVlanId) },
      { key: 'mtu', label: 'MTU', show: true },
      { key: 'natEnabled', label: 'Enable NAT', show: !isVoip && !isTr069 && stagedForm.mode !== 'Bridge' },
      { key: 'enableDhcpServer', label: 'Enable DHCP Server', show: !isVoip && !isTr069 && stagedForm.mode !== 'Bridge' },
      { key: 'pppoeUsername', label: 'PPPoE Username', show: isPpp && !isVoip && !isTr069 },
      { key: 'pppoePassword', label: 'PPPoE Password', show: isPpp && !isVoip && !isTr069 },
      { key: 'serviceName', label: 'PPPoE Service Name', show: isPpp && !isVoip && !isTr069 && Boolean(stagedForm.serviceName) },
      { key: 'enablePppoeBridgeMode', label: 'PPPoE Router Bridge Mode', show: isPpp && !isVoip && !isTr069 },
      { key: 'lanPortBindings', label: 'LAN Port Bindings', show: !isVoip && !isTr069 },
      { key: 'ssidBindings', label: 'SSID Bindings', show: !isVoip && !isTr069 },
      { key: 'ipAddress', label: 'Static IP Address', show: isStatic },
      { key: 'subnetMask', label: 'Subnet Mask', show: isStatic },
      { key: 'gateway', label: 'Default Gateway', show: isStatic },
      { key: 'primaryDns', label: 'Primary DNS', show: stagedForm.dnsStatus === 'Enable' },
      { key: 'secondaryDns', label: 'Secondary DNS', show: stagedForm.dnsStatus === 'Enable' },
    ];

    const keysToCompare = allKeys.filter(k => k.show);

    for (const item of keysToCompare) {
      const oldVal = (original as any)[item.key];
      const newVal = (stagedForm as any)[item.key];
      const oldStr = Array.isArray(oldVal) ? oldVal.join(', ') : String(oldVal ?? '');
      const newStr = Array.isArray(newVal) ? newVal.join(', ') : String(newVal ?? '');

      if (oldStr !== newStr) {
        diffs.push({
          label: item.label,
          key: item.key,
          oldValue: item.key.includes('Password') && oldStr ? '••••••••' : oldStr || 'None',
          newValue: item.key.includes('Password') && newStr ? '••••••••' : newStr || 'None',
        });
      }
    }

    setActiveForm(stagedForm);
    setDiffList(diffs);
    setIsDiffModalOpen(true);
  };

  const handleCommitToOnt = async () => {
    if (!activeForm) return;
    setIsCommitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let res: any;
      if (selectedProfileId === 'NEW_TEMP' || !activeForm._id) {
        res = await api.createWanProfile(deviceId, activeForm);
      } else {
        res = await api.updateWanProfile(deviceId, activeForm._id, activeForm);
      }

      if (res.success) {
        setSuccessMsg(
          res.message ||
            `WAN Configuration [${activeForm.name}] staged & queued for TR-069 dispatch to ONT.`
        );
        setIsDiffModalOpen(false);
        await fetchProfiles();
        if (onRefreshTelemetry) onRefreshTelemetry();
      } else {
        setErrorMsg(res.error || 'Failed to dispatch WAN configuration');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with ACS backend');
    } finally {
      setIsCommitting(false);
    }
  };

  const isBridgeMode = activeForm?.mode === 'Bridge';
  const isTr069Service = activeForm?.bearerService === 'TR069';
  const isVoipService = activeForm?.bearerService === 'VOIP';
  const isInternetService = activeForm?.bearerService === 'INTERNET' || !activeForm?.bearerService;
  const isPppMode = activeForm?.linkMode === 'PPP';
  const isIpMode = activeForm?.linkMode === 'IP';
  const isStaticIp = isIpMode && activeForm?.ipAssignment === 'Static';

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main 2-Column Suite Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: WAN CONNECTION INVENTORY & SELECTOR (4 Cols) */}
        <div className="lg:col-span-4 bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">WAN Connections ({profiles.length})</h4>
              <p className="text-[11px] text-slate-500">Configured on ONT</p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleAddNewWanConnection}
              className="text-xs flex items-center space-x-1 bg-[#1677FF] hover:bg-[#0958d9]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </Button>
          </div>

          {/* Profiles List */}
          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {profiles.map((prof, idx) => {
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
                          {prof.linkMode === 'IP' ? (prof.ipAssignment === 'Static' ? 'Static IP' : 'DHCP') : 'PPPoE'}
                        </span>
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                          VID: {prof.vlanMode === 'TAG' || prof.vlanEnabled !== false ? prof.vlanId : 'Untagged'}
                        </span>
                        <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {prof.bearerService || prof.serviceType || 'INTERNET'}
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
                        {prof.ipAddress || '192.168.22.170'}
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

        {/* RIGHT COLUMN: ROUTER UI WAN CONFIGURATION FORM (8 Cols) */}
        <div className="lg:col-span-8 bg-white border border-[#CBD5E1] rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-[#7928CA]/5 border-b border-[#7928CA]/15 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-purple-100 text-[#7928CA]">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">WAN Configuration</h4>
                <p className="text-xs text-slate-500">Configure PON WAN interface parameters for {device.modelName || 'Genexis Platinum-4410'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowTr069Mapping(!showTr069Mapping)}
                className="text-xs"
              >
                <FileCode className="w-3.5 h-3.5 mr-1 text-blue-600" />
                <span>{showTr069Mapping ? 'Hide TR-069 Paths' : 'Show TR-069 Paths'}</span>
              </Button>
            </div>
          </div>

          {activeForm ? (
            <form onSubmit={handleOpenDiffModal} className="p-6 space-y-6">
              {/* Top Configuration Table matching Router Interface */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 space-y-4">
                {/* Row 1: TransMode */}
                <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">TransMode:</label>
                  <div className="sm:col-span-2 flex items-center space-x-3">
                    <select
                      value={activeForm.transMode || 'PON'}
                      onChange={(e: any) => setActiveForm({ ...activeForm, transMode: e.target.value })}
                      className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-[#7928CA]"
                    >
                      <option value="PON">PON</option>
                      <option value="Ethernet">Ethernet</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setActiveForm({ ...activeForm, transMode: activeForm.transMode === 'PON' ? 'Ethernet' : 'PON' })}
                      className="px-3 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      Switch
                    </button>
                  </div>
                </div>

                {/* Row 2: Connection Name */}
                <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">Connection Name:</label>
                  <div className="sm:col-span-2 flex items-center space-x-3">
                    <select
                      value={selectedProfileId}
                      onChange={(e) => {
                        const prof = profiles.find((p) => p._id === e.target.value);
                        if (prof) handleSelectProfile(prof);
                      }}
                      className="flex-1 px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-[#7928CA]"
                    >
                      {profiles.map((p, i) => (
                        <option key={p._id || i} value={p._id || String(i)}>
                          {p.name}
                        </option>
                      ))}
                      {selectedProfileId === 'NEW_TEMP' && <option value="NEW_TEMP">New WAN Connection</option>}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddNewWanConnection}
                      className="px-3 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      New
                    </button>
                  </div>
                </div>

                {/* Row 3: Mode (Route / Bridge) + Enable */}
                <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">Mode:</label>
                  <div className="sm:col-span-2 flex items-center space-x-6">
                    <select
                      value={activeForm.mode || 'Route'}
                      onChange={(e: any) => setActiveForm({ ...activeForm, mode: e.target.value })}
                      className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-[#7928CA]"
                    >
                      <option value="Route">Route</option>
                      <option value="Bridge">Bridge</option>
                    </select>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <span className="text-xs font-bold text-slate-700">Enable:</span>
                      <input
                        type="checkbox"
                        checked={activeForm.enableWan !== false}
                        onChange={(e) => setActiveForm({ ...activeForm, enableWan: e.target.checked })}
                        className="w-4 h-4 text-[#7928CA] rounded"
                      />
                    </label>
                  </div>
                </div>

                {/* Row 4: Bearer Service */}
                <div className="grid grid-cols-1 sm:grid-cols-3 items-start gap-2">
                  <label className="text-xs font-bold text-slate-700 pt-1.5">Bearer Service:</label>
                  <div className="sm:col-span-2 space-y-1">
                    <select
                      value={activeForm.bearerService || 'INTERNET'}
                      onChange={(e: any) => {
                        const s = e.target.value;
                        if (s === 'VOIP' || s === 'TR069') {
                          setActiveForm({
                            ...activeForm,
                            bearerService: s,
                            serviceType: s,
                            linkMode: 'IP',
                            connectionType: 'IPoE_DHCP',
                            ipAssignment: 'DHCP',
                            mtu: 1500,
                            natEnabled: false,
                            pppoeUsername: '',
                            pppoePassword: '',
                            serviceName: '',
                          });
                        } else {
                          setActiveForm({
                            ...activeForm,
                            bearerService: s,
                            serviceType: s,
                            linkMode: 'PPP',
                            connectionType: 'PPPoE',
                            mtu: 1492,
                            natEnabled: true,
                          });
                        }
                      }}
                      className="w-full sm:w-64 px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-[#7928CA]"
                    >
                      <option value="INTERNET">INTERNET</option>
                      <option value="TR069">TR069</option>
                      <option value="VOIP">VOIP</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                    <p className="text-[10px] text-slate-500 italic">
                      Note: If change voice wan connection service, please register voip service again.
                    </p>
                  </div>
                </div>

                {/* Row 5: Binding Options (FE, GE, SSID1, SSID2, SSID3, SSID4) - Only for INTERNET / Bridge */}
                {!isTr069Service && !isVoipService && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 items-start gap-2 pt-2 border-t border-slate-200">
                    <label className="text-xs font-bold text-slate-700 pt-1">Binding Option:</label>
                    <div className="sm:col-span-2 space-y-2">
                      <div className="flex flex-wrap items-center gap-4">
                        {availableLanPorts.map((port) => (
                          <label key={port.id} className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-slate-800">
                            <input
                              type="checkbox"
                              checked={(activeForm.lanPortBindings || []).includes(port.id)}
                              onChange={() => handleToggleBinding('lan', port.id)}
                              className="w-4 h-4 text-[#7928CA] rounded"
                            />
                            <span>{port.id}</span>
                          </label>
                        ))}

                        {availableSsids.map((ssid) => (
                          <label key={ssid.id} className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-slate-800">
                            <input
                              type="checkbox"
                              checked={(activeForm.ssidBindings || []).includes(ssid.id)}
                              onChange={() => handleToggleBinding('ssid', ssid.id)}
                              className="w-4 h-4 text-[#7928CA] rounded"
                            />
                            <span>{ssid.id}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Row 6: Enable DHCP Server (Route Mode Only) */}
                {!isBridgeMode && !isTr069Service && !isVoipService && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                    <label className="text-xs font-bold text-slate-700">Enable DHCP Server:</label>
                    <div className="sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={activeForm.enableDhcpServer !== false}
                        onChange={(e) => setActiveForm({ ...activeForm, enableDhcpServer: e.target.checked })}
                        className="w-4 h-4 text-[#7928CA] rounded"
                      />
                    </div>
                  </div>
                )}

                {/* Row 7: Link Mode (PPP vs IP) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">Link Mode:</label>
                  <div className="sm:col-span-2">
                    <select
                      value={activeForm.linkMode || (isVoipService || isTr069Service ? 'IP' : 'PPP')}
                      disabled={isVoipService || isTr069Service}
                      onChange={(e: any) =>
                        setActiveForm({
                          ...activeForm,
                          linkMode: e.target.value,
                          connectionType: e.target.value === 'PPP' ? 'PPPoE' : (activeForm.ipAssignment === 'Static' ? 'Static' : 'IPoE_DHCP'),
                          mtu: e.target.value === 'PPP' ? 1492 : 1500,
                        })
                      }
                      className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-[#7928CA] disabled:bg-slate-100"
                    >
                      {!isVoipService && !isTr069Service && <option value="PPP">PPP</option>}
                      <option value="IP">IP (Auto DHCP / Static)</option>
                    </select>
                  </div>
                </div>

                {/* Row 8: IP Protocol Version */}
                <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">IP Protocol Version:</label>
                  <div className="sm:col-span-2 flex items-center space-x-6">
                    {['IPv4', 'IPv6', 'IPv4/IPv6'].map((ver) => (
                      <label key={ver} className="flex items-center space-x-1.5 text-xs font-semibold cursor-pointer text-slate-800">
                        <input
                          type="radio"
                          name="ipProtocol"
                          value={ver}
                          checked={(activeForm.ipProtocol || 'IPv4') === ver}
                          onChange={(e) => setActiveForm({ ...activeForm, ipProtocol: e.target.value as any })}
                          className="text-[#7928CA]"
                        />
                        <span>{ver}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* When Link Mode == 'IP': Radio for DHCP vs Static */}
                {isIpMode && (
                  <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 space-y-3">
                    <div className="flex items-center space-x-6">
                      <label className="flex items-center space-x-2 text-xs font-bold cursor-pointer text-slate-800">
                        <input
                          type="radio"
                          name="ipAssignment"
                          value="DHCP"
                          checked={activeForm.ipAssignment !== 'Static'}
                          onChange={() => setActiveForm({ ...activeForm, ipAssignment: 'DHCP' })}
                          className="text-[#7928CA]"
                        />
                        <span>DHCP (Get an IP automatically from ISP.)</span>
                      </label>

                      <label className="flex items-center space-x-2 text-xs font-bold cursor-pointer text-slate-800">
                        <input
                          type="radio"
                          name="ipAssignment"
                          value="Static"
                          checked={activeForm.ipAssignment === 'Static'}
                          onChange={() => setActiveForm({ ...activeForm, ipAssignment: 'Static' })}
                          className="text-[#7928CA]"
                        />
                        <span>Static (Get a static IP from ISP.)</span>
                      </label>
                    </div>

                    {isStaticIp && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block">IP Address:</label>
                          <input
                            type="text"
                            value={activeForm.ipAddress || ''}
                            onChange={(e) => setActiveForm({ ...activeForm, ipAddress: e.target.value })}
                            placeholder="192.168.1.100"
                            className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block">Subnet Mask:</label>
                          <input
                            type="text"
                            value={activeForm.subnetMask || '255.255.255.0'}
                            onChange={(e) => setActiveForm({ ...activeForm, subnetMask: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block">Default Gateway:</label>
                          <input
                            type="text"
                            value={activeForm.gateway || ''}
                            onChange={(e) => setActiveForm({ ...activeForm, gateway: e.target.value })}
                            placeholder="192.168.1.1"
                            className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Row 9: VLAN Settings */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                    <label className="text-xs font-bold text-slate-700">VLAN Mode:</label>
                    <div className="sm:col-span-2">
                      <select
                        value={activeForm.vlanMode || 'TAG'}
                        onChange={(e: any) =>
                          setActiveForm({
                            ...activeForm,
                            vlanMode: e.target.value,
                            vlanEnabled: e.target.value === 'TAG',
                          })
                        }
                        className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-[#7928CA]"
                      >
                        <option value="TAG">TAG</option>
                        <option value="UNTAG">UNTAG</option>
                        <option value="TRANSPARENT">TRANSPARENT</option>
                      </select>
                    </div>
                  </div>

                  {activeForm.vlanMode !== 'UNTAG' && activeForm.vlanMode !== 'TRANSPARENT' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block">VLAN ID[1-4094]:</label>
                        <input
                          type="number"
                          min="1"
                          max="4094"
                          value={activeForm.vlanId && activeForm.vlanId !== 0 ? activeForm.vlanId : ''}
                          onChange={(e) => setActiveForm({ ...activeForm, vlanId: e.target.value ? Number(e.target.value) : ('' as any) })}
                          placeholder="e.g. 100"
                          className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block">802.1p[0-7]:</label>
                        <input
                          type="number"
                          min="0"
                          max="7"
                          value={activeForm.vlanPriority8021p || 0}
                          onChange={(e) => setActiveForm({ ...activeForm, vlanPriority8021p: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block">Multicast VLAN ID[1-4094]:</label>
                        <input
                          type="number"
                          min="0"
                          max="4094"
                          value={activeForm.multicastVlanId || ''}
                          onChange={(e) => setActiveForm({ ...activeForm, multicastVlanId: Number(e.target.value) })}
                          placeholder="Optional"
                          className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block">
                        MTU{isPppMode ? '[128-1492]' : '[576-1500]'}:
                      </label>
                      <input
                        type="number"
                        min={isPppMode ? 128 : 576}
                        max={isPppMode ? 1492 : 1500}
                        value={activeForm.mtu || (isPppMode ? 1492 : 1500)}
                        onChange={(e) => setActiveForm({ ...activeForm, mtu: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white"
                      />
                    </div>

                    {!isBridgeMode && !isTr069Service && !isVoipService && (
                      <div className="flex items-end pb-1.5">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={activeForm.natEnabled !== false}
                            onChange={(e) => setActiveForm({ ...activeForm, natEnabled: e.target.checked })}
                            className="w-4 h-4 text-[#7928CA] rounded"
                          />
                          <span className="text-xs font-bold text-slate-700">Enable NAT</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 10: DNS Status & DNS Servers */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                    <label className="text-xs font-bold text-slate-700">DNS Status:</label>
                    <div className="sm:col-span-2 flex items-center space-x-6">
                      <label className="flex items-center space-x-1.5 text-xs font-semibold cursor-pointer text-slate-800">
                        <input
                          type="radio"
                          name="dnsStatus"
                          value="Enable"
                          checked={activeForm.dnsStatus === 'Enable'}
                          onChange={() => setActiveForm({ ...activeForm, dnsStatus: 'Enable' })}
                          className="text-[#7928CA]"
                        />
                        <span>Enable</span>
                      </label>
                      <label className="flex items-center space-x-1.5 text-xs font-semibold cursor-pointer text-slate-800">
                        <input
                          type="radio"
                          name="dnsStatus"
                          value="Disable"
                          checked={activeForm.dnsStatus !== 'Enable'}
                          onChange={() => setActiveForm({ ...activeForm, dnsStatus: 'Disable' })}
                          className="text-[#7928CA]"
                        />
                        <span>Disable</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block">Primary DNS Server:</label>
                      <input
                        type="text"
                        value={activeForm.primaryDns || ''}
                        onChange={(e) => setActiveForm({ ...activeForm, primaryDns: e.target.value })}
                        disabled={activeForm.dnsStatus !== 'Enable'}
                        placeholder="8.8.8.8"
                        className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block">Secondary DNS Server:</label>
                      <input
                        type="text"
                        value={activeForm.secondaryDns || ''}
                        onChange={(e) => setActiveForm({ ...activeForm, secondaryDns: e.target.value })}
                        disabled={activeForm.dnsStatus !== 'Enable'}
                        placeholder="1.1.1.1"
                        className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION: PPPoE CREDENTIALS (When Link Mode == PPP and Service is INTERNET) */}
                {isPppMode && !isVoipService && !isTr069Service && (
                  <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block">User Name:</label>
                        <input
                          type="text"
                          value={activeForm.pppoeUsername || ''}
                          onChange={(e) => setActiveForm({ ...activeForm, pppoeUsername: e.target.value })}
                          placeholder="e.g. bsnl_user_100"
                          className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-purple-300 rounded-lg bg-white"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-700">Password:</label>
                          <label className="flex items-center space-x-1 text-[10px] text-slate-500 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showPassword}
                              onChange={(e) => setShowPassword(e.target.checked)}
                              className="w-3 h-3 text-[#7928CA] rounded"
                            />
                            <span>Show Password</span>
                          </label>
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={activeForm.pppoePassword || activeForm.pppoePasswordEncrypted || ''}
                          onChange={(e) => setActiveForm({ ...activeForm, pppoePassword: e.target.value })}
                          placeholder="••••••••••••"
                          className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-purple-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block">Service Name:</label>
                        <input
                          type="text"
                          value={activeForm.serviceName || ''}
                          onChange={(e) => setActiveForm({ ...activeForm, serviceName: e.target.value })}
                          placeholder="Optional"
                          className="w-full px-3 py-1.5 text-xs border border-purple-300 rounded-lg bg-white"
                        />
                      </div>

                      <div className="flex items-end pb-1.5">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={activeForm.enablePppoeBridgeMode || false}
                            onChange={(e) => setActiveForm({ ...activeForm, enablePppoeBridgeMode: e.target.checked })}
                            className="w-4 h-4 text-[#7928CA] rounded"
                          />
                          <span className="text-xs font-bold text-slate-700">Enable PPPoE Router Bridge Mode</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION: TR-069 DEDICATED ACS SERVICE (When Bearer Service == TR069) */}
                {isTr069Service && (
                  <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
                    <div className="flex items-center space-x-2 text-emerald-800 pb-1 border-b border-emerald-200">
                      <Server className="w-4 h-4 text-emerald-600" />
                      <h5 className="text-xs font-bold uppercase tracking-wider">TR-069 ACS Management Parameters</h5>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block">ACS URL:</label>
                        <input
                          type="text"
                          value={activeForm.acsUrl || 'http://31.42.125.25:7547/tr069/rudra'}
                          onChange={(e) => setActiveForm({ ...activeForm, acsUrl: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-emerald-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block">ACS Username:</label>
                        <input
                          type="text"
                          value={activeForm.acsUsername || 'admin'}
                          onChange={(e) => setActiveForm({ ...activeForm, acsUsername: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs font-mono border border-emerald-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block">ACS Password:</label>
                        <input
                          type={showAcsPassword ? 'text' : 'password'}
                          value={activeForm.acsPassword || 'admin'}
                          onChange={(e) => setActiveForm({ ...activeForm, acsPassword: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs font-mono border border-emerald-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION: VOIP SIP CONFIGURATION (When Bearer Service == VOIP) */}
                {isVoipService && supportsVoip && (
                  <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
                    <div className="flex items-center space-x-2 text-amber-800 pb-1 border-b border-amber-200">
                      <Radio className="w-4 h-4 text-amber-600" />
                      <h5 className="text-xs font-bold uppercase tracking-wider">VoIP SIP Trunk Configuration (FXS Voice)</h5>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block">SIP Proxy / Server:</label>
                        <input
                          type="text"
                          value={activeForm.voipSipServer || 'sip.isp.net'}
                          onChange={(e) => setActiveForm({ ...activeForm, voipSipServer: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs font-mono border border-amber-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block">SIP Port:</label>
                        <input
                          type="number"
                          value={activeForm.voipSipPort || 5060}
                          onChange={(e) => setActiveForm({ ...activeForm, voipSipPort: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 text-xs font-mono border border-amber-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block">Auth Account / Number:</label>
                        <input
                          type="text"
                          value={activeForm.voipAccount || ''}
                          onChange={(e) => setActiveForm({ ...activeForm, voipAccount: e.target.value })}
                          placeholder="e.g. +914023456789"
                          className="w-full px-3 py-1.5 text-xs font-mono border border-amber-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block">Auth Password:</label>
                        <input
                          type={showVoipPassword ? 'text' : 'password'}
                          value={activeForm.voipPassword || ''}
                          onChange={(e) => setActiveForm({ ...activeForm, voipPassword: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs font-mono border border-amber-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Action Buttons (OK / Cancel / Delete) */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div>
                  {profiles.length > 1 && activeForm._id && (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmProfile(activeForm)}
                      className="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition"
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (profiles.length > 0) {
                        handleSelectProfile(profiles[0]);
                      }
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    className="bg-[#1677FF] hover:bg-[#0958d9] text-white font-bold px-6"
                  >
                    OK / Apply
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Select a WAN connection or click "New" to configure.
            </div>
          )}
        </div>
      </div>

      {/* COMMIT DIFF MODAL */}
      <Modal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        title="Verify WAN Changes Before Staging to ONT"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            The following parameters will be updated in the WAN profile for <strong>{activeForm?.name}</strong> and queued for native TR-069 dispatch to ONT:
          </p>

          {diffList.length > 0 ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Parameter</th>
                    <th className="p-2.5 text-slate-500">Current / Previous</th>
                    <th className="p-2.5 text-blue-600">New Staged Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {diffList.map((d, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2.5 font-sans font-bold text-slate-800">{d.label}</td>
                      <td className="p-2.5 text-slate-400 line-through">{d.oldValue}</td>
                      <td className="p-2.5 text-blue-700 font-bold bg-blue-50/50">{d.newValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-center">
              No parameter changes detected compared to existing state.
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsDiffModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleCommitToOnt}
              isLoading={isCommitting}
              className="bg-[#1677FF] hover:bg-[#0958d9]"
            >
              Confirm & Stage to ONT
            </Button>
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(deleteConfirmProfile)}
        onClose={() => setDeleteConfirmProfile(null)}
        title="Delete WAN Connection"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-700">
            Are you sure you want to delete WAN Profile <strong>{deleteConfirmProfile?.name}</strong>?
          </p>
          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setDeleteConfirmProfile(null)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleDeleteProfile} isLoading={isSaving} className="bg-rose-600 hover:bg-rose-700">
              Delete Profile
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
