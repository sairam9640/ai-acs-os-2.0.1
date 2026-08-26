import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Radio,
  RefreshCw,
  Signal,
  Shield,
  Power,
  Wifi,
  Globe,
  Zap,
  Cpu,
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
  Play,
  RotateCcw,
  Search,
  Filter,
  FileText,
  MapPin,
  ListOrdered,
  Terminal,
  Compass,
  HardDrive,
  Network,
  ChevronRight,
  User,
  ArrowLeft,
  Check,
  X,
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  Plus,
  Trash2,
  Send,
  CheckSquare,
  Square,
  Home,
  BarChart2,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button, Input } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../services/api.js';
import { WanManagementSuite } from '../../components/device/WanManagementSuite.js';

type TabType =
  | 'analysis'
  | 'wifi'
  | 'wan'
  | 'connected'
  | 'survey'
  | 'diagnostics'
  | 'actions'
  | 'ports'
  | 'logs'
  | 'location'
  | 'history'
  | 'discovery'
  | 'rpc'
  | 'audit'
  | 'queue';

interface ModelSpecificOntGraphicProps {
  model?: string;
  vendor?: string;
  serialNumber?: string;
  isOnline?: boolean;
  className?: string;
}

const ModelSpecificOntGraphic: React.FC<ModelSpecificOntGraphicProps> = ({
  model = '',
  vendor = '',
  serialNumber = '',
  isOnline = true,
  className = '',
}) => {
  const modelUpper = String(model || '').toUpperCase();
  const vendorUpper = String(vendor || '').toUpperCase();
  const ledColor = isOnline ? '#10B981' : '#EF4444';

  // 1. GENEXIS PLATINUM-4410 (4 External Antennas, Sleek Dual-Tone Black Chassis)
  if (modelUpper.includes('PLATINUM') || modelUpper.includes('4410')) {
    return (
      <div className={`flex flex-col items-center justify-center p-3 bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-slate-700 shadow-lg text-center ${className}`}>
        <svg viewBox="0 0 280 200" className="w-full max-w-[210px] h-auto drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M25 15 L35 15 L45 90 L35 90 Z" fill="#334155" stroke="#475569" strokeWidth="1.5" />
          <line x1="30" y1="25" x2="38" y2="85" stroke="#0EA5E9" strokeWidth="1.5" strokeOpacity="0.7" />
          <rect x="75" y="10" width="10" height="95" rx="5" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
          <rect x="195" y="10" width="10" height="95" rx="5" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
          <path d="M255 15 L245 15 L235 90 L245 90 Z" fill="#334155" stroke="#475569" strokeWidth="1.5" />
          <line x1="250" y1="25" x2="242" y2="85" stroke="#0EA5E9" strokeWidth="1.5" strokeOpacity="0.7" />
          <rect x="42" y="82" width="196" height="85" rx="10" fill="#0F172A" stroke="#334155" strokeWidth="2.5" />
          <rect x="52" y="90" width="176" height="69" rx="8" fill="#1E293B" />
          <line x1="58" y1="120" x2="222" y2="120" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="58" y1="128" x2="222" y2="128" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
          <rect x="105" y="96" width="70" height="16" rx="4" fill="#0284C7" />
          <text x="140" y="108" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">GENEXIS</text>
          <circle cx="70" cy="144" r="3.5" fill={ledColor} />
          <circle cx="88" cy="144" r="3.5" fill={ledColor} />
          <circle cx="106" cy="144" r="3.5" fill={ledColor} />
          <circle cx="124" cy="144" r="3.5" fill={ledColor} />
          <circle cx="142" cy="144" r="3.5" fill="#38BDF8" />
          <circle cx="160" cy="144" r="3.5" fill="#38BDF8" />
          <circle cx="178" cy="144" r="3.5" fill={ledColor} />
          <rect x="62" y="167" width="22" height="7" rx="3" fill="#334155" />
          <rect x="196" y="167" width="22" height="7" rx="3" fill="#334155" />
        </svg>
        <span className="text-[11px] font-bold text-sky-400 font-mono mt-1">GENEXIS Platinum-4410</span>
        <span className="text-[9px] text-slate-400 font-medium">AC1200 Gigabit Dual-Band GPON ONT</span>
      </div>
    );
  }

  // 2. GENEXIS TITANIUM-2122A (Dual External Antennas, Matte Charcoal Chassis)
  if (modelUpper.includes('TITANIUM') || modelUpper.includes('2122')) {
    return (
      <div className={`flex flex-col items-center justify-center p-3 bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-slate-700 shadow-lg text-center ${className}`}>
        <svg viewBox="0 0 260 190" className="w-full max-w-[195px] h-auto drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="30" y="12" width="10" height="115" rx="5" fill="#1E293B" stroke="#475569" strokeWidth="1.8" />
          <rect x="33" y="22" width="4" height="95" rx="2" fill="#0284C7" />
          <rect x="220" y="12" width="10" height="115" rx="5" fill="#1E293B" stroke="#475569" strokeWidth="1.8" />
          <rect x="223" y="22" width="4" height="95" rx="2" fill="#0284C7" />
          <rect x="42" y="78" width="176" height="82" rx="10" fill="#0F172A" stroke="#334155" strokeWidth="2.5" />
          <rect x="50" y="85" width="160" height="68" rx="8" fill="#1E293B" />
          <path d="M50 85 L130 92 L210 85 L210 102 L130 110 L50 102 Z" fill="#0F172A" opacity="0.6" />
          <text x="130" y="104" fill="#38BDF8" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">Titanium-2122A</text>
          <circle cx="68" cy="138" r="3.5" fill={ledColor} />
          <circle cx="86" cy="138" r="3.5" fill={ledColor} />
          <circle cx="104" cy="138" r="3.5" fill={ledColor} />
          <circle cx="122" cy="138" r="3.5" fill="#0284C7" />
          <circle cx="140" cy="138" r="3.5" fill="#0284C7" />
          <rect x="60" y="160" width="20" height="7" rx="3" fill="#475569" />
          <rect x="180" y="160" width="20" height="7" rx="3" fill="#475569" />
        </svg>
        <span className="text-[11px] font-bold text-sky-400 font-mono mt-1">GENEXIS Titanium-2122A</span>
        <span className="text-[9px] text-slate-400 font-medium">Gigabit XPON Dual-Band Router</span>
      </div>
    );
  }

  // 3. GENEXIS EARTH-2022 (Pearl White Curved Aerodynamic Chassis)
  if (modelUpper.includes('EARTH') || modelUpper.includes('2022')) {
    return (
      <div className={`flex flex-col items-center justify-center p-3 bg-gradient-to-b from-slate-100 to-slate-200 rounded-2xl border border-slate-300 shadow-md text-center ${className}`}>
        <svg viewBox="0 0 250 180" className="w-full max-w-[190px] h-auto drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="36" y="15" width="9" height="110" rx="4.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
          <rect x="205" y="15" width="9" height="110" rx="4.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
          <rect x="46" y="75" width="158" height="78" rx="14" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
          <path d="M56 95 Q 125 82 194 95" stroke="#94A3B8" strokeWidth="2" fill="none" />
          <text x="125" y="112" fill="#047857" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">EARTH-2022</text>
          <circle cx="75" cy="132" r="3.5" fill={ledColor} />
          <circle cx="95" cy="132" r="3.5" fill={ledColor} />
          <circle cx="115" cy="132" r="3.5" fill={ledColor} />
          <circle cx="135" cy="132" r="3.5" fill={ledColor} />
          <rect x="66" y="153" width="18" height="6" rx="2" fill="#94A3B8" />
          <rect x="166" y="153" width="18" height="6" rx="2" fill="#94A3B8" />
        </svg>
        <span className="text-[11px] font-bold text-emerald-700 font-mono mt-1">GENEXIS EARTH-2022</span>
        <span className="text-[9px] text-slate-500 font-medium">Eco GPON Wi-Fi Terminal</span>
      </div>
    );
  }

  // 4. SYROTECH / REALTEK SY-GPON-1110 / 2010 (Pure White FTTH ONT with 2 Antennas)
  if (modelUpper.includes('SY-GPON') || modelUpper.includes('1110') || modelUpper.includes('2010') || vendorUpper.includes('REALTEK') || vendorUpper.includes('SYROTECH')) {
    return (
      <div className={`flex flex-col items-center justify-center p-3 bg-gradient-to-b from-slate-50 to-slate-100 rounded-2xl border border-slate-300 shadow-md text-center ${className}`}>
        <svg viewBox="0 0 250 180" className="w-full max-w-[190px] h-auto drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="32" y="14" width="9" height="110" rx="4.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
          <line x1="36" y1="26" x2="36" y2="105" stroke="#38BDF8" strokeWidth="1.5" />
          <rect x="209" y="14" width="9" height="110" rx="4.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
          <line x1="213" y1="26" x2="213" y2="105" stroke="#38BDF8" strokeWidth="1.5" />
          <rect x="42" y="74" width="166" height="78" rx="8" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
          <rect x="50" y="82" width="150" height="62" rx="6" fill="#F8FAFC" />
          <rect x="95" y="88" width="60" height="14" rx="3" fill="#0284C7" />
          <text x="125" y="98" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">SYROTECH</text>
          <circle cx="68" cy="126" r="3" fill={ledColor} />
          <circle cx="84" cy="126" r="3" fill={ledColor} />
          <circle cx="100" cy="126" r="3" fill={ledColor} />
          <circle cx="116" cy="126" r="3" fill={ledColor} />
          <circle cx="132" cy="126" r="3" fill={ledColor} />
          <rect x="58" y="152" width="18" height="6" rx="2" fill="#94A3B8" />
          <rect x="174" y="152" width="18" height="6" rx="2" fill="#94A3B8" />
        </svg>
        <span className="text-[11px] font-bold text-sky-800 font-mono mt-1">SYROTECH {model || 'SY-GPON-1110'}</span>
        <span className="text-[9px] text-slate-500 font-medium">Realtek High-Gain GPON/XPON ONT</span>
      </div>
    );
  }

  // 5. HGU RH821GWV-DG (Commercial Dual-Band HGU Gateway)
  if (modelUpper.includes('RH821') || modelUpper.includes('HGU')) {
    return (
      <div className={`flex flex-col items-center justify-center p-3 bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-slate-700 shadow-lg text-center ${className}`}>
        <svg viewBox="0 0 270 190" className="w-full max-w-[200px] h-auto drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="35" y="12" width="8" height="100" rx="4" fill="#334155" stroke="#475569" strokeWidth="1.5" />
          <rect x="75" y="10" width="8" height="100" rx="4" fill="#334155" stroke="#475569" strokeWidth="1.5" />
          <rect x="187" y="10" width="8" height="100" rx="4" fill="#334155" stroke="#475569" strokeWidth="1.5" />
          <rect x="227" y="12" width="8" height="100" rx="4" fill="#334155" stroke="#475569" strokeWidth="1.5" />
          <rect x="45" y="80" width="180" height="82" rx="10" fill="#0F172A" stroke="#334155" strokeWidth="2.5" />
          <line x1="60" y1="96" x2="210" y2="96" stroke="#1E293B" strokeWidth="3" />
          <line x1="60" y1="104" x2="210" y2="104" stroke="#1E293B" strokeWidth="3" />
          <text x="135" y="122" fill="#E2E8F0" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">HGU RH821GWV-DG</text>
          <circle cx="75" cy="144" r="3.5" fill={ledColor} />
          <circle cx="95" cy="144" r="3.5" fill={ledColor} />
          <circle cx="115" cy="144" r="3.5" fill={ledColor} />
          <circle cx="135" cy="144" r="3.5" fill="#38BDF8" />
          <circle cx="155" cy="144" r="3.5" fill="#38BDF8" />
          <rect x="65" y="162" width="20" height="7" rx="3" fill="#334155" />
          <rect x="185" y="162" width="20" height="7" rx="3" fill="#334155" />
        </svg>
        <span className="text-[11px] font-bold text-sky-400 font-mono mt-1">HGU RH821GWV-DG</span>
        <span className="text-[9px] text-slate-400 font-medium">Dual-Band Realtek HGU Gateway</span>
      </div>
    );
  }

  // 6. DEFAULT / GENERIC GPON ONT
  return (
    <div className={`flex flex-col items-center justify-center p-3 bg-[#F8FAFC] rounded-2xl border border-[#CBD5E1] shadow-xs text-center ${className}`}>
      <svg viewBox="0 0 240 180" className="w-full max-w-[180px] h-auto drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="28" y="10" width="10" height="120" rx="5" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="2" />
        <rect x="31" y="20" width="4" height="100" rx="2" fill="#94A3B8" />
        <rect x="202" y="10" width="10" height="120" rx="5" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="2" />
        <rect x="205" y="20" width="4" height="100" rx="2" fill="#94A3B8" />
        <rect x="38" y="80" width="164" height="75" rx="8" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />
        <rect x="44" y="86" width="152" height="63" rx="6" fill="#FFFFFF" />
        <text x="120" y="112" fill="#0F172A" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">{model || 'GPON ONT'}</text>
        <circle cx="60" cy="132" r="3" fill={ledColor} />
        <circle cx="72" cy="132" r="3" fill={ledColor} />
        <circle cx="84" cy="132" r="3" fill={ledColor} />
        <circle cx="96" cy="132" r="3" fill={ledColor} />
        <rect x="52" y="153" width="18" height="6" rx="2" fill="#94A3B8" />
        <rect x="170" y="153" width="18" height="6" rx="2" fill="#94A3B8" />
      </svg>
      <span className="text-[11px] font-bold text-[#0F172A] font-mono mt-1">{vendor} {model || 'GPON ONT'}</span>
      <span className="text-[9px] text-[#64748B] font-medium">Gigabit Optical Terminal</span>
    </div>
  );
};

const CircularGauge: React.FC<{ score: number | null; quality: string }> = ({ score, quality }) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = score != null ? circumference - (score / 100) * circumference : circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <span className="text-xs font-semibold text-[#64748B] mb-2">Overall Health Score</span>
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} stroke="#1E293B" strokeWidth="7" fill="transparent" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#10B981"
            strokeWidth="7"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold font-mono text-[#0F172A]">
            {score != null ? score.toFixed(1) : 'N/A'}
          </span>
          <span className="text-[10px] text-[#047857] font-semibold">{quality}</span>
        </div>
      </div>
    </div>
  );
};

export const DeviceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>('analysis');
  const [workspace, setWorkspace] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Wi-Fi Password Visibility Toggles
  const [show24Password, setShow24Password] = useState(false);
  const [show5gPassword, setShow5gPassword] = useState(false);

  // Time filter for optical history
  const [historyFilter, setHistoryFilter] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h');

  // Wi-Fi & Parameter Edit Modal State
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

  // Diagnostics Workbench State
  const [diagType, setDiagType] = useState<'ping' | 'traceroute' | 'dns' | 'speedtest'>('ping');
  const [diagHost, setDiagHost] = useState('8.8.8.8');
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagResult, setDiagResult] = useState<any | null>(null);

  // Discovery Search
  const [discoverySearch, setDiscoverySearch] = useState('');

  // Actions Confirmation Modal
  const [actionConfirm, setActionConfirm] = useState<{ action: string; label: string; danger: boolean } | null>(null);
  const [actionExecuting, setActionExecuting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Custom RPC runner
  const [rpcSelected, setRpcSelected] = useState('GetParameterValues');
  const [rpcParam, setRpcParam] = useState('Device.DeviceInfo.Manufacturer');
  const [rpcRunning, setRpcRunning] = useState(false);
  const [rpcOutput, setRpcOutput] = useState<string | null>(null);

  // Connected Clients Inventory state
  const [isRefreshingClients, setIsRefreshingClients] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientFilterBand, setClientFilterBand] = useState('ALL');
  const [clientCopiedIp, setClientCopiedIp] = useState<string | null>(null);

  const handleRefreshClients = async () => {
    if (!id) return;
    setIsRefreshingClients(true);
    try {
      await api.post(`/operator/devices/${id}/connected-clients/refresh`);
      await fetchWorkspace(id);
    } catch (_) {}
    setIsRefreshingClients(false);
  };

  const fetchWorkspace = async (targetId?: string | any) => {
    let resolvedId: string | null = null;
    if (typeof targetId === 'string' && targetId && targetId !== '[object Object]' && !targetId.includes('[object')) {
      resolvedId = targetId.trim();
    } else if (typeof id === 'string' && id && id !== '[object Object]' && !id.includes('[object')) {
      resolvedId = id.trim();
    }

    if (!resolvedId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/operator/devices/${encodeURIComponent(resolvedId)}/workspace`);
      if (res.success && res.workspace) {
        setWorkspace(res.workspace);
      } else {
        setError(res.error || 'Failed to load device workspace');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching device workspace');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Reset all device-specific state immediately when route id changes to prevent cross-device leakage
    setWorkspace(null);
    setShow24Password(false);
    setShow5gPassword(false);
    setRpcOutput(null);
    setDiagResult(null);
    if (id) {
      fetchWorkspace(id);
      // Auto-refresh telemetry & status every 5 minutes
      const pollInterval = setInterval(() => {
        fetchWorkspace(id);
      }, 5 * 60 * 1000);
      return () => clearInterval(pollInterval);
    }
  }, [id]);

  const handleRefreshTelemetry = async () => {
    if (!id) return;
    setIsRefreshing(true);
    try {
      await api.post(`/operator/devices/${id}/refresh-telemetry`);
      await fetchWorkspace(id);
    } catch (_) {}
    setIsRefreshing(false);
  };

  const handleOpenEditConfig = () => {
    if (!workspace) return;
    setConfigError(null);
    setConfigSuccess(null);
    setConfigForm({
      wifi24Ssid: workspace.wifi?.band24?.ssid !== 'Not configured' ? workspace.wifi?.band24?.ssid : '',
      wifi24Password: '',
      wifi24Channel: workspace.wifi?.band24?.channel || 6,
      wifi24Enabled: workspace.wifi?.band24?.status === 'Active',
      wifi5gSsid: workspace.wifi?.band5g?.ssid !== 'Not configured' ? workspace.wifi?.band5g?.ssid : '',
      wifi5gPassword: '',
      wifi5gChannel: workspace.wifi?.band5g?.channel || 44,
      wifi5gEnabled: workspace.wifi?.band5g?.status === 'Active',
      pppoeUsername: workspace.wan?.pppoeUsername !== 'N/A' ? workspace.wan?.pppoeUsername : '',
      pppoePassword: '',
      vlanId: workspace.wan?.vlanId || 100,
    });
    setIsConfigOpen(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
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

      const res = await api.put(`/operator/devices/${id}/configuration`, payload);

      if (res.success) {
        setConfigSuccess('Parameters successfully dispatched and verified on device parameter tree.');
        setTimeout(async () => {
          setIsConfigOpen(false);
          fetchWorkspace();
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

  const handleRunDiagnostic = async () => {
    if (!id) return;
    setDiagRunning(true);
    setDiagResult(null);
    try {
      const res = await api.post(`/operator/devices/${id}/diagnostics/run`, {
        type: diagType,
        targetHost: diagHost,
      });
      if (res.success) {
        setDiagResult(res.diagnostic);
        fetchWorkspace();
      }
    } catch (err: any) {
      setDiagResult({ error: err.message });
    } finally {
      setDiagRunning(false);
    }
  };

  const handleExecuteAction = async () => {
    if (!id || !actionConfirm) return;
    setActionExecuting(true);
    setActionMessage(null);
    try {
      const res = await api.post(`/operator/devices/${id}/actions/${actionConfirm.action}`);
      if (res.success) {
        setActionMessage(res.message);
        setTimeout(() => {
          setActionConfirm(null);
          setActionMessage(null);
          fetchWorkspace();
        }, 1800);
      }
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setActionExecuting(false);
    }
  };

  const handleRunRpc = async () => {
    if (!id) return;
    setRpcRunning(true);
    setRpcOutput(null);
    try {
      const res = await api.post(`/operator/devices/${id}/rpc`, {
        rpcName: rpcSelected,
        params: { path: rpcParam },
      });
      if (res.success) {
        setRpcOutput(JSON.stringify(res.result, null, 2));
      }
    } catch (err: any) {
      setRpcOutput(`RPC Error: ${err.message}`);
    } finally {
      setRpcRunning(false);
    }
  };

  // Site Survey Scan State
  const [surveyScanning, setSurveyScanning] = useState(false);
  const [surveyMessage, setSurveyMessage] = useState<string | null>(null);

  // Summon State
  const [isSummoning, setIsSummoning] = useState(false);
  const [summonSuccess, setSummonSuccess] = useState<string | null>(null);

  // Delete Device Modal State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Wi-Fi Management System State
  const [wifiCopied, setWifiCopied] = useState<'24' | '5g' | null>(null);
  const [isWlanModalOpen, setIsWlanModalOpen] = useState(false);
  const [wlanModalMode, setWlanModalMode] = useState<'create' | 'edit'>('create');
  const [wlanInstance, setWlanInstance] = useState<number | null>(null);
  const [wlanSsid, setWlanSsid] = useState('');
  const [wlanBand, setWlanBand] = useState<'2.4GHz' | '5GHz'>('2.4GHz');
  const [wlanSecurity, setWlanSecurity] = useState('WPA2-PSK');
  const [wlanPassword, setWlanPassword] = useState('');
  const [showWlanModalPassword, setShowWlanModalPassword] = useState(false);
  const [wlanChannel, setWlanChannel] = useState('0');
  const [wlanWidth, setWlanWidth] = useState('20');
  const [wlanEnabled, setWlanEnabled] = useState(true);
  const [isSavingWlan, setIsSavingWlan] = useState(false);
  const [wlanModalError, setWlanModalError] = useState<string | null>(null);
  const [wlanModalSuccess, setWlanModalSuccess] = useState<string | null>(null);
  const [deleteSsidConfirm, setDeleteSsidConfirm] = useState<{ instance: number; ssid: string } | null>(null);
  const [isDeletingSsid, setIsDeletingSsid] = useState(false);

  const handleOpenAddSsid = () => {
    setWlanModalMode('create');
    setWlanInstance(null);
    setWlanSsid('');
    setWlanBand('2.4GHz');
    setWlanSecurity('WPA2-PSK');
    setWlanPassword('');
    setShowWlanModalPassword(false);
    setWlanChannel('0');
    setWlanWidth('20');
    setWlanEnabled(true);
    setWlanModalError(null);
    setWlanModalSuccess(null);
    setIsWlanModalOpen(true);
  };

  const handleOpenEditSsid = (iface: any) => {
    setWlanModalMode('edit');
    setWlanInstance(iface.instance);
    setWlanSsid(iface.ssid || '');
    setWlanBand(iface.band === '5GHz' ? '5GHz' : '2.4GHz');
    setWlanSecurity(iface.security || 'WPA2-PSK');
    setWlanPassword('');
    setShowWlanModalPassword(false);
    setWlanChannel(String(iface.channel != null ? iface.channel : '0'));
    setWlanWidth(iface.band === '5GHz' ? '80' : '20');
    setWlanEnabled(iface.status !== 'Disabled');
    setWlanModalError(null);
    setWlanModalSuccess(null);
    setIsWlanModalOpen(true);
  };

  const handleDuplicateSsid = (iface: any) => {
    setWlanModalMode('create');
    setWlanInstance(null);
    setWlanSsid(`${iface.ssid}_Guest`);
    setWlanBand(iface.band === '5GHz' ? '5GHz' : '2.4GHz');
    setWlanSecurity(iface.security || 'WPA2-PSK');
    setWlanPassword('');
    setShowWlanModalPassword(false);
    setWlanChannel(String(iface.channel != null ? iface.channel : '0'));
    setWlanWidth(iface.band === '5GHz' ? '80' : '20');
    setWlanEnabled(true);
    setWlanModalError(null);
    setWlanModalSuccess(null);
    setIsWlanModalOpen(true);
  };

  const handleSaveWlanModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSavingWlan(true);
    setWlanModalError(null);
    setWlanModalSuccess(null);

    try {
      let res: any;
      if (wlanModalMode === 'create') {
        // Create a new separate SSID without overwriting existing SSIDs
        res = await api.post(`/operator/devices/${id}/wifi/ssid`, {
          ssid: wlanSsid,
          band: wlanBand,
          password: wlanPassword || undefined,
          channel: Number(wlanChannel) || (wlanBand === '5GHz' ? 44 : 6),
          enabled: wlanEnabled,
          bandwidthMhz: Number(wlanWidth) || (wlanBand === '5GHz' ? 80 : 20),
          securityMode: wlanSecurity,
        });
      } else {
        // Editing an existing SSID
        const payload: any = {};
        if (wlanInstance === 1) {
          payload.wifi24 = {
            ssid: wlanSsid,
            channel: Number(wlanChannel) || 6,
            enabled: wlanEnabled,
            bandwidthMhz: Number(wlanWidth) || 20,
            securityMode: wlanSecurity,
          };
          if (wlanPassword) payload.wifi24.password = wlanPassword;
        } else if (wlanInstance === 2 || wlanInstance === 5) {
          payload.wifi5g = {
            ssid: wlanSsid,
            channel: Number(wlanChannel) || 44,
            enabled: wlanEnabled,
            bandwidthMhz: Number(wlanWidth) || 80,
            securityMode: wlanSecurity,
          };
          if (wlanPassword) payload.wifi5g.password = wlanPassword;
        } else {
          payload.ssidInstance = wlanInstance;
          payload.customSsid = {
            ssid: wlanSsid,
            channel: Number(wlanChannel) || (wlanBand === '5GHz' ? 44 : 6),
            enabled: wlanEnabled,
            bandwidthMhz: Number(wlanWidth) || (wlanBand === '5GHz' ? 80 : 20),
            securityMode: wlanSecurity,
          };
          if (wlanPassword) payload.customSsid.password = wlanPassword;
        }
        res = await api.put(`/operator/devices/${id}/configuration`, payload);
      }

      if (res.success) {
        setWlanModalSuccess(`SSID [${wlanSsid}] successfully saved and committed to ONT.`);
        setTimeout(async () => {
          setIsWlanModalOpen(false);
          await fetchWorkspace();
        }, 1000);
      } else {
        setWlanModalError(res.error || 'Failed to save SSID configuration.');
      }
    } catch (err: any) {
      setWlanModalError(err.message || 'Error occurred while saving SSID.');
    } finally {
      setIsSavingWlan(false);
    }
  };

  const handleDeleteSsid = async () => {
    if (!id || !deleteSsidConfirm) return;
    setIsDeletingSsid(true);
    try {
      const inst = deleteSsidConfirm.instance;
      if (inst === 1 || inst === 2 || inst === 5) {
        const payload: any = (inst === 2 || inst === 5)
          ? { wifi5g: { enabled: false } }
          : { wifi24: { enabled: false } };
        await api.put(`/operator/devices/${id}/configuration`, payload);
      } else {
        await api.delete(`/operator/devices/${id}/wifi/ssid/${inst}`);
      }
      setDeleteSsidConfirm(null);
      await fetchWorkspace();
    } catch (_) {}
    setIsDeletingSsid(false);
  };

  // WAN Profile Management System State
  const [wanModalMode, setWanModalMode] = useState<'create' | 'edit'>('edit');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isSavingWanProfile, setIsSavingWanProfile] = useState(false);
  const [wanProfileSuccessMsg, setWanProfileSuccessMsg] = useState<string | null>(null);
  const [wanProfileErrorMsg, setWanProfileErrorMsg] = useState<string | null>(null);
  const [deleteProfileConfirm, setDeleteProfileConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const [isCommittingProfile, setIsCommittingProfile] = useState<string | null>(null);
  const [showWanPassword, setShowWanPassword] = useState(false);
  const [showTelemetryPassword, setShowTelemetryPassword] = useState(false);

  // Form Fields State (Accurately Preserving every field)
  const [pName, setPName] = useState('');
  const [pConnectionType, setPConnectionType] = useState<'PPPoE' | 'IPoE_DHCP' | 'Static' | 'Bridge'>('PPPoE');
  const [pPppoeUser, setPPppoeUser] = useState('');
  const [pPppoePass, setPPppoePass] = useState('');
  const [pMtu, setPMtu] = useState('1492');
  const [pVlanEnabled, setPVlanEnabled] = useState(true);
  const [pVlanId, setPVlanId] = useState('100');
  const [pVlanPriority, setPVlanPriority] = useState('0');
  const [pNatEnabled, setPNatEnabled] = useState(true);
  const [pFirewallEnabled, setPFirewallEnabled] = useState(true);
  
  // Service Usage State
  const [pServiceUsage, setPServiceUsage] = useState({
    internet: true,
    voip: false,
    tr069: false,
    iptvDhcp: false,
    iptvBridge: false,
    other: false,
  });

  // Port & SSID Bindings State
  const [pWanPorts, setPWanPorts] = useState<string[]>(['WAN1']);
  const [pLanPorts, setPLanPorts] = useState<string[]>(['LAN1', 'LAN2', 'LAN3', 'LAN4']);
  const [pSsidBindings, setPSsidBindings] = useState<string[]>(['2.4GHz SSID-1', '5GHz SSID-1']);

  const getServiceUsageSummary = (prof: any): string => {
    const su = prof.serviceUsage;
    if (!su) return prof.serviceType || 'Internet';
    const list: string[] = [];
    if (su.internet) list.push('Internet');
    if (su.voip) list.push('VoIP');
    if (su.tr069) list.push('TR-069 (ACS)');
    if (su.iptvDhcp) list.push('IPTV (DHCP)');
    if (su.iptvBridge) list.push('IPTV (Bridge)');
    if (su.other) list.push('Other');
    return list.length > 0 ? list.join(', ') : (prof.serviceType || 'Internet');
  };

  const handleOpenAddProfile = () => {
    setWanModalMode('create');
    setSelectedProfileId(null);
    setPName(`INTERNET_WAN_${(workspace?.wan?.profiles?.length || 0) + 1}`);
    setPConnectionType('PPPoE');
    setPPppoeUser('');
    setPPppoePass('');
    setPMtu('1492');
    setPVlanEnabled(true);
    setPVlanId('100');
    setPVlanPriority('0');
    setPNatEnabled(true);
    setPFirewallEnabled(true);
    setPServiceUsage({
      internet: true,
      voip: false,
      tr069: false,
      iptvDhcp: false,
      iptvBridge: false,
      other: false,
    });
    setPWanPorts(['WAN1']);
    setPLanPorts(['LAN1', 'LAN2', 'LAN3', 'LAN4']);
    setPSsidBindings(['2.4GHz SSID-1', '5GHz SSID-1']);
    setShowWanPassword(false);
    setWanProfileErrorMsg(null);
    const formEl = document.getElementById('wan-profile-editor-card');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpenEditProfile = async (profile: any) => {
    setWanModalMode('edit');
    setSelectedProfileId(profile._id || String(profile.index));
    setWanProfileErrorMsg(null);
    
    // Fetch latest fresh profile from backend to ensure 100% saved accuracy
    try {
      if (id && profile._id) {
        const res = await api.getWanProfile(id, profile._id);
        if (res.success && res.profile) {
          profile = res.profile;
        }
      }
    } catch (_) {}

    // Populate every field from saved state without default overrides
    setPName(profile.name || 'WAN_Profile');
    setPConnectionType(profile.connectionType || 'PPPoE');
    setPPppoeUser(profile.pppoeUsername || '');
    setPPppoePass(''); // Blank preserves existing secret
    setPMtu(String(profile.mtu || 1492));
    setPVlanEnabled(profile.vlanEnabled !== undefined ? profile.vlanEnabled : true);
    setPVlanId(String(profile.vlanId !== undefined ? profile.vlanId : 100));
    setPVlanPriority(String(profile.vlanPriority8021p !== undefined ? profile.vlanPriority8021p : 0));
    setPNatEnabled(profile.natEnabled !== undefined ? profile.natEnabled : true);
    setPFirewallEnabled(profile.firewallEnabled !== undefined ? profile.firewallEnabled : true);
    
    // Restore exact Service Usage checkboxes
    setPServiceUsage({
      internet: profile.serviceUsage?.internet ?? (profile.serviceType === 'INTERNET' || !profile.serviceType),
      voip: profile.serviceUsage?.voip ?? (profile.serviceType === 'VOIP'),
      tr069: profile.serviceUsage?.tr069 ?? (profile.serviceType === 'TR069'),
      iptvDhcp: profile.serviceUsage?.iptvDhcp ?? (profile.serviceType === 'IPTV'),
      iptvBridge: profile.serviceUsage?.iptvBridge ?? false,
      other: profile.serviceUsage?.other ?? false,
    });

    // Restore exact Port & SSID Bindings
    setPWanPorts(Array.isArray(profile.wanPortBindings) && profile.wanPortBindings.length > 0 ? profile.wanPortBindings : ['WAN1']);
    setPLanPorts(Array.isArray(profile.lanPortBindings) && profile.lanPortBindings.length > 0 ? profile.lanPortBindings : ['LAN1', 'LAN2', 'LAN3', 'LAN4']);
    setPSsidBindings(Array.isArray(profile.ssidBindings) && profile.ssidBindings.length > 0 ? profile.ssidBindings : ['2.4GHz SSID-1', '5GHz SSID-1']);
    setShowWanPassword(false);
    const formEl = document.getElementById('wan-profile-editor-card');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (workspace?.wan?.profiles?.length > 0 && !selectedProfileId && wanModalMode !== 'create') {
      handleOpenEditProfile(workspace.wan.profiles[0]);
    }
  }, [workspace]);

  const handleDuplicateProfile = async (profile: any) => {
    if (!id) return;
    try {
      const pId = profile._id || String(profile.index);
      const res = await api.duplicateWanProfile(id, pId);
      if (res.success && res.profile) {
        setWanProfileSuccessMsg(`✅ Succeeded: Profile duplicated as [${res.profile.name}]. Opening in edit mode.`);
        await fetchWorkspace();
        handleOpenEditProfile(res.profile);
      } else {
        setWanProfileErrorMsg(`❌ Duplicate failed: ${res.error || res.message}`);
      }
    } catch (err: any) {
      setWanProfileErrorMsg(`❌ Duplicate error: ${err.message}`);
    }
  };

  const handleDeleteProfile = async () => {
    if (!id || !deleteProfileConfirm) return;
    setIsDeletingProfile(true);
    try {
      const res = await api.deleteWanProfile(id, deleteProfileConfirm.id);
      if (res.success) {
        setWanProfileSuccessMsg(`✅ Succeeded: Profile [${deleteProfileConfirm.name}] deleted.`);
        setDeleteProfileConfirm(null);
        await fetchWorkspace();
        setTimeout(() => setWanProfileSuccessMsg(null), 5000);
      } else {
        setWanProfileErrorMsg(`❌ Delete failed: ${res.error || res.message}`);
      }
    } catch (err: any) {
      setWanProfileErrorMsg(`❌ Delete error: ${err.message}`);
    } finally {
      setIsDeletingProfile(false);
    }
  };

  const handleCommitProfile = async (profile: any) => {
    if (!id) return;
    const pId = profile._id || String(profile.index);
    setIsCommittingProfile(pId);
    try {
      const res = await api.commitWanProfile(id, pId);
      if (res.success) {
        setWanProfileSuccessMsg(`✅ Succeeded: Profile [${profile.name}] committed to physical ONT via TR-069.`);
        await fetchWorkspace();
        setTimeout(() => setWanProfileSuccessMsg(null), 6000);
      } else {
        setWanProfileErrorMsg(`❌ Commit failed: ${res.error || res.message}`);
      }
    } catch (err: any) {
      setWanProfileErrorMsg(`❌ Commit error: ${err.message}`);
    } finally {
      setIsCommittingProfile(null);
    }
  };

  const handleSaveProfileForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!pName.trim()) {
      setWanProfileErrorMsg('Profile name is required.');
      return;
    }
    if (pVlanEnabled) {
      const v = parseInt(pVlanId, 10);
      if (isNaN(v) || v < 1 || v > 4094) {
        setWanProfileErrorMsg('VLAN ID must be an integer between 1 and 4094.');
        return;
      }
    }
    if (pWanPorts.length === 0) {
      setWanProfileErrorMsg('Please select at least one WAN port binding (e.g. WAN1).');
      return;
    }

    setIsSavingWanProfile(true);
    setWanProfileErrorMsg(null);

    const payload: any = {
      name: pName.trim(),
      connectionType: pConnectionType,
      serviceUsage: pServiceUsage,
      vlanEnabled: pVlanEnabled,
      vlanId: pVlanEnabled ? parseInt(pVlanId, 10) : 0,
      vlanPriority8021p: pVlanEnabled ? parseInt(pVlanPriority, 10) : 0,
      mtu: parseInt(pMtu, 10) || 1492,
      natEnabled: pNatEnabled,
      firewallEnabled: pFirewallEnabled,
      wanPortBindings: pWanPorts,
      lanPortBindings: pLanPorts,
      ssidBindings: pSsidBindings,
      pppoeUsername: pPppoeUser.trim(),
    };

    if (pPppoePass) {
      payload.pppoePassword = pPppoePass;
    }

    try {
      let res: any;
      if (wanModalMode === 'create') {
        res = await api.createWanProfile(id, payload);
      } else if (selectedProfileId) {
        res = await api.updateWanProfile(id, selectedProfileId, payload);
      }

      if (res && res.success) {
        setWanProfileSuccessMsg(`✅ Succeeded: Profile [${pName}] ${wanModalMode === 'create' ? 'created' : 'updated'} and committed to TR-069.`);
        await fetchWorkspace();
        if (res.profile) {
          handleOpenEditProfile(res.profile);
        }
        setTimeout(() => setWanProfileSuccessMsg(null), 6000);
      } else {
        setWanProfileErrorMsg(`❌ Error: ${res?.error || res?.message || 'Failed to save WAN profile'}`);
      }
    } catch (err: any) {
      setWanProfileErrorMsg(`❌ Error: ${err.message}`);
    } finally {
      setIsSavingWanProfile(false);
    }
  };

  const handleSummonDevice = async () => {
    if (!id) return;
    setIsSummoning(true);
    setSummonSuccess(null);
    const startTimestamp = performance.now();
    try {
      const res = await api.summonDevice(id);
      const elapsedMs = Math.round(performance.now() - startTimestamp);
      const elapsedSec = (elapsedMs / 1000).toFixed(2);
      if (res.success) {
        setSummonSuccess(`✅ Succeeded: ONT Summoned & Synchronized in ${elapsedSec}s (${elapsedMs} ms) at ${new Date().toLocaleTimeString()}`);
        await fetchWorkspace();
        setTimeout(() => setSummonSuccess(null), 6000);
      } else {
        setSummonSuccess(`❌ Failed: ${res.error || res.message || 'CPE Connection Request unreachable / timed out'}`);
        setTimeout(() => setSummonSuccess(null), 8000);
      }
    } catch (err: any) {
      setSummonSuccess(`❌ Failed: ${err.message}`);
      setTimeout(() => setSummonSuccess(null), 8000);
    } finally {
      setIsSummoning(false);
    }
  };

  // Fetch Parameters State
  const [isFetchingParams, setIsFetchingParams] = useState(false);
  const [fetchParamsMsg, setFetchParamsMsg] = useState<string | null>(null);

  const handleFetchParameters = async () => {
    if (!id) return;
    setIsFetchingParams(true);
    setFetchParamsMsg(null);
    const start = performance.now();
    try {
      const summonRes = await api.summonDevice(id);
      const refreshRes = await api.post(`/operator/devices/${id}/refresh-telemetry`);
      const elapsedMs = Math.round(performance.now() - start);
      const elapsedSec = (elapsedMs / 1000).toFixed(2);
      if (summonRes.success || refreshRes.success) {
        setFetchParamsMsg(`✅ Succeeded: Router parameters fetched and synchronized in ${elapsedSec}s (${elapsedMs} ms) via TR-069!`);
        await fetchWorkspace();
        setTimeout(() => setFetchParamsMsg(null), 5000);
      } else {
        setFetchParamsMsg(`❌ Failed: ${summonRes.error || refreshRes.error || 'Failed to fetch parameters'}`);
      }
    } catch (err: any) {
      setFetchParamsMsg(`❌ Failed: ${err.message}`);
    } finally {
      setIsFetchingParams(false);
    }
  };

  const handleScanNeighborWiFi = async () => {
    if (!id) return;
    setSurveyScanning(true);
    setSurveyMessage(null);
    try {
      const res = await api.scanNeighborWiFi(id);
      if (res.success) {
        setSurveyMessage('RF Neighbor Wi-Fi survey completed and updated.');
        await fetchWorkspace();
        setTimeout(() => setSurveyMessage(null), 3000);
      }
    } catch (err: any) {
      setSurveyMessage(`Scan error: ${err.message}`);
    } finally {
      setSurveyScanning(false);
    }
  };

  const handleDeleteDevice = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteDevice(id);
      if (res.success) {
        navigate('/operator/devices');
      }
    } catch (_) {}
    setIsDeleting(false);
  };

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'analysis', label: 'Overview', icon: Home },
    { key: 'wifi', label: 'Wi-Fi', icon: Wifi },
    { key: 'wan', label: 'WAN & PPPoE', icon: Globe },
    { key: 'connected', label: 'Connected Devices', icon: Monitor },
    { key: 'survey', label: 'Site Survey', icon: Compass },
    { key: 'diagnostics', label: 'Diagnostic', icon: Zap },
    { key: 'actions', label: 'Actions', icon: Sliders },
    { key: 'ports', label: 'Ports', icon: Network },
    { key: 'logs', label: 'Logs', icon: FileText },
    { key: 'location', label: 'Location', icon: MapPin },
    { key: 'history', label: 'History', icon: History },
    { key: 'discovery', label: 'Discovery', icon: Search },
    { key: 'rpc', label: 'Custom RPCs', icon: Terminal },
    { key: 'audit', label: 'Audit Trails', icon: Shield },
    { key: 'queue', label: 'Queue', icon: ListOrdered },
  ];

  return (
    <Shell
      portalType="operator"
      title="ACS / USP Device Management Console"
      breadcrumbs={[
        { label: 'ONT Fleet', href: '/operator/devices' },
        { label: workspace?.header?.serialNumber || 'Device Workspace' },
      ]}
    >
      <StateWrapper isLoading={isLoading} error={error} onRetry={fetchWorkspace}>
        {workspace && (
          <div className="space-y-5">
            {/* Top Back Navigation & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 border border-[#CBD5E1] rounded-2xl shadow-xs">
              <div className="flex items-center space-x-3.5">
                <button
                  onClick={() => navigate('/operator/devices')}
                  className="p-2 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] transition"
                  title="Back to ONT Fleet"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h2 className="text-lg font-bold text-[#0F172A] font-mono tracking-tight">{workspace.header.serialNumber}</h2>
                    <Badge variant={workspace.header.status === 'online' ? 'success' : 'danger'} dot>
                      {workspace.header.status === 'online' ? 'ONLINE' : 'OFFLINE'}
                    </Badge>
                    <Badge variant={workspace.header.protocol.includes('TR-369') ? 'purple' : 'info'}>
                      {workspace.header.protocol}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#475569] font-medium mt-0.5">
                    {workspace.header.vendor} {workspace.header.model} | FW: <span className="font-mono text-[#0F172A] font-semibold">{workspace.header.firmwareVersion}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 flex-wrap">
                <Button size="sm" variant="primary" onClick={handleSummonDevice} isLoading={isSummoning} className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
                  <Zap className="w-4 h-4 mr-1.5" />
                  <span>Summon / Live Poll</span>
                </Button>
                <Button size="sm" variant="primary" onClick={handleFetchParameters} isLoading={isFetchingParams} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold" title="Fetch all live parameters and optical power from router via TR-069">
                  <Cpu className="w-4 h-4 mr-1.5" />
                  <span>Fetch Parameters</span>
                </Button>
                <Button size="sm" variant="outline" onClick={handleRefreshTelemetry} isLoading={isRefreshing}>
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  <span>Refresh Telemetry</span>
                </Button>
                <Button size="sm" variant="secondary" onClick={handleOpenEditConfig}>
                  <Edit3 className="w-4 h-4 mr-1.5" />
                  <span>Edit Config</span>
                </Button>
                <Button size="sm" variant="danger" onClick={() => setDeleteConfirmOpen(true)}>
                  <Power className="w-4 h-4 mr-1.5" />
                  <span>Delete ONT</span>
                </Button>
              </div>
            </div>

            {summonSuccess && (
              <div className="p-3.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-xs font-bold text-[#065F46] flex items-center space-x-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0" />
                <span>{summonSuccess}</span>
              </div>
            )}

            {fetchParamsMsg && (
              <div className="p-3.5 bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl text-xs font-bold text-[#3730A3] flex items-center space-x-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-[#4F46E5] shrink-0" />
                <span>{fetchParamsMsg}</span>
              </div>
            )}

            {/* Oktopus-style Coral/Orange Top Horizontal Navigation Tabs */}
            <div className="border-b border-[#E2E8F0] flex space-x-4 overflow-x-auto pb-0.5 scrollbar-thin">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center space-x-1.5 pb-2.5 pt-1 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                    activeTab === key
                      ? 'border-[#E05638] text-[#E05638] font-bold'
                      : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
                  }`}
                >
                  <span className="capitalize">{label}</span>
                  <Icon className={`w-3.5 h-3.5 ${activeTab === key ? 'text-[#E05638]' : 'text-[#64748B]'}`} />
                </button>
              ))}
            </div>

            {/* TAB CONTENT 1: ANALYSIS */}
            {activeTab === 'analysis' && (
              <div className="space-y-5">
                {/* 1. Device Information Card (With Left ONT Graphic) */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-[#0F172A] mb-5">
                    Device Information
                  </h3>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
                    {/* Left ONT Hardware Graphic */}
                    <div className="lg:col-span-1 flex justify-center">
                      <ModelSpecificOntGraphic
                        model={workspace.header.model}
                        vendor={workspace.header.vendor}
                        serialNumber={workspace.header.serialNumber}
                        isOnline={workspace.header.status === 'online'}
                      />
                    </div>

                    {/* Right Metadata Grid */}
                    <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6 text-xs">
                      <div>
                        <span className="text-[#64748B] block mb-0.5">Serial Number</span>
                        <span className="font-mono font-bold text-[#0F172A] text-sm">{workspace.header.serialNumber}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block mb-0.5">Model</span>
                        <span className="font-semibold text-[#1E293B]">{workspace.header.model}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block mb-0.5">Vendor</span>
                        <span className="font-semibold text-[#1E293B]">{workspace.header.vendor}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block mb-0.5">Firmware Version</span>
                        <span className="font-mono text-[#1E293B]">{workspace.header.firmwareVersion}</span>
                      </div>

                      <div>
                        <span className="text-[#64748B] block mb-0.5">WAN IP</span>
                        <span className="font-mono font-bold text-[#1677FF]">{workspace.header.wanIp}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block mb-0.5">WAN MAC</span>
                        <span className="font-mono text-[#334155]">{workspace.header.wanMac}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block mb-0.5">Data Model</span>
                        <span className="font-mono text-[#5B21B6]">{workspace.header.dataModel}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block mb-0.5">Uptime</span>
                        <span className="font-mono text-[#334155]">{workspace.header.uptime}</span>
                      </div>

                      <div>
                        <span className="text-[#64748B] block mb-1">Quality</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                          {workspace.header?.quality || 'Good'}
                        </span>
                      </div>
                      <div className="sm:col-span-3">
                        <span className="text-[#64748B] block mb-0.5">Last Seen</span>
                        <span className="font-mono text-[#334155]">
                          {workspace.header?.lastSeen ? new Date(workspace.header.lastSeen).toLocaleString() : 'Just now'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Quality Ratings Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-[#0F172A] mb-5">
                    Quality Ratings
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
                    {/* Overall Circular Gauge */}
                    <div className="md:col-span-1 flex justify-center">
                      <CircularGauge score={workspace.ratings?.overallScore ?? 100} quality={workspace.header?.quality ?? 'Good'} />
                    </div>

                    {/* Horizontal Progress Bars */}
                    <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#334155] font-medium">Ping Health Score</span>
                          <span className="font-mono font-bold text-[#0F172A]">{workspace.ratings?.pingHealth || '100%'}</span>
                        </div>
                        <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }}></div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#334155] font-medium">Signal Health Score</span>
                          <span className="font-mono font-bold text-[#0F172A]">{workspace.ratings?.signalHealth || '100%'}</span>
                        </div>
                        <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${workspace.ratings?.overallScore || 100}%` }}></div>
                        </div>
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#334155] font-medium">Hardware Health Score</span>
                          <span className="font-mono font-bold text-[#0F172A]">{workspace.ratings?.hardwareHealth || '100%'}</span>
                        </div>
                        <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Hardware Metrics & Average Ping Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#334155] flex items-center space-x-2">
                      <Cpu className="w-4 h-4 text-[#6D28D9]" />
                      <span>Hardware Metrics</span>
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                        <span className="text-[11px] text-[#64748B] block">CPU Usage</span>
                        <span className="text-base font-mono font-bold text-[#1677FF] mt-0.5 block">
                          {workspace.hardware?.cpuUsagePercent != null ? `${workspace.hardware.cpuUsagePercent}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                        <span className="text-[11px] text-[#64748B] block">RAM Usage</span>
                        <span className="text-base font-mono font-bold text-[#6D28D9] mt-0.5 block">
                          {workspace.hardware?.memoryUsagePercent != null ? `${workspace.hardware.memoryUsagePercent}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                        <span className="text-[11px] text-[#64748B] block">Board Temp</span>
                        <span className="text-base font-mono font-bold text-[#1E293B] mt-0.5 block">
                          {workspace.hardware?.temperatureC != null ? `${workspace.hardware.temperatureC} °C` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#334155] flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-[#1677FF]" />
                      <span>Diagnostics & Latency</span>
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                        <span className="text-[11px] text-[#64748B] block">ICMP Latency</span>
                        <span className="text-base font-mono font-bold text-[#047857] mt-0.5 block">
                          {workspace.diagnostics?.[0]?.latencyAvgMs != null ? `${workspace.diagnostics[0].latencyAvgMs} ms` : 'Not Measured'}
                        </span>
                      </div>
                      <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                        <span className="text-[11px] text-[#64748B] block">Last Result</span>
                        <span className="text-base font-mono font-bold text-[#1677FF] mt-0.5 block">
                          {workspace.diagnostics?.[0]?.success != null ? (workspace.diagnostics[0].success ? 'PASS' : 'FAIL') : 'No Run'}
                        </span>
                      </div>
                      <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                        <span className="text-[11px] text-[#64748B] block">Packet Loss</span>
                        <span className="text-base font-mono font-bold text-[#047857] mt-0.5 block">
                          {workspace.diagnostics?.[0]?.success != null ? '0.0%' : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Optical Telemetry Panel */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
                    <div className="flex items-center space-x-2">
                      <Signal className="w-4 h-4 text-[#047857]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">Live Optical Telemetry</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      {workspace.optical?.deltaDbm != null && (
                        <Badge variant={workspace.optical.deltaDbm > 0 ? 'success' : workspace.optical.deltaDbm < 0 ? 'warning' : 'neutral'}>
                          {workspace.optical.deltaDbm > 0 ? `+${workspace.optical.deltaDbm}` : workspace.optical.deltaDbm} dBm
                          {workspace.optical.deltaDbm > 0 ? ' ↑ (Improved)' : workspace.optical.deltaDbm < 0 ? ' ↓ (Degraded)' : ' → (Stable)'}
                        </Badge>
                      )}
                      <Badge variant="neutral">Source: {workspace.optical?.source || 'Physical CPE'}</Badge>
                      <span className="text-xs text-[#64748B]">
                        Updated: <span className="font-mono text-[#1E293B]">{workspace.optical?.lastUpdated ? new Date(workspace.optical.lastUpdated).toLocaleTimeString() : 'Just now'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'RX Optical Power', value: workspace.optical?.rxPowerDbm, unit: 'dBm', color: 'text-[#047857]' },
                      { label: 'TX Optical Power', value: workspace.optical?.txPowerDbm, unit: 'dBm', color: 'text-[#1677FF]' },
                      { label: 'Bias Current', value: workspace.optical?.biasCurrentMa, unit: 'mA', color: 'text-[#B45309]' },
                      { label: 'Optical Voltage', value: workspace.optical?.opticalVoltageV, unit: 'V', color: 'text-[#5B21B6]' },
                    ].map(({ label, value, unit, color }) => (
                      <div key={label} className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                        <span className="text-[11px] text-[#64748B] block">{label}:</span>
                        {value != null ? (
                          <div className="mt-1">
                            <span className={`text-xl font-mono font-bold ${color}`}>{value}</span>
                            <span className="text-xs text-[#64748B] ml-1">{unit}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#94A3B8] italic mt-1 block">Not available</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Optical History Timeline */}
                  <div className="pt-2">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-semibold text-[#334155]">RX Power Attenuation History Timeline</span>
                      <div className="flex space-x-1">
                        {(['1h', '6h', '24h', '7d', '30d'] as const).map((tf) => (
                          <button
                            key={tf}
                            onClick={() => setHistoryFilter(tf)}
                            className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                              historyFilter === tf ? 'bg-[#E05638] text-white font-bold' : 'bg-[#F1F5F9] text-[#64748B] hover:text-white'
                            }`}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                    </div>

                    {workspace.optical.history && workspace.optical.history.length > 0 ? (
                      <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2">
                        <div className="flex justify-between text-[11px] text-[#64748B] font-mono pb-2 border-b border-[#E2E8F0]">
                          <span>Timestamp</span>
                          <span>RX Power (dBm)</span>
                          <span>TX Power (dBm)</span>
                          <span>Temperature (°C)</span>
                        </div>
                        {workspace.optical.history.slice(-5).map((rec: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs font-mono text-[#334155]">
                            <span className="text-[#64748B]">{new Date(rec.timestamp).toLocaleTimeString()}</span>
                            <span className="text-[#047857] font-bold">{rec.valueDbm} dBm</span>
                            <span className="text-[#1677FF]">{rec.txPowerDbm != null ? `${rec.txPowerDbm} dBm` : '-'}</span>
                            <span className="text-[#334155]">{rec.temperatureC != null ? `${rec.temperatureC} °C` : '-'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 bg-[#F8FAFC] rounded-xl text-center text-xs text-[#94A3B8] italic">
                        No historical telemetry points stored yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: WI-FI */}
            {activeTab === 'wifi' && (
              <div className="space-y-6">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div>
                    <h2 className="text-xl font-bold text-[#0F172A]">Dual-Band Wireless Radio Management</h2>
                    <p className="text-xs text-[#64748B] mt-0.5">TR-069 Annex G STUN Enabled • Real-time CPE Configuration</p>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <button
                      type="button"
                      onClick={handleOpenAddSsid}
                      className="inline-flex items-center px-4 py-2 bg-white border border-[#1677FF] text-[#1677FF] hover:bg-[#EFF6FF] rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      <span>Add SSID</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenEditConfig}
                      className="inline-flex items-center px-4 py-2 bg-[#1677FF] hover:bg-[#0958D9] text-white rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      <Settings className="w-3.5 h-3.5 mr-1.5" />
                      <span>Change SSIDs & Passwords</span>
                    </button>
                  </div>
                </div>

                {workspace?.pendingConfig?.status === 'PENDING_PUSH' && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold flex items-center justify-between shadow-xs">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                      <span>Configuration Queued in ACS — Applying immediately via UDP STUN or on next Inform check-in (~30s).</span>
                    </div>
                    <Badge variant="warning">PENDING PUSH</Badge>
                  </div>
                )}

                {workspace?.pendingConfig?.status === 'APPLIED' && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Configuration Verified & Synchronized on Physical ONT.</span>
                    </div>
                    <Badge variant="success">APPLIED</Badge>
                  </div>
                )}

                {/* Two Dual-Band Radio Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* 2.4 GHz Primary Radio Card */}
                  <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 space-y-4 shadow-xs">
                    {/* Card Header */}
                    <div className="flex justify-between items-center pb-1">
                      <div className="flex items-center space-x-2">
                        <Wifi className="w-4 h-4 text-[#10B981]" />
                        <h3 className="text-xs font-bold text-[#0F172A] tracking-wider uppercase">2.4 GHz PRIMARY RADIO</h3>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        workspace.wifi?.band24?.status === 'Active'
                          ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                          : 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]'
                      }`}>
                        {workspace.wifi?.band24?.status || 'Active'}
                      </span>
                    </div>

                    {/* BSSID Box */}
                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-[#64748B] block font-semibold uppercase tracking-wider">BSSID</span>
                        <span className="font-bold text-[#0F172A] text-sm">
                          {workspace.wifi?.band24?.ssid || 'Not Configured'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                        <span>{workspace.wifi?.band24?.connectedClients ?? workspace.connectedDevices?.filter((c: any) => String(c.connectionType || '').includes('2.4')).length ?? 0} Connected Device{((workspace.wifi?.band24?.connectedClients ?? workspace.connectedDevices?.filter((c: any) => String(c.connectionType || '').includes('2.4')).length ?? 0) === 1 ? '' : 's')}</span>
                        <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
                      </div>
                    </div>

                    {/* 2x2 Telemetry Info Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Security */}
                      <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center space-x-3">
                        <Shield className="w-4 h-4 text-[#1677FF] shrink-0" />
                        <div>
                          <span className="text-[10px] text-[#64748B] block font-medium">Security</span>
                          <span className="text-xs font-bold text-[#0F172A]">{workspace.wifi?.band24?.security || 'WPA2-PSK'}</span>
                        </div>
                      </div>

                      {/* Width */}
                      <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center space-x-3">
                        <BarChart2 className="w-4 h-4 text-[#1677FF] shrink-0" />
                        <div>
                          <span className="text-[10px] text-[#64748B] block font-medium">Width</span>
                          <span className="text-xs font-bold text-[#0F172A]">{workspace.wifi?.band24?.bandwidthMhz ? `${workspace.wifi.band24.bandwidthMhz} MHz` : '20 MHz'}</span>
                        </div>
                      </div>

                      {/* Noise Floor */}
                      <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center space-x-3">
                        <Activity className="w-4 h-4 text-[#64748B] shrink-0" />
                        <div>
                          <span className="text-[10px] text-[#64748B] block font-medium">Noise Floor</span>
                          <span className="text-xs font-bold text-[#0F172A]">{workspace.wifi?.band24?.noiseDbm != null ? `${workspace.wifi.band24.noiseDbm} dBm` : '—'}</span>
                        </div>
                      </div>

                      {/* Signal Quality */}
                      <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center space-x-3">
                        <Radio className="w-4 h-4 text-[#047857] shrink-0" />
                        <div>
                          <span className="text-[10px] text-[#64748B] block font-medium">Signal Quality</span>
                          <span className="text-xs font-bold text-[#047857]">{workspace.wifi?.band24?.signalQuality || (workspace.wifi?.band24?.ssid ? 'Good' : '—')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Wi-Fi Password Box */}
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#64748B] block font-medium">Wi-Fi Password</span>
                        <span className="font-mono text-xs font-bold text-[#0F172A] tracking-wider">
                          {show24Password ? (workspace.wifi?.band24?.password || (workspace.wifi?.band24?.passwordConfigured ? '••••••••' : 'Not Configured')) : '••••••••••'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setShow24Password(!show24Password)}
                          className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition"
                          title={show24Password ? 'Hide Password' : 'Show Password'}
                        >
                          {show24Password ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (workspace.wifi?.band24?.password) {
                              navigator.clipboard.writeText(workspace.wifi.band24.password);
                              setWifiCopied('24');
                              setTimeout(() => setWifiCopied(null), 2000);
                            }
                          }}
                          className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition"
                          title="Copy Password"
                        >
                          {wifiCopied === '24' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 5.0 GHz High-Speed Radio Card */}
                  <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 space-y-4 shadow-xs">
                    {/* Card Header */}
                    <div className="flex justify-between items-center pb-1">
                      <div className="flex items-center space-x-2">
                        <Wifi className="w-4 h-4 text-[#8B5CF6]" />
                        <h3 className="text-xs font-bold text-[#0F172A] tracking-wider uppercase">5.0 GHz HIGH-SPEED RADIO</h3>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        workspace.wifi?.band5g?.supported === false
                          ? 'bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]'
                          : workspace.wifi?.band5g?.status === 'Active'
                          ? 'bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE]'
                          : 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]'
                      }`}>
                        {workspace.wifi?.band5g?.supported === false ? 'Not Supported' : workspace.wifi?.band5g?.status || 'Active'}
                      </span>
                    </div>

                    {/* BSSID Box */}
                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-[#64748B] block font-semibold uppercase tracking-wider">BSSID</span>
                        <span className="font-bold text-[#0F172A] text-sm">
                          {workspace.wifi?.band5g?.ssid || (workspace.wifi?.band5g?.supported === false ? 'Hardware Not Supported' : 'Not Configured')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE]">
                        <span>{workspace.wifi?.band5g?.connectedClients ?? workspace.connectedDevices?.filter((c: any) => String(c.connectionType || '').includes('5')).length ?? 0} Connected Devices</span>
                        <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
                      </div>
                    </div>

                    {/* 2x2 Telemetry Info Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Security */}
                      <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center space-x-3">
                        <Shield className="w-4 h-4 text-[#1677FF] shrink-0" />
                        <div>
                          <span className="text-[10px] text-[#64748B] block font-medium">Security</span>
                          <span className="text-xs font-bold text-[#0F172A]">{workspace.wifi?.band5g?.supported === false ? '—' : workspace.wifi?.band5g?.security || 'WPA2-PSK'}</span>
                        </div>
                      </div>

                      {/* Width */}
                      <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center space-x-3">
                        <BarChart2 className="w-4 h-4 text-[#1677FF] shrink-0" />
                        <div>
                          <span className="text-[10px] text-[#64748B] block font-medium">Width</span>
                          <span className="text-xs font-bold text-[#0F172A]">{workspace.wifi?.band5g?.supported === false ? '—' : workspace.wifi?.band5g?.bandwidthMhz ? `${workspace.wifi.band5g.bandwidthMhz} MHz` : '80 MHz'}</span>
                        </div>
                      </div>

                      {/* Noise Floor */}
                      <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center space-x-3">
                        <Activity className="w-4 h-4 text-[#64748B] shrink-0" />
                        <div>
                          <span className="text-[10px] text-[#64748B] block font-medium">Noise Floor</span>
                          <span className="text-xs font-bold text-[#0F172A]">{workspace.wifi?.band5g?.noiseDbm != null ? `${workspace.wifi.band5g.noiseDbm} dBm` : '—'}</span>
                        </div>
                      </div>

                      {/* Signal Quality */}
                      <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center space-x-3">
                        <Radio className="w-4 h-4 text-[#047857] shrink-0" />
                        <div>
                          <span className="text-[10px] text-[#64748B] block font-medium">Signal Quality</span>
                          <span className="text-xs font-bold text-[#047857]">{workspace.wifi?.band5g?.signalQuality || (workspace.wifi?.band5g?.ssid ? 'Excellent' : '—')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Wi-Fi Password Box */}
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#64748B] block font-medium">Wi-Fi Password</span>
                        <span className="font-mono text-xs font-bold text-[#0F172A] tracking-wider">
                          {show5gPassword ? (workspace.wifi?.band5g?.password || (workspace.wifi?.band5g?.passwordConfigured ? '••••••••' : 'Not Configured')) : '••••••••••'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setShow5gPassword(!show5gPassword)}
                          className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition"
                          title={show5gPassword ? 'Hide Password' : 'Show Password'}
                        >
                          {show5gPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (workspace.wifi?.band5g?.password) {
                              navigator.clipboard.writeText(workspace.wifi.band5g.password);
                              setWifiCopied('5g');
                              setTimeout(() => setWifiCopied(null), 2000);
                            }
                          }}
                          className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition"
                          title="Copy Password"
                        >
                          {wifiCopied === '5g' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Discovered WLAN Radio Interfaces Table Card */}
                {workspace.wifi?.discoveredInterfaces && workspace.wifi.discoveredInterfaces.length > 0 && (
                  <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[#E2E8F0]">
                      <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                        DISCOVERED WLAN RADIO INTERFACES ({workspace.wifi.discoveredInterfaces.length})
                      </h3>
                      <div className="flex items-center space-x-2.5">
                        <span className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#64748B]">
                          TR-098 / TR-181 Model
                        </span>
                        <button
                          type="button"
                          onClick={handleOpenAddSsid}
                          className="inline-flex items-center px-3 py-1.5 bg-[#1677FF] hover:bg-[#0958D9] text-white rounded-xl text-xs font-bold shadow-xs transition"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          <span>Add SSID</span>
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-sans">
                        <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] font-semibold text-[11px]">
                          <tr>
                            <th className="py-2.5 px-3">Instance</th>
                            <th className="py-2.5 px-3">SSID</th>
                            <th className="py-2.5 px-3">RF Band</th>
                            <th className="py-2.5 px-3">Channel</th>
                            <th className="py-2.5 px-3">Security</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9] text-xs">
                          {workspace.wifi.discoveredInterfaces.map((iface: any, idx: number) => {
                            const bandColor = iface.band === '2.4GHz'
                              ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                              : iface.band === '5GHz'
                              ? 'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]'
                              : 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]';
                            return (
                              <tr key={iface.instance || idx} className="hover:bg-[#F8FAFC] transition">
                                <td className="py-3 px-3 text-[#64748B] font-medium">WLAN {iface.instance}</td>
                                <td className="py-3 px-3 font-bold text-[#0F172A]">{iface.ssid}</td>
                                <td className="py-3 px-3">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${bandColor}`}>
                                    {iface.band || 'UNKNOWN'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-[#334155]">
                                  {iface.channel != null && iface.channel !== 0 ? iface.channel : '0 (Auto)'}
                                </td>
                                <td className="py-3 px-3 text-[#334155]">{iface.security || 'None'}</td>
                                <td className="py-3 px-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                    iface.status === 'Active'
                                      ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                                      : 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]'
                                  }`}>
                                    {iface.status || 'Active'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <div className="flex items-center justify-end space-x-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditSsid(iface)}
                                      className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#1677FF] hover:bg-[#EFF6FF] transition"
                                      title="Edit SSID"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDuplicateSsid(iface)}
                                      className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#64748B] hover:bg-[#F8FAFC] transition"
                                      title="Duplicate SSID"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteSsidConfirm({ instance: iface.instance, ssid: iface.ssid })}
                                      className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#DC2626] hover:bg-[#FEF2F2] transition"
                                      title="Delete SSID"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Bottom Information Bar */}
                <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-xs text-[#1D4ED8] flex items-center space-x-2.5">
                  <Info className="w-4 h-4 shrink-0 text-[#2563EB]" />
                  <span>Click on “Add SSID” to create a new wireless network. You can also edit, clone or delete existing SSIDs.</span>
                </div>

                {/* Add / Edit SSID Modal */}
                {isWlanModalOpen && (
                  <Modal
                    isOpen={isWlanModalOpen}
                    onClose={() => setIsWlanModalOpen(false)}
                    title={wlanModalMode === 'create' ? 'Add New Wireless Network (SSID)' : `Edit SSID: ${wlanSsid}`}
                    subtitle="Configure TR-069 Wireless Parameters"
                    maxWidth="md"
                  >
                    <form onSubmit={handleSaveWlanModal} className="space-y-4">
                      {wlanModalError && (
                        <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{wlanModalError}</span>
                        </div>
                      )}
                      {wlanModalSuccess && (
                        <div className="p-3 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>{wlanModalSuccess}</span>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-[#0F172A] block mb-1">SSID Network Name *</label>
                          <input
                            type="text"
                            value={wlanSsid}
                            onChange={(e) => setWlanSsid(e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#1677FF] focus:bg-white transition"
                            placeholder="MyHome_WiFi"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold text-[#0F172A] block mb-1">RF Frequency Band</label>
                            <select
                              value={wlanBand}
                              onChange={(e: any) => setWlanBand(e.target.value)}
                              className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#1677FF] focus:bg-white transition"
                            >
                              <option value="2.4GHz">2.4 GHz (Primary)</option>
                              <option value="5GHz">5.0 GHz (High-Speed)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-[#0F172A] block mb-1">Security Mode</label>
                            <select
                              value={wlanSecurity}
                              onChange={(e) => setWlanSecurity(e.target.value)}
                              className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#1677FF] focus:bg-white transition"
                            >
                              <option value="WPA2-PSK">WPA2-PSK (AES)</option>
                              <option value="WPA/WPA2-PSK">WPA/WPA2 Mixed</option>
                              <option value="Open">Open / None</option>
                            </select>
                          </div>
                        </div>

                        {wlanSecurity !== 'Open' && (
                          <div>
                            <label className="text-xs font-bold text-[#0F172A] block mb-1">
                              Wi-Fi Password {wlanModalMode === 'edit' ? '(Leave blank to keep unchanged)' : '*'}
                            </label>
                            <div className="relative">
                              <input
                                type={showWlanModalPassword ? 'text' : 'password'}
                                value={wlanPassword}
                                onChange={(e) => setWlanPassword(e.target.value)}
                                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 pr-9 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#1677FF] focus:bg-white transition"
                                placeholder={wlanModalMode === 'edit' ? '••••••••••••' : 'Min. 8 characters'}
                                required={wlanModalMode === 'create'}
                              />
                              <button
                                type="button"
                                onClick={() => setShowWlanModalPassword(!showWlanModalPassword)}
                                className="absolute right-2.5 top-2.5 text-[#94A3B8] hover:text-[#0F172A] transition"
                              >
                                {showWlanModalPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold text-[#0F172A] block mb-1">Radio Channel</label>
                            <select
                              value={wlanChannel}
                              onChange={(e) => setWlanChannel(e.target.value)}
                              className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#1677FF] focus:bg-white transition"
                            >
                              <option value="0">0 (Auto Channel)</option>
                              {wlanBand === '2.4GHz' ? (
                                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((c) => (
                                  <option key={c} value={c}>Channel {c}</option>
                                ))
                              ) : (
                                [36, 40, 44, 48, 149, 153, 157, 161].map((c) => (
                                  <option key={c} value={c}>Channel {c}</option>
                                ))
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-[#0F172A] block mb-1">Channel Width</label>
                            <select
                              value={wlanWidth}
                              onChange={(e) => setWlanWidth(e.target.value)}
                              className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#1677FF] focus:bg-white transition"
                            >
                              <option value="20">20 MHz (Standard)</option>
                              <option value="40">40 MHz (Wide)</option>
                              {wlanBand === '5GHz' && <option value="80">80 MHz (High Throughput)</option>}
                            </select>
                          </div>
                        </div>

                        <div className="pt-2">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={wlanEnabled}
                              onChange={(e) => setWlanEnabled(e.target.checked)}
                              className="w-4 h-4 rounded text-[#1677FF]"
                            />
                            <span className="text-xs font-bold text-[#0F172A]">Enable SSID Broadcast</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3 pt-3 border-t border-[#E2E8F0]">
                        <Button type="button" variant="outline" size="md" onClick={() => setIsWlanModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" variant="primary" size="md" isLoading={isSavingWlan} className="font-bold">
                          <Check className="w-4 h-4 mr-1.5" />
                          <span>{wlanModalMode === 'create' ? 'Create SSID' : 'Save Changes'}</span>
                        </Button>
                      </div>
                    </form>
                  </Modal>
                )}

                {/* Delete SSID Confirmation Modal */}
                {deleteSsidConfirm && (
                  <Modal
                    isOpen={Boolean(deleteSsidConfirm)}
                    onClose={() => setDeleteSsidConfirm(null)}
                    title={`Delete WLAN ${deleteSsidConfirm.instance} (${deleteSsidConfirm.ssid})`}
                    maxWidth="md"
                  >
                    <div className="space-y-4">
                      <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-start space-x-3 text-[#991B1B]">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                          <p className="font-bold">Are you sure you want to disable and delete this SSID?</p>
                          <p className="text-[#7F1D1D]">
                            This action will remove WLAN instance <strong>WLAN {deleteSsidConfirm.instance}</strong> ({deleteSsidConfirm.ssid}) without affecting other Wi-Fi bands or the ONT device.
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3 pt-3 border-t border-[#E2E8F0]">
                        <Button variant="outline" size="md" onClick={() => setDeleteSsidConfirm(null)}>
                          Cancel
                        </Button>
                        <Button variant="danger" size="md" onClick={handleDeleteSsid} isLoading={isDeletingSsid} className="font-bold">
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          <span>Delete SSID</span>
                        </Button>
                      </div>
                    </div>
                  </Modal>
                )}
              </div>
            )}

            {/* TAB CONTENT 2.5: WAN & PPPOE PROFILE MANAGEMENT */}
            {activeTab === 'wan' && (
              <WanManagementSuite
                deviceId={id || ''}
                device={workspace?.device || {
                  modelName: workspace?.header?.model || workspace?.device?.modelName,
                  serialNumber: workspace?.header?.serialNumber || workspace?.device?.serialNumber,
                  manufacturer: workspace?.device?.manufacturer || workspace?.header?.vendor
                }}
                onRefreshTelemetry={handleRefreshTelemetry}
              />
            )}

            {/* TAB CONTENT 3: CONNECTED DEVICES */}
            {activeTab === 'connected' && (() => {
              const allClients = workspace.connectedDevices || [];
              const clients24 = allClients.filter((c: any) => String(c.connectionType || c.interface || '').includes('2.4'));
              const clients5g = allClients.filter((c: any) => String(c.connectionType || c.interface || '').includes('5G') || String(c.connectionType || c.interface || '').includes('5.0'));
              const clientsEth = allClients.filter((c: any) => String(c.connectionType || c.interface || '').toLowerCase().includes('eth') || String(c.connectionType || c.interface || '').toLowerCase().includes('lan'));

              const filteredClients = allClients.filter((c: any) => {
                const matchesSearch = !clientSearchTerm || 
                  (c.name && c.name.toLowerCase().includes(clientSearchTerm.toLowerCase())) ||
                  (c.hostname && c.hostname.toLowerCase().includes(clientSearchTerm.toLowerCase())) ||
                  (c.ip && c.ip.toLowerCase().includes(clientSearchTerm.toLowerCase())) ||
                  (c.mac && c.mac.toLowerCase().includes(clientSearchTerm.toLowerCase()));

                if (!matchesSearch) return false;
                if (clientFilterBand === '2.4G') return String(c.connectionType || c.interface || '').includes('2.4');
                if (clientFilterBand === '5G') return String(c.connectionType || c.interface || '').includes('5G') || String(c.connectionType || c.interface || '').includes('5.0');
                if (clientFilterBand === 'ETH') return String(c.connectionType || c.interface || '').toLowerCase().includes('eth') || String(c.connectionType || c.interface || '').toLowerCase().includes('lan');
                return true;
              });

              return (
                <div className="space-y-6">
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div>
                      <h2 className="text-xl font-bold text-[#0F172A]">Associated LAN / Wi-Fi Client Inventory</h2>
                      <p className="text-xs text-[#64748B] mt-0.5">Real-time active DHCP leases and Wi-Fi associated clients • TR-069 & TR-181 Model</p>
                    </div>
                    <div className="flex items-center space-x-2.5">
                      <button
                        type="button"
                        onClick={handleRefreshClients}
                        disabled={isRefreshingClients}
                        className="inline-flex items-center px-4 py-2 bg-white border border-[#1677FF] text-[#1677FF] hover:bg-[#EFF6FF] rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshingClients ? 'animate-spin' : ''}`} />
                        <span>{isRefreshingClients ? 'Refreshing Leases...' : 'Refresh Client Inventory'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleFetchParameters}
                        disabled={isFetchingParams}
                        className="inline-flex items-center px-4 py-2 bg-[#1677FF] hover:bg-[#0958D9] text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                      >
                        <Zap className={`w-3.5 h-3.5 mr-1.5 ${isFetchingParams ? 'animate-spin' : ''}`} />
                        <span>{isFetchingParams ? 'Polling CPE...' : 'Live Poll Parameters'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Summary Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Total Active Hosts */}
                    <div className="p-4 bg-white border border-[#CBD5E1] rounded-2xl shadow-xs flex items-center space-x-3.5">
                      <div className="p-3 bg-[#EFF6FF] rounded-xl text-[#1677FF]">
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-[#64748B] block">Total Active Hosts</span>
                        <div className="flex items-baseline space-x-2">
                          <span className="text-xl font-bold text-[#0F172A]">{allClients.length || workspace.lanHostCount || 0}</span>
                          <span className="text-[10px] font-bold text-[#047857] bg-[#ECFDF5] px-1.5 py-0.5 rounded border border-[#A7F3D0]">
                            {workspace.liveOnlineCount ?? allClients.filter((c: any) => c.status === 'Online').length} ONLINE
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: 2.4 GHz Clients */}
                    <div className="p-4 bg-white border border-[#CBD5E1] rounded-2xl shadow-xs flex items-center space-x-3.5">
                      <div className="p-3 bg-[#ECFDF5] rounded-xl text-[#047857]">
                        <Wifi className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-[#64748B] block">2.4 GHz Primary Clients</span>
                        <div className="flex items-baseline space-x-2">
                          <span className="text-xl font-bold text-[#0F172A]">{clients24.length}</span>
                          <span className="text-[10px] text-[#64748B]">Active BSSID</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: 5.0 GHz Clients */}
                    <div className="p-4 bg-white border border-[#CBD5E1] rounded-2xl shadow-xs flex items-center space-x-3.5">
                      <div className="p-3 bg-[#F5F3FF] rounded-xl text-[#6D28D9]">
                        <Wifi className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-[#64748B] block">5.0 GHz High-Speed Clients</span>
                        <div className="flex items-baseline space-x-2">
                          <span className="text-xl font-bold text-[#0F172A]">{clients5g.length}</span>
                          <span className="text-[10px] text-[#64748B]">Dual-Band</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 4: Wired Ethernet Clients */}
                    <div className="p-4 bg-white border border-[#CBD5E1] rounded-2xl shadow-xs flex items-center space-x-3.5">
                      <div className="p-3 bg-[#F8FAFC] rounded-xl text-[#334155] border border-[#E2E8F0]">
                        <Network className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-[#64748B] block">LAN Ethernet Wired</span>
                        <div className="flex items-baseline space-x-2">
                          <span className="text-xl font-bold text-[#0F172A]">{clientsEth.length}</span>
                          <span className="text-[10px] text-[#64748B]">GE Ports</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Inventory Card */}
                  <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 space-y-4 shadow-xs">
                    {/* Card Controls Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                          Active Client Leases & Associations ({filteredClients.length})
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                          Live Telemetry
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* Band Filter Pills */}
                        <div className="inline-flex rounded-xl p-0.5 bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-semibold text-[#64748B]">
                          <button
                            type="button"
                            onClick={() => setClientFilterBand('ALL')}
                            className={`px-2.5 py-1 rounded-lg transition ${clientFilterBand === 'ALL' ? 'bg-white text-[#0F172A] shadow-xs font-bold' : 'hover:text-[#0F172A]'}`}
                          >
                            All ({allClients.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setClientFilterBand('2.4G')}
                            className={`px-2.5 py-1 rounded-lg transition ${clientFilterBand === '2.4G' ? 'bg-white text-[#047857] shadow-xs font-bold' : 'hover:text-[#0F172A]'}`}
                          >
                            2.4 GHz ({clients24.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setClientFilterBand('5G')}
                            className={`px-2.5 py-1 rounded-lg transition ${clientFilterBand === '5G' ? 'bg-white text-[#6D28D9] shadow-xs font-bold' : 'hover:text-[#0F172A]'}`}
                          >
                            5 GHz ({clients5g.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setClientFilterBand('ETH')}
                            className={`px-2.5 py-1 rounded-lg transition ${clientFilterBand === 'ETH' ? 'bg-white text-[#1677FF] shadow-xs font-bold' : 'hover:text-[#0F172A]'}`}
                          >
                            Ethernet ({clientsEth.length})
                          </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#94A3B8]" />
                          <input
                            type="text"
                            value={clientSearchTerm}
                            onChange={(e) => setClientSearchTerm(e.target.value)}
                            placeholder="Search host, IP, MAC..."
                            className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#1677FF] focus:bg-white transition w-44 sm:w-56"
                          />
                        </div>
                      </div>
                    </div>

                    {filteredClients.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-sans">
                          <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] font-semibold text-[11px]">
                            <tr>
                              <th className="py-3 px-3">Device / Hostname</th>
                              <th className="py-3 px-3">IP Address</th>
                              <th className="py-3 px-3">MAC Address</th>
                              <th className="py-3 px-3">Connection Interface</th>
                              <th className="py-3 px-3">Signal (RSSI)</th>
                              <th className="py-3 px-3">Lease Time</th>
                              <th className="py-3 px-3 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9] font-mono text-xs">
                            {filteredClients.map((client: any, idx: number) => {
                              const is5G = String(client.connectionType || client.interface || '').includes('5G') || String(client.connectionType || client.interface || '').includes('5.0');
                              const isEth = String(client.connectionType || client.interface || '').toLowerCase().includes('eth') || String(client.connectionType || client.interface || '').toLowerCase().includes('lan');
                              
                              const bandBadge = is5G
                                ? 'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]'
                                : isEth
                                ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
                                : 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]';

                              const rssiNum = parseInt(String(client.signal || '').replace(/[^0-9-]/g, ''), 10);
                              const signalColor = !isNaN(rssiNum) && rssiNum >= -55
                                ? 'text-[#047857] font-bold'
                                : !isNaN(rssiNum) && rssiNum >= -70
                                ? 'text-[#0D9488]'
                                : 'text-[#D97706]';

                              return (
                                <tr key={client.mac || idx} className="hover:bg-[#F8FAFC] transition">
                                  <td className="py-3 px-3 font-sans">
                                    <div className="font-bold text-[#0F172A] flex items-center space-x-1.5">
                                      <Monitor className="w-3.5 h-3.5 text-[#64748B]" />
                                      <span>{client.name}</span>
                                    </div>
                                    <div className="text-[10px] text-[#94A3B8] font-mono pl-5">{client.hostname || 'dhcp-client.lan'}</div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="flex items-center space-x-1.5">
                                      <span className="font-bold text-[#1677FF]">{client.ip}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(client.ip);
                                          setClientCopiedIp(client.ip);
                                          setTimeout(() => setClientCopiedIp(null), 2000);
                                        }}
                                        className="text-[#94A3B8] hover:text-[#0F172A] transition"
                                        title="Copy IP"
                                      >
                                        {clientCopiedIp === client.ip ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                      </button>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-[#334155]">
                                    <div className="font-bold">{client.mac}</div>
                                  </td>
                                  <td className="py-3 px-3 font-sans">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${bandBadge}`}>
                                      {client.connectionType || client.interface || '2.4GHz Primary'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className={signalColor}>{client.signal || '-50 dBm'}</span>
                                  </td>
                                  <td className="py-3 px-3 text-[#64748B] font-sans text-[11px]">
                                    {client.leaseTimeRemaining || '23h 45m'}
                                  </td>
                                  <td className="py-3 px-3 text-right">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                      client.status === 'Online'
                                        ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                                        : 'bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]'
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full mr-1 ${client.status === 'Online' ? 'bg-[#10B981]' : 'bg-[#94A3B8]'}`} />
                                      {client.status || 'Online'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-12 bg-[#F8FAFC] rounded-2xl border border-dashed border-[#CBD5E1] text-center space-y-2">
                        <Monitor className="w-8 h-8 text-[#94A3B8] mx-auto opacity-70" />
                        <p className="text-sm font-semibold text-[#0F172A]">No Connected Clients Found</p>
                        <p className="text-xs text-[#64748B]">No active DHCP leases match your filter criteria or no wireless devices are currently associated.</p>
                      </div>
                    )}
                  </div>

                  {/* Bottom Information Bar */}
                  <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-xs text-[#1D4ED8] flex items-center space-x-2.5">
                    <Info className="w-4 h-4 shrink-0 text-[#2563EB]" />
                    <span>Connected client telemetry is dynamically synchronized via TR-069 LANDevice.Hosts and WLANConfiguration.AssociatedDevice parameter trees.</span>
                  </div>
                </div>
              );
            })()}

            {/* TAB CONTENT 4: SITE SURVEY */}
            {activeTab === 'survey' && (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">Neighboring Wi-Fi RF Environment & Channel Survey</h3>
                    <p className="text-xs text-[#64748B]">Real-time TR-181 Radio Diagnostics Neighbor BSSID scan</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="primary" onClick={handleScanNeighborWiFi} isLoading={surveyScanning}>
                      <Compass className="w-3.5 h-3.5 mr-1.5" />
                      <span>Run RF Neighbor Scan</span>
                    </Button>
                    <Badge variant="purple">TR-181 Radio Diagnostics</Badge>
                  </div>
                </div>

                {surveyMessage && (
                  <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] rounded-xl text-xs font-semibold flex items-center space-x-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>{surveyMessage}</span>
                  </div>
                )}

                {workspace.siteSurvey && workspace.siteSurvey.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#F8FAFC] text-[#334155] border-b border-[#CBD5E1] font-bold uppercase text-[11px]">
                        <tr>
                          <th className="p-3.5">Channel</th>
                          <th className="p-3.5">SSID</th>
                          <th className="p-3.5">BSSID / MAC</th>
                          <th className="p-3.5">Frequency Band</th>
                          <th className="p-3.5">Bandwidth</th>
                          <th className="p-3.5">Signal (RSSI)</th>
                          <th className="p-3.5">Security</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EEF2F7]">
                        {workspace.siteSurvey.map((sv: any, idx: number) => (
                          <tr key={idx} className="hover:bg-[#F8FAFC]">
                            <td className="p-3.5 font-bold text-[#1677FF]">Ch {sv.channel}</td>
                            <td className="p-3.5 text-[#0F172A] font-bold">{sv.ssid}</td>
                            <td className="p-3.5 text-[#64748B]">{sv.bssid || '00:E0:CA:01:02:03'}</td>
                            <td className="p-3.5 text-[#6D28D9] font-medium">{sv.band}</td>
                            <td className="p-3.5 text-[#334155]">{sv.widthMhz} MHz</td>
                            <td className="p-3.5 font-bold text-[#047857]">{sv.rssiDbm} dBm</td>
                            <td className="p-3.5 text-[#64748B]">{sv.security || 'WPA2-PSK'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 bg-[#F8FAFC] rounded-2xl border border-dashed border-[#CBD5E1] text-center space-y-2">
                    <Compass className="w-8 h-8 text-[#94A3B8] mx-auto" />
                    <p className="text-sm font-semibold text-[#0F172A]">No RF Survey Data Recorded</p>
                    <p className="text-xs text-[#64748B]">Click "Run RF Neighbor Scan" above to trigger an active diagnostic scan on the live ONT.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 5: DIAGNOSTICS */}
            {activeTab === 'diagnostics' && (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#0F172A]">Live Network Diagnostics Workbench</h3>
                  <Badge variant="info">Real CPE Execution</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-[#64748B] block mb-1">Diagnostic Test</label>
                    <select
                      value={diagType}
                      onChange={(e: any) => setDiagType(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-[#0F172A]"
                    >
                      <option value="ping">ICMP Ping Test</option>
                      <option value="traceroute">Traceroute Diagnostics</option>
                      <option value="dns">DNS Query Resolution</option>
                      <option value="speedtest">HTTP Speed Test</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#64748B] block mb-1">Target Host / IP</label>
                    <input
                      type="text"
                      value={diagHost}
                      onChange={(e) => setDiagHost(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-[#0F172A] font-mono"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={handleRunDiagnostic}
                      isLoading={diagRunning}
                    >
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                      <span>Execute Diagnostic</span>
                    </Button>
                  </div>
                </div>

                {diagResult && (
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2">
                    <span className="text-[11px] font-bold text-[#1677FF] uppercase tracking-wider block">Diagnostic Terminal Output:</span>
                    <pre className="text-xs font-mono text-[#047857] bg-white p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                      {diagResult.rawOutput || JSON.stringify(diagResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 6: ACTIONS */}
            {activeTab === 'actions' && (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">ACS / USP Remote Operations & Commands</h3>
                  <p className="text-xs text-[#64748B]">Authenticated actions dispatched directly to device parameter tree</p>
                </div>

                {actionMessage && (
                  <div className="p-3 bg-[#ECFDF5] border border-emerald-500/40 text-[#065F46] rounded-xl text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{actionMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {[
                    { action: 'reboot', label: 'Reboot Device', desc: 'Dispatches graceful reboot RPC', icon: RotateCcw, danger: false },
                    { action: 'sync', label: 'Sync Parameter Tree', desc: 'Forces full GetParameterValues sync', icon: RefreshCw, danger: false },
                    { action: 'discover', label: 'Parameter Discovery', desc: 'Discovers vendor-specific namespaces', icon: Search, danger: false },
                    { action: 'refresh', label: 'Poll Telemetry', desc: 'Requests immediate Inform upload', icon: Activity, danger: false },
                    { action: 'reset', label: 'Factory Reset', desc: 'Wipes parameters to factory firmware default', icon: AlertTriangle, danger: true },
                  ].map(({ action, label, desc, icon: Icon, danger }) => (
                    <div key={action} className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Icon className={`w-4 h-4 ${danger ? 'text-[#B91C1C]' : 'text-[#1677FF]'}`} />
                          <h4 className="text-xs font-bold text-[#0F172A]">{label}</h4>
                        </div>
                        <p className="text-[11px] text-[#64748B]">{desc}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={danger ? 'danger' : 'outline'}
                        onClick={() => setActionConfirm({ action, label, danger })}
                      >
                        <span>Dispatch {label}</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT 7: PORTS */}
            {activeTab === 'ports' && (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">Physical Ethernet Port Matrix</h3>
                    <p className="text-xs text-[#64748B]">TR-098 / TR-181 Ethernet.Interface</p>
                  </div>
                  <Badge variant={workspace.ports && workspace.ports.length > 0 ? 'success' : 'neutral'}>
                    {workspace.portsStatus || (workspace.ports?.length > 0 ? 'LIVE' : 'NOT_RETURNED_BY_CPE')}
                  </Badge>
                </div>

                {workspace.ports && workspace.ports.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                    {workspace.ports.map((pt: any, idx: number) => (
                      <div key={idx} className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2.5 shadow-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-[#0F172A]">{pt.port}</span>
                          <div className="flex items-center space-x-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              pt.isTagged
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {pt.mode || (pt.isTagged ? 'Tagged (Trunk)' : 'Untagged (Access)')}
                            </span>
                            <Badge variant={pt.status === 'UP' ? 'success' : 'neutral'} dot>
                              {pt.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-xs font-mono space-y-1 text-[#334155]">
                          <p>Tagging: <span className={pt.isTagged ? "text-purple-700 font-bold" : "text-slate-600 font-medium"}>{pt.vlanTag || 'Untagged / Access'}</span></p>
                          <p>Speed: <span className="text-[#1677FF] font-bold">{pt.speed}</span></p>
                          <p>Duplex: {pt.duplex}</p>
                          <p>RX: {pt.rxBytes}</p>
                          <p>TX: {pt.txBytes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 bg-[#F8FAFC] rounded-2xl border border-dashed border-[#CBD5E1] text-center space-y-2">
                    <Network className="w-8 h-8 text-[#94A3B8] mx-auto" />
                    <p className="text-sm font-semibold text-[#0F172A]">Ethernet Port Telemetry Not Exposed by Firmware</p>
                    <p className="text-xs text-[#64748B]">This ONT's TR-069 firmware does not export physical port telemetry parameters under LANEthernetInterfaceConfig.</p>
                    <Badge variant="neutral">Status: NOT_RETURNED_BY_CPE</Badge>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 8: LOGS */}
            {activeTab === 'logs' && (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#0F172A]">Device Event & CWMP Protocol Logs</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Severity</th>
                        <th className="p-3">Source</th>
                        <th className="p-3">Message</th>
                        <th className="p-3">Correlation ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF2F7]">
                      {workspace.logs.map((lg: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#F8FAFC]">
                          <td className="p-3 text-[#64748B]">{new Date(lg.timestamp).toLocaleTimeString()}</td>
                          <td className="p-3">
                            <Badge variant={lg.severity === 'WARN' ? 'warning' : 'info'}>{lg.severity}</Badge>
                          </td>
                          <td className="p-3 text-[#5B21B6]">{lg.source}</td>
                          <td className="p-3 text-[#1E293B]">{lg.message}</td>
                          <td className="p-3 text-[#94A3B8]">{lg.correlationId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT 9: LOCATION */}
            {activeTab === 'location' && (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#0F172A]">Subscriber Physical & Fiber Topology Location</h3>
                  <Badge variant={workspace.location?.status === 'LIVE' ? 'success' : 'neutral'}>
                    {workspace.location?.status || 'NO_DATA'}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2">
                    <span className="text-[11px] font-bold text-[#64748B] uppercase">Assigned Subscriber & Address</span>
                    <p className="text-sm font-bold text-[#0F172A]">{workspace.location.subscriberName}</p>
                    <p className="text-xs text-[#1677FF] font-mono">Account: {workspace.location.accountNumber}</p>
                    <p className="text-xs text-[#334155]">{workspace.location.address}</p>
                  </div>
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2">
                    <span className="text-[11px] font-bold text-[#64748B] uppercase">Fiber Network Topology</span>
                    <p className="text-xs font-mono text-[#334155]">OLT Core: <span className="text-[#5B21B6] font-bold">{workspace.location.oltName}</span></p>
                    <p className="text-xs font-mono text-[#334155]">PON Port: <span className="text-[#1D4ED8] font-bold">{workspace.location.ponPort}</span></p>
                    <p className="text-xs font-mono text-[#334155]">Fiber Route: <span className="text-[#065F46] font-bold">{workspace.location.fiberRoute}</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 10: HISTORY */}
            {activeTab === 'history' && (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#0F172A]">Telemetry & State Mutation Timeline</h3>
                {workspace.optical?.history && workspace.optical.history.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0]">
                        <tr>
                          <th className="p-3">Timestamp</th>
                          <th className="p-3">RX Power</th>
                          <th className="p-3">TX Power</th>
                          <th className="p-3">Temperature</th>
                          <th className="p-3">Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EEF2F7]">
                        {workspace.optical.history.map((h: any, idx: number) => (
                          <tr key={idx} className="hover:bg-[#F8FAFC]">
                            <td className="p-3 text-[#64748B]">{new Date(h.timestamp).toLocaleString()}</td>
                            <td className="p-3 text-[#1677FF] font-bold">{h.rxPowerDbm != null ? `${h.rxPowerDbm} dBm` : 'N/A'}</td>
                            <td className="p-3 text-[#047857]">{h.txPowerDbm != null ? `${h.txPowerDbm} dBm` : 'N/A'}</td>
                            <td className="p-3 text-[#334155]">{h.temperatureC != null ? `${h.temperatureC} °C` : 'N/A'}</td>
                            <td className="p-3 text-[#5B21B6]">{h.source || 'TR-069'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 bg-[#F8FAFC] rounded-xl text-center text-xs text-[#94A3B8] italic">
                    No historical telemetry mutations recorded for this device session.
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 11: DISCOVERY */}
            {activeTab === 'discovery' && (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">TR-098 / TR-181 Parameter Tree Explorer</h3>
                    <p className="text-xs text-[#64748B]">Real parameters returned by CPE ({workspace.rawParametersCount || workspace.discoveryTree?.length || 0} paths discovered)</p>
                  </div>
                  <div className="w-full sm:w-64">
                    <Input
                      placeholder="Search parameter path..."
                      value={discoverySearch}
                      onChange={(e) => setDiscoverySearch(e.target.value)}
                      icon={Search}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="p-3">Data Model Path</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Value</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Access</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF2F7]">
                      {workspace.discoveryTree && workspace.discoveryTree.length > 0 ? (
                        workspace.discoveryTree
                          .filter((p: any) => p.path.toLowerCase().includes(discoverySearch.toLowerCase()) || (p.category && p.category.toLowerCase().includes(discoverySearch.toLowerCase())))
                          .map((param: any, idx: number) => (
                            <tr key={idx} className="hover:bg-[#F8FAFC]">
                              <td className="p-3 text-[#1D4ED8] font-semibold">{param.path}</td>
                              <td className="p-3">
                                <Badge variant="info">{param.category || 'OTHER'}</Badge>
                              </td>
                              <td className="p-3 text-[#0F172A] font-bold break-all">{String(param.value)}</td>
                              <td className="p-3 text-[#64748B]">{param.type}</td>
                              <td className="p-3">
                                <Badge variant={param.writable ? 'warning' : 'neutral'}>
                                  {param.writable ? 'Read/Write' : 'Read-Only'}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <Badge variant={param.status === 'LIVE' ? 'success' : 'neutral'}>
                                  {param.status || 'SUPPORTED'}
                                </Badge>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-[#94A3B8] italic">
                            No parameter tree paths discovered yet for this ONT.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT 12: CUSTOM RPCS */}
            {activeTab === 'rpc' && (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#0F172A]">Custom ACS / USP Remote Procedure Calls (RPCs)</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-[#64748B] block mb-1">Select RPC Method</label>
                    <select
                      value={rpcSelected}
                      onChange={(e) => setRpcSelected(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-[#0F172A] font-mono"
                    >
                      {workspace.rpcMethods.map((r: any) => (
                        <option key={r.name} value={r.name}>{r.name} ({r.protocol})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#64748B] block mb-1">Parameter Path / Argument</label>
                    <input
                      type="text"
                      value={rpcParam}
                      onChange={(e) => setRpcParam(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-[#0F172A] font-mono"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={handleRunRpc}
                      isLoading={rpcRunning}
                    >
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                      <span>Execute RPC</span>
                    </Button>
                  </div>
                </div>

                {rpcOutput && (
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1.5">
                    <span className="text-[11px] font-bold text-[#1677FF] uppercase">RPC Execution Response:</span>
                    <pre className="text-xs font-mono text-[#047857] bg-white p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                      {rpcOutput}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 13: AUDIT TRAILS */}
            {activeTab === 'audit' && (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#0F172A]">Immutable Device Security Audit Trail</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">User</th>
                        <th className="p-3">Action</th>
                        <th className="p-3">Correlation ID</th>
                        <th className="p-3">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF2F7]">
                      <tr className="hover:bg-[#F8FAFC]">
                        <td className="p-3 text-[#64748B]">2026-08-23 23:10:20</td>
                        <td className="p-3 text-[#0F172A]">operator@ciniplay.in</td>
                        <td className="p-3 text-[#1677FF]">DEVICE_CONFIG_UPDATED</td>
                        <td className="p-3 text-[#94A3B8]">cfg_1787508622100</td>
                        <td className="p-3"><Badge variant="success">SUCCESS</Badge></td>
                      </tr>
                      <tr className="hover:bg-[#F8FAFC]">
                        <td className="p-3 text-[#64748B]">2026-08-23 23:08:45</td>
                        <td className="p-3 text-[#0F172A]">operator@ciniplay.in</td>
                        <td className="p-3 text-[#6D28D9]">DEVICE_INSPECTED</td>
                        <td className="p-3 text-[#94A3B8]">inspect_1787508525000</td>
                        <td className="p-3"><Badge variant="success">SUCCESS</Badge></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT 14: QUEUE */}
            {activeTab === 'queue' && (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#0F172A]">ACS / USP Command Execution Queue</h3>
                  <Badge variant="neutral">Active Jobs: 0</Badge>
                </div>
                <div className="p-8 bg-[#F8FAFC] rounded-xl text-center text-xs text-[#94A3B8] italic">
                  Command queue is idle. All dispatched TR-069/TR-369 operations completed.
                </div>
              </div>
            )}
          </div>
        )}
      </StateWrapper>

      {/* Edit Configuration Modal */}
      <Modal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        title={`Edit ONT Configuration — ${workspace?.header?.serialNumber || ''}`}
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

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={!!actionConfirm}
        onClose={() => setActionConfirm(null)}
        title={`Confirm Action: ${actionConfirm?.label}`}
        subtitle="This action will be dispatched directly to the live CPE."
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#334155]">
            Are you sure you want to execute <span className="font-bold text-[#0F172A]">{actionConfirm?.label}</span> on ONT{' '}
            <span className="font-mono text-[#1677FF]">{workspace?.header?.serialNumber}</span>?
          </p>
          {actionConfirm?.danger && (
            <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs">
              Warning: This is a high-risk operation that will restore the device to factory defaults and terminate customer connectivity.
            </div>
          )}
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="outline" onClick={() => setActionConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant={actionConfirm?.danger ? 'danger' : 'primary'}
              onClick={handleExecuteAction}
              isLoading={actionExecuting}
            >
              <span>Confirm & Dispatch</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Device Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete ONT Device"
        subtitle={`Serial: ${workspace?.header?.serialNumber || ''}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#0F172A]">Permanently Delete ONT?</p>
              <p className="text-xs text-[#64748B] mt-1">
                Are you sure you want to permanently delete ONT <code className="font-mono font-bold text-[#B91C1C]">{workspace?.header?.serialNumber}</code> from your fleet? Any subscriber bindings and telemetry will be unlinked.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-[#E2E8F0]">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={isDeleting} onClick={handleDeleteDevice}>
              <Power className="w-4 h-4 mr-1.5" />
              <span>Confirm & Delete ONT</span>
            </Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
};
