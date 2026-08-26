import React, { useEffect, useState } from 'react';
import { Zap, Play, Pause, Plus, Clock, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button, Input } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../services/api.js';

export const AutomationRules: React.FC = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: 'Auto-Dispatch Tech on Splitter Optical Drop',
    trigger: 'OPTICAL_DROP_DETECTED',
    action: 'CREATE_TECHNICIAN_JOB',
    cooldownMinutes: 30,
  });

  const fetchRules = async () => {
    setIsLoading(true);
    setError(null);
    const res = await api.getAutomationRules();
    setIsLoading(false);
    if (res.success) {
      setRules(res.rules || []);
      setLogs(res.logs || []);
    } else {
      setError(res.error || 'Failed to fetch automation rules');
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = async (id: string) => {
    const res = await api.toggleAutomationRule(id);
    if (res.success) fetchRules();
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.createAutomationRule(newRule);
    if (res.success) {
      setIsAddModalOpen(false);
      fetchRules();
      alert('Automation rule created and activated.');
    } else {
      alert(res.error || 'Failed to create automation rule');
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'Rule Name / Trigger',
      accessor: (r) => (
        <div>
          <span className="font-bold text-[#0F172A] text-xs">{r.name}</span>
          <div className="flex items-center space-x-2 text-[11px] text-[#64748B] mt-0.5">
            <span className="font-mono text-[#1677FF]">{r.trigger}</span>
            <span>•</span>
            <span>Cooldown: {r.cooldownMinutes} mins</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Automated Action',
      accessor: (r) => <Badge variant="purple">{r.action}</Badge>,
    },
    {
      header: 'Executions',
      accessor: (r) => <span className="text-xs font-semibold text-[#1E293B]">{r.executionCount || 0} runs</span>,
    },
    {
      header: 'State',
      accessor: (r) => (
        <Badge variant={r.isActive ? 'success' : 'neutral'} dot>
          {r.isActive ? 'Active' : 'Paused'}
        </Badge>
      ),
    },
    {
      header: 'Toggle',
      accessor: (r) => (
        <Button
          size="sm"
          variant={r.isActive ? 'outline' : 'success'}
          onClick={() => handleToggle(r._id)}
        >
          {r.isActive ? (
            <>
              <Pause className="w-3.5 h-3.5 mr-1 text-[#B45309]" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 mr-1" />
              <span>Enable</span>
            </>
          )}
        </Button>
      ),
    },
  ];

  return (
    <Shell
      portalType="operator"
      title="Event-Driven Automation Engine"
      breadcrumbs={[{ label: 'Automation Rules' }]}
      primaryAction={
        <Button onClick={() => setIsAddModalOpen(true)} variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          <span>New Automation Rule</span>
        </Button>
      }
    >
      <div className="space-y-6">
        <StateWrapper isLoading={isLoading} error={error} onRetry={fetchRules}>
          <DataTable columns={columns} data={rules} keyExtractor={(r) => r._id} />
        </StateWrapper>

        {/* Execution Log Table */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3 shadow-md">
          <div className="flex items-center space-x-2 border-b border-[#E2E8F0] pb-3">
            <Clock className="w-4 h-4 text-[#1677FF]" />
            <h3 className="text-sm font-bold text-[#0F172A]">Recent Rule Executions & Audit</h3>
          </div>

          <div className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-xs text-[#94A3B8] py-3 text-center">No recent rule executions logged.</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log._id}
                  className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-[#1E293B]">{log.ruleName}</span>
                      <Badge
                        variant={
                          log.result === 'SUCCESS'
                            ? 'success'
                            : log.result === 'SKIPPED_COOLDOWN'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {log.result}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-0.5">{log.message}</p>
                  </div>
                  <span className="text-[11px] text-[#94A3B8] font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create Automation Rule"
        subtitle="Trigger automated notifications or field dispatches when network telemetry crosses thresholds."
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          <Input
            label="Rule Name"
            required
            value={newRule.name}
            onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#334155]">Trigger Event</label>
            <select
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3.5 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={newRule.trigger}
              onChange={(e) => setNewRule({ ...newRule, trigger: e.target.value })}
            >
              <option value="OPTICAL_DROP_DETECTED">OPTICAL_DROP_DETECTED (Power delta &gt; 6 dB)</option>
              <option value="OFFLINE_CLUSTER_DETECTED">OFFLINE_CLUSTER_DETECTED (Multiple ONTs down)</option>
              <option value="ALARM_TRIGGERED">ALARM_TRIGGERED (Critical OLT/PON Alarm)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#334155]">Automated Action</label>
            <select
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3.5 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={newRule.action}
              onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
            >
              <option value="CREATE_TECHNICIAN_JOB">CREATE_TECHNICIAN_JOB (Auto-Dispatch)</option>
              <option value="SEND_WHATSAPP_NOTIFICATION">SEND_WHATSAPP_NOTIFICATION (Broadcast)</option>
              <option value="RUN_REMOTE_DIAGNOSTIC">RUN_REMOTE_DIAGNOSTIC (OTDR / Ping)</option>
            </select>
          </div>

          <Input
            label="Cooldown Window (Minutes)"
            type="number"
            value={newRule.cooldownMinutes}
            onChange={(e) => setNewRule({ ...newRule, cooldownMinutes: Number(e.target.value) })}
          />

          <div className="flex justify-end space-x-3 pt-4 border-t border-[#E2E8F0]">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save & Activate Rule
            </Button>
          </div>
        </form>
      </Modal>
    </Shell>
  );
};
