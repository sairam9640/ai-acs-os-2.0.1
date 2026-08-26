import React, { useEffect, useState } from 'react';
import { Shield, Search, Lock, Filter, CheckCircle2, AlertCircle } from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { Input } from '../../components/ui/Button.js';
import { api } from '../../services/api.js';

export const GlobalAudit: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSearch, setActionSearch] = useState('');

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    setError(null);
    const res = await api.getAuditLogs({ action: actionSearch });
    setIsLoading(false);
    if (res.success) {
      setLogs(res.logs || []);
    } else {
      setError(res.error || 'Failed to fetch audit records');
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const columns: Column<any>[] = [
    {
      header: 'Action / Correlation ID',
      accessor: (l) => (
        <div>
          <span className="font-mono font-semibold text-[#1677FF]">{l.action}</span>
          <p className="text-[11px] font-mono text-[#94A3B8] mt-0.5">{l.correlationId}</p>
        </div>
      ),
    },
    {
      header: 'Actor & Role',
      accessor: (l) => (
        <div>
          <p className="text-[#1E293B]">{l.actorEmail}</p>
          <span className="text-xs text-[#64748B] capitalize">{l.actorRole?.replace('_', ' ')}</span>
        </div>
      ),
    },
    {
      header: 'Target Resource',
      accessor: (l) => (
        <span className="text-xs text-[#334155]">
          {l.targetResource} ({l.targetIdentifier || l.targetId?.slice(-6)})
        </span>
      ),
    },
    {
      header: 'Result',
      accessor: (l) => (
        <Badge variant={l.result === 'SUCCESS' ? 'success' : 'danger'}>
          {l.result}
        </Badge>
      ),
    },
    {
      header: 'Timestamp',
      accessor: (l) => (
        <span className="text-xs text-[#64748B]">{new Date(l.timestamp).toLocaleString()}</span>
      ),
    },
  ];

  return (
    <Shell
      portalType="superadmin"
      title="Tamper-Evident Security Audit Log"
      breadcrumbs={[{ label: 'Audit Log' }]}
    >
      <div className="space-y-4">
        <div className="p-3 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-[#64748B]">
            <Lock className="w-4 h-4 text-[#047857]" />
            <span>Cryptographically sealed audit trail. Passwords, auth secrets, and keys are masked.</span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchAuditLogs();
            }}
          >
            <Input
              placeholder="Filter by action..."
              value={actionSearch}
              onChange={(e) => setActionSearch(e.target.value)}
              className="w-64"
            />
          </form>
        </div>

        <StateWrapper isLoading={isLoading} error={error} onRetry={fetchAuditLogs}>
          <DataTable columns={columns} data={logs} keyExtractor={(l) => l._id} />
        </StateWrapper>
      </div>
    </Shell>
  );
};
