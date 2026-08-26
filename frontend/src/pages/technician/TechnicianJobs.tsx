import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Clock, MapPin, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';
import { MobileShell } from '../../components/layout/MobileShell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { api } from '../../services/api.js';

export const TechnicianJobs: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const navigate = useNavigate();

  const fetchJobs = async () => {
    setIsLoading(true);
    setError(null);
    const res = await api.getTechnicianJobs(statusFilter);
    setIsLoading(false);
    if (res.success) {
      setJobs(res.jobs || []);
    } else {
      setError(res.error || 'Failed to fetch technician jobs');
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [statusFilter]);

  return (
    <MobileShell portalType="technician" title="Field Work Orders">
      <StateWrapper
        isLoading={isLoading}
        isEmpty={jobs.length === 0}
        emptyTitle="No Assigned Jobs"
        emptyMessage="You have completed all assigned work orders for today."
        error={error}
        onRetry={fetchJobs}
      >
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job._id}
              onClick={() => navigate(`/tech/jobs/${job._id}`)}
              className="bg-white border border-[#E2E8F0] hover:border-sky-500/50 rounded-2xl p-4 space-y-3 cursor-pointer transition shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-[#0F172A]">{job.title}</span>
                    <Badge variant={job.priority === 'critical' ? 'danger' : 'warning'}>
                      {job.priority}
                    </Badge>
                  </div>
                  <p className="text-[11px] font-mono text-[#64748B] mt-0.5">{job.jobNumber}</p>
                </div>
                <Badge variant={job.status === 'completed' ? 'success' : 'info'}>
                  {job.status}
                </Badge>
              </div>

              <div className="flex items-center space-x-2 text-xs text-[#334155]">
                <MapPin className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                <span className="truncate">{job.location?.address || 'Koramangala, Bengaluru'}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] text-[11px] text-[#64748B]">
                <div className="flex items-center space-x-1 text-[#B45309]">
                  <Clock className="w-3 h-3" />
                  <span>SLA: 2h Remaining</span>
                </div>
                <div className="flex items-center space-x-1 text-[#1677FF] font-semibold">
                  <span>Start Work</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </StateWrapper>
    </MobileShell>
  );
};
