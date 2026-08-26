import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, Shield, Users, Radio, Wrench, AlertTriangle, CheckCircle2, ArrowLeft, ExternalLink, Power } from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';

export const TenantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { impersonateTenant } = useAuth();

  const fetchDetail = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    const res = await api.getTenantDetail(id);
    setIsLoading(false);
    if (res.success) {
      setData(res);
    } else {
      setError(res.error || 'Failed to fetch tenant detail');
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const toggleStatus = async () => {
    if (!id || !data?.tenant) return;
    const nextStatus = data.tenant.status === 'active' ? 'suspended' : 'active';
    const res = await api.updateTenantStatus(id, nextStatus);
    if (res.success) {
      fetchDetail();
    } else {
      alert(res.error || 'Failed to update status');
    }
  };

  const tenant = data?.tenant;
  const usage = data?.usage || {};

  return (
    <Shell
      portalType="superadmin"
      title={tenant ? `${tenant.displayName} Control Profile` : 'Tenant Detail'}
      breadcrumbs={[{ label: 'Tenants', href: '/superadmin/tenants' }, { label: tenant?.displayName || 'Detail' }]}
      primaryAction={
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (tenant) {
                impersonateTenant(tenant);
                navigate('/operator/dashboard');
              }
            }}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1" />
            <span>Impersonate NOC</span>
          </Button>
          <Button
            variant={tenant?.status === 'active' ? 'danger' : 'success'}
            size="sm"
            onClick={toggleStatus}
          >
            <Power className="w-3.5 h-3.5 mr-1" />
            <span>{tenant?.status === 'active' ? 'Suspend Tenant' : 'Activate Tenant'}</span>
          </Button>
        </div>
      }
    >
      <StateWrapper isLoading={isLoading} error={error} onRetry={fetchDetail}>
        {tenant && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center font-bold text-[#1677FF] text-xl">
                  {tenant.displayName?.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-[#0F172A]">{tenant.displayName}</h2>
                    <Badge variant={tenant.status === 'active' ? 'success' : 'warning'} dot>
                      {tenant.status}
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-[#64748B] mt-1">https://{tenant.subdomain}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[#94A3B8]">Plan Tier</span>
                  <p className="font-semibold text-[#1E293B]">{tenant.plan?.name || 'Enterprise'}</p>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Monthly Billing</span>
                  <p className="font-semibold text-[#1E293B]">₹{(tenant.plan?.monthlyFee || 4999).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Owner Contact</span>
                  <p className="font-semibold text-[#1E293B]">{tenant.owner?.email}</p>
                </div>
              </div>
            </div>

            {/* Plan Usage Bars */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-[#0F172A]">Subscription Quotas & Fleet Capacity</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Customers Bar */}
                <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#64748B]">Subscribers</span>
                    <span className="font-semibold text-[#1E293B]">
                      {usage.customers?.current || 0} / {usage.customers?.limit || 5000}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          ((usage.customers?.current || 0) / (usage.customers?.limit || 5000)) * 100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Devices Bar */}
                <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#64748B]">ONT Devices</span>
                    <span className="font-semibold text-[#1E293B]">
                      {usage.devices?.current || 0} / {usage.devices?.limit || 5000}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          ((usage.devices?.current || 0) / (usage.devices?.limit || 5000)) * 100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Technicians Bar */}
                <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#64748B]">Field Technicians</span>
                    <span className="font-semibold text-[#1E293B]">
                      {usage.technicians?.current || 0} / {usage.technicians?.limit || 20}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          ((usage.technicians?.current || 0) / (usage.technicians?.limit || 20)) * 100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* CWMP ACS Provisioning Config */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A] flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-[#047857]" />
                    <span>TR-069 CWMP & ACS Auto-Provisioning Endpoints</span>
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">Configure these parameters on ONT / CPE hardware for zero-touch cloud enrollment</p>
                </div>
                <Badge variant="success" dot>Live Ready</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                  <span className="text-[#94A3B8] block text-[11px] mb-1 font-sans">CWMP ACS URL</span>
                  <span className="text-[#047857] font-bold select-all">{data?.cwmpUrl || 'http://ciniplay.in:7547'}</span>
                </div>
                <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                  <span className="text-[#94A3B8] block text-[11px] mb-1 font-sans">Operator Key (Auth Token)</span>
                  <span className="text-[#1677FF] font-bold select-all">{tenant.operatorKey}</span>
                </div>
              </div>
            </div>

            {/* Audit Trail for this Tenant */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-3">
              <h3 className="text-sm font-bold text-[#0F172A]">Recent Security & Governance Audits</h3>
              <div className="space-y-2 text-xs">
                {(data?.recentAuditLogs || []).map((log: any) => (
                  <div
                    key={log._id}
                    className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono text-[#1677FF]">{log.action}</span>
                      <p className="text-[#64748B] mt-0.5">By {log.actorEmail}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={log.result === 'SUCCESS' ? 'success' : 'danger'}>{log.result}</Badge>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </StateWrapper>
    </Shell>
  );
};
