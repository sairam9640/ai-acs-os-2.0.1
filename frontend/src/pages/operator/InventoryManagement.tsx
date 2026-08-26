import React, { useEffect, useState } from 'react';
import { Package, Search, Plus, Radio, Server, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button, Input } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../services/api.js';

export const InventoryManagement: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    itemType: 'GPON_ONT',
    vendor: 'Huawei',
    modelName: 'HG8145V5',
    serialNumber: '',
    macAddress: '',
    warehouseLocation: 'Main POP Warehouse',
  });

  const fetchInventory = async () => {
    setIsLoading(true);
    setError(null);
    const res = await api.getInventory({ status: statusFilter });
    setIsLoading(false);
    if (res.success) {
      setItems(res.items || []);
    } else {
      setError(res.error || 'Failed to fetch inventory');
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [statusFilter]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.createInventoryItem(newItem);
    if (res.success) {
      setIsAddModalOpen(false);
      fetchInventory();
      alert('Hardware asset registered to inventory.');
    } else {
      alert(res.error || 'Failed to register asset');
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'Asset Tag / Serial #',
      accessor: (item) => (
        <div>
          <span className="font-bold text-[#0F172A] font-mono text-xs">{item.assetTag}</span>
          <p className="text-[11px] font-mono text-[#1677FF] mt-0.5">{item.serialNumber}</p>
        </div>
      ),
    },
    {
      header: 'Hardware Model',
      accessor: (item) => (
        <div>
          <span className="text-xs font-semibold text-[#1E293B]">{item.vendor} {item.modelName}</span>
          <p className="text-[10px] text-[#64748B]">{item.itemType}</p>
        </div>
      ),
    },
    {
      header: 'Warehouse Location',
      accessor: (item) => <span className="text-xs text-[#334155]">{item.warehouseLocation}</span>,
    },
    {
      header: 'Status',
      accessor: (item) => (
        <Badge
          variant={
            item.status === 'available'
              ? 'success'
              : item.status === 'assigned'
              ? 'info'
              : 'warning'
          }
          dot
        >
          {item.status}
        </Badge>
      ),
    },
  ];

  return (
    <Shell
      portalType="operator"
      title="Hardware Asset & CPE Inventory Lifecycle"
      breadcrumbs={[{ label: 'Inventory' }]}
      primaryAction={
        <Button onClick={() => setIsAddModalOpen(true)} variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Register Hardware Asset</span>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex items-center space-x-2 bg-white p-4 border border-[#E2E8F0] rounded-xl">
          <span className="text-xs text-[#64748B]">Filter Status:</span>
          {['all', 'available', 'assigned', 'faulty'].map((st) => (
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
          isEmpty={items.length === 0}
          emptyTitle="No Hardware Assets Found"
          emptyMessage="No devices match the current filter. Click Register to add a new asset."
          emptyActionLabel="Register Hardware"
          onEmptyAction={() => setIsAddModalOpen(true)}
          error={error}
          onRetry={fetchInventory}
        >
          <DataTable columns={columns} data={items} keyExtractor={(i) => i._id} />
        </StateWrapper>
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Hardware Asset"
        subtitle="Track ONT, OLT cards, and SFP modules across warehouse stock."
      >
        <form onSubmit={handleCreateItem} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Hardware Vendor"
              value={newItem.vendor}
              onChange={(e) => setNewItem({ ...newItem, vendor: e.target.value })}
            />
            <Input
              label="Model Name"
              value={newItem.modelName}
              onChange={(e) => setNewItem({ ...newItem, modelName: e.target.value })}
            />
          </div>
          <Input
            label="Serial Number (SN)"
            required
            placeholder="e.g. HWTC10293847"
            value={newItem.serialNumber}
            onChange={(e) => setNewItem({ ...newItem, serialNumber: e.target.value })}
          />
          <Input
            label="MAC Address"
            placeholder="e.g. AA:BB:CC:11:22:33"
            value={newItem.macAddress}
            onChange={(e) => setNewItem({ ...newItem, macAddress: e.target.value })}
          />
          <Input
            label="Warehouse / POP Location"
            value={newItem.warehouseLocation}
            onChange={(e) => setNewItem({ ...newItem, warehouseLocation: e.target.value })}
          />

          <div className="flex justify-end space-x-3 pt-4 border-t border-[#E2E8F0]">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Register Asset
            </Button>
          </div>
        </form>
      </Modal>
    </Shell>
  );
};
