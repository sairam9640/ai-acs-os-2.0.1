import React, { useEffect, useState } from 'react';
import { Smartphone, Pause, Play, Shield, Wifi } from 'lucide-react';
import { MobileShell } from '../../components/layout/MobileShell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { api } from '../../services/api.js';

export const CustomerDevices: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDevices = async () => {
    setIsLoading(true);
    const res = await api.getCustomerDevices();
    setIsLoading(false);
    if (res.success) setDevices(res.devices || []);
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleToggleBlock = async (mac: string, isBlocked: boolean) => {
    const res = await api.blockCustomerClient(mac, !isBlocked);
    if (res.success) {
      fetchDevices();
    } else {
      alert(res.error || 'Failed to pause device');
    }
  };

  return (
    <MobileShell portalType="customer" title="Connected Home Devices">
      <StateWrapper isLoading={isLoading} isEmpty={devices.length === 0} emptyTitle="No Devices Connected">
        <div className="space-y-3">
          {devices.map((d) => (
            <div
              key={d.mac}
              className="p-3.5 bg-white border border-[#E2E8F0] rounded-2xl flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#F1F5F9] flex items-center justify-center text-[#1677FF]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">{d.hostname || 'Device'}</p>
                  <p className="text-[11px] text-[#64748B] font-mono">{d.ip} • {d.interfaceType}</p>
                </div>
              </div>

              <Button
                size="sm"
                variant={d.isBlocked ? 'success' : 'outline'}
                onClick={() => handleToggleBlock(d.mac, d.isBlocked)}
              >
                {d.isBlocked ? (
                  <>
                    <Play className="w-3.5 h-3.5 mr-1" />
                    <span>Unpause</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 mr-1 text-[#B45309]" />
                    <span>Pause</span>
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </StateWrapper>
    </MobileShell>
  );
};
