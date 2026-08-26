import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Wrench, MapPin, Activity, Home, Wifi, Smartphone, HelpCircle, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export interface MobileShellProps {
  children: React.ReactNode;
  portalType: 'technician' | 'customer';
  title: string;
}

export const MobileShell: React.FC<MobileShellProps> = ({
  children,
  portalType,
  title,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, tenant, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate(portalType === 'technician' ? '/tech/login' : '/customer/login');
  };

  const techTabs = [
    { label: 'Work Orders', path: '/tech/jobs', icon: Wrench },
    { label: 'Diagnostics', path: '/tech/diagnostics', icon: Activity },
    { label: 'Map / Route', path: '/operator/gis', icon: MapPin },
  ];

  const customerTabs = [
    { label: 'Home', path: '/customer/home', icon: Home },
    { label: 'Wi-Fi', path: '/customer/wifi', icon: Wifi },
    { label: 'Devices', path: '/customer/devices', icon: Smartphone },
    { label: 'Support', path: '/customer/support', icon: HelpCircle },
  ];

  const tabs = portalType === 'technician' ? techTabs : customerTabs;

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] text-[#0F172A] max-w-md mx-auto border-x border-[#E2E8F0] shadow-sm font-sans">
      {/* Mobile Top App Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-[#0F172A] shadow-xs ${
              portalType === 'technician' ? 'bg-amber-500' : 'bg-[#1677FF]'
            }`}
          >
            {portalType === 'technician' ? 'TECH' : 'ISP'}
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#0F172A]">{title}</h1>
            <p className="text-[10px] text-[#64748B]">
              {portalType === 'technician'
                ? `Technician: ${user?.fullName || 'Field Tech'} (${tenant?.displayName || 'Apex'})`
                : `Subscriber: ${user?.fullName || 'Customer'} (${tenant?.displayName || 'Apex'})`}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleLogout}
            className="p-1.5 text-[#64748B] hover:text-rose-600 hover:bg-[#F1F5F9] rounded-lg transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Screen Content */}
      <main className="flex-1 p-4 pb-20 overflow-y-auto space-y-4 bg-[#F8FAFC]">{children}</main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] flex items-center justify-around py-2 z-40">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition ${
                isActive
                  ? portalType === 'technician'
                    ? 'text-amber-600 font-semibold'
                    : 'text-[#1677FF] font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  isActive
                    ? portalType === 'technician'
                      ? 'text-amber-600 stroke-[2.5]'
                      : 'text-[#1677FF] stroke-[2.5]'
                    : 'text-[#64748B]'
                }`}
              />
              <span className="text-[10px] mt-1">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
