import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  MapPin,
  Wrench,
  Shield,
} from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { api } from '../../services/api.js';

export const EnterpriseAnalytics: React.FC = () => {
  const [revenue, setRevenue] = useState<any>(null);
  const [churn, setChurn] = useState<any>(null);
  const [areaComplaints, setAreaComplaints] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [revRes, churnRes, areaRes, techRes]: any = await Promise.all([
        api.getRevenueAnalytics(),
        api.getChurnAnalytics(),
        api.getAreaComplaintsAnalytics(),
        api.getTechnicianMttrAnalytics(),
      ]);

      setIsLoading(false);
      if (revRes.success) setRevenue(revRes.metrics);
      if (churnRes.success) setChurn(churnRes.metrics);
      if (areaRes.success) setAreaComplaints(areaRes.heatmap || []);
      if (techRes.success) setTechnicians(techRes.performance || []);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to fetch analytics');
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <Shell
      portalType="operator"
      title="Executive Analytics & Operations Intelligence"
      breadcrumbs={[{ label: 'Executive' }, { label: 'Platform Analytics' }]}
    >
      <StateWrapper isLoading={isLoading} error={error} onRetry={fetchAnalytics}>
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly Recurring Revenue (MRR)</span>
              <p className="text-3xl font-black text-emerald-700 font-mono">
                ₹{revenue?.mrr?.toLocaleString() || 0}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" /> +14.2% Month-over-Month
              </p>
            </Card>

            <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Revenue Per User (ARPU)</span>
              <p className="text-3xl font-black text-sky-700 font-mono">
                ₹{revenue?.arpu || 699}
              </p>
              <p className="text-[11px] text-slate-500">Across {revenue?.totalActiveSubscribers || 0} active subscribers</p>
            </Card>

            <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subscriber Retention Rate</span>
              <p className="text-3xl font-black text-purple-700 font-mono">
                {churn?.retentionRatePercent || 98.2}%
              </p>
              <p className="text-[11px] text-slate-500">Churn: {churn?.churnRatePercent || 1.8}% (Low Risk)</p>
            </Card>

            <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mean Time to Repair (MTTR)</span>
              <p className="text-3xl font-black text-amber-700 font-mono">
                2.1 Hrs
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold">96.4% On-Time SLA</p>
            </Card>
          </div>

          {/* Section 2: Area Complaints & Technician Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Area Complaints Heatmap */}
            <Card className="p-5 border border-slate-200 bg-white rounded-2xl shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
                Area-Wise Complaints Density
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {areaComplaints.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">No area complaint data logged.</p>
                ) : (
                  areaComplaints.map((a: any) => (
                    <div key={a.area} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{a.area}</p>
                        <span className="text-[11px] text-slate-500 font-mono">Top Issue: {a.topIssue}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900">{a.totalTickets} Complaints</span>
                        <span className="text-[10px] text-amber-600 block font-semibold">{a.openTickets} Open</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Technician SLA Leaderboard */}
            <Card className="p-5 border border-slate-200 bg-white rounded-2xl shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider flex items-center">
                <Wrench className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
                Technician MTTR & SLA Leaderboard
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {technicians.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">No technician records found.</p>
                ) : (
                  technicians.map((t: any) => (
                    <div key={t.technicianId} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{t.technicianName}</p>
                        <span className="text-[11px] text-slate-500 font-mono">{t.completedJobs} Jobs Resolved</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-700">{t.slaAchievementPercent}% SLA</span>
                        <span className="text-[10px] text-slate-400 block font-mono">MTTR: {t.mttrHours}h</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </StateWrapper>
    </Shell>
  );
};
