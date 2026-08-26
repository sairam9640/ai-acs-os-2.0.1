import React from 'react';
import { AlertTriangle, ShieldAlert, RefreshCw, Clock, Inbox, Loader2 } from 'lucide-react';

export interface StateWrapperProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  error?: string | null;
  correlationId?: string;
  onRetry?: () => void;
  isPermissionDenied?: boolean;
  permissionRequired?: string;
  pendingCommand?: {
    status: 'queued' | 'sent' | 'verifying' | 'success' | 'failed';
    action: string;
    correlationId?: string;
  } | null;
  lastUpdated?: Date | string | null;
  onRefresh?: () => void;
  children: React.ReactNode;
}

export const StateWrapper: React.FC<StateWrapperProps> = ({
  isLoading,
  isEmpty,
  emptyTitle = 'No data available',
  emptyMessage = 'There are currently no records matching this view.',
  emptyActionLabel,
  onEmptyAction,
  error,
  correlationId,
  onRetry,
  isPermissionDenied,
  permissionRequired,
  pendingCommand,
  lastUpdated,
  onRefresh,
  children,
}) => {
  // 1. Loading State
  if (isLoading) {
    return (
      <div className="w-full p-8 flex flex-col items-center justify-center min-h-[300px] space-y-4 bg-white border border-[#E2E8F0] rounded-[10px] shadow-xs">
        <Loader2 className="w-8 h-8 text-[#1677FF] animate-spin" />
        <p className="text-[#64748B] text-sm font-medium animate-pulse">Loading real-time network data...</p>
        <div className="w-full max-w-md space-y-3 pt-4">
          <div className="h-4 bg-[#F1F5F9] rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-[#F1F5F9] rounded animate-pulse w-full"></div>
          <div className="h-4 bg-[#F1F5F9] rounded animate-pulse w-5/6"></div>
        </div>
      </div>
    );
  }

  // 2. Permission Denied State
  if (isPermissionDenied) {
    return (
      <div className="w-full p-8 flex flex-col items-center justify-center min-h-[320px] bg-white border border-[#FDE68A] rounded-[10px] text-center space-y-3 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-[#FFFBEB] flex items-center justify-center text-[#F59E0B]">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-[#0F172A]">Access Restricted</h3>
        <p className="text-sm text-[#64748B] max-w-md">
          Your current user role does not possess the capability required to view or execute this resource.
          {permissionRequired && <span className="block mt-1 font-mono text-xs text-[#B45309]">Required: {permissionRequired}</span>}
        </p>
      </div>
    );
  }

  // 3. Error State with Retry & Correlation ID
  if (error) {
    return (
      <div className="w-full p-8 flex flex-col items-center justify-center min-h-[320px] bg-white border border-[#FECACA] rounded-[10px] text-center space-y-3 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center text-[#EF4444]">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-[#0F172A]">Unable to Load Data</h3>
        <p className="text-sm text-[#64748B] max-w-md">{error}</p>
        {correlationId && (
          <p className="text-xs font-mono text-[#94A3B8]">Ref ID: {correlationId}</p>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 inline-flex items-center space-x-2 px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-lg text-sm font-medium transition shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Request</span>
          </button>
        )}
      </div>
    );
  }

  // 4. Empty State
  if (isEmpty) {
    return (
      <div className="w-full p-12 flex flex-col items-center justify-center min-h-[320px] bg-white border border-[#E2E8F0] rounded-[10px] text-center space-y-3 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-[#F8FAFC] flex items-center justify-center text-[#94A3B8]">
          <Inbox className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-[#0F172A]">{emptyTitle}</h3>
        <p className="text-sm text-[#64748B] max-w-md">{emptyMessage}</p>
        {emptyActionLabel && onEmptyAction && (
          <button
            onClick={onEmptyAction}
            className="mt-3 px-4 py-2 bg-[#1677FF] hover:bg-[#0B63CE] text-white rounded-lg text-sm font-medium transition shadow-xs"
          >
            {emptyActionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* 5. Pending Command Banner / Progress */}
      {pendingCommand && (
        <div className="mb-4 p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-5 h-5 text-[#1677FF] animate-spin" />
            <div>
              <p className="text-sm font-medium text-[#1E40AF]">
                Command: <span className="font-mono">{pendingCommand.action}</span>
              </p>
              <p className="text-xs text-[#64748B]">
                Status: <span className="capitalize font-semibold text-[#1677FF]">{pendingCommand.status}</span>
                {pendingCommand.status === 'verifying' && ' (Reading back device parameters...)'}
              </p>
            </div>
          </div>
          {pendingCommand.correlationId && (
            <span className="text-xs font-mono text-[#94A3B8]">{pendingCommand.correlationId}</span>
          )}
        </div>
      )}

      {/* 6. Stale Data Freshness Indicator */}
      {lastUpdated && (
        <div className="flex items-center justify-end space-x-2 text-xs text-[#64748B] mb-2">
          <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
          <span>Last synchronized: {new Date(lastUpdated).toLocaleTimeString()}</span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1 hover:text-[#0F172A] text-[#64748B] transition"
              title="Refresh live data"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Actual View Content */}
      {children}
    </div>
  );
};
