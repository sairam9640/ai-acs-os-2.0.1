import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: 'sky' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'sky',
  onClick,
}) => {
  const iconColors = {
    sky: 'text-[#1677FF] bg-[#EFF6FF] border-[#BFDBFE]',
    emerald: 'text-[#10B981] bg-[#ECFDF5] border-[#A7F3D0]',
    amber: 'text-[#F59E0B] bg-[#FFFBEB] border-[#FDE68A]',
    rose: 'text-[#EF4444] bg-[#FEF2F2] border-[#FECACA]',
    purple: 'text-[#8B5CF6] bg-[#F5F3FF] border-[#DDD6FE]',
    slate: 'text-[#475569] bg-[#F8FAFC] border-[#E2E8F0]',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-[10px] p-5 transition shadow-xs ${
        onClick ? 'cursor-pointer hover:shadow-sm' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{title}</span>
        <div className={`p-2.5 rounded-lg border ${iconColors[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl font-bold text-[#0F172A] tracking-tight">{value}</span>
        {trend && (
          <span
            className={`text-xs font-semibold ${
              trend.isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-[#64748B]">{subtitle}</p>}
    </div>
  );
};
