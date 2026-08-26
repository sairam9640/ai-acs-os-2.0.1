import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Smartphone, Activity, HelpCircle, Bot, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { MobileShell } from '../../components/layout/MobileShell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { api } from '../../services/api.js';

export const CustomerHome: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchHome = async () => {
    setIsLoading(true);
    setError(null);
    const res = await api.getCustomerHome();
    setIsLoading(false);
    if (res.success) {
      setData(res);
    } else {
      setError(res.error || 'Failed to load subscriber portal');
    }
  };

  useEffect(() => {
    fetchHome();
  }, []);

  const conn = data?.connection || {};
  const cust = data?.customer || {};

  return (
    <MobileShell portalType="customer" title="Apex Fiber Home">
      <StateWrapper isLoading={isLoading} error={error} onRetry={fetchHome}>
        <div className="space-y-4">
          {/* Main Status Hero Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40 border border-[#E2E8F0] rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-[#64748B]">Welcome,</span>
                <h2 className="text-lg font-bold text-[#0F172A]">{cust.name || 'Arjun Sharma'}</h2>
                <p className="text-[11px] font-mono text-[#1677FF] mt-0.5">{cust.accountNumber}</p>
              </div>
              <Badge variant={conn.status === 'online' ? 'success' : 'danger'} dot>
                {conn.status === 'online' ? 'Connected' : 'Offline'}
              </Badge>
            </div>

            <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#047857]">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">{cust.plan?.name || '100 Mbps Unlimited'}</p>
                  <p className="text-[11px] text-[#64748B]">Optical Signal: {conn.opticalPowerDbm || -21.4} dBm (Optimal)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <button
                onClick={() => navigate('/customer/wifi')}
                className="p-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl text-left transition"
              >
                <Wifi className="w-4 h-4 text-[#1677FF] mb-1" />
                <p className="font-semibold text-[#1E293B]">Wi-Fi Settings</p>
                <span className="text-[10px] text-[#64748B]">Change password</span>
              </button>

              <button
                onClick={() => navigate('/customer/devices')}
                className="p-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl text-left transition"
              >
                <Smartphone className="w-4 h-4 text-[#6D28D9] mb-1" />
                <p className="font-semibold text-[#1E293B]">Connected Devices</p>
                <span className="text-[10px] text-[#64748B]">{data?.connectedDevicesCount || 3} active clients</span>
              </button>
            </div>
          </div>

          {/* AI Self-Troubleshooting Banner */}
          <div
            onClick={() => navigate('/customer/support')}
            className="p-4 bg-white hover:bg-white border border-[#BFDBFE] rounded-2xl flex items-center justify-between cursor-pointer transition shadow-md"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#1677FF]">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#0F172A]">AI Self-Troubleshooting Assistant</h3>
                <p className="text-[11px] text-[#64748B]">Diagnose slow speed or connection drops instantly</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#1677FF]" />
          </div>
        </div>
      </StateWrapper>
    </MobileShell>
  );
};
