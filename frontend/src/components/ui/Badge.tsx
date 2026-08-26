import React from 'react';

export interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  className = '',
  dot = false,
}) => {
  const styles = {
    success: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
    warning: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
    danger: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
    info: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
    purple: 'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]',
    neutral: 'bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]',
  };

  const dotColors = {
    success: 'bg-[#10B981]',
    warning: 'bg-[#F59E0B]',
    danger: 'bg-[#EF4444]',
    info: 'bg-[#3B82F6]',
    purple: 'bg-[#8B5CF6]',
    neutral: 'bg-[#64748B]',
  };

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      <span>{children}</span>
    </span>
  );
};
