import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={`flex border-b border-[#E2E8F0] space-x-1 overflow-x-auto bg-white px-2 rounded-t-[10px] ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              isActive
                ? 'border-[#1677FF] text-[#1677FF] font-semibold'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A] hover:border-[#CBD5E1]'
            }`}
          >
            {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-[#1677FF]' : 'text-[#64748B]'}`} />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.5 text-xs rounded-full ${
                  isActive ? 'bg-[#EFF6FF] text-[#1677FF] font-bold' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
