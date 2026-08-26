import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Radio,
  FileText,
  UploadCloud,
  CheckCircle2,
  Image as ImageIcon,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Shell } from '../../components/layout/Shell.js';
import { Button, Input } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { api } from '../../services/api.js';

export const CustomerCreateEdit: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    altPhone: '',
    email: '',
    door: '',
    building: '',
    street: '',
    landmark: '',
    area: '',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500081',
    planName: 'SuperFast 100 Mbps Unlimited',
    downloadSpeedMbps: 100,
    monthlyFee: 699,
    assignedDeviceId: '',
    pppoeUsername: '',
    pppoePassword: '',
    vlanId: 100,
    kycDocType: 'aadhaar',
    kycDocNumber: '',
  });

  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [devices, setDevices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUnassignedDevices = async () => {
      const res = await api.getDevices();
      if (res.success) {
        setDevices(res.devices || []);
      }
    };
    fetchUnassignedDevices();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'front' | 'back' | 'photo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (target === 'front') setIdFrontPreview(result);
      if (target === 'back') setIdBackPreview(result);
      if (target === 'photo') setPhotoPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const fullStreetAddress = [formData.door, formData.building, formData.street, formData.landmark]
      .filter(Boolean)
      .join(', ');

    const res = await api.createCustomer({
      fullName: formData.fullName,
      phone: formData.phone,
      email: formData.email || `${formData.phone.replace(/[^0-9]/g, '')}@customer.ciniplay.in`,
      address: {
        door: formData.door,
        building: formData.building,
        street: fullStreetAddress || formData.street || 'Main Road',
        area: formData.area || 'Central Area',
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        coordinates: { lat: 17.385, lng: 78.4867 },
      },
      kyc: {
        documentType: formData.kycDocType as any,
        documentNumber: formData.kycDocNumber || 'NOT_PROVIDED',
        idProofFrontUrl: idFrontPreview || undefined,
        idProofBackUrl: idBackPreview || undefined,
        customerPhotoUrl: photoPreview || undefined,
        status: 'verified',
        verifiedAt: new Date(),
      },
      servicePlan: {
        planId: `plan_${formData.downloadSpeedMbps}m`,
        name: formData.planName,
        downloadSpeedMbps: Number(formData.downloadSpeedMbps),
        uploadSpeedMbps: Number(formData.downloadSpeedMbps),
        monthlyFee: Number(formData.monthlyFee),
        dataLimitGb: 0,
        currentCycleUsageGb: 0,
        billingStatus: 'paid',
        renewalDate: new Date(Date.now() + 30 * 86400000),
      },
      wanConfig: {
        connectionType: 'PPPoE',
        pppoeUsername: formData.pppoeUsername || `${formData.phone.replace(/[^0-9]/g, '')}@ciniplay`,
        vlanId: Number(formData.vlanId),
        dnsPrimary: '8.8.8.8',
        dnsSecondary: '1.1.1.1',
      },
      assignedDeviceId: formData.assignedDeviceId || undefined,
    });

    setIsLoading(false);

    if (res.success && res.customer) {
      navigate(`/operator/customers/${res.customer._id}`);
    } else {
      alert(res.error || 'Failed to provision customer');
    }
  };

  return (
    <Shell
      portalType="operator"
      title="Provision Subscriber & Service Binding"
      breadcrumbs={[{ label: 'Customers', href: '/operator/customers' }, { label: 'New Subscriber' }]}
    >
      <div className="max-w-4xl mx-auto pb-12">
        <form onSubmit={handleSubmit} className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 space-y-8 shadow-xl">
          
          {/* SECTION 1: CUSTOMER IDENTITY */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center space-x-2">
                <User className="w-4 h-4 text-[#1677FF]" />
                <span>1. Subscriber Profile & Contact Info</span>
              </h3>
              <Badge variant="info">Primary Info</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name / Subscriber Name"
                required
                placeholder="e.g. Kiran Rao"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
              <Input
                label="Primary Mobile Number"
                required
                placeholder="+91 98450 12345"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                helperText="Used for customer self-service login and billing alerts."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Alternate Phone Number"
                placeholder="+91 98450 54321"
                value={formData.altPhone}
                onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="kiran.rao@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          {/* SECTION 2: INSTALLATION ADDRESS */}
          <div className="border-t border-[#E2E8F0] pt-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-[#047857]" />
                <span>2. Installation Premise & Billing Address</span>
              </h3>
              <Badge variant="success">Premise Details</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Flat / House / Door #"
                placeholder="Flat 402, 4th Floor"
                value={formData.door}
                onChange={(e) => setFormData({ ...formData, door: e.target.value })}
              />
              <Input
                label="Building / Society Name"
                placeholder="Green Glen Residency"
                value={formData.building}
                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Street / Main Road"
                required
                placeholder="100 Feet Road, 4th Cross"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              />
              <Input
                label="Landmark"
                placeholder="Opposite Water Tank / Near Metro Station"
                value={formData.landmark}
                onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Area / Colony"
                required
                placeholder="Madhapur / Hitech City"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              />
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="PIN Code"
                required
                placeholder="500081"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              />
            </div>
          </div>

          {/* SECTION 3: KYC COMPLIANCE & DOCUMENT UPLOAD */}
          <div className="border-t border-[#E2E8F0] pt-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#6D28D9]" />
                <span>3. KYC Verification & Document Upload</span>
              </h3>
              <Badge variant="warning">Compliance</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#334155]">KYC ID Document Type</label>
                <select
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3.5 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-sky-500"
                  value={formData.kycDocType}
                  onChange={(e) => setFormData({ ...formData, kycDocType: e.target.value })}
                >
                  <option value="aadhaar">Aadhaar Card (UIDAI)</option>
                  <option value="pan">PAN Card (Income Tax Dept)</option>
                  <option value="voter_id">Voter ID Card (Election Commission)</option>
                  <option value="driving_license">Driving License</option>
                  <option value="passport">Passport</option>
                  <option value="other">Other Official Government ID</option>
                </select>
              </div>

              <Input
                label="KYC Document Number"
                required
                placeholder="e.g. 12-digit Aadhaar / 10-digit PAN"
                value={formData.kycDocNumber}
                onChange={(e) => setFormData({ ...formData, kycDocNumber: e.target.value })}
              />
            </div>

            {/* Document Upload Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* ID Proof Front */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center space-y-3">
                <p className="text-xs font-semibold text-[#334155]">ID Proof (Front Side)</p>
                {idFrontPreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-emerald-500/40 h-28 bg-white flex items-center justify-center">
                    <img src={idFrontPreview} alt="ID Front" className="max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setIdFrontPreview(null)}
                      className="absolute top-1 right-1 bg-rose-600/80 text-white rounded px-1.5 py-0.5 text-[10px]"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[#CBD5E1] hover:border-sky-500 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition h-28 text-[#64748B] hover:text-[#1E293B]">
                    <UploadCloud className="w-6 h-6 mb-1 text-[#1677FF]" />
                    <span className="text-[11px]">Upload Front Photo</span>
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'front')} />
                  </label>
                )}
              </div>

              {/* ID Proof Back */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center space-y-3">
                <p className="text-xs font-semibold text-[#334155]">ID Proof (Back Side)</p>
                {idBackPreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-emerald-500/40 h-28 bg-white flex items-center justify-center">
                    <img src={idBackPreview} alt="ID Back" className="max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setIdBackPreview(null)}
                      className="absolute top-1 right-1 bg-rose-600/80 text-white rounded px-1.5 py-0.5 text-[10px]"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[#CBD5E1] hover:border-sky-500 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition h-28 text-[#64748B] hover:text-[#1E293B]">
                    <UploadCloud className="w-6 h-6 mb-1 text-[#047857]" />
                    <span className="text-[11px]">Upload Back Photo</span>
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'back')} />
                  </label>
                )}
              </div>

              {/* Customer Live Photo */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center space-y-3">
                <p className="text-xs font-semibold text-[#334155]">Subscriber Photo</p>
                {photoPreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-emerald-500/40 h-28 bg-white flex items-center justify-center">
                    <img src={photoPreview} alt="Subscriber Photo" className="max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="absolute top-1 right-1 bg-rose-600/80 text-white rounded px-1.5 py-0.5 text-[10px]"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[#CBD5E1] hover:border-sky-500 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition h-28 text-[#64748B] hover:text-[#1E293B]">
                    <ImageIcon className="w-6 h-6 mb-1 text-[#6D28D9]" />
                    <span className="text-[11px]">Upload Photo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'photo')} />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 4: SERVICE PLAN SELECTION */}
          <div className="border-t border-[#E2E8F0] pt-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center space-x-2">
                <Zap className="w-4 h-4 text-[#B45309]" />
                <span>4. FTTH Broadband Service Plan</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { name: 'FastFiber 50 Mbps Unlimited', speed: 50, fee: 499 },
                { name: 'SuperFast 100 Mbps Unlimited', speed: 100, fee: 699 },
                { name: 'GigaPro 300 Mbps Unlimited', speed: 300, fee: 999 },
              ].map((p) => (
                <div
                  key={p.name}
                  onClick={() =>
                    setFormData({
                      ...formData,
                      planName: p.name,
                      downloadSpeedMbps: p.speed,
                      monthlyFee: p.fee,
                    })
                  }
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    formData.downloadSpeedMbps === p.speed
                      ? 'bg-[#EFF6FF] border-sky-500 text-[#0F172A]'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#334155] hover:border-[#CBD5E1]'
                  }`}
                >
                  <p className="font-semibold text-xs">{p.name}</p>
                  <p className="text-sm font-bold text-[#1677FF] mt-1">₹{p.fee}/mo</p>
                  <p className="text-[10px] text-[#64748B]">Speed: {p.speed} Mbps Symmetric</p>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 5: ONT HARDWARE & WAN PROVISIONING */}
          <div className="border-t border-[#E2E8F0] pt-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center space-x-2">
                <Radio className="w-4 h-4 text-[#6D28D9]" />
                <span>5. ONT Hardware Assignment & WAN PPPoE</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#334155]">Select Available ONT Device</label>
                <select
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3.5 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-sky-500"
                  value={formData.assignedDeviceId}
                  onChange={(e) => setFormData({ ...formData, assignedDeviceId: e.target.value })}
                >
                  <option value="">-- Assign ONT Later --</option>
                  {devices.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.serialNumber} ({d.manufacturer} {d.modelName} - {d.status})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="PPPoE Username"
                placeholder={`${formData.phone || '9845012345'}@ciniplay`}
                value={formData.pppoeUsername}
                onChange={(e) => setFormData({ ...formData, pppoeUsername: e.target.value })}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-[#E2E8F0]">
            <Button type="button" variant="outline" onClick={() => navigate('/operator/customers')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Provision & Activate Subscriber
            </Button>
          </div>
        </form>
      </div>
    </Shell>
  );
};
