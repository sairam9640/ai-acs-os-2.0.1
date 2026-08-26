import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, Wrench, Clock, Search, Plus } from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button, Input } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../services/api.js';

export const AlertsAndIncidents: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [dispatchTechId, setDispatchTechId] = useState('');
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);

  const fetchIncidents = async () => {
    setIsLoading(true);
    setError(null);
    const [incRes, techRes] = await Promise.all([api.getIncidents(), api.getTechnicians()]);
    setIsLoading(false);
    if (incRes.success) setIncidents(incRes.incidents || []);
    if (techRes.success) setTechnicians(techRes.technicians || []);
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !dispatchTechId) return;

    const res = await api.dispatchTechnician(selectedIncident._id, {
      technicianUserId: dispatchTechId,
      priority: selectedIncident.severity === 'critical' ? 'critical' : 'high',
      title: `Dispatch: ${selectedIncident.title}`,
    });

    if (res.success) {
      setIsDispatchModalOpen(false);
      fetchIncidents();
      alert('Technician work order dispatched successfully.');
    } else {
      alert(res.error || 'Failed to dispatch technician');
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'Incident / Outage',
      accessor: (inc) => (
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-[#0F172A]">{inc.title}</span>
            <Badge variant={inc.severity === 'critical' ? 'danger' : 'warning'}>
              {inc.severity}
            </Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5 font-mono">{inc.incidentNumber}</p>
        </div>
      ),
    },
    {
      header: 'Affected Scope',
      accessor: (inc) => (
        <span className="text-xs font-semibold text-[#1E293B]">
          {inc.affectedCustomersCount || 1} Subscribers
        </span>
      ),
    },
    {
      header: 'Assigned Tech',
      accessor: (inc) => (
        <span className="text-xs text-[#334155]">
          {inc.assignedTechnicianId?.fullName || <span className="text-[#94A3B8] italic">Unassigned</span>}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (inc) => (
        <Badge variant={inc.status === 'resolved' ? 'success' : 'warning'} dot>
          {inc.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: (inc) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedIncident(inc);
            setIsDispatchModalOpen(true);
          }}
        >
          <Wrench className="w-3.5 h-3.5 mr-1" />
          <span>Dispatch Tech</span>
        </Button>
      ),
    },
  ];

  return (
    <Shell
      portalType="operator"
      title="Alert & Incident Operations Workbench"
      breadcrumbs={[{ label: 'Incidents' }]}
    >
      <StateWrapper isLoading={isLoading} error={error} onRetry={fetchIncidents}>
        <DataTable columns={columns} data={incidents} keyExtractor={(inc) => inc._id} />
      </StateWrapper>

      {/* Dispatch Technician Modal */}
      <Modal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        title="Dispatch Field Technician"
        subtitle={`Assign work order for incident: ${selectedIncident?.incidentNumber}`}
      >
        <form onSubmit={handleDispatch} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#334155]">Select Field Technician</label>
            <select
              required
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3.5 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={dispatchTechId}
              onChange={(e) => setDispatchTechId(e.target.value)}
            >
              <option value="">-- Choose Field Tech --</option>
              {technicians.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.fullName} ({t.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[#E2E8F0]">
            <Button type="button" variant="outline" onClick={() => setIsDispatchModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Confirm & Dispatch Work Order
            </Button>
          </div>
        </form>
      </Modal>
    </Shell>
  );
};
