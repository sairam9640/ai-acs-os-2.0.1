import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Wrench,
  CheckSquare,
  Square,
  Camera,
  Signal,
  CheckCircle2,
  AlertTriangle,
  User,
  MapPin,
  Bot,
  ArrowLeft,
  FileSignature,
} from 'lucide-react';
import { MobileShell } from '../../components/layout/MobileShell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button, Input } from '../../components/ui/Button.js';
import { api } from '../../services/api.js';

export const TechnicianJobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [measuredPower, setMeasuredPower] = useState(-19.4);
  const [techNotes, setTechNotes] = useState('Re-spliced drop fiber at FAT-04, port 2 cleaned with alcohol wipe.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const fetchJob = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    const res = await api.getTechnicianJobDetail(id);
    setIsLoading(false);
    if (res.success) {
      setData(res);
    } else {
      setError(res.error || 'Failed to fetch job');
    }
  };

  useEffect(() => {
    fetchJob();
  }, [id]);

  const toggleChecklist = async (stepId: string, currentCompleted: boolean) => {
    if (!id) return;
    const res = await api.updateChecklist(id, stepId, !currentCompleted);
    if (res.success) {
      fetchJob();
    }
  };

  const handleMeasureOptical = async () => {
    if (!id) return;
    const res = await api.measureOpticalPower(id, measuredPower);
    if (res.success) {
      alert(`Optical measurement confirmed: ${measuredPower} dBm (Signal Restored to Optimal)`);
      fetchJob();
    }
  };

  const handleCompleteJob = async () => {
    if (!id) return;
    setIsSubmitting(true);
    const res = await api.completeTechnicianJob(id, {
      technicianNotes: techNotes,
      photoUrls: ['/uploads/evidence-fat04.jpg', '/uploads/evidence-ont-power.jpg'],
      customerSignatureUrl: 'data:image/png;base64,signature_proof',
    });
    setIsSubmitting(false);

    if (res.success) {
      alert('Work order successfully closed, verified, and audited.');
      navigate('/tech/jobs');
    } else {
      alert(res.error || 'Failed to complete job');
    }
  };

  const job = data?.job;
  const customer = data?.customer;
  const device = data?.device;

  return (
    <MobileShell portalType="technician" title={job ? job.jobNumber : 'Work Order Detail'}>
      <StateWrapper isLoading={isLoading} error={error} onRetry={fetchJob}>
        {job && (
          <div className="space-y-4">
            {/* Header Status Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A]">{job.title}</h2>
                  <p className="text-xs text-[#64748B] mt-0.5">{customer?.fullName} • {customer?.phone}</p>
                </div>
                <Badge variant={job.status === 'completed' ? 'success' : 'warning'}>
                  {job.status}
                </Badge>
              </div>

              <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                <span className="text-[#64748B]">ONT Serial:</span>
                <span className="font-mono text-[#1E293B]">{device?.serialNumber || 'HWTC-7890'}</span>
              </div>
            </div>

            {/* Field AI Assistant Recommendation */}
            <div className="p-3 bg-[#F5F3FF] border border-[#DDD6FE] rounded-xl flex items-start space-x-2.5">
              <Bot className="w-4 h-4 text-[#6D28D9] shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-[#5B21B6]">Field AI Assistant</p>
                <p className="text-[#334155] mt-0.5">
                  Pre-test telemetry indicates high splice loss at drop terminal. Clean SC-APC ferrule before re-fusion.
                </p>
              </div>
            </div>

            {/* Guided Checklist Steps */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">
                Guided Repair Checklist
              </h3>
              <div className="space-y-2">
                {(job.guidedChecklist || []).map((step: any) => (
                  <div
                    key={step.id}
                    onClick={() => toggleChecklist(step.id, step.completed)}
                    className="flex items-center space-x-3 p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl cursor-pointer hover:border-[#CBD5E1] transition"
                  >
                    {step.completed ? (
                      <CheckSquare className="w-4 h-4 text-[#047857] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-[#94A3B8] shrink-0" />
                    )}
                    <span
                      className={`text-xs ${
                        step.completed ? 'line-through text-[#94A3B8]' : 'text-[#1E293B]'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Optical Power Verification */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider flex items-center space-x-2">
                <Signal className="w-4 h-4 text-[#047857]" />
                <span>Live Optical Power Measurement</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                  <span className="text-[#94A3B8]">Before Repair</span>
                  <p className="text-sm font-bold text-[#B91C1C] mt-1">-29.2 dBm (Fault)</p>
                </div>
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                  <span className="text-[#94A3B8]">After Measurement</span>
                  <p className="text-sm font-bold text-[#047857] mt-1">{job.evidence?.postRxPowerDbm || '-19.4'} dBm (Optimal)</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.1"
                  value={measuredPower}
                  onChange={(e) => setMeasuredPower(Number(e.target.value))}
                  placeholder="-19.4"
                  className="w-32"
                />
                <Button size="sm" variant="secondary" onClick={handleMeasureOptical}>
                  Verify Signal
                </Button>
              </div>
            </div>

            {/* Closure Evidence & Signature */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider flex items-center space-x-2">
                <Camera className="w-4 h-4 text-[#1677FF]" />
                <span>Photo Evidence & Notes</span>
              </h3>

              <div className="space-y-2">
                <label className="block text-[11px] text-[#64748B]">Technician Resolution Notes</label>
                <textarea
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-sky-500"
                  rows={2}
                  value={techNotes}
                  onChange={(e) => setTechNotes(e.target.value)}
                />
              </div>

              <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl flex items-center space-x-2 text-xs text-[#065F46]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Customer Digital Signature / SMS OTP Verified</span>
              </div>

              <Button
                variant="primary"
                className="w-full mt-2"
                isLoading={isSubmitting}
                onClick={handleCompleteJob}
              >
                <span>Submit Job Closure Evidence</span>
              </Button>
            </div>
          </div>
        )}
      </StateWrapper>
    </MobileShell>
  );
};
