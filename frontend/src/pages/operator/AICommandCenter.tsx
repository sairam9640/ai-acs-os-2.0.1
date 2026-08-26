import React, { useState } from 'react';
import { Bot, Send, ShieldAlert, CheckCircle2, XCircle, ArrowRight, Activity, HelpCircle, Layers } from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button, Input } from '../../components/ui/Button.js';
import { api } from '../../services/api.js';

export const AICommandCenter: React.FC = () => {
  const [prompt, setPrompt] = useState('Why are 12 customers reporting optical power degradation in Koramangala Sector 4?');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;

    setIsLoading(true);
    setError(null);
    const res = await api.submitAiCommand(prompt);
    setIsLoading(false);

    if (res.success && res.result) {
      setResult(res.result);
    } else {
      setError(res.error || 'AI analysis request failed');
    }
  };

  const handleApprove = async () => {
    if (!result?.interactionId) return;
    setIsApproving(true);
    const res = await api.approveAiAction(result.interactionId);
    setIsApproving(false);

    if (res.success) {
      alert('Privileged action authorized and executed.');
      setResult({ ...result, approvalStatus: 'approved' });
    } else {
      alert(res.error || 'Failed to approve action');
    }
  };

  return (
    <Shell
      portalType="operator"
      title="AI Command Center & Diagnostic Orchestrator"
      breadcrumbs={[{ label: 'AI Command' }]}
      primaryAction={
        <Badge variant="purple" dot>
          DeepMind Advanced Reasoning Active
        </Badge>
      }
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Prompt Inquiry Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1677FF]">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Natural Language Network Diagnostic Query</h3>
              <p className="text-xs text-[#64748B]">
                Inquire about optical power drops, fiber break correlations, offline clusters, or Wi-Fi interference.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Why are subscribers experiencing high latency on PON 0/1/2?"
              className="flex-1"
            />
            <Button type="submit" variant="primary" isLoading={isLoading}>
              <Send className="w-4 h-4 mr-1.5" />
              <span>Diagnose</span>
            </Button>
          </form>
        </div>

        {/* Diagnostic Results & Evidence Synthesis */}
        {result && (
          <div className="space-y-6 animate-fadeIn">
            {/* Multi-Domain Evidence Panel */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-[#1677FF]" />
                  <h4 className="text-sm font-bold text-[#0F172A]">Telemetry & Topology Evidence Synthesis</h4>
                </div>
                <Badge variant="info">Confidence Score: {(result.confidenceScore * 100).toFixed(0)}%</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1">
                  <span className="text-[#94A3B8]">Affected Scope</span>
                  <p className="font-semibold text-[#1E293B]">{result.evidence?.affectedScope}</p>
                </div>
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1">
                  <span className="text-[#94A3B8]">Suspected Infrastructure</span>
                  <p className="font-semibold text-[#1677FF] font-mono">{result.evidence?.identifiedComponent || 'Splitter SPL-01'}</p>
                </div>
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1">
                  <span className="text-[#94A3B8]">Optical Power Profile</span>
                  <p className="font-semibold text-[#1E293B]">{result.evidence?.opticalTrendSummary}</p>
                </div>
              </div>

              {/* Step-by-step Reasoning */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-[#334155]">Diagnostic Reasoning Chain:</span>
                <div className="space-y-1.5 text-xs text-[#334155]">
                  {result.reasoningSteps?.map((step: string, idx: number) => (
                    <div key={idx} className="flex items-start space-x-2.5 p-2 bg-[#F8FAFC] rounded-lg">
                      <span className="w-4 h-4 rounded-full bg-[#DBEAFE] text-[#1677FF] font-bold flex items-center justify-center text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Proposed Remediation & Human Approval Gate */}
            <div className="bg-white border border-[#BFDBFE] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#0F172A]">Recommended Resolution & Workflows</h4>
                {result.requiresHumanApproval && (
                  <Badge variant={result.approvalStatus === 'approved' ? 'success' : 'warning'} dot>
                    {result.approvalStatus === 'approved' ? 'Authorized & Executed' : 'Human Approval Required'}
                  </Badge>
                )}
              </div>

              <div className="space-y-3">
                {result.recommendedActions?.map((action: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-[#0F172A] text-xs">{action.description}</span>
                        {action.isPrivileged && <Badge variant="warning">Privileged Action</Badge>}
                      </div>
                      <p className="text-[11px] font-mono text-[#94A3B8] mt-0.5">Action ID: {action.actionType}</p>
                    </div>

                    {action.isPrivileged && result.approvalStatus !== 'approved' && (
                      <Button
                        size="sm"
                        variant="primary"
                        isLoading={isApproving}
                        onClick={handleApprove}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        <span>Authorize Execution</span>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
};
