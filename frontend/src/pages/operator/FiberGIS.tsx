import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Layers,
  Search,
  Server,
  Radio,
  AlertTriangle,
  Wrench,
  Eye,
  Crosshair,
  ArrowRight,
  ShieldAlert,
  Activity,
} from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button, Input } from '../../components/ui/Button.js';
import { api } from '../../services/api.js';

export const FiberGIS: React.FC = () => {
  const [layers, setLayers] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [traceResult, setTraceResult] = useState<any>(null);
  const [faultImpactResult, setFaultImpactResult] = useState<any>(null);
  const [activeLayerFilters, setActiveLayerFilters] = useState({
    olts: true,
    nodes: true,
    cables: true,
    customers: true,
    faultsOnly: false,
  });

  const fetchLayers = async () => {
    setIsLoading(true);
    setError(null);
    const res = await api.getGisLayers();
    setIsLoading(false);
    if (res.success) {
      setLayers(res.layers);
    } else {
      setError(res.error || 'Failed to fetch GIS spatial layers');
    }
  };

  useEffect(() => {
    fetchLayers();
  }, []);

  // Trace Customer Route
  const handleTraceCustomer = async (customerId: string) => {
    const res = await api.traceCustomerRoute(customerId);
    if (res.success) {
      setTraceResult(res.trace);
      setFaultImpactResult(null);
    } else {
      alert(res.error || 'Route trace failed');
    }
  };

  // Fault Impact Simulation
  const handleSimulateCut = async (componentType: string, componentId: string) => {
    const res = await api.calculateFaultImpact(componentType, componentId);
    if (res.success) {
      setFaultImpactResult(res.impact);
      setTraceResult(null);
    } else {
      alert(res.error || 'Impact calculation failed');
    }
  };

  return (
    <Shell
      portalType="operator"
      title="Physical Plant Fiber GIS & Route Tracer"
      breadcrumbs={[{ label: 'Fiber GIS' }]}
      primaryAction={
        <div className="flex items-center space-x-2">
          <Badge variant="info">Geo-Spatial Graph Active</Badge>
        </div>
      }
    >
      <StateWrapper isLoading={isLoading} error={error} onRetry={fetchLayers}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Map Viewport (Visual GIS Interactive Canvas) */}
          <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl p-6 flex flex-col justify-between min-h-[560px] relative overflow-hidden shadow-2xl">
            {/* Map Header Controls */}
            <div className="flex items-center justify-between z-10 bg-[#F8FAFC] backdrop-blur-md p-3 rounded-xl border border-[#E2E8F0]">
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-[#64748B] font-semibold">Layers:</span>
                <button
                  onClick={() =>
                    setActiveLayerFilters({
                      ...activeLayerFilters,
                      olts: !activeLayerFilters.olts,
                    })
                  }
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    activeLayerFilters.olts ? 'bg-sky-600 text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                  }`}
                >
                  OLTs ({layers?.olts?.length || 0})
                </button>
                <button
                  onClick={() =>
                    setActiveLayerFilters({
                      ...activeLayerFilters,
                      nodes: !activeLayerFilters.nodes,
                    })
                  }
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    activeLayerFilters.nodes ? 'bg-emerald-600 text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                  }`}
                >
                  FAT & Splitters ({layers?.nodes?.length || 0})
                </button>
                <button
                  onClick={() =>
                    setActiveLayerFilters({
                      ...activeLayerFilters,
                      cables: !activeLayerFilters.cables,
                    })
                  }
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    activeLayerFilters.cables ? 'bg-purple-600 text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                  }`}
                >
                  Fiber Cables ({layers?.segments?.length || 0})
                </button>
              </div>

              <span className="text-xs font-mono text-[#64748B]">Koramangala Sector 4 Map Grid</span>
            </div>

            {/* Interactive Topological Nodes Canvas Representation */}
            <div className="my-8 relative w-full flex-1 flex flex-col items-center justify-center p-6 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <div className="w-full max-w-lg space-y-6">
                {/* OLT Hub */}
                <div className="flex items-center justify-center">
                  <div
                    onClick={() => setSelectedElement({ type: 'OLT', data: layers?.olts?.[0] })}
                    className="px-4 py-2.5 bg-[#EFF6FF] border border-sky-500/50 hover:border-sky-400 rounded-xl flex items-center space-x-3 cursor-pointer shadow-lg shadow-sky-500/10 transition"
                  >
                    <Server className="w-5 h-5 text-[#1677FF]" />
                    <div>
                      <p className="text-xs font-bold text-[#0F172A]">Central OLT 01 (Chassis)</p>
                      <p className="text-[10px] font-mono text-[#64748B]">10.200.1.10 • 16 PON Ports</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center text-xs text-[#94A3B8] font-mono">
                  ↓ 48F Feeder Fiber Cable (FIB-FEED-01) - 450m (0.16 dB loss)
                </div>

                {/* Primary Splitter */}
                <div className="flex items-center justify-center">
                  <div
                    onClick={() => setSelectedElement({ type: 'SPLITTER', data: layers?.nodes?.[1] })}
                    className="px-4 py-2.5 bg-[#F5F3FF] border border-purple-500/50 hover:border-purple-400 rounded-xl flex items-center space-x-3 cursor-pointer shadow-lg shadow-purple-500/10 transition"
                  >
                    <Layers className="w-5 h-5 text-[#6D28D9]" />
                    <div>
                      <p className="text-xs font-bold text-[#0F172A]">Primary Splitter SPL-01 (1:8)</p>
                      <p className="text-[10px] text-[#64748B]">Junction 4th Block • 6/8 Ports Active</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center text-xs text-[#94A3B8] font-mono">
                  ↓ 24F Distribution Cable (FIB-DIST-04) - 580m (0.22 dB loss)
                </div>

                {/* FAT Box & Customer Endpoint */}
                <div className="flex items-center justify-center space-x-4">
                  <div
                    onClick={() => setSelectedElement({ type: 'FAT_BOX', data: layers?.nodes?.[3] })}
                    className="px-4 py-2.5 bg-[#ECFDF5] border border-emerald-500/50 hover:border-emerald-400 rounded-xl flex items-center space-x-3 cursor-pointer shadow-lg shadow-emerald-500/10 transition"
                  >
                    <MapPin className="w-5 h-5 text-[#047857]" />
                    <div>
                      <p className="text-xs font-bold text-[#0F172A]">Pole FAT Box 04</p>
                      <p className="text-[10px] text-[#64748B]">11/16 Drop Ports Used</p>
                    </div>
                  </div>

                  <div
                    onClick={() => handleTraceCustomer(layers?.customers?.[0]?.id)}
                    className="px-4 py-2.5 bg-white border border-[#CBD5E1] hover:border-sky-400 rounded-xl flex items-center space-x-3 cursor-pointer transition"
                  >
                    <Radio className="w-5 h-5 text-[#1677FF]" />
                    <div>
                      <p className="text-xs font-bold text-[#0F172A]">Arjun Sharma (ONT)</p>
                      <p className="text-[10px] font-mono text-[#047857]">-21.4 dBm Normal</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Status bar */}
            <div className="flex items-center justify-between text-xs text-[#64748B] pt-2 border-t border-[#E2E8F0]">
              <span>Projection: EPSG:4326 | Standard: G.652.D Single-Mode</span>
              <span className="text-[#047857] font-semibold">Topology Validated • Zero Broken Nodes</span>
            </div>
          </div>

          {/* Right Sidebar: Trace & Fault Correlation Results */}
          <div className="space-y-4">
            {/* Quick Actions Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center space-x-2">
                <Crosshair className="w-4 h-4 text-[#1677FF]" />
                <span>GIS Network Diagnostic Tools</span>
              </h3>

              <div className="space-y-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    if (layers?.customers?.[0]) {
                      handleTraceCustomer(layers.customers[0].id);
                    }
                  }}
                >
                  <ArrowRight className="w-4 h-4 mr-2 text-[#1677FF]" />
                  <span>Trace Route: Arjun Sharma</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    if (layers?.nodes?.[3]) {
                      handleSimulateCut('FIBER_NODE', layers.nodes[3].id);
                    }
                  }}
                >
                  <AlertTriangle className="w-4 h-4 mr-2 text-[#B45309]" />
                  <span>Simulate Fault: FAT Box 04 Damage</span>
                </Button>
              </div>
            </div>

            {/* End-to-End Route Trace Output */}
            {traceResult && (
              <div className="bg-white border border-[#BFDBFE] rounded-xl p-5 space-y-3 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#0F172A]">End-to-End Mapped Route</h3>
                  <Badge variant="info">{traceResult.totalDistanceMeters}m Total</Badge>
                </div>
                <div className="space-y-2 text-xs">
                  {traceResult.pathNodes.map((n: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-[#DBEAFE] text-[#1677FF] flex items-center justify-center font-bold text-[10px]">
                          {n.step}
                        </span>
                        <div>
                          <p className="font-semibold text-[#1E293B]">{n.name}</p>
                          <span className="text-[10px] text-[#64748B] font-mono">{n.nodeCode}</span>
                        </div>
                      </div>
                      <Badge variant="success">{n.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reverse Fault Impact Output */}
            {faultImpactResult && (
              <div className="bg-white border border-[#FECACA] rounded-xl p-5 space-y-3 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-rose-200">Reverse Fault Impact Analysis</h3>
                  <Badge variant="danger">{faultImpactResult.totalImpactedCustomers} Affected</Badge>
                </div>

                <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs space-y-1 text-[#334155]">
                  <p>
                    Fault Source: <strong className="text-[#0F172A]">{faultImpactResult.faultName}</strong>
                  </p>
                  <p>
                    Revenue at Risk: <strong className="text-[#B91C1C]">₹{faultImpactResult.totalMonthlyRevenueAtRisk}/mo</strong>
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="font-semibold text-[#64748B]">Impacted Subscribers:</p>
                  {faultImpactResult.impactedCustomers.map((c: any) => (
                    <div
                      key={c.customerId}
                      className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-[#1E293B]">{c.name}</p>
                        <p className="text-[10px] text-[#64748B] font-mono">{c.accountNumber} • {c.phone}</p>
                      </div>
                      <Badge variant="neutral">₹{c.monthlyFee}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </StateWrapper>
    </Shell>
  );
};
