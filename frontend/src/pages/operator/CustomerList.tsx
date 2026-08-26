import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Plus, Eye, Radio, Signal, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button, Input } from '../../components/ui/Button.js';
import { api } from '../../services/api.js';

export const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const navigate = useNavigate();

  const fetchCustomers = async () => {
    setIsLoading(true);
    setError(null);
    const res = await api.getCustomers({ search, status: statusFilter });
    setIsLoading(false);
    if (res.success) {
      setCustomers(res.customers || []);
    } else {
      setError(res.error || 'Failed to fetch customers');
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const columns: Column<any>[] = [
    {
      header: 'Subscriber / Account',
      accessor: (c) => (
        <div>
          <p className="font-semibold text-[#0F172A]">{c.fullName}</p>
          <div className="flex items-center space-x-2 text-xs text-[#64748B]">
            <span className="font-mono text-[#1677FF]">{c.accountNumber}</span>
            <span>•</span>
            <span>{c.phone}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Service Plan',
      accessor: (c) => (
        <div>
          <p className="text-xs font-semibold text-[#1E293B]">{c.servicePlan?.name || 'Broadband'}</p>
          <p className="text-[11px] text-[#64748B]">
            {c.servicePlan?.downloadSpeedMbps} Mbps | ₹{c.servicePlan?.monthlyFee}/mo
          </p>
        </div>
      ),
    },
    {
      header: 'Assigned ONT Device',
      accessor: (c) => {
        const dev = c.assignedDeviceId;
        if (!dev) return <span className="text-xs text-[#94A3B8] italic">No Device Assigned</span>;
        return (
          <div className="flex items-center space-x-2">
            <Radio className={`w-3.5 h-3.5 ${dev.status === 'online' ? 'text-[#047857]' : 'text-[#94A3B8]'}`} />
            <div>
              <p className="text-xs font-mono text-[#1E293B]">{dev.serialNumber}</p>
              <p className="text-[10px] text-[#64748B]">{dev.manufacturer} {dev.modelName}</p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Optical RX Signal',
      accessor: (c) => {
        const dev = c.assignedDeviceId;
        if (!dev || !dev.currentRxPowerDbm) return <span className="text-xs text-[#94A3B8]">-</span>;
        const pwr = dev.currentRxPowerDbm;
        let variant: 'success' | 'warning' | 'danger' = 'success';
        if (pwr < -27) variant = 'danger';
        else if (pwr < -24) variant = 'warning';

        return (
          <Badge variant={variant} dot>
            {pwr} dBm
          </Badge>
        );
      },
    },
    {
      header: 'Status',
      accessor: (c) => (
        <Badge variant={c.status === 'active' ? 'success' : 'warning'} dot>
          {c.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: (c) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/operator/customers/${c._id}`);
          }}
        >
          <Eye className="w-3.5 h-3.5 mr-1" />
          <span>Customer 360</span>
        </Button>
      ),
    },
  ];

  return (
    <Shell
      portalType="operator"
      title="Subscriber Directory"
      breadcrumbs={[{ label: 'Customers' }]}
      primaryAction={
        <Button onClick={() => navigate('/operator/customers/new')} variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Provision New Customer</span>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Search & Status Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 border border-[#E2E8F0] rounded-xl">
          <form onSubmit={handleSearchSubmit} className="w-full sm:w-80">
            <Input
              placeholder="Search by name, phone, account #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />
          </form>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-[#64748B]">Filter:</span>
            {['all', 'active', 'pending_install', 'suspended'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                  statusFilter === st
                    ? 'bg-sky-600 text-white'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Table View */}
        <StateWrapper
          isLoading={isLoading}
          isEmpty={customers.length === 0}
          emptyTitle="No Subscribers Found"
          emptyMessage="No customers match the current filter. Click Provision to onboard a new subscriber."
          emptyActionLabel="Provision Customer"
          onEmptyAction={() => navigate('/operator/customers/new')}
          error={error}
          onRetry={fetchCustomers}
        >
          <DataTable
            columns={columns}
            data={customers}
            keyExtractor={(c) => c._id}
            onRowClick={(c) => navigate(`/operator/customers/${c._id}`)}
          />
        </StateWrapper>
      </div>
    </Shell>
  );
};
