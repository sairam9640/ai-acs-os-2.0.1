import React, { useState } from 'react';
import { Wifi, Lock, CheckCircle2, Shield } from 'lucide-react';
import { MobileShell } from '../../components/layout/MobileShell.js';
import { Button, Input } from '../../components/ui/Button.js';
import { api } from '../../services/api.js';

export const CustomerWiFi: React.FC = () => {
  const [ssid5g, setSsid5g] = useState('ApexFiber_Arjun_5G');
  const [pass5g, setPass5g] = useState('apexpassword123');
  const [ssid24, setSsid24] = useState('ApexFiber_Arjun_2.4G');
  const [pass24, setPass24] = useState('apexpassword123');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await api.updateCustomerWifi({
      wifi5g: { ssid: ssid5g, password: pass5g },
      wifi24: { ssid: ssid24, password: pass24 },
    });
    setIsLoading(false);

    if (res.success) {
      alert('Wi-Fi settings successfully updated and verified on your home router.');
    } else {
      alert(res.error || 'Failed to update Wi-Fi');
    }
  };

  return (
    <MobileShell portalType="customer" title="Home Wi-Fi Settings">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-4 shadow-lg">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
            <Wifi className="w-4 h-4 text-[#1677FF]" />
            <span>High-Speed 5 GHz Wi-Fi</span>
          </div>
          <Input
            label="5 GHz Network Name (SSID)"
            value={ssid5g}
            onChange={(e) => setSsid5g(e.target.value)}
          />
          <Input
            label="5 GHz Wi-Fi Password"
            type="text"
            value={pass5g}
            onChange={(e) => setPass5g(e.target.value)}
          />
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-4 shadow-lg">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
            <Wifi className="w-4 h-4 text-[#6D28D9]" />
            <span>Standard 2.4 GHz Wi-Fi</span>
          </div>
          <Input
            label="2.4 GHz Network Name (SSID)"
            value={ssid24}
            onChange={(e) => setSsid24(e.target.value)}
          />
          <Input
            label="2.4 GHz Wi-Fi Password"
            type="text"
            value={pass24}
            onChange={(e) => setPass24(e.target.value)}
          />
        </div>

        <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
          <CheckCircle2 className="w-4 h-4 mr-1.5" />
          <span>Apply Wi-Fi Changes</span>
        </Button>
      </form>
    </MobileShell>
  );
};
