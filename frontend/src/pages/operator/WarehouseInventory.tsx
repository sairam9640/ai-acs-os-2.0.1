import React, { useEffect, useState } from 'react';
import {
  Layers,
  Plus,
  ArrowRightLeft,
  AlertTriangle,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  Package,
  Cpu,
  Radio,
  Clock,
  Calendar,
  Building,
} from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../services/api.js';

export const WarehouseInventory: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [expiringWarranties, setExpiringWarranties] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isStockOutModalOpen, setIsStockOutModalOpen] = useState(false);
  const [selectedItemForOut, setSelectedItemForOut] = useState<any>(null);

  const [stockInForm, setStockInForm] = useState<any>({
    category: 'ONT',
    modelName: 'Titanium-2122A',
    brand: 'Genexis',
    quantity: 5,
    purchaseOrderNumber: 'PO-2026-088',
    purchasePrice: 1650,
    warehouseLocation: 'Rack A-2',
    warrantyMonths: 12,
  });

  const [stockOutForm, setStockOutForm] = useState({
    destinationType: 'CUSTOMER',
    targetIdentifier: 'CUST-77210',
    note: 'Issued for new subscriber fiber installation',
  });

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchWarehouseData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [itemsRes, alertsRes, warRes, venRes]: any = await Promise.all([
        api.getWarehouseStock({ category: categoryFilter, search }),
        api.getLowStockAlerts(),
        api.getExpiringWarranties(60),
        api.getVendors(),
      ]);

      setIsLoading(false);
      if (itemsRes.success) setItems(itemsRes.items || []);
      if (alertsRes.success) setLowStockAlerts(alertsRes.alerts || []);
      if (warRes.success) setExpiringWarranties(warRes.items || []);
      if (venRes.success) setVendors(venRes.vendors || []);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to fetch warehouse stock');
    }
  };

  useEffect(() => {
    fetchWarehouseData();
  }, [categoryFilter]);

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.stockInWarehouse(stockInForm);
      setIsStockInModalOpen(false);
      fetchWarehouseData();
    } catch (err: any) {
      alert('Stock in error: ' + err.message);
    }
  };

  const handleStockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForOut) return;
    try {
      await api.stockOutWarehouse(selectedItemForOut._id, stockOutForm);
      setIsStockOutModalOpen(false);
      setSelectedItemForOut(null);
      fetchWarehouseData();
    } catch (err: any) {
      alert('Stock out error: ' + err.message);
    }
  };

  return (
    <Shell
      portalType="operator"
      title="Network Inventory & Spare Stock Warehouse"
      breadcrumbs={[{ label: 'Hardware Fleet' }, { label: 'Warehouse & Spares' }]}
      primaryAction={
        <Button
          size="sm"
          onClick={() => setIsStockInModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          <span>Receive Stock In</span>
        </Button>
      }
    >
      <StateWrapper isLoading={isLoading} error={error} onRetry={fetchWarehouseData}>
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {/* Low Stock Warning Banner */}
          {lowStockAlerts.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start justify-between shadow-xs">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Low Stock Threshold Warnings</h4>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {lowStockAlerts.map((a: any) => (
                      <span key={a.category} className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-800">
                        {a.category}: {a.inStockCount} units left (Min: {a.minThreshold})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Stock Table */}
          <Card className="overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-xs">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Warehouse Asset Inventory</h3>
                <p className="text-xs text-slate-500 mt-0.5">Track serials, batches, locations, and warranties</p>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-semibold text-slate-700"
                >
                  <option value="ALL">All Categories</option>
                  <option value="ONT">ONT Terminals</option>
                  <option value="ROUTER">Wi-Fi Routers</option>
                  <option value="OLT_CARD">OLT Line Cards</option>
                  <option value="SFP_TRANSCEIVER">SFP Transceivers</option>
                  <option value="SPLITTER">Optical Splitters</option>
                  <option value="FIBER_CABLE_DRUM">Fiber Cable Drums</option>
                  <option value="CLOSURE">Splice Closures</option>
                  <option value="FAT_BOX">FAT Boxes</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <th className="py-3 px-4">Item Code / Serial</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Model & Brand</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Warranty Expiry</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        No inventory assets found in warehouse.
                      </td>
                    </tr>
                  ) : (
                    items.map((item: any) => (
                      <tr key={item._id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-900 block">{item.itemCode}</span>
                          <span className="font-mono text-[10px] text-slate-400">{item.serialNumber || 'Batch Tracked'}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-sky-700">{item.category}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{item.brand} {item.modelName}</td>
                        <td className="py-3 px-4">
                          <Badge variant={item.status === 'IN_STOCK' ? 'success' : item.status === 'DEPLOYED' ? 'neutral' : 'warning'}>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">{item.warehouseLocation}</td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                          {item.warrantyExpiryDate ? new Date(item.warrantyExpiryDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {item.status === 'IN_STOCK' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedItemForOut(item);
                                setIsStockOutModalOpen(true);
                              }}
                              className="h-6 px-2 text-[10px] text-sky-700"
                            >
                              <ArrowRightLeft className="w-2.5 h-2.5 mr-1" />
                              Stock Out
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </StateWrapper>

      {/* MODAL: STOCK IN */}
      <Modal
        isOpen={isStockInModalOpen}
        onClose={() => setIsStockInModalOpen(false)}
        title="Receive New Hardware Stock (Stock-In)"
        subtitle="Registers serials and generates inventory asset tags."
      >
        <form onSubmit={handleStockIn} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Asset Category</label>
              <select
                value={stockInForm.category}
                onChange={(e) => setStockInForm({ ...stockInForm, category: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
              >
                <option value="ONT">ONT (Optical Network Terminal)</option>
                <option value="ROUTER">Wi-Fi Router</option>
                <option value="OLT_CARD">OLT Line Card</option>
                <option value="SFP_TRANSCEIVER">SFP PON Transceiver</option>
                <option value="SPLITTER">Optical Splitter</option>
                <option value="FIBER_CABLE_DRUM">Fiber Cable Drum</option>
                <option value="CLOSURE">Fiber Splice Closure</option>
                <option value="FAT_BOX">FAT Box</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Brand / Vendor</label>
              <input
                type="text"
                required
                value={stockInForm.brand}
                onChange={(e) => setStockInForm({ ...stockInForm, brand: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Model Name</label>
              <input
                type="text"
                required
                value={stockInForm.modelName}
                onChange={(e) => setStockInForm({ ...stockInForm, modelName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                max={100}
                value={stockInForm.quantity}
                onChange={(e) => setStockInForm({ ...stockInForm, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">PO / Invoice #</label>
              <input
                type="text"
                value={stockInForm.purchaseOrderNumber}
                onChange={(e) => setStockInForm({ ...stockInForm, purchaseOrderNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Price (₹/unit)</label>
              <input
                type="number"
                value={stockInForm.purchasePrice}
                onChange={(e) => setStockInForm({ ...stockInForm, purchasePrice: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsStockInModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Receive & Generate Serials
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: STOCK OUT */}
      {selectedItemForOut && (
        <Modal
          isOpen={isStockOutModalOpen}
          onClose={() => setIsStockOutModalOpen(false)}
          title={`Dispatch / Stock Out: ${selectedItemForOut.itemCode}`}
          subtitle="Assign asset to customer premise or technician van."
        >
          <form onSubmit={handleStockOut} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Destination Target</label>
              <select
                value={stockOutForm.destinationType}
                onChange={(e) => setStockOutForm({ ...stockOutForm, destinationType: e.target.value as any })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
              >
                <option value="CUSTOMER">Subscriber Premise (Account #)</option>
                <option value="TECHNICIAN_VAN">Field Technician Van</option>
                <option value="NETWORK_NODE">Network OLT/FAT Node</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Identifier (Account / Van #)</label>
              <input
                type="text"
                required
                placeholder="e.g. CUST-77210 or VAN-04"
                value={stockOutForm.targetIdentifier}
                onChange={(e) => setStockOutForm({ ...stockOutForm, targetIdentifier: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsStockOutModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold">
                Confirm Stock Out
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Shell>
  );
};
