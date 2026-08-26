import React, { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, Clock, AlertTriangle, User, Radio, FileText } from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button, Input } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../services/api.js';

export const ApprovalsWorkbench: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isDeciding, setIsDeciding] = useState(false);

  const fetchApprovals = async () => {
    setIsLoading(true);
    setError(null);
    const res = await api.getApprovals(statusFilter);
    setIsLoading(false);
    if (res.success) {
      setRequests(res.requests || []);
    } else {
      setError(res.error || 'Failed to fetch approval requests');
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [statusFilter]);

  const handleDecide = async (decision: 'approved' | 'rejected') => {
    if (!selectedReq) return;
    setIsDeciding(true);
    const res = await api.decideApproval(selectedReq._id, decision, decisionNotes);
    setIsDeciding(false);

    if (res.success) {
      setSelectedReq(null);
      setDecisionNotes('');
      fetchApprovals();
      alert(`Request has been ${decision}.`);
    } else {
      alert(res.error || `Failed to ${decision} request`);
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'Request # / Action',
      accessor: (r) => (
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-[#0F172A] font-mono text-xs">{r.requestNumber}</span>
            <Badge variant="warning">{r.actionType}</Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-1">{r.reason}</p>
        </div>
      ),
    },
    {
      header: 'Target Resource',
      accessor: (r) => (
        <div>
          <span className="text-xs font-semibold text-[#1E293B]">{r.targetResource}</span>
          <p className="text-[11px] font-mono text-[#1677FF]">{r.targetIdentifier}</p>
        </div>
      ),
    },
    {
      header: 'Requested By',
      accessor: (r) => (
        <div>
          <p className="text-xs font-semibold text-[#1E293B]">{r.requestedBy?.fullName}</p>
          <span className="text-[11px] text-[#64748B]">{r.requestedBy?.role}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (r) => (
        <Badge
          variant={
            r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'
          }
          dot
        >
          {r.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: (r) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedReq(r);
          }}
        >
          <FileText className="w-3.5 h-3.5 mr-1" />
          <span>Review Diff</span>
        </Button>
      ),
    },
  ];

  return (
    <Shell
      portalType="operator"
      title="High-Risk Action Approvals Workbench"
      breadcrumbs={[{ label: 'Approvals' }]}
    >
      <div className="space-y-4">
        {/* Status Filter Bar */}
        <div className="flex items-center space-x-2 bg-white p-4 border border-[#E2E8F0] rounded-xl">
          <span className="text-xs text-[#64748B]">Filter Status:</span>
          {['pending', 'approved', 'rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                statusFilter === st ? 'bg-sky-600 text-white' : 'bg-[#F1F5F9] text-[#64748B]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <StateWrapper
          isLoading={isLoading}
          isEmpty={requests.length === 0}
          emptyTitle="No Approval Requests"
          emptyMessage="No pending high-risk operational requests at this time."
          error={error}
          onRetry={fetchApprovals}
        >
          <DataTable columns={columns} data={requests} keyExtractor={(r) => r._id} />
        </StateWrapper>
      </div>

      {/* Review & Decision Modal */}
      {selectedReq && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReq(null)}
          title={`Review Request: ${selectedReq.requestNumber}`}
          subtitle={`Action: ${selectedReq.actionType} on ${selectedReq.targetResource} (${selectedReq.targetIdentifier})`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-2">
              <span className="font-bold text-[#334155]">Requested Parameters / Diff:</span>
              <pre className="p-2 bg-white rounded text-[11px] font-mono text-[#047857] overflow-x-auto">
                {JSON.stringify(selectedReq.parameters, null, 2)}
              </pre>
            </div>

            {selectedReq.status === 'pending' && (
              <div className="space-y-3 pt-2">
                <label className="block text-[#334155] font-semibold">Decision / Audit Notes</label>
                <textarea
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-sky-500"
                  rows={2}
                  placeholder="e.g. Authorized during scheduled midnight maintenance..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                />

                <div className="flex justify-end space-x-3 pt-3 border-t border-[#E2E8F0]">
                  <Button
                    variant="danger"
                    isLoading={isDeciding}
                    onClick={() => handleDecide('rejected')}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    <span>Reject Action</span>
                  </Button>
                  <Button
                    variant="success"
                    isLoading={isDeciding}
                    onClick={() => handleDecide('approved')}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    <span>Authorize & Execute</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </Shell>
  );
};
