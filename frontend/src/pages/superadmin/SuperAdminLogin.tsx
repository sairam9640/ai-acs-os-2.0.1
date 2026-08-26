import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, KeyRound, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { Button, Input } from '../../components/ui/Button.js';

export const SuperAdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(30);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const res = await api.superAdminRequestOtp(email);
    setIsLoading(false);

    if (res.success) {
      setStep('otp');
    } else {
      setError(res.error || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const res = await api.superAdminVerifyOtp(email, otp);
    setIsLoading(false);

    if (res.success && res.token) {
      login(res.token, res.user);
      navigate('/superadmin/dashboard');
    } else {
      setError(res.error || 'Invalid OTP code. Please check your registered email or phone.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center mx-auto text-[#1677FF] shadow-lg shadow-sky-500/10 mb-4">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">AI ISP OS Control Plane</h2>
        <p className="text-xs text-[#64748B] mt-1">Super Administrator SaaS Management Console</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-[#E2E8F0] py-8 px-6 shadow-2xl rounded-2xl sm:px-10 backdrop-blur-md">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs flex items-center space-x-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <Input
                label="Super Admin Email Address or Mobile Number"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter registered email or mobile number"
                icon={Mail}
                autoFocus
              />
              <p className="text-[11px] text-[#94A3B8]">
                A 6-digit one-time passcode will be dispatched to your registered email & WhatsApp.
              </p>
              <Button type="submit" className="w-full" isLoading={isLoading}>
                <span>Send One-Time Password</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-xs text-[#1D4ED8] flex items-center justify-between">
                <span>OTP dispatched to {email}</span>
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-[#1677FF] underline hover:text-[#1D4ED8]"
                >
                  Change
                </button>
              </div>

              <Input
                label="Enter 6-Digit Passcode"
                type="text"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="••••••"
                icon={KeyRound}
                className="text-center tracking-widest text-lg font-mono font-bold"
                autoFocus
              />

              <Button type="submit" className="w-full" isLoading={isLoading}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                <span>Verify & Sign In</span>
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
