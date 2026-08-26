import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Tenant } from './models/Tenant.js';
import { User } from './models/User.js';
import { Customer } from './models/Customer.js';
import { Device } from './models/Device.js';
import { DeviceCapability } from './models/DeviceCapability.js';
import { OLT, PONPort, FiberNode, FiberSegment } from './models/FiberTopology.js';
import { Incident, Alert } from './models/Incident.js';
import { Ticket } from './models/Ticket.js';
import { TechnicianJob } from './models/TechnicianJob.js';
import { TenantPlan } from './models/TenantPlan.js';

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_db';

export async function seedDatabase() {
  console.log('--- Initializing Clean Production-Ready Foundation for ciniplay.in ---');
  await mongoose.connect(MONGODB_URI);

  // Clear dummy data collections
  await Promise.all([
    Tenant.deleteMany({}),
    User.deleteMany({}),
    Customer.deleteMany({}),
    Device.deleteMany({}),
    DeviceCapability.deleteMany({}),
    OLT.deleteMany({}),
    PONPort.deleteMany({}),
    FiberNode.deleteMany({}),
    FiberSegment.deleteMany({}),
    Incident.deleteMany({}),
    Alert.deleteMany({}),
    Ticket.deleteMany({}),
    TechnicianJob.deleteMany({}),
    TenantPlan.deleteMany({}),
  ]);

  // 1. Seed Enterprise SaaS Plans
  await TenantPlan.create([
    {
      name: 'Starter ISP Plan',
      code: 'starter',
      maxCustomers: 1000,
      maxDevices: 1000,
      maxTechnicians: 5,
      monthlyFee: 1999,
      annualFee: 19990,
      features: ['TR-069 ACS Engine', 'Customer CRM & Billing', 'Field Tech Workflows'],
    },
    {
      name: 'Growth ISP Plan',
      code: 'growth',
      maxCustomers: 5000,
      maxDevices: 5000,
      maxTechnicians: 20,
      monthlyFee: 4999,
      annualFee: 49990,
      features: ['TR-069 & TR-369', 'Fiber GIS Mapping', 'WhatsApp Live Dispatch', 'Technician App'],
    },
    {
      name: 'Enterprise Carrier Suite',
      code: 'enterprise',
      maxCustomers: 50000,
      maxDevices: 50000,
      maxTechnicians: 100,
      monthlyFee: 14999,
      annualFee: 149990,
      features: ['All Features', 'AI Command Center', 'Optical Telemetry Prediction', 'Dedicated CWMP Engine'],
    },
  ]);

  // 2. Seed Certified Hardware ONT / CPE Capability Profiles
  await DeviceCapability.create([
    {
      vendor: 'Huawei',
      modelPattern: 'HG8145V5',
      displayName: 'Huawei EchoLife HG8145V5 Dual-Band GPON ONT',
      hardwareType: 'GPON_ONT',
      supportsDualBandWifi: true,
      supportsSingleBandWifi: true,
      supportsWifiPasswordChange: true,
      supportsWifiChannelSelect: true,
      supportsWanProfileEdit: true,
      supportsWanVlanConfig: true,
      supportsConnectedClientList: true,
      supportsConnectedClientBlock: true,
      supportsRemoteReboot: true,
      supportsPingDiagnostics: true,
      supportsTracerouteDiagnostics: true,
      supportsSpeedTest: true,
      supportsOpticalTelemetry: true,
      supportsCpuMemoryTelemetry: true,
      supportsFirmwareUpgrade: true,
      tr069Supported: true,
      tr369Supported: false,
    },
    {
      vendor: 'ZTE',
      modelPattern: 'ZXHN F670L',
      displayName: 'ZTE ZXHN F670L AC1200 GPON ONT',
      hardwareType: 'GPON_ONT',
      supportsDualBandWifi: true,
      supportsSingleBandWifi: true,
      supportsWifiPasswordChange: true,
      supportsWifiChannelSelect: true,
      supportsWanProfileEdit: true,
      supportsWanVlanConfig: true,
      supportsConnectedClientList: true,
      supportsConnectedClientBlock: true,
      supportsRemoteReboot: true,
      supportsPingDiagnostics: true,
      supportsTracerouteDiagnostics: true,
      supportsSpeedTest: true,
      supportsOpticalTelemetry: true,
      supportsCpuMemoryTelemetry: true,
      supportsFirmwareUpgrade: true,
      tr069Supported: true,
      tr369Supported: true,
    },
    {
      vendor: 'Syrotech',
      modelPattern: 'SY-GPON-1110-WDONT',
      displayName: 'Syrotech Dual Band Gigabit GPON ONT',
      hardwareType: 'GPON_ONT',
      supportsDualBandWifi: true,
      supportsSingleBandWifi: true,
      supportsWifiPasswordChange: true,
      supportsWifiChannelSelect: true,
      supportsWanProfileEdit: true,
      supportsWanVlanConfig: true,
      supportsConnectedClientList: true,
      supportsConnectedClientBlock: true,
      supportsRemoteReboot: true,
      supportsPingDiagnostics: true,
      supportsTracerouteDiagnostics: true,
      supportsSpeedTest: true,
      supportsOpticalTelemetry: true,
      supportsCpuMemoryTelemetry: true,
      supportsFirmwareUpgrade: true,
      tr069Supported: true,
      tr369Supported: false,
    },
    {
      vendor: 'Nokia',
      modelPattern: 'G-140W-F',
      displayName: 'Nokia G-140W-F GPON Wireless Gateway',
      hardwareType: 'GPON_ONT',
      supportsDualBandWifi: true,
      supportsSingleBandWifi: true,
      supportsWifiPasswordChange: true,
      supportsWifiChannelSelect: true,
      supportsWanProfileEdit: true,
      supportsWanVlanConfig: true,
      supportsConnectedClientList: true,
      supportsConnectedClientBlock: true,
      supportsRemoteReboot: true,
      supportsPingDiagnostics: true,
      supportsTracerouteDiagnostics: true,
      supportsSpeedTest: true,
      supportsOpticalTelemetry: true,
      supportsCpuMemoryTelemetry: true,
      supportsFirmwareUpgrade: true,
      tr069Supported: true,
      tr369Supported: true,
    },
  ]);

  // 3. Seed Primary 1st ISP Tenant (ciniplay.in)
  const primaryTenant = await Tenant.create({
    name: 'Rudra Broadband',
    displayName: 'Rudra Fiber Broadband',
    slug: 'rudra',
    subdomain: 'ciniplay.in',
    operatorKey: 'opk_rudra_982341',
    status: 'active',
    owner: {
      name: 'Rudra Operations Lead',
      email: 'admin@ciniplay.in',
      phone: '+919845000001',
    },
    address: {
      door: 'Corporate Office',
      street: 'Main Road',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500081',
      country: 'India',
    },
    branding: {
      logoUrl: '/brand/default-logo.svg',
      primaryColor: '#0284c7',
      secondaryColor: '#0f172a',
      companyName: 'Rudra Fiber Broadband',
      supportPhone: '+91 98450 00001',
      supportEmail: 'support@ciniplay.in',
      portalTitle: 'Rudra Fiber NOC & Operations',
    },
    plan: {
      name: 'Growth ISP Plan',
      maxCustomers: 5000,
      maxDevices: 5000,
      maxTechnicians: 20,
      monthlyFee: 4999,
      currency: 'INR',
      billingCycle: 'monthly',
      features: ['TR-069 ACS', 'Fiber GIS', 'WhatsApp Live Dispatch', 'Field Tech Workflows'],
    },
  });

  // 4. Seed Primary Operator User for WhatsApp OTP login
  await User.create({
    tenantId: primaryTenant._id,
    email: 'admin@ciniplay.in',
    phone: '+919845000001',
    fullName: 'Rudra NOC Lead',
    role: 'operator_admin',
    permissions: ['CUSTOMER_ALL', 'DEVICE_ALL', 'GIS_ALL', 'AI_ALL', 'TECH_ALL'],
    status: 'active',
  });

  // 5. Seed Pre-registered Super Administrators
  await User.create([
    {
      email: 'kanugulasairam2004@gmail.com',
      phone: '+919949666907',
      fullName: 'Sairam (Super Administrator)',
      role: 'super_admin',
      permissions: ['SUPERADMIN_ALL'],
      status: 'active',
    },
    {
      email: 'superadmin@ciniplay.in',
      phone: '+919949666907',
      fullName: 'Super Administrator',
      role: 'super_admin',
      permissions: ['SUPERADMIN_ALL'],
      status: 'active',
    },
  ]);

  console.log('✓ Clean production database foundation initialized successfully!');
  console.log(`Primary Domain: ciniplay.in`);
  console.log(`Primary CWMP ACS URL: http://ciniplay.in:7547`);
  console.log(`Primary Operator Phone: +919845000001 (WhatsApp OTP Auth)`);
  console.log(`Super Admin Registered Emails: kanugulasairam2004@gmail.com, superadmin@ciniplay.in`);
}

// Auto-run if invoked directly
if (process.argv[1]?.includes('seed')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed execution error:', err);
      process.exit(1);
    });
}
