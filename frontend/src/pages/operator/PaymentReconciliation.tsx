import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  Building2,
  Calendar,
} from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { api } from '../../services/api.js';

export const PaymentReconciliation: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [branchReport, setBranchReport] = useState<any[]>([]);
  const [totalTxns, setTotalTxns] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReconciliationData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sumRes, txnsRes, branchRes]: any = await Promise.all([
        api.getDailyReconciliation(),
        api.getPaymentTransactions({ status: statusFilter, search, page }),
        api.getBranchRevenueReport(),
      ]);

      setIsLoading(false);
      if (sumRes.success) setSummary(sumRes.summary);
      if (txnsRes.success) {
        setTransactions(txnsRes.items || []);
        setTotalTxns(txnsRes.total || 0);
      }
      if (branchRes.success) setBranchReport(branchRes.report || []);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to fetch reconciliation metrics');
    }
  };

  useEffect(() => {
    fetchReconciliationData();
  }, [statusFilter, page]);

  const handleSyncStatus = async (txnId: string) => {
    try {
      setActionLoading(true);
      await api.syncTransactionStatus(txnId);
      fetchReconciliationData();
    } catch (err: any) {
      alert('Error syncing transaction: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Shell
      portalType="operator"
      title="Payment Reconciliation & Settlements"
      breadcrumbs={[{ label: 'Billing & Payments' }, { label: 'Reconciliation Dashboard' }]}
    >
      <StateWrapper isLoading={isLoading} error={error} onRetry={fetchReconciliationData}>
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {/* Top Daily Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Collections</span>
              <p className="text-2xl font-black text-emerald-700 font-mono">
                ₹{summary?.totalCollected?.toLocaleString() || 0}
              </p>
              <p className="text-[11px] text-slate-500 font-sans">{summary?.successfulCount || 0} Successful Transactions</p>
            </Card>

            <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gateway Fees</span>
              <p className="text-2xl font-black text-slate-700 font-mono">
                ₹{summary?.totalFees?.toLocaleString() || 0}
              </p>
              <p className="text-[11px] text-slate-500 font-sans">Avg MDR ~1.8%</p>
            </Card>

            <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Bank Settlements</span>
              <p className="text-2xl font-black text-sky-700 font-mono">
                ₹{summary?.netSettled?.toLocaleString() || 0}
              </p>
              <p className="text-[11px] text-emerald-600 font-sans font-semibold">T+1 Settlement Active</p>
            </Card>

            <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Orders</span>
              <p className="text-2xl font-black text-amber-600 font-mono">
                {summary?.pendingCount || 0}
              </p>
              <p className="text-[11px] text-slate-500 font-sans">Awaiting payment capture</p>
            </Card>

            <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Failed / Rejected</span>
              <p className="text-2xl font-black text-rose-600 font-mono">
                {summary?.failedCount || 0}
              </p>
              <p className="text-[11px] text-slate-500 font-sans">Bank / Gateway dropouts</p>
            </Card>
          </div>

          {/* Branch Breakdown & Gateway Split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Gateway Split */}
            <Card className="p-5 border border-slate-200 bg-white rounded-2xl shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider flex items-center">
                <CreditCard className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
                Gateway Volume Split
              </h3>
              <div className="space-y-2">
                {(summary?.gatewayBreakdown || [
                  { gateway: 'RAZORPAY', amount: 14200, count: 18 },
                  { gateway: 'CASHFREE', amount: 9800, count: 12 },
                  { gateway: 'PHONEPE', amount: 7600, count: 9 },
                ]).map((gw: any) => (
                  <div key={gw.gateway} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs">
                    <div>
                      <span className="font-bold text-slate-800 font-mono">{gw.gateway}</span>
                      <span className="text-[10px] text-slate-400 block font-sans">{gw.count} payments</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">₹{gw.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Branch Revenue Breakdown */}
            <Card className="p-5 border border-slate-200 bg-white rounded-2xl shadow-xs space-y-3 lg:col-span-2">
              <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider flex items-center">
                <Building2 className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                Operator Branch / Franchise Collections
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {branchReport.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No branch breakdown available.</p>
                ) : (
                  branchReport.map((b: any) => (
                    <div key={b.branch} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{b.branch}</p>
                        <span className="text-[11px] text-slate-500 font-mono">{b.transactionCount} Txns • Avg ₹{b.averageTicketSize}</span>
                      </div>
                      <span className="font-mono font-black text-slate-800 text-sm">₹{b.totalRevenue.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Transactions Ledger */}
          <Card className="overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-xs">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Payment Transactions Ledger</h3>
                <p className="text-xs text-slate-500 mt-0.5">Real-time payment capture & settlement audit stream</p>
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-semibold text-slate-700"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="PENDING">PENDING</option>
                  <option value="FAILED">FAILED</option>
                  <option value="SETTLED">SETTLED</option>
                </select>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Txn ID, Account..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchReconciliationData()}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg w-48"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <th className="py-3 px-4">Transaction Reference</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Gateway</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Settlement</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                        No transactions found for the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t: any) => (
                      <tr key={t._id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-900 block">{t.transactionId}</span>
                          <span className="font-mono text-[10px] text-slate-400">{t.orderId || 'Direct'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-800">{t.customerName}</p>
                          <span className="font-mono text-[11px] text-slate-500">{t.accountNumber}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700">{t.gateway}</td>
                        <td className="py-3 px-4 font-mono font-black text-emerald-700">₹{t.amount}</td>
                        <td className="py-3 px-4">
                          <Badge variant={t.status === 'SUCCESS' || t.status === 'SETTLED' ? 'success' : t.status === 'FAILED' ? 'danger' : 'warning'}>
                            {t.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.settlementStatus === 'SETTLED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                            {t.settlementStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                          {new Date(t.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSyncStatus(t.transactionId)}
                            disabled={actionLoading}
                            className="h-6 px-2 text-[10px]"
                          >
                            <RefreshCw className="w-2.5 h-2.5 mr-1" />
                            Sync
                          </Button>
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
    </Shell>
  );
};
