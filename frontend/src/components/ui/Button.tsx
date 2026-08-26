import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon: Icon,
  className = '',
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  const variants = {
    primary: 'bg-[#1677FF] hover:bg-[#0B63CE] text-white focus:ring-[#1677FF] shadow-xs',
    secondary: 'bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] focus:ring-[#1677FF] shadow-xs',
    danger: 'bg-[#EF4444] hover:bg-[#DC2626] text-white focus:ring-[#EF4444] shadow-xs',
    success: 'bg-[#10B981] hover:bg-[#059669] text-white focus:ring-[#10B981] shadow-xs',
    outline: 'bg-white hover:bg-[#F8FAFC] text-[#1677FF] border border-[#BFDBFE] focus:ring-[#1677FF]',
    ghost: 'bg-transparent hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A] focus:ring-[#CBD5E1]',
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4 mr-2" />
      ) : null}
      <span>{children}</span>
    </button>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full space-y-1.5">
      {label && <label className="block text-xs font-semibold text-[#334155]">{label}</label>}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          className={`w-full bg-white border ${
            error ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]' : 'border-[#CBD5E1] focus:border-[#1677FF] focus:ring-[#1677FF]'
          } rounded-lg ${Icon ? 'pl-9' : 'px-3.5'} py-2 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-1 transition shadow-2xs ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-xs text-[#EF4444]">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#64748B]">{helperText}</p>
      ) : null}
    </div>
  );
};
