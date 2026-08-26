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
  Plus,
  Compass,
  Cpu,
  Zap,
  Globe,
  Share2,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Camera,
  Navigation,
  FolderPlus,
  Link as LinkIcon,
  Cable,
  Box,
  Split,
  ChevronRight,
  Info,
  Maximize2,
  Moon,
  Sun,
  Tv,
} from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button, Input } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { Tabs } from '../../components/ui/Tabs.js';
import { api } from '../../services/api.js';

type ViewMode = 'satellite' | 'street' | 'dark' | 'topology';
type ActiveTab = 'map' | 'olts' | 'nodes' | 'cables' | 'customers';

export const FiberGIS: React.FC = () => {
  const [layers, setLayers] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dark');
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [selectedElement, setSelectedElement] = useState<any>(null);

  // Search & Trace
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<string>('auto');
  const [isTracing, setIsTracing] = useState(false);
  const [traceResult, setTraceResult] = useState<any>(null);
  const [traceError, setTraceError] = useState<string | null>(null);

  // Layer Filters
  const [activeFilters, setActiveFilters] = useState({
    olts: true,
    splitters: true,
    fats: true,
    cables: true,
    customers: true,
  });

  // Modal States
  const [isAddOltOpen, setIsAddOltOpen] = useState(false);
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
  const [isAddCableOpen, setIsAddCableOpen] = useState(false);
  const [isLinkCustomerOpen, setIsLinkCustomerOpen] = useState(false);
  const [selectedCustomerForLink, setSelectedCustomerForLink] = useState<any>(null);

  // Form States
  const [oltForm, setOltForm] = useState({
    name: '',
    code: '',
    ipAddress: '',
    vendor: 'Huawei',
    modelName: 'MA5800-X7',
    totalSlots: 4,
    totalPonPorts: 16,
    lat: '',
    lng: '',
    address: '',
    photoUrl: '',
  });

  const [nodeForm, setNodeForm] = useState({
    nodeCode: '',
    name: '',
    type: 'FAT_NAP_BOX',
    totalCapacity: 16,
    upstreamNodeId: '',
    oltId: '',
    ponPortId: '',
    lat: '',
    lng: '',
    address: '',
    photoUrl: '',
    notes: '',
  });

  const [cableForm, setCableForm] = useState({
    cableCode: '',
    name: '',
    category: 'DISTRIBUTION',
    fiberStandard: 'G.652.D Single-Mode',
    totalCores: 24,
    liveCores: 0,
    fromNodeId: '',
    toNodeId: '',
    lengthMeters: 100,
    attenuationDbPerKm: 0.35,
    measuredLossDb: 0.05,
    photoUrl: '',
    coordinatesRaw: '',
  });

  const [linkForm, setLinkForm] = useState({
    customerId: '',
    fatBoxId: '',
    fatPortNumber: 1,
    splitterId: '',
    ponPortId: '',
    oltId: '',
    dropCableLengthMeters: 50,
  });

  const fetchLayers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getGisLayers();
      if (res.success) {
        setLayers(res.layers);
      } else {
        setError(res.error || 'Failed to fetch fiber GIS spatial layers');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with network GIS service');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLayers();
  }, []);

  // Universal Search & Route Trace
  const handleUniversalTrace = async (queryToSearch?: string) => {
    const q = queryToSearch || searchQuery;
    if (!q.trim()) return;
    setIsTracing(true);
    setTraceError(null);
    setTraceResult(null);
    try {
      const res = await api.universalTrace(q.trim(), searchType);
      if (res.success) {
        setTraceResult(res.trace);
        setSelectedElement({ type: 'TRACE', data: res.trace });
      } else {
        setTraceError(res.error || 'No fiber route found matching query');
      }
    } catch (err: any) {
      setTraceError(err.message || 'Trace failed');
    } finally {
      setIsTracing(false);
    }
  };

  // Submit Handlers
  const handleCreateOlt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oltForm.name || !oltForm.code || !oltForm.ipAddress) {
      alert('Name, Code, and IP Address are required.');
      return;
    }
    const res = await api.createOlt({
      name: oltForm.name,
      code: oltForm.code,
      ipAddress: oltForm.ipAddress,
      vendor: oltForm.vendor,
      modelName: oltForm.modelName,
      totalSlots: Number(oltForm.totalSlots),
      totalPonPorts: Number(oltForm.totalPonPorts),
      location: {
        lat: oltForm.lat ? parseFloat(oltForm.lat) : 0,
        lng: oltForm.lng ? parseFloat(oltForm.lng) : 0,
        address: oltForm.address || 'Not Configured',
      },
      photos: oltForm.photoUrl ? [oltForm.photoUrl] : [],
    });
    if (res.success) {
      setIsAddOltOpen(false);
      setOltForm({ name: '', code: '', ipAddress: '', vendor: 'Huawei', modelName: 'MA5800-X7', totalSlots: 4, totalPonPorts: 16, lat: '', lng: '', address: '', photoUrl: '' });
      fetchLayers();
    } else {
      alert(res.error || 'Failed to create OLT');
    }
  };

  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeForm.nodeCode || !nodeForm.name) {
      alert('Node Code and Name are required.');
      return;
    }
    const res = await api.createFiberNode({
      nodeCode: nodeForm.nodeCode,
      name: nodeForm.name,
      type: nodeForm.type,
      totalCapacity: Number(nodeForm.totalCapacity),
      upstreamNodeId: nodeForm.upstreamNodeId || undefined,
      oltId: nodeForm.oltId || undefined,
      ponPortId: nodeForm.ponPortId || undefined,
      location: {
        lat: nodeForm.lat ? parseFloat(nodeForm.lat) : 0,
        lng: nodeForm.lng ? parseFloat(nodeForm.lng) : 0,
        address: nodeForm.address || 'Not Configured',
      },
      photos: nodeForm.photoUrl ? [nodeForm.photoUrl] : [],
      notes: nodeForm.notes,
    });
    if (res.success) {
      setIsAddNodeOpen(false);
      setNodeForm({ nodeCode: '', name: '', type: 'FAT_NAP_BOX', totalCapacity: 16, upstreamNodeId: '', oltId: '', ponPortId: '', lat: '', lng: '', address: '', photoUrl: '', notes: '' });
      fetchLayers();
    } else {
      alert(res.error || 'Failed to create Fiber Node');
    }
  };

  const handleCreateCable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cableForm.cableCode || !cableForm.name) {
      alert('Cable Code and Name are required.');
      return;
    }

    let parsedCoords: Array<{ lat: number; lng: number }> = [];
    if (cableForm.coordinatesRaw.trim()) {
      try {
        parsedCoords = JSON.parse(cableForm.coordinatesRaw);
      } catch (_) {
        const pairs = cableForm.coordinatesRaw.split(';').map((p) => p.trim()).filter(Boolean);
        for (const p of pairs) {
          const [lat, lng] = p.split(',').map((n) => parseFloat(n.trim()));
          if (!isNaN(lat) && !isNaN(lng)) parsedCoords.push({ lat, lng });
        }
      }
    }

    const res = await api.createFiberSegment({
      cableCode: cableForm.cableCode,
      name: cableForm.name,
      category: cableForm.category,
      fiberStandard: cableForm.fiberStandard,
      totalCores: Number(cableForm.totalCores),
      liveCores: Number(cableForm.liveCores),
      fromNodeId: cableForm.fromNodeId || undefined,
      toNodeId: cableForm.toNodeId || undefined,
      lengthMeters: Number(cableForm.lengthMeters),
      attenuationDbPerKm: Number(cableForm.attenuationDbPerKm),
      measuredLossDb: Number(cableForm.measuredLossDb),
      photos: cableForm.photoUrl ? [cableForm.photoUrl] : [],
      coordinates: parsedCoords,
    });
    if (res.success) {
      setIsAddCableOpen(false);
      setCableForm({ cableCode: '', name: '', category: 'DISTRIBUTION', fiberStandard: 'G.652.D Single-Mode', totalCores: 24, liveCores: 0, fromNodeId: '', toNodeId: '', lengthMeters: 100, attenuationDbPerKm: 0.35, measuredLossDb: 0.05, photoUrl: '', coordinatesRaw: '' });
      fetchLayers();
    } else {
      alert(res.error || 'Failed to create Fiber Cable Segment');
    }
  };

  const handleLinkCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const custId = linkForm.customerId || selectedCustomerForLink?.id;
    if (!custId) {
      alert('Please select a customer to link.');
      return;
    }
    const res = await api.linkCustomerFiber({
      customerId: custId,
      fatBoxId: linkForm.fatBoxId || undefined,
      fatPortNumber: Number(linkForm.fatPortNumber),
      splitterId: linkForm.splitterId || undefined,
      ponPortId: linkForm.ponPortId || undefined,
      oltId: linkForm.oltId || undefined,
      dropCableLengthMeters: Number(linkForm.dropCableLengthMeters),
    });
    if (res.success) {
      setIsLinkCustomerOpen(false);
      setSelectedCustomerForLink(null);
      fetchLayers();
      alert('Customer Physical Fiber Path linked successfully.');
    } else {
      alert(res.error || 'Failed to link customer fiber path');
    }
  };

  const handleDeleteOlt = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete OLT ${code}? All its PON ports will also be removed.`)) return;
    const res = await api.deleteOlt(id);
    if (res.success) fetchLayers();
    else alert(res.error || 'Delete failed');
  };

  const handleDeleteNode = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete Fiber Node ${code}?`)) return;
    const res = await api.deleteFiberNode(id);
    if (res.success) fetchLayers();
    else alert(res.error || 'Delete failed');
  };

  const handleDeleteCable = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete Fiber Cable ${code}?`)) return;
    const res = await api.deleteFiberSegment(id);
    if (res.success) fetchLayers();
    else alert(res.error || 'Delete failed');
  };

  const summary = layers?.summary || {
    totalOlts: layers?.olts?.length || 0,
    totalPonPorts: layers?.pons?.length || 0,
    totalNodes: layers?.nodes?.length || 0,
    totalSegments: layers?.segments?.length || 0,
    totalCustomers: layers?.customers?.length || 0,
    totalFiberLengthMeters: 0,
    coreMetrics: { totalCores: 0, liveCores: 0, darkCores: 0, utilizationPercent: 0 },
  };

  const coreMetrics = summary.coreMetrics || { totalCores: 0, liveCores: 0, darkCores: 0, utilizationPercent: 0 };

  return (
    <Shell
      portalType="operator"
      title="Telecom-Grade Fiber Network Mapping & Asset Inventory"
      breadcrumbs={[{ label: 'Fiber GIS & Physical Inventory' }]}
      primaryAction={
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsLinkCustomerOpen(true)}
            className="flex items-center space-x-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-50"
          >
            <LinkIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>Link Customer Fiber</span>
          </Button>
          <div className="relative group">
            <Button size="sm" variant="primary" className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Fiber Asset</span>
            </Button>
            <div className="absolute right-0 mt-1 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-xl py-1 hidden group-hover:block z-50">
              <button
                onClick={() => setIsAddOltOpen(true)}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-[#0F172A] hover:bg-[#F1F5F9] flex items-center space-x-2"
              >
                <Server className="w-3.5 h-3.5 text-blue-600" />
                <span>Add OLT Chassis</span>
              </button>
              <button
                onClick={() => setIsAddNodeOpen(true)}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-[#0F172A] hover:bg-[#F1F5F9] flex items-center space-x-2"
              >
                <Box className="w-3.5 h-3.5 text-purple-600" />
                <span>Add FAT / Splitter Node</span>
              </button>
              <button
                onClick={() => setIsAddCableOpen(true)}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-[#0F172A] hover:bg-[#F1F5F9] flex items-center space-x-2"
              >
                <Cable className="w-3.5 h-3.5 text-amber-600" />
                <span>Add Fiber Cable Segment</span>
              </button>
            </div>
          </div>
        </div>
      }
    >
      <StateWrapper isLoading={isLoading} error={error} onRetry={fetchLayers}>
        {/* Core Live Metrics Banner */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white border border-[#E2E8F0] p-3.5 rounded-xl shadow-sm">
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">OLT Chassis</p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-[#0F172A]">{summary.totalOlts}</span>
              <span className="text-xs font-mono text-blue-600">{summary.totalPonPorts} PONs</span>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] p-3.5 rounded-xl shadow-sm">
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">FAT & Splitters</p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-[#0F172A]">{summary.totalNodes}</span>
              <span className="text-xs font-mono text-purple-600">Terminals</span>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] p-3.5 rounded-xl shadow-sm">
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Cable Segments</p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-[#0F172A]">{summary.totalSegments}</span>
              <span className="text-xs font-mono text-amber-600">{(summary.totalFiberLengthMeters / 1000).toFixed(1)} km</span>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] p-3.5 rounded-xl shadow-sm">
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Total Core Capacity</p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-[#0F172A]">{coreMetrics.totalCores}</span>
              <span className="text-xs font-mono text-slate-500">Cores</span>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] p-3.5 rounded-xl shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
            <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Free Dark Fibers</p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-emerald-600">{coreMetrics.darkCores}</span>
              <span className="text-xs font-semibold text-emerald-700">
                {coreMetrics.totalCores > 0 ? `${((coreMetrics.darkCores / coreMetrics.totalCores) * 100).toFixed(0)}% Free` : '100%'}
              </span>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] p-3.5 rounded-xl shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
            <p className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">Core Utilization</p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-blue-600">{coreMetrics.liveCores} Live</span>
              <span className="text-xs font-semibold text-blue-700">{coreMetrics.utilizationPercent}%</span>
            </div>
          </div>
        </div>

        {/* Universal Search & End-to-End Visual Tracer Console */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Compass className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Universal Physical Route Tracer</h3>
                <p className="text-xs text-[#64748B]">Search by Customer, ONT Serial, MAC Address, Splitter, FAT Box, or OLT</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-[#F1F5F9] rounded-lg p-1 text-xs">
                {(['auto', 'customer', 'ont', 'mac', 'splitter', 'fat', 'olt'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSearchType(t)}
                    className={`px-2.5 py-1 rounded capitalize font-medium transition ${
                      searchType === t ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2 w-full lg:w-96">
                <Input
                  placeholder="Enter Account #, ONT Serial, MAC, FAT-01, OLT..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUniversalTrace()}
                  className="text-xs"
                />
                <Button size="sm" variant="primary" onClick={() => handleUniversalTrace()} isLoading={isTracing}>
                  <Search className="w-3.5 h-3.5 mr-1" />
                  Trace
                </Button>
              </div>
            </div>
          </div>

          {traceError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{traceError}</span>
            </div>
          )}

          {/* Trace Visual Journey Display */}
          {traceResult && (
            <div className="mt-5 pt-5 border-t border-[#E2E8F0]">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                <div className="flex items-center space-x-3">
                  <Badge variant={traceResult.isFullyLinked ? 'success' : 'warning'}>
                    {traceResult.isFullyLinked ? 'Full Physical Linkage Verified' : 'Partially Configured Path'}
                  </Badge>
                  <span className="text-xs font-bold text-[#0F172A]">Target: {traceResult.matchedTarget?.label}</span>
                  <span className="text-xs font-mono text-[#64748B]">({traceResult.searchType.toUpperCase()})</span>
                </div>

                <div className="flex items-center space-x-4 text-xs font-mono">
                  {traceResult.oltName && <span className="text-blue-600 font-bold">OLT: {traceResult.oltName}</span>}
                  {traceResult.ponPortIdentifier && <span className="text-purple-600 font-bold">PON: {traceResult.ponPortIdentifier}</span>}
                  <span className="text-[#64748B]">Total Est. Distance: {traceResult.totalDistanceMeters}m</span>
                  <span className="text-[#64748B]">Est. Loss: {traceResult.estimatedTotalLossDb} dB</span>
                </div>
              </div>

              {/* Visual Hop Nodes Flow */}
              <div className="overflow-x-auto pb-3">
                <div className="flex items-center min-w-max space-x-3 py-2">
                  {traceResult.pathNodes?.map((hop: any, idx: number) => {
                    const isConfigured = hop.isConfigured !== false && hop.status !== 'NOT_CONFIGURED';
                    return (
                      <React.Fragment key={idx}>
                        <div
                          className={`p-3.5 rounded-xl border transition shadow-sm w-64 ${
                            isConfigured
                              ? 'bg-white border-blue-200 hover:border-blue-400'
                              : 'bg-amber-50/60 border-dashed border-amber-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                              Step {hop.step}: {hop.nodeType.replace(/_/g, ' ')}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                isConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isConfigured ? 'LINKED' : 'NOT CONFIGURED'}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-[#0F172A] truncate" title={hop.name}>
                            {hop.name}
                          </p>
                          <p className="text-[11px] font-mono text-blue-600 mt-0.5 truncate">{hop.nodeCode}</p>

                          {hop.address && hop.address !== 'Not Configured' && (
                            <p className="text-[10px] text-[#64748B] truncate mt-1 flex items-center space-x-1">
                              <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                              <span>{hop.address}</span>
                            </p>
                          )}

                          {hop.notes && <p className="text-[10px] text-slate-500 mt-1 font-mono">{hop.notes}</p>}

                          {hop.photos && hop.photos.length > 0 && (
                            <div className="mt-2 flex items-center space-x-1">
                              <Camera className="w-3 h-3 text-purple-600" />
                              <span className="text-[10px] text-purple-700 font-semibold">{hop.photos.length} Site Photo(s)</span>
                            </div>
                          )}
                        </div>

                        {idx < traceResult.pathNodes.length - 1 && (
                          <div className="flex items-center text-slate-300">
                            <ArrowRight className="w-5 h-5" />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* View Mode Tabs & Map / Workbench Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div className="flex items-center space-x-2 bg-[#F1F5F9] p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('map')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'map' ? 'bg-white text-blue-600 shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Interactive GIS Map
            </button>
            <button
              onClick={() => setActiveTab('olts')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'olts' ? 'bg-white text-blue-600 shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              OLTs & PON Ports ({summary.totalOlts})
            </button>
            <button
              onClick={() => setActiveTab('nodes')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'nodes' ? 'bg-white text-blue-600 shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              FAT & Splitters ({summary.totalNodes})
            </button>
            <button
              onClick={() => setActiveTab('cables')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'cables' ? 'bg-white text-blue-600 shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Fiber Cables ({summary.totalSegments})
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'customers' ? 'bg-white text-blue-600 shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Subscribers Linking ({summary.totalCustomers})
            </button>
          </div>

          {/* Map Style Switcher */}
          {activeTab === 'map' && (
            <div className="flex items-center space-x-2 bg-white border border-[#E2E8F0] p-1 rounded-xl shadow-sm">
              <span className="text-[11px] font-semibold text-[#64748B] px-2">Map Style:</span>
              <button
                onClick={() => setViewMode('satellite')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center space-x-1 transition ${
                  viewMode === 'satellite' ? 'bg-blue-600 text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>Satellite</span>
              </button>
              <button
                onClick={() => setViewMode('street')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center space-x-1 transition ${
                  viewMode === 'street' ? 'bg-blue-600 text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                <Sun className="w-3 h-3" />
                <span>Street View</span>
              </button>
              <button
                onClick={() => setViewMode('dark')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center space-x-1 transition ${
                  viewMode === 'dark' ? 'bg-slate-900 text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                <Moon className="w-3 h-3" />
                <span>Dark NOC</span>
              </button>
              <button
                onClick={() => setViewMode('topology')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center space-x-1 transition ${
                  viewMode === 'topology' ? 'bg-purple-600 text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                <Split className="w-3 h-3" />
                <span>Topology Mode</span>
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: INTERACTIVE GIS MAP & TOPOLOGY VIEW */}
        {activeTab === 'map' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Viewport Canvas */}
            <div
              className={`lg:col-span-2 border rounded-2xl p-6 flex flex-col justify-between min-h-[600px] relative overflow-hidden shadow-xl transition-all ${
                viewMode === 'dark'
                  ? 'bg-[#0B1120] border-slate-800 text-slate-100'
                  : viewMode === 'satellite'
                  ? 'bg-[#030712] border-slate-700 text-slate-100'
                  : 'bg-white border-[#E2E8F0] text-[#0F172A]'
              }`}
            >
              {/* Map Layer Filter Pills */}
              <div className="flex flex-wrap items-center justify-between gap-2 z-10 p-2.5 rounded-xl backdrop-blur-md bg-white/10 border border-white/20">
                <div className="flex items-center space-x-1.5 text-xs">
                  <span className="font-semibold text-slate-400 mr-1">Layers:</span>
                  <button
                    onClick={() => setActiveFilters({ ...activeFilters, olts: !activeFilters.olts })}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                      activeFilters.olts ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    OLTs ({layers?.olts?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveFilters({ ...activeFilters, splitters: !activeFilters.splitters })}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                      activeFilters.splitters ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    Splitters ({layers?.nodes?.filter((n: any) => n.type.includes('SPLITTER')).length || 0})
                  </button>
                  <button
                    onClick={() => setActiveFilters({ ...activeFilters, fats: !activeFilters.fats })}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                      activeFilters.fats ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    FATs ({layers?.nodes?.filter((n: any) => !n.type.includes('SPLITTER')).length || 0})
                  </button>
                  <button
                    onClick={() => setActiveFilters({ ...activeFilters, cables: !activeFilters.cables })}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                      activeFilters.cables ? 'bg-amber-600 text-white' : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    Cables ({layers?.segments?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveFilters({ ...activeFilters, customers: !activeFilters.customers })}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                      activeFilters.customers ? 'bg-cyan-600 text-white' : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    ONTs ({layers?.customers?.length || 0})
                  </button>
                </div>

                <span className="text-xs font-mono text-slate-400">{viewMode.toUpperCase()} VIEW ENGINE</span>
              </div>

              {/* Visual GIS Canvas Display */}
              <div className="my-auto py-10 relative w-full flex flex-col items-center justify-center">
                {/* Clean Zero-Data Empty State */}
                {(!layers?.olts || layers.olts.length === 0) && (!layers?.nodes || layers.nodes.length === 0) ? (
                  <div className="text-center p-8 max-w-md">
                    <Box className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
                    <h4 className="text-sm font-bold text-slate-200">No Physical Fiber Assets Provisioned</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      No dummy or mock data is injected. Add your real OLT Chassis, FAT/Splitter Nodes, and Fiber Cable Segments using the button above.
                    </p>
                    <Button size="sm" variant="primary" onClick={() => setIsAddOltOpen(true)} className="mt-4">
                      + Provision First OLT Chassis
                    </Button>
                  </div>
                ) : (
                  /* Real Topological Node Clusters */
                  <div className="w-full max-w-2xl space-y-6">
                    {/* OLT Level */}
                    {activeFilters.olts && layers?.olts?.map((olt: any) => (
                      <div key={olt.id} className="flex flex-col items-center">
                        <div
                          onClick={() => setSelectedElement({ type: 'OLT', data: olt })}
                          className="px-4 py-3 bg-blue-900/30 border border-blue-500/50 hover:border-blue-400 rounded-2xl flex items-center space-x-3 cursor-pointer shadow-lg shadow-blue-500/10 transition group"
                        >
                          <Server className="w-6 h-6 text-blue-400 group-hover:scale-110 transition" />
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="text-xs font-bold text-white">{olt.name}</p>
                              <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded font-mono font-bold">
                                {olt.code}
                              </span>
                            </div>
                            <p className="text-[11px] font-mono text-slate-400">
                              {olt.ipAddress} • {olt.totalPonPorts} PONs • {olt.vendor} {olt.modelName}
                            </p>
                          </div>
                        </div>

                        {/* Feeder Fiber Cable Line */}
                        {activeFilters.cables && (
                          <div className="h-8 w-0.5 bg-gradient-to-b from-blue-500 to-purple-500 my-1" />
                        )}
                      </div>
                    ))}

                    {/* Splitter & FAT Nodes Level */}
                    <div className="flex flex-wrap items-center justify-center gap-4">
                      {activeFilters.splitters && layers?.nodes?.filter((n: any) => n.type.includes('SPLITTER')).map((node: any) => (
                        <div
                          key={node.id}
                          onClick={() => setSelectedElement({ type: 'NODE', data: node })}
                          className="p-3 bg-emerald-900/30 border border-emerald-500/40 hover:border-emerald-400 rounded-xl cursor-pointer shadow-md transition"
                        >
                          <div className="flex items-center space-x-2">
                            <Split className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold text-white">{node.name}</span>
                          </div>
                          <p className="text-[10px] font-mono text-emerald-300 mt-1">{node.code} ({node.type})</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Cap: {node.usedCapacity}/{node.totalCapacity} Ports</p>
                        </div>
                      ))}

                      {activeFilters.fats && layers?.nodes?.filter((n: any) => !n.type.includes('SPLITTER')).map((node: any) => (
                        <div
                          key={node.id}
                          onClick={() => setSelectedElement({ type: 'NODE', data: node })}
                          className="p-3 bg-purple-900/30 border border-purple-500/40 hover:border-purple-400 rounded-xl cursor-pointer shadow-md transition"
                        >
                          <div className="flex items-center space-x-2">
                            <Box className="w-4 h-4 text-purple-400" />
                            <span className="text-xs font-bold text-white">{node.name}</span>
                          </div>
                          <p className="text-[10px] font-mono text-purple-300 mt-1">{node.code}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Used: {node.usedCapacity}/{node.totalCapacity} | {node.darkCores} Dark</p>
                        </div>
                      ))}
                    </div>

                    {/* Customer Drop ONTs */}
                    {activeFilters.customers && layers?.customers && layers.customers.length > 0 && (
                      <div className="pt-4 border-t border-white/10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
                          Connected Subscriber Drop ONTs ({layers.customers.length})
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {layers.customers.slice(0, 8).map((c: any) => (
                            <div
                              key={c.id}
                              onClick={() => {
                                handleUniversalTrace(c.accountNumber);
                              }}
                              className="px-2.5 py-1.5 bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-400 rounded-lg text-left cursor-pointer transition text-xs"
                            >
                              <p className="text-[11px] font-bold text-cyan-200 truncate max-w-[120px]">{c.name}</p>
                              <p className="text-[9px] font-mono text-slate-400">{c.ontSerial || 'No ONT'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Map Footer Bar */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/10">
                <span>GPS Telemetry Grid: Active</span>
                <span className="font-mono">Real Production Assets Only • Zero Fake Data</span>
              </div>
            </div>

            {/* Element Inspector Sidebar */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3 flex items-center space-x-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                <span>Physical Asset Inspector</span>
              </h4>

              {selectedElement ? (
                <div className="space-y-4">
                  <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <div className="flex items-center justify-between">
                      <Badge variant="info">{selectedElement.type}</Badge>
                      <span className="text-xs font-mono font-bold text-blue-600">
                        {selectedElement.data?.code || selectedElement.data?.nodeCode || selectedElement.data?.cableCode || 'ASSET'}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[#0F172A] mt-2">{selectedElement.data?.name || selectedElement.data?.matchedTarget?.label}</p>
                  </div>

                  {/* Inspector Fields */}
                  <div className="space-y-2 text-xs">
                    {selectedElement.data?.address && (
                      <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                        <span className="text-[#64748B]">Location Address:</span>
                        <span className="font-semibold text-[#0F172A] text-right max-w-[180px] truncate">{selectedElement.data.address}</span>
                      </div>
                    )}

                    {selectedElement.data?.lat !== undefined && (
                      <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                        <span className="text-[#64748B]">GPS Coordinates:</span>
                        <span className="font-mono text-blue-600">
                          {selectedElement.data.lat !== 0 ? `${selectedElement.data.lat}, ${selectedElement.data.lng}` : 'Not Configured'}
                        </span>
                      </div>
                    )}

                    {selectedElement.data?.totalCapacity !== undefined && (
                      <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                        <span className="text-[#64748B]">Port / Core Capacity:</span>
                        <span className="font-bold text-[#0F172A]">
                          {selectedElement.data.usedCapacity ?? selectedElement.data.liveCores ?? 0} / {selectedElement.data.totalCapacity ?? selectedElement.data.totalCores}
                        </span>
                      </div>
                    )}

                    {selectedElement.data?.darkCores !== undefined && (
                      <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                        <span className="text-emerald-700 font-semibold">Free Dark Fibers:</span>
                        <span className="font-bold text-emerald-600">{selectedElement.data.darkCores} Cores Free</span>
                      </div>
                    )}

                    {selectedElement.data?.vendor && (
                      <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                        <span className="text-[#64748B]">Hardware Vendor:</span>
                        <span className="font-semibold text-[#0F172A]">{selectedElement.data.vendor} {selectedElement.data.modelName}</span>
                      </div>
                    )}
                  </div>

                  {/* Photo Preview if Available */}
                  {selectedElement.data?.photos && selectedElement.data.photos.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[11px] font-bold text-[#64748B] mb-2 flex items-center space-x-1">
                        <Camera className="w-3.5 h-3.5 text-purple-600" />
                        <span>Site Installation Photos ({selectedElement.data.photos.length})</span>
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedElement.data.photos.map((url: string, idx: number) => (
                          <a key={idx} href={url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-[#E2E8F0] hover:opacity-90">
                            <img src={url} alt="Site asset" className="w-full h-24 object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-[#64748B]">
                  <Crosshair className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-600" />
                  <p className="text-xs">Click on any OLT, Splitter, FAT box, or run a Trace above to inspect physical details.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: OLT CHASSIS & PON PORTS INVENTORY TABLE */}
        {activeTab === 'olts' && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Central Office OLT Chassis Inventory</h3>
                <p className="text-xs text-[#64748B]">Hardware profiles, chassis slots, PON port split ratios, and GPS coordinates</p>
              </div>
              <Button size="sm" variant="primary" onClick={() => setIsAddOltOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add OLT Chassis
              </Button>
            </div>

            {(!layers?.olts || layers.olts.length === 0) ? (
              <div className="text-center py-12 text-[#64748B]">
                <Server className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-600" />
                <p className="text-xs">No OLT Chassis provisioned in your tenant context.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] font-semibold border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-4">Code / Name</th>
                      <th className="py-3 px-4">Management IP</th>
                      <th className="py-3 px-4">Vendor & Model</th>
                      <th className="py-3 px-4">Slots & PONs</th>
                      <th className="py-3 px-4">GPS Location</th>
                      <th className="py-3 px-4">Photos</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {layers.olts.map((olt: any) => (
                      <tr key={olt.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4">
                          <p className="font-bold text-[#0F172A]">{olt.name}</p>
                          <span className="font-mono text-blue-600 text-[11px] font-semibold">{olt.code}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">{olt.ipAddress}</td>
                        <td className="py-3 px-4">{olt.vendor} {olt.modelName}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#0F172A]">{olt.totalSlots} Slots</span> • {olt.totalPonPorts} PONs
                        </td>
                        <td className="py-3 px-4">
                          {olt.hasGps ? (
                            <span className="text-emerald-700 font-mono text-[11px]">{olt.lat}, {olt.lng}</span>
                          ) : (
                            <span className="text-amber-600 font-medium">Not Configured</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {olt.photos && olt.photos.length > 0 ? (
                            <span className="text-purple-600 font-semibold">{olt.photos.length} Photo(s)</span>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={olt.status === 'online' ? 'success' : 'warning'}>{olt.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteOlt(olt.id, olt.code)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Delete OLT"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FAT BOXES & SPLITTERS INVENTORY TABLE */}
        {activeTab === 'nodes' && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Passive Optical Nodes (FAT, Splitters, Joint Boxes, Poles)</h3>
                <p className="text-xs text-[#64748B]">Terminal boxes, split ratios, dark fiber cores, and upstream parent links</p>
              </div>
              <Button size="sm" variant="primary" onClick={() => setIsAddNodeOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Fiber Node
              </Button>
            </div>

            {(!layers?.nodes || layers.nodes.length === 0) ? (
              <div className="text-center py-12 text-[#64748B]">
                <Box className="w-8 h-8 mx-auto mb-2 opacity-40 text-purple-600" />
                <p className="text-xs">No Fiber Nodes provisioned in your tenant context.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] font-semibold border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-4">Node Code / Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Port Capacity</th>
                      <th className="py-3 px-4">Dark Cores Free</th>
                      <th className="py-3 px-4">GPS Location</th>
                      <th className="py-3 px-4">Upstream Parent</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {layers.nodes.map((node: any) => (
                      <tr key={node.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4">
                          <p className="font-bold text-[#0F172A]">{node.name}</p>
                          <span className="font-mono text-purple-600 font-semibold">{node.code}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{node.type.replace(/_/g, ' ')}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#0F172A]">{node.usedCapacity}</span> / {node.totalCapacity} Ports
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-600">{node.darkCores} Dark</td>
                        <td className="py-3 px-4">
                          {node.hasGps ? (
                            <span className="text-emerald-700 font-mono text-[11px]">{node.lat}, {node.lng}</span>
                          ) : (
                            <span className="text-amber-600 font-medium">Not Configured</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">{node.upstreamNodeId || 'None'}</td>
                        <td className="py-3 px-4">
                          <Badge variant={node.status === 'healthy' ? 'success' : 'warning'}>{node.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteNode(node.id, node.code)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Delete Node"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FIBER CABLE SEGMENTS INVENTORY TABLE */}
        {activeTab === 'cables' && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Physical Fiber Cable Segments</h3>
                <p className="text-xs text-[#64748B]">Feeder, distribution, and drop cable routes, live cores, and free dark fiber cores</p>
              </div>
              <Button size="sm" variant="primary" onClick={() => setIsAddCableOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Cable Segment
              </Button>
            </div>

            {(!layers?.segments || layers.segments.length === 0) ? (
              <div className="text-center py-12 text-[#64748B]">
                <Cable className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-600" />
                <p className="text-xs">No Fiber Cable Segments provisioned in your tenant context.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] font-semibold border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-4">Cable Code / Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Total Cores</th>
                      <th className="py-3 px-4">Live Cores</th>
                      <th className="py-3 px-4">Dark Cores Free</th>
                      <th className="py-3 px-4">Length & Loss</th>
                      <th className="py-3 px-4">Polyline GPS</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {layers.segments.map((seg: any) => (
                      <tr key={seg.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4">
                          <p className="font-bold text-[#0F172A]">{seg.name}</p>
                          <span className="font-mono text-amber-600 font-semibold">{seg.code}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{seg.category}</td>
                        <td className="py-3 px-4 font-bold text-[#0F172A]">{seg.totalCores}C</td>
                        <td className="py-3 px-4 font-bold text-blue-600">{seg.liveCores} Live</td>
                        <td className="py-3 px-4 font-bold text-emerald-600">{seg.darkCores} Dark Free</td>
                        <td className="py-3 px-4">
                          <span className="font-bold">{seg.lengthMeters}m</span> ({seg.measuredLossDb} dB)
                        </td>
                        <td className="py-3 px-4">
                          {seg.hasCoordinates ? (
                            <span className="text-emerald-700 font-mono text-[11px]">{seg.coordinates.length} Point(s)</span>
                          ) : (
                            <span className="text-amber-600 font-medium">Not Configured</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteCable(seg.id, seg.code)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Delete Cable"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CUSTOMER PHYSICAL FIBER LINKING */}
        {activeTab === 'customers' && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Subscriber Physical Fiber Path Linking</h3>
                <p className="text-xs text-[#64748B]">Connect customer ONT to FAT terminal box port, splitter, and OLT PON port with full audit logging</p>
              </div>
            </div>

            {(!layers?.customers || layers.customers.length === 0) ? (
              <div className="text-center py-12 text-[#64748B]">
                <Radio className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-600" />
                <p className="text-xs">No customers found in your tenant context.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] font-semibold border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Account / Phone</th>
                      <th className="py-3 px-4">ONT Serial</th>
                      <th className="py-3 px-4">Rx Power</th>
                      <th className="py-3 px-4">FAT Box Link</th>
                      <th className="py-3 px-4">Physical Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {layers.customers.map((c: any) => (
                      <tr key={c.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4">
                          <p className="font-bold text-[#0F172A]">{c.name}</p>
                          <span className="text-[11px] text-[#64748B]">{c.address}</span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-mono text-blue-600 font-bold">{c.accountNumber}</p>
                          <p className="text-[11px] text-slate-500">{c.phone}</p>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700">{c.ontSerial || 'No ONT Assigned'}</td>
                        <td className="py-3 px-4 font-mono">
                          {c.rxPowerDbm !== undefined ? (
                            <span className={c.rxPowerDbm < -27 ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>
                              {c.rxPowerDbm} dBm
                            </span>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {c.isLinked ? (
                            <span className="text-emerald-700 font-semibold font-mono">Linked (Port {c.fatPortNumber || 1})</span>
                          ) : (
                            <span className="text-amber-600 font-medium">Not Configured</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={c.isLinked ? 'success' : 'warning'}>
                            {c.isLinked ? 'Physically Linked' : 'Unlinked'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCustomerForLink(c);
                              setLinkForm({
                                customerId: c.id,
                                fatBoxId: c.fatBoxId || '',
                                fatPortNumber: c.fatPortNumber || 1,
                                splitterId: c.splitterId || '',
                                ponPortId: c.ponPortId || '',
                                oltId: c.oltId || '',
                                dropCableLengthMeters: c.dropCableLengthMeters || 50,
                              });
                              setIsLinkCustomerOpen(true);
                            }}
                            className="text-xs font-semibold"
                          >
                            <LinkIcon className="w-3 h-3 mr-1" />
                            {c.isLinked ? 'Re-link Fiber' : 'Link Fiber Path'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MODAL 1: ADD OLT CHASSIS */}
        <Modal isOpen={isAddOltOpen} onClose={() => setIsAddOltOpen(false)} title="Provision New OLT Chassis">
          <form onSubmit={handleCreateOlt} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">OLT Name *</label>
                <Input
                  placeholder="e.g. Central POP OLT 01"
                  value={oltForm.name}
                  onChange={(e) => setOltForm({ ...oltForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">Unique OLT Code *</label>
                <Input
                  placeholder="e.g. OLT-MA5800-01"
                  value={oltForm.code}
                  onChange={(e) => setOltForm({ ...oltForm, code: e.target.value.toUpperCase() })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">IP Address *</label>
                <Input
                  placeholder="10.200.1.10"
                  value={oltForm.ipAddress}
                  onChange={(e) => setOltForm({ ...oltForm, ipAddress: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">Hardware Vendor</label>
                <Input
                  placeholder="Huawei / ZTE / Nokia"
                  value={oltForm.vendor}
                  onChange={(e) => setOltForm({ ...oltForm, vendor: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">Model Name</label>
                <Input
                  placeholder="MA5800-X7 / C320"
                  value={oltForm.modelName}
                  onChange={(e) => setOltForm({ ...oltForm, modelName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">Total Chassis Slots</label>
                <Input
                  type="number"
                  value={oltForm.totalSlots}
                  onChange={(e) => setOltForm({ ...oltForm, totalSlots: parseInt(e.target.value, 10) || 4 })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">Total PON Ports</label>
                <Input
                  type="number"
                  value={oltForm.totalPonPorts}
                  onChange={(e) => setOltForm({ ...oltForm, totalPonPorts: parseInt(e.target.value, 10) || 16 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">GPS Latitude</label>
                <Input
                  placeholder="12.9352"
                  value={oltForm.lat}
                  onChange={(e) => setOltForm({ ...oltForm, lat: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">GPS Longitude</label>
                <Input
                  placeholder="77.6245"
                  value={oltForm.lng}
                  onChange={(e) => setOltForm({ ...oltForm, lng: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#0F172A]">Location Address / NOC Landmark</label>
              <Input
                placeholder="Central Server Room, 4th Floor NOC"
                value={oltForm.address}
                onChange={(e) => setOltForm({ ...oltForm, address: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#0F172A]">Installation Photo URL</label>
              <Input
                placeholder="https://example.com/photos/olt-rack.jpg"
                value={oltForm.photoUrl}
                onChange={(e) => setOltForm({ ...oltForm, photoUrl: e.target.value })}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddOltOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Provision OLT
              </Button>
            </div>
          </form>
        </Modal>

        {/* MODAL 2: ADD FIBER NODE (FAT/SPLITTER) */}
        <Modal isOpen={isAddNodeOpen} onClose={() => setIsAddNodeOpen(false)} title="Add Fiber Node (FAT / Splitter / Joint Box)">
          <form onSubmit={handleCreateNode} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">Node Code *</label>
                <Input
                  placeholder="FAT-KORM-04 / SPL-01"
                  value={nodeForm.nodeCode}
                  onChange={(e) => setNodeForm({ ...nodeForm, nodeCode: e.target.value.toUpperCase() })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">Node Name *</label>
                <Input
                  placeholder="FAT Box 4 - 5th Cross"
                  value={nodeForm.name}
                  onChange={(e) => setNodeForm({ ...nodeForm, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">Node Type</label>
                <select
                  value={nodeForm.type}
                  onChange={(e) => setNodeForm({ ...nodeForm, type: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-[#E2E8F0] bg-white"
                >
                  <option value="FAT_NAP_BOX">FAT / NAP Terminal Box</option>
                  <option value="PRIMARY_SPLITTER">Primary Optical Splitter (1:4 / 1:8)</option>
                  <option value="SECONDARY_SPLITTER">Secondary Optical Splitter (1:8 / 1:16)</option>
                  <option value="JOINT_BOX">Joint Closure / Splice Box</option>
                  <option value="POLE">Utility Pole Terminal</option>
                  <option value="MANHOLE">Underground Manhole Chamber</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">Port / Core Capacity</label>
                <Input
                  type="number"
                  value={nodeForm.totalCapacity}
                  onChange={(e) => setNodeForm({ ...nodeForm, totalCapacity: parseInt(e.target.value, 10) || 16 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">GPS Latitude</label>
                <Input
                  placeholder="12.9360"
                  value={nodeForm.lat}
                  onChange={(e) => setNodeForm({ ...nodeForm, lat: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">GPS Longitude</label>
                <Input
                  placeholder="77.6250"
                  value={nodeForm.lng}
                  onChange={(e) => setNodeForm({ ...nodeForm, lng: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#0F172A]">Physical Address / Street Pole #</label>
              <Input
                placeholder="Pole #42, 5th Cross Road, Sector 4"
                value={nodeForm.address}
                onChange={(e) => setNodeForm({ ...nodeForm, address: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#0F172A]">Site Photo URL</label>
              <Input
                placeholder="https://example.com/photos/fat-box-pole.jpg"
                value={nodeForm.photoUrl}
                onChange={(e) => setNodeForm({ ...nodeForm, photoUrl: e.target.value })}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddNodeOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Create Node
              </Button>
            </div>
          </form>
        </Modal>

        {/* MODAL 3: ADD FIBER CABLE SEGMENT */}
        <Modal isOpen={isAddCableOpen} onClose={() => setIsAddCableOpen(false)} title="Add Fiber Cable Segment">
          <form onSubmit={handleCreateCable} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">Cable Code *</label>
                <Input
                  placeholder="FIB-DIST-01"
                  value={cableForm.cableCode}
                  onChange={(e) => setCableForm({ ...cableForm, cableCode: e.target.value.toUpperCase() })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">Cable Name *</label>
                <Input
                  placeholder="Main 24F Distribution Line"
                  value={cableForm.name}
                  onChange={(e) => setCableForm({ ...cableForm, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">Category</label>
                <select
                  value={cableForm.category}
                  onChange={(e) => setCableForm({ ...cableForm, category: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-[#E2E8F0] bg-white"
                >
                  <option value="FEEDER">Feeder (OLT to Splitter)</option>
                  <option value="DISTRIBUTION">Distribution (Splitter to FAT)</option>
                  <option value="DROP">Drop (FAT to Customer)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">Total Cores</label>
                <Input
                  type="number"
                  value={cableForm.totalCores}
                  onChange={(e) => setCableForm({ ...cableForm, totalCores: parseInt(e.target.value, 10) || 24 })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">Live/Used Cores</label>
                <Input
                  type="number"
                  value={cableForm.liveCores}
                  onChange={(e) => setCableForm({ ...cableForm, liveCores: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">Length (Meters)</label>
                <Input
                  type="number"
                  value={cableForm.lengthMeters}
                  onChange={(e) => setCableForm({ ...cableForm, lengthMeters: parseInt(e.target.value, 10) || 100 })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">Measured Loss (dB)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={cableForm.measuredLossDb}
                  onChange={(e) => setCableForm({ ...cableForm, measuredLossDb: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#0F172A]">GPS Polyline Coordinates (lat,lng; lat,lng...)</label>
              <Input
                placeholder="12.9352,77.6245; 12.9360,77.6250; 12.9370,77.6260"
                value={cableForm.coordinatesRaw}
                onChange={(e) => setCableForm({ ...cableForm, coordinatesRaw: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#0F172A]">Cable Photo URL</label>
              <Input
                placeholder="https://example.com/photos/cable-tray.jpg"
                value={cableForm.photoUrl}
                onChange={(e) => setCableForm({ ...cableForm, photoUrl: e.target.value })}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddCableOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Create Cable Segment
              </Button>
            </div>
          </form>
        </Modal>

        {/* MODAL 4: LINK CUSTOMER FIBER PATH */}
        <Modal
          isOpen={isLinkCustomerOpen}
          onClose={() => {
            setIsLinkCustomerOpen(false);
            setSelectedCustomerForLink(null);
          }}
          title="Link Subscriber to Physical Fiber Network"
        >
          <form onSubmit={handleLinkCustomer} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#0F172A]">Select Subscriber *</label>
              <select
                value={linkForm.customerId || selectedCustomerForLink?.id || ''}
                onChange={(e) => setLinkForm({ ...linkForm, customerId: e.target.value })}
                className="w-full text-xs p-2 rounded-lg border border-[#E2E8F0] bg-white"
                required
              >
                <option value="">-- Choose Subscriber --</option>
                {layers?.customers?.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.accountNumber}) — {c.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">Target FAT / NAP Box</label>
                <select
                  value={linkForm.fatBoxId}
                  onChange={(e) => setLinkForm({ ...linkForm, fatBoxId: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-[#E2E8F0] bg-white"
                >
                  <option value="">-- None / Select FAT Box --</option>
                  {layers?.nodes?.filter((n: any) => !n.type.includes('SPLITTER')).map((n: any) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.code}) - {n.usedCapacity}/{n.totalCapacity} Used
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#0F172A]">FAT Terminal Port #</label>
                <Input
                  type="number"
                  min="1"
                  max="64"
                  value={linkForm.fatPortNumber}
                  onChange={(e) => setLinkForm({ ...linkForm, fatPortNumber: parseInt(e.target.value, 10) || 1 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#0F172A]">Parent OLT Chassis</label>
                <select
                  value={linkForm.oltId}
                  onChange={(e) => setLinkForm({ ...linkForm, oltId: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-[#E2E8F0] bg-white"
                >
                  <option value="">-- None / Select OLT --</option>
                  {layers?.olts?.map((o: any) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.code}) - {o.ipAddress}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#0F172A]">Drop Cable Length (Meters)</label>
                <Input
                  type="number"
                  value={linkForm.dropCableLengthMeters}
                  onChange={(e) => setLinkForm({ ...linkForm, dropCableLengthMeters: parseInt(e.target.value, 10) || 50 })}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsLinkCustomerOpen(false);
                  setSelectedCustomerForLink(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Confirm Physical Link
              </Button>
            </div>
          </form>
        </Modal>
      </StateWrapper>
    </Shell>
  );
};
