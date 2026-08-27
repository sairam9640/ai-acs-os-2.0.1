import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wifi,
  Activity,
  MapPin,
  Bot,
  Layers,
  PhoneCall,
  Server,
  Zap,
  Building2,
  Users,
  Wrench,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Mail,
  Send,
  X,
  Radio,
  Sparkles,
  ExternalLink,
  Lock,
  CreditCard,
  MessageSquare,
  FileText,
  DollarSign,
  TrendingUp,
  Sliders,
  HelpCircle,
  Clock,
  Award,
  Globe,
  Database,
  Terminal,
  RefreshCw,
  Eye,
  Check,
  ChevronDown,
  Play
} from 'lucide-react';
import { Button, Input } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Modal } from '../components/ui/Modal.js';
import { FiberNetwork3DCanvas } from '../components/landing/FiberNetwork3DCanvas.js';
import { WifiRouter3DCanvas } from '../components/landing/WifiRouter3DCanvas.js';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Modals State
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [showLoginMenu, setShowLoginMenu] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any | null>(null);

  // Demo form state
  const [demoForm, setDemoForm] = useState({
    name: '',
    email: '',
    phone: '',
    ispName: '',
    subscribersCount: '1000-5000',
    preferredDate: '',
    notes: '',
  });
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  // Quote form state
  const [quoteSubscribers, setQuoteSubscribers] = useState(3500);
  const [quoteDeployment, setQuoteDeployment] = useState<'CLOUD' | 'ON_PREMISE'>('CLOUD');
  const [quoteGateways, setQuoteGateways] = useState(true);
  const [quoteWhatsapp, setQuoteWhatsapp] = useState(true);
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);

  // Sales form state
  const [salesForm, setSalesForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [salesSubmitted, setSalesSubmitted] = useState(false);

  // Cockpit Simulator Active Tab
  const [cockpitTab, setCockpitTab] = useState<'customer360' | 'tr069' | 'fibergis' | 'billing'>('customer360');

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // ROI Calculator Subscriber Slider
  const [roiSubscribers, setRoiSubscribers] = useState(5000);

  // Handle Form Submissions
  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
    setTimeout(() => {
      setDemoSubmitted(false);
      setShowDemoModal(false);
      setDemoForm({ name: '', email: '', phone: '', ispName: '', subscribersCount: '1000-5000', preferredDate: '', notes: '' });
    }, 2500);
  };

  const handleSalesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSalesSubmitted(true);
    setTimeout(() => {
      setSalesSubmitted(false);
      setShowSalesModal(false);
      setSalesForm({ name: '', email: '', phone: '', message: '' });
    }, 2500);
  };

  // 12 Product Service Modules
  const productModules = [
    {
      id: 'customer360',
      title: 'Customer 360° Workspace',
      subtitle: 'Complete Subscriber Operations Hub',
      icon: PhoneCall,
      color: 'from-sky-500 to-blue-600',
      badge: 'Support Cockpit',
      description:
        'Unified single-screen cockpit showing real-time optical power (RX/TX dBm), KYC document vault, assigned physical assets (ONT, Router, SFP), 6-stream chronological timeline, and one-click remote actions.',
      features: [
        'Live optical power gauge with -27 dBm carrier threshold warnings',
        'KYC vault with Aadhaar, PAN, CAF, and premise installation photo lightbox',
        'Physical inventory linkage with serials, MAC, and warranty tracking',
        'One-click TR-069 poll, remote reboot, plan renew, and WhatsApp ping',
      ],
    },
    {
      id: 'tr069',
      title: 'Carrier-Grade TR-069 ACS',
      subtitle: 'Universal CWMP Auto-Provisioning',
      icon: Radio,
      color: 'from-emerald-500 to-teal-600',
      badge: 'Zero Touch',
      description:
        'Standards-compliant CWMP TR-069 / TR-181 Auto Configuration Server. Zero-touch provisioning of PPPoE, Wi-Fi 2.4G/5G, VLANs, remote reboot guard with deduplication, and bulk firmware fleet management.',
      features: [
        'Multi-vendor ONT compatibility (Genexis, Huawei, ZTE, Nokia, TP-Link, Syrotech, V-SOL)',
        'Atomic RPC dispatch with CWMP SOAP fault handling and 15-min stale command drop guard',
        'Live 20-point optical history with 0.5 dB and 1.0 dB sudden drop alarms',
        'Wi-Fi band steering, SSID configuration, and connected client blocking',
      ],
    },
    {
      id: 'billing',
      title: 'Billing, Invoicing & CRM',
      subtitle: 'Automated Revenue Engine',
      icon: CreditCard,
      color: 'from-purple-500 to-indigo-600',
      badge: 'GST Invoicing',
      description:
        'End-to-end broadband billing engine supporting combo broadband plans, OTT bundles, automated recurring renewals, anti-duplicate subscription rules, and instant GST tax invoice generation.',
      features: [
        'Configurable validity cycles (30, 90, 180, 365 days) with anti-duplicate guard',
        'Auto-generated GST compliant tax invoice PDF receipts with QR payment codes',
        'Multi-currency and branch/operator revenue split reports',
        'Customer self-service portal for instant payment and invoice downloads',
      ],
    },
    {
      id: 'fibergis',
      title: 'Fiber GIS Digital Twin',
      subtitle: 'Optical Power Budget & Route Trace',
      icon: MapPin,
      color: 'from-amber-500 to-orange-600',
      badge: 'GIS Mapping',
      description:
        'High-precision optical network digital twin. Traces fiber topology from Central Core OLT $\rightarrow$ Feeder Cable $\rightarrow$ Primary Splitter $\rightarrow$ Distribution Cable $\rightarrow$ FAT Box $\rightarrow$ Drop Cable $\rightarrow$ ONT.',
      features: [
        'Real-time optical loss calculations (-0.35 dB/km, -10.2 dB per 1:8 splitter, -0.2 dB per splice)',
        'FAT box port capacity, remaining split capacity, and premise drop distance verification',
        'Automated fiber cut detection with AI technician dispatch routing',
        'Interactive MapLibre / OpenLayers geospatial rendering of poles, ducts, and closures',
      ],
    },
    {
      id: 'olt_fleet',
      title: 'Multi-Vendor OLT & ONT Fleet',
      subtitle: 'Unified Hardware Management',
      icon: Server,
      color: 'from-cyan-500 to-blue-600',
      badge: 'Fleet Control',
      description:
        'Centralized management for multi-vendor OLTs and ONTs via SNMP, CLI, and CWMP. Real-time PON port capacity, optical module temperature, bias current, and auto-quarantine for unmapped CPEs.',
      features: [
        'Universal vendor adapter layer: Huawei, ZTE, Nokia, BDCOM, V-SOL, Syrotech, Genexis',
        'PON port bandwidth throttling and dynamic traffic shaping profiles',
        'Automatic quarantine for wrong-slug / tenant-mismatched CPE connections',
        'Fleet-wide firmware scheduled OTA rolling updates',
      ],
    },
    {
      id: 'inventory',
      title: 'Network Inventory & Stock',
      subtitle: 'Warehouse & Spares Tracking',
      icon: Layers,
      color: 'from-rose-500 to-pink-600',
      badge: 'Warehouse ERP',
      description:
        'Complete hardware lifecycle management for ONTs, Wi-Fi 6 Routers, SFP Transceivers, Splitters, Armored Drop Cables, and Fiber Patch Cords. Real-time Stock In/Out, serial barcode scanning, and vendor warranties.',
      features: [
        'Serial number and MAC address barcode scanning and assignment to customers/technicians',
        'Stock low-threshold alerts and supplier PO management',
        'Premise asset recovery tracking during subscription cancellation',
        'Multi-warehouse branch stock reconciliation',
      ],
    },
    {
      id: 'gateways',
      title: 'Multi-Gateway Reconciliation',
      subtitle: 'Razorpay, Cashfree, PhonePe, Paytm, Stripe',
      icon: DollarSign,
      color: 'from-emerald-600 to-green-700',
      badge: 'Plug & Play Gateways',
      description:
        'Enterprise-grade multi-gateway payment infrastructure. Operators configure their own tenant credentials stored with AES-256-GCM encryption at rest. Daily collections reconciliation and settlement tracking.',
      features: [
        'Plugin architecture supporting Razorpay, Cashfree, PhonePe, Paytm, and Stripe',
        'Automated webhook ingestion with cryptographic HMAC signature verification',
        'Real-time reconciliation dashboard: collections, pending settlements, failed payments',
        'Offline Cash & Direct UPI collection ledger with receipts',
      ],
    },
    {
      id: 'reports',
      title: 'Executive Analytics & Reports',
      subtitle: 'Real-Time ISP Business Intelligence',
      icon: TrendingUp,
      color: 'from-blue-600 to-indigo-700',
      badge: 'Real-Time BI',
      description:
        'Live financial and network health dashboards. Real-time Monthly Recurring Revenue (MRR), Average Revenue Per User (ARPU), Subscriber Churn, Ticket MTTR, and Technician SLA compliance.',
      features: [
        'MRR and ARPU growth trends with predictive renewal forecasting',
        'Subscriber churn risk heatmaps based on optical signal degradation',
        'Operator branch performance and daily cash collection audits',
        'Exportable executive summaries in Excel, CSV, and PDF formats',
      ],
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp Automation Engine',
      subtitle: 'Instant Billing & Alert Bot',
      icon: MessageSquare,
      color: 'from-green-500 to-emerald-600',
      badge: 'Conversational Bot',
      description:
        'Automated WhatsApp conversational engine for payment receipts, renewal confirmations, 3-day and 1-day expiry reminders, optical cut incident alerts, and customer self-service billing queries.',
      features: [
        'Instant payment receipt PDF delivery with UPI payment links',
        'Automated 3-day and 1-day subscription expiry reminders with anti-spam duplicate guard',
        'Field technician job assignment alerts with customer premise GPS directions',
        'High-throughput WhatsApp Cloud API & Twilio multi-channel connector',
      ],
    },
    {
      id: 'multitenant',
      title: 'Multi-Tenant ISP Cloud',
      subtitle: 'Super Admin & Operator Hierarchy',
      icon: Building2,
      color: 'from-slate-700 to-slate-900',
      badge: 'Enterprise Multi-Tenant',
      description:
        'Hierarchical architecture supporting Super Admins, Multiple ISP Tenants, Regional Cable Operators (LCOs), and Branch Sub-operators with strict database tenant isolation and zero cross-tenant leakage.',
      features: [
        'Super Admin dashboard for tenant provisioning, gateway enablement, and global system health',
        'Dedicated subdomains and tenant slugs (e.g. `fastfiber.ai-ispos.com`)',
        'Strict RBAC with 5 roles: Super Admin, Operator Admin, Billing Staff, NOC Engineer, Field Tech',
        'Cryptographically isolated database queries with automatic `tenantId` enforcement',
      ],
    },
    {
      id: 'security',
      title: 'Zero-Trust Security & Audits',
      subtitle: 'Immutable Ledger & PII Masking',
      icon: ShieldCheck,
      color: 'from-red-500 to-rose-700',
      badge: 'ISO 27001 Ready',
      description:
        'Carrier-grade security framework with immutable audit logging, default masking of sensitive PII (PPPoE passwords, Wi-Fi keys, Aadhaar numbers), and unmask audit dispatch with client IP tracking.',
      features: [
        'Default PII masking with permission-based unmask toggle and instant audit logging',
        'Immutable audit log recording actor ID, email, role, action, target resource, and IP address',
        'AES-256-GCM encryption for all third-party API keys, webhooks, and gateway secrets',
        'Protection against CSRF, SQLi, NoSQL injection, and TR-069 replay attacks',
      ],
    },
    {
      id: 'apis',
      title: 'Open REST APIs & RADIUS',
      subtitle: 'Seamless OSS/BSS Integration',
      icon: Terminal,
      color: 'from-violet-600 to-purple-800',
      badge: 'Developer APIs',
      description:
        'Developer-friendly OpenAPI 3.0 compliant REST APIs and webhooks. Seamlessly connects with existing RADIUS servers (FreeRADIUS), MikroTik routers, ERP systems, and mobile apps.',
      features: [
        'Comprehensive REST API for customer provisioning, billing, and device telemetry',
        'Inbound & outbound webhooks for real-time CRM and external payment synchronization',
        'RADIUS integration for AAA authentication, accounting, and bandwidth rate-limiting',
        'Pre-built SDKs in TypeScript, Python, and cURL examples with interactive Swagger docs',
      ],
    },
  ];

  // Calculate dynamic quote
  const calculateQuote = () => {
    let basePrice = quoteSubscribers * 12; // ₹12 per sub/mo
    if (quoteDeployment === 'ON_PREMISE') basePrice += 45000;
    if (quoteGateways) basePrice += 2500;
    if (quoteWhatsapp) basePrice += 3500;
    return {
      monthly: Math.round(basePrice),
      perSub: (basePrice / quoteSubscribers).toFixed(2),
    };
  };

  const quoteResult = calculateQuote();

  // ROI calculations
  const roiSavedHours = Math.round((roiSubscribers * 0.15));
  const roiSavedMoney = Math.round((roiSubscribers * 18));
  const roiFasterMttr = '45%';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500 selection:text-white overflow-x-hidden">
      {/* 1. TOP STICKY NAVBAR */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 group-hover:scale-105 transition-all">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black tracking-tight text-white font-mono">AI ISP OS</span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-full">
                  v2.0.1 Enterprise
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Autonomous FTTH & ISP Operating System</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-7 text-xs font-bold uppercase tracking-wider text-slate-300">
            <a href="#overview" className="hover:text-sky-400 transition-colors">Overview</a>
            <a href="#modules" className="hover:text-sky-400 transition-colors">3D Modules</a>
            <a href="#cockpit-demo" className="hover:text-sky-400 transition-colors">Live Cockpit</a>
            <a href="#industries" className="hover:text-sky-400 transition-colors">Industries</a>
            <a href="#roi" className="hover:text-sky-400 transition-colors">ROI Calculator</a>
            <a href="#hardware" className="hover:text-sky-400 transition-colors">Supported CPEs</a>
            <a href="#faq" className="hover:text-sky-400 transition-colors">FAQ</a>
          </nav>

          {/* Action CTAs & Portal Switcher */}
          <div className="flex items-center space-x-3">
            {/* Login Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowLoginMenu(!showLoginMenu)}
                className="px-3.5 py-2 text-xs font-bold text-slate-200 bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl flex items-center space-x-1.5 transition-all"
              >
                <Lock className="w-3.5 h-3.5 text-sky-400" />
                <span>Portal Logins</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showLoginMenu && (
                <div
                  className="absolute right-0 mt-2 w-60 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 space-y-1 font-sans"
                  onClick={() => setShowLoginMenu(false)}
                >
                  <Link
                    to="/operator/login"
                    className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-sky-500/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
                      🏢
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Operator Portal</span>
                      <span className="text-[10px] text-slate-400">NOC & Daily Management</span>
                    </div>
                  </Link>

                  <Link
                    to="/superadmin/login"
                    className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-purple-500/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                      👑
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Super Admin Cloud</span>
                      <span className="text-[10px] text-slate-400">Multi-Tenant Management</span>
                    </div>
                  </Link>

                  <Link
                    to="/customer/login"
                    className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-emerald-500/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                      📱
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Customer Self-Service</span>
                      <span className="text-[10px] text-slate-400">Bill Pay & Wi-Fi Control</span>
                    </div>
                  </Link>

                  <Link
                    to="/tech/login"
                    className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-amber-500/10 text-slate-200 hover:text-white transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                      🔧
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Technician Field App</span>
                      <span className="text-[10px] text-slate-400">Installations & Fiber Repairs</span>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            <Button
              onClick={() => setShowDemoModal(true)}
              className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-sky-500/25 transition-all"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 fill-white" />
              Book Live Demo
            </Button>
          </div>
        </div>
      </header>

      {/* 2. FUTURISTIC 3D HERO SECTION */}
      <section className="relative pt-12 pb-20 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-950/40 via-slate-950 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Hero Headlines */}
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold uppercase tracking-wider shadow-inner">
              <Sparkles className="w-4 h-4 text-sky-400 animate-spin" />
              <span>Next-Gen Telecom Operating System • 2026 Edition</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-tight">
              The All-in-One Autonomous <br />
              <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-purple-400 bg-clip-text text-transparent">
                ISP & FTTH Operations
              </span> Platform
            </h1>

            <p className="text-base sm:text-xl text-slate-300 font-normal leading-relaxed max-w-3xl mx-auto">
              Replace 8 disconnected software tools with one carrier-grade cockpit. Unify <span className="text-white font-bold">TR-069 ACS</span>, <span className="text-white font-bold">Fiber GIS Digital Twin</span>, <span className="text-white font-bold">Multi-Gateway Auto Billing</span>, <span className="text-white font-bold">WhatsApp Bot</span>, and <span className="text-white font-bold">Customer 360° Operations</span>.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Button
                size="lg"
                onClick={() => setShowDemoModal(true)}
                className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-sm px-7 py-3.5 rounded-2xl shadow-xl shadow-sky-500/30 transform hover:-translate-y-0.5 transition-all"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Book Live 1-on-1 Demo
              </Button>

              <Link to="/operator/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-white font-bold text-sm px-7 py-3.5 rounded-2xl shadow-md transition-all"
                >
                  <Terminal className="w-4 h-4 mr-2 text-sky-400" />
                  Explore Operator Cockpit
                </Button>
              </Link>

              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowQuoteModal(true)}
                className="border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-sm px-7 py-3.5 rounded-2xl transition-all"
              >
                <DollarSign className="w-4 h-4 mr-1.5" />
                Instant Price Estimate
              </Button>
            </div>
          </div>

          {/* Live Platform Vitals Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-xl">
            <div className="text-center p-3 border-r border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block">Platform SLA</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">99.999%</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Zero-Downtime Architecture</p>
            </div>

            <div className="text-center p-3 md:border-r border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block">Active Fleet CPEs</span>
              <span className="text-2xl sm:text-3xl font-black text-sky-400 font-mono">120,000+</span>
              <p className="text-[11px] text-slate-500 mt-0.5">TR-069 & SNMP Managed</p>
            </div>

            <div className="text-center p-3 border-r border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block">Monthly Collections</span>
              <span className="text-2xl sm:text-3xl font-black text-purple-400 font-mono">₹14.8 Cr+</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Multi-Gateway Automated</p>
            </div>

            <div className="text-center p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block">TR-069 Dispatch Latency</span>
              <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">&lt; 12 ms</span>
              <p className="text-[11px] text-slate-500 mt-0.5">High-Speed RPC Execution</p>
            </div>
          </div>

          {/* 3D Interactive Fiber Canvas */}
          <div className="pt-2">
            <FiberNetwork3DCanvas />
          </div>
        </div>
      </section>

      {/* 3. PRODUCT OVERVIEW & WHY CHOOSE AI ISP OS */}
      <section id="overview" className="py-20 bg-slate-900/40 border-y border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge variant="info" className="text-xs font-mono uppercase tracking-widest">
              Architectural Superiority
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Why Telecom Leaders & FTTH Operators Choose AI ISP OS
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Legacy billing software and fragmented ACS servers lead to revenue leakage, slow fault resolution, and customer churn. AI ISP OS provides a unified, zero-lock-in operating standard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-3 hover:border-sky-500/50 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Zero CPE Vendor Lock-In</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect any ONT (Genexis, Huawei, ZTE, Nokia, TP-Link, Syrotech, V-SOL) seamlessly via standard CWMP TR-069. No expensive proprietary ACS licenses.
              </p>
            </div>

            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-3 hover:border-purple-500/50 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Zero Revenue Leakage</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automated multi-gateway checkout (Razorpay, Cashfree, PhonePe, Paytm, Stripe) with webhook auto-renewals, offline cash ledger, and anti-duplicate guards.
              </p>
            </div>

            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-3 hover:border-emerald-500/50 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">40% Faster MTTR</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Optical route tracing identifies exact splice degradation or fiber cut location between OLT, Splitter, and FAT box before sending technicians to the field.
              </p>
            </div>

            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-3 hover:border-amber-500/50 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">99.8% On-Time Renewals</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automated WhatsApp Bot delivers payment receipts, 3-day and 1-day expiry reminders with direct UPI 1-click renewal links, driving frictionless cash collections.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE 3D PRODUCT SERVICE MODULES (12 CARDS) */}
      <section id="modules" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="success" className="text-xs font-mono uppercase tracking-widest">
            Complete Operations Suite
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-black text-white">
            12 Enterprise Modules Designed for Carrier Excellence
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Click any 3D service card to inspect deep technical capabilities, workflows, and integrations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {productModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                onClick={() => setSelectedModule(mod)}
                className="group relative p-6 bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/80 hover:border-sky-500/60 rounded-3xl shadow-xl cursor-pointer transform hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Glow Backdrop */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${mod.color} opacity-10 group-hover:opacity-25 blur-2xl rounded-full transition-opacity pointer-events-none`}></div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mod.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider bg-slate-800 text-sky-300 border border-slate-700">
                      {mod.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{mod.subtitle}</p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {mod.description}
                  </p>

                  <ul className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                    {mod.features.slice(0, 2).map((f, idx) => (
                      <li key={idx} className="flex items-start space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="truncate">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-bold text-sky-400 group-hover:text-sky-300">
                  <span>Explore Module Specs</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. INTERACTIVE LIVE FEATURE COCKPIT SIMULATOR */}
      <section id="cockpit-demo" className="py-20 bg-slate-900/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge variant="warning" className="text-xs font-mono uppercase tracking-widest">
              Live Interactive Cockpit
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Experience the Unified Operator Interface
            </h2>
            <p className="text-slate-400 text-sm">
              Switch tabs to see how support engineers, NOC teams, and billing staff operate in real time.
            </p>
          </div>

          {/* Cockpit Workbench Simulator Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            {/* Header Tabs */}
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                </div>
                <span className="text-xs font-mono text-slate-400 font-bold ml-2">
                  operator.ai-ispos.com/cockpit/live
                </span>
              </div>

              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                {[
                  { id: 'customer360', label: 'Customer 360 Workspace', icon: PhoneCall },
                  { id: 'tr069', label: 'TR-069 CPE Terminal', icon: Radio },
                  { id: 'fibergis', label: 'Fiber GIS Route Trace', icon: MapPin },
                  { id: 'billing', label: 'Multi-Gateway Ledger', icon: CreditCard },
                ].map((t) => {
                  const Icon = t.icon;
                  const active = cockpitTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setCockpitTab(t.id as any)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                        active ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Workbench Screen Content */}
            <div className="p-6 sm:p-8 space-y-6">
              {cockpitTab === 'customer360' && (
                <div className="space-y-5">
                  {/* Top Bar */}
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-mono text-sky-400 uppercase font-bold">Active Subscriber</span>
                      <h4 className="text-lg font-black text-white">Vikramaditya Sharma (ACC-99201)</h4>
                      <p className="text-xs text-slate-400 font-mono">Plan: SuperFast 300M Unlimited • ₹899/mo • 14 Days Remaining</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="h-8 text-xs bg-sky-600 hover:bg-sky-500 font-bold">
                        <RefreshCw className="w-3 h-3 mr-1" /> Poll Live ONT
                      </Button>
                      <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 font-bold">
                        <CreditCard className="w-3 h-3 mr-1" /> Renew Plan
                      </Button>
                      <Button size="sm" className="h-8 text-xs bg-rose-600 hover:bg-rose-500 font-bold">
                        <Zap className="w-3 h-3 mr-1" /> Remote Reboot
                      </Button>
                    </div>
                  </div>

                  {/* Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs font-mono">
                    <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
                      <span className="text-slate-400 uppercase font-bold text-[10px]">Live Optical Signal</span>
                      <p className="text-2xl font-black text-emerald-400">-19.45 dBm</p>
                      <p className="text-slate-400">TX Power: 2.14 dBm • Laser: 14.2 mA</p>
                      <Badge variant="success" className="text-[10px]">Carrier Optimal</Badge>
                    </div>

                    <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
                      <span className="text-slate-400 uppercase font-bold text-[10px]">Assigned Hardware</span>
                      <p className="font-bold text-white">Genexis Titanium-2122A ONT</p>
                      <p className="text-slate-400">Serial: GNXS-99201 • MAC: 3C:90:66:88:12:F1</p>
                      <Badge variant="info" className="text-[10px]">Warranty Active (24m)</Badge>
                    </div>

                    <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
                      <span className="text-slate-400 uppercase font-bold text-[10px]">KYC & Premise Photos</span>
                      <p className="font-bold text-emerald-300">4 Verified Documents</p>
                      <p className="text-slate-400">Aadhaar Front/Back, CAF Form, FAT Splice</p>
                      <span className="text-sky-400 underline cursor-pointer text-[11px]">Open Lightbox Preview</span>
                    </div>
                  </div>
                </div>
              )}

              {cockpitTab === 'tr069' && (
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="font-bold text-sky-400">CWMP Parameter Tree (TR-181 / TR-098)</span>
                    <Badge variant="success">TR-069 Session Active (CWMP ID: #4019)</Badge>
                  </div>
                  <div className="space-y-1.5 text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                    <p className="text-slate-500">// Device Inform Telemetry Ingested</p>
                    <p><span className="text-sky-400">Device.DeviceInfo.Manufacturer:</span> &quot;Genexis BV&quot;</p>
                    <p><span className="text-sky-400">Device.DeviceInfo.SoftwareVersion:</span> &quot;V2.1.04-P1&quot;</p>
                    <p><span className="text-sky-400">Device.Optical.Interface.1.RxPower:</span> <span className="text-emerald-400">-1945</span> (-19.45 dBm)</p>
                    <p><span className="text-sky-400">Device.WiFi.SSID.1.SSID:</span> &quot;ApexFiber_5GHz_Fast&quot;</p>
                    <p><span className="text-sky-400">Device.WiFi.Radio.1.Channel:</span> 36 (5.180 GHz Auto)</p>
                    <p><span className="text-sky-400">Device.PPP.Interface.1.Username:</span> &quot;vikram@fastfiber&quot;</p>
                  </div>
                </div>
              )}

              {cockpitTab === 'fibergis' && (
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 text-xs font-mono">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="font-bold text-emerald-400">Optical Signal Budget Path (Total Loss: 17.40 dB)</span>
                    <Badge variant="info">Loss Margin: Optimal (-19.45 dBm)</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">1. Core OLT</span>
                      <span className="font-bold text-white">OLT-CORE-01 (PON 0/1)</span>
                      <p className="text-emerald-400">+3.50 dBm</p>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">2. Primary Splitter</span>
                      <span className="font-bold text-white">Splitter 1:8 (MH-04)</span>
                      <p className="text-sky-400">-7.40 dBm (-10.2 dB loss)</p>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">3. FAT Closure Box</span>
                      <span className="font-bold text-white">FAT-KORAMANGALA-01 (Port #3)</span>
                      <p className="text-purple-400">-19.10 dBm</p>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">4. Premise Drop Cable</span>
                      <span className="font-bold text-white">2-Core Drop (45m)</span>
                      <p className="text-emerald-400">-19.45 dBm (At ONT)</p>
                    </div>
                  </div>
                </div>
              )}

              {cockpitTab === 'billing' && (
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 text-xs font-mono">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="font-bold text-purple-400">Multi-Gateway Reconciliation Engine</span>
                    <Badge variant="success">All 5 Gateways Active & Reconciled</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                      <span className="text-slate-500 block text-[10px]">Razorpay</span>
                      <span className="font-bold text-white">₹4.28L Today</span>
                      <Badge variant="success" className="text-[9px] mt-1">Settled</Badge>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                      <span className="text-slate-500 block text-[10px]">Cashfree</span>
                      <span className="font-bold text-white">₹2.94L Today</span>
                      <Badge variant="success" className="text-[9px] mt-1">Settled</Badge>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                      <span className="text-slate-500 block text-[10px]">PhonePe</span>
                      <span className="font-bold text-white">₹3.12L Today</span>
                      <Badge variant="success" className="text-[9px] mt-1">Settled</Badge>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                      <span className="text-slate-500 block text-[10px]">Paytm</span>
                      <span className="font-bold text-white">₹1.45L Today</span>
                      <Badge variant="success" className="text-[9px] mt-1">Settled</Badge>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                      <span className="text-slate-500 block text-[10px]">Stripe Int.</span>
                      <span className="font-bold text-white">\$1,840 Today</span>
                      <Badge variant="success" className="text-[9px] mt-1">Settled</Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 6. INDUSTRIES WE SERVE */}
      <section id="industries" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="info" className="text-xs font-mono uppercase tracking-widest">
            Broadband Sectors
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Built for Every Scale of Telecom Operation
          </h2>
          <p className="text-slate-400 text-sm">
            Whether managing 500 subscribers or 500,000 across multiple cities, AI ISP OS scales seamlessly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xl">
              🌐
            </div>
            <h3 className="text-lg font-bold text-white">Tier 1 & 2 FTTH ISPs</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automate multi-city operations with high-availability ACS clusters, automated OLT GPON provisioning, and multi-branch revenue reconciliation.
            </p>
          </div>

          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xl">
              📺
            </div>
            <h3 className="text-lg font-bold text-white">LCOs & MSO Cable Networks</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Transition from analog cable to digital Gigabit FTTH. Equip field technicians with GIS route maps and automate WhatsApp receipt delivery.
            </p>
          </div>

          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xl">
              🏢
            </div>
            <h3 className="text-lg font-bold text-white">Enterprise WISPs & Smart Cities</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Manage hybrid fiber and wireless point-to-point networks with granular SLA tracking, leased line billing, and strict zero-trust audit compliance.
            </p>
          </div>
        </div>
      </section>

      {/* 7. BUSINESS IMPACT & ROI CALCULATOR */}
      <section id="roi" className="py-20 bg-slate-900/40 border-y border-slate-800/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="success" className="text-xs font-mono uppercase tracking-widest">
              Business ROI Estimator
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Calculate Your Operational Cost Savings
            </h2>
            <p className="text-slate-400 text-sm">
              See the immediate business impact of switching to AI ISP OS automation.
            </p>
          </div>

          <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl space-y-8">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase text-slate-300 font-mono">
                  Your Subscriber Base:
                </label>
                <span className="text-xl font-black text-sky-400 font-mono">
                  {roiSubscribers.toLocaleString()} Active FTTH Connections
                </span>
              </div>
              <input
                type="range"
                min="500"
                max="50000"
                step="500"
                value={roiSubscribers}
                onChange={(e) => setRoiSubscribers(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-slate-800">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Support Hours Saved / Mo</span>
                <p className="text-3xl font-black text-emerald-400 font-mono">{roiSavedHours} hrs</p>
                <p className="text-[11px] text-slate-500">Auto TR-069 diagnostics & resets</p>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Monthly Cost Savings</span>
                <p className="text-3xl font-black text-sky-400 font-mono">₹{roiSavedMoney.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500">Zero revenue leakage + automated billing</p>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">MTTR Acceleration</span>
                <p className="text-3xl font-black text-purple-400 font-mono">{roiFasterMttr}</p>
                <p className="text-[11px] text-slate-500">Fiber GIS digital twin route tracing</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. SUPPORTED CPE & OLT HARDWARE ECOSYSTEM */}
      <section id="hardware" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="info" className="text-xs font-mono uppercase tracking-widest">
            Universal Hardware Fleet
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Compatible with 100+ OLT & ONT Brands
          </h2>
          <p className="text-slate-400 text-sm">
            Plug and play with your existing warehouse inventory without replacing customer hardware.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { name: 'Genexis', model: 'Titanium & Platinum' },
            { name: 'Huawei', model: 'EchoLife HG Series' },
            { name: 'ZTE', model: 'ZXHN F600 Series' },
            { name: 'Nokia', model: 'Alcatel-Lucent GPON' },
            { name: 'TP-Link', model: 'Archer & XC Series' },
            { name: 'Syrotech', model: 'Dual Band XPON' },
            { name: 'V-SOL', model: 'EPON / GPON ONTs' },
            { name: 'Netlink', model: 'HG Series XPON' },
            { name: 'DBC Technologies', model: 'Dual Band Mesh' },
            { name: 'BDCOM', model: 'Core OLT Series' },
            { name: 'D-Link', model: 'DIR & DPN Series' },
            { name: 'Optilink', model: 'Smart Fiber ONUs' },
          ].map((item, idx) => (
            <div key={idx} className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-center space-y-1 hover:border-sky-500/50 transition-all">
              <span className="font-bold text-white text-sm block">{item.name}</span>
              <span className="text-[10px] font-mono text-slate-400">{item.model}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 9. FREQUENTLY ASKED QUESTIONS */}
      <section id="faq" className="py-20 bg-slate-900/40 border-y border-slate-800/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="warning" className="text-xs font-mono uppercase tracking-widest">
              Got Questions?
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'How long does it take to migrate from our existing billing or ACS system?',
                a: 'Most ISPs complete migration in less than 48 hours. Our automated CSV and API bulk importer ingests subscribers, active plans, IP assignments, and ONT serial numbers seamlessly without disrupting customer connectivity.',
              },
              {
                q: 'Do we need to replace existing ONTs installed at customer homes?',
                a: 'No! AI ISP OS is built on standard TR-069 (CWMP) and TR-181 protocol specifications. As long as your ONTs support TR-069 (which 99% of GPON/XPON devices do), they will automatically bind and communicate with zero hardware changes.',
              },
              {
                q: 'How do payment gateways work with multi-tenant operators?',
                a: 'Each operator or ISP tenant configures their own payment credentials (Razorpay Key ID/Secret, Cashfree App ID, PhonePe Merchant ID, Stripe Secret). All keys are encrypted at rest with AES-256-GCM, and 100% of customer collections route directly into your business bank account.',
              },
              {
                q: 'Can we deploy AI ISP OS on our own private cloud or dedicated servers?',
                a: 'Yes. In addition to our managed Cloud SaaS (99.999% SLA), we provide On-Premise Enterprise deployments with Docker / Kubernetes orchestration, local database replication, and private ACS endpoints.',
              },
              {
                q: 'How does the WhatsApp Bot handle duplicate expiry reminders?',
                a: 'Our built-in Anti-Spam deduplication engine prevents duplicate dispatches for the same event and billing cycle. It only triggers when explicitly scheduled or manually force-retriggered by support operators.',
              },
            ].map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between font-bold text-white text-sm"
                  >
                    <span>{item.q}</span>
                    <ChevronDown className={`w-4 h-4 text-sky-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="p-5 pt-0 text-xs text-slate-300 leading-relaxed border-t border-slate-800/40">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. CALL TO ACTION BANNER */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative p-8 sm:p-12 bg-gradient-to-r from-sky-900 via-indigo-950 to-purple-950 border border-sky-500/30 rounded-3xl shadow-2xl text-center space-y-6 overflow-hidden">
            <div className="space-y-3 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
                Ready to Upgrade Your ISP Operations to Autonomous AI OS?
              </h2>
              <p className="text-slate-300 text-sm sm:text-base">
                Join hundreds of FTTH providers who have cut support calls by 85% and eliminated revenue leakage.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Button
                size="lg"
                onClick={() => setShowDemoModal(true)}
                className="bg-white hover:bg-slate-100 text-slate-950 font-black text-sm px-8 py-3.5 rounded-2xl shadow-xl transition-all"
              >
                Schedule Live 1-on-1 Demo
              </Button>
              <Button
                size="lg"
                onClick={() => setShowSalesModal(true)}
                className="bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/40 font-bold text-sm px-8 py-3.5 rounded-2xl transition-all"
              >
                Contact Enterprise Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 11. FUTURISTIC ENTERPRISE FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-800/80 pt-16 pb-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Column 1: Brand */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-lg font-black text-white font-mono">AI ISP OS</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Autonomous telecom operations platform combining TR-069 ACS, Fiber GIS digital twin, multi-gateway billing, and WhatsApp bots.
              </p>
              <div className="flex items-center space-x-2 text-[11px] font-mono text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>ISO 27001 & SOC-2 Type II Certified</span>
              </div>
            </div>

            {/* Column 2: Portals */}
            <div className="space-y-3">
              <span className="font-bold text-white text-xs uppercase tracking-wider font-mono">Operations Portals</span>
              <ul className="space-y-2 text-xs">
                <li><Link to="/operator/login" className="hover:text-sky-400 transition-colors">🏢 Operator NOC Portal</Link></li>
                <li><Link to="/superadmin/login" className="hover:text-sky-400 transition-colors">👑 Super Admin Cloud</Link></li>
                <li><Link to="/customer/login" className="hover:text-sky-400 transition-colors">📱 Customer Self-Service</Link></li>
                <li><Link to="/tech/login" className="hover:text-sky-400 transition-colors">🔧 Technician Field App</Link></li>
              </ul>
            </div>

            {/* Column 3: Modules */}
            <div className="space-y-3">
              <span className="font-bold text-white text-xs uppercase tracking-wider font-mono">Core Modules</span>
              <ul className="space-y-2 text-xs">
                <li><a href="#modules" className="hover:text-sky-400 transition-colors">Customer 360° Operations</a></li>
                <li><a href="#modules" className="hover:text-sky-400 transition-colors">TR-069 ACS Auto-Provisioning</a></li>
                <li><a href="#modules" className="hover:text-sky-400 transition-colors">Fiber GIS Route Tracing</a></li>
                <li><a href="#modules" className="hover:text-sky-400 transition-colors">Multi-Gateway Reconciliation</a></li>
                <li><a href="#modules" className="hover:text-sky-400 transition-colors">WhatsApp Automation Bot</a></li>
              </ul>
            </div>

            {/* Column 4: Contact */}
            <div className="space-y-3">
              <span className="font-bold text-white text-xs uppercase tracking-wider font-mono">Enterprise Inquiries</span>
              <p className="text-xs text-slate-400">
                Talk to our telecom systems engineers for on-premise deployment or white-labeling:
              </p>
              <button
                onClick={() => setShowSalesModal(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-sky-400" />
                <span>sales@ai-ispos.com</span>
              </button>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 font-mono">
            <p>© 2026 AI ISP OS. All Rights Reserved. Carrier-Grade Telecom Infrastructure.</p>
            <div className="flex space-x-6">
              <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
              <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
              <span className="hover:text-slate-400 cursor-pointer">Security SLA</span>
            </div>
          </div>
        </div>
      </footer>

      {/* MODAL 1: BOOK LIVE DEMO */}
      <Modal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        title="Schedule a Live 1-on-1 Platform Demo"
        subtitle="Experience AI ISP OS live with our principal telecom architecture team."
      >
        {demoSubmitted ? (
          <div className="p-6 text-center space-y-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="font-bold text-white text-sm">Demo Request Received!</h4>
            <p className="text-xs text-slate-300">
              Our enterprise sales engineer will reach out via phone & WhatsApp within 2 hours to confirm your screen-share demo.
            </p>
          </div>
        ) : (
          <form onSubmit={handleDemoSubmit} className="space-y-4 font-sans text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={demoForm.name}
                  onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-300 mb-1">Phone / WhatsApp Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98450 12345"
                  value={demoForm.phone}
                  onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="ramesh@fastfiber.in"
                  value={demoForm.email}
                  onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-300 mb-1">ISP / Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="FastFiber Networks Pvt Ltd"
                  value={demoForm.ispName}
                  onChange={(e) => setDemoForm({ ...demoForm, ispName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Subscriber Scale</label>
                <select
                  value={demoForm.subscribersCount}
                  onChange={(e) => setDemoForm({ ...demoForm, subscribersCount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold"
                >
                  <option value="500-1000">500 – 1,000 Subscribers</option>
                  <option value="1000-5000">1,000 – 5,000 Subscribers</option>
                  <option value="5000-20000">5,000 – 20,000 Subscribers</option>
                  <option value="20000+">20,000+ Subscribers (Tier 1)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-300 mb-1">Preferred Demo Date</label>
                <input
                  type="date"
                  value={demoForm.preferredDate}
                  onChange={(e) => setDemoForm({ ...demoForm, preferredDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Specific Requirements / Pain Points</label>
              <textarea
                rows={2}
                placeholder="e.g. Migrating 4,000 ONTs from legacy ACS, need Razorpay auto-renewal setup..."
                value={demoForm.notes}
                onChange={(e) => setDemoForm({ ...demoForm, notes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <Button type="button" variant="outline" onClick={() => setShowDemoModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-bold">
                Confirm Demo Booking
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 2: GET INSTANT QUOTE ESTIMATOR */}
      <Modal
        isOpen={showQuoteModal}
        onClose={() => setShowQuoteModal(false)}
        title="Instant AI ISP OS Pricing Estimator"
        subtitle="Transparent per-subscriber pricing with zero hidden fees."
      >
        <div className="space-y-5 text-xs font-sans">
          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="font-bold text-slate-300">Subscriber Scale:</span>
              <span className="font-black text-sky-400 text-sm">{quoteSubscribers.toLocaleString()} FTTH Connections</span>
            </div>
            <input
              type="range"
              min="500"
              max="25000"
              step="500"
              value={quoteSubscribers}
              onChange={(e) => setQuoteSubscribers(Number(e.target.value))}
              className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Deployment Model</label>
              <select
                value={quoteDeployment}
                onChange={(e) => setQuoteDeployment(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold"
              >
                <option value="CLOUD">Managed Cloud SaaS (99.999% SLA)</option>
                <option value="ON_PREMISE">On-Premise Dedicated Cluster</option>
              </select>
            </div>

            <div className="space-y-1.5 pt-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={quoteGateways}
                  onChange={(e) => setQuoteGateways(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="text-slate-300 font-medium">Multi-Gateway Reconciliation</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={quoteWhatsapp}
                  onChange={(e) => setQuoteWhatsapp(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="text-slate-300 font-medium">WhatsApp Automated Receipts Bot</span>
              </label>
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between font-mono">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Estimated Monthly Billing</span>
              <p className="text-2xl font-black text-emerald-400">₹{quoteResult.monthly.toLocaleString()} <span className="text-xs text-slate-400">/month</span></p>
              <p className="text-[10px] text-slate-500">Effective: ₹{quoteResult.perSub} per subscriber / month</p>
            </div>
            <Button
              onClick={() => {
                setShowQuoteModal(false);
                setShowDemoModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              Lock This Price
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: PRODUCT MODULE DETAIL LIGHTBOX */}
      {selectedModule && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedModule(null)}
          title={selectedModule.title}
          subtitle={selectedModule.subtitle}
        >
          <div className="space-y-4 text-xs font-sans">
            <p className="text-slate-300 leading-relaxed">
              {selectedModule.description}
            </p>

            <div className="space-y-2 pt-2">
              <span className="font-bold text-white text-xs block">Key Capabilities:</span>
              <ul className="space-y-2">
                {selectedModule.features.map((f: string, idx: number) => (
                  <li key={idx} className="flex items-start space-x-2 p-2 bg-slate-900 rounded-xl border border-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-slate-200">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <Button variant="outline" onClick={() => setSelectedModule(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setSelectedModule(null);
                  setShowDemoModal(true);
                }}
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold"
              >
                Book Live Walkthrough
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 4: CONTACT SALES */}
      <Modal
        isOpen={showSalesModal}
        onClose={() => setShowSalesModal(false)}
        title="Contact Enterprise Telecom Sales"
        subtitle="Speak directly with our solutions architecture team."
      >
        {salesSubmitted ? (
          <div className="p-6 text-center space-y-3 bg-sky-500/10 border border-sky-500/30 rounded-2xl">
            <CheckCircle2 className="w-10 h-10 text-sky-400 mx-auto" />
            <h4 className="font-bold text-white text-sm">Message Sent to Sales Desk!</h4>
            <p className="text-xs text-slate-300">
              Our regional enterprise director will respond to your email and phone within 1 business hour.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSalesSubmit} className="space-y-4 font-sans text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Your Name</label>
              <input
                type="text"
                required
                value={salesForm.name}
                onChange={(e) => setSalesForm({ ...salesForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={salesForm.email}
                  onChange={(e) => setSalesForm({ ...salesForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-300 mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={salesForm.phone}
                  onChange={(e) => setSalesForm({ ...salesForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Message / RFP Details</label>
              <textarea
                rows={3}
                required
                placeholder="We require an on-premise carrier deployment for 15,000 GPON lines..."
                value={salesForm.message}
                onChange={(e) => setSalesForm({ ...salesForm, message: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <Button type="button" variant="outline" onClick={() => setShowSalesModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-bold">
                Send Inquiries
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
