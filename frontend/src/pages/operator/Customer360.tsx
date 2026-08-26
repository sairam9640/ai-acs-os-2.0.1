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
} from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Tabs, TabItem } from '../../components/ui/Tabs.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button, Input } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../services/api.js';

export const Customer360: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [pendingCommand, setPendingCommand] = useState<any>(null);
  const [showPppoePass, setShowPppoePass] = useState(false);

  // Modals for device actions
  const [isWifiModalOpen, setIsWifiModalOpen] = useState(false);
  const [wifiForm, setWifiForm] = useState({
    ssid5g: '',
    pass5g: '',
    ssid24: '',
    pass24: '',
  });

  const navigate = useNavigate();

  const fetchCustomer360 = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
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
    } else {
      setError(res.error || 'Failed to load Customer 360 profile');
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

  // Handle Wi-Fi Reconfiguration Action
  const handleApplyWifi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device) return;

    setPendingCommand({
      status: 'queued',
      action: 'SET_WIFI_CONFIG',
      correlationId: `wifi_cmd_${Date.now()}`,
    });

    setIsWifiModalOpen(false);

    // Call API
    const res = await api.updateDeviceWifi(device._id, {
      wifi5g: { ssid: wifiForm.ssid5g, password: wifiForm.pass5g },
      wifi24: { ssid: wifiForm.ssid24, password: wifiForm.pass24 },
    });

    if (res.success) {
      setPendingCommand({
        status: 'verifying',
        action: 'SET_WIFI_CONFIG',
      });
      setTimeout(() => {
        setPendingCommand(null);
        fetchCustomer360();
      }, 1200);
    } else {
      setPendingCommand({
        status: 'failed',
        action: 'SET_WIFI_CONFIG',
      });
      alert(res.error || 'Wi-Fi configuration failed verification.');
    }
  };

  // Handle Block / Unblock Client
  const handleToggleBlockClient = async (mac: string, currentBlocked: boolean) => {
    if (!device) return;
    const res = await api.blockDeviceClient(device._id, mac, !currentBlocked);
    if (res.success) {
      fetchCustomer360();
    } else {
      alert(res.error || 'Failed to block/unblock client');
    }
  };

  // Handle Remote Reboot
  const handleRebootDevice = async () => {
    if (!device || !confirm(`Reboot ONT device ${device.serialNumber}?`)) return;
    const res = await api.rebootDevice(device._id);
    if (res.success) {
      alert('Reboot command successfully sent and verified.');
      fetchCustomer360();
    } else {
      alert(res.error || 'Reboot command failed');
    }
  };

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview & Profile', icon: User },
    { id: 'telemetry', label: 'ONT Telemetry', icon: Radio },
    { id: 'wifi', label: 'Wi-Fi Radios', icon: Wifi },
    { id: 'clients', label: 'Connected Devices', icon: Smartphone, count: device?.connectedClients?.length || 0 },
    { id: 'fiber', label: 'Fiber GIS Route', icon: MapPin },
    { id: 'tickets', label: 'Tickets', icon: Ticket, count: data?.openTickets?.length || 0 },
    { id: 'jobs', label: 'Field Jobs', icon: Wrench, count: data?.pastJobs?.length || 0 },
    { id: 'audit', label: 'Audit & Commands', icon: History },
  ];

  return (
    <Shell
      portalType="operator"
      title={customer ? `Customer 360: ${customer.fullName}` : 'Customer 360'}
      breadcrumbs={[
        { label: 'Customers', href: '/operator/customers' },
        { label: customer?.accountNumber || 'Subscriber 360' },
      ]}
      primaryAction={
        <div className="flex items-center space-x-2">
          {device && (
            <>
              <Button onClick={() => setIsWifiModalOpen(true)} variant="primary" size="sm">
                <Wifi className="w-4 h-4 mr-1.5" />
                <span>Configure Wi-Fi</span>
              </Button>
              <Button onClick={handleRebootDevice} variant="outline" size="sm">
                <Power className="w-4 h-4 mr-1.5 text-[#B45309]" />
                <span>Reboot ONT</span>
              </Button>
            </>
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
          <div className="space-y-6">
            {/* Top Identity & AI Health Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Subscriber Card */}
              <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center font-bold text-[#1677FF] text-lg">
                      {customer.fullName?.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-bold text-[#0F172A]">{customer.fullName}</h2>
                        <Badge variant={customer.status === 'active' ? 'success' : 'warning'}>
                          {customer.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-[#64748B] mt-1 font-mono">
                        <span className="text-[#1677FF]">{customer.accountNumber}</span>
                        <span>•</span>
                        <span>{customer.serviceId}</span>
                        <span>•</span>
                        <span>{customer.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-[#64748B] font-semibold">{customer.servicePlan?.name}</span>
                    <p className="text-sm font-bold text-[#0F172A] mt-0.5">
                      {customer.servicePlan?.downloadSpeedMbps} Mbps Unlimited
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#E2E8F0] text-xs">
                  <div>
                    <span className="text-[#94A3B8]">Installation Address</span>
                    <p className="text-[#334155] truncate">{customer.address?.street}, {customer.address?.area}</p>
                  </div>
                  <div>
                    <span className="text-[#94A3B8]">WAN Username</span>
                    <p className="text-[#334155] font-mono">{customer.wanConfig?.pppoeUsername || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[#94A3B8]">Assigned ONT</span>
                    <p className="text-[#334155] font-mono">{device?.serialNumber || 'Unassigned'}</p>
                  </div>
                  <div>
                    <span className="text-[#94A3B8]">Billing Status</span>
                    <p className="text-[#047857] font-semibold uppercase">{customer.servicePlan?.billingStatus}</p>
                  </div>
                </div>
              </div>

              {/* AI Health Score Card */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bot className="w-4 h-4 text-[#1677FF]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">AI Health Score</span>
                  </div>
                  <span className="text-2xl font-black text-[#1677FF]">{aiBrief.healthScore || 90}/100</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {(aiBrief.insights || []).slice(0, 2).map((ins: string, idx: number) => (
                    <div key={idx} className="flex items-start space-x-2 text-[#334155]">
                      <span className="text-[#1677FF] font-bold">•</span>
                      <span>{ins}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#E2E8F0]">
                  <span className="text-[11px] text-[#94A3B8]">
                    Optical: <strong className="text-[#334155]">{device?.currentRxPowerDbm || -21.4} dBm</strong> | State: <strong className="text-[#047857]">{device?.status || 'Online'}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            {/* Tab 1: Overview & WAN Profile */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-[#0F172A] flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-[#1677FF]" />
                    <span>WAN Interface & Broadband Routing</span>
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
                      <span className="text-[#64748B]">Connection Mode</span>
                      <span className="font-semibold text-[#1E293B]">{customer.wanConfig?.connectionType || 'PPPoE'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#E2E8F0]">
                      <span className="text-[#64748B]">PPPoE Username</span>
                      <span className="font-mono font-bold text-[#1677FF]">{customer.wanConfig?.pppoeUsername || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#E2E8F0]">
                      <span className="text-[#64748B]">PPPoE Password</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-[#0F172A]">
                          {showPppoePass
                            ? (customer.wanConfig?.pppoePassword || 'Password123')
                            : '••••••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPppoePass(!showPppoePass)}
                          className="text-[#64748B] hover:text-[#0F172A] transition p-1"
                          title={showPppoePass ? 'Hide Password' : 'Show Password'}
                        >
                          {showPppoePass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#E2E8F0]">
                      <span className="text-[#64748B]">VLAN Tagging</span>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                        customer.wanConfig?.vlanEnabled && customer.wanConfig?.vlanId
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {customer.wanConfig?.vlanEnabled && customer.wanConfig?.vlanId
                          ? `VLAN ${customer.wanConfig.vlanId} (Tagged Trunk)`
                          : 'Untagged (Access)'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#E2E8F0]">
                      <span className="text-[#64748B]">Port Tagging Status</span>
                      <span className="font-mono text-[#334155]">
                        {customer.wanConfig?.vlanEnabled && customer.wanConfig?.vlanId
                          ? `GE Ports [LAN1-LAN4] → Tagged (VID ${customer.wanConfig.vlanId})`
                          : 'GE Ports [LAN1-LAN4] → Untagged (Native Access)'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
                      <span className="text-[#64748B]">IPv4 Private / CGNAT Gateway</span>
                      <span className="font-mono text-[#1E293B]">{device?.ipAddress || <span className="text-amber-600 font-sans">Unassigned</span>}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-[#64748B]">Primary DNS Server</span>
                      <span className="font-mono text-[#1E293B]">{customer.wanConfig?.dnsPrimary || '8.8.8.8'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-[#0F172A] flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-[#6D28D9]" />
                    <span>Hardware Capability Matrix</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b border-[#E2E8F0]">
                      <span className="text-[#64748B]">Dual-Band Wi-Fi (2.4G / 5G)</span>
                      <Badge variant={capabilities.supportsDualBandWifi ? 'success' : 'neutral'}>
                        {capabilities.supportsDualBandWifi ? 'Supported' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-[#E2E8F0]">
                      <span className="text-[#64748B]">Remote WAN Profile Editing</span>
                      <Badge variant={capabilities.supportsWanProfileEdit ? 'success' : 'neutral'}>
                        {capabilities.supportsWanProfileEdit ? 'Supported' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-[#E2E8F0]">
                      <span className="text-[#64748B]">Connected Device MAC Blocking</span>
                      <Badge variant={capabilities.supportsConnectedClientBlock ? 'success' : 'neutral'}>
                        {capabilities.supportsConnectedClientBlock ? 'Supported' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-[#64748B]">TR-069 CWMP / USP Protocol</span>
                      <Badge variant="info">TR-069 Active</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: ONT Telemetry & Optical History */}
            {activeTab === 'telemetry' && device && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl space-y-1">
                    <span className="text-xs text-[#64748B]">RX Optical Power</span>
                    <p className="text-2xl font-bold text-[#047857]">{device.currentRxPowerDbm || -21.4} dBm</p>
                    <p className="text-[11px] text-[#94A3B8]">Threshold: -27.0 dBm</p>
                  </div>
                  <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl space-y-1">
                    <span className="text-xs text-[#64748B]">TX Optical Power</span>
                    <p className="text-2xl font-bold text-[#1677FF]">{device.currentTxPowerDbm || 2.1} dBm</p>
                    <p className="text-[11px] text-[#94A3B8]">Normal Range (+0.5 to +5.0)</p>
                  </div>
                  <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl space-y-1">
                    <span className="text-xs text-[#64748B]">CPU / RAM Usage</span>
                    <p className="text-2xl font-bold text-[#0F172A]">{device.cpuUsagePercent || 18}% / {device.memoryUsagePercent || 42}%</p>
                    <p className="text-[11px] text-[#94A3B8]">Temp: {device.temperatureC || 44}°C</p>
                  </div>
                  <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl space-y-1">
                    <span className="text-xs text-[#64748B]">ONT Uptime</span>
                    <p className="text-2xl font-bold text-[#0F172A]">{Math.round((device.uptimeSeconds || 86400) / 3600)} hrs</p>
                    <p className="text-[11px] text-[#94A3B8]">Firmware: {device.softwareVersion || 'V5R019'}</p>
                  </div>
                </div>

                {/* Optical History Table */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-3">
                  <h3 className="text-sm font-bold text-[#0F172A]">Historical RX Optical Power Readings</h3>
                  <div className="space-y-2">
                    {(device.rxPowerHistory || []).map((rx: any, idx: number) => (
                      <div key={idx} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-3">
                          <Signal className="w-4 h-4 text-[#047857]" />
                          <span className="font-mono font-semibold text-[#1E293B]">{rx.valueDbm} dBm</span>
                        </div>
                        <span className="text-[#64748B]">{new Date(rx.timestamp).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Wi-Fi Radios */}
            {activeTab === 'wifi' && device && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 2.4 GHz Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-[#0F172A]">2.4 GHz Wi-Fi Radio</h3>
                    <Badge variant={device.wifi24?.enabled ? 'success' : 'neutral'}>
                      {device.wifi24?.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
                      <span className="text-[#64748B]">SSID Name</span>
                      <span className="font-semibold text-[#1E293B]">{device.wifi24?.ssid}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
                      <span className="text-[#64748B]">Channel / Bandwidth</span>
                      <span className="font-mono text-[#1E293B]">Channel {device.wifi24?.channel} ({device.wifi24?.bandwidthMhz} MHz)</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-[#64748B]">Security Encryption</span>
                      <span className="font-semibold text-[#1E293B]">{device.wifi24?.securityMode}</span>
                    </div>
                  </div>
                </div>

                {/* 5 GHz Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-[#0F172A]">5 GHz AC/AX Wi-Fi Radio</h3>
                    <Badge variant={device.wifi5g?.enabled ? 'success' : 'neutral'}>
                      {device.wifi5g?.enabled ? 'High-Speed Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
                      <span className="text-[#64748B]">SSID Name</span>
                      <span className="font-semibold text-[#1E293B]">{device.wifi5g?.ssid}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
                      <span className="text-[#64748B]">Channel / Bandwidth</span>
                      <span className="font-mono text-[#1E293B]">Channel {device.wifi5g?.channel} ({device.wifi5g?.bandwidthMhz} MHz)</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-[#64748B]">Security Encryption</span>
                      <span className="font-semibold text-[#1E293B]">{device.wifi5g?.securityMode}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Connected LAN / WLAN Devices */}
            {activeTab === 'clients' && device && (
              <div className="space-y-4">
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-[#0F172A]">Active Connected Clients & MAC Filter</h3>
                  <div className="space-y-2.5">
                    {(device.connectedClients || []).map((client: any) => (
                      <div
                        key={client.mac}
                        className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <Smartphone className="w-5 h-5 text-[#1677FF]" />
                          <div>
                            <p className="text-xs font-semibold text-[#0F172A]">{client.hostname || 'Client Device'}</p>
                            <div className="flex items-center space-x-2 text-[11px] text-[#64748B] font-mono">
                              <span>{client.mac}</span>
                              <span>•</span>
                              <span>{client.ip}</span>
                              <span>•</span>
                              <span>{client.interfaceType}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Badge variant={client.isBlocked ? 'danger' : 'success'}>
                            {client.isBlocked ? 'Blocked' : 'Active'}
                          </Badge>
                          <Button
                            size="sm"
                            variant={client.isBlocked ? 'success' : 'danger'}
                            onClick={() => handleToggleBlockClient(client.mac, client.isBlocked)}
                          >
                            {client.isBlocked ? 'Unblock Client' : 'Block Client'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: Fiber GIS Path */}
            {activeTab === 'fiber' && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#0F172A] flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-[#047857]" />
                    <span>Physical Fiber Route Tracing</span>
                  </h3>
                  <Badge variant="info">
                    Total Route: {fiberRoute?.totalDistanceMeters || 450}m | Est. Loss: {fiberRoute?.estimatedTotalLossDb || 2.4} dB
                  </Badge>
                </div>

                <div className="space-y-3 pt-2">
                  {(fiberRoute?.pathNodes || []).map((node: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-full bg-[#DBEAFE] text-[#1677FF] font-bold flex items-center justify-center text-xs">
                          {node.step}
                        </span>
                        <div>
                          <p className="font-semibold text-[#0F172A]">{node.name}</p>
                          <span className="font-mono text-[#64748B]">{node.nodeCode} ({node.nodeType})</span>
                        </div>
                      </div>
                      <Badge variant="success">{node.status || 'healthy'}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </StateWrapper>

      {/* Wi-Fi Configuration Modal */}
      <Modal
        isOpen={isWifiModalOpen}
        onClose={() => setIsWifiModalOpen(false)}
        title="Reconfigure Subscriber Wi-Fi"
        subtitle="Queues asynchronous command with post-execution verification read-back."
      >
        <form onSubmit={handleApplyWifi} className="space-y-4">
          <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-xs text-[#1D4ED8]">
            Changes will be enqueued and pushed via TR-069 session with 2-phase parameter verification.
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#1E293B]">5 GHz Wi-Fi Settings</h4>
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

          <div className="space-y-3 pt-3 border-t border-[#E2E8F0]">
            <h4 className="text-xs font-bold text-[#1E293B]">2.4 GHz Wi-Fi Settings</h4>
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

          <div className="flex justify-end space-x-3 pt-4 border-t border-[#E2E8F0]">
            <Button type="button" variant="outline" onClick={() => setIsWifiModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Queue & Apply Changes
            </Button>
          </div>
        </form>
      </Modal>
    </Shell>
  );
};
