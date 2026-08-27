import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  ExternalLink,
  Eye,
  Edit,
  Trash2,
  Globe,
  Radio,
  Users,
  MapPin,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { Button, Input } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';

interface Tenant {
  _id: string;
  name: string;
  displayName: string;
  slug: string;
  subdomain: string;
  status: 'active' | 'trial' | 'suspended';
  owner: {
    name: string;
    email: string;
    phone: string;
  };
  address?: {
    door?: string;
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  branding?: {
    companyName?: string;
    supportPhone?: string;
    supportEmail?: string;
  };
  plan: {
    name: string;
    maxCustomers: number;
    maxDevices: number;
  };
  createdAt: string;
}

export const TenantList: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    slug: '',
    gstin: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    supportPhone: '',
    supportEmail: '',
    door: '',
    street: '',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500081',
    planTier: 'Growth ISP Plan',
    status: 'active' as 'active' | 'trial' | 'suspended',
  });

  const navigate = useNavigate();
  const { impersonateTenant } = useAuth();

  const fetchTenants = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getTenants({ search, status: statusFilter });
      if (res.success) {
        setTenants(res.tenants || []);
      } else {
        setError(res.error || 'Failed to fetch ISP Tenants');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching tenants');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTenants();
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const computedSlug = formData.slug.toLowerCase().trim();

    const res = await api.createTenant({
      name: formData.name,
      displayName: formData.displayName || formData.name,
      slug: computedSlug,
      owner: {
        name: formData.ownerName,
        email: formData.ownerEmail,
        phone: formData.ownerPhone,
      },
      address: {
        door: formData.door,
        street: formData.street,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
      },
      branding: {
        companyName: formData.name,
        supportPhone: formData.supportPhone || formData.ownerPhone,
        supportEmail: formData.supportEmail || formData.ownerEmail,
      },
      plan: {
        name: formData.planTier,
        maxCustomers: formData.planTier.includes('Enterprise') ? 25000 : formData.planTier.includes('Starter') ? 1000 : 5000,
        maxDevices: formData.planTier.includes('Enterprise') ? 25000 : formData.planTier.includes('Starter') ? 1000 : 5000,
        maxTechnicians: 25,
        monthlyFee: formData.planTier.includes('Enterprise') ? 14999 : formData.planTier.includes('Starter') ? 1999 : 4999,
        billingCycle: 'monthly',
      },
    });

    setIsSubmitting(false);

    if (res.success) {
      setIsCreateModalOpen(false);
      resetForm();
      fetchTenants();
    } else {
      alert(res.error || 'Failed to provision ISP Tenant');
    }
  };

  const openEditModal = (t: Tenant) => {
    setEditingTenantId(t._id);
    setFormData({
      name: t.name || '',
      displayName: t.displayName || t.name || '',
      slug: t.slug || '',
      gstin: '',
      ownerName: t.owner?.name || '',
      ownerEmail: t.owner?.email || '',
      ownerPhone: t.owner?.phone || '',
      supportPhone: t.branding?.supportPhone || t.owner?.phone || '',
      supportEmail: t.branding?.supportEmail || t.owner?.email || '',
      door: t.address?.door || '',
      street: t.address?.street || '',
      city: t.address?.city || 'Hyderabad',
      state: t.address?.state || 'Telangana',
      pincode: t.address?.pincode || '500081',
      planTier: t.plan?.name || 'Growth ISP Plan',
      status: t.status || 'active',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenantId) return;
    setIsSubmitting(true);

    const res = await api.updateTenant(editingTenantId, {
      name: formData.name,
      displayName: formData.displayName || formData.name,
      slug: formData.slug.toLowerCase().trim(),
      status: formData.status,
      owner: {
        name: formData.ownerName,
        email: formData.ownerEmail,
        phone: formData.ownerPhone,
      },
      address: {
        door: formData.door,
        street: formData.street,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
      },
      branding: {
        companyName: formData.name,
        supportPhone: formData.supportPhone || formData.ownerPhone,
        supportEmail: formData.supportEmail || formData.ownerEmail,
      },
      plan: {
        name: formData.planTier,
        maxCustomers: formData.planTier.includes('Enterprise') ? 25000 : formData.planTier.includes('Starter') ? 1000 : 5000,
        maxDevices: formData.planTier.includes('Enterprise') ? 25000 : formData.planTier.includes('Starter') ? 1000 : 5000,
        monthlyFee: formData.planTier.includes('Enterprise') ? 14999 : formData.planTier.includes('Starter') ? 1999 : 4999,
      },
    });

    setIsSubmitting(false);

    if (res.success) {
      setIsEditModalOpen(false);
      setEditingTenantId(null);
      resetForm();
      fetchTenants();
    } else {
      alert(res.error || 'Failed to update ISP Tenant');
    }
  };

  const openDeleteModal = (t: Tenant) => {
    setDeletingTenant(t);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteTenant = async () => {
    if (!deletingTenant) return;
    setIsSubmitting(true);

    const res = await api.deleteTenant(deletingTenant._id);
    setIsSubmitting(false);

    if (res.success) {
      setIsDeleteModalOpen(false);
      setDeletingTenant(null);
      fetchTenants();
    } else {
      alert(res.error || 'Failed to delete ISP Tenant');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      slug: '',
      gstin: '',
      ownerName: '',
      ownerEmail: '',
      ownerPhone: '',
      supportPhone: '',
      supportEmail: '',
      door: '',
      street: '',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500081',
      planTier: 'Growth ISP Plan',
      status: 'active',
    });
  };

  const currentSlug = formData.slug.toLowerCase().trim() || 'operator-slug';
  const currentHost = window.location.hostname || '31.42.125.25';
  const previewDomain = `${currentSlug}.${currentHost}`;
  const previewCwmpUrl = `http://${currentSlug}.${currentHost}:7547`;
  const previewCwmpPathUrl = `http://${currentHost}:7547/tr069/${currentSlug}`;

  const columns: Column<Tenant>[] = [
    {
      header: 'ISP Tenant & Brand',
      accessor: (t) => {
        const host = window.location.hostname || '31.42.125.25';
        const displayDomain = t.subdomain || `${t.slug}.${host}`;
        return (
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1677FF] font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-[#0F172A]">{t.displayName || t.name}</p>
              <p className="text-xs text-[#64748B] font-mono flex items-center space-x-1">
                <Globe className="w-3 h-3 inline text-[#1677FF] mr-1" />
                <span>{displayDomain}</span>
                <span className="text-[#047857] ml-2 font-bold">(Slug: {t.slug})</span>
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Plan Tier',
      accessor: (t) => <Badge variant="neutral">{t.plan?.name || 'Standard'}</Badge>,
    },
    {
      header: 'Owner / WhatsApp',
      accessor: (t) => (
        <div>
          <p className="text-[#1E293B]">{t.owner?.name}</p>
          <p className="text-xs text-[#047857] font-mono">{t.owner?.phone}</p>
          <p className="text-xs text-[#64748B]">{t.owner?.email}</p>
        </div>
      ),
    },
    {
      header: 'City / Region',
      accessor: (t) => (
        <div className="text-xs text-[#334155]">
          <p>{t.address?.city || 'India'}, {t.address?.state || ''}</p>
          <p className="text-[#94A3B8] font-mono">{t.address?.pincode || ''}</p>
        </div>
      ),
    },
    {
      header: 'Subscribers & ONTs',
      accessor: (t: any) => {
        const subs = t.stats?.subscribers ?? 0;
        const devs = t.stats?.devices ?? 0;
        const online = t.stats?.onlineDevices ?? 0;
        return (
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-[#1677FF]" />
              <span className="font-semibold text-[#1E293B]">{subs} Subscribers</span>
            </div>
            <div className="flex items-center space-x-1.5 text-[11px] text-[#64748B] font-mono">
              <Radio className="w-3 h-3 text-[#047857]" />
              <span>{online} / {devs} ONTs Reporting</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessor: (t) => (
        <Badge variant={t.status === 'active' ? 'success' : 'warning'} dot>
          {t.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: (t) => (
        <div className="flex items-center space-x-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/superadmin/tenants/${t._id}`);
            }}
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            <span>Detail</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="text-[#B45309] hover:text-[#92400E] border-[#FDE68A] hover:bg-[#FFFBEB]"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(t);
            }}
            title="Edit Operator Data"
          >
            <Edit className="w-3.5 h-3.5 mr-1" />
            <span>Edit</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              impersonateTenant({
                id: t._id,
                name: t.name,
                displayName: t.displayName || t.name,
                slug: t.slug,
              });
              navigate('/operator/dashboard');
            }}
            title="Enter Operator NOC"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1 text-[#1677FF]" />
            <span>NOC</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="text-[#B91C1C] hover:text-[#991B1B] hover:bg-[#FEF2F2]"
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(t);
            }}
            title="Delete Operator"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Shell
      portalType="superadmin"
      title="ISP Tenant & Operator Management"
      breadcrumbs={[{ label: 'Tenants' }]}
      primaryAction={
        <Button
          onClick={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
          variant="primary"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Provision New ISP Operator</span>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Filters & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 border border-[#E2E8F0] rounded-xl">
          <form onSubmit={handleSearchSubmit} className="w-full sm:w-80">
            <Input
              placeholder="Search by name, slug, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />
          </form>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-[#64748B]">Status:</span>
            {['all', 'active', 'trial', 'suspended'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                  statusFilter === st
                    ? 'bg-sky-600 text-white'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Tenant Table */}
        <StateWrapper
          isLoading={isLoading}
          isEmpty={tenants.length === 0}
          emptyTitle="No ISP Tenants Found"
          emptyMessage="No tenants matched your search criteria. Provision your first operator tenant to get started."
          emptyActionLabel="Provision First ISP Operator"
          onEmptyAction={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
          error={error}
          onRetry={fetchTenants}
        >
          <DataTable
            columns={columns}
            data={tenants}
            keyExtractor={(t) => t._id}
            onRowClick={(t) => navigate(`/superadmin/tenants/${t._id}`)}
          />
        </StateWrapper>
      </div>

      {/* CREATE MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Provision New ISP Operator Tenant"
        subtitle="Complete legal registration, routing subdomain, TR-069 ACS URL, and operator admin assignment."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateTenant} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
          {/* Section 1: Business Identity */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1677FF] flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span>1. ISP Business Identity & Brand</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Legal Entity / Company Name"
                required
                placeholder="e.g. Rudra Telecom & Broadband Pvt Ltd"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Input
                label="Network Brand / Display Name"
                required
                placeholder="e.g. Rudra Fiber"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Subdomain Slug (e.g. 'rudra')"
                required
                placeholder="rudra"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                  })
                }
                helperText="Used for isolated tenant routing and TR-069 ACS URLs."
              />
              <Input
                label="GSTIN / Business Tax ID"
                placeholder="e.g. 36AABCR1234F1Z9"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
              />
            </div>

            {/* Live Subdomain & CWMP URL Preview Box */}
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#BFDBFE] space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#1D4ED8]">
                <span className="flex items-center space-x-1.5">
                  <Zap className="w-4 h-4 text-[#B45309]" />
                  <span>Deterministic Operator Routing & CWMP Endpoints</span>
                </span>
                <Badge variant="success">Slug Mandatory for All</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono pt-1">
                <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] text-[10px] block font-sans font-bold">Tenant Subdomain URL:</span>
                  <span className="text-[#1677FF] font-bold select-all">http://{previewDomain}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] text-[10px] block font-sans font-bold">Direct TR-069 CWMP ACS URL (ONT Config):</span>
                  <span className="text-[#047857] font-bold select-all">http://{currentHost}/tr069/{currentSlug}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Owner & Principal Administrator */}
          <div className="border-t border-[#E2E8F0] pt-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#047857] flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4" />
              <span>2. Operator Administrator & WhatsApp Auth</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Admin Full Name"
                required
                placeholder="Rudra Sharma"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
              />
              <Input
                label="Admin Mobile (WhatsApp OTP)"
                required
                placeholder="+91 98450 00001"
                value={formData.ownerPhone}
                onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                helperText="Dynamic WhatsApp OTP sent here on login."
              />
              <Input
                label="Admin Email"
                type="email"
                required
                placeholder="admin@rudrafiber.in"
                value={formData.ownerEmail}
                onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
              />
            </div>
          </div>

          {/* Section 3: Registered Office Address */}
          <div className="border-t border-[#E2E8F0] pt-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#6D28D9] flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>3. Registered Office & Operating Address</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Door / Building / Flat"
                placeholder="Plot 42, 2nd Floor, Telecom Hub"
                value={formData.door}
                onChange={(e) => setFormData({ ...formData, door: e.target.value })}
              />
              <Input
                label="Street / Main Road"
                placeholder="Hitech City Main Road"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="City"
                required
                placeholder="Hyderabad"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
              <Input
                label="State"
                required
                placeholder="Telangana"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
              <Input
                label="PIN Code"
                required
                placeholder="500081"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              />
            </div>
          </div>

          {/* Section 4: SaaS Plan Tier Selection */}
          <div className="border-t border-[#E2E8F0] pt-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#B45309] flex items-center space-x-2">
              <Radio className="w-4 h-4" />
              <span>4. Subscription Plan Tier</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { name: 'Starter ISP Plan', subs: '1,000 ONTs', fee: '₹1,999/mo' },
                { name: 'Growth ISP Plan', subs: '5,000 ONTs', fee: '₹4,999/mo' },
                { name: 'Enterprise Carrier Plan', subs: '25,000 ONTs', fee: '₹14,999/mo' },
              ].map((tier) => (
                <div
                  key={tier.name}
                  onClick={() => setFormData({ ...formData, planTier: tier.name })}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    formData.planTier === tier.name
                      ? 'bg-[#EFF6FF] border-sky-500 text-[#0F172A]'
                      : 'bg-white border-[#E2E8F0] text-[#334155] hover:border-[#CBD5E1]'
                  }`}
                >
                  <p className="font-semibold text-xs">{tier.name}</p>
                  <p className="text-[11px] text-[#64748B] mt-1">Capacity: {tier.subs}</p>
                  <p className="text-xs font-bold text-[#1677FF] mt-0.5">{tier.fee}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-[#E2E8F0] sticky bottom-0 bg-white py-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Deploy & Provision Operator
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTenantId(null);
        }}
        title="Edit ISP Operator Data"
        subtitle="Update business profile, contact information, registered address, and subscription tier."
        maxWidth="2xl"
      >
        <form onSubmit={handleUpdateTenant} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
          {/* Business Profile */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#B45309] flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span>1. ISP Business Identity</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Legal Business Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Input
                label="Brand / Display Name"
                required
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Subdomain Slug"
                required
                value={formData.slug}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                  })
                }
              />
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#334155]">Operator Status</label>
                <select
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3.5 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-sky-500"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="active">Active (Operational)</option>
                  <option value="trial">Trial Period</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {/* Administrator / WhatsApp Login */}
          <div className="border-t border-[#E2E8F0] pt-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#047857] flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4" />
              <span>2. Operator Administrator Info</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Admin Full Name"
                required
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
              />
              <Input
                label="Admin Mobile (WhatsApp OTP)"
                required
                value={formData.ownerPhone}
                onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
              />
              <Input
                label="Admin Email"
                type="email"
                required
                value={formData.ownerEmail}
                onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
              />
            </div>
          </div>

          {/* Registered Address */}
          <div className="border-t border-[#E2E8F0] pt-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#6D28D9] flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>3. Office & Operating Address</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Door / Building / Flat"
                value={formData.door}
                onChange={(e) => setFormData({ ...formData, door: e.target.value })}
              />
              <Input
                label="Street / Main Road"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="City"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
              <Input
                label="State"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
              <Input
                label="PIN Code"
                required
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              />
            </div>
          </div>

          {/* Subscription Tier */}
          <div className="border-t border-[#E2E8F0] pt-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1677FF] flex items-center space-x-2">
              <Radio className="w-4 h-4" />
              <span>4. Subscription Plan Tier</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { name: 'Starter ISP Plan', subs: '1,000 ONTs', fee: '₹1,999/mo' },
                { name: 'Growth ISP Plan', subs: '5,000 ONTs', fee: '₹4,999/mo' },
                { name: 'Enterprise Carrier Plan', subs: '25,000 ONTs', fee: '₹14,999/mo' },
              ].map((tier) => (
                <div
                  key={tier.name}
                  onClick={() => setFormData({ ...formData, planTier: tier.name })}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    formData.planTier === tier.name
                      ? 'bg-[#EFF6FF] border-sky-500 text-[#0F172A]'
                      : 'bg-white border-[#E2E8F0] text-[#334155] hover:border-[#CBD5E1]'
                  }`}
                >
                  <p className="font-semibold text-xs">{tier.name}</p>
                  <p className="text-[11px] text-[#64748B] mt-1">Capacity: {tier.subs}</p>
                  <p className="text-xs font-bold text-[#1677FF] mt-0.5">{tier.fee}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-[#E2E8F0] sticky bottom-0 bg-white py-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingTenantId(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingTenant(null);
        }}
        title="Delete ISP Operator Tenant"
        subtitle="This action will permanently delete this operator and all associated subscriber and device records."
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#334155]">
            Are you sure you want to permanently delete{' '}
            <strong className="text-[#0F172A]">{deletingTenant?.displayName || deletingTenant?.name}</strong> (
            <code className="text-[#B91C1C]">{deletingTenant?.slug}</code>)?
          </p>
          <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs">
            ⚠️ Warning: All customer accounts, hardware devices, and operator logins for this tenant will be purged.
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[#E2E8F0]">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingTenant(null);
              }}
            >
              Cancel
            </Button>
            <Button type="button" variant="danger" isLoading={isSubmitting} onClick={handleDeleteTenant}>
              Permanently Delete Tenant
            </Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
};
