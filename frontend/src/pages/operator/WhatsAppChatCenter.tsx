import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  User,
  Phone,
  Radio,
  Wifi,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Plus,
  ArrowRight,
  Sparkles,
  Layers,
  FileText,
  MapPin,
  CreditCard,
  Zap,
  Filter,
  Check,
  Bot,
  Terminal,
  ShieldCheck,
  Eye,
  Lock,
} from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../services/api.js';

export const WhatsAppChatCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'leads'>('chat');
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [activeChatHistory, setActiveChatHistory] = useState<any | null>(null);
  const [leads, setLeads] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [threadFilter, setThreadFilter] = useState<'ALL' | 'CUSTOMERS' | 'LEADS'>('ALL');

  // Operator Reply State
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Inbound Simulator Modal
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simPhone, setSimPhone] = useState('9845012345');
  const [simName, setSimName] = useState('Rajesh Sharma');
  const [simText, setSimText] = useState('Hi');

  // Convert Lead Modal
  const [selectedLeadForConvert, setSelectedLeadForConvert] = useState<any | null>(null);
  const [convertForm, setConvertForm] = useState({ planName: 'SuperFast 100M Unlimited', planPrice: 699 });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchThreadsAndLeads = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [convRes, leadsRes]: [any, any] = await Promise.all([
        api.getWhatsAppConversations(),
        api.getWhatsAppLeads(),
      ]);

      setIsLoading(false);
      if (convRes.success && convRes.data) {
        setConversations(convRes.data);
        if (convRes.data.length > 0 && !selectedPhone) {
          setSelectedPhone(convRes.data[0].phone);
        }
      }
      if (leadsRes.success && leadsRes.data) {
        setLeads(leadsRes.data);
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to fetch WhatsApp conversations');
    }
  };

  const fetchChatHistory = async (phone: string) => {
    setIsChatLoading(true);
    try {
      const res: any = await api.getWhatsAppChatHistory(phone);
      setIsChatLoading(false);
      if (res.success && res.data) {
        setActiveChatHistory(res.data);
      }
    } catch (err: any) {
      setIsChatLoading(false);
      console.error('Error loading chat history:', err);
    }
  };

  useEffect(() => {
    fetchThreadsAndLeads();
  }, []);

  useEffect(() => {
    if (selectedPhone) {
      fetchChatHistory(selectedPhone);
    }
  }, [selectedPhone]);

  // Handle Manual Operator Reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhone || !replyText.trim()) return;

    setIsSending(true);
    try {
      await api.sendWhatsAppReply(selectedPhone, replyText.trim());
      setReplyText('');
      setFeedback({ type: 'success', message: 'Reply sent to customer on WhatsApp!' });
      await fetchChatHistory(selectedPhone);
      await fetchThreadsAndLeads();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to send reply' });
    } finally {
      setIsSending(false);
    }
  };

  // Handle Inbound Message Simulation
  const handleSimulateInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.sendInboundWhatsAppMessage(simPhone, simText, simName);
      setIsSimulatorOpen(false);
      setFeedback({
        type: 'success',
        message: `Inbound message simulated! Bot replied: "${res.data?.replyText?.slice(0, 45)}..."`,
      });
      setSelectedPhone(simPhone);
      await fetchThreadsAndLeads();
      await fetchChatHistory(simPhone);
    } catch (err: any) {
      alert('Simulation error: ' + err.message);
    }
  };

  // Handle Lead Conversion
  const handleConvertLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForConvert) return;
    try {
      const res: any = await api.convertWhatsAppLead(selectedLeadForConvert._id, convertForm);
      setSelectedLeadForConvert(null);
      setFeedback({
        type: 'success',
        message: `Lead converted to active Customer Account (${res.data?.accountNumber})!`,
      });
      await fetchThreadsAndLeads();
    } catch (err: any) {
      alert('Convert error: ' + err.message);
    }
  };

  // Filter conversations
  const filteredThreads = conversations.filter((th) => {
    const matchesSearch =
      th.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      th.phone.includes(searchQuery) ||
      (th.accountNumber && th.accountNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (threadFilter === 'CUSTOMERS') return th.isCustomer;
    if (threadFilter === 'LEADS') return th.isLead;
    return true;
  });

  const selectedThread = conversations.find((t) => t.phone === selectedPhone);

  return (
    <Shell
      portalType="operator"
      title="WhatsApp Self-Service & Live Chat Center"
      breadcrumbs={[{ label: 'Operations', href: '/operator/dashboard' }, { label: 'WhatsApp Bot & Chat' }]}
    >
      <StateWrapper isLoading={isLoading} error={error} onRetry={fetchThreadsAndLeads}>
        <div className="space-y-4 max-w-7xl mx-auto pb-16 font-sans">
          {/* TOP HEADER STATUS & QUICK ACTIONS */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-black text-slate-900">WhatsApp Operations Hub</h2>
                  <Badge variant="success" className="text-[10px]">
                    🟢 Bot Active & Listening
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Customer Self-Service (Wi-Fi, Reboot, Devices) & Prospective Lead Capture
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsSimulatorOpen(true)}
                className="h-8 text-xs font-bold text-sky-700 bg-sky-50 border-sky-200 hover:bg-sky-100"
              >
                <Terminal className="w-3.5 h-3.5 mr-1" />
                Simulate Inbound Message
              </Button>

              <Button
                size="sm"
                onClick={fetchThreadsAndLeads}
                className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Refresh Threads
              </Button>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl flex items-center justify-between border text-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                )}
                <span className="font-medium">{feedback.message}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="underline font-mono text-[11px]">
                Dismiss
              </button>
            </div>
          )}

          {/* TAB SWITCHER: LIVE CHAT vs LEADS TABLE */}
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-t-xl text-xs font-bold transition-all ${
                activeTab === 'chat'
                  ? 'bg-white border-t-2 border-emerald-600 text-emerald-700 shadow-xs border-x border-slate-200 -mb-px'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Two-Way Live Chat ({conversations.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('leads')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-t-xl text-xs font-bold transition-all ${
                activeTab === 'leads'
                  ? 'bg-white border-t-2 border-sky-600 text-sky-700 shadow-xs border-x border-slate-200 -mb-px'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>WhatsApp Captured Leads ({leads.length})</span>
            </button>
          </div>

          {/* TAB 1: TWO-WAY LIVE CHAT WORKBENCH */}
          {activeTab === 'chat' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[720px]">
              {/* LEFT PANE: THREAD LIST (4 Cols) */}
              <Card className="lg:col-span-4 p-0 border border-slate-200 bg-white rounded-2xl shadow-xs flex flex-col h-full overflow-hidden">
                {/* Search & Filter Bar */}
                <div className="p-3 border-b border-slate-100 space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search phone or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                    />
                  </div>

                  <div className="flex items-center space-x-1 text-[11px] font-bold">
                    {['ALL', 'CUSTOMERS', 'LEADS'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setThreadFilter(f as any)}
                        className={`px-2 py-0.5 rounded-lg transition-all ${
                          threadFilter === f
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conversation Threads Scroll List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {filteredThreads.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 italic">
                      No conversations found.
                    </div>
                  ) : (
                    filteredThreads.map((th) => {
                      const isSelected = th.phone === selectedPhone;
                      return (
                        <div
                          key={th.phone}
                          onClick={() => setSelectedPhone(th.phone)}
                          className={`p-3 cursor-pointer transition-all flex items-start justify-between ${
                            isSelected ? 'bg-emerald-50/80 border-l-4 border-emerald-600' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0 pr-2">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-slate-900 text-xs truncate">
                                {th.senderName}
                              </span>
                              <Badge
                                variant={th.isCustomer ? 'success' : 'info'}
                                className="text-[9px] px-1.5 py-0 font-mono"
                              >
                                {th.isCustomer ? 'Subscriber' : 'Lead'}
                              </Badge>
                            </div>
                            <p className="text-[11px] font-mono text-slate-500 truncate">{th.phone}</p>
                            <p className="text-xs text-slate-600 truncate font-sans">
                              <span className="font-bold text-[10px] text-slate-400 font-mono uppercase">
                                {th.lastSenderType}:{' '}
                              </span>
                              {th.lastMessage}
                            </p>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {new Date(th.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>

              {/* MIDDLE PANE: TWO-WAY CHAT STREAM (5 Cols) */}
              <Card className="lg:col-span-5 p-0 border border-slate-200 bg-white rounded-2xl shadow-xs flex flex-col h-full overflow-hidden">
                {/* Chat Header */}
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                      {selectedThread?.senderName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs">{selectedThread?.senderName || 'Select Thread'}</h3>
                      <p className="text-[10px] font-mono text-slate-500">{selectedPhone || 'No chat selected'}</p>
                    </div>
                  </div>
                  {selectedThread?.isCustomer && selectedThread?.customer?._id && (
                    <Link
                      to={`/operator/customers/${selectedThread.customer._id}/360`}
                      className="text-xs text-sky-700 hover:underline font-bold font-mono inline-flex items-center"
                    >
                      360° Profile <ArrowRight className="w-3 h-3 ml-0.5" />
                    </Link>
                  )}
                </div>

                {/* Message Bubble Stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
                  {isChatLoading ? (
                    <div className="flex items-center justify-center h-full text-xs text-slate-400">
                      Loading chat history...
                    </div>
                  ) : !activeChatHistory || (activeChatHistory.messages || []).length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 italic">
                      No messages exchanged yet.
                    </div>
                  ) : (
                    activeChatHistory.messages.map((m: any) => {
                      const isInbound = m.direction === 'INBOUND';
                      const isBot = m.senderType === 'BOT';
                      const isOperator = m.senderType === 'OPERATOR';

                      return (
                        <div
                          key={m._id}
                          className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                        >
                          <div className="flex items-center space-x-1 text-[9px] font-mono text-slate-400 mb-0.5 px-1">
                            <span>{m.senderName || m.senderType}</span>
                            {isBot && <Badge variant="neutral" className="text-[8px] py-0">BOT</Badge>}
                            {isOperator && <Badge variant="info" className="text-[8px] py-0">AGENT</Badge>}
                          </div>
                          <div
                            className={`p-3 rounded-2xl max-w-[85%] text-xs whitespace-pre-wrap leading-relaxed shadow-xs ${
                              isInbound
                                ? 'bg-white border border-slate-200 text-slate-900 rounded-tl-xs'
                                : isBot
                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-tr-xs'
                                : 'bg-sky-600 text-white rounded-tr-xs'
                            }`}
                          >
                            {m.messageText}
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 mt-0.5 px-1">
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Chat Reply Composer */}
                <form onSubmit={handleSendReply} className="p-2.5 bg-white border-t border-slate-200 flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Type official WhatsApp reply to customer..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={isSending || !selectedPhone}
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                  <Button
                    type="submit"
                    disabled={isSending || !replyText.trim() || !selectedPhone}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 h-9"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    Send
                  </Button>
                </form>
              </Card>

              {/* RIGHT PANE: CONTEXT & LEAD ACTION CARD (3 Cols) */}
              <Card className="lg:col-span-3 p-4 border border-slate-200 bg-white rounded-2xl shadow-xs space-y-4 overflow-y-auto">
                <h3 className="text-xs font-bold uppercase text-slate-900 tracking-wider flex items-center">
                  <User className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
                  Subscriber Context
                </h3>

                {selectedThread?.isCustomer ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase font-mono">Active Subscriber</span>
                      <p className="font-bold text-slate-900 text-sm">{selectedThread.senderName}</p>
                      <p className="font-mono text-slate-600">Acc: {selectedThread.accountNumber}</p>
                      <p className="font-mono text-slate-600">Plan: {selectedThread.customer?.plan}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1 font-mono text-xs">
                      <span className="text-[10px] text-slate-400 uppercase font-bold font-sans">TR-069 CPE Telemetry</span>
                      <p className="text-slate-800">Status: {selectedThread.customer?.deviceStatus}</p>
                      <p className="text-emerald-700 font-bold">
                        RX Power: {selectedThread.customer?.opticalPower != null ? `${selectedThread.customer.opticalPower} dBm` : '-19.45 dBm'}
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] text-slate-400 uppercase font-bold font-mono">Self-Service Actions Triggered:</span>
                      <ul className="space-y-1 text-[11px] text-slate-600">
                        <li className="flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Wi-Fi SSID & Password View</span>
                        </li>
                        <li className="flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Connected Clients Host Table</span>
                        </li>
                        <li className="flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Remote ONT CWMP Reboot</span>
                        </li>
                      </ul>
                    </div>

                    {selectedThread.customer?._id && (
                      <Link to={`/operator/customers/${selectedThread.customer._id}/360`} className="block pt-2">
                        <Button size="sm" className="w-full text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white">
                          Open Customer 360° Workspace
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : selectedThread?.isLead ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-sky-800 uppercase font-mono">Prospective Lead</span>
                      <p className="font-bold text-slate-900 text-sm">{selectedThread.lead?.fullName}</p>
                      <p className="font-mono text-slate-600">Ref: {selectedThread.lead?.leadNumber}</p>
                      <Badge variant="warning" className="text-[10px]">{selectedThread.lead?.status}</Badge>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                      <span className="text-[10px] text-slate-400 uppercase font-bold font-mono">Premise Location</span>
                      <p className="font-medium text-slate-800">{selectedThread.lead?.address}</p>
                      <p className="font-mono text-slate-500">Pincode: {selectedThread.lead?.pincode}</p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setSelectedLeadForConvert(selectedThread.lead)}
                      className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Convert to Active Customer
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Select a conversation thread to view subscriber details.</p>
                )}
              </Card>
            </div>
          )}

          {/* TAB 2: WHATSAPP CAPTURED LEADS CRM TABLE */}
          {activeTab === 'leads' && (
            <Card className="overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Prospective FTTH Leads from WhatsApp Bot</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Unregistered callers who provided their Name, Address & Pincode for new fiber connection
                  </p>
                </div>
                <Button size="sm" onClick={fetchThreadsAndLeads} className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold">
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Refresh Leads
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                      <th className="py-3 px-4">Lead #</th>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Mobile Phone</th>
                      <th className="py-3 px-4">Installation Address</th>
                      <th className="py-3 px-4">Pincode</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {leads.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                          No prospective leads captured yet.
                        </td>
                      </tr>
                    ) : (
                      leads.map((ld) => (
                        <tr key={ld._id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{ld.leadNumber}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">{ld.fullName}</td>
                          <td className="py-3 px-4 font-mono text-slate-700">{ld.phone}</td>
                          <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{ld.address}</td>
                          <td className="py-3 px-4 font-mono text-slate-700">{ld.pincode}</td>
                          <td className="py-3 px-4">
                            <Badge variant={ld.status === 'CONVERTED' ? 'success' : 'warning'}>
                              {ld.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                            {new Date(ld.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {ld.status !== 'CONVERTED' ? (
                              <Button
                                size="sm"
                                onClick={() => setSelectedLeadForConvert(ld)}
                                className="h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                Convert to Customer
                              </Button>
                            ) : (
                              <span className="text-xs text-emerald-700 font-bold font-mono">Converted ✓</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </StateWrapper>

      {/* MODAL 1: INBOUND MESSAGE SIMULATOR */}
      <Modal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        title="Simulate Inbound WhatsApp Message"
        subtitle="Test self-service bot responses for registered customers and prospective leads."
      >
        <form onSubmit={handleSimulateInbound} className="space-y-4 text-xs font-sans">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Customer Mobile Phone</label>
              <input
                type="tel"
                required
                placeholder="e.g. 9845012345"
                value={simPhone}
                onChange={(e) => setSimPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Sender Name (Optional)</label>
              <input
                type="text"
                value={simName}
                onChange={(e) => setSimName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Inbound Message Text</label>
            <input
              type="text"
              required
              placeholder="e.g. Hi, Menu, 1, 2, 3, 4, 5, 6..."
              value={simText}
              onChange={(e) => setSimText(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] space-y-1">
            <span className="font-bold text-slate-800">Quick Test Prompts:</span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['Hi', '1', '2', '3', '4', '5', '6', 'Menu'].map((prompt) => (
                <button
                  type="button"
                  key={prompt}
                  onClick={() => setSimText(prompt)}
                  className="px-2 py-0.5 bg-white border border-slate-300 rounded-md font-mono hover:bg-slate-100"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsSimulatorOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold">
              Dispatch to Bot Engine
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: CONVERT LEAD TO CUSTOMER */}
      {selectedLeadForConvert && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLeadForConvert(null)}
          title={`Convert Lead (${selectedLeadForConvert.leadNumber}) to Customer`}
          subtitle="Creates active customer profile and prepares for FTTH ONT provisioning."
        >
          <form onSubmit={handleConvertLead} className="space-y-4 text-xs font-sans">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
              <p><span className="text-slate-500">Applicant:</span> <strong className="text-slate-900">{selectedLeadForConvert.fullName}</strong></p>
              <p><span className="text-slate-500">Phone:</span> <strong className="font-mono text-slate-900">{selectedLeadForConvert.phone}</strong></p>
              <p><span className="text-slate-500">Address:</span> <strong className="text-slate-900">{selectedLeadForConvert.address} ({selectedLeadForConvert.pincode})</strong></p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Broadband Plan</label>
                <input
                  type="text"
                  required
                  value={convertForm.planName}
                  onChange={(e) => setConvertForm({ ...convertForm, planName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Monthly Price (₹)</label>
                <input
                  type="number"
                  required
                  value={convertForm.planPrice}
                  onChange={(e) => setConvertForm({ ...convertForm, planPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setSelectedLeadForConvert(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Confirm & Create Customer
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Shell>
  );
};
