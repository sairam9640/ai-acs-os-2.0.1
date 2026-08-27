import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Calendar,
  Download,
  AlertCircle,
  Clock,
  Shield,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../services/api.js';

export const CustomerBilling: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [gateways, setGateways] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pay Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState('RAZORPAY');
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  const fetchBillingData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [homeRes, invRes, gwRes]: any = await Promise.all([
        api.getCustomerHome(),
        api.getCustomerInvoices(),
        api.getCustomerPaymentGateways(),
      ]);

      setIsLoading(false);
      if (homeRes.success) setData(homeRes);
      if (invRes.success) setInvoices(invRes.invoices || []);
      if (gwRes.success) {
        setGateways(gwRes.gateways || []);
        if (gwRes.gateways?.length > 0) {
          setSelectedGateway(gwRes.gateways[0].gateway);
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to fetch billing info');
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const handleInitiatePayment = async () => {
    setIsProcessingPay(true);
    try {
      const res: any = await api.initiateCustomerPayment({
        gateway: selectedGateway,
        amount: data?.customer?.plan?.price || 699,
        planName: data?.customer?.plan?.name || 'Broadband 100M',
      });
      setIsProcessingPay(false);
      if (res.success) {
        alert(`Payment initiated with ${selectedGateway}! Transaction: ${res.transactionId}`);
        setIsPayModalOpen(false);
        fetchBillingData();
      }
    } catch (err: any) {
      setIsProcessingPay(false);
      alert('Payment initiation failed: ' + err.message);
    }
  };

  const plan = data?.customer?.plan;

  return (
    <Shell
      portalType="customer"
      title="My Broadband Billing & Receipts"
      breadcrumbs={[{ label: 'Home', href: '/customer' }, { label: 'Billing & Invoices' }]}
    >
      <StateWrapper isLoading={isLoading} error={error} onRetry={fetchBillingData}>
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
          {/* Active Plan Card */}
          <Card className="p-6 bg-gradient-to-br from-slate-900 to-sky-950 text-white rounded-2xl shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold text-sky-400 tracking-wider">Subscribed FTTH Package</span>
                <h2 className="text-2xl font-black mt-1">{plan?.name || 'GigaFast 100 Mbps Unlimited'}</h2>
                <p className="text-xs text-slate-300 font-mono mt-0.5">Account #: {data?.customer?.accountNumber}</p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-3xl font-black font-mono text-emerald-400">₹{plan?.price || 699}</span>
                  <span className="text-xs text-slate-400 block">/month</span>
                </div>
                <Button
                  onClick={() => setIsPayModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2.5 shadow-sm"
                >
                  Pay Online
                </Button>
              </div>
            </div>
          </Card>

          {/* Invoices Ledger */}
          <Card className="overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Tax Invoices & Official Payment Receipts</h3>
              <Badge variant="info">GST Tax Compliant</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Download Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        No past invoices available.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv: any) => (
                      <tr key={inv.invoiceId} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceId}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{inv.planName}</td>
                        <td className="py-3 px-4 font-mono font-black text-emerald-700">₹{inv.amount}</td>
                        <td className="py-3 px-4 text-slate-600 font-mono">{inv.paymentMode}</td>
                        <td className="py-3 px-4">
                          <Badge variant="success">Paid</Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                          {new Date(inv.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <a
                            href={inv.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs font-bold text-sky-700 hover:underline"
                          >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            Print Receipt
                          </a>
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

      {/* MODAL: CHOOSE GATEWAY & PAY */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Pay Broadband Bill Online"
        subtitle="Instant renewal with zero transaction fee."
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
            <span className="text-slate-600 font-semibold">Total Payable Amount:</span>
            <span className="font-mono font-black text-xl text-emerald-700">₹{plan?.price || 699}</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Select Payment Gateway</label>
            <div className="space-y-2">
              {gateways.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No online payment gateway currently active.</p>
              ) : (
                gateways.map((gw: any) => (
                  <label
                    key={gw.gateway}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedGateway === gw.gateway ? 'border-sky-500 bg-sky-50/50 ring-2 ring-sky-500' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <input
                        type="radio"
                        name="gateway"
                        value={gw.gateway}
                        checked={selectedGateway === gw.gateway}
                        onChange={() => setSelectedGateway(gw.gateway)}
                        className="text-sky-600"
                      />
                      <span className="font-bold text-xs text-slate-900">{gw.displayName}</span>
                    </div>
                    <Badge variant="neutral" className="text-[10px] font-mono">UPI / Cards</Badge>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsPayModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={handleInitiatePayment}
              disabled={isProcessingPay || gateways.length === 0}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isProcessingPay ? 'Connecting Gateway...' : 'Proceed to Pay ₹' + (plan?.price || 699)}
            </Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
};
