import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';

import { LandingPage } from './pages/LandingPage.js';

// Super Admin Pages
import { SuperAdminLogin } from './pages/superadmin/SuperAdminLogin.js';
import { SuperAdminDashboard } from './pages/superadmin/SuperAdminDashboard.js';
import { TenantList } from './pages/superadmin/TenantList.js';
import { TenantDetail } from './pages/superadmin/TenantDetail.js';
import { UsersAndRoles } from './pages/superadmin/UsersAndRoles.js';
import { PlansAndRevenue } from './pages/superadmin/PlansAndRevenue.js';
import { SystemHealth } from './pages/superadmin/SystemHealth.js';
import { GlobalAudit } from './pages/superadmin/GlobalAudit.js';
import { SuperAdminSettings } from './pages/superadmin/SuperAdminSettings.js';
import { PendingOperatorMapping } from './pages/superadmin/PendingOperatorMapping.js';

// Operator Pages
import { OperatorLogin } from './pages/operator/OperatorLogin.js';
import { OperatorDashboard } from './pages/operator/OperatorDashboard.js';
import { CustomerList } from './pages/operator/CustomerList.js';
import { CustomerCreateEdit } from './pages/operator/CustomerCreateEdit.js';
import { Customer360 } from './pages/operator/Customer360.js';
import { ONTList } from './pages/operator/ONTList.js';
import { DeviceDetail } from './pages/operator/DeviceDetail.js';
import { FiberGIS } from './pages/operator/FiberGIS.js';
import { AlertsAndIncidents } from './pages/operator/AlertsAndIncidents.js';
import { AICommandCenter } from './pages/operator/AICommandCenter.js';
import { ApprovalsWorkbench } from './pages/operator/ApprovalsWorkbench.js';
import { InventoryManagement } from './pages/operator/InventoryManagement.js';
import { AutomationRules } from './pages/operator/AutomationRules.js';
import { OperatorReports } from './pages/operator/OperatorReports.js';
import { OperatorSettings } from './pages/operator/OperatorSettings.js';
import { PlanManagement } from './pages/operator/PlanManagement.js';
import { PaymentGatewaySettings } from './pages/operator/PaymentGatewaySettings.js';
import { PaymentReconciliation } from './pages/operator/PaymentReconciliation.js';
import { WarehouseInventory } from './pages/operator/WarehouseInventory.js';
import { EnterpriseAnalytics } from './pages/operator/EnterpriseAnalytics.js';
import { WhatsAppChatCenter } from './pages/operator/WhatsAppChatCenter.js';

// Technician Pages
import { TechnicianLogin } from './pages/technician/TechnicianLogin.js';
import { TechnicianJobs } from './pages/technician/TechnicianJobs.js';
import { TechnicianJobDetail } from './pages/technician/TechnicianJobDetail.js';

// Customer Pages
import { CustomerLogin } from './pages/customer/CustomerLogin.js';
import { CustomerHome } from './pages/customer/CustomerHome.js';
import { CustomerWiFi } from './pages/customer/CustomerWiFi.js';
import { CustomerDevices } from './pages/customer/CustomerDevices.js';
import { CustomerSupport } from './pages/customer/CustomerSupport.js';
import { CustomerBilling } from './pages/customer/CustomerBilling.js';

/**
 * Strict RBAC Route Guard Component
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  portalType: 'superadmin' | 'operator' | 'technician' | 'customer';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, portalType }) => {
  const { user, isAuthenticated, isLoading, isImpersonating } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-[#64748B] font-mono">Verifying cryptographic session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const loginPaths: Record<string, string> = {
      superadmin: '/superadmin/login',
      operator: '/operator/login',
      technician: '/tech/login',
      customer: '/customer/login',
    };
    return <Navigate to={loginPaths[portalType] || '/operator/login'} state={{ from: location }} replace />;
  }

  // Super Admin impersonating a tenant gets verified operator access
  if (isImpersonating && portalType === 'operator') {
    return <>{children}</>;
  }

  // Check user role against allowed roles
  const userRole = user?.role || '';
  if (allowedRoles.includes(userRole) || allowedRoles.includes('*')) {
    return <>{children}</>;
  }

  // If role does not match, route to the user's authoritative home portal
  if (userRole === 'super_admin') {
    return <Navigate to="/superadmin/dashboard" replace />;
  } else if (userRole === 'technician') {
    return <Navigate to="/tech/jobs" replace />;
  } else if (userRole === 'customer') {
    return <Navigate to="/customer/home" replace />;
  } else {
    return <Navigate to="/operator/dashboard" replace />;
  }
};

/**
 * Smart Root Redirector based on authenticated session
 */
const RootRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  const role = user?.role;
  if (role === 'super_admin') {
    return <Navigate to="/superadmin/dashboard" replace />;
  } else if (role === 'technician') {
    return <Navigate to="/tech/jobs" replace />;
  } else if (role === 'customer') {
    return <Navigate to="/customer/home" replace />;
  } else {
    return <Navigate to="/operator/dashboard" replace />;
  }
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Smart Root Route */}
          <Route path="/" element={<RootRedirect />} />

          {/* Super Admin Console Logins & Protected Routes */}
          <Route path="/superadmin/login" element={<SuperAdminLogin />} />
          <Route
            path="/superadmin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['super_admin']} portalType="superadmin">
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/pending-mappings"
            element={
              <ProtectedRoute allowedRoles={['super_admin']} portalType="superadmin">
                <PendingOperatorMapping />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/tenants"
            element={
              <ProtectedRoute allowedRoles={['super_admin']} portalType="superadmin">
                <TenantList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/tenants/:id"
            element={
              <ProtectedRoute allowedRoles={['super_admin']} portalType="superadmin">
                <TenantDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/users"
            element={
              <ProtectedRoute allowedRoles={['super_admin']} portalType="superadmin">
                <UsersAndRoles />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/plans"
            element={
              <ProtectedRoute allowedRoles={['super_admin']} portalType="superadmin">
                <PlansAndRevenue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/health"
            element={
              <ProtectedRoute allowedRoles={['super_admin']} portalType="superadmin">
                <SystemHealth />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/audit"
            element={
              <ProtectedRoute allowedRoles={['super_admin']} portalType="superadmin">
                <GlobalAudit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/incidents"
            element={
              <ProtectedRoute allowedRoles={['super_admin']} portalType="superadmin">
                <AlertsAndIncidents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/settings"
            element={
              <ProtectedRoute allowedRoles={['super_admin']} portalType="superadmin">
                <SuperAdminSettings />
              </ProtectedRoute>
            }
          />

          {/* Operator NOC Portal Logins & Protected Routes */}
          <Route path="/operator/login" element={<OperatorLogin />} />
          <Route path="/login" element={<OperatorLogin />} />
          <Route
            path="/operator/dashboard"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator', 'support_agent']} portalType="operator">
                <OperatorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/customers"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator', 'support_agent']} portalType="operator">
                <CustomerList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/customers/new"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator']} portalType="operator">
                <CustomerCreateEdit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/customers/:id"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator', 'support_agent']} portalType="operator">
                <Customer360 />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/devices"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator']} portalType="operator">
                <ONTList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/fleet"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator']} portalType="operator">
                <ONTList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/pending-mappings"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator', 'super_admin']} portalType="operator">
                <PendingOperatorMapping />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/devices/:id"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator', 'support_agent']} portalType="operator">
                <DeviceDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/network"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator']} portalType="operator">
                <FiberGIS />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/gis"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator']} portalType="operator">
                <FiberGIS />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/plans"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator']} portalType="operator">
                <PlanManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/approvals"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator']} portalType="operator">
                <ApprovalsWorkbench />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/inventory"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator']} portalType="operator">
                <InventoryManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/automation"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator']} portalType="operator">
                <AutomationRules />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/incidents"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator', 'support_agent']} portalType="operator">
                <AlertsAndIncidents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/tickets"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator', 'support_agent']} portalType="operator">
                <AlertsAndIncidents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/technicians"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator']} portalType="operator">
                <TechnicianJobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/ai"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator']} portalType="operator">
                <AICommandCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/reports"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator']} portalType="operator">
                <OperatorReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/settings"
            element={
              <ProtectedRoute allowedRoles={['operator_admin']} portalType="operator">
                <OperatorSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/payments/gateways"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'accountant']} portalType="operator">
                <PaymentGatewaySettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/payments/reconciliation"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'accountant']} portalType="operator">
                <PaymentReconciliation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/inventory/warehouse"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator', 'accountant']} portalType="operator">
                <WarehouseInventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/analytics"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator', 'accountant']} portalType="operator">
                <EnterpriseAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/whatsapp"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator', 'support_agent', 'accountant']} portalType="operator">
                <WhatsAppChatCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/whatsapp-chat"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator', 'support_agent', 'accountant']} portalType="operator">
                <WhatsAppChatCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/leads"
            element={
              <ProtectedRoute allowedRoles={['operator_admin', 'noc_operator', 'support_agent']} portalType="operator">
                <WhatsAppChatCenter />
              </ProtectedRoute>
            }
          />

          {/* Field Technician Portal Logins & Protected Routes */}
          <Route path="/tech/login" element={<TechnicianLogin />} />
          <Route path="/technician/login" element={<TechnicianLogin />} />
          <Route
            path="/tech/jobs"
            element={
              <ProtectedRoute allowedRoles={['technician', 'operator_admin']} portalType="technician">
                <TechnicianJobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tech/jobs/:id"
            element={
              <ProtectedRoute allowedRoles={['technician', 'operator_admin']} portalType="technician">
                <TechnicianJobDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tech/diagnostics"
            element={
              <ProtectedRoute allowedRoles={['technician', 'operator_admin']} portalType="technician">
                <TechnicianJobDetail />
              </ProtectedRoute>
            }
          />

          {/* Customer Portal Logins & Protected Routes */}
          <Route path="/customer/login" element={<CustomerLogin />} />
          <Route
            path="/customer/home"
            element={
              <ProtectedRoute allowedRoles={['customer', 'operator_admin']} portalType="customer">
                <CustomerHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/billing"
            element={
              <ProtectedRoute allowedRoles={['customer', 'operator_admin']} portalType="customer">
                <CustomerBilling />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/wifi"
            element={
              <ProtectedRoute allowedRoles={['customer', 'operator_admin']} portalType="customer">
                <CustomerWiFi />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/devices"
            element={
              <ProtectedRoute allowedRoles={['customer', 'operator_admin']} portalType="customer">
                <CustomerDevices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/test"
            element={
              <ProtectedRoute allowedRoles={['customer', 'operator_admin']} portalType="customer">
                <CustomerHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/support"
            element={
              <ProtectedRoute allowedRoles={['customer', 'operator_admin']} portalType="customer">
                <CustomerSupport />
              </ProtectedRoute>
            }
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
