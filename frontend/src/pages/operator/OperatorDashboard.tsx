import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Radio,
  Server,
  AlertTriangle,
  Ticket,
  Wrench,
  Bot,
  Activity,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Copy,
  Check,
  Globe,
  Zap,
  Cpu,
  RefreshCw,
  Power,
} from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';

export const OperatorDashboard: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [cwmpStats, setCwmpStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [isHitsModalOpen, setIsHitsModalOpen] = useState(false);

  const navigate = useNavigate();
  const { tenant } = useAuth();

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dashRes, cwmpRes] = await Promise.all([
        api.getOperatorDashboard(),
        api.getCwmpStatus(),
      ]);

      if (dashRes.success) {
        setSummary(dashRes.summary);
      } else {
        setError(dashRes.error || 'Failed to load operator dashboard');
      }

      if (cwmpRes.success) {
        setCwmpStats(cwmpRes);
      }
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Error fetching dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh CWMP hitting stats every 15 seconds
    const interval = setInterval(async () => {
      const cwmpRes = await api.getCwmpStatus();
      if (cwmpRes.success) setCwmpStats(cwmpRes);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const s = summary || {};

  const tenantSlug = tenant?.slug || 'rudra';
  const isPrimaryTenant = tenantSlug === 'rudra' || tenantSlug === 'default';
  const activeCwmpUrl = cwmpStats?.cwmpUrl || (isPrimaryTenant ? 'http://ciniplay.in:7547' : `http://${tenantSlug}.ciniplay.in:7547`);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(activeCwmpUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Shell
      portalType="operator"
      title="NOC Operations Command Center"
      breadcrumbs={[{ label: 'Dashboard' }]}
      primaryAction={
        <div className="flex items-center space-x-2">
          <Button onClick={() => navigate('/operator/customers/new')} variant="primary" size="sm">
            <span>Provision Customer</span>
            <ArrowUpRight className="w-4 h-4 ml-1" />
          </Button>
          <Button onClick={() => navigate('/operator/ai')} variant="secondary" size="sm">
            <Bot className="w-4 h-4 mr-1 text-[#1677FF]" />
            <span>AI Command</span>
          </Button>
        </div>
      }
    >
      <StateWrapper
        isLoading={isLoading}
        error={error}
        onRetry={fetchDashboard}
        lastUpdated={lastUpdated}
        onRefresh={fetchDashboard}
      >
        {/* TR-069 CWMP ACS Gateway Banner */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-white via-[#F8FAFC] to-white border border-[#BFDBFE] rounded-2xl shadow-lg space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1677FF]">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-[#0F172A] tracking-wide">TR-069 CWMP ACS Gateway</h3>
                  <Badge variant="success" dot>
                    Port 7547 Active
                  </Badge>
                </div>
                <p className="text-xs text-[#334155]">
                  Configure this ACS URL in your ONTs (Huawei, ZTE, Syrotech, Netlink, Digisol, V-SOL).
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsHitsModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#EEF2F7] text-xs font-semibold text-[#1D4ED8] border border-[#CBD5E1] transition flex items-center space-x-1.5"
              >
                <Activity className="w-3.5 h-3.5 text-[#047857]" />
                <span>Router Hits: {cwmpStats?.totalHits || 0}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
            {/* ACS URL Box */}
            <div className="md:col-span-6 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
              <div className="overflow-hidden mr-2">
                <span className="text-[10px] text-[#64748B] uppercase font-semibold block">ACS Server URL:</span>
                <span className="text-sm font-mono text-[#1677FF] font-bold truncate block">{activeCwmpUrl}</span>
              </div>
              <Button size="sm" variant="secondary" onClick={handleCopyUrl} className="shrink-0">
                {copied ? <Check className="w-3.5 h-3.5 text-[#047857] mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </Button>
            </div>

            {/* Quick ONT Config Specs */}
            <div className="md:col-span-6 grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] block font-semibold">ACS Username:</span>
                <span className="font-mono text-[#1E293B] font-bold">admin</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] block font-semibold">ACS Password:</span>
                <span className="font-mono text-[#1E293B] font-bold">admin123</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] block font-semibold">Inform Interval:</span>
                <span className="font-mono text-[#047857] font-bold">60 sec</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Subscribers"
            value={s.totalCustomers || 0}
            subtitle={`${s.activeCustomers || 0} active subscriptions`}
            icon={Users}
            variant="sky"
            onClick={() => navigate('/operator/customers')}
          />
          <StatCard
            title="ONT Online Fleet"
            value={`${s.onlineRatio || 98.6}%`}
            subtitle={`${s.onlineDevices || 0} / ${s.totalDevices || 0} ONTs Online`}
            icon={Radio}
            variant="emerald"
            onClick={() => navigate('/operator/devices')}
          />
          <StatCard
            title="Optical Power Alerts"
            value={s.opticalWarnings || 0}
            subtitle="Signal below -27.0 dBm threshold"
            icon={AlertTriangle}
            variant={s.opticalWarnings > 0 ? 'amber' : 'slate'}
            onClick={() => navigate('/operator/incidents')}
          />
          <StatCard
            title="Active Incidents / SLA"
            value={s.activeIncidents || 0}
            subtitle={`${s.openTickets || 0} Open Tickets | 0 Breaches`}
            icon={Ticket}
            variant={s.activeIncidents > 0 ? 'rose' : 'slate'}
            onClick={() => navigate('/operator/incidents')}
          />
        </div>

        {/* Live ONT Fleet Telemetry Status Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Active Reporting ONTs */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-[#047857] animate-pulse" />
                <h3 className="text-sm font-bold text-[#0F172A]">Active Reporting ONT Fleet ({s.onlineDevices || 0})</h3>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/operator/devices?status=online')} className="text-xs py-1 px-2.5">
                View All Online →
              </Button>
            </div>

            {s.reportingDevices && s.reportingDevices.length > 0 ? (
              <div className="divide-y divide-[#EEF2F7]">
                {s.reportingDevices.map((d: any) => (
                  <div key={d._id} className="py-2.5 flex items-center justify-between hover:bg-[#F8FAFC] px-1 rounded-lg transition">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-[#0F172A]">{d.serialNumber}</span>
                        <Badge variant="success" dot>Online</Badge>
                      </div>
                      <p className="text-[11px] text-[#64748B]">
                        {d.customerId?.fullName ? `${d.customerId.fullName} (${d.customerId.accountNumber})` : 'Unassigned Pool'} · {d.modelName || 'GPON ONT'}
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <span className={`text-xs font-mono font-bold ${d.currentRxPowerDbm < -27 ? 'text-[#B91C1C]' : 'text-[#047857]'}`}>
                        {d.currentRxPowerDbm != null ? `${d.currentRxPowerDbm} dBm` : 'N/A'}
                      </span>
                      <p className="text-[10px] text-[#94A3B8] font-mono">
                        {d.lastInform ? new Date(d.lastInform).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#94A3B8] italic">
                No active reporting ONTs in this tenant fleet yet.
              </div>
            )}
          </div>

          {/* Offline / Silent ONTs */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
              <div className="flex items-center space-x-2">
                <Power className="w-4 h-4 text-[#B91C1C]" />
                <h3 className="text-sm font-bold text-[#0F172A]">Offline / Unreachable ONTs ({s.offlineDevices || 0})</h3>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/operator/devices?status=offline')} className="text-xs py-1 px-2.5">
                View All Offline →
              </Button>
            </div>

            {s.offlineDevicesList && s.offlineDevicesList.length > 0 ? (
              <div className="divide-y divide-[#EEF2F7]">
                {s.offlineDevicesList.map((d: any) => (
                  <div key={d._id} className="py-2.5 flex items-center justify-between hover:bg-[#F8FAFC] px-1 rounded-lg transition">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-[#0F172A]">{d.serialNumber}</span>
                        <Badge variant="danger" dot>Offline</Badge>
                      </div>
                      <p className="text-[11px] text-[#64748B]">
                        {d.customerId?.fullName ? `${d.customerId.fullName} (${d.customerId.accountNumber})` : 'Unassigned Pool'} · {d.modelName || 'GPON ONT'}
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="py-0.5 px-2 text-[11px]"
                        onClick={async () => {
                          await api.summonDevice(d._id);
                          fetchDashboard();
                        }}
                      >
                        <Zap className="w-3 h-3 mr-1 text-amber-500" />
                        <span>Summon</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#94A3B8] italic">
                All assigned fleet ONTs are currently online and reachable.
              </div>
            )}
          </div>
        </div>

        {/* AI NOC Intelligence Briefing */}
        <div className="p-4 bg-white border border-[#CBD5E1] rounded-2xl flex items-start space-x-3.5 shadow-xs">
          <div className="p-2.5 rounded-xl bg-[#EFF6FF] text-[#1677FF] shrink-0 border border-[#BFDBFE]">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F172A]">AI Diagnostic Agent — Real-time Correlation</h3>
              <Badge variant="purple">Automated Reasoning</Badge>
            </div>
            <p className="text-xs text-[#334155] mt-1 leading-relaxed">
              {s.aiIncidentSummary ||
                'Network healthy. No common splitter or feeder fiber cuts detected.'}
            </p>
            <div className="mt-2.5 flex items-center space-x-3">
              <button
                onClick={() => navigate('/operator/ai')}
                className="text-xs text-[#1677FF] hover:text-[#1D4ED8] font-bold flex items-center space-x-1"
              >
                <span>Launch Interactive AI Command Center</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Access Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            onClick={() => navigate('/operator/gis')}
            className="p-5 bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-xl cursor-pointer transition space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#64748B] uppercase">Physical Fiber GIS</span>
              <Badge variant="info">Multi-Layer</Badge>
            </div>
            <p className="text-sm font-semibold text-[#1E293B]">Interactive GIS Map & Route Tracing</p>
            <p className="text-xs text-[#64748B]">
              Trace Customer $\to$ Drop $\to$ FAT $\to$ Splitter $\to$ PON $\to$ OLT or calculate cable cut impact.
            </p>
          </div>

          <div
            onClick={() => navigate('/operator/devices')}
            className="p-5 bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-xl cursor-pointer transition space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#64748B] uppercase">ONT Fleet Controls</span>
              <Badge variant="success">TR-069 / TR-369</Badge>
            </div>
            <p className="text-sm font-semibold text-[#1E293B]">Capability-Aware Device Controls</p>
            <p className="text-xs text-[#64748B]">
              Asynchronous Wi-Fi password management, WAN editing, and LAN client blocking.
            </p>
          </div>

          <div
            onClick={() => navigate('/operator/technicians')}
            className="p-5 bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-xl cursor-pointer transition space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#64748B] uppercase">Field Workforce</span>
              <Badge variant="neutral">{s.activeTechnicians || 1} Online</Badge>
            </div>
            <p className="text-sm font-semibold text-[#1E293B]">Technician Dispatch & Evidence</p>
            <p className="text-xs text-[#64748B]">
              Work order assignments, guided checklists, live optical tests, and photo evidence.
            </p>
          </div>
        </div>
      </StateWrapper>

      {/* Live Router Hits Activity Modal */}
      <Modal
        isOpen={isHitsModalOpen}
        onClose={() => setIsHitsModalOpen(false)}
        title="Live TR-069 CWMP Router Activity"
        subtitle="Real-time inbound SOAP Inform packets received from customer CPEs and GPON ONTs."
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-xs">
            <span className="text-[#64748B]">
              Total Recorded Inform Packets: <strong className="text-[#047857] font-mono">{cwmpStats?.totalHits || 0}</strong>
            </span>
            <Badge variant="success" dot>
              Port 7547 Live Ingest
            </Badge>
          </div>

          {(!cwmpStats?.recentHits || cwmpStats.recentHits.length === 0) ? (
            <div className="p-8 text-center bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <Radio className="w-8 h-8 text-[#94A3B8] mx-auto mb-2 animate-pulse" />
              <p className="text-sm font-semibold text-[#334155]">Listening for Inbound Router Traffic...</p>
              <p className="text-xs text-[#64748B] mt-1">
                Configure your ONT with ACS URL <code className="text-[#1677FF] font-mono">{activeCwmpUrl}</code> and it will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {cwmpStats.recentHits.map((hit: any, i: number) => (
                <div
                  key={i}
                  className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-[#0F172A] font-mono">{hit.serialNumber || 'ONT Device'}</span>
                      <Badge variant={hit.status === 'PROVISIONED' ? 'success' : 'info'}>
                        {hit.status}
                      </Badge>
                    </div>
                    <p className="text-[#64748B]">
                      IP: <span className="font-mono text-[#1E293B]">{hit.ip}</span> | Vendor: <span className="text-[#1E293B]">{hit.manufacturer || 'GPON'}</span> ({hit.model || 'ONT'})
                    </p>
                  </div>
                  <span className="text-[11px] text-[#94A3B8] font-mono">
                    {new Date(hit.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-[#E2E8F0]">
            <Button variant="outline" onClick={() => setIsHitsModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
};
