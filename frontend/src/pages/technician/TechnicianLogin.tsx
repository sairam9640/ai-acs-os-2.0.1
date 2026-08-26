import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Phone, ArrowRight, Lock, Building2 } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { Button, Input } from '../../components/ui/Button.js';

export const TechnicianLogin: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [slug, setSlug] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    api.setTenantSlug(slug);
    const res = await api.technicianLogin(phone);
    setIsLoading(false);

    if (res.success && res.token) {
      login(res.token, res.user, res.tenant);
      navigate('/tech/jobs');
    } else {
      setError(res.error || 'Failed to authenticate technician session');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center mx-auto text-[#B45309] shadow-lg shadow-amber-500/10 mb-4">
          <Wrench className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">Field Workforce Portal</h2>
        <p className="text-xs text-[#64748B] mt-1">Technician Dispatch & Optical Diagnostics App</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-[#E2E8F0] py-8 px-6 shadow-2xl rounded-2xl sm:px-10 backdrop-blur-md">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs flex items-center space-x-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="ISP Tenant Slug"
              required
              placeholder="Enter ISP tenant slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().trim())}
              icon={Building2}
            />

            <Input
              label="Registered Mobile Number"
              type="tel"
              required
              placeholder="Enter registered mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={Phone}
            />

            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white" isLoading={isLoading}>
              <span>Enter Field App</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="mt-6 border-t border-[#E2E8F0] pt-4 flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span>Role: Field Technician</span>
            <button
              type="button"
              onClick={() => navigate('/operator/login')}
              className="text-[#1677FF] hover:text-[#1D4ED8]"
            >
              Operator NOC →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
