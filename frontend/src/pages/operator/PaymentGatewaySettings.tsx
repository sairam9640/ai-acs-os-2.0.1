import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Lock,
  Zap,
  Globe,
  Settings,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../services/api.js';

interface IGateway {
  _id?: string;
  gateway: 'RAZORPAY' | 'CASHFREE' | 'PHONEPE' | 'PAYTM' | 'STRIPE';
  displayName: string;
  isEnabled: boolean;
  isTestMode: boolean;
  publicMetadata?: any;
  webhookEndpointUrl?: string;
}

const GATEWAY_METADATA = {
  RAZORPAY: {
    name: 'Razorpay',
    color: 'from-blue-600 to-indigo-700',
    description: 'UPI, Credit/Debit Cards, NetBanking, Autopay Recurring Mandates',
    fields: [
      { key: 'keyId', label: 'Key ID (rzp_live / rzp_test)', type: 'text', placeholder: 'rzp_live_xxxxxxxx' },
      { key: 'keySecret', label: 'Key Secret', type: 'password', placeholder: '••••••••••••••••' },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', placeholder: 'whsec_xxxxxxxx' },
    ],
  },
  CASHFREE: {
    name: 'Cashfree Payments',
    color: 'from-emerald-600 to-teal-700',
    description: 'Instant Auto-Collect UPI, QR Codes, NetBanking & Subscriptions',
    fields: [
      { key: 'appId', label: 'App ID / Client ID', type: 'text', placeholder: 'CF_APP_xxxxxx' },
      { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: '••••••••••••••••' },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', placeholder: 'whsec_xxxxxxxx' },
    ],
  },
  PHONEPE: {
    name: 'PhonePe PG',
    color: 'from-purple-600 to-violet-800',
    description: 'PhonePe UPI Intent, QR & Credit/Debit Card Gateway',
    fields: [
      { key: 'merchantId', label: 'Merchant ID (MID)', type: 'text', placeholder: 'M1234567890' },
      { key: 'saltKey', label: 'Salt Key', type: 'password', placeholder: '••••••••••••••••' },
      { key: 'saltIndex', label: 'Salt Index (usually 1)', type: 'text', placeholder: '1' },
    ],
  },
  PAYTM: {
    name: 'Paytm Payment Gateway',
    color: 'from-sky-600 to-blue-800',
    description: 'Paytm Wallet, UPI, Netbanking & EMI Checkout',
    fields: [
      { key: 'merchantId', label: 'Merchant ID (MID)', type: 'text', placeholder: 'PAYTM_MID_xxxx' },
      { key: 'merchantKey', label: 'Merchant Key', type: 'password', placeholder: '••••••••••••••••' },
    ],
  },
  STRIPE: {
    name: 'Stripe Global',
    color: 'from-slate-700 to-slate-900',
    description: 'International Credit/Debit Cards, Google Pay & Apple Pay',
    fields: [
      { key: 'publishableKey', label: 'Publishable Key (pk_live/pk_test)', type: 'text', placeholder: 'pk_live_xxxx' },
      { key: 'secretKey', label: 'Secret Key (sk_live/sk_test)', type: 'password', placeholder: 'sk_live_xxxx' },
      { key: 'webhookSecret', label: 'Signing Secret (whsec_)', type: 'password', placeholder: 'whsec_xxxx' },
    ],
  },
};

export const PaymentGatewaySettings: React.FC = () => {
  const [gateways, setGateways] = useState<IGateway[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit Modal State
  const [selectedGw, setSelectedGw] = useState<'RAZORPAY' | 'CASHFREE' | 'PHONEPE' | 'PAYTM' | 'STRIPE' | null>(null);
  const [gwForm, setGwForm] = useState<any>({
    isEnabled: false,
    isTestMode: true,
    credentials: {},
    webhookSecret: '',
  });
  const [showSecrets, setShowSecrets] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchGateways = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await api.getPaymentGateways();
      setIsLoading(false);
      if (res.success) {
        setGateways(res.gateways || []);
      } else {
        setError(res.error || 'Failed to fetch gateways');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Error loading payment gateways');
    }
  };

  useEffect(() => {
    fetchGateways();
  }, []);

  const openConfigModal = (gwType: 'RAZORPAY' | 'CASHFREE' | 'PHONEPE' | 'PAYTM' | 'STRIPE') => {
    const existing = gateways.find((g) => g.gateway === gwType);
    setSelectedGw(gwType);
    setGwForm({
      isEnabled: existing ? existing.isEnabled : false,
      isTestMode: existing ? existing.isTestMode : true,
      credentials: {},
      webhookSecret: '',
    });
    setShowSecrets(false);
  };

  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGw) return;
    setIsSaving(true);
    try {
      const res: any = await api.updatePaymentGateway({
        gateway: selectedGw,
        isEnabled: gwForm.isEnabled,
        isTestMode: gwForm.isTestMode,
        credentials: gwForm.credentials,
        webhookSecret: gwForm.webhookSecret,
      });
      setIsSaving(false);
      if (res.success) {
        setFeedback({ type: 'success', message: `${selectedGw} credentials encrypted and saved successfully!` });
        setSelectedGw(null);
        fetchGateways();
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to save gateway' });
      }
    } catch (err: any) {
      setIsSaving(false);
      setFeedback({ type: 'error', message: err.message || 'Error saving gateway' });
    }
  };

  const allGatewayKeys: ('RAZORPAY' | 'CASHFREE' | 'PHONEPE' | 'PAYTM' | 'STRIPE')[] = [
    'RAZORPAY',
    'CASHFREE',
    'PHONEPE',
    'PAYTM',
    'STRIPE',
  ];

  return (
    <Shell
      portalType="operator"
      title="Payment Gateway Plugins"
      breadcrumbs={[{ label: 'Billing & Payments' }, { label: 'Gateway Configurations' }]}
    >
      <StateWrapper isLoading={isLoading} error={error} onRetry={fetchGateways}>
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {/* Security Banner */}
          <div className="p-4 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-sky-900">Enterprise-Grade Key Vault (AES-256-GCM)</h3>
                <p className="text-xs text-sky-700 mt-0.5">
                  All merchant API secrets and keys are encrypted at rest with hardware-isolated cryptography. Webhooks enforce cryptographic signature verification.
                </p>
              </div>
            </div>
            <Badge variant="info" className="font-mono text-xs">
              Multi-Tenant Isolated
            </Badge>
          </div>

          {feedback && (
            <div
              className={`p-3.5 rounded-xl flex items-center justify-between border text-xs ${
                feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                <span className="font-medium">{feedback.message}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="underline font-mono text-[11px]">Dismiss</button>
            </div>
          )}

          {/* Gateways Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {allGatewayKeys.map((gwKey) => {
              const meta = GATEWAY_METADATA[gwKey];
              const config = gateways.find((g) => g.gateway === gwKey);
              const isConfigured = Boolean(config && config.isEnabled);

              return (
                <Card
                  key={gwKey}
                  className="overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-xs flex flex-col justify-between hover:shadow-md transition-all"
                >
                  <div className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.color} text-white flex items-center justify-center shadow-xs font-bold text-sm font-mono`}>
                          {gwKey.slice(0, 2)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{meta.name}</h4>
                          <span className="text-[11px] text-slate-400 font-mono">{gwKey}</span>
                        </div>
                      </div>

                      <Badge variant={isConfigured ? 'success' : 'neutral'}>
                        {isConfigured ? (config?.isTestMode ? 'Test Mode' : 'Live') : 'Disabled'}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{meta.description}</p>

                    {config?.publicMetadata?.keyId && (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono space-y-1">
                        <span className="text-slate-400 uppercase text-[10px] block">Merchant / App Key</span>
                        <p className="font-bold text-slate-800 truncate">{config.publicMetadata.keyId}</p>
                      </div>
                    )}

                    {config?.webhookEndpointUrl && (
                      <div className="p-2 bg-sky-50 border border-sky-100 rounded-lg text-[10px] text-sky-800 font-mono truncate">
                        <span className="font-bold">Webhook:</span> {config.webhookEndpointUrl}
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {isConfigured ? 'Active Gateway' : 'Not Configured'}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => openConfigModal(gwKey)}
                      className="text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white flex items-center space-x-1"
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      <span>Configure</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </StateWrapper>

      {/* MODAL: CONFIGURE GATEWAY */}
      {selectedGw && (
        <Modal
          isOpen={Boolean(selectedGw)}
          onClose={() => setSelectedGw(null)}
          title={`Configure ${GATEWAY_METADATA[selectedGw].name}`}
          subtitle="Credentials are encrypted at rest with AES-256-GCM."
        >
          <form onSubmit={handleSaveGateway} className="space-y-4">
            {/* Toggles */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gwForm.isEnabled}
                  onChange={(e) => setGwForm({ ...gwForm, isEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-sky-600"
                />
                <span>Enable Gateway</span>
              </label>

              <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gwForm.isTestMode}
                  onChange={(e) => setGwForm({ ...gwForm, isTestMode: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600"
                />
                <span>Test / Sandbox Mode</span>
              </label>
            </div>

            {/* Credential Fields */}
            <div className="space-y-3">
              {GATEWAY_METADATA[selectedGw].fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{field.label} *</label>
                  <input
                    type={field.type === 'password' && !showSecrets ? 'password' : 'text'}
                    required
                    placeholder={field.placeholder}
                    value={gwForm.credentials[field.key] || ''}
                    onChange={(e) =>
                      setGwForm({
                        ...gwForm,
                        credentials: { ...gwForm.credentials, [field.key]: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowSecrets(!showSecrets)}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1"
              >
                {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showSecrets ? 'Hide Secrets' : 'Unmask Secrets'}</span>
              </button>

              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={() => setSelectedGw(null)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold">
                  {isSaving ? 'Encrypting...' : 'Save & Encrypt'}
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </Shell>
  );
};
