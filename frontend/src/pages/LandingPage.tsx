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
  Lock
} from 'lucide-react';
import { Button, Input } from '../components/ui/Button.js';
import { WifiRouter3DCanvas } from '../components/landing/WifiRouter3DCanvas.js';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [showLoginMenu, setShowLoginMenu] = useState(false);

  // Demo form state
  const [demoForm, setDemoForm] = useState({
    name: '',
    email: '',
    phone: '',
    ispName: '',
    subscribersCount: '1000-5000',
    notes: '',
  });
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  // Sales contact form state
  const [salesForm, setSalesForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [salesSubmitted, setSalesSubmitted] = useState(false);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
    setTimeout(() => {
      setDemoSubmitted(false);
      setShowDemoModal(false);
      setDemoForm({ name: '', email: '', phone: '', ispName: '', subscribersCount: '1000-5000', notes: '' });
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E2E8F0] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-[#0F172A]">AI ISP OS</span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                Cloud ACS 2.0
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-[#475569]">
            <a href="#features" className="hover:text-emerald-600 transition-colors">Features</a>
            <a href="#acs" className="hover:text-emerald-600 transition-colors">TR-069 ACS</a>
            <a href="#portals" className="hover:text-emerald-600 transition-colors">Portals</a>
            <a href="#hardware" className="hover:text-emerald-600 transition-colors">Supported ONTs</a>
          </nav>

          {/* Action Buttons: ONLY Login, Request Demo, Contact Sales */}
          <div className="flex items-center space-x-3">
            {/* Contact Sales Button */}
            <button
              onClick={() => setShowSalesModal(true)}
              className="hidden sm:inline-flex items-center px-3.5 py-2 text-xs font-semibold text-[#334155] hover:text-emerald-600 transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Contact Sales
            </button>

            {/* Request Demo Button */}
            <button
              onClick={() => setShowDemoModal(true)}
              className="inline-flex items-center px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl shadow-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Request Demo
            </button>

            {/* Login Dropdown / Direct Link */}
            <div className="relative">
              <button
                onClick={() => setShowLoginMenu(!showLoginMenu)}
                className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-all"
              >
                <Lock className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                <span>Login</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1 text-slate-400" />
              </button>

              {/* Login Dropdown Menu */}
              {showLoginMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white border border-[#E2E8F0] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setShowLoginMenu(false)}
                >
                  <div className="px-3.5 py-2 border-b border-[#F1F5F9] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Select Your Portal
                  </div>
                  <Link
                    to="/operator/login"
                    className="flex items-center px-3.5 py-2.5 hover:bg-[#F8FAFC] text-xs text-[#0F172A] transition"
                  >
                    <Building2 className="w-4 h-4 mr-2.5 text-emerald-600" />
                    <div>
                      <div className="font-semibold">Operator NOC Portal</div>
                      <div className="text-[10px] text-[#64748B]">Manage Fleet, Billing & GIS</div>
                    </div>
                  </Link>
                  <Link
                    to="/customer/login"
                    className="flex items-center px-3.5 py-2.5 hover:bg-[#F8FAFC] text-xs text-[#0F172A] transition"
                  >
                    <Users className="w-4 h-4 mr-2.5 text-blue-600" />
                    <div>
                      <div className="font-semibold">Subscriber Self-Care</div>
                      <div className="text-[10px] text-[#64748B]">Wi-Fi, Invoices & Tickets</div>
                    </div>
                  </Link>
                  <Link
                    to="/tech/login"
                    className="flex items-center px-3.5 py-2.5 hover:bg-[#F8FAFC] text-xs text-[#0F172A] transition"
                  >
                    <Wrench className="w-4 h-4 mr-2.5 text-amber-600" />
                    <div>
                      <div className="font-semibold">Field Workforce App</div>
                      <div className="text-[10px] text-[#64748B]">Task Dispatch & Optical Test</div>
                    </div>
                  </Link>
                  <Link
                    to="/superadmin/login"
                    className="flex items-center px-3.5 py-2.5 hover:bg-[#F8FAFC] text-xs text-[#0F172A] border-t border-[#F1F5F9] transition"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2.5 text-purple-600" />
                    <div>
                      <div className="font-semibold">Super Admin Console</div>
                      <div className="text-[10px] text-[#64748B]">Multi-ISP Tenant Governance</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28 bg-gradient-to-b from-white via-[#F8FAFC] to-[#F1F5F9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-6 shadow-sm">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Enterprise TR-069 & TR-181 Cloud ACS with Built-in AI NOC</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0F172A] max-w-4xl mx-auto leading-tight sm:leading-none">
            The AI-Powered Operating System for <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600">Modern ISPs</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-lg text-[#475569] max-w-2xl mx-auto leading-relaxed">
            Zero-touch ONT provisioning, real-time optical power diagnostics, remote Wi-Fi configuration, and GIS fiber management unified into a high-performance control plane.
          </p>

          {/* CTA Buttons: ONLY Login, Request Demo, Contact Sales */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setShowDemoModal(true)}
              className="px-6 py-3.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center space-x-2 transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Request Live Demo</span>
            </button>

            <button
              onClick={() => setShowSalesModal(true)}
              className="px-6 py-3.5 text-sm font-semibold text-[#0F172A] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl shadow-sm flex items-center space-x-2 transition-all hover:scale-[1.02]"
            >
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              <span>Contact Sales</span>
            </button>

            <button
              onClick={() => navigate('/operator/login')}
              className="px-6 py-3.5 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl flex items-center space-x-2 transition-all"
            >
              <Lock className="w-4 h-4 text-slate-500" />
              <span>Login to Portal</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          {/* INTERACTIVE 3D WI-FI ROUTER & CLIENT SPARK STREAM */}
          <div className="mt-14 max-w-5xl mx-auto">
            <div className="flex items-center justify-between px-2 mb-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#0F172A]">
                <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
                <span>Interactive 3D Wi-Fi Telemetry & Client Spark Stream</span>
              </div>
              <span className="text-[11px] text-[#64748B] hidden sm:inline-block">
                Hover over client devices to view live link rates & signal power
              </span>
            </div>
            <WifiRouter3DCanvas />
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-[#E2E8F0]">
            <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
              <div className="text-2xl font-bold text-[#0F172A]">100% Native</div>
              <div className="text-xs text-[#64748B] mt-0.5">TR-069 / TR-181 ACS</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-emerald-200/60 shadow-sm bg-emerald-50/20">
              <div className="text-2xl font-bold text-emerald-600">&lt; 150 ms</div>
              <div className="text-xs text-[#64748B] mt-0.5">SOAP Inform Latency</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-sky-200/60 shadow-sm bg-sky-50/20">
              <div className="text-2xl font-bold text-sky-600">Multi-Vendor</div>
              <div className="text-xs text-[#64748B] mt-0.5">Realtek, Genexis, Huawei, ZTE</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-purple-200/60 shadow-sm bg-purple-50/20">
              <div className="text-2xl font-bold text-purple-600">Multi-Tenant</div>
              <div className="text-xs text-[#64748B] mt-0.5">Strict Sub-Operator Isolation</div>
            </div>
          </div>

          {/* SMOOTH SCROLL DOWN ANIMATION (REFERENCE STYLE) */}
          <div className="mt-12 flex flex-col items-center justify-center animate-float-subtle">
            <a
              href="#portals"
              className="group flex flex-col items-center space-y-2 text-[#64748B] hover:text-emerald-600 transition-colors cursor-pointer"
            >
              <span className="text-[11px] font-semibold tracking-wider uppercase">Scroll to explore</span>
              <div className="w-6 h-10 rounded-full border-2 border-[#CBD5E1] group-hover:border-emerald-500 flex items-start justify-center p-1 transition-colors">
                <div className="w-1.5 h-2.5 rounded-full bg-emerald-500 animate-scroll-wheel"></div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* 3. PORTAL GATEWAY CARDS */}
      <section id="portals" className="py-16 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
              Unified Platform Gateways
            </h2>
            <p className="text-sm text-[#64748B] mt-2">
              Dedicated interfaces designed specifically for ISP network operators, field technicians, subscribers, and administrators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Operator NOC Portal */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-105 transition-transform">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">Operator NOC Portal</h3>
                <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
                  Real-time router monitoring, optical power diagnostics, subscriber management, GIS fiber routing, and AI command center.
                </p>
              </div>
              <Link
                to="/operator/login"
                className="mt-6 inline-flex items-center text-xs font-semibold text-emerald-600 hover:text-emerald-700 group-hover:translate-x-0.5 transition-all"
              >
                <span>Enter Operator Portal</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            {/* Subscriber Portal */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-blue-500/50 hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4 group-hover:scale-105 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">Subscriber Self-Service</h3>
                <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
                  Home broadband subscribers can change Wi-Fi SSIDs and passwords, check line status, view bills, and raise support tickets.
                </p>
              </div>
              <Link
                to="/customer/login"
                className="mt-6 inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 group-hover:translate-x-0.5 transition-all"
              >
                <span>Enter Customer Portal</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            {/* Field Workforce Portal */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-amber-500/50 hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 group-hover:scale-105 transition-transform">
                  <Wrench className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">Field Workforce App</h3>
                <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
                  Mobile-optimized technician interface for fiber installation jobs, on-site optical testing, and one-click ONT provisioning.
                </p>
              </div>
              <Link
                to="/tech/login"
                className="mt-6 inline-flex items-center text-xs font-semibold text-amber-600 hover:text-amber-700 group-hover:translate-x-0.5 transition-all"
              >
                <span>Enter Technician Portal</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            {/* Super Admin Console */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-purple-500/50 hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 mb-4 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">Super Admin Console</h3>
                <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
                  Multi-ISP tenant management, global revenue analytics, system health telemetry, WhatsApp Baileys engine, and audit logs.
                </p>
              </div>
              <Link
                to="/superadmin/login"
                className="mt-6 inline-flex items-center text-xs font-semibold text-purple-600 hover:text-purple-700 group-hover:translate-x-0.5 transition-all"
              >
                <span>Enter Super Admin</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CORE CAPABILITIES (FEATURES) */}
      <section id="features" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
              Enterprise Telecom & NOC Capabilities
            </h2>
            <p className="text-sm text-[#64748B] mt-2">
              Engineered to scale from small regional FTTH networks to tier-1 multi-city broadband deployments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-7 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-5">
                <Wifi className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">Zero-Touch Auto Provisioning</h3>
              <p className="text-xs text-[#64748B] mt-2.5 leading-relaxed">
                Automatically detect newly connected ONTs via TR-069 Inform, configure PPPoE WAN profiles, and assign Wi-Fi SSIDs without manual technician intervention.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-7 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 mb-5">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">Live Optical Power Diagnostics</h3>
              <p className="text-xs text-[#64748B] mt-2.5 leading-relaxed">
                Continuous optical Rx/Tx power tracking, temperature, and laser bias current monitoring with automated fiber bend and degradation alerts.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-7 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 mb-5">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">Geo-Spatial Fiber GIS Mapping</h3>
              <p className="text-xs text-[#64748B] mt-2.5 leading-relaxed">
                Interactive map of OLT nodes, optical splitters, splice enclosures, and customer drops with live power telemetry overlaid on street maps.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-7 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-5">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">AI-Powered NOC Diagnostics</h3>
              <p className="text-xs text-[#64748B] mt-2.5 leading-relaxed">
                Intelligent root-cause analysis for fiber line drops, rogue ONT detection, Wi-Fi channel interference mitigation, and automated ticket dispatch.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-7 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 mb-5">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">Strict Multi-Tenant Isolation</h3>
              <p className="text-xs text-[#64748B] mt-2.5 leading-relaxed">
                Multi-factor tenant resolution via URL slugs, subdomains, and PPPoE binding prevents cross-operator router mixing and preserves privacy.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-7 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-5">
                <Send className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">WhatsApp Automated Invoicing</h3>
              <p className="text-xs text-[#64748B] mt-2.5 leading-relaxed">
                Integrated multi-device WhatsApp engine delivers dynamic login OTPs, automated monthly bills, payment confirmation receipts, and outage notices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HARDWARE VENDOR SUPPORT */}
      <section id="hardware" className="py-16 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-8">
            Universal Compatibility Across Industry-Standard CPE & ONT Manufacturers
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 opacity-80">
            {['Genexis', 'Realtek', 'RicherLink', 'Huawei', 'ZTE', 'TP-Link', 'Syrotech', 'Netlink', 'V-SOL'].map((vendor) => (
              <div key={vendor} className="px-5 py-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm font-bold text-[#334155]">
                {vendor}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. BOTTOM CTA BANNER: ONLY Request Demo, Contact Sales, Login */}
      <section className="py-20 bg-gradient-to-tr from-slate-900 via-[#0F172A] to-slate-900 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Transform Your ISP Network Operations?
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Schedule a personalized walkthrough with our telecom engineering team to see AI ISP OS in action on your live fleet.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setShowDemoModal(true)}
              className="px-6 py-3.5 text-sm font-semibold text-[#0F172A] bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-lg transition-all"
            >
              Request Demo
            </button>
            <button
              onClick={() => setShowSalesModal(true)}
              className="px-6 py-3.5 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
            >
              Contact Sales
            </button>
            <Link
              to="/operator/login"
              className="px-6 py-3.5 text-sm font-semibold text-slate-300 hover:text-white transition-all flex items-center"
            >
              <span>Existing User Login</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-white border-t border-[#E2E8F0] py-12 text-xs text-[#64748B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-[10px]">
              AI
            </div>
            <span className="font-semibold text-[#0F172A]">AI ISP OS</span>
            <span>· All rights reserved.</span>
          </div>

          <div className="flex items-center space-x-6">
            <a href="#features" className="hover:text-emerald-600 transition">Features</a>
            <a href="#portals" className="hover:text-emerald-600 transition">Portals</a>
            <button onClick={() => setShowDemoModal(true)} className="hover:text-emerald-600 transition">Request Demo</button>
            <button onClick={() => setShowSalesModal(true)} className="hover:text-emerald-600 transition">Contact Sales</button>
            <Link to="/operator/login" className="hover:text-emerald-600 transition">Login</Link>
          </div>
        </div>
      </footer>

      {/* MODAL: REQUEST DEMO */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowDemoModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">Request a Live Demo</h3>
                <p className="text-xs text-[#64748B]">Experience AI ISP OS with your network topology</p>
              </div>
            </div>

            {demoSubmitted ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center text-emerald-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-bold text-sm">Demo Request Received</h4>
                <p className="text-xs text-emerald-700 mt-1">
                  Our telecom specialist will contact you on WhatsApp/Email within 2 business hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4">
                <Input
                  label="Your Full Name"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={demoForm.name}
                  onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Business Email"
                    type="email"
                    required
                    placeholder="name@isp.com"
                    value={demoForm.email}
                    onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                  />
                  <Input
                    label="Mobile Number (WhatsApp)"
                    type="tel"
                    required
                    placeholder="+91 98450 12345"
                    value={demoForm.phone}
                    onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="ISP / Broadband Name"
                    required
                    placeholder="e.g. Rudra Fibernet"
                    value={demoForm.ispName}
                    onChange={(e) => setDemoForm({ ...demoForm, ispName: e.target.value })}
                  />
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                      Subscribers / ONT Fleet Size
                    </label>
                    <select
                      className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      value={demoForm.subscribersCount}
                      onChange={(e) => setDemoForm({ ...demoForm, subscribersCount: e.target.value })}
                    >
                      <option value="100-500">100 – 500 Subscribers</option>
                      <option value="500-2000">500 – 2,000 Subscribers</option>
                      <option value="2000-10000">2,000 – 10,000 Subscribers</option>
                      <option value="10000+">10,000+ Subscribers (Tier-1)</option>
                    </select>
                  </div>
                </div>

                <Button type="submit" variant="primary" className="w-full bg-emerald-600 hover:bg-emerald-500">
                  <span>Submit Demo Request</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CONTACT SALES */}
      {showSalesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowSalesModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">Contact Sales Team</h3>
                <p className="text-xs text-[#64748B]">Speak with an AI ISP OS solutions architect</p>
              </div>
            </div>

            {salesSubmitted ? (
              <div className="p-6 rounded-2xl bg-blue-50 border border-blue-200 text-center text-blue-800">
                <CheckCircle2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-bold text-sm">Message Sent Successfully</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Our sales representative will reach out to you shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSalesSubmit} className="space-y-4">
                <Input
                  label="Your Name"
                  required
                  placeholder="Full Name"
                  value={salesForm.name}
                  onChange={(e) => setSalesForm({ ...salesForm, name: e.target.value })}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Email Address"
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={salesForm.email}
                    onChange={(e) => setSalesForm({ ...salesForm, email: e.target.value })}
                  />
                  <Input
                    label="Phone / WhatsApp"
                    type="tel"
                    required
                    placeholder="+91 98450 12345"
                    value={salesForm.phone}
                    onChange={(e) => setSalesForm({ ...salesForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                    How can we help your ISP?
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Tell us about your requirements (e.g. TR-069 migration, billing setup, custom ONT integration)..."
                    value={salesForm.message}
                    onChange={(e) => setSalesForm({ ...salesForm, message: e.target.value })}
                    required
                  />
                </div>

                <Button type="submit" variant="primary" className="w-full bg-slate-900 hover:bg-slate-800">
                  <span>Send Message to Sales</span>
                  <Send className="w-4 h-4 ml-1.5" />
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
