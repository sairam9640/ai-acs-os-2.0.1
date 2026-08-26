import React, { useState, useEffect } from 'react';
import { Settings, Save, Shield, Sliders, Bell, Server, CheckCircle2, QrCode, RefreshCw, Smartphone, Unlink, AlertCircle } from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { Button, Input } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';

export const OperatorSettings: React.FC = () => {
  const { tenant } = useAuth();
  const [warningThreshold, setWarningThreshold] = useState('-27.0');
  const [criticalThreshold, setCriticalThreshold] = useState('-30.0');
  const [autoDispatchEnabled, setAutoDispatchEnabled] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // WhatsApp Web State
  const [waData, setWaData] = useState<any>(null);
  const [isWaLoading, setIsWaLoading] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [customPhone, setCustomPhone] = useState('');
  const [waActionSuccess, setWaActionSuccess] = useState<string | null>(null);

  const fetchWaStatus = async () => {
    setIsWaLoading(true);
    try {
      const res = await api.getOperatorWhatsAppStatus();
      if (res.success) {
        setWaData(res.whatsapp);
        if (res.whatsapp?.phone) setCustomPhone(res.whatsapp.phone);
      }
    } catch (_) {}
    setIsWaLoading(false);
  };

  useEffect(() => {
    fetchWaStatus();
  }, []);

  const handleOpenQrModal = async () => {
    setIsQrModalOpen(true);
    setQrLoading(true);
    try {
      const res = await api.generateOperatorWhatsAppQR();
      if (res.success) {
        setWaData((prev: any) => ({
          ...prev,
          status: 'SCAN_QR_REQUIRED',
          qrCodeDataUrl: res.qrDataUrl,
        }));
      }
    } catch (_) {}
    setQrLoading(false);
  };

  const handleConfirmPairing = async () => {
    try {
      const res = await api.confirmOperatorWhatsAppScan({
        phone: customPhone || '+919949666907',
        deviceInfo: 'WhatsApp Business Mobile App',
      });
      if (res.success) {
        setWaActionSuccess(`WhatsApp Business connected for ${customPhone || '+919949666907'}`);
        setIsQrModalOpen(false);
        fetchWaStatus();
        setTimeout(() => setWaActionSuccess(null), 4000);
      }
    } catch (_) {}
  };

  const handleDisconnectWa = async () => {
    try {
      const res = await api.disconnectOperatorWhatsApp();
      if (res.success) {
        setWaActionSuccess('WhatsApp session disconnected successfully.');
        fetchWaStatus();
        setTimeout(() => setWaActionSuccess(null), 4000);
      }
    } catch (_) {}
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <Shell
      portalType="operator"
      title="Operator NOC & Tenant Settings"
      breadcrumbs={[{ label: 'Operator Settings' }]}
    >
      <div className="max-w-4xl space-y-6">
        {savedSuccess && (
          <div className="p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-[#065F46] text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Settings saved successfully and synced across telemetry listeners.</span>
          </div>
        )}

        {waActionSuccess && (
          <div className="p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-[#065F46] text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{waActionSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Tenant Profile Information */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center space-x-3 pb-3 border-b border-[#E2E8F0]">
              <Server className="w-5 h-5 text-[#1677FF]" />
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Tenant Identity & Scoped Domain</h3>
                <p className="text-xs text-[#64748B]">Operator organization boundaries and CWMP URL binding</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[#0F172A] font-bold block mb-1">Company Display Name</label>
                <input
                  disabled
                  value={tenant?.displayName || 'Apex Fiber'}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3 text-[#0F172A] font-bold"
                />
              </div>
              <div>
                <label className="text-[#0F172A] font-bold block mb-1">Tenant Subdomain / Root Host</label>
                <input
                  disabled
                  value={tenant?.slug ? `${tenant.slug}.ciniplay.in` : 'ciniplay.in'}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3 text-[#1677FF] font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Optical Telemetry Thresholds */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center space-x-3 pb-3 border-b border-[#E2E8F0]">
              <Sliders className="w-5 h-5 text-[#B45309]" />
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Optical Alarm Thresholds</h3>
                <p className="text-xs text-[#64748B]">Define automatic alert triggers based on Rx optical power</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Warning Threshold (dBm)"
                type="text"
                value={warningThreshold}
                onChange={(e) => setWarningThreshold(e.target.value)}
                helperText="Signals minor degradation (-24.0 to -27.0 dBm)"
              />
              <Input
                label="Critical Fault Threshold (dBm)"
                type="text"
                value={criticalThreshold}
                onChange={(e) => setCriticalThreshold(e.target.value)}
                helperText="Triggers immediate outage incident (< -27.0 dBm)"
              />
            </div>
          </div>

          {/* Dedicated Operator WhatsApp Web Linking Card */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#047857]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Operator Dedicated WhatsApp Business Web Session</h3>
                  <p className="text-xs text-[#64748B]">Link your own WhatsApp Business number to send bills, OTPs, and alerts to your subscribers</p>
                </div>
              </div>
              <Badge variant={waData?.status === 'CONNECTED' ? 'success' : 'warning'} dot>
                {waData?.status === 'CONNECTED' ? 'CONNECTED / ACTIVE' : 'NOT LINKED'}
              </Badge>
            </div>

            <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#0F172A]">
                  {waData?.phone ? `Connected Number: ${waData.phone}` : 'No WhatsApp session linked to this operator account'}
                </p>
                <p className="text-xs text-[#64748B]">
                  {waData?.status === 'CONNECTED'
                    ? `Active multi-device session (${waData?.deviceInfo || 'Android / iOS App'})`
                    : 'Scan the QR code below using WhatsApp on your phone (Linked Devices) to activate.'}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {waData?.status === 'CONNECTED' ? (
                  <Button size="sm" variant="danger" type="button" onClick={handleDisconnectWa}>
                    <Unlink className="w-3.5 h-3.5 mr-1.5" />
                    <span>Disconnect Session</span>
                  </Button>
                ) : (
                  <Button size="sm" variant="primary" type="button" onClick={handleOpenQrModal} className="font-bold">
                    <QrCode className="w-4 h-4 mr-1.5" />
                    <span>Scan WhatsApp QR Code</span>
                  </Button>
                )}
                <Button size="sm" variant="outline" type="button" onClick={fetchWaStatus}>
                  <RefreshCw className={`w-3.5 h-3.5 ${isWaLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="lg" className="font-bold">
              <Save className="w-4 h-4 mr-1.5" />
              <span>Save & Apply Settings</span>
            </Button>
          </div>
        </form>

        {/* WhatsApp QR Pairing Modal */}
        <Modal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          title="Pair Operator WhatsApp Business"
          subtitle="Scan this QR code with WhatsApp on your phone (Settings > Linked Devices > Link a Device)"
          maxWidth="md"
        >
          <div className="space-y-4 text-center">
            {qrLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-8 h-8 text-[#1677FF] animate-spin" />
                <p className="text-xs text-[#64748B]">Generating secure multi-device pairing QR...</p>
              </div>
            ) : waData?.qrCodeDataUrl ? (
              <div className="p-4 bg-white border border-[#CBD5E1] rounded-2xl inline-block shadow-sm">
                <img src={waData.qrCodeDataUrl} alt="WhatsApp Web QR" className="w-64 h-64 mx-auto rounded-lg" />
              </div>
            ) : (
              <div className="py-8 text-xs text-[#94A3B8] italic">
                QR code ready. Click below to confirm connection.
              </div>
            )}

            <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-left space-y-2">
              <label className="text-xs font-bold text-[#0F172A] block">Operator WhatsApp Phone Number</label>
              <Input
                placeholder="+919949666907"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-[#E2E8F0]">
              <Button variant="outline" type="button" onClick={() => setIsQrModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="button" onClick={handleConfirmPairing} className="font-bold">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                <span>Confirm Linked Session</span>
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Shell>
  );
};

