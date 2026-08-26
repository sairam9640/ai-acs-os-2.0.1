import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

export interface UserContext {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
}

export interface TenantContext {
  id: string;
  name: string;
  displayName: string;
  slug: string;
  branding?: any;
  plan?: any;
}

interface AuthContextType {
  user: UserContext | null;
  tenant: TenantContext | null;
  impersonatedTenant: TenantContext | null;
  isImpersonating: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: UserContext, tenant?: TenantContext) => void;
  logout: () => void;
  setTenantSlug: (slug: string) => void;
  impersonateTenant: (tenant: TenantContext) => void;
  exitImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserContext | null>(null);
  const [tenant, setTenant] = useState<TenantContext | null>(null);
  const [impersonatedTenant, setImpersonatedTenant] = useState<TenantContext | null>(null);
  const [isImpersonating, setIsImpersonating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('ai_isp_os_token');
      const savedImpersonation = localStorage.getItem('ai_isp_os_is_impersonating') === 'true';
      const savedImpersonatedTenantStr = localStorage.getItem('ai_isp_os_impersonated_tenant');

      if (savedImpersonation && savedImpersonatedTenantStr) {
        try {
          const parsed = JSON.parse(savedImpersonatedTenantStr);
          setImpersonatedTenant(parsed);
          setIsImpersonating(true);
        } catch {
          // ignore
        }
      }

      if (token) {
        api.setToken(token);
        const res = await api.getMe();
        if (res.success && res.user) {
          setUser(res.user);
          if (res.tenant) setTenant(res.tenant);
        } else {
          api.setToken(null);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = (token: string, newUser: UserContext, newTenant?: TenantContext) => {
    api.setToken(token);
    setUser(newUser);
    if (newTenant) {
      setTenant(newTenant);
      api.setTenantSlug(newTenant.slug);
    }
  };

  const logout = () => {
    api.setToken(null);
    api.setTenantSlug(null);
    api.setImpersonation(false, null);
    localStorage.removeItem('ai_isp_os_sa_token');
    localStorage.removeItem('ai_isp_os_impersonated_tenant');
    setUser(null);
    setTenant(null);
    setImpersonatedTenant(null);
    setIsImpersonating(false);
  };

  const setTenantSlug = (slug: string) => {
    api.setTenantSlug(slug);
  };

  const impersonateTenant = (targetTenant: TenantContext) => {
    const currentToken = localStorage.getItem('ai_isp_os_token');
    if (currentToken && !isImpersonating) {
      localStorage.setItem('ai_isp_os_sa_token', currentToken);
    }
    setImpersonatedTenant(targetTenant);
    setIsImpersonating(true);
    localStorage.setItem('ai_isp_os_is_impersonating', 'true');
    localStorage.setItem('ai_isp_os_impersonated_tenant', JSON.stringify(targetTenant));
    api.setImpersonation(true, targetTenant.slug);
  };

  const exitImpersonation = () => {
    const originalSaToken = localStorage.getItem('ai_isp_os_sa_token');
    if (originalSaToken) {
      api.setToken(originalSaToken);
    }
    localStorage.removeItem('ai_isp_os_sa_token');
    localStorage.removeItem('ai_isp_os_is_impersonating');
    localStorage.removeItem('ai_isp_os_impersonated_tenant');
    setImpersonatedTenant(null);
    setIsImpersonating(false);
    api.setImpersonation(false, null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant: isImpersonating ? impersonatedTenant : tenant,
        impersonatedTenant,
        isImpersonating,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        setTenantSlug,
        impersonateTenant,
        exitImpersonation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
