const API_BASE = '/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  correlationId?: string;
  [key: string]: any;
}

class ApiService {
  private token: string | null = null;
  private tenantSlug: string | null = null;
  private isImpersonating: boolean = false;

  constructor() {
    this.token = localStorage.getItem('ai_isp_os_token');
    this.tenantSlug = localStorage.getItem('ai_isp_os_tenant_slug');
    this.isImpersonating = localStorage.getItem('ai_isp_os_is_impersonating') === 'true';
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('ai_isp_os_token', token);
    } else {
      localStorage.removeItem('ai_isp_os_token');
    }
  }

  setTenantSlug(slug: string | null) {
    this.tenantSlug = slug;
    if (slug) {
      localStorage.setItem('ai_isp_os_tenant_slug', slug);
    } else {
      localStorage.removeItem('ai_isp_os_tenant_slug');
    }
  }

  setImpersonation(active: boolean, slug?: string | null) {
    this.isImpersonating = active;
    if (active) {
      localStorage.setItem('ai_isp_os_is_impersonating', 'true');
      if (slug) this.setTenantSlug(slug);
    } else {
      localStorage.removeItem('ai_isp_os_is_impersonating');
    }
  }

  getTenantSlug(): string | null {
    return this.tenantSlug;
  }

  getIsImpersonating(): boolean {
    return this.isImpersonating;
  }

  private isTenantEndpoint(endpoint: string): boolean {
    return (
      endpoint.startsWith('/operator') ||
      endpoint.startsWith('/customer') ||
      endpoint.startsWith('/technician') ||
      endpoint.startsWith('/auth/operator') ||
      endpoint.startsWith('/auth/technician') ||
      endpoint.startsWith('/auth/customer')
    );
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const correlationId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-correlation-id': correlationId,
      ...(options.headers as Record<string, string>),
    };

    // Attach x-tenant-slug when present
    if (this.tenantSlug) {
      headers['x-tenant-slug'] = this.tenantSlug;
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      let data: any;
      const text = await response.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        return {
          success: false,
          error: response.ok
            ? 'Server returned non-JSON response'
            : `Server Error (${response.status}): Service temporarily unavailable`,
          correlationId: response.headers.get('x-correlation-id') || correlationId,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP error ${response.status}`,
          correlationId: response.headers.get('x-correlation-id') || correlationId,
        };
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network communication error',
        correlationId,
      };
    }
  }

  // Auth Endpoints
  async superAdminRequestOtp(email: string) {
    return this.request('/auth/superadmin/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async superAdminVerifyOtp(email: string, otp: string) {
    return this.request('/auth/superadmin/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async operatorRequestOtp(phone: string, slug?: string) {
    return this.request('/auth/operator/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, slug: slug || undefined }),
    });
  }

  async operatorVerifyOtp(phone: string, otp: string, slug?: string) {
    return this.request('/auth/operator/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, slug: slug || undefined }),
    });
  }

  async operatorLogin(email?: string, slug?: string) {
    return this.request('/auth/operator/login', {
      method: 'POST',
      body: JSON.stringify({ email, slug: slug || this.tenantSlug }),
    });
  }

  async technicianLogin(phone?: string) {
    return this.request('/auth/technician/login', {
      method: 'POST',
      body: JSON.stringify({ phone, tenantSlug: this.tenantSlug }),
    });
  }

  async customerLogin(phone?: string) {
    return this.request('/auth/customer/login', {
      method: 'POST',
      body: JSON.stringify({ phone, tenantSlug: this.tenantSlug }),
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  /** Generic GET — for calling arbitrary authenticated endpoints */
  async get(endpoint: string) {
    return this.request(endpoint);
  }

  /** Generic POST — for calling arbitrary authenticated endpoints */
  async post(endpoint: string, body?: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });
  }

  /** Generic PUT — for calling arbitrary authenticated endpoints */
  async put(endpoint: string, body?: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });
  }

  /** Generic DELETE — for calling arbitrary authenticated endpoints */
  async delete(endpoint: string) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // Super Admin Endpoints
  async getSuperAdminDashboard() {
    return this.request('/superadmin/dashboard');
  }

  async getGlobalAuditLogs(params?: { action?: string; targetResource?: string; limit?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/superadmin/audit?${query}`);
  }

  // Super Admin Settings (SMTP & WhatsApp Web)
  async getSuperAdminSettings() {
    return this.request('/superadmin/settings');
  }

  async saveSmtpSettings(payload: { user: string; pass?: string; fromName?: string; host?: string; port?: number; secure?: boolean }) {
    return this.request('/superadmin/settings/smtp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async testSmtpConnection(payload: { user?: string; pass?: string; fromName?: string; host?: string; port?: number; secure?: boolean; targetEmail?: string }) {
    return this.request('/superadmin/settings/smtp/test', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getWhatsAppStatus() {
    return this.request('/superadmin/settings/whatsapp/status');
  }

  async generateWhatsAppQr(forceFresh = false) {
    return this.request('/superadmin/settings/whatsapp/generate-qr', {
      method: 'POST',
      body: JSON.stringify({ forceFresh }),
    });
  }

  async confirmWhatsAppScan(payload?: { phone?: string; deviceInfo?: string }) {
    return this.request('/superadmin/settings/whatsapp/confirm-scan', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  }

  async disconnectWhatsApp() {
    return this.request('/superadmin/settings/whatsapp/disconnect', {
      method: 'POST',
    });
  }

    async sendTestWhatsAppMessage(phone: string, message?: string) {
    return this.request('/superadmin/settings/whatsapp/test', {
      method: 'POST',
      body: JSON.stringify({ phone, message }),
    });
  }

  buildQueryString(params?: Record<string, any>): string {
    if (!params) return '';
    const cleanParams: Record<string, string> = {};
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '' && val !== 'undefined' && val !== 'null') {
        cleanParams[key] = String(val);
      }
    }
    const qs = new URLSearchParams(cleanParams).toString();
    return qs ? `?${qs}` : '';
  }

  // Pending Operator Mappings & WhatsApp Alerts (Strict Multi-Tenant TR-069)
  async getPendingMappings(params?: { status?: string; search?: string; page?: number; limit?: number }) {
    const qs = this.buildQueryString(params);
    return this.request(`/superadmin/pending-mappings${qs}`);
  }

  async getOperatorPendingMappings(params?: { status?: string; search?: string; page?: number; limit?: number }) {
    const qs = this.buildQueryString(params);
    return this.request(`/operator/pending-mappings${qs}`);
  }

  async claimPendingMapping(id: string) {
    return this.request(`/operator/pending-mappings/${id}/claim`, {
      method: 'POST',
    });
  }

  async claimAllPendingMappings() {
    return this.request('/operator/pending-mappings/claim-all', {
      method: 'POST',
    });
  }

  async syncFleetDiscovery() {
    return this.request('/operator/devices/sync-fleet', {
      method: 'POST',
    });
  }

  async getPendingMappingsCount() {
    return this.request('/superadmin/pending-mappings/count');
  }

  async assignPendingMapping(id: string, tenantId: string) {
    return this.request(`/superadmin/pending-mappings/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ tenantId }),
    });
  }

  async bulkAssignPendingMappings(payload: { ids?: string[]; tenantId: string; assignAllPending?: boolean }) {
    return this.request('/superadmin/pending-mappings/bulk-assign', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async bulkClaimPendingMappings(payload: { ids?: string[]; claimAll?: boolean }) {
    return this.request('/operator/pending-mappings/bulk-claim', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async ignorePendingMapping(id: string) {
    return this.request(`/superadmin/pending-mappings/${id}/ignore`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async deletePendingMapping(id: string) {
    return this.request(`/superadmin/pending-mappings/${id}`, {
      method: 'DELETE',
    });
  }

  async getSuperAdminAlertSettings() {
    return this.request('/superadmin/settings/alerts');
  }

  async saveSuperAdminAlertSettings(payload: {
    whatsappEnabled: boolean;
    recipientPhone: string;
    alertOnPendingDevice: boolean;
    cooldownMinutes?: number;
  }) {
    return this.request('/superadmin/settings/alerts', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async testSuperAdminWhatsAppAlert(phone?: string) {
    return this.request('/superadmin/settings/alerts/test-whatsapp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async getTenants(params?: { search?: string; status?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/superadmin/tenants?${query}`);
  }

  async createTenant(payload: any) {
    return this.request('/superadmin/tenants', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getTenantDetail(id: string) {
    return this.request(`/superadmin/tenants/${id}`);
  }

  async updateTenant(id: string, payload: any) {
    return this.request(`/superadmin/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteTenant(id: string) {
    return this.request(`/superadmin/tenants/${id}`, {
      method: 'DELETE',
    });
  }

  async updateTenantStatus(id: string, status: string) {
    return this.request(`/superadmin/tenants/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getCwmpStatus() {
    return this.request('/operator/cwmp/status');
  }

  async getSuperAdminUsers(params?: { search?: string; role?: string; status?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/superadmin/users?${query}`);
  }

  async createSuperAdminUser(payload: any) {
    return this.request('/superadmin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateSuperAdminUser(id: string, payload: any) {
    return this.request(`/superadmin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteSuperAdminUser(id: string) {
    return this.request(`/superadmin/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getSuperAdminPlans() {
    return this.request('/superadmin/plans');
  }

  async getAuditLogs(params?: any) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/superadmin/audit?${query}`);
  }

  // Operator Endpoints
  async getOperatorDashboard() {
    return this.request('/operator/dashboard/summary');
  }

  async getCustomers(params?: { search?: string; status?: string; area?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/operator/customers?${query}`);
  }

  async createCustomer(payload: any) {
    return this.request('/operator/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getCustomer360(customerId: string) {
    return this.request(`/operator/customers/${customerId}/360`);
  }

  async createOperatorCustomerTicket(customerId: string, payload: any) {
    return this.request(`/operator/customers/${customerId}/tickets`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getDevices(params?: any) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/operator/devices?${query}`);
  }

  async getDeviceDetail(id: string) {
    return this.request(`/operator/devices/${id}`);
  }

  async assignDeviceToSubscriber(deviceId: string, payload: any) {
    return this.request(`/operator/devices/${deviceId}/assign-subscriber`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateDeviceWifi(deviceId: string, payload: any) {
    return this.request(`/operator/devices/${deviceId}/wifi`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateDeviceWan(deviceId: string, payload: any) {
    return this.request(`/operator/devices/${deviceId}/wan`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async blockDeviceClient(deviceId: string, mac: string, block: boolean) {
    return this.request(`/operator/devices/${deviceId}/block-client`, {
      method: 'POST',
      body: JSON.stringify({ mac, block }),
    });
  }

  async deleteDevice(id: string) {
    return this.request(`/operator/devices/${id}`, {
      method: 'DELETE',
    });
  }

  async summonDevice(id: string) {
    return this.request(`/operator/devices/${id}/summon`, {
      method: 'POST',
    });
  }

  async summonAllDevices() {
    return this.request('/operator/devices/summon-all', {
      method: 'POST',
    });
  }

  async scanNeighborWiFi(id: string) {
    return this.request(`/operator/devices/${id}/scan-wifi`, {
      method: 'POST',
    });
  }

  // WAN Profile Management Endpoints
  async getWanProfiles(deviceId: string) {
    return this.request(`/operator/devices/${deviceId}/wan/profiles`);
  }

  async getWanProfile(deviceId: string, profileId: string) {
    return this.request(`/operator/devices/${deviceId}/wan/profiles/${profileId}`);
  }

  async createWanProfile(deviceId: string, payload: any) {
    return this.request(`/operator/devices/${deviceId}/wan/profiles`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateWanProfile(deviceId: string, profileId: string, payload: any) {
    return this.request(`/operator/devices/${deviceId}/wan/profiles/${profileId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async duplicateWanProfile(deviceId: string, profileId: string) {
    return this.request(`/operator/devices/${deviceId}/wan/profiles/${profileId}/duplicate`, {
      method: 'POST',
    });
  }

  async deleteWanProfile(deviceId: string, profileId: string) {
    return this.request(`/operator/devices/${deviceId}/wan/profiles/${profileId}`, {
      method: 'DELETE',
    });
  }

  async commitWanProfile(deviceId: string, profileId: string) {
    return this.request(`/operator/devices/${deviceId}/wan/profiles/${profileId}/commit`, {
      method: 'POST',
    });
  }

  async backupWanProfile(deviceId: string, profileId: string) {
    return this.request(`/operator/devices/${deviceId}/wan/profiles/${profileId}/backup`, {
      method: 'POST',
    });
  }

  async rollbackWanProfile(deviceId: string, profileId: string) {
    return this.request(`/operator/devices/${deviceId}/wan/profiles/${profileId}/rollback`, {
      method: 'POST',
    });
  }

  async diffWanProfile(deviceId: string, payload: { profileId?: string; proposedProfile: any }) {
    return this.request(`/operator/devices/${deviceId}/wan/profiles/diff`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Operator WhatsApp Settings
  async getOperatorWhatsAppStatus() {
    return this.request('/operator/settings/whatsapp/status');
  }

  async generateOperatorWhatsAppQR() {
    return this.request('/operator/settings/whatsapp/generate-qr', {
      method: 'POST',
    });
  }

  async confirmOperatorWhatsAppScan(payload?: { phone?: string; deviceInfo?: string }) {
    return this.request('/operator/settings/whatsapp/confirm-scan', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  }

  async disconnectOperatorWhatsApp() {
    return this.request('/operator/settings/whatsapp/disconnect', {
      method: 'POST',
    });
  }

  async rebootDevice(deviceId: string) {
    return this.request(`/operator/devices/${deviceId}/reboot`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async runDiagnostics(deviceId: string, payload: any) {
    return this.request(`/operator/devices/${deviceId}/diagnostics`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getOlts() {
    return this.request('/operator/network/olts');
  }

  async createOlt(payload: any) {
    return this.request('/operator/network/olts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateOlt(id: string, payload: any) {
    return this.request(`/operator/network/olts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteOlt(id: string) {
    return this.request(`/operator/network/olts/${id}`, {
      method: 'DELETE',
    });
  }

  async getPons(oltId?: string) {
    const q = oltId ? `?oltId=${encodeURIComponent(oltId)}` : '';
    return this.request(`/operator/network/pons${q}`);
  }

  async createPon(payload: any) {
    return this.request('/operator/network/pons', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deletePon(id: string) {
    return this.request(`/operator/network/pons/${id}`, {
      method: 'DELETE',
    });
  }

  async getFiberNodes(type?: string, search?: string) {
    const params = new URLSearchParams();
    if (type && type !== 'all') params.append('type', type);
    if (search) params.append('search', search);
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/operator/network/nodes${q}`);
  }

  async createFiberNode(payload: any) {
    return this.request('/operator/network/nodes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateFiberNode(id: string, payload: any) {
    return this.request(`/operator/network/nodes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteFiberNode(id: string) {
    return this.request(`/operator/network/nodes/${id}`, {
      method: 'DELETE',
    });
  }

  async getFiberSegments(category?: string, search?: string) {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (search) params.append('search', search);
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/operator/network/segments${q}`);
  }

  async createFiberSegment(payload: any) {
    return this.request('/operator/network/segments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateFiberSegment(id: string, payload: any) {
    return this.request(`/operator/network/segments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteFiberSegment(id: string) {
    return this.request(`/operator/network/segments/${id}`, {
      method: 'DELETE',
    });
  }

  async linkCustomerFiber(payload: {
    customerId: string;
    fatBoxId?: string;
    fatPortNumber?: number;
    splitterId?: string;
    ponPortId?: string;
    oltId?: string;
    dropCableLengthMeters?: number;
  }) {
    return this.request('/operator/network/link-customer', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getGisLayers() {
    return this.request('/operator/gis/layers');
  }

  async universalTrace(query: string, type = 'auto') {
    return this.request(`/operator/gis/trace?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`);
  }

  async traceCustomerRoute(customerId: string) {
    return this.request(`/operator/gis/trace/customer/${customerId}`);
  }

  async calculateFaultImpact(componentType: string, componentId: string) {
    return this.request('/operator/gis/fault-impact', {
      method: 'POST',
      body: JSON.stringify({ componentType, componentId }),
    });
  }

  // Plan Management & Expiring Subscriptions
  async getPlanCatalog(params?: { sortBy?: string; status?: string; search?: string }) {
    const q = new URLSearchParams();
    if (params?.sortBy) q.append('sortBy', params.sortBy);
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/operator/plans/catalog${queryStr}`);
  }

  async createPlanCatalog(payload: any) {
    return this.request('/operator/plans/catalog', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updatePlanCatalog(id: string, payload: any) {
    return this.request(`/operator/plans/catalog/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async togglePlanStatus(id: string, isActive?: boolean) {
    return this.request(`/operator/plans/catalog/${id}/toggle-status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  async deletePlanCatalog(id: string) {
    return this.request(`/operator/plans/catalog/${id}`, {
      method: 'DELETE',
    });
  }

  async getExpiringPlans(window = 'all', search?: string) {
    const params = new URLSearchParams();
    if (window) params.append('window', window);
    if (search) params.append('search', search);
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/operator/plans/expiring${q}`);
  }

  async activateCustomerPlan(customerId: string, payload: any) {
    return this.request(`/operator/customers/${customerId}/plan/activate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async renewCustomerPlan(customerId: string, payload: any) {
    return this.request(`/operator/customers/${customerId}/plan/renew`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async retriggerPlanNotification(customerId: string, eventType: string) {
    return this.request(`/operator/customers/${customerId}/plan/retrigger-notification`, {
      method: 'POST',
      body: JSON.stringify({ eventType }),
    });
  }

  async getPlanNotificationTemplates() {
    return this.request('/operator/plans/templates');
  }

  async updatePlanNotificationTemplate(eventType: string, payload: any) {
    return this.request(`/operator/plans/templates/${eventType}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async triggerPlanExpiryCheck() {
    return this.request('/operator/plans/cron/check-expiries', {
      method: 'POST',
    });
  }

  async getIncidents() {
    return this.request('/operator/incidents');
  }

  async dispatchTechnician(incidentId: string, payload: any) {
    return this.request(`/operator/incidents/${incidentId}/dispatch-technician`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getTickets() {
    return this.request('/operator/tickets');
  }

  async getTechnicians() {
    return this.request('/operator/technicians');
  }

  async submitAiCommand(prompt: string) {
    return this.request('/operator/ai/command', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  }

  async approveAiAction(interactionId: string) {
    return this.request(`/operator/ai/approve/${interactionId}`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getOperatorReports() {
    return this.request('/operator/reports/summary');
  }

  // Technician Endpoints
  async getTechnicianJobs(status?: string) {
    return this.request(`/technician/jobs?status=${status || 'all'}`);
  }

  async getTechnicianJobDetail(id: string) {
    return this.request(`/technician/jobs/${id}`);
  }

  async updateChecklist(jobId: string, stepId: string, completed: boolean) {
    return this.request(`/technician/jobs/${jobId}/checklist`, {
      method: 'PATCH',
      body: JSON.stringify({ stepId, completed }),
    });
  }

  async measureOpticalPower(jobId: string, postRxPowerDbm: number) {
    return this.request(`/technician/jobs/${jobId}/measure-optical`, {
      method: 'POST',
      body: JSON.stringify({ postRxPowerDbm }),
    });
  }

  async completeTechnicianJob(jobId: string, payload: any) {
    return this.request(`/technician/jobs/${jobId}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async technicianAiAssist(jobId: string, prompt: string) {
    return this.request('/technician/ai/assist', {
      method: 'POST',
      body: JSON.stringify({ currentJobId: jobId, prompt }),
    });
  }

  // Customer Endpoints
  async getCustomerHome() {
    return this.request('/customer/home');
  }

  async updateCustomerWifi(payload: any) {
    return this.request('/customer/wifi', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getCustomerDevices() {
    return this.request('/customer/devices');
  }

  async blockCustomerClient(mac: string, block: boolean) {
    return this.request('/customer/devices/block', {
      method: 'POST',
      body: JSON.stringify({ mac, block }),
    });
  }

  async getCustomerTickets() {
    return this.request('/customer/tickets');
  }

  async createCustomerTicket(payload: any) {
    return this.request('/customer/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async customerAiChat(message: string) {
    return this.request('/customer/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // Part 1.2: Approvals Workbench
  async getApprovals(status = 'pending') {
    return this.request(`/operator/approvals?status=${status}`);
  }

  async decideApproval(id: string, decision: 'approved' | 'rejected', notes?: string) {
    return this.request(`/operator/approvals/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes }),
    });
  }

  // Part 1.2: Optical Analytics
  async getOpticalAnalytics() {
    return this.request('/operator/optical/analytics');
  }

  // Part 1.2: Automation Rules Engine
  async getAutomationRules() {
    return this.request('/operator/automation-rules');
  }

  async createAutomationRule(payload: any) {
    return this.request('/operator/automation-rules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async toggleAutomationRule(id: string) {
    return this.request(`/operator/automation-rules/${id}/toggle`, {
      method: 'PATCH',
    });
  }

  // Part 1.2: Hardware Asset Inventory
  async getInventory(filters: any = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/operator/inventory?${params.toString()}`);
  }

  async createInventoryItem(payload: any) {
    return this.request('/operator/inventory', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Part 1.2: Multi-Channel Messaging Broadcast
  async sendBroadcastMessage(payload: any) {
    return this.request('/operator/messaging/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiService();
