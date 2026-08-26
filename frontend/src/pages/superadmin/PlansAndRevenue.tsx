import React, { useEffect, useState } from 'react';
import { DollarSign, Check, Zap, Shield, BarChart2 } from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { api } from '../../services/api.js';

export const PlansAndRevenue: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = async () => {
    setIsLoading(true);
    setError(null);
    const res = await api.getSuperAdminPlans();
    setIsLoading(false);
    if (res.success) {
      setPlans(res.plans || []);
    } else {
      setError(res.error || 'Failed to fetch plans');
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return (
    <Shell
      portalType="superadmin"
      title="SaaS Plans & Subscription Monetization"
      breadcrumbs={[{ label: 'Plans & Revenue' }]}
    >
      <StateWrapper isLoading={isLoading} error={error} onRetry={fetchPlans}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div
                key={p._id}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden shadow-lg"
              >
                <div>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-[#0F172A]">{p.name}</h3>
                    <Badge variant="info">{p.code}</Badge>
                  </div>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-3xl font-extrabold text-[#0F172A]">₹{p.monthlyFee.toLocaleString()}</span>
                    <span className="text-xs text-[#64748B] ml-1">/ month</span>
                  </div>

                  <div className="mt-6 space-y-3 border-t border-[#E2E8F0] pt-4 text-xs text-[#334155]">
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-[#047857]" />
                      <span>Up to {p.maxCustomers.toLocaleString()} Subscribers</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-[#047857]" />
                      <span>Up to {p.maxDevices.toLocaleString()} ONT Devices</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-[#047857]" />
                      <span>Up to {p.maxTechnicians} Field Techs</span>
                    </div>
                    {(p.features || []).map((f: string, i: number) => (
                      <div key={i} className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-[#1677FF]" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E2E8F0]">
                  <Button variant="outline" className="w-full" size="sm">
                    Configure Quotas
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </StateWrapper>
    </Shell>
  );
};
