import React, { useEffect, useState } from 'react';
import { HelpCircle, Bot, Send, Ticket, Plus, CheckCircle2 } from 'lucide-react';
import { MobileShell } from '../../components/layout/MobileShell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button, Input } from '../../components/ui/Button.js';
import { api } from '../../services/api.js';

export const CustomerSupport: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([
    {
      sender: 'ai',
      text: 'Hello! I am your Apex Fiber Virtual Assistant. How can I help you with your internet connection today?',
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const fetchTickets = async () => {
    const res = await api.getCustomerTickets();
    if (res.success) setTickets(res.tickets || []);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userMsg = chatMessage;
    setChatHistory((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setChatMessage('');
    setIsChatLoading(true);

    const res = await api.customerAiChat(userMsg);
    setIsChatLoading(false);

    if (res.success) {
      setChatHistory((prev) => [
        ...prev,
        { sender: 'ai', text: res.reply, action: res.suggestedAction },
      ]);
    }
  };

  return (
    <MobileShell portalType="customer" title="Help & AI Support">
      <div className="space-y-4">
        {/* Interactive AI Chatbot Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center space-x-2 border-b border-[#E2E8F0] pb-2">
            <Bot className="w-5 h-5 text-[#1677FF]" />
            <h3 className="text-xs font-bold text-[#0F172A]">AI Self-Troubleshooting</h3>
          </div>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl text-xs max-w-[85%] ${
                  msg.sender === 'user'
                    ? 'ml-auto bg-sky-600 text-white rounded-br-none'
                    : 'bg-[#F1F5F9] text-[#1E293B] rounded-bl-none'
                }`}
              >
                <p>{msg.text}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-[#E2E8F0]">
            <input
              type="text"
              placeholder="Ask a question or report an issue..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <Button size="sm" type="submit" variant="primary" isLoading={isChatLoading}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>

        {/* Existing Tickets Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-3 shadow-lg">
          <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2">
            <h3 className="text-xs font-bold text-[#0F172A] flex items-center space-x-2">
              <Ticket className="w-4 h-4 text-[#047857]" />
              <span>Service Tickets</span>
            </h3>
          </div>

          <div className="space-y-2">
            {tickets.length === 0 ? (
              <p className="text-xs text-[#94A3B8] py-3 text-center">No active service tickets.</p>
            ) : (
              tickets.map((t) => (
                <div key={t._id} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-1">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-semibold text-[#1E293B]">{t.subject}</p>
                    <Badge variant={t.status === 'resolved' ? 'success' : 'info'}>{t.status}</Badge>
                  </div>
                  <p className="text-[11px] text-[#64748B] font-mono">{t.ticketNumber}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </MobileShell>
  );
};
