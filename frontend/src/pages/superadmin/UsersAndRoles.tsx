import React, { useEffect, useState } from 'react';
import {
  Users,
  Shield,
  UserCheck,
  KeyRound,
  Search,
  Plus,
  Edit2,
  Trash2,
  Building2,
  Phone,
  Mail,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Lock,
} from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { StateWrapper } from '../../components/ui/StateWrapper.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button, Input } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';

const AVAILABLE_ROLES = [
  { value: 'super_admin', label: 'Super Administrator (Global Plane)', isGlobal: true },
  { value: 'operator_admin', label: 'Operator Administrator (ISP Tenant)', isGlobal: false },
  { value: 'noc_operator', label: 'NOC Network Engineer', isGlobal: false },
  { value: 'fiber_planner', label: 'Fiber GIS Planner', isGlobal: false },
  { value: 'technician', label: 'Field Technician', isGlobal: false },
  { value: 'customer', label: 'End Customer', isGlobal: false },
];

export const UsersAndRoles: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('super_admin');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form State
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'super_admin',
    tenantId: '',
    status: 'active',
  });

  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    const res = await api.getSuperAdminUsers({
      search: searchTerm,
      role: roleFilter,
      status: statusFilter,
    });
    setIsLoading(false);

    if (res.success) {
      setUsers(res.users || []);
    } else {
      setError(res.error || 'Failed to fetch users');
    }
  };

  const fetchTenants = async () => {
    const res = await api.getTenants({ status: 'active' });
    if (res.success && res.tenants) {
      setTenants(res.tenants);
      if (res.tenants.length > 0 && !formData.tenantId) {
        setFormData((prev) => ({ ...prev, tenantId: res.tenants[0]._id }));
      }
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchTenants();
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const openCreateModal = () => {
    setFormError(null);
    setFormSuccess(null);
    setFormData({
      fullName: '',
      email: '',
      phone: '+91',
      role: 'operator_admin',
      tenantId: tenants[0]?._id || '',
      status: 'active',
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (u: any) => {
    setFormError(null);
    setFormSuccess(null);
    setSelectedUser(u);
    setFormData({
      fullName: u.fullName || '',
      email: u.email || '',
      phone: u.phone || '',
      role: u.role || 'operator_admin',
      tenantId: u.tenantId?._id || u.tenantId || '',
      status: u.status || 'active',
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (u: any) => {
    setSelectedUser(u);
    setIsDeleteModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setFormError(null);

    const payload = {
      ...formData,
      tenantId: formData.role === 'super_admin' ? undefined : formData.tenantId,
    };

    const res = await api.createSuperAdminUser(payload);
    setModalLoading(false);

    if (res.success) {
      setIsCreateModalOpen(false);
      fetchUsers();
    } else {
      setFormError(res.error || 'Failed to create user.');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setModalLoading(true);
    setFormError(null);

    const payload = {
      ...formData,
      tenantId: formData.role === 'super_admin' ? undefined : formData.tenantId,
    };

    const res = await api.updateSuperAdminUser(selectedUser._id, payload);
    setModalLoading(false);

    if (res.success) {
      setIsEditModalOpen(false);
      fetchUsers();
    } else {
      setFormError(res.error || 'Failed to update user details.');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setModalLoading(true);
    const res = await api.deleteSuperAdminUser(selectedUser._id);
    setModalLoading(false);

    if (res.success) {
      setIsDeleteModalOpen(false);
      fetchUsers();
    } else {
      setFormError(res.error || 'Failed to delete user.');
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'Full Name / Email',
      accessor: (u) => (
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#F1F5F9] border border-[#CBD5E1] flex items-center justify-center text-[#334155] shrink-0 font-bold text-xs uppercase">
            {u.fullName?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="font-semibold text-[#0F172A]">{u.fullName}</p>
            <p className="text-xs text-[#64748B] font-mono">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Mobile Phone',
      accessor: (u) => (
        <div className="flex items-center space-x-1.5 text-xs font-mono text-[#334155]">
          <Smartphone className="w-3.5 h-3.5 text-[#047857] shrink-0" />
          <span>{u.phone || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: 'Tenant Context',
      accessor: (u) => (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1677FF]">
          {u.tenantId?.displayName || (u.role === 'super_admin' ? 'Global Super Admin' : 'None')}
        </span>
      ),
    },
    {
      header: 'Role',
      accessor: (u) => (
        <Badge variant={u.role === 'super_admin' ? 'purple' : u.role === 'operator_admin' ? 'info' : 'neutral'}>
          {u.role?.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      header: 'Status',
      accessor: (u) => (
        <Badge
          variant={u.status === 'active' ? 'success' : u.status === 'suspended' ? 'danger' : 'warning'}
          dot
        >
          {u.status}
        </Badge>
      ),
    },
    {
      header: 'Last Active',
      accessor: (u) => (
        <span className="text-xs text-[#64748B]">
          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (u) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openEditModal(u)}
            className="text-xs px-2.5 py-1 h-8"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1 text-[#1677FF]" />
            <span>Edit</span>
          </Button>

          {currentUser?.id !== u._id && (
            <button
              onClick={() => openDeleteModal(u)}
              title="Delete User"
              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Shell
      portalType="superadmin"
      title="Global Users & Access Control"
      breadcrumbs={[{ label: 'Executive Overview', href: '/superadmin/dashboard' }, { label: 'Users & Roles' }]}
      primaryAction={
        <Button onClick={openCreateModal} variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          <span>Add New User</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Search and Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E2E8F0]">
          <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 w-full sm:w-80">
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
            />
            <Button type="submit" variant="secondary" size="sm" className="shrink-0">
              Search
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Role Filter */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-[#64748B]">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-[#F1F5F9] border border-[#CBD5E1] text-[#1E293B] rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
              >
                <option value="all">All Roles</option>
                {AVAILABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-[#64748B]">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#F1F5F9] border border-[#CBD5E1] text-[#1E293B] rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <StateWrapper isLoading={isLoading} error={error} onRetry={fetchUsers}>
          <DataTable columns={columns} data={users} keyExtractor={(u) => u._id} />
        </StateWrapper>
      </div>

      {/* CREATE USER MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New User"
        subtitle="Create an authorized user with role and tenant assignment"
        maxWidth="lg"
      >
        {formError && (
          <div className="mb-4 p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#B91C1C]" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              required
              placeholder="e.g. Ramesh Sharma"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              icon={UserIcon}
            />

            <Input
              label="Email Address"
              type="email"
              required
              placeholder="e.g. ramesh@apexfiber.in"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              icon={Mail}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Mobile Phone Number"
              type="tel"
              required
              placeholder="e.g. +919845000001"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              icon={Phone}
              helperText="Used for WhatsApp OTP login"
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#334155]">User Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
              >
                {AVAILABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formData.role !== 'super_admin' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#334155]">Assigned ISP Tenant Context</label>
              <select
                value={formData.tenantId}
                onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
                required
              >
                <option value="">Select Tenant...</option>
                {tenants.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.displayName} ({t.slug})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#334155]">Account Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-[#E2E8F0]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={modalLoading} variant="primary">
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT USER MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit User Details"
        subtitle={`Modify attributes and access permissions for ${selectedUser?.fullName}`}
        maxWidth="lg"
      >
        {formError && (
          <div className="mb-4 p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#B91C1C]" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              icon={UserIcon}
            />

            <Input
              label="Email Address"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              icon={Mail}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Mobile Phone Number"
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              icon={Phone}
              helperText="Used for WhatsApp OTP login"
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#334155]">User Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
              >
                {AVAILABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formData.role !== 'super_admin' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#334155]">Assigned ISP Tenant Context</label>
              <select
                value={formData.tenantId}
                onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
              >
                <option value="">Select Tenant...</option>
                {tenants.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.displayName} ({t.slug})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#334155]">Account Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-[#E2E8F0]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={modalLoading} variant="primary">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm User Deletion"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#334155] leading-relaxed">
            Are you sure you want to delete user <strong className="text-[#0F172A]">{selectedUser?.fullName}</strong> ({selectedUser?.email})? This action will permanently revoke access and cannot be undone.
          </p>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#E2E8F0]">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={modalLoading}
              onClick={handleDeleteUser}
            >
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
};
