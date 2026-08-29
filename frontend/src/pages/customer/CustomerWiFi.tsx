import React, { useState, useEffect } from 'react';
import { Wifi, Lock, CheckCircle2, Shield, Eye, EyeOff, AlertCircle, RefreshCw } from 'lucide-react';
import { MobileShell } from '../../components/layout/MobileShell.js';
import { Button, Input } from '../../components/ui/Button.js';
import { api } from '../../services/api.js';

export const CustomerWiFi: React.FC = () => {
  const [ssid5g, setSsid5g] = useState('');
  const [pass5g, setPass5g] = useState('');
  const [ssid24, setSsid24] = useState('');
  const [pass24, setPass24] = useState('');
  const [showPass5g, setShowPass5g] = useState(false);
  const [showPass24, setShowPass24] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchWifiSettings = async () => {
    setIsFetching(true);
    try {
      const res = await api.getCustomerHome();
      if (res.success && res.wifi) {
        setSsid24(res.wifi.ssid24 || '');
        setPass24(res.wifi.password24 || '');
        setSsid5g(res.wifi.ssid5g || '');
        setPass5g(res.wifi.password5g || '');
      }
    } catch (err: any) {
      console.error('Failed to load Wi-Fi settings:', err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchWifiSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    const payload: any = {
      wifi24: { ssid: ssid24.trim() },
      wifi5g: { ssid: ssid5g.trim() },
    };
    if (pass24) payload.wifi24.password = pass24;
    if (pass5g) payload.wifi5g.password = pass5g;

    try {
      const res = await api.updateCustomerWifi(payload);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Wi-Fi settings successfully updated and dispatched to your home router.',
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to update Wi-Fi. Please verify connection.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error communicating with network controller.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileShell portalType="customer" title="Home Wi-Fi Settings">
      {isFetching ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
          <p className="text-xs font-semibold">Reading live router Wi-Fi configuration...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          {feedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* 5 GHz Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-900">
                <Wifi className="w-4 h-4 text-sky-600" />
                <span>High-Speed 5 GHz Wi-Fi (Ultra Fast)</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">
                802.11ac / ax
              </span>
            </div>

            <Input
              label="5 GHz Network Name (SSID)"
              value={ssid5g}
              onChange={(e) => setSsid5g(e.target.value)}
              placeholder="e.g. MyHome_5G"
              required
            />

            <div className="relative">
              <Input
                label="5 GHz Wi-Fi Password (Min 8 characters)"
                type={showPass5g ? 'text' : 'password'}
                value={pass5g}
                onChange={(e) => setPass5g(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass5g(!showPass5g)}
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
              >
                {showPass5g ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 2.4 GHz Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-900">
                <Wifi className="w-4 h-4 text-purple-600" />
                <span>Standard 2.4 GHz Wi-Fi (Long Range)</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100">
                802.11b / g / n
              </span>
            </div>

            <Input
              label="2.4 GHz Network Name (SSID)"
              value={ssid24}
              onChange={(e) => setSsid24(e.target.value)}
              placeholder="e.g. MyHome_2.4G"
              required
            />

            <div className="relative">
              <Input
                label="2.4 GHz Wi-Fi Password (Min 8 characters)"
                type={showPass24 ? 'text' : 'password'}
                value={pass24}
                onChange={(e) => setPass24(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass24(!showPass24)}
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
              >
                {showPass24 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full bg-sky-600 hover:bg-sky-700 font-bold py-3 text-sm" isLoading={isLoading}>
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            <span>Apply Wi-Fi Changes to Router</span>
          </Button>
        </form>
      )}
    </MobileShell>
  );
};
